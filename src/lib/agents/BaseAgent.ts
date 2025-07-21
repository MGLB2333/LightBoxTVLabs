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
      // Temporarily disabled - RPC function doesn't exist
      console.warn('Supabase analytics query disabled - RPC function not available');
      return { message: 'Analytics queries are temporarily unavailable. Please contact support.' };
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

  protected async processWithChainOfThought(
    message: string, 
    context: AgentContext, 
    history: AgentMessage[],
    systemPrompt: string
  ): Promise<string> {
    // Step 1: Query Analysis and Planning
    const planningPrompt = `You are ${this.name}. Analyze this user query step by step:

USER QUERY: "${message}"
CONTEXT: ${JSON.stringify(context, null, 2)}

THINKING PROCESS:
1. What is the user actually asking for?
2. What data or information do I need to answer this?
3. What steps should I take to provide a helpful response?
4. What potential misunderstandings should I avoid?

Provide your analysis in this format:
ANALYSIS: [Your step-by-step analysis]
DATA_NEEDED: [List of specific data points needed]
APPROACH: [Your planned approach to answer]
CONCERNS: [Any potential issues or edge cases]`;

    const planningMessages = [
      { role: 'system', content: planningPrompt },
      ...history.slice(-5).map(msg => ({ role: msg.role, content: msg.content }))
    ];

    const planning = await this.callOpenAI(planningMessages, context);

    // Step 2: Data Gathering (if needed)
    let dataContext = '';
    if (planning.includes('DATA_NEEDED')) {
      dataContext = await this.gatherRelevantData(message, context, planning);
    }

    // Step 3: Structured Response Generation
    const responsePrompt = `${systemPrompt}

PLANNING ANALYSIS:
${planning}

${dataContext ? `RELEVANT DATA:\n${dataContext}\n` : ''}

Based on the planning analysis above, provide a structured response:

1. **Direct Answer**: Address the user's question directly
2. **Supporting Evidence**: Use the data and analysis to support your answer
3. **Actionable Insights**: Provide specific, actionable recommendations
4. **Next Steps**: Suggest what the user should do next

Keep your response focused, accurate, and helpful. If you're unsure about something, acknowledge the uncertainty.`;

    const responseMessages = [
      { role: 'system', content: responsePrompt },
      ...history.slice(-3).map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: message }
    ];

    return await this.callOpenAI(responseMessages, context);
  }

  protected async gatherRelevantData(message: string, context: AgentContext, planning: string): Promise<string> {
    // This method should be overridden by specific agents to gather relevant data
    return '';
  }

  protected async classifyQuery(message: string, context: AgentContext): Promise<{
    intent: string;
    confidence: number;
    requiresData: boolean;
    complexity: 'simple' | 'moderate' | 'complex';
    potentialIssues: string[];
  }> {
    const classificationPrompt = `Classify this user query for a LightBoxTV analytics platform:

QUERY: "${message}"
CONTEXT: ${JSON.stringify(context, null, 2)}

Provide classification in JSON format:
{
  "intent": "what the user is trying to accomplish",
  "confidence": 0.0-1.0,
  "requiresData": true/false,
  "complexity": "simple|moderate|complex",
  "potentialIssues": ["list of potential problems or misunderstandings"]
}

Focus on:
- Is this a data request, analysis request, or general question?
- Does it require specific data from the platform?
- How complex is the reasoning required?
- What could go wrong in understanding this query?`;

    const classificationMessages = [
      { role: 'system', content: classificationPrompt },
      { role: 'user', content: message }
    ];

    try {
      const response = await this.callOpenAI(classificationMessages, context);
      const classification = JSON.parse(response);
      return classification;
    } catch (error) {
      console.error('Query classification failed:', error);
      return {
        intent: 'general_question',
        confidence: 0.5,
        requiresData: false,
        complexity: 'simple',
        potentialIssues: ['Unable to classify query']
      };
    }
  }

  protected async validateResponse(response: string, originalQuery: string): Promise<{
    isValid: boolean;
    issues: string[];
    suggestedImprovements: string[];
  }> {
    const validationPrompt = `Validate this AI response for a user query:

ORIGINAL QUERY: "${originalQuery}"
AI RESPONSE: "${response}"

Evaluate the response and provide feedback in JSON format:
{
  "isValid": true/false,
  "issues": ["list of problems with the response"],
  "suggestedImprovements": ["how to improve the response"]
}

Check for:
- Does it actually answer the user's question?
- Is it factually accurate and relevant?
- Is it actionable and helpful?
- Does it avoid generic or vague statements?
- Is it appropriate for the LightBoxTV context?`;

    const validationMessages = [
      { role: 'system', content: validationPrompt },
      { role: 'user', content: `Query: "${originalQuery}"\nResponse: "${response}"` }
    ];

    try {
      const validation = await this.callOpenAI(validationMessages, {});
      return JSON.parse(validation);
    } catch (error) {
      console.error('Response validation failed:', error);
      return {
        isValid: true,
        issues: [],
        suggestedImprovements: []
      };
    }
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