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
      // Determine what type of analysis is needed
      const analysisType = this.determineAnalysisType(message);
      
      // Get relevant data based on analysis type
      const data = await this.getRelevantData(analysisType, context);
      
      // Create system prompt with real data context
      const systemPrompt = this.createSystemPrompt(context, data);
      
      // Use two-call approach for better responses
      const response = await this.processWithTwoCalls(message, context, history, systemPrompt);

      return {
        content: response,
        confidence: 0.9,
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
    } catch (error) {
      console.error('Campaign Agent error:', error);
      return {
        content: "I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists.",
        confidence: 0.1,
        agentId: 'campaign',
        agentName: 'Campaign Agent'
      };
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