import { supabase } from './supabase';

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
    country?: string;
    customUrl?: string;
  };
  statistics?: {
    viewCount: string;
    subscriberCount: string;
    videoCount: string;
  };
}

export interface YouTubeSearchResult {
  id: {
    channelId?: string;
    videoId?: string;
    playlistId?: string;
  };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
    channelTitle: string;
    channelId: string;
  };
  statistics?: {
    viewCount: string;
    subscriberCount: string;
    videoCount: string;
  };
}

export interface YouTubeSearchResponse {
  items: YouTubeSearchResult[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export interface YouTubeChannelsResponse {
  items: YouTubeChannel[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

class YouTubeService {
  private async makeRequest(endpoint: string, params: Record<string, string>): Promise<any> {
    const url = new URL(`${YOUTUBE_API_BASE_URL}${endpoint}`);
    url.searchParams.append('key', YOUTUBE_API_KEY);
    
    // Set appropriate parts based on endpoint
    if (endpoint === '/search') {
      url.searchParams.append('part', 'snippet');
    } else if (endpoint === '/channels') {
      url.searchParams.append('part', 'snippet,statistics');
    } else {
      url.searchParams.append('part', 'snippet');
    }
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API Error Response:', errorText);
      throw new Error(`YouTube API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async searchChannels(query: string, maxResults: number = 50, pageToken?: string): Promise<YouTubeSearchResponse> {
    const params: Record<string, string> = {
      q: query,
      type: 'channel',
      maxResults: maxResults.toString(),
      order: 'relevance'
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    return this.makeRequest('/search', params);
  }

  async getChannelDetails(channelIds: string[]): Promise<YouTubeChannelsResponse> {
    const params: Record<string, string> = {
      id: channelIds.join(','),
      part: 'snippet,statistics'
    };

    return this.makeRequest('/channels', params);
  }

  async searchVideos(query: string, maxResults: number = 50, pageToken?: string): Promise<YouTubeSearchResponse> {
    const params: Record<string, string> = {
      q: query,
      type: 'video',
      maxResults: maxResults.toString(),
      order: 'relevance'
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    return this.makeRequest('/search', params);
  }

  async getChannelVideos(channelId: string, maxResults: number = 50, pageToken?: string): Promise<YouTubeSearchResponse> {
    const params: Record<string, string> = {
      channelId,
      type: 'video',
      maxResults: maxResults.toString(),
      order: 'date'
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    return this.makeRequest('/search', params);
  }
}

export const youtubeService = new YouTubeService();

// Database operations
export const youtubeDB = {
  async saveChannel(channel: YouTubeChannel) {
    const { data, error } = await supabase
      .from('youtube_channels')
      .upsert({
        channel_id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        subscriber_count: channel.statistics?.subscriberCount ? parseInt(channel.statistics.subscriberCount) : null,
        video_count: channel.statistics?.videoCount ? parseInt(channel.statistics.videoCount) : null,
        view_count: channel.statistics?.viewCount ? parseInt(channel.statistics.viewCount) : null,
        published_at: channel.snippet.publishedAt,
        thumbnails: channel.snippet.thumbnails,
        country: channel.snippet.country,
        custom_url: channel.snippet.customUrl,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'channel_id'
      });

    if (error) throw error;
    return data;
  },

  async saveSearchHistory(query: string, resultsCount: number, searchType: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('youtube_search_history')
      .insert({
        user_id: user.id,
        query,
        results_count: resultsCount,
        search_type: searchType
      });

    if (error) throw error;
  },

  async getChannelsByPackage(packageId: string) {
    const { data, error } = await supabase
      .from('youtube_package_channels')
      .select(`
        *,
        youtube_channels (*)
      `)
      .eq('package_id', packageId)
      .order('added_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async addChannelToPackage(packageId: string, channelId: string, notes?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('youtube_package_channels')
      .insert({
        package_id: packageId,
        channel_id: channelId,
        added_by: user.id,
        notes
      });

    if (error) throw error;
  },

  async removeChannelFromPackage(packageId: string, channelId: string) {
    const { error } = await supabase
      .from('youtube_package_channels')
      .delete()
      .eq('package_id', packageId)
      .eq('channel_id', channelId);

    if (error) throw error;
  },

  async createPackage(name: string, description?: string, isPublic: boolean = false) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user's organization
    const { data: orgData } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    const { data, error } = await supabase
      .from('youtube_curated_packages')
      .insert({
        name,
        description,
        user_id: user.id,
        organization_id: orgData?.organization_id,
        is_public: isPublic
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserPackages() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('youtube_curated_packages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getPublicPackages() {
    const { data, error } = await supabase
      .from('youtube_curated_packages')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async deletePackage(packageId: string) {
    const { error } = await supabase
      .from('youtube_curated_packages')
      .delete()
      .eq('id', packageId);

    if (error) throw error;
  },

  async exportPackageChannels(packageId: string, exportType: 'csv' | 'google_ads' | 'json') {
    const channels = await this.getChannelsByPackage(packageId);
    
    let exportData: string;
    
    switch (exportType) {
      case 'csv':
        exportData = this.generateCSV(channels);
        break;
      case 'google_ads':
        exportData = this.generateGoogleAdsFormat(channels);
        break;
      case 'json':
        exportData = JSON.stringify(channels, null, 2);
        break;
      default:
        throw new Error('Unsupported export type');
    }

    // Save export history
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('youtube_export_history')
        .insert({
          user_id: user.id,
          package_id: packageId,
          export_type: exportType,
          channel_count: channels.length
        });
    }

    return exportData;
  },

  generateCSV(channels: any[]): string {
    const headers = ['Channel ID', 'Title', 'Subscribers', 'Videos', 'Views', 'Country', 'Published At'];
    const rows = channels.map(channel => [
      channel.youtube_channels.channel_id,
      channel.youtube_channels.title,
      channel.youtube_channels.subscriber_count || 0,
      channel.youtube_channels.video_count || 0,
      channel.youtube_channels.view_count || 0,
      channel.youtube_channels.country || '',
      channel.youtube_channels.published_at || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  },

  generateGoogleAdsFormat(channels: any[]): string {
    // Google Ads format for YouTube targeting
    const headers = ['Channel ID', 'Channel Name', 'Subscribers'];
    const rows = channels.map(channel => [
      channel.youtube_channels.channel_id,
      channel.youtube_channels.title,
      channel.youtube_channels.subscriber_count || 0
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}; 