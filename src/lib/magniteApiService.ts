interface MagniteAuthResponse {
  token: string;
  expires_at: string;
}

interface MagniteAccount {
  id: number;
  name: string;
  email: string;
  account_type_id: number;
}

interface MagniteCampaign {
  id: number;
  name: string;
  active?: boolean;
  demand_partner_id?: number;
  rate?: number;
  created_at?: string;
  updated_at?: string;
  // Additional fields that might be present in demand tags
  type?: string;
  status?: string;
  description?: string;
  demand_class?: string;
}

interface MagniteBill {
  id: number;
  account_id: number;
  name: string;
  month: string;
  is_finalized: boolean;
  currency: string;
  total_bill_amount: number;
  total_amount_collected: number;
  created_at: string;
}

interface MagniteDemandTag {
  id: number;
  name: string;
  demand_class: number;
  active: boolean;
  demand_partner_id: number;
  rate: number;
}

class MagniteApiService {
  private baseUrl = 'https://console.clearline.magnite.com/api/v1';
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private currentAccount: MagniteAccount | null = null;

  constructor() {
    // Try to load token from localStorage on initialization
    this.loadStoredToken();
  }

  private loadStoredToken() {
    const stored = localStorage.getItem('magnite_token');
    const expiry = localStorage.getItem('magnite_token_expiry');
    
    if (stored && expiry) {
      this.token = stored;
      this.tokenExpiry = new Date(expiry);
      
      // Check if token is still valid (with 5 minute buffer)
      if (this.tokenExpiry < new Date(Date.now() + 5 * 60 * 1000)) {
        this.clearToken();
      }
    }
  }

  private storeToken(token: string, expiresAt: string) {
    this.token = token;
    this.tokenExpiry = new Date(expiresAt);
    localStorage.setItem('magnite_token', token);
    localStorage.setItem('magnite_token_expiry', expiresAt);
  }

  private clearToken() {
    this.token = null;
    this.tokenExpiry = null;
    localStorage.removeItem('magnite_token');
    localStorage.removeItem('magnite_token_expiry');
  }

  private async ensureValidToken(): Promise<boolean> {
    if (!this.token || !this.tokenExpiry || this.tokenExpiry < new Date()) {
      return await this.authenticate();
    }
    return true;
  }

  async authenticate(email: string = 'Mark@lightboxtv.com', password: string = 'L1ghtB0xTV!'): Promise<boolean> {
    try {
      console.log('Authenticating with Magnite API...');
      
      const response = await fetch(`${this.baseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Authentication failed:', response.status, errorText);
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const data: MagniteAuthResponse = await response.json();
      console.log('Authentication successful, token received:', data.token?.substring(0, 20) + '...');
      this.storeToken(data.token, data.expires_at);
      
    // Skip account retrieval for now - it's causing 500 errors
    // The token is valid and we can proceed with other API calls
    console.log('Skipping account retrieval due to known 500 error on /accounts/current endpoint');
      
      return true;
    } catch (error) {
      console.error('Magnite authentication error:', error);
      this.clearToken();
      return false;
    }
  }

  async getCurrentAccount(): Promise<MagniteAccount | null> {
    if (!await this.ensureValidToken()) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/accounts/current`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get current account: ${response.statusText}`);
      }

      const data = await response.json();
      this.currentAccount = data;
      return data;
    } catch (error) {
      console.error('Error getting current account:', error);
      return null;
    }
  }

  async getCampaigns(page: number = 1, per: number = 50): Promise<{ campaigns: MagniteCampaign[], totalCount: number }> {
    if (!await this.ensureValidToken()) {
      throw new Error('Not authenticated');
    }

    try {
      console.log('Fetching demand tags from Magnite API...');
      console.log('Using token:', this.token?.substring(0, 20) + '...');
      
      const response = await fetch(`${this.baseUrl}/demand_tags?page=${page}&per=${per}`, {
        method: 'GET',
        headers: {
          'Authorization': this.token!,
          'Content-Type': 'application/json',
        },
      });

      console.log('Demand tags response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Demand tags API error response:', errorText);
        throw new Error(`Failed to get demand tags: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Demand tags data received:', data);
      
      // Handle different possible response formats
      const results = data.results || data.data || data.demand_tags || [];
      const totalCount = data.total_count || data.total || data.count || results.length;
      
      return {
        campaigns: results,
        totalCount: totalCount,
      };
    } catch (error) {
      console.error('Error getting demand tags:', error);
      throw error;
    }
  }

  async getBills(page: number = 1, per: number = 50): Promise<{ bills: MagniteBill[], totalCount: number }> {
    if (!await this.ensureValidToken()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.baseUrl}/bills?page=${page}&per=${per}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get bills: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        bills: data.results || [],
        totalCount: data.total_count || 0,
      };
    } catch (error) {
      console.error('Error getting bills:', error);
      throw error;
    }
  }

  async getDemandTags(page: number = 1, per: number = 50): Promise<{ demandTags: MagniteDemandTag[], totalCount: number }> {
    if (!await this.ensureValidToken()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.baseUrl}/demand_tags?page=${page}&per=${per}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get demand tags: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        demandTags: data.results || [],
        totalCount: data.total_count || 0,
      };
    } catch (error) {
      console.error('Error getting demand tags:', error);
      throw error;
    }
  }

  async getReportingData(dateRange: string = '7d'): Promise<any> {
    if (!await this.ensureValidToken()) {
      throw new Error('Not authenticated');
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    try {
      // Get campaigns with date filtering
      const campaignsResponse = await fetch(
        `${this.baseUrl}/campaigns?created_at::gte=${startDate.toISOString().split('T')[0]}&created_at::lte=${endDate.toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
        }
      );

      if (!campaignsResponse.ok) {
        throw new Error(`Failed to get reporting data: ${campaignsResponse.statusText}`);
      }

      const campaignsData = await campaignsResponse.json();
      
      // Get bills for revenue data
      const billsResponse = await fetch(
        `${this.baseUrl}/bills?created_at::gte=${startDate.toISOString().split('T')[0]}&created_at::lte=${endDate.toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
        }
      );

      let billsData = { results: [] };
      if (billsResponse.ok) {
        billsData = await billsResponse.json();
      }

      return {
        campaigns: campaignsData.results || [],
        bills: billsData.results || [],
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        },
        summary: {
          totalCampaigns: campaignsData.total_count || 0,
          totalRevenue: billsData.results?.reduce((sum: number, bill: MagniteBill) => sum + (bill.total_bill_amount || 0), 0) || 0,
          activeCampaigns: campaignsData.results?.filter((c: MagniteCampaign) => c.active).length || 0,
        },
      };
    } catch (error) {
      console.error('Error getting reporting data:', error);
      throw error;
    }
  }

  isAuthenticated(): boolean {
    return this.token !== null && this.tokenExpiry !== null && this.tokenExpiry > new Date();
  }

  getCurrentAccountInfo(): MagniteAccount | null {
    return this.currentAccount;
  }

  disconnect() {
    this.clearToken();
    this.currentAccount = null;
  }
}

export const magniteApiService = new MagniteApiService();
export type { MagniteAccount, MagniteCampaign, MagniteBill, MagniteDemandTag };
