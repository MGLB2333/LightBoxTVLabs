import { supabase } from './supabase';
import { googleAdsService } from './googleAdsService';

export interface IntegrationStatus {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastChecked: string;
  accountDetails?: {
    email?: string;
    channel?: string;
    plan?: string;
    connectedDate?: string;
    lastSync?: string;
    apiKey?: string;
    channelId?: string;
    organization?: string;
    quotaUsed?: string;
    quotaLimit?: string;
    usage?: string;
    tokensUsed?: string;
  };
  error?: string;
}

export interface YouTubeIntegrationDetails {
  apiKey: string;
  quotaUsed: string;
  quotaLimit: string;
  lastSync: string;
}

export interface OpenAIIntegrationDetails {
  apiKey: string;
  organization?: string;
  usage: string;
  tokensUsed: string;
  lastSync: string;
}

class IntegrationService {
  // Check if YouTube API is connected and working
  async checkYouTubeIntegration(): Promise<IntegrationStatus> {
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    
    if (!apiKey || apiKey === 'your_youtube_api_key_here') {
      return {
        id: 'youtube',
        name: 'YouTube',
        status: 'disconnected',
        lastChecked: new Date().toISOString(),
        error: 'No API key configured'
      };
    }

    try {
      // Test the API with a simple request
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=${apiKey}&maxResults=1`
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          id: 'youtube',
          name: 'YouTube',
          status: 'error',
          lastChecked: new Date().toISOString(),
          error: `API Error: ${errorData.error?.message || response.statusText}`
        };
      }

      const data = await response.json();
      
      // Get quota usage from headers (if available)
      const quotaUsed = response.headers.get('x-quota-used') || 'Unknown';
      const quotaLimit = response.headers.get('x-quota-limit') || '10,000';

      return {
        id: 'youtube',
        name: 'YouTube',
        status: 'connected',
        lastChecked: new Date().toISOString(),
        accountDetails: {
          apiKey: `${apiKey.substring(0, 8)}...`,
          quotaUsed,
          quotaLimit,
          lastSync: new Date().toISOString(),
          connectedDate: '2024-12-15' // This could be stored in database
        }
      };
    } catch (error) {
      return {
        id: 'youtube',
        name: 'YouTube',
        status: 'error',
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Check if OpenAI API is connected and working
  async checkOpenAIIntegration(): Promise<IntegrationStatus> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      return {
        id: 'openai',
        name: 'OpenAI',
        status: 'disconnected',
        lastChecked: new Date().toISOString(),
        error: 'No API key configured'
      };
    }

    try {
      // Test the API with a simple request
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          id: 'openai',
          name: 'OpenAI',
          status: 'error',
          lastChecked: new Date().toISOString(),
          error: `API Error: ${errorData.error?.message || response.statusText}`
        };
      }

      const data = await response.json();
      
      // Get usage data (this would require a separate API call in a real implementation)
      const usage = '$0.00 this month'; // Mock for now
      const tokensUsed = '0 tokens'; // Mock for now

      return {
        id: 'openai',
        name: 'OpenAI',
        status: 'connected',
        lastChecked: new Date().toISOString(),
        accountDetails: {
          apiKey: `${apiKey.substring(0, 8)}...`,
          organization: 'org-abc123def456', // This could be from env or API
          usage,
          tokensUsed,
          lastSync: new Date().toISOString(),
          connectedDate: '2024-11-20' // This could be stored in database
        }
      };
    } catch (error) {
      return {
        id: 'openai',
        name: 'OpenAI',
        status: 'error',
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Check Google Ads integration (placeholder for future implementation)
  async checkGoogleAdsIntegration(): Promise<IntegrationStatus> {
    try {
      const connection = await googleAdsService.checkConnection();
      
      if (!connection) {
        return {
          id: 'google-ads',
          name: 'Google Ads',
          status: 'disconnected',
          lastChecked: new Date().toISOString(),
          error: 'No active connection found'
        };
      }

      // Check if token is still valid
      if (new Date(connection.expiresAt) <= new Date()) {
        return {
          id: 'google-ads',
          name: 'Google Ads',
          status: 'error',
          lastChecked: new Date().toISOString(),
          error: 'Access token expired'
        };
      }

      return {
        id: 'google-ads',
        name: 'Google Ads',
        status: 'connected',
        lastChecked: new Date().toISOString(),
        accountDetails: {
          email: connection.customerName,
          connectedDate: connection.lastSync,
          lastSync: connection.lastSync,
          organization: connection.customerId
        }
      };
    } catch (error) {
      return {
        id: 'google-ads',
        name: 'Google Ads',
        status: 'error',
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get all integration statuses
  async getAllIntegrationStatuses(): Promise<IntegrationStatus[]> {
    const [youtube, openai, googleAds] = await Promise.all([
      this.checkYouTubeIntegration(),
      this.checkOpenAIIntegration(),
      this.checkGoogleAdsIntegration()
    ]);

    return [youtube, openai, googleAds];
  }

  // Save integration status to database
  async saveIntegrationStatus(status: IntegrationStatus): Promise<void> {
    const { error } = await supabase
      .from('integration_status')
      .upsert({
        integration_id: status.id,
        status: status.status,
        last_checked: status.lastChecked,
        account_details: status.accountDetails,
        error_message: status.error,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'integration_id'
      });

    if (error) {
      console.error('Error saving integration status:', error);
    }
  }

  // Get integration status from database
  async getIntegrationStatusFromDB(integrationId: string): Promise<IntegrationStatus | null> {
    const { data, error } = await supabase
      .from('integration_status')
      .select('*')
      .eq('integration_id', integrationId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.integration_id,
      name: this.getIntegrationName(data.integration_id),
      status: data.status,
      lastChecked: data.last_checked,
      accountDetails: data.account_details,
      error: data.error_message
    };
  }

  private getIntegrationName(integrationId: string): string {
    const names: Record<string, string> = {
      'youtube': 'YouTube',
      'openai': 'OpenAI',
      'google-ads': 'Google Ads'
    };
    return names[integrationId] || integrationId;
  }
}

export const integrationService = new IntegrationService(); 