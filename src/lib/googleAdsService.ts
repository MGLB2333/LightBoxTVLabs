import { supabase } from './supabase';

export interface GoogleAdsAccount {
  customerId: string;
  customerName: string;
  manager: boolean;
  testAccount: boolean;
  currencyCode: string;
  timeZone: string;
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate?: string;
  budget: number;
  budgetType: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

export interface GoogleAdsConnection {
  id: string;
  userId: string;
  organizationId: string;
  customerId: string;
  customerName: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  lastSync: string;
  status: 'active' | 'expired' | 'error';
}

class GoogleAdsService {
  private readonly CLIENT_ID = import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID;
  private readonly CLIENT_SECRET = import.meta.env.VITE_GOOGLE_ADS_CLIENT_SECRET;
  private readonly REDIRECT_URI = 'http://localhost:5173/auth/google-ads/callback';
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  // Initialize OAuth flow
  async initiateOAuth(): Promise<string> {
    if (!this.CLIENT_ID) {
      throw new Error('Google Ads Client ID not configured');
    }

    const state = this.generateState();
    console.log('GoogleAdsService: Generated OAuth state:', state);
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    
    authUrl.searchParams.append('client_id', this.CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', this.REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', this.SCOPES.join(' '));
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');

    // Store state for verification
    localStorage.setItem('google_ads_oauth_state', state);
    console.log('GoogleAdsService: Stored OAuth state in localStorage');
    
    return authUrl.toString();
  }

  // Handle OAuth callback
  async handleOAuthCallback(code: string, state: string): Promise<GoogleAdsConnection> {
    console.log('GoogleAdsService: Starting OAuth callback handling');
    
    // Verify state
    const storedState = localStorage.getItem('google_ads_oauth_state');
    console.log('GoogleAdsService: State verification', { 
      providedState: state, 
      storedState: storedState,
      match: state === storedState 
    });
    
    if (state !== storedState) {
      throw new Error('Invalid OAuth state');
    }
    localStorage.removeItem('google_ads_oauth_state');

    console.log('GoogleAdsService: Exchanging code for tokens...');
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.CLIENT_ID!,
        client_secret: this.CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.REDIRECT_URI,
      }),
    });

    console.log('GoogleAdsService: Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('GoogleAdsService: Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText
      });
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokens = await tokenResponse.json();
    console.log('GoogleAdsService: Tokens received successfully');
    
    // Get user info
    console.log('GoogleAdsService: Getting user info...');
    const userInfo = await this.getUserInfo(tokens.access_token);
    console.log('GoogleAdsService: User info received:', { email: userInfo.email });
    
    // Get Google Ads accounts
    console.log('GoogleAdsService: Getting Google Ads accounts...');
    const accounts = await this.getCustomerAccounts(tokens.access_token);
    console.log('GoogleAdsService: Accounts received:', accounts.length);
    
    // Save connection to database
    console.log('GoogleAdsService: Saving connection to database...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const connection = {
      user_id: user.id,
      organization_id: await this.getCurrentOrganizationId(),
      customer_id: accounts[0]?.customerId || '',
      customer_name: accounts[0]?.customerName || '',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      last_sync: new Date().toISOString(),
      status: 'active'
    };

    const { data, error } = await supabase
      .from('google_ads_connections')
      .upsert(connection, { onConflict: 'user_id,organization_id' })
      .select()
      .single();

    if (error) {
      console.error('GoogleAdsService: Database error:', error);
      throw error;
    }
    
    console.log('GoogleAdsService: Connection saved successfully');
    return data;
  }

  // Get user info from Google
  private async getUserInfo(accessToken: string): Promise<any> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get user info');
    }
    
    return response.json();
  }

  // Get Google Ads customer accounts
  private async getCustomerAccounts(accessToken: string): Promise<GoogleAdsAccount[]> {
    // This would use the Google Ads API to get customer accounts
    // For now, throw error since we need real data
    throw new Error('Customer accounts API not implemented - requires real Google Ads API integration');
  }

  // Get current organization ID
  private async getCurrentOrganizationId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    return data?.organization_id || '';
  }

  // Check if user has active Google Ads connection
  async checkConnection(): Promise<GoogleAdsConnection | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('google_ads_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (error || !data) return null;

    // Convert snake_case to camelCase for the interface
    const connection: GoogleAdsConnection = {
      id: data.id,
      userId: data.user_id,
      organizationId: data.organization_id,
      customerId: data.customer_id,
      customerName: data.customer_name,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      lastSync: data.last_sync,
      status: data.status
    };

    // Check if token is expired
    if (new Date(connection.expiresAt) <= new Date()) {
      await this.refreshToken(connection);
      return this.checkConnection();
    }

    return connection;
  }

  // Refresh access token
  private async refreshToken(connection: GoogleAdsConnection): Promise<void> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.CLIENT_ID!,
        client_secret: this.CLIENT_SECRET!,
        refresh_token: connection.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      // Mark connection as expired
      await supabase
        .from('google_ads_connections')
        .update({ status: 'expired' })
        .eq('id', connection.id);
      return;
    }

    const tokens = await response.json();
    
    // Update connection with new tokens
    await supabase
      .from('google_ads_connections')
      .update({
        access_token: tokens.access_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        last_sync: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', connection.id);
  }

  // Get campaigns from Google Ads
  async getCampaigns(connection: GoogleAdsConnection): Promise<GoogleAdsCampaign[]> {
    try {
      // Use Google Ads API to fetch real campaigns
      const response = await fetch(`https://googleads.googleapis.com/v14/customers/${connection.customerId}/googleAds:searchStream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
          'developer-token': import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN || '',
        },
        body: JSON.stringify({
          query: `
            SELECT 
              campaign.id,
              campaign.name,
              campaign.status,
              campaign.start_date,
              campaign.end_date,
              campaign_budget.amount_micros,
              campaign_budget.delivery_method,
              metrics.impressions,
              metrics.clicks,
              metrics.cost_micros,
              metrics.conversions,
              metrics.ctr,
              metrics.average_cpc_micros,
              metrics.average_cpm_micros
            FROM campaign 
            WHERE campaign.status != 'REMOVED'
            ORDER BY campaign.name
          `
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Ads API Error:', response.status, errorText);
        throw new Error(`Google Ads API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const results = data.results || [];

      return results.map((row: any) => ({
        id: row.campaign.id,
        name: row.campaign.name,
        status: row.campaign.status,
        startDate: row.campaign.startDate,
        endDate: row.campaign.endDate,
        budget: (row.campaignBudget?.amountMicros || 0) / 1000000, // Convert micros to currency
        budgetType: row.campaignBudget?.deliveryMethod === 'STANDARD' ? 'DAILY' : 'LIFETIME',
        impressions: parseInt(row.metrics?.impressions || 0),
        clicks: parseInt(row.metrics?.clicks || 0),
        cost: (row.metrics?.costMicros || 0) / 1000000, // Convert micros to currency
        conversions: parseFloat(row.metrics?.conversions || 0),
        ctr: parseFloat(row.metrics?.ctr || 0) * 100, // Convert to percentage
        cpc: (row.metrics?.averageCpcMicros || 0) / 1000000, // Convert micros to currency
        cpm: (row.metrics?.averageCpmMicros || 0) / 1000000 // Convert micros to currency
      }));
    } catch (error) {
      console.error('Error fetching campaigns from Google Ads API:', error);
      throw new Error(`Failed to fetch campaigns from Google Ads API: ${error}`);
    }
  }

  // Sync campaigns to local database
  async syncCampaigns(connection: GoogleAdsConnection): Promise<void> {
    const campaigns = await this.getCampaigns(connection);
    
    // Save campaigns to database
    const { error } = await supabase
      .from('google_ads_campaigns')
      .upsert(
        campaigns.map(campaign => ({
          campaign_id: campaign.id,
          organization_id: connection.organizationId,
          name: campaign.name,
          status: campaign.status,
          start_date: campaign.startDate,
          end_date: campaign.endDate,
          budget: campaign.budget,
          budget_type: campaign.budgetType,
          impressions: campaign.impressions,
          clicks: campaign.clicks,
          cost: campaign.cost,
          conversions: campaign.conversions,
          ctr: campaign.ctr,
          cpc: campaign.cpc,
          cpm: campaign.cpm,
          last_sync: new Date().toISOString()
        })),
        { onConflict: 'campaign_id,organization_id' }
      );

    if (error) throw error;

    // Update connection last sync
    await supabase
      .from('google_ads_connections')
      .update({ lastSync: new Date().toISOString() })
      .eq('id', connection.id);
  }

  // Disconnect Google Ads account
  async disconnect(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('google_ads_connections')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

export const googleAdsService = new GoogleAdsService(); 