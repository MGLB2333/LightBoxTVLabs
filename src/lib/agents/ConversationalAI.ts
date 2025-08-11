import { BaseAgent } from './BaseAgent';
import type { AgentContext, AgentMessage, AgentResponse } from './types';
import { supabase } from '../supabase';

interface ConversationMemory {
  sessionId: string;
  messages: AgentMessage[];
  userPreferences: {
    detailLevel: 'brief' | 'detailed';
    technicalLevel: 'basic' | 'advanced';
    preferredFormat: 'text' | 'bullet' | 'visual';
  };
  context: {
    currentPage: string;
    lastQuery: string;
    followUpQuestions: string[];
    attemptedSolutions: string[];
  };
}

interface ProblemSolvingAttempt {
  approach: string;
  success: boolean;
  result?: any;
  reason?: string;
  humanReadableReason?: string;
}

export class ConversationalAI extends BaseAgent {
  private conversationMemory: Map<string, ConversationMemory> = new Map();

  constructor() {
    super(
      'conversational-ai',
      'AI',
      'A human-like AI assistant that remembers conversations and persists until it finds solutions',
      [
        {
          name: 'Conversational Memory',
          description: 'Remembers conversation history and user preferences',
          examples: [
            'Follow-up questions based on previous context',
            'Personalized responses based on user preferences',
            'Context-aware problem solving'
          ]
        },
        {
          name: 'Persistent Problem Solving',
          description: 'Tries multiple approaches until finding a solution',
          examples: [
            'Iterative data lookup attempts',
            'Multiple solution strategies',
            'Graceful fallback with user guidance'
          ]
        },
        {
          name: 'Natural Communication',
          description: 'Human-like acknowledgments and conversation flow',
          examples: [
            'Natural acknowledgments and thinking process',
            'Contextual follow-up questions',
            'Conversational error recovery'
          ]
        }
      ]
    );
  }

  canHandle(message: string, context: AgentContext): boolean {
    // Conversational AI can handle any message
    return true;
  }

  async process(message: string, context: AgentContext, history: AgentMessage[]): Promise<AgentResponse> {
    try {
      // Step 1: Get or create conversation memory
      const memory = this.getConversationMemory(context.userId || 'default');
      
      // Step 2: Update memory with new message
      this.updateMemory(memory, message, context);
      
      // Step 3: Generate human-like response with iterative problem solving
      const response = await this.generateHumanLikeResponse(message, context, memory);
      
      // Step 4: Update memory with response
      this.updateMemoryWithResponse(memory, response);
      
      return response;
    } catch (error) {
      console.error('Conversational AI error:', error);
      return {
        content: "I'm having trouble processing your request right now. Let me try a different approach - could you rephrase your question?",
        confidence: 0.3,
        agentId: 'conversational-ai',
        agentName: 'Conversational AI',
        suggestions: [
          'Try rephrasing your question',
          'Ask about a specific topic',
          'Provide more context'
        ],
        nextActions: []
      };
    }
  }

  // Test method to verify ConversationalAI is working
  async testConversation(message: string, context: AgentContext): Promise<string> {
    const memory = this.getConversationMemory(context.userId || 'test');
    const response = await this.generateHumanLikeResponse(message, context, memory);
    return response.content;
  }

  private getConversationMemory(userId: string): ConversationMemory {
    if (!this.conversationMemory.has(userId)) {
      this.conversationMemory.set(userId, {
        sessionId: `session_${Date.now()}`,
        messages: [],
        userPreferences: {
          detailLevel: 'detailed',
          technicalLevel: 'basic',
          preferredFormat: 'text'
        },
        context: {
          currentPage: '',
          lastQuery: '',
          followUpQuestions: [],
          attemptedSolutions: []
        }
      });
    }
    return this.conversationMemory.get(userId)!;
  }

  private updateMemory(memory: ConversationMemory, message: string, context: AgentContext) {
    memory.messages.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    memory.context.lastQuery = message;
    memory.context.currentPage = context.currentPage || '';
  }

  private async generateHumanLikeResponse(
    message: string, 
    context: AgentContext, 
    memory: ConversationMemory
  ): Promise<AgentResponse> {
    
    // Step 1: Generate natural acknowledgment
    const acknowledgment = await this.generateAcknowledgment(message, memory);
    
    // Step 2: Show thinking process
    const thinking = await this.showThinkingProcess(message, memory);
    
    // Step 3: Persistent problem solving
    const solution = await this.persistentProblemSolving(message, context, memory);
    
    // Step 4: Generate follow-up questions
    const followUps = await this.generateFollowUpQuestions(message, solution, memory);
    
    // Step 5: Combine into natural response
    const fullResponse = this.combineResponse(acknowledgment, thinking, solution, followUps);
    
    return {
      content: fullResponse,
      confidence: solution.confidence || 0.7,
      agentId: 'conversational-ai',
      agentName: 'Conversational AI',
      suggestions: followUps.slice(0, 3),
      nextActions: []
    };
  }

  private async generateAcknowledgment(message: string, memory: ConversationMemory): Promise<string> {
    // Skip acknowledgments for shorter responses
    return '';
  }

  private async showThinkingProcess(message: string, memory: ConversationMemory): Promise<string> {
    // Skip thinking process for shorter responses
    return '';
  }

  private async persistentProblemSolving(
    message: string, 
    context: AgentContext, 
    memory: ConversationMemory
  ): Promise<{ content: string; confidence: number }> {
    
    const attempts: ProblemSolvingAttempt[] = [];
    
    // Approach 1: Direct data lookup
    attempts.push(await this.tryDirectLookup(message, context, memory));
    
    // Approach 2: SQL generation if direct lookup fails
    if (!attempts[0].success) {
      attempts.push(await this.trySQLGeneration(message, context, memory));
    }
    
    // Approach 3: Contextual inference
    if (!attempts[1]?.success) {
      attempts.push(await this.tryContextualInference(message, context, memory));
    }
    
    // Approach 4: Ask for clarification if all else fails
    if (!attempts[2]?.success) {
      attempts.push(await this.askForClarification(message, attempts, memory));
    }
    
    // Update memory with attempts
    memory.context.attemptedSolutions = attempts.map(a => a.approach);
    
    // Return the best result
    const successfulAttempt = attempts.find(a => a.success);
    if (successfulAttempt) {
      return {
        content: successfulAttempt.result,
        confidence: 0.9
      };
    }
    
    // Return the most helpful attempt
    const bestAttempt = attempts[attempts.length - 1];
    return {
      content: bestAttempt.result || "I'm having trouble finding exactly what you're looking for. Could you provide more details?",
      confidence: 0.3
    };
  }

  private async tryDirectLookup(message: string, context: AgentContext, memory: ConversationMemory): Promise<ProblemSolvingAttempt> {
    try {
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('campaign') && (lowerMessage.includes('have') || lowerMessage.includes('running'))) {
        const { data: campaigns, error } = await supabase
          .from('campaigns')
          .select('name, status, created_at')
          .order('created_at', { ascending: false });

        if (!error && campaigns && campaigns.length > 0) {
          const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'running');
          return {
            approach: 'direct_campaign_lookup',
            success: true,
            result: `Found ${activeCampaigns.length} active campaign(s): ${activeCampaigns.map(c => c.name).join(', ')}.`
          };
        }
      }
      
      return {
        approach: 'direct_lookup',
        success: false,
        reason: 'No direct data found',
        humanReadableReason: 'No data found for this query.'
      };
    } catch (error) {
      return {
        approach: 'direct_lookup',
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
        humanReadableReason: 'Database lookup failed.'
      };
    }
  }

  private async trySQLGeneration(message: string, context: AgentContext, memory: ConversationMemory): Promise<ProblemSolvingAttempt> {
    try {
      const result = await this.solveWithSQL(message, context);
      return {
        approach: 'sql_generation',
        success: result !== 'No data found.',
        result: result,
        reason: result === 'No data found.' ? 'SQL query returned no results' : undefined
      };
    } catch (error) {
      return {
        approach: 'sql_generation',
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
        humanReadableReason: 'I tried to generate a database query but ran into some issues.'
      };
    }
  }

  private async tryContextualInference(message: string, context: AgentContext, memory: ConversationMemory): Promise<ProblemSolvingAttempt> {
    try {
      // Use conversation context to make educated guesses
      const contextualPrompt = `Based on the conversation history and user context, provide a helpful response to: "${message}"

Previous context: ${memory.context.lastQuery}
Current page: ${memory.context.currentPage}

Provide a contextual response that might help the user, even if we don't have exact data.`;

      const response = await this.callOpenAI([
        { role: 'system', content: contextualPrompt },
        { role: 'user', content: message }
      ], context);

      return {
        approach: 'contextual_inference',
        success: true,
        result: response
      };
    } catch (error) {
      return {
        approach: 'contextual_inference',
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
        humanReadableReason: 'I tried to provide contextual help but couldn\'t process the request properly.'
      };
    }
  }

  private async askForClarification(message: string, attempts: ProblemSolvingAttempt[], memory: ConversationMemory): Promise<ProblemSolvingAttempt> {
    const clarificationPrompt = `The user asked: "${message}"

I tried these approaches but couldn't find the answer:
${attempts.map(a => `- ${a.approach}: ${a.humanReadableReason || a.reason}`).join('\n')}

Generate a helpful response that:
1. Acknowledges their question
2. Explains what I tried
3. Asks for clarification or suggests alternatives
4. Sounds natural and helpful`;

    try {
      const response = await this.callOpenAI([
        { role: 'system', content: clarificationPrompt },
        { role: 'user', content: message }
      ], {});

      return {
        approach: 'clarification_request',
        success: true,
        result: response
      };
    } catch (error) {
      return {
        approach: 'clarification_request',
        success: true,
        result: `I understand you're asking about "${message}", but I'm having trouble finding the specific information. Could you provide more details or try asking about a specific campaign or metric?`
      };
    }
  }

  private async generateFollowUpQuestions(message: string, solution: any, memory: ConversationMemory): Promise<string[]> {
    const followUpPrompts = [
      'Would you like to see more details about this?',
      'Is there anything specific about this you\'d like to explore further?',
      'Would you like me to compare this with other data?',
      'Should I look into related metrics or trends?'
    ];

    // Generate contextual follow-ups based on the solution
    const contextualFollowUps = await this.generateContextualFollowUps(message, solution, memory);
    
    return [...contextualFollowUps, ...followUpPrompts.slice(0, 2)];
  }

  private async generateContextualFollowUps(message: string, solution: any, memory: ConversationMemory): Promise<string[]> {
    const lowerMessage = message.toLowerCase();
    const followUps: string[] = [];

    if (lowerMessage.includes('campaign')) {
      followUps.push('Would you like to see the performance metrics for these campaigns?');
      followUps.push('Should I show you the geographic distribution of these campaigns?');
    }

    if (lowerMessage.includes('performance') || lowerMessage.includes('metrics')) {
      followUps.push('Would you like to see trends over time?');
      followUps.push('Should I compare this with industry benchmarks?');
    }

    return followUps.slice(0, 2);
  }

  private combineResponse(acknowledgment: string, thinking: string, solution: any, followUps: string[]): string {
    // Return just the solution content for shorter responses
    return solution.content;
  }

  private updateMemoryWithResponse(memory: ConversationMemory, response: AgentResponse) {
    memory.messages.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      agentId: response.agentId,
      agentName: response.agentName
    });
    
    memory.context.followUpQuestions = response.suggestions || [];
  }

  private extractTopic(message: string): string {
    const topics = ['campaigns', 'performance', 'metrics', 'analytics', 'data'];
    const lowerMessage = message.toLowerCase();
    
    for (const topic of topics) {
      if (lowerMessage.includes(topic)) {
        return topic;
      }
    }
    
    return 'this topic';
  }
} 