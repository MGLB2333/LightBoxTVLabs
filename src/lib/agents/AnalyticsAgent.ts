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

export class AnalyticsAgent extends BaseAgent {
  constructor() {
    super(
      'analytics',
      'Analytics Agent',
      'Specialized in analyzing campaign performance, metrics, and data insights from LightBoxTV data',
      [
        {
          name: 'Performance Analysis',
          description: 'Analyze campaign performance metrics, trends, and KPIs from real data',
          examples: [
            'How is my campaign performing?',
            'Show me the top performing campaigns',
            'What are the key metrics for this period?'
          ]
        },
        {
          name: 'Data Insights',
          description: 'Provide insights from campaign data and identify patterns',
          examples: [
            'What insights can you find in my data?',
            'Are there any unusual patterns?',
            'What trends do you see?'
          ]
        },
        {
          name: 'Metric Comparison',
          description: 'Compare metrics across different campaigns, time periods, or segments',
          examples: [
            'Compare performance between campaigns',
            'How does this month compare to last month?',
            'Which campaigns are performing best?'
          ]
        }
      ]
    );
  }

  canHandle(message: string, context: AgentContext): boolean {
    const analyticsKeywords = [
      'performance', 'metrics', 'kpi', 'analytics', 'data', 'insights', 'trends',
      'campaign', 'impressions', 'clicks', 'conversions', 'roi', 'cpm', 'ctr',
      'compare', 'analysis', 'report', 'dashboard', 'statistics', 'spend', 'revenue',
      'completion', 'audience', 'geographic', 'inventory', 'publisher'
    ];

    const lowerMessage = message.toLowerCase();
    return analyticsKeywords.some(keyword => lowerMessage.includes(keyword));
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
          agentId: 'analytics',
          agentName: 'Analytics Agent',
          suggestions: [
            'Ask about specific metrics',
            'Request performance insights',
            'Get trend analysis'
          ],
          nextActions: []
        };
      }

      // 🗃️ Step 2: Validate query and map to schema
      const validation = this.conversationHelper.validateQuery(message);
      if (!validation.isValid) {
        return {
          content: this.conversationHelper.generateFallbackResponse(message, 'analytics'),
          confidence: 0.1,
          agentId: 'analytics',
          agentName: 'Analytics Agent',
          suggestions: ['Try rephrasing your question', 'Ask about specific metrics'],
          nextActions: []
        };
      }

      // Step 3: Determine analysis type and gather data
      const analysisType = this.determineAnalysisType(message);
      const data = await this.getRelevantData(analysisType, context);
      
      if (!data || Object.keys(data).length === 0) {
        return {
          content: this.conversationHelper.generateFallbackResponse(message, 'analytics'),
          confidence: 0.1,
          agentId: 'analytics',
          agentName: 'Analytics Agent',
          suggestions: ['Check your dashboard', 'Set up analytics tracking'],
          nextActions: []
        };
      }

      // Step 4: Generate response using iterative reasoning
      const systemPrompt = this.createSystemPrompt(context, data);
      const response = await this.processWithIterativeReasoning(message, context, history, systemPrompt);

      // ✅ Format response with human-like touches
      const formattedResponse = this.conversationHelper.formatResponse(response, true);
      
      // ✅ Add relevant context from memory
      const relevantContext = this.conversationHelper.getRelevantContext(memory, message);
      const finalResponse = relevantContext ? `${relevantContext} ${formattedResponse}` : formattedResponse;

      return {
        content: finalResponse,
        confidence: analysis.confidence,
        agentId: 'analytics',
        agentName: 'Analytics Agent',
        suggestions: [
          'Ask about performance trends',
          'Request geographic insights',
          'Get audience analysis',
          'Compare metrics over time'
        ],
        nextActions: []
      };
    } catch (error) {
      console.error('Analytics Agent error:', error);
      return {
        content: this.conversationHelper.generateFallbackResponse(message, 'analytics'),
        confidence: 0.1,
        agentId: 'analytics',
        agentName: 'Analytics Agent',
        suggestions: ['Try rephrasing your question', 'Check your analytics dashboard'],
        nextActions: []
      };
    }
  }

  private createResponse(content: string, confidence: number): AgentResponse {
    return {
      content,
      confidence,
      agentId: 'analytics',
      agentName: 'Analytics Agent',
      suggestions: [
        'Ask about specific campaign performance',
        'Request geographic distribution analysis',
        'Get inventory performance insights',
        'Compare metrics across time periods'
      ],
      nextActions: [
        'View detailed analytics dashboard',
        'Export performance report',
        'Set up alerts for key metrics'
      ]
    };
  }

  protected async gatherRelevantData(message: string, context: AgentContext, planning: string): Promise<string> {
    try {
      // Extract data requirements from planning
      const dataNeeded = planning.includes('DATA_NEEDED') 
        ? planning.split('DATA_NEEDED:')[1]?.split('\n')[0] || ''
        : '';

      // Gather data based on requirements
      const data: any = {};
      
      if (dataNeeded.includes('campaign') || dataNeeded.includes('performance')) {
        data.campaignPerformance = await this.getCampaignPerformanceData(context.organizationId || '');
      }
      
      if (dataNeeded.includes('geographic') || dataNeeded.includes('location')) {
        data.geographic = await this.getGeographicData(context.organizationId || '');
      }
      
      if (dataNeeded.includes('inventory') || dataNeeded.includes('publisher')) {
        data.inventory = await this.getInventoryData(context.organizationId || '');
      }
      
      if (dataNeeded.includes('trend') || dataNeeded.includes('time')) {
        data.trends = await this.getTrendData(context.organizationId || '');
      }

      return this.formatDataContext(data);
    } catch (error) {
      console.error('Error gathering relevant data:', error);
      return 'Unable to gather relevant data at this time.';
    }
  }

  private async improveResponse(response: string, originalQuery: string, suggestions: string[]): Promise<string> {
    const improvementPrompt = `Improve this AI response based on the feedback:

ORIGINAL QUERY: "${originalQuery}"
CURRENT RESPONSE: "${response}"
IMPROVEMENT SUGGESTIONS: ${suggestions.join(', ')}

Provide an improved response that addresses the issues while maintaining accuracy and helpfulness.`;

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
    
    if (lowerMessage.includes('campaign') || lowerMessage.includes('performance')) {
      return 'campaign_performance';
    } else if (lowerMessage.includes('geographic') || lowerMessage.includes('location') || lowerMessage.includes('geo')) {
      return 'geographic_analysis';
    } else if (lowerMessage.includes('inventory') || lowerMessage.includes('publisher') || lowerMessage.includes('bundle')) {
      return 'inventory_analysis';
    } else if (lowerMessage.includes('trend') || lowerMessage.includes('over time') || lowerMessage.includes('daily')) {
      return 'trend_analysis';
    } else if (lowerMessage.includes('compare') || lowerMessage.includes('vs') || lowerMessage.includes('versus')) {
      return 'comparison';
    } else {
      return 'general_overview';
    }
  }

  private async getRelevantData(analysisType: string, context: AgentContext): Promise<any> {
    try {
      const orgId = context.organizationId || '16bb4799-c3b2-44c9-87a0-1d253bc83c15'; // Default org ID
      
      switch (analysisType) {
        case 'campaign_performance':
          return await this.getCampaignPerformanceData(orgId);
        case 'geographic_analysis':
          return await this.getGeographicData(orgId);
        case 'inventory_analysis':
          return await this.getInventoryData(orgId);
        case 'trend_analysis':
          return await this.getTrendData(orgId);
        case 'comparison':
          return await this.getComparisonData(orgId);
        default:
          return await this.getOverviewData(orgId);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      return null;
    }
  }

  private async getCampaignPerformanceData(orgId: string) {
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
    // Get campaign events with geographic data
    const { data: geoEvents, error } = await supabase
      .from('campaign_events')
      .select('geo, event_type')
      .eq('organization_id', orgId)
      .not('geo', 'is', null)
      .neq('geo', '')
      .limit(1000);

    if (error) throw error;
    
    // Aggregate by postcode
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
    // Get inventory performance data
    const { data: inventoryData, error } = await supabase
      .from('campaign_events')
      .select('pub_name, bundle_id, event_type')
      .eq('organization_id', orgId)
      .not('pub_name', 'is', null)
      .limit(1000);

    if (error) throw error;
    
    // Aggregate by publisher
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
    // Get data for comparison (campaigns, time periods, etc.)
    const { data: campaignMetrics, error } = await supabase
      .from('campaign_summary_metrics')
      .select('*')
      .eq('organization_id', orgId)
      .order('total_impressions', { ascending: false })
      .limit(5);

    if (error) throw error;
    return { campaignMetrics };
  }

  private async getOverviewData(orgId: string) {
    // Get overall summary data
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
    
    return `You are the Analytics Agent, a specialized AI for LightBoxTV analytics. 

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
- Keep responses concise and to the point (2-4 sentences max)
- If no real data is available, say "No data available for this query"
- Focus on actionable insights from the actual data
- Use specific numbers from the data when available
- Be direct and avoid lengthy explanations

Provide brief, data-driven responses based on the LightBoxTV analytics data.`;
  }

  private formatDataContext(data: any): string {
    if (!data) return 'No data available';

    let context = '';
    
    if (data.campaignMetrics) {
      context += `CAMPAIGN PERFORMANCE DATA:\n`;
      data.campaignMetrics.forEach((campaign: any, index: number) => {
        context += `- Campaign ${index + 1}: ${campaign.campaign_id}\n`;
        context += `  Impressions: ${campaign.total_impressions?.toLocaleString() || 0}\n`;
        context += `  Completed Views: ${campaign.total_completed_views?.toLocaleString() || 0}\n`;
        context += `  Completion Rate: ${campaign.completion_rate?.toFixed(2) || 0}%\n`;
        context += `  Spend: £${campaign.total_spend?.toFixed(2) || 0}\n`;
        context += `  ROAS: ${campaign.roas?.toFixed(2) || 0}x\n\n`;
      });
    }

    if (data.geoAggregation) {
      context += `GEOGRAPHIC DISTRIBUTION:\n`;
      const topGeo = Object.entries(data.geoAggregation)
        .sort(([,a], [,b]) => (a as GeoMetrics).impressions - (b as GeoMetrics).impressions)
        .slice(0, 5);
      
      topGeo.forEach(([postcode, metrics]) => {
        const geoMetrics = metrics as GeoMetrics;
        context += `- ${postcode}: ${geoMetrics.impressions} impressions, ${geoMetrics.completions} completions\n`;
      });
      context += '\n';
    }

    if (data.inventoryAggregation) {
      context += `INVENTORY PERFORMANCE:\n`;
      const topPublishers = Object.entries(data.inventoryAggregation)
        .sort(([,a], [,b]) => (a as InventoryMetrics).impressions - (b as InventoryMetrics).impressions)
        .slice(0, 5);
      
      topPublishers.forEach(([publisher, metrics]) => {
        const inventoryMetrics = metrics as InventoryMetrics;
        const completionRate = inventoryMetrics.impressions > 0 ? (inventoryMetrics.completions / inventoryMetrics.impressions * 100).toFixed(2) : '0';
        context += `- ${publisher}: ${inventoryMetrics.impressions} impressions, ${completionRate}% completion rate\n`;
      });
      context += '\n';
    }

    if (data.dailyMetrics) {
      context += `DAILY TRENDS (Last ${data.dailyMetrics.length} days):\n`;
      const totalImpressions = data.dailyMetrics.reduce((sum: number, day: any) => sum + (day.total_impressions || 0), 0);
      const totalSpend = data.dailyMetrics.reduce((sum: number, day: any) => sum + parseFloat(day.total_spend || 0), 0);
      context += `- Total Impressions: ${totalImpressions.toLocaleString()}\n`;
      context += `- Total Spend: £${totalSpend.toFixed(2)}\n`;
      context += `- Average Daily Impressions: ${Math.round(totalImpressions / data.dailyMetrics.length).toLocaleString()}\n\n`;
    }

    return context;
  }

  private isComplexAnalyticsQuery(message: string): boolean {
    const analyticsQueryKeywords = [
      'performance', 'metrics', 'kpi', 'analytics', 'data', 'insights', 'trends',
      'impressions', 'clicks', 'conversions', 'roi', 'cpm', 'ctr', 'completion',
      'compare', 'analysis', 'report', 'statistics', 'spend', 'revenue',
      'how many', 'count', 'sum', 'average', 'total', 'aggregate',
      'top', 'best', 'worst', 'highest', 'lowest', 'ranking',
      'geographic', 'location', 'postcode', 'area', 'region',
      'time', 'period', 'date', 'week', 'month', 'year',
      'trend', 'growth', 'decline', 'change', 'improvement'
    ];
    
    const lowerMessage = message.toLowerCase();
    return analyticsQueryKeywords.some(keyword => lowerMessage.includes(keyword));
  }
} 