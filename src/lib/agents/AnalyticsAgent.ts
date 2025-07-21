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
    } catch (error) {
      console.error('Analytics Agent error:', error);
      return {
        content: "I apologize, but I encountered an error while processing your analytics request. Please try again or contact support if the issue persists.",
        confidence: 0.1,
        agentId: 'analytics',
        agentName: 'Analytics Agent'
      };
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
} 