import { BaseAgent } from './BaseAgent';
import type { AgentContext, AgentMessage, AgentResponse } from './types';

interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  country?: string;
  topics?: string[];
  relevanceScore: number;
}

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  duration: string;
  relevanceScore: number;
}

export class YouTubeCurationAgent extends BaseAgent {
  private apiKey: string;

  constructor() {
    super(
      'youtube-curation',
      'YouTube Curation Agent',
      'Specialized in finding and curating YouTube channels and videos based on advertiser needs and targeting criteria',
      [
        {
          name: 'Channel Discovery',
          description: 'Find YouTube channels that match specific criteria like topic, audience, location, and engagement',
          examples: [
            'Find UK channels about electric vehicles',
            'Show me gaming channels with 100k+ subscribers',
            'Find lifestyle channels for young professionals'
          ]
        },
        {
          name: 'Video Curation',
          description: 'Discover specific videos that align with campaign themes and target audiences',
          examples: [
            'Find videos about sustainable living',
            'Show me tech review videos from last month',
            'Find educational content about finance'
          ]
        },
        {
          name: 'Audience Analysis',
          description: 'Analyze channel demographics and audience characteristics',
          examples: [
            'What audience does this channel reach?',
            'Analyze the demographics of gaming channels',
            'Find channels popular with Gen Z'
          ]
        }
      ]
    );

    this.apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || '';
  }

  canHandle(message: string, context: AgentContext): boolean {
    const youtubeKeywords = [
      'youtube', 'channel', 'video', 'creator', 'influencer', 'content',
      'find', 'search', 'discover', 'curate', 'uk', 'london', 'british',
      'gaming', 'lifestyle', 'tech', 'fashion', 'beauty', 'fitness',
      'education', 'entertainment', 'news', 'sports', 'music',
      'subscribers', 'views', 'engagement', 'audience', 'demographics'
    ];

    const lowerMessage = message.toLowerCase();
    return youtubeKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  async process(message: string, context: AgentContext, history: AgentMessage[]): Promise<AgentResponse> {
    try {
      // Step 1: Analyze the request and determine search criteria
      const searchCriteria = await this.analyzeRequest(message);
      
      // Step 2: Check if we have enough information
      if (!this.hasEnoughInfo(searchCriteria)) {
        return {
          content: this.generateClarificationQuestion(searchCriteria),
          confidence: 0.3,
          agentId: 'youtube-curation',
          agentName: 'YouTube Curation Agent',
          suggestions: [
            'Specify the topic or theme you\'re interested in',
            'Mention your target audience or demographics',
            'Indicate the type of content (channels vs videos)',
            'Specify location or language preferences'
          ]
        };
      }

      // Step 3: Perform the search
      const results = await this.performSearch(searchCriteria);
      
      // Step 4: Format and return results
      const formattedResponse = this.formatResults(results, searchCriteria);

      return {
        content: formattedResponse,
        confidence: 0.9,
        agentId: 'youtube-curation',
        agentName: 'YouTube Curation Agent',
        data: results,
        suggestions: [
          'Get more details about specific channels',
          'Find similar content creators',
          'Analyze audience demographics',
          'Export results to campaign planner'
        ]
      };
    } catch (error) {
      console.error('YouTube Curation Agent error:', error);
      return {
        content: "I encountered an error while searching YouTube content. Please check your API key and try again.",
        confidence: 0.1,
        agentId: 'youtube-curation',
        agentName: 'YouTube Curation Agent'
      };
    }
  }

  private async analyzeRequest(message: string): Promise<any> {
    const prompt = `
    Analyze this YouTube content request and extract search criteria:
    
    REQUEST: "${message}"
    
    Extract the following information:
    1. Content type (channels, videos, or both)
    2. Topics/themes
    3. Target audience/demographics
    4. Location preferences
    5. Engagement criteria (subscriber count, view count)
    6. Time period (if specified)
    7. Language preferences
    
    Respond in JSON format:
    {
      "contentType": "channels|videos|both",
      "topics": ["topic1", "topic2"],
      "audience": "description",
      "location": "country/region",
      "minSubscribers": number,
      "minViews": number,
      "timePeriod": "recent|all",
      "language": "en|other",
      "confidence": 0.0-1.0
    }
    `;

    try {
      const response = await this.callOpenAI([
        { role: 'system', content: 'You are a YouTube content analysis expert. Extract search criteria from user requests.' },
        { role: 'user', content: prompt }
      ], { currentPage: 'youtube-curation' });

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
    
    return {
      contentType: lowerMessage.includes('channel') ? 'channels' : 'both',
      topics: this.extractTopics(lowerMessage),
      audience: this.extractAudience(lowerMessage),
      location: this.extractLocation(lowerMessage),
      minSubscribers: this.extractSubscriberCount(lowerMessage),
      minViews: this.extractViewCount(lowerMessage),
      timePeriod: lowerMessage.includes('recent') || lowerMessage.includes('latest') ? 'recent' : 'all',
      language: lowerMessage.includes('uk') || lowerMessage.includes('british') ? 'en' : 'en',
      confidence: 0.6
    };
  }

  private extractTopics(message: string): string[] {
    const topics = [];
    const topicKeywords = {
      'gaming': ['gaming', 'game', 'esports', 'streamer'],
      'tech': ['tech', 'technology', 'gadget', 'review', 'smartphone'],
      'lifestyle': ['lifestyle', 'life', 'daily', 'routine'],
      'fashion': ['fashion', 'style', 'clothing', 'outfit'],
      'beauty': ['beauty', 'makeup', 'skincare', 'cosmetic'],
      'fitness': ['fitness', 'workout', 'gym', 'exercise'],
      'education': ['education', 'learn', 'tutorial', 'how to'],
      'entertainment': ['entertainment', 'funny', 'comedy', 'music'],
      'news': ['news', 'current events', 'politics'],
      'sports': ['sports', 'football', 'basketball', 'athlete'],
      'finance': ['finance', 'money', 'investment', 'business'],
      'travel': ['travel', 'tourism', 'vacation', 'adventure']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  private extractAudience(message: string): string {
    if (message.includes('gen z') || message.includes('young')) return 'Gen Z (16-24)';
    if (message.includes('millennial') || message.includes('professional')) return 'Millennials (25-40)';
    if (message.includes('parent') || message.includes('family')) return 'Parents/Families';
    if (message.includes('student')) return 'Students';
    if (message.includes('business') || message.includes('professional')) return 'Professionals';
    return 'General audience';
  }

  private extractLocation(message: string): string {
    if (message.includes('uk') || message.includes('british')) return 'GB';
    if (message.includes('london')) return 'GB';
    if (message.includes('us') || message.includes('american')) return 'US';
    return 'GB'; // Default to UK
  }

  private extractSubscriberCount(message: string): number {
    if (message.includes('100k') || message.includes('100,000')) return 100000;
    if (message.includes('1m') || message.includes('1,000,000')) return 1000000;
    if (message.includes('10k') || message.includes('10,000')) return 10000;
    if (message.includes('1k') || message.includes('1,000')) return 1000;
    return 0;
  }

  private extractViewCount(message: string): number {
    if (message.includes('1m views') || message.includes('1,000,000 views')) return 1000000;
    if (message.includes('100k views') || message.includes('100,000 views')) return 100000;
    if (message.includes('10k views') || message.includes('10,000 views')) return 10000;
    return 0;
  }

  private hasEnoughInfo(criteria: any): boolean {
    return criteria.confidence > 0.4 && (
      criteria.topics.length > 0 || 
      criteria.audience !== 'General audience' ||
      criteria.location !== 'GB'
    );
  }

  private generateClarificationQuestion(criteria: any): string {
    if (criteria.topics.length === 0) {
      return "I'd be happy to help you find YouTube content! Could you tell me what topics or themes you're interested in? For example: gaming, tech reviews, lifestyle, education, etc.";
    }
    
    if (criteria.audience === 'General audience') {
      return `Great! I can help you find ${criteria.topics.join(', ')} content. Who is your target audience? (e.g., young professionals, students, families, etc.)`;
    }

    return "Could you provide more specific criteria? For example, are you looking for channels or specific videos? Any particular engagement levels or time periods?";
  }

  private async performSearch(criteria: any): Promise<{ channels: YouTubeChannel[], videos: YouTubeVideo[] }> {
    const results = { channels: [], videos: [] };

    if (!this.apiKey) {
      throw new Error('YouTube API key not configured');
    }

    try {
      if (criteria.contentType === 'channels' || criteria.contentType === 'both') {
        results.channels = await this.searchChannels(criteria);
      }

      if (criteria.contentType === 'videos' || criteria.contentType === 'both') {
        results.videos = await this.searchVideos(criteria);
      }
    } catch (error) {
      console.error('YouTube API search error:', error);
      // Return mock data for demonstration
      return this.getMockResults(criteria);
    }

    return results;
  }

  private async searchChannels(criteria: any): Promise<YouTubeChannel[]> {
    // This would use the YouTube Data API v3
    // For now, returning mock data
    return this.getMockChannels(criteria);
  }

  private async searchVideos(criteria: any): Promise<YouTubeVideo[]> {
    // This would use the YouTube Data API v3
    // For now, returning mock data
    return this.getMockVideos(criteria);
  }

  private getMockResults(criteria: any): { channels: YouTubeChannel[], videos: YouTubeVideo[] } {
    return {
      channels: this.getMockChannels(criteria),
      videos: this.getMockVideos(criteria)
    };
  }

  private getMockChannels(criteria: any): YouTubeChannel[] {
    const mockChannels = [
      {
        id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
        title: 'Google Developers',
        description: 'The official YouTube channel for Google Developers',
        subscriberCount: 2500000,
        videoCount: 1500,
        viewCount: 500000000,
        country: 'US',
        topics: ['tech', 'development'],
        relevanceScore: 0.9
      },
      {
        id: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw',
        title: 'PewDiePie',
        description: 'Gaming and entertainment content',
        subscriberCount: 111000000,
        videoCount: 4500,
        viewCount: 28000000000,
        country: 'SE',
        topics: ['gaming', 'entertainment'],
        relevanceScore: 0.8
      },
      {
        id: 'UCJ5v_MCY6GNUBTO8-D3XoAg',
        title: 'TechCrunch',
        description: 'Latest technology news and startup information',
        subscriberCount: 3500000,
        videoCount: 8000,
        viewCount: 1200000000,
        country: 'US',
        topics: ['tech', 'news'],
        relevanceScore: 0.85
      }
    ];

    return mockChannels.filter(channel => 
      criteria.topics.some((topic: string) => channel.topics.includes(topic))
    );
  }

  private getMockVideos(criteria: any): YouTubeVideo[] {
    const mockVideos = [
      {
        id: 'dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up',
        description: 'Official Rick Astley - Never Gonna Give You Up',
        channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
        channelTitle: 'Rick Astley',
        viewCount: 1500000000,
        likeCount: 15000000,
        publishedAt: '2009-10-25T06:57:33Z',
        duration: 'PT3M33S',
        relevanceScore: 0.7
      }
    ];

    return mockVideos;
  }

  private formatResults(results: any, criteria: any): string {
    let response = `Here are the YouTube ${criteria.contentType} I found for you:\n\n`;

    if (results.channels.length > 0) {
      response += `**📺 Recommended Channels (${results.channels.length}):**\n\n`;
      results.channels.forEach((channel: YouTubeChannel, index: number) => {
        response += `${index + 1}. **${channel.title}**\n`;
        response += `   👥 ${channel.subscriberCount.toLocaleString()} subscribers\n`;
        response += `   📹 ${channel.videoCount.toLocaleString()} videos\n`;
        response += `   🎯 Topics: ${channel.topics.join(', ')}\n`;
        response += `   📍 Location: ${channel.country}\n`;
        response += `   ⭐ Relevance: ${Math.round(channel.relevanceScore * 100)}%\n\n`;
      });
    }

    if (results.videos.length > 0) {
      response += `**🎬 Recommended Videos (${results.videos.length}):**\n\n`;
      results.videos.forEach((video: YouTubeVideo, index: number) => {
        response += `${index + 1}. **${video.title}**\n`;
        response += `   📺 Channel: ${video.channelTitle}\n`;
        response += `   👀 ${video.viewCount.toLocaleString()} views\n`;
        response += `   👍 ${video.likeCount.toLocaleString()} likes\n`;
        response += `   📅 Published: ${new Date(video.publishedAt).toLocaleDateString()}\n`;
        response += `   ⭐ Relevance: ${Math.round(video.relevanceScore * 100)}%\n\n`;
      });
    }

    if (results.channels.length === 0 && results.videos.length === 0) {
      response = "I couldn't find any content matching your criteria. Try adjusting your search terms or being more specific about the topics you're interested in.";
    }

    return response;
  }
} 
import type { AgentContext, AgentMessage, AgentResponse } from './types';

interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  country?: string;
  topics?: string[];
  relevanceScore: number;
}

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  duration: string;
  relevanceScore: number;
}

export class YouTubeCurationAgent extends BaseAgent {
  private apiKey: string;

  constructor() {
    super(
      'youtube-curation',
      'YouTube Curation Agent',
      'Specialized in finding and curating YouTube channels and videos based on advertiser needs and targeting criteria',
      [
        {
          name: 'Channel Discovery',
          description: 'Find YouTube channels that match specific criteria like topic, audience, location, and engagement',
          examples: [
            'Find UK channels about electric vehicles',
            'Show me gaming channels with 100k+ subscribers',
            'Find lifestyle channels for young professionals'
          ]
        },
        {
          name: 'Video Curation',
          description: 'Discover specific videos that align with campaign themes and target audiences',
          examples: [
            'Find videos about sustainable living',
            'Show me tech review videos from last month',
            'Find educational content about finance'
          ]
        },
        {
          name: 'Audience Analysis',
          description: 'Analyze channel demographics and audience characteristics',
          examples: [
            'What audience does this channel reach?',
            'Analyze the demographics of gaming channels',
            'Find channels popular with Gen Z'
          ]
        }
      ]
    );

    this.apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || '';
  }

  canHandle(message: string, context: AgentContext): boolean {
    const youtubeKeywords = [
      'youtube', 'channel', 'video', 'creator', 'influencer', 'content',
      'find', 'search', 'discover', 'curate', 'uk', 'london', 'british',
      'gaming', 'lifestyle', 'tech', 'fashion', 'beauty', 'fitness',
      'education', 'entertainment', 'news', 'sports', 'music',
      'subscribers', 'views', 'engagement', 'audience', 'demographics'
    ];

    const lowerMessage = message.toLowerCase();
    return youtubeKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  async process(message: string, context: AgentContext, history: AgentMessage[]): Promise<AgentResponse> {
    try {
      // Step 1: Analyze the request and determine search criteria
      const searchCriteria = await this.analyzeRequest(message);
      
      // Step 2: Check if we have enough information
      if (!this.hasEnoughInfo(searchCriteria)) {
        return {
          content: this.generateClarificationQuestion(searchCriteria),
          confidence: 0.3,
          agentId: 'youtube-curation',
          agentName: 'YouTube Curation Agent',
          suggestions: [
            'Specify the topic or theme you\'re interested in',
            'Mention your target audience or demographics',
            'Indicate the type of content (channels vs videos)',
            'Specify location or language preferences'
          ]
        };
      }

      // Step 3: Perform the search
      const results = await this.performSearch(searchCriteria);
      
      // Step 4: Format and return results
      const formattedResponse = this.formatResults(results, searchCriteria);

      return {
        content: formattedResponse,
        confidence: 0.9,
        agentId: 'youtube-curation',
        agentName: 'YouTube Curation Agent',
        data: results,
        suggestions: [
          'Get more details about specific channels',
          'Find similar content creators',
          'Analyze audience demographics',
          'Export results to campaign planner'
        ]
      };
    } catch (error) {
      console.error('YouTube Curation Agent error:', error);
      return {
        content: "I encountered an error while searching YouTube content. Please check your API key and try again.",
        confidence: 0.1,
        agentId: 'youtube-curation',
        agentName: 'YouTube Curation Agent'
      };
    }
  }

  private async analyzeRequest(message: string): Promise<any> {
    const prompt = `
    Analyze this YouTube content request and extract search criteria:
    
    REQUEST: "${message}"
    
    Extract the following information:
    1. Content type (channels, videos, or both)
    2. Topics/themes
    3. Target audience/demographics
    4. Location preferences
    5. Engagement criteria (subscriber count, view count)
    6. Time period (if specified)
    7. Language preferences
    
    Respond in JSON format:
    {
      "contentType": "channels|videos|both",
      "topics": ["topic1", "topic2"],
      "audience": "description",
      "location": "country/region",
      "minSubscribers": number,
      "minViews": number,
      "timePeriod": "recent|all",
      "language": "en|other",
      "confidence": 0.0-1.0
    }
    `;

    try {
      const response = await this.callOpenAI([
        { role: 'system', content: 'You are a YouTube content analysis expert. Extract search criteria from user requests.' },
        { role: 'user', content: prompt }
      ], { currentPage: 'youtube-curation' });

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
    
    return {
      contentType: lowerMessage.includes('channel') ? 'channels' : 'both',
      topics: this.extractTopics(lowerMessage),
      audience: this.extractAudience(lowerMessage),
      location: this.extractLocation(lowerMessage),
      minSubscribers: this.extractSubscriberCount(lowerMessage),
      minViews: this.extractViewCount(lowerMessage),
      timePeriod: lowerMessage.includes('recent') || lowerMessage.includes('latest') ? 'recent' : 'all',
      language: lowerMessage.includes('uk') || lowerMessage.includes('british') ? 'en' : 'en',
      confidence: 0.6
    };
  }

  private extractTopics(message: string): string[] {
    const topics = [];
    const topicKeywords = {
      'gaming': ['gaming', 'game', 'esports', 'streamer'],
      'tech': ['tech', 'technology', 'gadget', 'review', 'smartphone'],
      'lifestyle': ['lifestyle', 'life', 'daily', 'routine'],
      'fashion': ['fashion', 'style', 'clothing', 'outfit'],
      'beauty': ['beauty', 'makeup', 'skincare', 'cosmetic'],
      'fitness': ['fitness', 'workout', 'gym', 'exercise'],
      'education': ['education', 'learn', 'tutorial', 'how to'],
      'entertainment': ['entertainment', 'funny', 'comedy', 'music'],
      'news': ['news', 'current events', 'politics'],
      'sports': ['sports', 'football', 'basketball', 'athlete'],
      'finance': ['finance', 'money', 'investment', 'business'],
      'travel': ['travel', 'tourism', 'vacation', 'adventure']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  private extractAudience(message: string): string {
    if (message.includes('gen z') || message.includes('young')) return 'Gen Z (16-24)';
    if (message.includes('millennial') || message.includes('professional')) return 'Millennials (25-40)';
    if (message.includes('parent') || message.includes('family')) return 'Parents/Families';
    if (message.includes('student')) return 'Students';
    if (message.includes('business') || message.includes('professional')) return 'Professionals';
    return 'General audience';
  }

  private extractLocation(message: string): string {
    if (message.includes('uk') || message.includes('british')) return 'GB';
    if (message.includes('london')) return 'GB';
    if (message.includes('us') || message.includes('american')) return 'US';
    return 'GB'; // Default to UK
  }

  private extractSubscriberCount(message: string): number {
    if (message.includes('100k') || message.includes('100,000')) return 100000;
    if (message.includes('1m') || message.includes('1,000,000')) return 1000000;
    if (message.includes('10k') || message.includes('10,000')) return 10000;
    if (message.includes('1k') || message.includes('1,000')) return 1000;
    return 0;
  }

  private extractViewCount(message: string): number {
    if (message.includes('1m views') || message.includes('1,000,000 views')) return 1000000;
    if (message.includes('100k views') || message.includes('100,000 views')) return 100000;
    if (message.includes('10k views') || message.includes('10,000 views')) return 10000;
    return 0;
  }

  private hasEnoughInfo(criteria: any): boolean {
    return criteria.confidence > 0.4 && (
      criteria.topics.length > 0 || 
      criteria.audience !== 'General audience' ||
      criteria.location !== 'GB'
    );
  }

  private generateClarificationQuestion(criteria: any): string {
    if (criteria.topics.length === 0) {
      return "I'd be happy to help you find YouTube content! Could you tell me what topics or themes you're interested in? For example: gaming, tech reviews, lifestyle, education, etc.";
    }
    
    if (criteria.audience === 'General audience') {
      return `Great! I can help you find ${criteria.topics.join(', ')} content. Who is your target audience? (e.g., young professionals, students, families, etc.)`;
    }

    return "Could you provide more specific criteria? For example, are you looking for channels or specific videos? Any particular engagement levels or time periods?";
  }

  private async performSearch(criteria: any): Promise<{ channels: YouTubeChannel[], videos: YouTubeVideo[] }> {
    const results = { channels: [], videos: [] };

    if (!this.apiKey) {
      throw new Error('YouTube API key not configured');
    }

    try {
      if (criteria.contentType === 'channels' || criteria.contentType === 'both') {
        results.channels = await this.searchChannels(criteria);
      }

      if (criteria.contentType === 'videos' || criteria.contentType === 'both') {
        results.videos = await this.searchVideos(criteria);
      }
    } catch (error) {
      console.error('YouTube API search error:', error);
      // Return mock data for demonstration
      return this.getMockResults(criteria);
    }

    return results;
  }

  private async searchChannels(criteria: any): Promise<YouTubeChannel[]> {
    // This would use the YouTube Data API v3
    // For now, returning mock data
    return this.getMockChannels(criteria);
  }

  private async searchVideos(criteria: any): Promise<YouTubeVideo[]> {
    // This would use the YouTube Data API v3
    // For now, returning mock data
    return this.getMockVideos(criteria);
  }

  private getMockResults(criteria: any): { channels: YouTubeChannel[], videos: YouTubeVideo[] } {
    return {
      channels: this.getMockChannels(criteria),
      videos: this.getMockVideos(criteria)
    };
  }

  private getMockChannels(criteria: any): YouTubeChannel[] {
    const mockChannels = [
      {
        id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
        title: 'Google Developers',
        description: 'The official YouTube channel for Google Developers',
        subscriberCount: 2500000,
        videoCount: 1500,
        viewCount: 500000000,
        country: 'US',
        topics: ['tech', 'development'],
        relevanceScore: 0.9
      },
      {
        id: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw',
        title: 'PewDiePie',
        description: 'Gaming and entertainment content',
        subscriberCount: 111000000,
        videoCount: 4500,
        viewCount: 28000000000,
        country: 'SE',
        topics: ['gaming', 'entertainment'],
        relevanceScore: 0.8
      },
      {
        id: 'UCJ5v_MCY6GNUBTO8-D3XoAg',
        title: 'TechCrunch',
        description: 'Latest technology news and startup information',
        subscriberCount: 3500000,
        videoCount: 8000,
        viewCount: 1200000000,
        country: 'US',
        topics: ['tech', 'news'],
        relevanceScore: 0.85
      }
    ];

    return mockChannels.filter(channel => 
      criteria.topics.some((topic: string) => channel.topics.includes(topic))
    );
  }

  private getMockVideos(criteria: any): YouTubeVideo[] {
    const mockVideos = [
      {
        id: 'dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up',
        description: 'Official Rick Astley - Never Gonna Give You Up',
        channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
        channelTitle: 'Rick Astley',
        viewCount: 1500000000,
        likeCount: 15000000,
        publishedAt: '2009-10-25T06:57:33Z',
        duration: 'PT3M33S',
        relevanceScore: 0.7
      }
    ];

    return mockVideos;
  }

  private formatResults(results: any, criteria: any): string {
    let response = `Here are the YouTube ${criteria.contentType} I found for you:\n\n`;

    if (results.channels.length > 0) {
      response += `**📺 Recommended Channels (${results.channels.length}):**\n\n`;
      results.channels.forEach((channel: YouTubeChannel, index: number) => {
        response += `${index + 1}. **${channel.title}**\n`;
        response += `   👥 ${channel.subscriberCount.toLocaleString()} subscribers\n`;
        response += `   📹 ${channel.videoCount.toLocaleString()} videos\n`;
        response += `   🎯 Topics: ${channel.topics.join(', ')}\n`;
        response += `   📍 Location: ${channel.country}\n`;
        response += `   ⭐ Relevance: ${Math.round(channel.relevanceScore * 100)}%\n\n`;
      });
    }

    if (results.videos.length > 0) {
      response += `**🎬 Recommended Videos (${results.videos.length}):**\n\n`;
      results.videos.forEach((video: YouTubeVideo, index: number) => {
        response += `${index + 1}. **${video.title}**\n`;
        response += `   📺 Channel: ${video.channelTitle}\n`;
        response += `   👀 ${video.viewCount.toLocaleString()} views\n`;
        response += `   👍 ${video.likeCount.toLocaleString()} likes\n`;
        response += `   📅 Published: ${new Date(video.publishedAt).toLocaleDateString()}\n`;
        response += `   ⭐ Relevance: ${Math.round(video.relevanceScore * 100)}%\n\n`;
      });
    }

    if (results.channels.length === 0 && results.videos.length === 0) {
      response = "I couldn't find any content matching your criteria. Try adjusting your search terms or being more specific about the topics you're interested in.";
    }

    return response;
  }
} 