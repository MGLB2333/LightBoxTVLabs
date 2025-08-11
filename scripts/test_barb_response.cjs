const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

class BARBDataPopulator {
  constructor() {
    this.baseUrl = 'https://barb-api.co.uk/api/v1';
    this.accessToken = null;
    this.refreshToken = null;
  }

  async authenticate() {
    console.log('🔐 Authenticating with BARB API...');
    
    const response = await fetch(`${this.baseUrl}/auth/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: process.env.VITE_BARB_EMAIL,
        password: process.env.VITE_BARB_PASSWORD,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Authentication failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    this.accessToken = data.access;
    this.refreshToken = data.refresh;
    console.log('✅ Authentication successful');
  }

  async ensureValidToken() {
    if (!this.accessToken) {
      await this.authenticate();
    }
  }

  async apiRequest(endpoint, params = {}) {
    await this.ensureValidToken();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error Details: ${response.status} ${response.statusText}`);
      console.error(`❌ URL: ${url.toString()}`);
      console.error(`❌ Response: ${errorText}`);
      throw new Error(`API request failed: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async testResponse() {
    console.log('🧪 Testing BARB API response structure...');
    
    try {
      const response = await this.apiRequest('/advertising_spots/', {
        min_transmission_date: '2024-08-04',
        max_transmission_date: '2024-08-04',
        page: 1,
        page_size: 10
      });

      console.log('🔍 Response type:', typeof response);
      console.log('🔍 Response keys:', Object.keys(response));
      console.log('🔍 Response is array:', Array.isArray(response));
      
      if (response.results) {
        console.log('🔍 Response.results type:', typeof response.results);
        console.log('🔍 Response.results is array:', Array.isArray(response.results));
        console.log('🔍 Response.results length:', response.results?.length || 0);
        console.log('🔍 First result:', JSON.stringify(response.results?.[0], null, 2));
      }
      
      if (response.events) {
        console.log('🔍 Response.events type:', typeof response.events);
        console.log('🔍 Response.events is array:', Array.isArray(response.events));
        console.log('🔍 Response.events length:', response.events?.length || 0);
        console.log('🔍 First event:', JSON.stringify(response.events?.[0], null, 2));
      }
      
      if (Array.isArray(response)) {
        console.log('🔍 Response array length:', response.length);
        console.log('🔍 First array item:', JSON.stringify(response[0], null, 2));
      }
      
      console.log('🔍 Full response structure:', JSON.stringify(response, null, 2));
      
    } catch (error) {
      console.error('❌ Error testing response:', error);
    }
  }
}

async function main() {
  const populator = new BARBDataPopulator();
  await populator.testResponse();
}

main(); 