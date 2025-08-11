import type { AgentContext, AgentMessage } from './types';

export interface ConversationMemory {
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
    userIntent: string;
  };
}

export class ConversationHelper {
  private conversationMemory: Map<string, ConversationMemory> = new Map();

  // 🧠 1. Human-Like Conversation Best Practices

  /**
   * ✅ Reflect user intent clearly
   * Echo the user's request back before answering
   */
  reflectUserIntent(message: string, context: AgentContext): string {
    const intent = this.extractIntent(message);
    const location = context.currentPage ? ` on ${this.getPageName(context.currentPage)}` : '';
    
    return `You're asking about ${intent}${location} – let me check that for you.`;
  }

  /**
   * ✅ Use multi-turn reasoning
   * Let the bot ask clarifying questions or take steps internally
   */
  generateReasoningSteps(message: string, dataFound: boolean): string[] {
    const steps = [];
    
    if (!dataFound) {
      steps.push("Let me check what data we have available...");
      steps.push("I'm looking through your campaigns and metrics...");
    } else {
      steps.push("I found some relevant data, let me analyze it...");
    }
    
    return steps;
  }

  /**
   * ✅ Be fallible (but helpful)
   * If the data isn't available, say so politely and offer next steps
   */
  generateFallbackResponse(message: string, dataType: string): string {
    const suggestions = {
      campaign: "You can check your campaigns directly in the Campaigns section, or I can help you create a new one.",
      performance: "I can help you set up campaign tracking or check your dashboard for current metrics.",
      audience: "I can help you explore audience segments or check your targeting settings.",
      analytics: "You can view your analytics dashboard or I can help you set up tracking.",
      default: "You can check your dashboard directly or contact support for assistance."
    };

    const suggestion = suggestions[dataType as keyof typeof suggestions] || suggestions.default;
    
    return `I couldn't find ${dataType} data for that request, but ${suggestion}`;
  }

  /**
   * ✅ Stay concise but natural
   * Use short, well-structured sentences with light politeness
   */
  formatResponse(content: string, isSuccess: boolean = true): string {
    if (!isSuccess) {
      return content; // Keep error messages as-is
    }

    // Add light politeness
    const politeness = ['Sure,', 'Here you go,', 'No problem,', 'Got it,', 'Here\'s what I found:'];
    const randomPoliteness = politeness[Math.floor(Math.random() * politeness.length)];
    
    return `${randomPoliteness} ${content}`;
  }

  /**
   * ✅ Use memory lightly
   * Reference only relevant past turns
   */
  getRelevantContext(memory: ConversationMemory, currentQuery: string): string {
    if (memory.messages.length <= 1) return '';
    
    const lastQuery = memory.context.lastQuery;
    const currentIntent = this.extractIntent(currentQuery);
    const lastIntent = this.extractIntent(lastQuery);
    
    if (currentIntent === lastIntent) {
      return `Building on our previous discussion about ${currentIntent}...`;
    }
    
    return '';
  }

  // 🗃️ 2. Database Integration Best Practices

  /**
   * ✅ Query carefully
   * Validate user input and use parameterised queries
   */
  validateQuery(message: string): { isValid: boolean; sanitized: string; issues: string[] } {
    const issues: string[] = [];
    const sanitized = message.trim();
    
    // Basic validation
    if (sanitized.length < 2) {
      issues.push('Query too short');
    }
    
    if (sanitized.length > 500) {
      issues.push('Query too long');
    }
    
    // Check for potentially dangerous patterns
    const dangerousPatterns = [';', '--', '/*', '*/', 'union', 'select', 'drop', 'delete'];
    const hasDangerousPattern = dangerousPatterns.some(pattern => 
      sanitized.toLowerCase().includes(pattern)
    );
    
    if (hasDangerousPattern) {
      issues.push('Query contains potentially unsafe patterns');
    }
    
    return {
      isValid: issues.length === 0,
      sanitized,
      issues
    };
  }

  /**
   * ✅ Summarise, don't dump
   * Format results clearly instead of raw data
   */
  formatDataResults(data: any[], query: string): string {
    if (!data || data.length === 0) {
      return 'No data found for that query.';
    }

    const lowerQuery = query.toLowerCase();
    
    // Handle different data types
    if (lowerQuery.includes('campaign')) {
      return this.formatCampaignResults(data);
    }
    
    if (lowerQuery.includes('performance') || lowerQuery.includes('metrics')) {
      return this.formatPerformanceResults(data);
    }
    
    if (lowerQuery.includes('audience') || lowerQuery.includes('demographics')) {
      return this.formatAudienceResults(data);
    }
    
    if (lowerQuery.includes('publisher') || lowerQuery.includes('publishers') || lowerQuery.includes('inventory')) {
      return this.formatPublisherResults(data);
    }
    
    // Default formatting
    return this.formatGenericResults(data);
  }

  /**
   * ✅ Use embedding or keyword matching to map natural queries to schema
   */
  mapQueryToSchema(message: string): { table: string; fields: string[]; filters: any } {
    const lowerMessage = message.toLowerCase();
    
    // Map natural language to database schema
    const mappings = {
      'campaign': {
        table: 'campaigns',
        fields: ['name', 'status', 'created_at'],
        filters: {}
      },
      'performance': {
        table: 'campaign_summary_metrics',
        fields: ['campaign_name', 'total_impressions', 'total_completed_views', 'completion_rate'],
        filters: {}
      },
      'audience': {
        table: 'experian_segments',
        fields: ['segment_name', 'category'],
        filters: {}
      },
      'impressions': {
        table: 'campaign_summary_metrics',
        fields: ['total_impressions', 'campaign_name'],
        filters: {}
      },
      'views': {
        table: 'campaign_summary_metrics',
        fields: ['total_completed_views', 'campaign_name'],
        filters: {}
      },
      'publisher': {
        table: 'campaign_events',
        fields: ['pub_name', 'impressions', 'completions'],
        filters: {}
      },
      'publishers': {
        table: 'campaign_events',
        fields: ['pub_name', 'impressions', 'completions'],
        filters: {}
      },
      'inventory': {
        table: 'campaign_events',
        fields: ['pub_name', 'impressions', 'completions'],
        filters: {}
      }
    };

    // Find the best match
    for (const [keyword, mapping] of Object.entries(mappings)) {
      if (lowerMessage.includes(keyword)) {
        return mapping;
      }
    }
    
    // Default to campaigns
    return mappings.campaign;
  }

  // 🧱 3. Architecture & Design Principles

  /**
   * ✅ Add internal reasoning
   * Before answering, the agent should ask itself what the user is asking
   */
  async analyzeUserRequest(message: string, context: AgentContext): Promise<{
    intent: string;
    dataNeeded: string[];
    confidence: number;
    requiresClarification: boolean;
    clarificationQuestion?: string;
  }> {
    const intent = this.extractIntent(message);
    const dataNeeded = this.identifyDataRequirements(message);
    const confidence = this.calculateConfidence(message, dataNeeded);
    
    let requiresClarification = false;
    let clarificationQuestion = '';
    
    if (confidence < 0.5) {
      requiresClarification = true;
      clarificationQuestion = this.generateClarificationQuestion(message, intent);
    }
    
    return {
      intent,
      dataNeeded,
      confidence,
      requiresClarification,
      clarificationQuestion
    };
  }

  /**
   * ✅ Define fallback flows
   * If the query doesn't match any known pattern
   */
  generateFallbackFlow(message: string): string {
    const suggestions = [
      'Try asking about specific campaigns or metrics',
      'Ask about performance data or audience insights',
      'Request help with analytics or optimization'
    ];
    
    return `I didn't quite get that. Want to try rephrasing or narrow it down? ${suggestions.join(', ')}`;
  }

  // Helper methods

  private extractIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('campaign')) return 'campaigns';
    if (lowerMessage.includes('performance') || lowerMessage.includes('metrics')) return 'performance';
    if (lowerMessage.includes('audience') || lowerMessage.includes('demographics')) return 'audience';
    if (lowerMessage.includes('analytics') || lowerMessage.includes('insights')) return 'analytics';
    if (lowerMessage.includes('impressions') || lowerMessage.includes('views')) return 'performance';
    
    return 'general';
  }

  private getPageName(path: string): string {
    const pageMap: Record<string, string> = {
      '/campaigns': 'Campaigns',
      '/analytics': 'Analytics',
      '/audience': 'Audience',
      '/tv-intelligence': 'TV Intelligence'
    };
    
    return pageMap[path] || 'your dashboard';
  }

  private identifyDataRequirements(message: string): string[] {
    const requirements = [];
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('campaign')) requirements.push('campaigns');
    if (lowerMessage.includes('performance') || lowerMessage.includes('metrics')) requirements.push('performance');
    if (lowerMessage.includes('audience')) requirements.push('audience');
    if (lowerMessage.includes('impressions')) requirements.push('impressions');
    
    return requirements;
  }

  private calculateConfidence(message: string, dataNeeded: string[]): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on specific keywords
    const specificKeywords = ['campaign', 'performance', 'audience', 'impressions', 'metrics'];
    const foundKeywords = specificKeywords.filter(keyword => message.toLowerCase().includes(keyword));
    confidence += foundKeywords.length * 0.1;
    
    // Decrease confidence if no data requirements identified
    if (dataNeeded.length === 0) confidence -= 0.3;
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  private generateClarificationQuestion(message: string, intent: string): string {
    const questions = {
      campaign: 'Which campaign are you asking about?',
      performance: 'What specific metrics are you looking for?',
      audience: 'What audience segment are you interested in?',
      analytics: 'What type of analysis do you need?',
      general: 'Could you be more specific about what you\'re looking for?'
    };
    
    return questions[intent as keyof typeof questions] || questions.general;
  }

  private formatCampaignResults(data: any[]): string {
    const campaigns = data.map(c => `${c.name} (${c.status || 'draft'})`);
    return `Found ${data.length} campaign(s): ${campaigns.join(', ')}.`;
  }

  private formatPerformanceResults(data: any[]): string {
    const metrics = data.map(row => {
      const parts = [];
      if (row.total_impressions) parts.push(`${row.total_impressions.toLocaleString()} impressions`);
      if (row.total_completed_views) parts.push(`${row.total_completed_views.toLocaleString()} completed views`);
      if (row.completion_rate) parts.push(`${row.completion_rate}% completion rate`);
      return parts.join(', ');
    });
    return `Performance: ${metrics.join('; ')}.`;
  }

  private formatAudienceResults(data: any[]): string {
    const segments = data.map(row => row.segment_name || row.category).filter(Boolean);
    return `Found ${data.length} audience segment(s): ${segments.join(', ')}.`;
  }

  private formatPublisherResults(data: any[]): string {
    const publishers = data.map(row => `${row.pub_name} (Impressions: ${row.impressions.toLocaleString()}, Completions: ${row.completions.toLocaleString()})`);
    return `Found ${data.length} publisher(s): ${publishers.join(', ')}.`;
  }

  private formatGenericResults(data: any[]): string {
    if (data.length === 1) {
      const row = data[0];
      const fields = Object.entries(row)
        .filter(([key, value]) => value !== null && key !== 'id')
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      return fields;
    }
    
    return `Found ${data.length} records.`;
  }

  // Memory management
  getConversationMemory(userId: string): ConversationMemory {
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
          attemptedSolutions: [],
          userIntent: ''
        }
      });
    }
    return this.conversationMemory.get(userId)!;
  }

  updateMemory(memory: ConversationMemory, message: string, context: AgentContext) {
    memory.messages.push({
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    memory.context.lastQuery = message;
    memory.context.currentPage = context.currentPage || '';
    memory.context.userIntent = this.extractIntent(message);
  }
} 