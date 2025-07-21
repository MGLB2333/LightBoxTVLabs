import type { Agent, AgentContext, AgentMessage, AgentResponse, AgentCapability } from './types';
import { supabase } from '../supabase';

export abstract class BaseAgent implements Agent {
  id: string;
  name: string;
  description: string;
  capabilities: AgentCapability[];

  constructor(id: string, name: string, description: string, capabilities: AgentCapability[] = []) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.capabilities = capabilities;
  }

  abstract canHandle(message: string, context: AgentContext): boolean;
  abstract process(message: string, context: AgentContext, history: AgentMessage[]): Promise<AgentResponse>;

  protected async querySupabase(query: string, context: AgentContext) {
    try {
      // This is a simplified query interface - you can expand this based on your needs
      const { data, error } = await supabase.rpc('query_analytics', {
        query_text: query,
        user_id: context.userId,
        org_id: context.organizationId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
  }

  protected async callOpenAI(messages: any[], context: AgentContext): Promise<string> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo';
    const maxTokens = parseInt(import.meta.env.VITE_OPENAI_MAX_TOKENS || '4000');
    const temperature = parseFloat(import.meta.env.VITE_OPENAI_TEMPERATURE || '0.7');

    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('OpenAI API key is invalid or expired');
        } else if (response.status === 429) {
          throw new Error('OpenAI API rate limit exceeded');
        } else if (response.status >= 500) {
          throw new Error('OpenAI API server error');
        } else {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No response from OpenAI';
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      // Return a fallback response instead of throwing
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          return 'OpenAI API key is not configured or invalid. Please check your API key in the environment variables.';
        } else if (error.message.includes('rate limit')) {
          return 'OpenAI API rate limit exceeded. Please try again later.';
        } else if (error.message.includes('server error')) {
          return 'OpenAI API is currently unavailable. Please try again later.';
        }
      }
      
      return 'Unable to connect to OpenAI API. Please check your internet connection and API key configuration.';
    }
  }

  protected async processWithTwoCalls(
    message: string, 
    context: AgentContext, 
    history: AgentMessage[],
    systemPrompt: string
  ): Promise<string> {
    // First call: Analyze the query and determine what data/context is needed
    const analysisPrompt = `You are ${this.name}. Analyze the following user query and determine:
1. What specific information or data is being requested
2. What type of analysis or insight would be most helpful
3. What context from the user's current situation is relevant

User query: "${message}"
Current context: ${JSON.stringify(context)}

Provide a brief analysis (2-3 sentences) of what the user is asking for and what would be most helpful to them.`;

    const analysisMessages = [
      { role: 'system', content: analysisPrompt },
      ...history.slice(-3).map(msg => ({ role: msg.role, content: msg.content }))
    ];

    const analysis = await this.callOpenAI(analysisMessages, context);

    // Second call: Provide detailed response based on the analysis
    const detailedPrompt = `${systemPrompt}

ANALYSIS OF USER QUERY:
${analysis}

Based on this analysis, provide a detailed, helpful response to the user's query. Be specific, actionable, and relevant to their LightBoxTV analytics context.`;

    const detailedMessages = [
      { role: 'system', content: detailedPrompt },
      ...history.slice(-3).map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: message }
    ];

    return await this.callOpenAI(detailedMessages, context);
  }

  protected createSystemPrompt(context: AgentContext): string {
    return `You are ${this.name}, a specialized AI agent for LightBoxTV. 

Your capabilities include:
${this.capabilities.map(cap => `- ${cap.name}: ${cap.description}`).join('\n')}

Current context:
- User ID: ${context.userId || 'Unknown'}
- Organization ID: ${context.organizationId || 'Unknown'}
- Current page: ${context.currentPage || 'Unknown'}
- Active filters: ${JSON.stringify(context.filters || {})}

Provide helpful, accurate responses based on the LightBoxTV analytics data. Always be concise and actionable.`;
  }
} 