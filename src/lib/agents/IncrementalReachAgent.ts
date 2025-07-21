import { BaseAgent } from './BaseAgent';
import type { AgentContext, AgentMessage, AgentResponse } from './types';
import { supabase } from '../supabase';

interface IncrementalReachData {
  postcodeSector: string;
  campaignReach: number;
  otherReach: number;
  incrementalReach: number;
  incrementalPercentage: number;
  totalPopulation: number;
  geographicArea: string;
}

interface CampaignComparison {
  campaignId: string;
  campaignName: string;
  totalReach: number;
  incrementalReach: number;
  incrementalPercentage: number;
  cost: number;
  cpm: number;
}

interface GeographicInsight {
  area: string;
  totalIncremental: number;
  percentage: number;
  topPostcodes: string[];
}

export class IncrementalReachAgent extends BaseAgent {
  constructor() {
    super(
      'incremental-reach',
      'Incremental Reach Agent',
      'Specialized in calculating incremental reach by analyzing campaign delivery data and ACR data to identify unique audience reach',
      [
        {
          name: 'Incremental Analysis',
          description: 'Calculate incremental reach by comparing campaign delivery with other media',
          examples: [
            'Where did our CTV campaign reach people that linear missed?',
            'What is our incremental reach vs other campaigns?',
            'Show me postcodes with unique reach'
          ]
        },
        {
          name: 'Campaign Comparison',
          description: 'Compare incremental reach across different campaigns and channels',
          examples: [
            'Compare incremental reach between CTV and linear',
            'Which campaign had the highest incremental reach?',
            'Show incremental reach by geographic area'
          ]
        },
        {
          name: 'Geographic Insights',
          description: 'Analyze incremental reach patterns by geographic location',
          examples: [
            'Which areas had the most incremental reach?',
            'Show incremental reach by region',
            'Find postcodes with highest unique reach'
          ]
        }
      ]
    );
  }

  canHandle(message: string, context: AgentContext): boolean {
    const incrementalKeywords = [
      'incremental', 'reach', 'unique', 'additional', 'extra', 'beyond',
      'ctv', 'linear', 'tv', 'campaign', 'delivery', 'acr', 'postcode',
      'missed', 'unique audience', 'incremental reach', 'geographic',
      'area', 'region', 'location', 'coverage', 'overlap'
    ];

    const lowerMessage = message.toLowerCase();
    return incrementalKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  async process(message: string, context: AgentContext, history: AgentMessage[]): Promise<AgentResponse> {
    try {
      // Step 1: Analyze the request and determine analysis parameters
      const analysisParams = await this.analyzeRequest(message);
      
      // Step 2: Check if we have enough information
      if (!this.hasEnoughInfo(analysisParams)) {
        return {
          content: this.generateClarificationQuestion(analysisParams),
          confidence: 0.3,
          agentId: 'incremental-reach',
          agentName: 'Incremental Reach Agent',
          suggestions: [
            'Specify which campaigns you want to compare',
            'Mention the time period for analysis',
            'Indicate geographic areas of interest',
            'Specify the type of media (CTV, linear, digital)'
          ]
        };
      }

      // Step 3: Gather campaign and ACR data
      const data = await this.gatherData(analysisParams, context);
      
      // Step 4: Calculate incremental reach
      const incrementalData = await this.calculateIncrementalReach(data, analysisParams);
      
      // Step 5: Generate insights and recommendations
      const insights = this.generateInsights(incrementalData, analysisParams);
      
      // Step 6: Format response
      const response = this.formatResponse(insights, analysisParams);

      return {
        content: response,
        confidence: 0.9,
        agentId: 'incremental-reach',
        agentName: 'Incremental Reach Agent',
        data: incrementalData,
        suggestions: [
          'Get detailed postcode-level analysis',
          'Compare with other campaigns',
          'Export incremental reach report',
          'Analyze geographic patterns'
        ]
      };
    } catch (error) {
      console.error('Incremental Reach Agent error:', error);
      return {
        content: "I encountered an error while calculating incremental reach. Please try again or contact support if the issue persists.",
        confidence: 0.1,
        agentId: 'incremental-reach',
        agentName: 'Incremental Reach Agent'
      };
    }
  }

  private async analyzeRequest(message: string): Promise<any> {
    const prompt = `
    Analyze this incremental reach request and determine analysis parameters:
    
    REQUEST: "${message}"
    
    Determine the following:
    1. Campaign types to compare (CTV, linear, digital, etc.)
    2. Time period for analysis
    3. Geographic scope (specific areas, regions, nationwide)
    4. Comparison type (incremental vs other campaigns, vs baseline)
    5. Metrics needed (reach, percentage, cost efficiency)
    
    Respond in JSON format:
    {
      "campaignTypes": ["ctv", "linear", "digital"],
      "timePeriod": "recent|month|quarter|year",
      "geographicScope": "nationwide|region|specific",
      "areas": ["london", "manchester"],
      "comparisonType": "incremental|baseline|other",
      "metrics": ["reach", "percentage", "cost"],
      "confidence": 0.0-1.0
    }
    `;

    try {
      const response = await this.callOpenAI([
        { role: 'system', content: 'You are an incremental reach analysis expert. Determine analysis parameters from user requests.' },
        { role: 'user', content: prompt }
      ], { currentPage: 'incremental-reach' });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Failed to analyze request with AI, using fallback:', error);
    }

    // Fallback to keyword-based analysis
    return this.fallbackAnalysis(message);
  }

  private fallbackAnalysis(message: string): any {
    const lowerMessage = message.toLowerCase();
    
    const campaignTypes = [];
    if (lowerMessage.includes('ctv') || lowerMessage.includes('connected tv')) campaignTypes.push('ctv');
    if (lowerMessage.includes('linear') || lowerMessage.includes('tv')) campaignTypes.push('linear');
    if (lowerMessage.includes('digital') || lowerMessage.includes('online')) campaignTypes.push('digital');

    return {
      campaignTypes: campaignTypes.length > 0 ? campaignTypes : ['ctv', 'linear'],
      timePeriod: this.extractTimePeriod(lowerMessage),
      geographicScope: this.extractGeographicScope(lowerMessage),
      areas: this.extractAreas(lowerMessage),
      comparisonType: 'incremental',
      metrics: ['reach', 'percentage'],
      confidence: 0.7
    };
  }

  private extractTimePeriod(message: string): string {
    if (message.includes('last month') || message.includes('previous month')) return 'month';
    if (message.includes('last quarter') || message.includes('q1') || message.includes('q2') || message.includes('q3') || message.includes('q4')) return 'quarter';
    if (message.includes('last year') || message.includes('2023') || message.includes('2024')) return 'year';
    if (message.includes('recent') || message.includes('latest')) return 'recent';
    return 'recent';
  }

  private extractGeographicScope(message: string): string {
    if (message.includes('london') || message.includes('manchester') || message.includes('birmingham')) return 'specific';
    if (message.includes('region') || message.includes('area')) return 'region';
    return 'nationwide';
  }

  private extractAreas(message: string): string[] {
    const areas = [];
    if (message.includes('london')) areas.push('london');
    if (message.includes('manchester')) areas.push('manchester');
    if (message.includes('birmingham')) areas.push('birmingham');
    if (message.includes('leeds')) areas.push('leeds');
    if (message.includes('glasgow')) areas.push('glasgow');
    return areas;
  }

  private hasEnoughInfo(analysisParams: any): boolean {
    return analysisParams.confidence > 0.4;
  }

  private generateClarificationQuestion(analysisParams: any): string {
    if (analysisParams.campaignTypes.length === 0) {
      return "I'd be happy to analyze incremental reach! Could you specify which campaigns or media types you want to compare? For example: CTV vs linear TV, or specific campaign names.";
    }
    
    if (analysisParams.geographicScope === 'nationwide') {
      return "I can analyze incremental reach nationwide. Would you like to focus on specific regions or areas, or analyze the entire country?";
    }

    return "Could you provide more specific details about your incremental reach analysis? For example, what time period should I analyze, and are there specific campaigns you want to compare?";
  }

  private async gatherData(analysisParams: any, context: AgentContext): Promise<any> {
    const orgId = context.organizationId || 'default';
    
    try {
      // This would query actual campaign delivery and ACR data from Supabase
      // For now, returning mock data
      return this.getMockIncrementalData(analysisParams);
    } catch (error) {
      console.error('Error gathering incremental reach data:', error);
      throw error;
    }
  }

  private getMockIncrementalData(analysisParams: any): any {
    const mockIncrementalData: IncrementalReachData[] = [
      {
        postcodeSector: 'SW1A',
        campaignReach: 8500,
        otherReach: 7200,
        incrementalReach: 1300,
        incrementalPercentage: 15.3,
        totalPopulation: 12000,
        geographicArea: 'Central London'
      },
      {
        postcodeSector: 'M1',
        campaignReach: 9200,
        otherReach: 6800,
        incrementalReach: 2400,
        incrementalPercentage: 26.1,
        totalPopulation: 15000,
        geographicArea: 'Manchester'
      },
      {
        postcodeSector: 'B1',
        campaignReach: 7800,
        otherReach: 7500,
        incrementalReach: 300,
        incrementalPercentage: 3.8,
        totalPopulation: 11000,
        geographicArea: 'Birmingham'
      },
      {
        postcodeSector: 'LS1',
        campaignReach: 6500,
        otherReach: 5200,
        incrementalReach: 1300,
        incrementalPercentage: 20.0,
        totalPopulation: 9000,
        geographicArea: 'Leeds'
      },
      {
        postcodeSector: 'G1',
        campaignReach: 7200,
        otherReach: 5800,
        incrementalReach: 1400,
        incrementalPercentage: 19.4,
        totalPopulation: 10000,
        geographicArea: 'Glasgow'
      }
    ];

    const mockCampaignComparison: CampaignComparison[] = [
      {
        campaignId: 'ctv-001',
        campaignName: 'CTV Campaign Q1',
        totalReach: 450000,
        incrementalReach: 125000,
        incrementalPercentage: 27.8,
        cost: 75000,
        cpm: 166.67
      },
      {
        campaignId: 'linear-001',
        campaignName: 'Linear TV Campaign Q1',
        totalReach: 380000,
        incrementalReach: 85000,
        incrementalPercentage: 22.4,
        cost: 95000,
        cpm: 250.00
      }
    ];

    return {
      incrementalData: mockIncrementalData,
      campaignComparison: mockCampaignComparison,
      analysisParams
    };
  }

  private async calculateIncrementalReach(data: any, analysisParams: any): Promise<any> {
    // Calculate incremental reach metrics
    const totalIncremental = data.incrementalData.reduce((sum: number, item: IncrementalReachData) => sum + item.incrementalReach, 0);
    const totalCampaignReach = data.incrementalData.reduce((sum: number, item: IncrementalReachData) => sum + item.campaignReach, 0);
    const averageIncrementalPercentage = data.incrementalData.reduce((sum: number, item: IncrementalReachData) => sum + item.incrementalPercentage, 0) / data.incrementalData.length;

    // Group by geographic area
    const geographicInsights: GeographicInsight[] = [];
    const areaGroups = this.groupByArea(data.incrementalData);
    
    for (const [area, items] of Object.entries(areaGroups)) {
      const areaIncremental = items.reduce((sum: number, item: IncrementalReachData) => sum + item.incrementalReach, 0);
      const topPostcodes = items
        .sort((a: IncrementalReachData, b: IncrementalReachData) => b.incrementalReach - a.incrementalReach)
        .slice(0, 3)
        .map((item: IncrementalReachData) => item.postcodeSector);

      geographicInsights.push({
        area,
        totalIncremental: areaIncremental,
        percentage: (areaIncremental / totalIncremental) * 100,
        topPostcodes
      });
    }

    return {
      totalIncremental,
      totalCampaignReach,
      averageIncrementalPercentage,
      geographicInsights,
      topPostcodes: data.incrementalData
        .sort((a: IncrementalReachData, b: IncrementalReachData) => b.incrementalReach - a.incrementalReach)
        .slice(0, 5),
      campaignComparison: data.campaignComparison
    };
  }

  private groupByArea(data: IncrementalReachData[]): Record<string, IncrementalReachData[]> {
    return data.reduce((groups: Record<string, IncrementalReachData[]>, item: IncrementalReachData) => {
      const area = item.geographicArea;
      if (!groups[area]) {
        groups[area] = [];
      }
      groups[area].push(item);
      return groups;
    }, {});
  }

  private generateInsights(incrementalData: any, analysisParams: any): any {
    const insights = {
      summary: this.generateSummary(incrementalData),
      recommendations: this.generateRecommendations(incrementalData, analysisParams),
      keyFindings: this.generateKeyFindings(incrementalData)
    };

    return insights;
  }

  private generateSummary(incrementalData: any): string {
    return `Your campaign achieved ${incrementalData.totalIncremental.toLocaleString()} incremental reach, representing ${incrementalData.averageIncrementalPercentage.toFixed(1)}% of total campaign reach.`;
  }

  private generateRecommendations(incrementalData: any, analysisParams: any): string[] {
    const recommendations = [];
    
    if (incrementalData.averageIncrementalPercentage > 20) {
      recommendations.push('High incremental reach achieved - consider expanding to similar areas');
      recommendations.push('Focus on postcodes with highest incremental reach for future campaigns');
    } else {
      recommendations.push('Consider targeting strategies to increase incremental reach');
      recommendations.push('Analyze overlap with other media to optimize reach');
    }

    recommendations.push('Monitor incremental reach trends over time');
    recommendations.push('Compare performance across different geographic areas');

    return recommendations;
  }

  private generateKeyFindings(incrementalData: any): string[] {
    const findings = [];
    
    const topArea = incrementalData.geographicInsights[0];
    findings.push(`${topArea.area} had the highest incremental reach with ${topArea.totalIncremental.toLocaleString()} unique viewers`);
    
    const topPostcode = incrementalData.topPostcodes[0];
    findings.push(`Postcode ${topPostcode.postcodeSector} achieved ${topPostcode.incrementalPercentage.toFixed(1)}% incremental reach`);
    
    findings.push(`Average incremental reach across all areas: ${incrementalData.averageIncrementalPercentage.toFixed(1)}%`);

    return findings;
  }

  private formatResponse(insights: any, analysisParams: any): string {
    let response = `## 📈 Incremental Reach Analysis\n\n`;

    response += `**📊 Summary:** ${insights.summary}\n\n`;

    response += `**🎯 Key Findings:**\n`;
    insights.keyFindings.forEach((finding: string, index: number) => {
      response += `${index + 1}. ${finding}\n`;
    });

    response += `\n**🗺️ Geographic Performance:**\n`;
    insights.data.geographicInsights.forEach((area: GeographicInsight, index: number) => {
      response += `${index + 1}. **${area.area}**\n`;
      response += `   👥 ${area.totalIncremental.toLocaleString()} incremental reach\n`;
      response += `   📊 ${area.percentage.toFixed(1)}% of total incremental\n`;
      response += `   📍 Top postcodes: ${area.topPostcodes.join(', ')}\n\n`;
    });

    response += `**🏆 Top Performing Postcodes:**\n`;
    insights.data.topPostcodes.forEach((postcode: IncrementalReachData, index: number) => {
      response += `${index + 1}. **${postcode.postcodeSector}** (${postcode.geographicArea})\n`;
      response += `   👥 ${postcode.incrementalReach.toLocaleString()} incremental reach\n`;
      response += `   📊 ${postcode.incrementalPercentage.toFixed(1)}% incremental rate\n`;
      response += `   🎯 ${postcode.campaignReach.toLocaleString()} total campaign reach\n\n`;
    });

    if (insights.data.campaignComparison.length > 0) {
      response += `**📊 Campaign Comparison:**\n`;
      insights.data.campaignComparison.forEach((campaign: CampaignComparison, index: number) => {
        response += `${index + 1}. **${campaign.campaignName}**\n`;
        response += `   👥 ${campaign.totalReach.toLocaleString()} total reach\n`;
        response += `   📈 ${campaign.incrementalReach.toLocaleString()} incremental reach (${campaign.incrementalPercentage.toFixed(1)}%)\n`;
        response += `   💰 £${campaign.cost.toLocaleString()} cost (£${campaign.cpm.toFixed(2)} CPM)\n\n`;
      });
    }

    response += `**💡 Recommendations:**\n`;
    insights.recommendations.forEach((rec: string, index: number) => {
      response += `${index + 1}. ${rec}\n`;
    });

    return response;
  }
}
