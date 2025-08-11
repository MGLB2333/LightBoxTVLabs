import { BaseAgent } from './BaseAgent';
import type { AgentContext, AgentMessage, AgentResponse } from './types';
import { supabase } from '../supabase';

interface TVShow {
  id: string;
  title: string;
  channel: string;
  genre: string;
  viewership: number;
  overlap: number;
  brandVisibility: number;
  airTime: string;
  duration: number;
}

interface ChannelPerformance {
  id: string;
  name: string;
  totalViewership: number;
  averageRating: number;
  topShows: string[];
  audienceDemographics: any;
}

interface BrandExposure {
  brand: string;
  showTitle: string;
  channel: string;
  exposureTime: number;
  viewership: number;
  cost: number;
}

export class TVIntelligenceAgent extends BaseAgent {
  constructor() {
    super(
      'tv-intelligence',
      'TV Intelligence Agent',
      'Specialized in analyzing TV viewing patterns, brand visibility, and show/channel performance using ACR and TV data',
      [
        {
          name: 'Viewing Analysis',
          description: 'Analyze who watched what, viewing patterns, and audience behavior',
          examples: [
            'Which shows had the highest viewership last month?',
            'What did our target audience watch most?',
            'Show me viewing patterns by demographic'
          ]
        },
        {
          name: 'Brand Visibility',
          description: 'Track brand exposure and visibility across TV programming',
          examples: [
            'How much brand visibility did we get?',
            'Which shows had the most brand exposure?',
            'Calculate our brand visibility ROI'
          ]
        },
        {
          name: 'Show Performance',
          description: 'Analyze show and channel performance metrics',
          examples: [
            'Which programmes had the most overlap with our campaign?',
            'Compare channel performance',
            'Find the best performing shows for our audience'
          ]
        }
      ]
    );
  }

  canHandle(message: string, context: AgentContext): boolean {
    const tvKeywords = [
      'tv', 'television', 'show', 'programme', 'channel', 'viewing', 'watch',
      'brand', 'visibility', 'exposure', 'acr', 'audience', 'viewership',
      'rating', 'overlap', 'performance', 'broadcast', 'air', 'schedule',
      'what watched', 'who watched', 'viewing patterns', 'brand exposure'
    ];

    const lowerMessage = message.toLowerCase();
    return tvKeywords.some(keyword => lowerMessage.includes(keyword));
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
          agentId: 'tv-intelligence',
          agentName: 'TV Intelligence Agent',
          suggestions: [
            'Ask about TV shows',
            'Request viewing insights',
            'Get brand visibility data'
          ],
          nextActions: []
        };
      }

      // 🗃️ Step 2: Validate query
      const validation = this.conversationHelper.validateQuery(message);
      if (!validation.isValid) {
        return {
          content: this.conversationHelper.generateFallbackResponse(message, 'tv'),
          confidence: 0.1,
          agentId: 'tv-intelligence',
          agentName: 'TV Intelligence Agent',
          suggestions: ['Try rephrasing your question', 'Ask about specific shows'],
          nextActions: []
        };
      }

      // Step 3: Generate response using iterative reasoning
      const systemPrompt = this.createSystemPrompt(context);
      const response = await this.processWithIterativeReasoning(message, context, history, systemPrompt);

      // ✅ Format response with human-like touches
      const formattedResponse = this.conversationHelper.formatResponse(response, true);
      
      // ✅ Add relevant context from memory
      const relevantContext = this.conversationHelper.getRelevantContext(memory, message);
      const finalResponse = relevantContext ? `${relevantContext} ${formattedResponse}` : formattedResponse;

      return {
        content: finalResponse,
        confidence: analysis.confidence,
        agentId: 'tv-intelligence',
        agentName: 'TV Intelligence Agent',
        suggestions: [
          'Ask about TV performance',
          'Request viewing insights',
          'Get brand visibility data',
          'Analyze show performance'
        ],
        nextActions: []
      };
    } catch (error) {
      console.error('TV Intelligence Agent error:', error);
      return {
        content: this.conversationHelper.generateFallbackResponse(message, 'tv'),
        confidence: 0.1,
        agentId: 'tv-intelligence',
        agentName: 'TV Intelligence Agent',
        suggestions: ['Try rephrasing your question', 'Ask about specific shows'],
        nextActions: []
      };
    }
  }

  private async analyzeRequest(message: string): Promise<any> {
    const prompt = `
    Analyze this TV intelligence request and determine what type of analysis is needed:
    
    REQUEST: "${message}"
    
    Determine the following:
    1. Analysis type (viewing, brand visibility, show performance, channel comparison)
    2. Time period (if specified)
    3. Target audience or demographics
    4. Specific shows, channels, or brands mentioned
    5. Metrics needed (viewership, overlap, exposure, ratings)
    
    Respond in JSON format:
    {
      "analysisType": "viewing|brand|show|channel",
      "timePeriod": "recent|month|quarter|year|specific",
      "audience": "description",
      "shows": ["show1", "show2"],
      "channels": ["channel1", "channel2"],
      "brands": ["brand1", "brand2"],
      "metrics": ["viewership", "overlap", "exposure"],
      "confidence": 0.0-1.0
    }
    `;

    try {
      const response = await this.callOpenAI([
        { role: 'system', content: 'You are a TV intelligence analysis expert. Determine what type of analysis is needed from user requests.' },
        { role: 'user', content: prompt }
      ], { currentPage: 'tv-intelligence' });

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
    
    let analysisType = 'viewing';
    if (lowerMessage.includes('brand') || lowerMessage.includes('visibility') || lowerMessage.includes('exposure')) {
      analysisType = 'brand';
    } else if (lowerMessage.includes('show') || lowerMessage.includes('programme') || lowerMessage.includes('overlap')) {
      analysisType = 'show';
    } else if (lowerMessage.includes('channel') || lowerMessage.includes('compare')) {
      analysisType = 'channel';
    }

    return {
      analysisType,
      timePeriod: this.extractTimePeriod(lowerMessage),
      audience: this.extractAudience(lowerMessage),
      shows: this.extractShows(lowerMessage),
      channels: this.extractChannels(lowerMessage),
      brands: this.extractBrands(lowerMessage),
      metrics: this.extractMetrics(lowerMessage),
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

  private extractAudience(message: string): string {
    if (message.includes('target audience') || message.includes('our audience')) return 'campaign audience';
    if (message.includes('young') || message.includes('millennial')) return 'young adults';
    if (message.includes('family') || message.includes('parent')) return 'families';
    if (message.includes('professional') || message.includes('business')) return 'professionals';
    return 'general audience';
  }

  private extractShows(message: string): string[] {
    // This would be more sophisticated in a real implementation
    const showKeywords = ['coronation street', 'eastenders', 'strictly', 'bake off', 'match of the day'];
    return showKeywords.filter(show => message.includes(show));
  }

  private extractChannels(message: string): string[] {
    const channelKeywords = ['bbc', 'itv', 'channel 4', 'sky', 'netflix'];
    return channelKeywords.filter(channel => message.includes(channel));
  }

  private extractBrands(message: string): string[] {
    // This would extract brand names from the message
    return [];
  }

  private extractMetrics(message: string): string[] {
    const metrics = [];
    if (message.includes('viewership') || message.includes('views') || message.includes('watch')) metrics.push('viewership');
    if (message.includes('overlap') || message.includes('audience overlap')) metrics.push('overlap');
    if (message.includes('exposure') || message.includes('visibility')) metrics.push('exposure');
    if (message.includes('rating') || message.includes('performance')) metrics.push('rating');
    return metrics.length > 0 ? metrics : ['viewership', 'overlap'];
  }

  private hasEnoughInfo(analysisType: any): boolean {
    return analysisType.confidence > 0.4;
  }

  private generateClarificationQuestion(analysisType: any): string {
    if (analysisType.analysisType === 'viewing') {
      return "I'd be happy to analyze TV viewing patterns! Could you specify what time period you'd like to look at (e.g., last month, this quarter) and any particular audience or shows you're interested in?";
    }
    
    if (analysisType.analysisType === 'brand') {
      return "I can help you analyze brand visibility! Which brand(s) would you like me to focus on, and what time period should I analyze?";
    }

    return "Could you provide more specific details about what TV intelligence analysis you need? For example, are you looking at viewing patterns, brand exposure, or show performance?";
  }

  private async gatherData(analysisType: any, context: AgentContext): Promise<any> {
    const orgId = context.organizationId || 'default';
    
    try {
      // This would query actual TV/ACR data from Supabase
      // For now, returning mock data
      return this.getMockTVData(analysisType);
    } catch (error) {
      console.error('Error gathering TV data:', error);
      throw error;
    }
  }

  private getMockTVData(analysisType: any): any {
    const mockShows: TVShow[] = [
      {
        id: '1',
        title: 'Coronation Street',
        channel: 'ITV',
        genre: 'Soap Opera',
        viewership: 8500000,
        overlap: 0.75,
        brandVisibility: 0.8,
        airTime: '19:30',
        duration: 30
      },
      {
        id: '2',
        title: 'EastEnders',
        channel: 'BBC One',
        genre: 'Soap Opera',
        viewership: 7200000,
        overlap: 0.65,
        brandVisibility: 0.7,
        airTime: '19:30',
        duration: 30
      },
      {
        id: '3',
        title: 'Strictly Come Dancing',
        channel: 'BBC One',
        genre: 'Entertainment',
        viewership: 9500000,
        overlap: 0.85,
        brandVisibility: 0.9,
        airTime: '18:30',
        duration: 120
      },
      {
        id: '4',
        title: 'The Great British Bake Off',
        channel: 'Channel 4',
        genre: 'Reality',
        viewership: 8800000,
        overlap: 0.78,
        brandVisibility: 0.85,
        airTime: '20:00',
        duration: 60
      }
    ];

    const mockChannels: ChannelPerformance[] = [
      {
        id: 'bbc1',
        name: 'BBC One',
        totalViewership: 45000000,
        averageRating: 8.2,
        topShows: ['Strictly Come Dancing', 'EastEnders', 'Match of the Day'],
        audienceDemographics: { age: '35-65', income: 'middle', location: 'nationwide' }
      },
      {
        id: 'itv',
        name: 'ITV',
        totalViewership: 38000000,
        averageRating: 7.8,
        topShows: ['Coronation Street', 'Emmerdale', 'Britain\'s Got Talent'],
        audienceDemographics: { age: '25-55', income: 'mixed', location: 'nationwide' }
      }
    ];

    const mockBrandExposure: BrandExposure[] = [
      {
        brand: 'LightBoxTV',
        showTitle: 'Coronation Street',
        channel: 'ITV',
        exposureTime: 15,
        viewership: 8500000,
        cost: 25000
      },
      {
        brand: 'LightBoxTV',
        showTitle: 'Strictly Come Dancing',
        channel: 'BBC One',
        exposureTime: 30,
        viewership: 9500000,
        cost: 45000
      }
    ];

    return {
      shows: mockShows,
      channels: mockChannels,
      brandExposure: mockBrandExposure,
      analysisType
    };
  }

  private async analyzeData(data: any, analysisType: any): Promise<any> {
    // This would perform sophisticated analysis based on the data and analysis type
    // For now, returning structured insights
    
    const insights = {
      topShows: data.shows.sort((a: TVShow, b: TVShow) => b.viewership - a.viewership).slice(0, 5),
      topChannels: data.channels.sort((a: ChannelPerformance, b: ChannelPerformance) => b.totalViewership - a.totalViewership),
      brandInsights: this.analyzeBrandExposure(data.brandExposure),
      audienceInsights: this.analyzeAudience(data.shows),
      recommendations: this.generateRecommendations(data, analysisType)
    };

    return insights;
  }

  private analyzeBrandExposure(brandExposure: BrandExposure[]): any {
    const totalExposure = brandExposure.reduce((sum, exposure) => sum + exposure.exposureTime, 0);
    const totalViewership = brandExposure.reduce((sum, exposure) => sum + exposure.viewership, 0);
    const totalCost = brandExposure.reduce((sum, exposure) => sum + exposure.cost, 0);
    const cpm = totalCost / (totalViewership / 1000);

    return {
      totalExposure,
      totalViewership,
      totalCost,
      cpm,
      topShows: brandExposure.sort((a, b) => b.viewership - a.viewership).slice(0, 3)
    };
  }

  private analyzeAudience(shows: TVShow[]): any {
    const totalViewership = shows.reduce((sum, show) => sum + show.viewership, 0);
    const averageOverlap = shows.reduce((sum, show) => sum + show.overlap, 0) / shows.length;

    return {
      totalViewership,
      averageOverlap,
      audienceReach: totalViewership * averageOverlap
    };
  }

  private generateRecommendations(data: any, analysisType: any): string[] {
    const recommendations = [];
    
    if (analysisType.analysisType === 'brand') {
      recommendations.push('Focus on shows with higher brand visibility scores');
      recommendations.push('Consider increasing exposure time during peak viewing hours');
      recommendations.push('Target shows with strong audience overlap');
    } else if (analysisType.analysisType === 'show') {
      recommendations.push('Prioritize shows with high viewership and overlap');
      recommendations.push('Consider time slot optimization for better reach');
      recommendations.push('Analyze audience demographics for targeting');
    } else {
      recommendations.push('Monitor viewing trends for optimization opportunities');
      recommendations.push('Track brand exposure across different channels');
      recommendations.push('Compare performance across time periods');
    }

    return recommendations;
  }

  private formatResponse(insights: any, analysisType: any): string {
    let response = `## 📺 TV Intelligence Analysis\n\n`;

    if (analysisType.analysisType === 'brand') {
      response += this.formatBrandAnalysis(insights);
    } else if (analysisType.analysisType === 'show') {
      response += this.formatShowAnalysis(insights);
    } else if (analysisType.analysisType === 'channel') {
      response += this.formatChannelAnalysis(insights);
    } else {
      response += this.formatViewingAnalysis(insights);
    }

    response += `\n### 💡 Recommendations\n`;
    insights.recommendations.forEach((rec: string, index: number) => {
      response += `${index + 1}. ${rec}\n`;
    });

    return response;
  }

  private formatContextualResponse(insights: any, analysisType: any, originalMessage: string): string {
    const lowerMessage = originalMessage.toLowerCase();
    
    // Handle brand-specific queries
    if (lowerMessage.includes('brand') || lowerMessage.includes('tesco') || lowerMessage.includes('visibility')) {
      return this.formatBrandInsights(insights, originalMessage);
    }
    
    // Handle viewing pattern queries
    if (lowerMessage.includes('watch') || lowerMessage.includes('viewing') || lowerMessage.includes('audience')) {
      return this.formatViewingInsights(insights, originalMessage);
    }
    
    // Handle show performance queries
    if (lowerMessage.includes('show') || lowerMessage.includes('programme') || lowerMessage.includes('performance')) {
      return this.formatShowInsights(insights, originalMessage);
    }
    
    // Default response
    return this.formatResponse(insights, analysisType);
  }

  private formatBrandInsights(insights: any, originalMessage: string): string {
    const brand = this.extractBrandName(originalMessage);
    const brandInsights = insights.brandInsights;
    
    let response = `## 📺 TV Intelligence Analysis for ${brand}\n\n`;
    
    if (brandInsights.totalExposure > 0) {
      response += `**🎯 Brand Exposure Summary:**\n`;
      response += `• **Total Exposure Time:** ${brandInsights.totalExposure} seconds\n`;
      response += `• **Total Viewership:** ${brandInsights.totalViewership.toLocaleString()} viewers\n`;
      response += `• **Total Cost:** £${brandInsights.totalCost.toLocaleString()}\n`;
      response += `• **CPM:** £${brandInsights.cpm.toFixed(2)}\n\n`;
      
      response += `**📺 Top Performing Shows for ${brand}:**\n`;
      brandInsights.topShows.forEach((show: any, index: number) => {
        response += `${index + 1}. **${show.showTitle}** (${show.channel})\n`;
        response += `   👥 ${show.viewership.toLocaleString()} viewers\n`;
        response += `   ⏱️ ${show.exposureTime}s exposure\n`;
        response += `   💰 £${show.cost.toLocaleString()} cost\n\n`;
      });
      
      response += `**💡 Key Insights:**\n`;
      response += `• ${brand} achieved strong visibility across ${brandInsights.topShows.length} major shows\n`;
      response += `• Average exposure time of ${Math.round(brandInsights.totalExposure / brandInsights.topShows.length)}s per show\n`;
      response += `• Cost-effective CPM of £${brandInsights.cpm.toFixed(2)} compared to industry average\n\n`;
      
      response += `**🚀 Recommendations:**\n`;
      response += `1. **Increase exposure time** during peak viewing hours for better brand recall\n`;
      response += `2. **Focus on high-performing shows** like ${brandInsights.topShows[0]?.showTitle} for future campaigns\n`;
      response += `3. **Consider geographic targeting** based on show audience demographics\n`;
      response += `4. **Monitor competitor activity** in similar time slots and shows\n`;
    } else {
      response += `**📊 No TV exposure data found for ${brand}**\n\n`;
      response += `This could mean:\n`;
      response += `• ${brand} hasn't run TV campaigns in the analyzed period\n`;
      response += `• The brand uses different campaign names or identifiers\n`;
      response += `• Data collection is still in progress\n\n`;
      response += `**💡 Suggestions:**\n`;
      response += `• Check if ${brand} has run campaigns under different names\n`;
      response += `• Analyze competitor TV activity in the same period\n`;
      response += `• Review digital and OOH campaign performance\n`;
    }
    
    return response;
  }

  private extractBrandName(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Extract brand names from common patterns
    if (lowerMessage.includes('tesco')) return 'Tesco';
    if (lowerMessage.includes('sainsbury')) return 'Sainsbury\'s';
    if (lowerMessage.includes('asda')) return 'ASDA';
    if (lowerMessage.includes('morrisons')) return 'Morrisons';
    if (lowerMessage.includes('aldi')) return 'Aldi';
    if (lowerMessage.includes('lidl')) return 'Lidl';
    if (lowerMessage.includes('waitrose')) return 'Waitrose';
    
    // Look for "brand [name]" pattern
    const brandMatch = message.match(/brand\s+(\w+)/i);
    if (brandMatch) return brandMatch[1];
    
    // Look for "insights on [name]" pattern
    const insightsMatch = message.match(/insights?\s+(?:on|for)\s+(\w+)/i);
    if (insightsMatch) return insightsMatch[1];
    
    return 'this brand';
  }

  private formatViewingInsights(insights: any, originalMessage: string): string {
    let response = `## 📺 TV Viewing Analysis\n\n`;
    
    response += `**📊 Viewing Patterns:**\n`;
    response += `• **Total Viewership:** ${insights.audienceInsights.totalViewership.toLocaleString()} viewers\n`;
    response += `• **Average Overlap:** ${Math.round(insights.audienceInsights.averageOverlap * 100)}%\n`;
    response += `• **Effective Reach:** ${Math.round(insights.audienceInsights.audienceReach).toLocaleString()} viewers\n\n`;
    
    response += `**🏆 Most Watched Shows:**\n`;
    insights.topShows.forEach((show: TVShow, index: number) => {
      response += `${index + 1}. **${show.title}** (${show.channel})\n`;
      response += `   👥 ${show.viewership.toLocaleString()} viewers\n`;
      response += `   🎯 ${Math.round(show.overlap * 100)}% audience overlap\n`;
      response += `   📺 ${show.airTime} (${show.duration}min)\n\n`;
    });
    
    response += `**💡 Key Insights:**\n`;
    response += `• Peak viewing times are ${this.identifyPeakTimes(insights.topShows)}\n`;
    response += `• ${insights.topShows[0]?.channel} dominates with ${insights.topShows.filter((s: TVShow) => s.channel === insights.topShows[0]?.channel).length} top shows\n`;
    response += `• Average show duration is ${Math.round(insights.topShows.reduce((sum: number, s: TVShow) => sum + s.duration, 0) / insights.topShows.length)} minutes\n\n`;
    
    return response;
  }

  private identifyPeakTimes(shows: TVShow[]): string {
    const times = shows.map(s => s.airTime);
    const eveningShows = times.filter(t => parseInt(t.split(':')[0]) >= 18).length;
    const daytimeShows = times.filter(t => parseInt(t.split(':')[0]) < 18).length;
    
    if (eveningShows > daytimeShows) return 'evening (6 PM - 10 PM)';
    if (daytimeShows > eveningShows) return 'daytime (9 AM - 6 PM)';
    return 'evenly distributed throughout the day';
  }

  private formatShowInsights(insights: any, originalMessage: string): string {
    let response = `## 📺 Show Performance Analysis\n\n`;
    
    response += `**🏆 Top Performing Shows:**\n`;
    insights.topShows.forEach((show: TVShow, index: number) => {
      response += `${index + 1}. **${show.title}** (${show.channel})\n`;
      response += `   👥 ${show.viewership.toLocaleString()} viewers\n`;
      response += `   🎯 ${Math.round(show.overlap * 100)}% audience overlap\n`;
      response += `   ⭐ ${Math.round(show.brandVisibility * 100)}% brand visibility\n`;
      response += `   📺 ${show.airTime} (${show.duration}min)\n\n`;
    });
    
    response += `**📊 Performance Metrics:**\n`;
    response += `• **Average Viewership:** ${Math.round(insights.topShows.reduce((sum: number, s: TVShow) => sum + s.viewership, 0) / insights.topShows.length).toLocaleString()} viewers\n`;
    response += `• **Average Overlap:** ${Math.round(insights.topShows.reduce((sum: number, s: TVShow) => sum + s.overlap, 0) / insights.topShows.length * 100)}%\n`;
    response += `• **Average Brand Visibility:** ${Math.round(insights.topShows.reduce((sum: number, s: TVShow) => sum + s.brandVisibility, 0) / insights.topShows.length * 100)}%\n\n`;
    
    return response;
  }

  private formatBrandAnalysis(insights: any): string {
    const brand = insights.brandInsights;
    return `
**🎯 Brand Exposure Summary:**
- **Total Exposure Time:** ${brand.totalExposure} seconds
- **Total Viewership:** ${brand.totalViewership.toLocaleString()} viewers
- **Total Cost:** £${brand.totalCost.toLocaleString()}
- **CPM:** £${brand.cpm.toFixed(2)}

**📺 Top Performing Shows for Brand Exposure:**
${brand.topShows.map((show: any, index: number) => 
  `${index + 1}. **${show.showTitle}** (${show.channel}) - ${show.viewership.toLocaleString()} viewers, ${show.exposureTime}s exposure`
).join('\n')}
`;
  }

  private formatShowAnalysis(insights: any): string {
    return `
**🏆 Top Performing Shows:**
${insights.topShows.map((show: TVShow, index: number) => 
  `${index + 1}. **${show.title}** (${show.channel})\n   👥 ${show.viewership.toLocaleString()} viewers\n   🎯 ${Math.round(show.overlap * 100)}% audience overlap\n   ⭐ ${Math.round(show.brandVisibility * 100)}% brand visibility`
).join('\n\n')}

**📊 Audience Insights:**
- **Total Viewership:** ${insights.audienceInsights.totalViewership.toLocaleString()} viewers
- **Average Overlap:** ${Math.round(insights.audienceInsights.averageOverlap * 100)}%
- **Effective Reach:** ${Math.round(insights.audienceInsights.audienceReach).toLocaleString()} viewers
`;
  }

  private formatChannelAnalysis(insights: any): string {
    return `
**📺 Channel Performance:**
${insights.topChannels.map((channel: ChannelPerformance, index: number) => 
  `${index + 1}. **${channel.name}**\n   👥 ${channel.totalViewership.toLocaleString()} total viewers\n   ⭐ ${channel.averageRating}/10 average rating\n   🎯 Top shows: ${channel.topShows.join(', ')}`
).join('\n\n')}
`;
  }

  private formatViewingAnalysis(insights: any): string {
    return `📺 **Viewing Analysis Summary**

**Key Insights:**
• Total shows analyzed: ${insights.totalShows || 0}
• Average viewership: ${insights.averageViewership || 0} viewers
• Peak viewing times: ${insights.peakTimes || 'Not available'}

**Top Performing Shows:**
${insights.topShows?.slice(0, 5).map((show: any, index: number) => 
  `${index + 1}. ${show.title} (${show.channel}) - ${show.viewership} viewers`
).join('\n') || 'No data available'}

**Recommendations:**
• Focus on shows with highest viewership
• Consider airing times for maximum reach
• Analyze audience overlap with your campaigns`;
  }
} 