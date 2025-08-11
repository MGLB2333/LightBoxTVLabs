// BARB API Service for live API calls
// This service makes direct calls to the BARB API instead of using the database

interface BARBApiResponse {
  results?: any[];
  events?: any[];
  next?: string;
  count?: number;
}

interface BARBAuthResponse {
  access: string;
  refresh: string;
}

export class BARBApiService {
  private static baseUrl = '/api/barb'; // Use Vite proxy instead of direct API calls
  private static accessToken: string | null = null;
  private static refreshToken: string | null = null;
  private static tokenExpiry: number | null = null;
  
  // Simple in-memory cache for TVR calculations (key: stringified params, value: result)
  private static tvrCache = new Map<string, {
    tvr: number;
    impacts: number;
    spots_count: number;
    total_duration: number;
    timestamp: number;
  }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

  // Authentication
  static async authenticate(): Promise<void> {
    try {
      console.log('🔐 Authenticating with BARB API via proxy...');
      
      const email = import.meta.env.VITE_BARB_EMAIL;
      const password = import.meta.env.VITE_BARB_PASSWORD;
      
      console.log('Environment variables in browser:');
      console.log('VITE_BARB_EMAIL:', email ? 'Present' : 'Missing');
      console.log('VITE_BARB_PASSWORD:', password ? 'Present' : 'Missing');
      
      if (!email || !password) {
        throw new Error('BARB credentials not found in environment variables');
      }

      const authUrl = `${window.location.origin}${this.baseUrl}/auth/token/`;
      console.log(`🔐 Auth URL: ${authUrl}`);

      const response = await fetch(authUrl, {
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
        throw new Error(`Authentication failed: ${response.statusText} - ${errorText}`);
      }

      const data: BARBAuthResponse = await response.json();
      this.accessToken = data.access;
      this.refreshToken = data.refresh;
      this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour from now
      console.log('✅ BARB API authentication successful via proxy');
    } catch (error) {
      console.error('❌ BARB API authentication error:', error);
      throw error;
    }
  }

  static async ensureValidToken(): Promise<void> {
    if (!this.accessToken || (this.tokenExpiry && Date.now() >= this.tokenExpiry)) {
      await this.authenticate();
    }
  }

  static async refreshAccessToken(): Promise<void> {
    try {
      if (!this.refreshToken) {
        await this.authenticate();
        return;
      }

      const refreshUrl = `${window.location.origin}${this.baseUrl}/auth/token/refresh/`;
      console.log(`🔄 Refresh URL: ${refreshUrl}`);

      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: this.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data: BARBAuthResponse = await response.json();
      this.accessToken = data.access;
      this.tokenExpiry = Date.now() + (60 * 60 * 1000);
      console.log('✅ BARB API token refreshed via proxy');
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.authenticate();
    }
  }

  // Generic API request method
  static async apiRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    await this.ensureValidToken();

    // Construct the full URL using window.location.origin as the base
    const fullUrl = `${window.location.origin}${this.baseUrl}${endpoint}`;
    const url = new URL(fullUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value.toString());
      }
    });

    console.log(`🌐 Making BARB API request to: ${url.toString()}`);
    console.log(`🔑 Using access token: ${this.accessToken ? 'Present' : 'Missing'}`);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      redirect: 'follow', // Follow redirects automatically
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ BARB API Error: ${response.status} ${response.statusText}`);
      console.error(`❌ URL: ${url.toString()}`);
      console.error(`❌ Response: ${errorText}`);
      throw new Error(`BARB API request failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ BARB API response received for ${endpoint}`);
    return data;
  }

  // Get all data with pagination
  static async getAllData(endpoint: string, params: Record<string, any> = {}): Promise<any[]> {
    let allResults: any[] = [];
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      console.log(`📄 Fetching page ${page} from BARB API ${endpoint}...`);
      
      try {
        const response: BARBApiResponse = await this.apiRequest(endpoint, { 
          ...params, 
          page, 
          page_size: 100 
        });
        
        if (response.results && Array.isArray(response.results)) {
          allResults = allResults.concat(response.results);
          hasNext = !!response.next;
          console.log(`📊 Added ${response.results.length} results, total: ${allResults.length}`);
        } else if (response.events && Array.isArray(response.events)) {
          // BARB API returns data in {events: Array} format
          allResults = allResults.concat(response.events);
          hasNext = !!response.next;
          console.log(`📊 Added ${response.events.length} events, total: ${allResults.length}`);
        } else if (Array.isArray(response)) {
          allResults = allResults.concat(response);
          hasNext = false;
          console.log(`📊 Added ${response.length} results, total: ${allResults.length}`);
        } else {
          console.log(`⚠️ Unexpected response format for ${endpoint}:`, response);
          hasNext = false;
        }
        
        page++;

        // Add delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error fetching page ${page} from ${endpoint}:`, error);
        hasNext = false;
      }
    }

    console.log(`📊 BARB API getAllData returning ${allResults.length} total results for ${endpoint}`);
    return allResults;
  }

  // Get advertising spots with filters
  static async getAdvertisingSpots(filters: {
    advertiser?: string;
    brand?: string;
    agency?: string;
    date?: string;
    channel?: string;
  } = {}): Promise<any[]> {

    try {
      // Use campaign date from filters, or fallback to a recent date range
      let params: any = {};
      
      if (filters.date) {
        const dateObj = new Date(filters.date);
        const now = new Date();
        
        // Check if the campaign date is in the future
        if (dateObj > now) {
          console.log(`⚠️ Campaign date ${filters.date} is in the future. Using historical data instead.`);
          // Use last 7 days of 2024 for future dates
          const endDate = new Date('2024-12-31');
          const startDate = new Date('2024-12-24');
          
          params.min_transmission_date = startDate.toISOString().split('T')[0];
          params.max_transmission_date = endDate.toISOString().split('T')[0];
          
          console.log(`📅 Using historical date range instead: ${params.min_transmission_date} to ${params.max_transmission_date}`);
        } else {
          // Use the campaign's actual date with a 7-day range around it for historical dates
          const startDate = new Date(dateObj);
          startDate.setDate(dateObj.getDate() - 3);
          const endDate = new Date(dateObj);
          endDate.setDate(dateObj.getDate() + 3);
          
          params.min_transmission_date = startDate.toISOString().split('T')[0];
          params.max_transmission_date = endDate.toISOString().split('T')[0];
          
          console.log(`📅 Using campaign date range: ${params.min_transmission_date} to ${params.max_transmission_date}`);
        }
      } else {
        // Fallback to a much smaller date range (last 7 days of 2024)
        const endDate = new Date('2024-12-31');
        const startDate = new Date('2024-12-24');
        
        params.min_transmission_date = startDate.toISOString().split('T')[0];
        params.max_transmission_date = endDate.toISOString().split('T')[0];
        
        console.log(`📅 Using fallback date range (last week 2024): ${params.min_transmission_date} to ${params.max_transmission_date}`);
      }

      // Add buyer (agency) if provided
      if (filters.agency) {
        params.buyer = filters.agency;
        console.log(`🏢 Using buyer: ${filters.agency}`);
      }

      // Add advertiser if provided
      if (filters.advertiser) {
        params.advertiser = filters.advertiser;
        console.log(`📢 Using advertiser: ${filters.advertiser}`);
      }

      // Add brand if provided
      if (filters.brand) {
        params.brand = filters.brand;
        console.log(`🏷️ Using brand: ${filters.brand}`);
      }

      const allSpots = await this.getAllData('/advertising_spots/', params);
      console.log(`📊 Total spots fetched: ${allSpots.length}`);

      // Check if advertiser filtering is working at API level
      if (filters.advertiser && allSpots.length > 0) {
        const uniqueAdvertisers = [...new Set(allSpots.map((spot: any) => 
          spot.clearcast_information?.advertiser_name
        ).filter(Boolean))];
        
        const matchingAdvertisers = uniqueAdvertisers.filter(adv => 
          adv.toLowerCase().includes(filters.advertiser!.toLowerCase())
        );
        
        if (matchingAdvertisers.length === 0) {
          console.log(`⚠️ API filtering didn't work for "${filters.advertiser}". Applying client-side filtering.`);
          
          // Apply client-side filtering as fallback
          const advertiserFilteredSpots = allSpots.filter((spot: any) => {
            const advertiserName = spot.clearcast_information?.advertiser_name || '';
            return advertiserName.toLowerCase().includes(filters.advertiser!.toLowerCase());
          });
          
          if (advertiserFilteredSpots.length > 0) {
            console.log(`✅ Client-side filtering found ${advertiserFilteredSpots.length} spots for "${filters.advertiser}"`);
            allSpots.splice(0, allSpots.length, ...advertiserFilteredSpots);
          } else {
            console.log(`❌ No spots found for "${filters.advertiser}"`);
          }
        } else {
          console.log(`✅ API filtering worked for "${filters.advertiser}"`);
        }
      }

      // Filter by station if provided (but be more flexible with matching)
      let filteredSpots = allSpots;
      
      if (filters.channel) {
        const beforeCount = filteredSpots.length;
        
        // More flexible station matching
        filteredSpots = filteredSpots.filter((spot: any) => {
          const stationName = spot.station?.station_name || '';
          const channelFilter = filters.channel!.toLowerCase();
          
          // Try multiple matching strategies
          const exactMatch = stationName.toLowerCase() === channelFilter;
          const containsMatch = stationName.toLowerCase().includes(channelFilter) || 
                               channelFilter.includes(stationName.toLowerCase());
          
          return exactMatch || containsMatch;
        });
        
        console.log(`🔍 Channel filter "${filters.channel}": ${beforeCount} → ${filteredSpots.length} spots`);
      }

      // Filter by audience - look for "Houseperson with children 0-15" or "All Homes"
      const beforeAudienceCount = filteredSpots.length;
      
      const audienceFilteredSpots = filteredSpots.filter((spot: any) => {
        // Check if the spot has audience_views with the target audience
        if (spot.audience_views && spot.audience_views.length > 0) {
          const hasTargetAudience = spot.audience_views.some((audience: any) => {
            const audienceName = audience.description || '';
            
            // More precise filtering for "Houseperson with children 0-15"
            const isHousepersonWithChildren = audienceName.toLowerCase().includes('houseperson') && 
                                            audienceName.toLowerCase().includes('children') && 
                                            audienceName.toLowerCase().includes('0-15');
            const isAllHomes = audienceName.toLowerCase().includes('all homes');
            
            return isHousepersonWithChildren || isAllHomes;
          });
          
          return hasTargetAudience;
        }
        return false; // No audience data, exclude
      });
      
      console.log(`👥 Audience filter: ${beforeAudienceCount} → ${audienceFilteredSpots.length} spots`);

      // If no audience-filtered spots, use all spots but prioritize certain audiences
      if (audienceFilteredSpots.length === 0) {
        console.log(`🔄 No target audience found, using all spots with audience data`);
        return filteredSpots.filter((spot: any) => spot.audience_views && spot.audience_views.length > 0);
      }

      return audienceFilteredSpots;
    } catch (error) {
      console.error('❌ Error fetching advertising spots:', error);
      throw error;
    }
  }

  // Get advertisers
  static async getAdvertisers(): Promise<any[]> {
    console.log('🏢 Getting advertisers from BARB API...');
    
    try {
      const advertisers = await this.getAllData('/advertisers/');
      console.log(`✅ Retrieved ${advertisers.length} advertisers from BARB API`);
      return advertisers;
    } catch (error) {
      console.error('❌ Error getting advertisers from BARB API:', error);
      throw error;
    }
  }

  // Get brands
  static async getBrands(): Promise<any[]> {
    console.log('🏷️ Getting brands from BARB API...');
    
    try {
      const brands = await this.getAllData('/brands/');
      console.log(`✅ Retrieved ${brands.length} brands from BARB API`);
      return brands;
    } catch (error) {
      console.error('❌ Error getting brands from BARB API:', error);
      throw error;
    }
  }

  // Get agencies/buyers
  static async getAgencies(): Promise<any[]> {
    console.log('🏛️ Getting agencies from BARB API...');
    
    try {
      const agencies = await this.getAllData('/buyers/');
      console.log(`✅ Retrieved ${agencies.length} agencies from BARB API`);
      return agencies;
    } catch (error) {
      console.error('❌ Error getting agencies from BARB API:', error);
      throw error;
    }
  }

  // Get sales houses from database
  static async getSalesHouses(): Promise<any[]> {
    console.log('🏢 Getting sales houses from database...');
    
    try {
      // Import supabase client
      const { supabase } = await import('./supabase');
      
      // Get sales houses from database
      const { data: salesHouses, error } = await supabase
        .from('barb_sales_houses')
        .select('sales_house_name, description, is_active')
        .eq('is_active', true)
        .order('sales_house_name');
      
      if (error) {
        console.error('Error fetching sales houses from database:', error);
        throw error;
      }
      
      if (!salesHouses || salesHouses.length === 0) {
        console.log('No sales houses found in database');
        return [];
      }
      
      console.log(`✅ Retrieved ${salesHouses.length} sales houses from database`);
      console.log(`🔍 Sales houses:`, salesHouses.map(sh => sh.sales_house_name));
      return salesHouses;
    } catch (error) {
      console.error('❌ Error getting sales houses from database:', error);
      throw error;
    }
  }

  // Get channels/stations
  static async getChannels(): Promise<any[]> {
    console.log('📺 Getting channels from BARB API...');
    
    try {
      const channels = await this.getAllData('/stations/');
      console.log(`✅ Retrieved ${channels.length} channels from BARB API`);
      return channels;
    } catch (error) {
      console.error('❌ Error getting channels from BARB API:', error);
      throw error;
    }
  }

  // Get stations filtered by sales house
  static async getStationsBySalesHouse(salesHouseName: string): Promise<any[]> {
    console.log(`📺 Getting stations for sales house: ${salesHouseName}`);
    
    try {
      // Import supabase client
      const { supabase } = await import('./supabase');
      
      // Get stations for this sales house from database
      const { data: dbStations, error } = await supabase
        .from('barb_sales_house_station_mapping')
        .select('station_name, station_code')
        .eq('sales_house_name', salesHouseName)
        .eq('is_active', true)
        .order('station_name');
      
      if (error) {
        console.error('Error fetching stations from database:', error);
        throw error;
      }
      
      if (!dbStations || dbStations.length === 0) {
        console.log(`No stations found in database for sales house "${salesHouseName}"`);
        return [];
      }
      
      // Get the full list of stations from BARB API to get complete station objects
      const allStations = await this.getChannels();
      console.log(`📊 Total stations available from BARB API: ${allStations.length}`);
      
      // Match database station names to BARB API station objects
      const filteredStations = allStations.filter((station: any) => 
        dbStations.some(dbStation => 
          station.station_name?.toLowerCase().includes(dbStation.station_name.toLowerCase()) ||
          dbStation.station_name.toLowerCase().includes(station.station_name?.toLowerCase() || '')
        )
      );
      
      console.log(`✅ Retrieved ${filteredStations.length} stations for sales house "${salesHouseName}"`);
      console.log(`🔍 Database stations:`, dbStations.map(s => s.station_name));
      console.log(`🔍 Matched BARB stations:`, filteredStations.map(s => s.station_name));
      
      return filteredStations;
    } catch (error) {
      console.error(`❌ Error getting stations for sales house "${salesHouseName}":`, error);
      throw error;
    }
  }

  // Get audience definitions from BARB
  static async getAudienceDefinitions(): Promise<any[]> {
    console.log('👥 Getting audience definitions from BARB API...');
    
    try {
      // We'll use a sample spot to extract audience definitions
      const sampleSpots = await this.getAdvertisingSpots({ date: '2025-01-01' });
      
      if (sampleSpots.length === 0) {
        console.log('No sample spots found for audience definitions');
        return [];
      }
      
      // Extract unique audience definitions from the first spot
      const firstSpot = sampleSpots[0];
      const audiences = firstSpot.audience_views || [];
      
      // Map to a cleaner format
      const audienceDefinitions = audiences.map((audience: any) => ({
        code: audience.audience_code,
        description: audience.description,
        category_id: audience.category_id,
        target_size_in_hundreds: audience.target_size_in_hundreds
      }));
      
      console.log(`✅ Retrieved ${audienceDefinitions.length} audience definitions from BARB API`);
      return audienceDefinitions;
    } catch (error) {
      console.error('❌ Error getting audience definitions from BARB API:', error);
      throw error;
    }
  }

    // Get campaigns
  static async getCampaigns(): Promise<any[]> {
    console.log('📋 Getting campaigns from BARB API...');

    try {
      const campaigns = await this.getAllData('/campaigns/');
      console.log(`✅ Retrieved ${campaigns.length} campaigns from BARB API`);
      return campaigns;
    } catch (error) {
      console.error('❌ Error getting campaigns from BARB API:', error);
      throw error;
    }
  }

  // Get spot schedule
  static async getSpotSchedule(filters: {
    station?: string;
    date?: string;
  } = {}): Promise<any[]> {
    console.log('📅 Getting spot schedule from BARB API with filters:', filters);

    try {
      const schedule = await this.getAllData('/spot_schedule', filters);
      console.log(`✅ Retrieved ${schedule.length} spot schedule entries from BARB API`);
      return schedule;
    } catch (error) {
      console.error('❌ Error getting spot schedule from BARB API:', error);
      throw error;
    }
  }

  // Submit async batch job for advertising spots
  static async submitAsyncBatchAdvertisingSpots(filters: {
    advertiser?: string;
    brand?: string;
    agency?: string;
    date?: string;
    channel?: string;
  } = {}): Promise<any> {
    console.log('📤 Submitting async batch job for advertising spots with filters:', filters);

    try {
      const response = await this.apiRequest('/async-batch/advertising_spots', filters);
      console.log('✅ Async batch job submitted successfully');
      return response;
    } catch (error) {
      console.error('❌ Error submitting async batch job:', error);
      throw error;
    }
  }

  // Submit async batch job for spot audience
  static async submitAsyncBatchSpotAudience(filters: {
    spot_id?: string;
    commercial_number?: string;
    date?: string;
  } = {}): Promise<any> {
    console.log('📤 Submitting async batch job for spot audience with filters:', filters);

    try {
      const response = await this.apiRequest('/async-batch/spot_audience', filters);
      console.log('✅ Async batch job submitted successfully');
      return response;
    } catch (error) {
      console.error('❌ Error submitting async batch job:', error);
      throw error;
    }
  }

  // Calculate TVR for a specific advertiser, date, and buying audience
  static async calculateTVR(filters: {
    advertiser: string;
    date: string;
    buying_audience?: string;
    brand?: string;
    agency?: string;
    station?: string;
  }): Promise<{
    tvr: number;
    impacts: number;
    spots_count: number;
    total_duration: number;
  }> {

    // Check in-memory cache first
    const cacheKey = JSON.stringify(filters);
    const cached = this.tvrCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      console.log(`📋 Using in-memory cached TVR result for ${filters.station || 'all stations'}`);
      return {
        tvr: cached.tvr,
        impacts: cached.impacts,
        spots_count: cached.spots_count,
        total_duration: cached.total_duration
      };
    }
    
    // Check database cache
    try {
      const { supabase } = await import('./supabase');
      const { data: dbCached, error: dbError } = await supabase.rpc('get_cached_tvr', {
        p_cache_key: cacheKey,
        p_max_age_minutes: 30
      });
      
      if (!dbError && dbCached && dbCached.length > 0) {
        const cachedResult = dbCached[0];
        console.log(`💾 Using database cached TVR result for ${filters.station || 'all stations'}`);
        
        // Also update in-memory cache
        this.tvrCache.set(cacheKey, {
          tvr: cachedResult.tvr,
          impacts: cachedResult.impacts,
          spots_count: cachedResult.spots_count,
          total_duration: cachedResult.total_duration,
          timestamp: now
        });
        
        return {
          tvr: cachedResult.tvr,
          impacts: cachedResult.impacts,
          spots_count: cachedResult.spots_count,
          total_duration: cachedResult.total_duration
        };
      }
    } catch (dbCacheError) {
      console.warn('⚠️ Database cache check failed, proceeding with API call:', dbCacheError);
    }
    
    try {
      // Get advertising spots for the given filters
      const spots = await this.getAdvertisingSpots({
        advertiser: filters.advertiser,
        brand: filters.brand,
        agency: filters.agency,
        date: filters.date,
        channel: filters.station
      });

      if (spots.length === 0) {
        console.log('No spots found for TVR calculation');
        return {
          tvr: 0,
          impacts: 0,
          spots_count: 0,
          total_duration: 0
        };
      }

      console.log(`📊 Found ${spots.length} spots for TVR calculation`);
      
      // Show which stations are actually in the filtered results
      const filteredStations = [...new Set(spots.map((spot: any) => spot.station?.station_name).filter(Boolean))];
      console.log(`🏢 Stations in filtered results:`, filteredStations);

      // Calculate total impacts and duration
      let totalImpacts = 0;
      let totalDuration = 0;
      let spotsCount = spots.length;

      // Process each spot to get audience data
      spots.forEach((spot: any) => {
        // Get spot duration in seconds
        const duration = spot.spot_duration || spot.duration || 0;
        totalDuration += duration;
        
        // Debug: Log the first spot structure to understand the data format
        if (spots.indexOf(spot) === 0) {
          console.log('🔍 First spot structure:', {
            station_name: spot.station?.station_name,
            audience_views: spot.audience_views?.length || 0,
            first_audience: spot.audience_views?.[0]?.description,
            first_audience_size: spot.audience_views?.[0]?.audience_size_hundreds,
            first_audience_target: spot.audience_views?.[0]?.audience_target_size_hundreds
          });
        }
        
        // Get audience data from audience_views (following the actual API structure)
        if (spot.audience_views && spot.audience_views.length > 0) {
          // Look for target audience: "Houseperson with children 0-15" or "All Homes"
          const targetAudience = spot.audience_views.find((aud: any) => {
            const audienceName = aud.description || '';
            
            // More precise filtering for "Houseperson with children 0-15"
            const isHousepersonWithChildren = audienceName.toLowerCase().includes('houseperson') && 
                                            audienceName.toLowerCase().includes('children') && 
                                            audienceName.toLowerCase().includes('0-15');
            const isAllHomes = audienceName.toLowerCase().includes('all homes');
            
            return isHousepersonWithChildren || isAllHomes;
          });
          
          if (targetAudience) {
            const audienceSizeHundreds = targetAudience.audience_size_hundreds;
            const targetSizeHundreds = targetAudience.audience_target_size_hundreds;
            
            console.log(`🔍 Target audience data: "${targetAudience.description}" - Size: ${audienceSizeHundreds}, Target: ${targetSizeHundreds}`);
            
            // Validate and use the audience data
            if (audienceSizeHundreds && audienceSizeHundreds > 0) {
              const audienceSize = audienceSizeHundreds * 100; // Convert from hundreds
              totalImpacts += audienceSize;
              
              // Store target size for TVR calculation
              if (targetSizeHundreds && !isNaN(targetSizeHundreds) && targetSizeHundreds > 0) {
                console.log(`✅ Valid audience data: Size=${audienceSize.toLocaleString()}, Target=${(targetSizeHundreds * 100).toLocaleString()}`);
              } else {
                console.log(`⚠️ Invalid target size: ${targetSizeHundreds}`);
              }
            } else {
              console.log(`⚠️ Invalid audience size: ${audienceSizeHundreds}`);
            }
          } else {
            console.log(`⚠️ No target audience found in spot`);
          }
        } else {
          console.log(`⚠️ No audience_views data in spot`);
        }
      });

      // Calculate TVR (Television Rating)
      // Following the notebook formula: audience_penetration = audience_size_hundreds / audience_target_size_hundreds
      let tvr = 0;
      
      if (totalImpacts > 0) {
        // Calculate total target size from all spots (for the target audience only)
        const totalTargetSize = spots.reduce((sum, spot) => {
          if (spot.audience_views && spot.audience_views.length > 0) {
            // Look for target audience in audience_views
            const targetAudience = spot.audience_views.find((aud: any) => {
              const audienceName = aud.description || '';
              
              // More precise filtering for "Houseperson with children 0-15"
              const isHousepersonWithChildren = audienceName.toLowerCase().includes('houseperson') && 
                                              audienceName.toLowerCase().includes('children') && 
                                              audienceName.toLowerCase().includes('0-15');
              const isAllHomes = audienceName.toLowerCase().includes('all homes');
              
              return isHousepersonWithChildren || isAllHomes;
            });
            
            if (targetAudience) {
              const targetSizeHundreds = targetAudience.audience_target_size_hundreds;
              if (targetSizeHundreds && !isNaN(targetSizeHundreds) && targetSizeHundreds > 0) {
                return sum + (targetSizeHundreds * 100);
              }
            }
          }
          return sum;
        }, 0);

        if (totalTargetSize > 0) {
          // Calculate TVR as (total impacts / total target size) * 100
          // This gives us the average TVR across all spots for the target audience
          tvr = (totalImpacts / totalTargetSize) * 100;
          console.log(`📊 TVR calculated using target sizes: ${tvr.toFixed(2)}% (Impacts: ${totalImpacts.toLocaleString()}, Target: ${totalTargetSize.toLocaleString()})`);
        } else {
          // Fallback to universe size calculation if no valid target sizes
          const universeSize = this.getUniverseSize(filters.buying_audience);
          tvr = (totalImpacts / universeSize) * 100;
          console.log(`🔄 Using fallback universe size: ${universeSize.toLocaleString()} - TVR: ${tvr.toFixed(2)}%`);
        }
      } else {
        console.log(`⚠️ No valid impacts found`);
      }

              console.log(`✅ TVR calculation complete:`, {
          tvr: tvr.toFixed(2),
          impacts: totalImpacts.toLocaleString(),
          spots_count: spotsCount,
          total_duration: totalDuration,
          avg_audience_per_spot: (totalImpacts / spotsCount).toLocaleString()
        });

      const result = {
        tvr: Math.round(tvr * 10) / 10, // Round to 1 decimal place
        impacts: totalImpacts,
        spots_count: spotsCount,
        total_duration: totalDuration
      };

      // Cache the result in memory
      this.tvrCache.set(cacheKey, {
        ...result,
        timestamp: now
      });

      // Also cache in database for persistence
      try {
        const { supabase } = await import('./supabase');
        await supabase.rpc('store_tvr_cache', {
          p_cache_key: cacheKey,
          p_advertiser: filters.advertiser,
          p_brand: filters.brand || null,
          p_agency: filters.agency || null,
          p_date: filters.date,
          p_buying_audience: filters.buying_audience || null,
          p_station: filters.station || null,
          p_tvr: result.tvr,
          p_impacts: result.impacts,
          p_spots_count: result.spots_count,
          p_total_duration: result.total_duration
        });
        console.log(`💾 Stored TVR result in database cache for ${filters.station || 'all stations'}`);
      } catch (dbStoreError) {
        console.warn('⚠️ Failed to store in database cache:', dbStoreError);
      }

      return result;
    } catch (error) {
      console.error('❌ Error calculating TVR from BARB API:', error);
      throw error;
    }
  }

  // Helper method to get target audience based on buying audience
  static getTargetAudience(buyingAudience?: string): string {
    if (!buyingAudience) return 'All Homes';
    
    const audienceMapping: Record<string, string> = {
      'houseperson with children 0-15': 'All Homes',
      'adult': 'All Adults',
      'housewives': 'All Houseperson',
      'children': 'All Children aged 4-15',
      'men': 'All Men',
      'women': 'All Women',
      'hp+child': 'All Homes'
    };
    
    return audienceMapping[buyingAudience.toLowerCase()] || 'All Homes';
  }

  // Helper method to get universe size based on buying audience (in hundreds to match impression scaling)
  static getUniverseSize(buyingAudience?: string): number {
    if (!buyingAudience) return 270000; // Default UK households (27M/100)
    
    const universeMapping: Record<string, number> = {
      'houseperson with children 0-15': 270000, // UK households (27M/100)
      'adult': 520000, // UK adult population (52M/100)
      'housewives': 260000, // UK housewives (26M/100)
      'children': 120000, // UK children (12M/100)
      'men': 250000, // UK men (25M/100)
      'women': 270000, // UK women (27M/100)
      'hp+child': 270000 // UK households (27M/100)
    };
    
    return universeMapping[buyingAudience.toLowerCase()] || 270000;
  }

  // Clear TVR cache (useful for testing or when data becomes stale)
  static async clearTVRCache(): Promise<void> {
    // Clear in-memory cache
    this.tvrCache.clear();
    console.log('🗑️ In-memory TVR cache cleared');
    
    // Clear database cache
    try {
      const { supabase } = await import('./supabase');
      const { error } = await supabase.rpc('clean_tvr_cache');
      if (error) {
        console.warn('⚠️ Failed to clear database cache:', error);
      } else {
        console.log('🗑️ Database TVR cache cleared');
      }
    } catch (dbError) {
      console.warn('⚠️ Failed to clear database cache:', dbError);
    }
  }

  // Get cache stats for debugging
  static async getCacheStats(): Promise<{ 
    memorySize: number; 
    memoryKeys: string[];
    databaseSize?: number;
  }> {
    const stats: {
      memorySize: number; 
      memoryKeys: string[];
      databaseSize?: number;
    } = {
      memorySize: this.tvrCache.size,
      memoryKeys: Array.from(this.tvrCache.keys())
    };
    
    // Get database cache stats
    try {
      const { supabase } = await import('./supabase');
      const { count, error } = await supabase
        .from('tvr_cache')
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        stats.databaseSize = count || 0;
      }
    } catch (dbError) {
      console.warn('⚠️ Failed to get database cache stats:', dbError);
    }
    
    return stats;
  }
} 