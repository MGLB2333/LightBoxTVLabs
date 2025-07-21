import { AnalyticsAgent } from './AnalyticsAgent';
import { CampaignAgent } from './CampaignAgent';
import { AudienceAgent } from './AudienceAgent';
import { YouTubeCurationAgent } from './YouTubeCurationAgent';
import { TVIntelligenceAgent } from './TVIntelligenceAgent';
import { IncrementalReachAgent } from './IncrementalReachAgent';
import { GeneralHelpAgent } from './GeneralHelpAgent';
import { BaseAgent } from './BaseAgent';
import type { Agent, AgentContext, AgentMessage, AgentResponse } from './types';

export class MasterAgent extends BaseAgent {
  private agents: Agent[] = [];

  constructor() {
    super(
      'master',
      'Master Agent',
      'Orchestrates specialized agents to provide comprehensive LightBoxTV insights and assistance',
      [
        {
          name: 'Agent Routing',
          description: 'Route queries to the most appropriate specialized agent',
          examples: [
            'How is my campaign performing?',
            'Where are my viewers located?',
            'How can I optimize my campaign?'
          ]
        }
      ]
    );

    this.agents = [
      new AnalyticsAgent(),
      new CampaignAgent(),
      AudienceAgent.getInstance(),
      new YouTubeCurationAgent(),
      new TVIntelligenceAgent(),
      new IncrementalReachAgent(),
      new GeneralHelpAgent()
    ];
  }

  canHandle(message: string, context: AgentContext): boolean {
    // Master agent can handle any message by routing to appropriate agents
    return true;
  }

  async process(message: string, context: AgentContext, history: AgentMessage[]): Promise<AgentResponse> {
    try {
      // Find the best agent to handle this message
      const bestAgent = this.findBestAgent(message, context);
      
      if (bestAgent) {
        console.log(`Master Agent routing to: ${bestAgent.name}`);
        // Route to the specialized agent
        return await bestAgent.process(message, context, history);
      }

      // Fallback response if no specific agent can handle it
      return this.generateHelpfulFallback(message);
    } catch (error) {
      console.error('Master Agent error:', error);
      return {
        content: "I encountered an error while processing your request. Please try again.",
        confidence: 0.1,
        agentId: 'master',
        agentName: 'Master Agent'
      };
    }
  }

  private generateHelpfulFallback(message: string): AgentResponse {
    const lowerMessage = message.toLowerCase();
    
    // Provide specific guidance based on the message content
    if (lowerMessage.includes('audience') || lowerMessage.includes('segment') || lowerMessage.includes('demographic')) {
      return {
        content: `I can help you with audience targeting! Try asking me:\n\n• **"Find sports fans"** → I'll find fitness and athletic segments\n• **"Give me young professionals"** → I'll find career-focused segments\n• **"Show me luxury consumers"** → I'll find high-income segments\n\n**Just describe who you want to reach and I'll find the perfect audience segments!**`,
        confidence: 0.6,
        agentId: 'master',
        agentName: 'Master Agent',
        suggestions: [
          'Find audience segments',
          'Get demographic insights',
          'Analyze geographic distribution'
        ]
      };
    }
    
    if (lowerMessage.includes('campaign') || lowerMessage.includes('performance') || lowerMessage.includes('metrics')) {
      return {
        content: `I can help you with campaign analytics! Try asking me:\n\n• **"How is my campaign performing?"** → Get performance metrics\n• **"Show me CPM trends"** → Analyze cost efficiency\n• **"Compare campaign performance"** → Compare different campaigns\n• **"What are my key metrics?"** → Get comprehensive insights\n\n**I'll analyze your real campaign data and provide actionable insights!**`,
        confidence: 0.6,
        agentId: 'master',
        agentName: 'Master Agent',
        suggestions: [
          'Check campaign performance',
          'Analyze metrics and trends',
          'Compare campaign results'
        ]
      };
    }
    
    if (lowerMessage.includes('tv') || lowerMessage.includes('television') || lowerMessage.includes('show')) {
      return {
        content: `I can help you with TV intelligence! Try asking me:\n\n• **"Which shows had the most viewers?"** → Get viewing analysis\n• **"How much brand visibility did we get?"** → Analyze brand exposure\n• **"What did our audience watch?"** → Get audience viewing patterns\n• **"Compare channel performance"** → Compare different channels\n\n**I'll analyze TV viewing data and provide insights!**`,
        confidence: 0.6,
        agentId: 'master',
        agentName: 'Master Agent',
        suggestions: [
          'Analyze TV viewing patterns',
          'Check brand visibility',
          'Compare show performance'
        ]
      };
    }
    
    if (lowerMessage.includes('youtube') || lowerMessage.includes('channel') || lowerMessage.includes('video')) {
      return {
        content: `I can help you find YouTube content! Try asking me:\n\n• **"Find UK channels about electric vehicles"** → Discover relevant channels\n• **"Show me gaming channels with 100k+ subscribers"** → Find popular creators\n• **"Find lifestyle channels for young professionals"** → Target specific audiences\n\n**I'll help you discover the perfect YouTube channels and videos!**`,
        confidence: 0.6,
        agentId: 'master',
        agentName: 'Master Agent',
        suggestions: [
          'Find YouTube channels',
          'Discover video content',
          'Analyze channel demographics'
        ]
      };
    }
    
    if (lowerMessage.includes('incremental') || lowerMessage.includes('reach') || lowerMessage.includes('unique')) {
      return {
        content: `I can help you with incremental reach analysis! Try asking me:\n\n• **"Where did our CTV campaign reach people that linear missed?"** → Find unique reach\n• **"What is our incremental reach vs other campaigns?"** → Compare reach\n• **"Show me postcodes with unique reach"** → Geographic analysis\n\n**I'll analyze your campaign delivery data and find incremental opportunities!**`,
        confidence: 0.6,
        agentId: 'master',
        agentName: 'Master Agent',
        suggestions: [
          'Analyze incremental reach',
          'Compare campaign reach',
          'Find unique audience opportunities'
        ]
      };
    }
    
    // Generic fallback
    return {
      content: `I can help you with many aspects of LightBoxTV! Here are some things I can assist with:\n\n**🎯 Audience & Targeting:**\n• Find audience segments • Analyze demographics • Geographic targeting\n\n**📊 Campaign Analytics:**\n• Performance metrics • CPM analysis • Campaign comparison\n\n**📺 TV Intelligence:**\n• Viewing patterns • Brand visibility • Show performance\n\n**🎬 YouTube Curation:**\n• Find channels • Discover content • Audience analysis\n\n**📈 Incremental Reach:**\n• Unique reach analysis • Campaign comparison • Geographic insights\n\n**Just ask me about any of these areas and I'll help you get the insights you need!**`,
      confidence: 0.5,
      agentId: 'master',
      agentName: 'Master Agent',
      suggestions: [
        'Find audience segments',
        'Check campaign performance',
        'Analyze TV viewing data',
        'Discover YouTube content'
      ]
    };
  }

  private findBestAgent(message: string, context: AgentContext): Agent | null {
    let bestAgent: Agent | null = null;
    let highestConfidence = 0;

    for (const agent of this.agents) {
      if (agent.canHandle(message, context)) {
        // Calculate confidence based on keyword matching
        const confidence = this.calculateConfidence(agent, message, context);
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestAgent = agent;
        }
      }
    }

    return bestAgent;
  }

  private calculateConfidence(agent: Agent, message: string, context: AgentContext): number {
    const lowerMessage = message.toLowerCase();
    let confidence = 0;

    // Check for agent-specific keywords with weighted scoring
    switch (agent.id) {
      case 'campaign':
        const campaignKeywords = ['campaign', 'performance', 'metrics', 'analytics', 'impressions', 'spend', 'revenue', 'kpi', 'cpm', 'ctr', 'roi', 'optimize', 'strategy', 'budget', 'data', 'insights', 'how many', 'what are', 'show me'];
        const campaignMatches = campaignKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(campaignMatches / 5, 1); // Cap at 1, need at least 1 strong match
        break;
        
      case 'audience':
        const audienceKeywords = ['audience', 'demographics', 'viewers', 'people', 'location', 'geo', 'geographic', 'region', 'postcode', 'segment', 'target', 'reach'];
        const audienceMatches = audienceKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(audienceMatches / 4, 1);
        break;
        
      case 'youtube-curation':
        const youtubeKeywords = ['youtube', 'channel', 'video', 'creator', 'influencer', 'content', 'find', 'search', 'discover', 'curate', 'uk', 'london', 'british', 'gaming', 'lifestyle', 'tech', 'subscribers', 'views', 'engagement'];
        const youtubeMatches = youtubeKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(youtubeMatches / 4, 1);
        break;
        
      case 'tv-intelligence':
        const tvKeywords = ['tv', 'television', 'show', 'programme', 'channel', 'viewing', 'watch', 'brand', 'visibility', 'exposure', 'acr', 'audience', 'viewership', 'rating', 'overlap', 'performance', 'broadcast', 'air'];
        const tvMatches = tvKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(tvMatches / 4, 1);
        break;
        
      case 'incremental-reach':
        const incrementalKeywords = ['incremental', 'reach', 'unique', 'additional', 'extra', 'beyond', 'ctv', 'linear', 'tv', 'campaign', 'delivery', 'acr', 'postcode', 'missed', 'unique audience', 'geographic', 'area', 'region'];
        const incrementalMatches = incrementalKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(incrementalMatches / 4, 1);
        break;
        
      case 'general-help':
        const helpKeywords = ['help', 'how', 'what', 'where', 'when', 'why', 'guide', 'tutorial', 'support', 'assist', 'explain', 'show me', 'tell me', 'navigate', 'feature', 'function', 'button', 'menu', 'page', 'section'];
        const helpMatches = helpKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(helpMatches / 4, 1);
        break;
        
      case 'analytics':
        const analyticsKeywords = ['analytics', 'dashboard', 'report', 'data', 'trends', 'analysis', 'insights', 'metrics', 'performance', 'kpi'];
        const analyticsMatches = analyticsKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(analyticsMatches / 3, 1);
        break;
    }

    // Boost confidence for very specific queries
    if (lowerMessage.includes('tesco') || lowerMessage.includes('brand')) confidence += 0.2;
    if (lowerMessage.includes('sports') || lowerMessage.includes('audience')) confidence += 0.2;
    if (lowerMessage.includes('campaign') && lowerMessage.includes('performance')) confidence += 0.2;

    return Math.min(confidence, 1);
  }

  protected createSystemPrompt(context: AgentContext): string {
    return `You are the Master Agent, the orchestrator of LightBoxTV's AI system. 

Your role is to route queries to the appropriate specialized agent:
- Campaign Agent: For campaign analytics, performance metrics, and optimization questions
- Audience Agent: For demographic and geographic audience questions  

Current context:
- User ID: ${context.userId || 'Unknown'}
- Organization ID: ${context.organizationId || 'Unknown'}
- Current page: ${context.currentPage || 'Unknown'}

You should NOT try to answer queries yourself. Instead, route them to the appropriate specialized agent.`;
  }
} 
          'Discover video content',
          'Analyze channel demographics'
        ]
      };
    }
    
    if (lowerMessage.includes('incremental') || lowerMessage.includes('reach') || lowerMessage.includes('unique')) {
      return {
        content: `I can help you with incremental reach analysis! Try asking me:\n\n• **"Where did our CTV campaign reach people that linear missed?"** → Find unique reach\n• **"What is our incremental reach vs other campaigns?"** → Compare reach\n• **"Show me postcodes with unique reach"** → Geographic analysis\n\n**I'll analyze your campaign delivery data and find incremental opportunities!**`,
        confidence: 0.6,
        agentId: 'master',
        agentName: 'Master Agent',
        suggestions: [
          'Analyze incremental reach',
          'Compare campaign reach',
          'Find unique audience opportunities'
        ]
      };
    }
    
    // Generic fallback
    return {
      content: `I can help you with many aspects of LightBoxTV! Here are some things I can assist with:\n\n**🎯 Audience & Targeting:**\n• Find audience segments • Analyze demographics • Geographic targeting\n\n**📊 Campaign Analytics:**\n• Performance metrics • CPM analysis • Campaign comparison\n\n**📺 TV Intelligence:**\n• Viewing patterns • Brand visibility • Show performance\n\n**🎬 YouTube Curation:**\n• Find channels • Discover content • Audience analysis\n\n**📈 Incremental Reach:**\n• Unique reach analysis • Campaign comparison • Geographic insights\n\n**Just ask me about any of these areas and I'll help you get the insights you need!**`,
      confidence: 0.5,
      agentId: 'master',
      agentName: 'Master Agent',
      suggestions: [
        'Find audience segments',
        'Check campaign performance',
        'Analyze TV viewing data',
        'Discover YouTube content'
      ]
    };
  }

  private findBestAgent(message: string, context: AgentContext): Agent | null {
    let bestAgent: Agent | null = null;
    let highestConfidence = 0;

    for (const agent of this.agents) {
      if (agent.canHandle(message, context)) {
        // Calculate confidence based on keyword matching
        const confidence = this.calculateConfidence(agent, message, context);
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestAgent = agent;
        }
      }
    }

    return bestAgent;
  }

  private calculateConfidence(agent: Agent, message: string, context: AgentContext): number {
    const lowerMessage = message.toLowerCase();
    let confidence = 0;

    // Check for agent-specific keywords with weighted scoring
    switch (agent.id) {
      case 'campaign':
        const campaignKeywords = ['campaign', 'performance', 'metrics', 'analytics', 'impressions', 'spend', 'revenue', 'kpi', 'cpm', 'ctr', 'roi', 'optimize', 'strategy', 'budget', 'data', 'insights', 'how many', 'what are', 'show me'];
        const campaignMatches = campaignKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(campaignMatches / 5, 1); // Cap at 1, need at least 1 strong match
        break;
        
      case 'audience':
        const audienceKeywords = ['audience', 'demographics', 'viewers', 'people', 'location', 'geo', 'geographic', 'region', 'postcode', 'segment', 'target', 'reach'];
        const audienceMatches = audienceKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(audienceMatches / 4, 1);
        break;
        
      case 'youtube-curation':
        const youtubeKeywords = ['youtube', 'channel', 'video', 'creator', 'influencer', 'content', 'find', 'search', 'discover', 'curate', 'uk', 'london', 'british', 'gaming', 'lifestyle', 'tech', 'subscribers', 'views', 'engagement'];
        const youtubeMatches = youtubeKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(youtubeMatches / 4, 1);
        break;
        
      case 'tv-intelligence':
        const tvKeywords = ['tv', 'television', 'show', 'programme', 'channel', 'viewing', 'watch', 'brand', 'visibility', 'exposure', 'acr', 'audience', 'viewership', 'rating', 'overlap', 'performance', 'broadcast', 'air'];
        const tvMatches = tvKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(tvMatches / 4, 1);
        break;
        
      case 'incremental-reach':
        const incrementalKeywords = ['incremental', 'reach', 'unique', 'additional', 'extra', 'beyond', 'ctv', 'linear', 'tv', 'campaign', 'delivery', 'acr', 'postcode', 'missed', 'unique audience', 'geographic', 'area', 'region'];
        const incrementalMatches = incrementalKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(incrementalMatches / 4, 1);
        break;
        
      case 'general-help':
        const helpKeywords = ['help', 'how', 'what', 'where', 'when', 'why', 'guide', 'tutorial', 'support', 'assist', 'explain', 'show me', 'tell me', 'navigate', 'feature', 'function', 'button', 'menu', 'page', 'section'];
        const helpMatches = helpKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(helpMatches / 4, 1);
        break;
        
      case 'analytics':
        const analyticsKeywords = ['analytics', 'dashboard', 'report', 'data', 'trends', 'analysis', 'insights', 'metrics', 'performance', 'kpi'];
        const analyticsMatches = analyticsKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(analyticsMatches / 3, 1);
        break;
    }

    // Boost confidence for very specific queries
    if (lowerMessage.includes('tesco') || lowerMessage.includes('brand')) confidence += 0.2;
    if (lowerMessage.includes('sports') || lowerMessage.includes('audience')) confidence += 0.2;
    if (lowerMessage.includes('campaign') && lowerMessage.includes('performance')) confidence += 0.2;

    return Math.min(confidence, 1);
  }

  protected createSystemPrompt(context: AgentContext): string {
    return `You are the Master Agent, the orchestrator of LightBoxTV's AI system. 

Your role is to route queries to the appropriate specialized agent:
- Campaign Agent: For campaign analytics, performance metrics, and optimization questions
- Audience Agent: For demographic and geographic audience questions  

Current context:
- User ID: ${context.userId || 'Unknown'}
- Organization ID: ${context.organizationId || 'Unknown'}
- Current page: ${context.currentPage || 'Unknown'}

You should NOT try to answer queries yourself. Instead, route them to the appropriate specialized agent.`;
  }
} 