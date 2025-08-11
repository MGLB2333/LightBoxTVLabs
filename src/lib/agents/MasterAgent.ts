import { AnalyticsAgent } from './AnalyticsAgent';
import { CampaignAgent } from './CampaignAgent';
import { AudienceAgent } from './AudienceAgent';
import { YouTubeCurationAgent } from './YouTubeCurationAgent';
import { TVIntelligenceAgent } from './TVIntelligenceAgent';
import { IncrementalReachAgent } from './IncrementalReachAgent';
import { GeneralHelpAgent } from './GeneralHelpAgent';
import { ConversationalAI } from './ConversationalAI';
import { BaseAgent } from './BaseAgent';
import type { Agent, AgentContext, AgentMessage, AgentResponse } from './types';
import { supabase } from '../supabase';

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
      new GeneralHelpAgent(),
      new ConversationalAI()
    ];
  }

  canHandle(message: string, context: AgentContext): boolean {
    // Master agent can handle any message by routing to appropriate agents
    return true;
  }

  async process(message: string, context: AgentContext, history: AgentMessage[]): Promise<AgentResponse> {
    try {
      // 🧠 Step 1: Analyze user request with internal reasoning
      const analysis = await this.conversationHelper.analyzeUserRequest(message, context);
      
      // Get conversation memory
      const memory = this.conversationHelper.getConversationMemory(context.userId || 'default');
      this.conversationHelper.updateMemory(memory, message, context);
      
      // ✅ Reflect user intent clearly
      const intentReflection = this.conversationHelper.reflectUserIntent(message, context);
      
      // Check if clarification is needed
      if (analysis.requiresClarification) {
        return {
          content: `${intentReflection} ${analysis.clarificationQuestion}`,
          confidence: analysis.confidence,
          agentId: 'master',
          agentName: 'Master Agent',
          suggestions: [
            'Ask about campaigns',
            'Request analytics',
            'Get audience insights'
          ],
          nextActions: []
        };
      }

      // 🗃️ Step 2: Validate query
      const validation = this.conversationHelper.validateQuery(message);
      if (!validation.isValid) {
        return {
          content: this.conversationHelper.generateFallbackFlow(message),
          confidence: 0.1,
          agentId: 'master',
          agentName: 'Master Agent',
          suggestions: ['Try rephrasing your question', 'Ask about specific topics'],
          nextActions: []
        };
      }

      // Step 3: Handle technical questions directly
      if (this.isTechnicalQuestion(message)) {
        const response = await this.handleTechnicalQuestion(message);
        return response; // Return the AgentResponse directly
      }

      // Step 4: Find the best agent for this query
      const classification = await this.classifyQuery(message, context);
      console.log('Master Agent - Query classification:', classification);

      const bestAgent = this.findBestAgent(message, context);
      
      if (bestAgent) {
        console.log(`Master Agent routing to: ${bestAgent.name}`);
        const agentResponse = await bestAgent.process(message, context, history);
        
        // ✅ Add relevant context from memory
        const relevantContext = this.conversationHelper.getRelevantContext(memory, message);
        if (relevantContext) {
          agentResponse.content = `${relevantContext} ${agentResponse.content}`;
        }
        
        return agentResponse;
      }

      // Step 5: Use iterative reasoning for queries that don't have a clear agent
      const systemPrompt = this.createSystemPrompt(context);
      const response = await this.processWithIterativeReasoning(message, context, history, systemPrompt);

      return {
        content: this.conversationHelper.formatResponse(response, true),
        confidence: classification.confidence,
        agentId: 'master',
        agentName: 'Master Agent',
        suggestions: [
          'Ask about campaign performance',
          'Get audience insights',
          'Analyze TV intelligence',
          'Check incremental reach'
        ],
        nextActions: []
      };
    } catch (error) {
      console.error('Master Agent error:', error);
      return {
        content: this.conversationHelper.generateFallbackFlow(message),
        confidence: 0.1,
        agentId: 'master',
        agentName: 'Master Agent',
        suggestions: ['Try rephrasing your question', 'Ask about specific topics'],
        nextActions: []
      };
    }
  }

  protected async gatherRelevantData(message: string, context: AgentContext, planning: string): Promise<string> {
    try {
      // Extract data requirements from planning
      const dataNeeded = planning.includes('DATA_NEEDED') 
        ? planning.split('DATA_NEEDED:')[1]?.split('\n')[0] || ''
        : '';

      // Gather general data based on requirements
      const data: any = {};
      
      if (dataNeeded.includes('campaign')) {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id, name, status')
          .eq('organization_id', context.organizationId);
        data.campaigns = campaigns || [];
      }
      
      if (dataNeeded.includes('audience') || dataNeeded.includes('segment')) {
        const { data: segments } = await supabase
          .from('experian_segments')
          .select('segment_name, category')
          .limit(100);
        data.segments = segments || [];
      }

      return this.formatDataContext(data);
    } catch (error) {
      console.error('Error gathering relevant data:', error);
      return 'Unable to gather relevant data at this time.';
    }
  }

  private formatDataContext(data: any): string {
    let context = '';
    
    if (data.campaigns && data.campaigns.length > 0) {
      context += `Available campaigns: ${data.campaigns.length}\n`;
    }
    
    if (data.segments && data.segments.length > 0) {
      context += `Available audience segments: ${data.segments.length}\n`;
    }
    
    return context || 'No relevant data available.';
  }

  private async improveResponse(response: string, originalQuery: string, suggestions: string[]): Promise<string> {
    const improvementPrompt = `Improve this master agent response based on the feedback:

ORIGINAL QUERY: "${originalQuery}"
CURRENT RESPONSE: "${response}"
IMPROVEMENT SUGGESTIONS: ${suggestions.join(', ')}

Provide an improved response that addresses the issues while maintaining accuracy and helpfulness. Remember that as the Master Agent, you should either:
1. Answer the question directly if you can
2. Route to the appropriate specialized agent
3. Provide helpful guidance on what the user can ask

Don't give generic capability lists unless specifically asked about features.`;

    const improvementMessages = [
      { role: 'system', content: improvementPrompt },
      { role: 'user', content: `Query: "${originalQuery}"\nResponse: "${response}"` }
    ];

    try {
      return await this.callOpenAI(improvementMessages, {});
    } catch (error) {
      console.error('Response improvement failed:', error);
      return response; // Return original response if improvement fails
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
    const lowerMessage = message.toLowerCase();
    
    // Priority routing for simple queries
    if (this.isSimpleCampaignQuery(lowerMessage)) {
      // For simple campaign queries, prefer Campaign Agent over Incremental Reach Agent
      const campaignAgent = this.agents.find(agent => agent.id === 'campaign');
      if (campaignAgent) {
        console.log('Routing simple campaign query to Campaign Agent');
        return campaignAgent;
      }
    }

    // Calculate confidence scores for all agents
    const agentScores = this.agents.map(agent => ({
      agent,
      confidence: this.calculateConfidence(agent, message, context)
    }));

    // Sort by confidence and return the best match
    agentScores.sort((a, b) => b.confidence - a.confidence);
    
    console.log('Agent confidence scores:', agentScores.map(score => 
      `${score.agent.name}: ${score.confidence.toFixed(2)}`
    ));

    // Return the agent with highest confidence, but only if it's above threshold
    const bestMatch = agentScores[0];
    if (bestMatch && bestMatch.confidence > 0.3) {
      return bestMatch.agent;
    }

    return null;
  }

  private isSimpleCampaignQuery(message: string): boolean {
    const simpleCampaignKeywords = [
      'what campaign', 'which campaign', 'campaign running', 'active campaign',
      'my campaign', 'campaigns running', 'current campaign', 'campaign list',
      'show campaign', 'list campaign', 'campaign status', 'campaigns i have',
      'how is it performing', 'how is performing', 'performance', 'how performing'
    ];
    
    return simpleCampaignKeywords.some(keyword => message.includes(keyword));
  }

  private calculateConfidence(agent: Agent, message: string, context: AgentContext): number {
    const lowerMessage = message.toLowerCase();
    let confidence = 0;

    // Check for agent-specific keywords with weighted scoring
    switch (agent.id) {
      case 'campaign':
        const campaignKeywords = ['campaign', 'performance', 'metrics', 'analytics', 'impressions', 'spend', 'revenue', 'kpi', 'cpm', 'ctr', 'roi', 'optimize', 'strategy', 'budget', 'data', 'insights', 'how many', 'what are', 'show me', 'publisher', 'publishers', 'inventory', 'bundle'];
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
        
      case 'analytics':
        const analyticsKeywords = ['analytics', 'dashboard', 'report', 'data', 'trends', 'analysis', 'insights', 'metrics', 'performance', 'kpi', 'publisher', 'publishers', 'inventory', 'bundle', 'top', 'best', 'worst'];
        const analyticsMatches = analyticsKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(analyticsMatches / 3, 1);
        break;
        
      case 'general-help':
        const helpKeywords = ['help', 'how', 'what', 'where', 'when', 'why', 'guide', 'tutorial', 'support', 'assist', 'explain', 'show me', 'tell me', 'navigate', 'feature', 'function', 'button', 'menu', 'page', 'section'];
        const helpMatches = helpKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
        confidence = Math.min(helpMatches / 4, 1);
        break;
    }

    // Boost confidence for very specific queries
    if (lowerMessage.includes('tesco') || lowerMessage.includes('brand')) confidence += 0.2;
    if (lowerMessage.includes('sports') || lowerMessage.includes('audience')) confidence += 0.2;
    if (lowerMessage.includes('campaign') && lowerMessage.includes('performance')) confidence += 0.2;
    if (lowerMessage.includes('publisher') || lowerMessage.includes('publishers')) confidence += 0.3; // Boost publisher queries

    return Math.min(confidence, 1);
  }

  private isTechnicalQuestion(message: string): boolean {
    const technicalKeywords = [
      'ai model', 'openai', 'gpt', 'model', 'algorithm', 'technology',
      'how do you work', 'what model', 'which model', 'ai system',
      'machine learning', 'neural network', 'language model'
    ];
    
    const lowerMessage = message.toLowerCase();
    return technicalKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private async handleTechnicalQuestion(message: string): Promise<AgentResponse> {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('ai model') || lowerMessage.includes('what model') || lowerMessage.includes('which model')) {
      const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo';
      return {
        content: `I'm powered by **${model}** from OpenAI. I'm a multi-agent system that routes your questions to specialized agents:\n\n• **Analytics Agent** - Campaign performance & metrics\n• **Campaign Agent** - Campaign management & optimization\n• **Audience Agent** - Audience targeting & segments\n• **Incremental Reach Agent** - Unique reach analysis\n• **TV Intelligence Agent** - TV viewing insights\n• **YouTube Curation Agent** - Content discovery\n\nEach agent has specific expertise and can access relevant data to provide accurate, actionable insights.`,
        confidence: 0.9,
        agentId: 'master',
        agentName: 'Master Agent',
        suggestions: [
          'Ask about campaign performance',
          'Find audience segments',
          'Get TV intelligence insights'
        ],
        nextActions: []
      };
    }
    
    if (lowerMessage.includes('how do you work') || lowerMessage.includes('how does this work')) {
      return {
        content: `I work as a **multi-agent system** that intelligently routes your questions:\n\n1. **Query Analysis** - I analyze what you're asking for\n2. **Agent Selection** - I choose the best specialized agent\n3. **Data Gathering** - The agent fetches relevant data\n4. **Response Generation** - I provide accurate, actionable insights\n\n**Specialized Agents:**\n• Analytics Agent → Campaign metrics & performance\n• Campaign Agent → Campaign management & optimization\n• Audience Agent → Audience targeting & segments\n• Incremental Reach Agent → Unique reach analysis\n• TV Intelligence Agent → TV viewing patterns\n• YouTube Curation Agent → Content discovery\n\nJust ask me anything about your LightBoxTV data and I'll route it to the right expert!`,
        confidence: 0.9,
        agentId: 'master',
        agentName: 'Master Agent',
        suggestions: [
          'Try asking about your campaigns',
          'Ask about audience insights',
          'Get performance analytics'
        ],
        nextActions: []
      };
    }

    // Default technical response
    return {
      content: `I'm a multi-agent AI system powered by OpenAI's language models. I can help you with:\n\n• **Campaign Analytics** - Performance metrics, CPM analysis, trends\n• **Audience Insights** - Demographics, targeting, segments\n• **TV Intelligence** - Viewing patterns, brand visibility\n• **Incremental Reach** - Unique audience analysis\n• **YouTube Curation** - Content discovery & channel analysis\n\nEach area has a specialized agent that can access relevant data and provide detailed insights. What would you like to know about?`,
      confidence: 0.8,
      agentId: 'master',
      agentName: 'Master Agent',
      suggestions: [
        'Ask about your campaigns',
        'Get audience insights',
        'Analyze TV intelligence'
      ],
      nextActions: []
    };
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