import type { AgentContext, AgentMessage, AgentResponse } from './types';
import { BaseAgent } from './BaseAgent';
import { supabase } from '../supabase';

interface GeoMetrics {
  impressions: number;
  completions: number;
}

interface InventoryMetrics {
  impressions: number;
  completions: number;
}

export class CampaignAgent extends BaseAgent {
  constructor() {
    super(
      'campaign',
      'Campaign Agent',
      'Specialized in campaign analytics, performance insights, and strategic recommendations using real LightBoxTV data',
      [
        {
          name: 'Campaign Analytics',
          description: 'Analyze campaign performance metrics and data insights',
          examples: [
            'How is my campaign performing?',
            'Show me campaign impressions',
            'What are my campaign metrics?'
          ]
        },
        {
          name: 'Performance Insights',
          description: 'Provide insights from campaign data and identify patterns',
          examples: [
            'Which campaigns perform best?',
            'What insights can you find?',
            'Show me performance trends'
          ]
        },
        {
          name: 'Strategic Recommendations',
          description: 'Provide campaign optimization and strategy recommendations',
          examples: [
            'How can I optimize my campaign?',
            'What should I change?',
            'Give me campaign recommendations'
          ]
        }
      ]
    );
  }

  canHandle(message: string, context: AgentContext): boolean {
    const campaignKeywords = [
      'campaign', 'performance', 'metrics', 'analytics', 'impressions', 'spend', 'revenue',
      'optimize', 'strategy', 'budget', 'data', 'insights', 'kpi', 'cpm', 'ctr', 'roi',
      'completion', 'audience', 'geographic', 'inventory', 'publisher', 'how many',
      'what are', 'show me', 'tell me', 'analyze', 'compare'
    ];

    const lowerMessage = message.toLowerCase();
    return campaignKeywords.some(keyword => lowerMessage.includes(keyword));
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
          agentId: 'campaign',
          agentName: 'Campaign Agent',
          suggestions: [
            'Ask about specific campaigns',
            'Request performance metrics',
            'Get optimization recommendations'
          ],
          nextActions: []
        };
      }

      // 🗃️ Step 2: Validate query and map to schema
      const validation = this.conversationHelper.validateQuery(message);
      if (!validation.isValid) {
        return {
          content: this.conversationHelper.generateFallbackResponse(message, 'campaign'),
          confidence: 0.1,
          agentId: 'campaign',
          agentName: 'Campaign Agent',
          suggestions: ['Try rephrasing your question', 'Ask about specific campaigns'],
          nextActions: []
        };
      }

      // Step 3: Route to appropriate handler
      let response: string;
      
      if (this.isSimpleCampaignQuery(message)) {
        response = await this.handleSimpleCampaignQueryWithReasoning(message, context);
      } else if (this.isComplexDatabaseQuery(message)) {
        response = await this.solveWithSQL(message, context);
      } else {
        // Use iterative reasoning for other queries
        const systemPrompt = this.createSystemPrompt(context);
        response = await this.processWithIterativeReasoning(message, context, history, systemPrompt);
      }

      // ✅ Format response with human-like touches
      const formattedResponse = this.conversationHelper.formatResponse(response, true);
      
      // ✅ Add relevant context from memory
      const relevantContext = this.conversationHelper.getRelevantContext(memory, message);
      const finalResponse = relevantContext ? `${relevantContext} ${formattedResponse}` : formattedResponse;

      return {
        content: finalResponse,
        confidence: analysis.confidence,
        agentId: 'campaign',
        agentName: 'Campaign Agent',
        suggestions: [
          'Ask about campaign performance',
          'Request geographic insights',
          'Get optimization recommendations',
          'Compare campaign metrics'
        ],
        nextActions: []
      };
    } catch (error) {
      console.error('Campaign Agent error:', error);
      return {
        content: this.conversationHelper.generateFallbackResponse(message, 'campaign'),
        confidence: 0.1,
        agentId: 'campaign',
        agentName: 'Campaign Agent',
        suggestions: ['Try rephrasing your question', 'Check your dashboard directly'],
        nextActions: []
      };
    }
  }

  private isSimpleCampaignQuery(message: string): boolean {
    const simpleCampaignKeywords = [
      'what campaign', 'which campaign', 'campaign running', 'active campaign',
      'my campaign', 'campaigns running', 'current campaign', 'campaign list',
      'show campaign', 'list campaign', 'campaign status', 'campaigns i have'
    ];
    
    // Exclude performance-related queries
    const performanceKeywords = [
      'how is it performing', 'how is performing', 'performance', 'how performing',
      'impressions', 'metrics', 'analytics', 'kpi', 'cpm', 'ctr', 'roi'
    ];
    
    const hasSimpleKeywords = simpleCampaignKeywords.some(keyword => message.includes(keyword));
    const hasPerformanceKeywords = performanceKeywords.some(keyword => message.includes(keyword));
    
    return hasSimpleKeywords && !hasPerformanceKeywords;
  }

  private async handleSimpleCampaignQueryWithReasoning(message: string, context: AgentContext): Promise<string> {
    try {
      // ✅ Use multi-turn reasoning
      const reasoningSteps = this.conversationHelper.generateReasoningSteps(message, false);
      
      // Try multiple approaches to get campaign data
      const approaches = [
        () => this.tryGetCampaignsWithAllFields(context),
        () => this.tryGetCampaignsWithBasicFields(context),
        () => this.tryGetCampaignsMinimal(context)
      ];

      let campaigns = null;
      let error = null;

      for (const approach of approaches) {
        try {
          const result = await approach();
          if (result.data && result.data.length >= 0) {
            campaigns = result.data;
            break;
          }
        } catch (err) {
          error = err as Error;
          console.log('Campaign query approach failed:', (err as Error).message);
          continue;
        }
      }

      if (!campaigns) {
        return this.conversationHelper.generateFallbackResponse(message, 'campaign');
      }

      if (campaigns.length === 0) {
        return "You don't have any campaigns set up yet. You can create your first campaign from the Campaigns page in your dashboard.";
      }

      // ✅ Summarise, don't dump - use ConversationHelper formatting
      return this.conversationHelper.formatDataResults(campaigns, message);
    } catch (error) {
      console.error('Error handling simple campaign query:', error);
      return this.conversationHelper.generateFallbackResponse(message, 'campaign');
    }
  }

  private async tryGetCampaignsWithAllFields(context: AgentContext) {
    return await supabase
      .from('campaigns')
      .select('id, name, status, created_at, start_date, end_date, budget, spend')
      .order('created_at', { ascending: false });
  }

  private async tryGetCampaignsWithBasicFields(context: AgentContext) {
    return await supabase
      .from('campaigns')
      .select('id, name, status, created_at')
      .order('created_at', { ascending: false });
  }

  private async tryGetCampaignsMinimal(context: AgentContext) {
    return await supabase
      .from('campaigns')
      .select('name, status')
      .order('created_at', { ascending: false });
  }

  private generateHelpfulCampaignResponse(message: string, error: any): string {
    const lowerMessage = message.toLowerCase();
    
    if (error && error.message && error.message.includes('column')) {
      return "I found your campaigns but some data fields aren't available yet. You can check your campaign details in the Campaigns section of your dashboard.";
    }
    
    if (lowerMessage.includes('campaign')) {
      return "I'm having trouble accessing your campaign data right now. You can check your campaigns directly in the Campaigns section of your dashboard.";
    }
    
    return "I understand you're asking about your campaigns, but I'm having trouble accessing that information right now. You can check your campaigns directly in the Campaigns section of your dashboard.";
  }

  private isComplexDatabaseQuery(message: string): boolean {
    const complexQueryKeywords = [
      'performance', 'metrics', 'impressions', 'completions', 'spend', 'revenue',
      'compare', 'analysis', 'trends', 'top', 'best', 'worst', 'average', 'total',
      'how many', 'count', 'sum', 'aggregate', 'group by', 'filter', 'where',
      'recent', 'last week', 'last month', 'this month', 'this year',
      'efficiency', 'roi', 'cpm', 'ctr', 'conversion', 'audience', 'geographic',
      'insights', 'insight'
    ];
    
    const lowerMessage = message.toLowerCase();
    return complexQueryKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private createResponse(content: string, confidence: number): AgentResponse {
    return {
      content,
      confidence,
      agentId: 'campaign',
      agentName: 'Campaign Agent',
      suggestions: [
        'Ask about campaign performance',
        'Request geographic insights',
        'Get optimization recommendations',
        'Compare campaign metrics'
      ],
      nextActions: [
        'View campaign dashboard',
        'Export performance report',
        'Set up campaign alerts'
      ]
    };
  }

  protected async gatherRelevantData(message: string, context: AgentContext, planning: string): Promise<string> {
    try {
      // Extract data requirements from planning
      const dataNeeded = planning.includes('DATA_NEEDED') 
        ? planning.split('DATA_NEEDED:')[1]?.split('\n')[0] || ''
        : '';

      // Gather campaign data based on requirements
      const data: any = {};
      
      if (dataNeeded.includes('campaign') || dataNeeded.includes('performance')) {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id, name, status, budget, spend');
        data.campaigns = campaigns || [];
      }
      
      if (dataNeeded.includes('metrics') || dataNeeded.includes('impressions')) {
        const { data: metrics } = await supabase
          .from('campaign_summary_metrics')
          .select('campaign_id, campaign_name, total_impressions, total_completed_views, total_spend, total_revenue, completion_rate, ctr, roas')
          .limit(1000);
        data.metrics = metrics || [];
      }
      
      if (dataNeeded.includes('geographic') || dataNeeded.includes('location')) {
        const { data: geoData } = await supabase
          .from('campaign_events')
          .select('postcode_sector, impressions, completions')
          .limit(1000);
        data.geographic = geoData || [];
      }

      if (dataNeeded.includes('inventory') || dataNeeded.includes('publisher')) {
        const { data: inventoryData } = await supabase
          .from('campaign_events')
          .select('pub_name, impressions, completions')
          .limit(1000);
        data.inventory = inventoryData || [];
      }

      return this.formatDataContext(data);
    } catch (error) {
      console.error('Error gathering relevant data:', error);
      return 'Unable to gather relevant campaign data at this time.';
    }
  }

  private async improveResponse(response: string, originalQuery: string, suggestions: string[]): Promise<string> {
    const improvementPrompt = `Improve this campaign response based on the feedback:

ORIGINAL QUERY: "${originalQuery}"
CURRENT RESPONSE: "${response}"
IMPROVEMENT SUGGESTIONS: ${suggestions.join(', ')}

Provide an improved response that addresses the issues while maintaining accuracy and helpfulness for campaign analysis.`;

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

  private determineAnalysisType(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('5 interesting') || lowerMessage.includes('insights') || lowerMessage.includes('analyze') && lowerMessage.includes('data')) {
      return 'insights_analysis';
    } else if (lowerMessage.includes('impression') || lowerMessage.includes('how many') || lowerMessage.includes('metrics')) {
      return 'campaign_metrics';
    } else if (lowerMessage.includes('geographic') || lowerMessage.includes('location') || lowerMessage.includes('geo')) {
      return 'geographic_analysis';
    } else if (lowerMessage.includes('inventory') || lowerMessage.includes('publisher') || lowerMessage.includes('bundle')) {
      return 'inventory_analysis';
    } else if (lowerMessage.includes('trend') || lowerMessage.includes('over time') || lowerMessage.includes('daily')) {
      return 'trend_analysis';
    } else if (lowerMessage.includes('compare') || lowerMessage.includes('vs') || lowerMessage.includes('versus')) {
      return 'comparison';
    } else if (lowerMessage.includes('optimize') || lowerMessage.includes('improve') || lowerMessage.includes('recommend')) {
      return 'optimization';
    } else {
      return 'general_overview';
    }
  }

  private async getRelevantData(analysisType: string, context: AgentContext): Promise<any> {
    try {
      const orgId = context.organizationId || '16bb4799-c3b2-44c9-87a0-1d253bc83c15'; // Default org ID
      
      switch (analysisType) {
        case 'insights_analysis':
          return await this.getInsightsData(orgId);
        case 'campaign_metrics':
          return await this.getCampaignMetricsData(orgId);
        case 'geographic_analysis':
          return await this.getGeographicData(orgId);
        case 'inventory_analysis':
          return await this.getInventoryData(orgId);
        case 'trend_analysis':
          return await this.getTrendData(orgId);
        case 'comparison':
          return await this.getComparisonData(orgId);
        case 'optimization':
          return await this.getOptimizationData(orgId);
        default:
          return await this.getOverviewData(orgId);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      return null;
    }
  }

  private async getInsightsData(orgId: string) {
    // Get comprehensive data for insights analysis
    const { data: campaignMetrics, error: campaignError } = await supabase
      .from('campaign_summary_metrics')
      .select('*')
      .eq('organization_id', orgId)
      .order('total_impressions', { ascending: false })
      .limit(10);

    const { data: dailyMetrics, error: dailyError } = await supabase
      .from('daily_overall_metrics')
      .select('*')
      .eq('organization_id', orgId)
      .order('event_date', { ascending: false })
      .limit(30);

    const { data: geoEvents, error: geoError } = await supabase
      .from('campaign_events')
      .select('geo, event_type')
      .eq('organization_id', orgId)
      .not('geo', 'is', null)
      .neq('geo', '')
      .limit(1000);

    const { data: inventoryData, error: inventoryError } = await supabase
      .from('campaign_events')
      .select('pub_name, bundle_id, event_type')
      .eq('organization_id', orgId)
      .not('pub_name', 'is', null)
      .limit(1000);

    if (campaignError || dailyError || geoError || inventoryError) throw campaignError || dailyError || geoError || inventoryError;

    // Aggregate geographic data
    const geoAggregation: Record<string, GeoMetrics> = {};
    geoEvents?.forEach(event => {
      if (!geoAggregation[event.geo]) {
        geoAggregation[event.geo] = { impressions: 0, completions: 0 };
      }
      if (event.event_type === 'impression') {
        geoAggregation[event.geo].impressions++;
      } else if (event.event_type === 'videocomplete') {
        geoAggregation[event.geo].completions++;
      }
    });

    // Aggregate inventory data
    const inventoryAggregation: Record<string, InventoryMetrics> = {};
    inventoryData?.forEach(event => {
      const publisher = event.pub_name || 'Unknown';
      if (!inventoryAggregation[publisher]) {
        inventoryAggregation[publisher] = { impressions: 0, completions: 0 };
      }
      if (event.event_type === 'impression') {
        inventoryAggregation[publisher].impressions++;
      } else if (event.event_type === 'videocomplete') {
        inventoryAggregation[publisher].completions++;
      }
    });

    return { 
      campaignMetrics, 
      dailyMetrics, 
      geoAggregation,
      inventoryAggregation,
      totalGeoEvents: geoEvents?.length || 0,
      totalInventoryEvents: inventoryData?.length || 0
    };
  }

  private async getCampaignMetricsData(orgId: string) {
    const { data: campaignMetrics, error } = await supabase
      .from('campaign_summary_metrics')
      .select('*')
      .eq('organization_id', orgId)
      .order('total_impressions', { ascending: false })
      .limit(10);

    if (error) throw error;
    return { campaignMetrics };
  }

  private async getGeographicData(orgId: string) {
    const { data: geoEvents, error } = await supabase
      .from('campaign_events')
      .select('geo, event_type')
      .eq('organization_id', orgId)
      .not('geo', 'is', null)
      .neq('geo', '')
      .limit(1000);

    if (error) throw error;
    
    const geoAggregation: Record<string, GeoMetrics> = {};
    geoEvents?.forEach(event => {
      if (!geoAggregation[event.geo]) {
        geoAggregation[event.geo] = { impressions: 0, completions: 0 };
      }
      if (event.event_type === 'impression') {
        geoAggregation[event.geo].impressions++;
      } else if (event.event_type === 'videocomplete') {
        geoAggregation[event.geo].completions++;
      }
    });

    return { geoAggregation, totalGeoEvents: geoEvents?.length || 0 };
  }

  private async getInventoryData(orgId: string) {
    const { data: inventoryData, error } = await supabase
      .from('campaign_events')
      .select('pub_name, bundle_id, event_type')
      .eq('organization_id', orgId)
      .not('pub_name', 'is', null)
      .limit(1000);

    if (error) throw error;
    
    const inventoryAggregation: Record<string, InventoryMetrics> = {};
    inventoryData?.forEach(event => {
      const publisher = event.pub_name || 'Unknown';
      if (!inventoryAggregation[publisher]) {
        inventoryAggregation[publisher] = { impressions: 0, completions: 0 };
      }
      if (event.event_type === 'impression') {
        inventoryAggregation[publisher].impressions++;
      } else if (event.event_type === 'videocomplete') {
        inventoryAggregation[publisher].completions++;
      }
    });

    return { inventoryAggregation, totalInventoryEvents: inventoryData?.length || 0 };
  }

  private async getTrendData(orgId: string) {
    const { data: dailyMetrics, error } = await supabase
      .from('daily_overall_metrics')
      .select('*')
      .eq('organization_id', orgId)
      .order('event_date', { ascending: true })
      .limit(30);

    if (error) throw error;
    return { dailyMetrics };
  }

  private async getComparisonData(orgId: string) {
    const { data: campaignMetrics, error } = await supabase
      .from('campaign_summary_metrics')
      .select('*')
      .eq('organization_id', orgId)
      .order('total_impressions', { ascending: false })
      .limit(5);

    if (error) throw error;
    return { campaignMetrics };
  }

  private async getOptimizationData(orgId: string) {
    // Get data for optimization recommendations
    const { data: campaignMetrics, error } = await supabase
      .from('campaign_summary_metrics')
      .select('*')
      .eq('organization_id', orgId)
      .order('total_impressions', { ascending: false })
      .limit(10);

    if (error) throw error;
    return { campaignMetrics };
  }

  private async getOverviewData(orgId: string) {
    const { data: dailyMetrics, error: dailyError } = await supabase
      .from('daily_overall_metrics')
      .select('*')
      .eq('organization_id', orgId)
      .order('event_date', { ascending: false })
      .limit(7);

    const { data: campaignMetrics, error: campaignError } = await supabase
      .from('campaign_summary_metrics')
      .select('*')
      .eq('organization_id', orgId)
      .order('total_impressions', { ascending: false })
      .limit(5);

    if (dailyError || campaignError) throw dailyError || campaignError;
    
    return { dailyMetrics, campaignMetrics };
  }

  protected createSystemPrompt(context: AgentContext, data?: any): string {
    const dataContext = data ? this.formatDataContext(data) : 'No data available';
    
    return `You are a Data and Insights Analyst for LightBoxTV, specializing in campaign analytics and optimization. Your job is to analyze campaign data and provide actionable recommendations for optimizations and future campaigns.

Your capabilities include:
${this.capabilities.map(cap => `- ${cap.name}: ${cap.description}`).join('\n')}

Current context:
- User ID: ${context.userId || 'Unknown'}
- Organization ID: ${context.organizationId || 'Unknown'}
- Current page: ${context.currentPage || 'Unknown'}
- Active filters: ${JSON.stringify(context.filters || {})}

REAL DATA CONTEXT:
${dataContext}

CRITICAL INSTRUCTIONS:
- ONLY use the real data provided above - NEVER make up or generate fake data
- Keep responses concise and actionable (2-3 sentences max)
- If no real data is available, say "No data available for this query"
- Focus on providing actionable insights and recommendations based on the data
- Use specific numbers from the data to support your recommendations
- Be direct and practical in your advice
- If asked about impressions, provide the actual numbers from the data
- ALWAYS provide actionable recommendations based on data patterns

SPECIAL INSTRUCTIONS FOR INSIGHTS ANALYSIS:
- When asked for 5 interesting insights, provide exactly 5 numbered insights
- Each insight should be 1-2 sentences maximum
- Start with a data observation, then provide an actionable recommendation
- Use exact numbers from the data: impressions, completion rates, spend, geographic performance
- Format as: "1. [data observation] → [actionable recommendation]" etc.
- Focus on optimization opportunities and strategic recommendations
- Make recommendations specific and actionable
- Keep observations concise (1 sentence) and recommendations actionable (1 sentence)
- Use the arrow symbol (→) to separate observation from recommendation
- NEVER start with generic phrases like "Based on the analytics data" or "Here is"
- ALWAYS start with specific data like "Campaign 1 delivered 45,230 impressions" or "London (SW1) shows 92% completion rate"
- Use specific numbers, dates, postcodes, and campaign IDs from the data

Provide brief, data-driven insights with actionable recommendations based on the LightBoxTV campaign data.`;
  }

  private formatDataContext(data: any): string {
    if (!data) return 'No data available';

    let context = '';
    
    if (data.campaignMetrics && data.campaignMetrics.length > 0) {
      context += `CAMPAIGN PERFORMANCE ANALYSIS:\n`;
      data.campaignMetrics.slice(0, 5).forEach((campaign: any, index: number) => {
        const completionRate = campaign.total_impressions > 0 ? ((campaign.total_completed_views || 0) / campaign.total_impressions * 100).toFixed(1) : '0';
        const cpm = campaign.total_impressions > 0 ? ((campaign.total_spend || 0) / campaign.total_impressions * 1000).toFixed(2) : '0';
        context += `- Campaign ${index + 1} (ID: ${campaign.campaign_id}): ${campaign.total_impressions?.toLocaleString() || 0} impressions, ${completionRate}% completion rate, £${campaign.total_spend?.toFixed(2) || 0} spend, £${cpm} CPM\n`;
      });
      
      // Calculate performance ranges for optimization insights
      const completionRates = data.campaignMetrics.map((c: any) => 
        c.total_impressions > 0 ? ((c.total_completed_views || 0) / c.total_impressions * 100) : 0
      ).filter((r: number) => r > 0);
      
      if (completionRates.length > 0) {
        const avgCompletionRate = (completionRates.reduce((a: number, b: number) => a + b, 0) / completionRates.length).toFixed(1);
        const maxCompletionRate = Math.max(...completionRates).toFixed(1);
        const minCompletionRate = Math.min(...completionRates).toFixed(1);
        context += `- Completion Rate Range: ${minCompletionRate}% - ${maxCompletionRate}% (Avg: ${avgCompletionRate}%)\n`;
      }
      context += '\n';
    }

    if (data.geoAggregation && Object.keys(data.geoAggregation).length > 0) {
      context += `GEOGRAPHIC OPPORTUNITIES:\n`;
      const topGeo = Object.entries(data.geoAggregation)
        .sort(([,a], [,b]) => (b as GeoMetrics).impressions - (a as GeoMetrics).impressions)
        .slice(0, 5);
      
      const geoCompletionRates = Object.entries(data.geoAggregation)
        .map(([postcode, metrics]) => {
          const geoMetrics = metrics as GeoMetrics;
          const completionRate = geoMetrics.impressions > 0 ? (geoMetrics.completions / geoMetrics.impressions * 100) : 0;
          return { postcode, completionRate, impressions: geoMetrics.impressions };
        })
        .filter(g => g.impressions > 0)
        .sort((a, b) => b.completionRate - a.completionRate);
      
      topGeo.forEach(([postcode, metrics]) => {
        const geoMetrics = metrics as GeoMetrics;
        const completionRate = geoMetrics.impressions > 0 ? (geoMetrics.completions / geoMetrics.impressions * 100).toFixed(1) : '0';
        context += `- ${postcode}: ${geoMetrics.impressions} impressions, ${completionRate}% completion rate\n`;
      });
      
      if (geoCompletionRates.length > 0) {
        const bestGeo = geoCompletionRates[0];
        const worstGeo = geoCompletionRates[geoCompletionRates.length - 1];
        context += `- Best performing region: ${bestGeo.postcode} (${bestGeo.completionRate.toFixed(1)}% completion)\n`;
        context += `- Opportunity region: ${worstGeo.postcode} (${worstGeo.completionRate.toFixed(1)}% completion)\n`;
      }
      context += '\n';
    }

    if (data.inventoryAggregation && Object.keys(data.inventoryAggregation).length > 0) {
      context += `INVENTORY PERFORMANCE:\n`;
      const topPublishers = Object.entries(data.inventoryAggregation)
        .sort(([,a], [,b]) => (b as InventoryMetrics).impressions - (a as InventoryMetrics).impressions)
        .slice(0, 5);
      
      const publisherCompletionRates = Object.entries(data.inventoryAggregation)
        .map(([publisher, metrics]) => {
          const inventoryMetrics = metrics as InventoryMetrics;
          const completionRate = inventoryMetrics.impressions > 0 ? (inventoryMetrics.completions / inventoryMetrics.impressions * 100) : 0;
          return { publisher, completionRate, impressions: inventoryMetrics.impressions };
        })
        .filter(p => p.impressions > 0)
        .sort((a, b) => b.completionRate - a.completionRate);
      
      topPublishers.forEach(([publisher, metrics]) => {
        const inventoryMetrics = metrics as InventoryMetrics;
        const completionRate = inventoryMetrics.impressions > 0 ? (inventoryMetrics.completions / inventoryMetrics.impressions * 100).toFixed(1) : '0';
        context += `- ${publisher}: ${inventoryMetrics.impressions} impressions, ${completionRate}% completion rate\n`;
      });
      
      if (publisherCompletionRates.length > 0) {
        const bestPublisher = publisherCompletionRates[0];
        const worstPublisher = publisherCompletionRates[publisherCompletionRates.length - 1];
        context += `- Top performing publisher: ${bestPublisher.publisher} (${bestPublisher.completionRate.toFixed(1)}% completion)\n`;
        context += `- Opportunity publisher: ${worstPublisher.publisher} (${worstPublisher.completionRate.toFixed(1)}% completion)\n`;
      }
      context += '\n';
    }

    if (data.dailyMetrics && data.dailyMetrics.length > 0) {
      context += `PERFORMANCE TRENDS & OPTIMIZATION OPPORTUNITIES:\n`;
      const totalImpressions = data.dailyMetrics.reduce((sum: number, day: any) => sum + (day.total_impressions || 0), 0);
      const totalCompletedViews = data.dailyMetrics.reduce((sum: number, day: any) => sum + (day.total_completed_views || 0), 0);
      const overallCompletionRate = totalImpressions > 0 ? (totalCompletedViews / totalImpressions * 100).toFixed(1) : '0';
      const avgDailyImpressions = Math.round(totalImpressions / data.dailyMetrics.length);
      
      context += `- Total: ${totalImpressions.toLocaleString()} impressions, ${overallCompletionRate}% completion rate\n`;
      context += `- Average: ${avgDailyImpressions.toLocaleString()} impressions per day\n`;
      
      // Find best and worst days for optimization insights
      const sortedDays = [...data.dailyMetrics].sort((a, b) => (b.total_impressions || 0) - (a.total_impressions || 0));
      if (sortedDays.length > 0) {
        const bestDay = sortedDays[0];
        const worstDay = sortedDays[sortedDays.length - 1];
        const bestDayCompletionRate = bestDay.total_impressions > 0 ? ((bestDay.total_completed_views || 0) / bestDay.total_impressions * 100).toFixed(1) : '0';
        const worstDayCompletionRate = worstDay.total_impressions > 0 ? ((worstDay.total_completed_views || 0) / worstDay.total_impressions * 100).toFixed(1) : '0';
        
        context += `- Peak performance: ${bestDay.event_date} (${bestDay.total_impressions?.toLocaleString() || 0} impressions, ${bestDayCompletionRate}% completion)\n`;
        context += `- Optimization needed: ${worstDay.event_date} (${worstDay.total_impressions?.toLocaleString() || 0} impressions, ${worstDayCompletionRate}% completion)\n`;
      }
      context += '\n';
    }

    return context;
  }
} 