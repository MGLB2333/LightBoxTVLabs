const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// BARB API credentials
const BARB_EMAIL = process.env.VITE_BARB_EMAIL;
const BARB_PASSWORD = process.env.VITE_BARB_PASSWORD;

class BARBDataPopulator {
  constructor() {
    this.baseUrl = 'https://barb-api.co.uk/api/v1';
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  // Authentication
  async authenticate() {
    try {
      console.log('🔐 Authenticating with BARB API...');
      const response = await fetch(`${this.baseUrl}/auth/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: BARB_EMAIL,
          password: BARB_PASSWORD,
        }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access;
      this.refreshToken = data.refresh;
      this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour from now
      console.log('✅ Authentication successful');
    } catch (error) {
      console.error('❌ Authentication error:', error);
      throw error;
    }
  }

  async ensureValidToken() {
    if (!this.accessToken || (this.tokenExpiry && Date.now() >= this.tokenExpiry)) {
      await this.authenticate();
    }
  }

  async refreshAccessToken() {
    try {
      const response = await fetch(`${this.baseUrl}/auth/token/refresh/`, {
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

      const data = await response.json();
      this.accessToken = data.access;
      this.tokenExpiry = Date.now() + (60 * 60 * 1000);
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.authenticate();
    }
  }

  // Generic API request method
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

  // Get all data with pagination
  async getAllData(endpoint, params = {}) {
    let allResults = [];
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      console.log(`📄 Fetching page ${page} from ${endpoint}...`);
      const response = await this.apiRequest(endpoint, { ...params, page, page_size: 100 });
      
      // Debug: Log the response structure
      console.log(`🔍 Response type:`, typeof response);
      console.log(`🔍 Response keys for ${endpoint}:`, Object.keys(response));
      console.log(`🔍 Response has results:`, !!response.results);
      console.log(`🔍 Response results length:`, response.results?.length || 0);
      console.log(`🔍 Response is array:`, Array.isArray(response));
      console.log(`🔍 Response first few keys:`, Object.keys(response).slice(0, 5));
      
      // Check if response has results property or if it's directly an array
      if (response.results && Array.isArray(response.results)) {
        allResults = allResults.concat(response.results);
        hasNext = !!response.next;
        console.log(`📊 Added ${response.results.length} results, total: ${allResults.length}`);
      } else if (Array.isArray(response)) {
        allResults = allResults.concat(response);
        hasNext = false; // No pagination info available
        console.log(`📊 Added ${response.length} results, total: ${allResults.length}`);
      } else {
        console.log(`⚠️ Unexpected response format for ${endpoint}:`, response);
        hasNext = false;
      }
      
      page++;

      // Add delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`📊 getAllData returning ${allResults.length} total results for ${endpoint}`);
    return allResults;
  }

  // Verify database tables exist
  async verifyTables() {
    console.log('🔍 Verifying database tables...');

    try {
      // Check if tables exist by trying to select from them
      const tables = ['barb_spots', 'barb_advertisers', 'barb_brands', 'barb_campaigns', 'barb_buyers', 'barb_stations'];
      
      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.error(`❌ Table ${table} not found. Please run the SQL script in Supabase first.`);
          throw new Error(`Table ${table} not found. Run scripts/create_barb_tables.sql in your Supabase SQL editor.`);
        }
      }
      
      console.log('✅ All database tables verified');
    } catch (error) {
      console.error('❌ Database verification failed:', error.message);
      throw error;
    }
  }

  // Populate reference data (advertisers, buyers, stations)
  async populateReferenceData() {
    console.log('📊 Populating reference data...');

    try {
      // Get advertisers
      console.log('📋 Fetching advertisers...');
      const advertisers = await this.getAllData('/advertisers/');
      console.log(`Found ${advertisers.length} advertisers`);
      console.log('🔍 Advertisers response:', JSON.stringify(advertisers, null, 2));

      // Insert advertisers
      const { error: advertisersError } = await supabase
        .from('barb_advertisers')
        .upsert(advertisers.filter(adv => adv && adv.id && adv.name).map(adv => ({
          id: adv.id,
          name: adv.name
        })), { onConflict: 'id' });

      if (advertisersError) {
        console.error('❌ Error inserting advertisers:', advertisersError);
      } else {
        console.log('✅ Advertisers populated');
      }

      // Get buyers
      console.log('📋 Fetching buyers...');
      const buyers = await this.getAllData('/buyers/');
      console.log(`Found ${buyers.length} buyers`);

      // Insert buyers
      const { error: buyersError } = await supabase
        .from('barb_buyers')
        .upsert(buyers.filter(buyer => buyer && buyer.id && buyer.name).map(buyer => ({
          id: buyer.id,
          name: buyer.name
        })), { onConflict: 'id' });

      if (buyersError) {
        console.error('❌ Error inserting buyers:', buyersError);
      } else {
        console.log('✅ Buyers populated');
      }

      // Get stations
      console.log('📋 Fetching stations...');
      const stations = await this.getAllData('/stations/');
      console.log(`Found ${stations.length} stations`);

      // Insert stations
      const { error: stationsError } = await supabase
        .from('barb_stations')
        .upsert(stations.filter(station => station && station.id && station.name).map(station => ({
          id: station.id,
          name: station.name,
          region: station.region
        })), { onConflict: 'id' });

      if (stationsError) {
        console.error('❌ Error inserting stations:', stationsError);
      } else {
        console.log('✅ Stations populated');
      }

    } catch (error) {
      console.error('❌ Error populating reference data:', error);
      throw error;
    }
  }

  // Populate spots data for a specific date
  async populateSpotsData(date) {
    console.log(`📺 Populating spots data for ${date}...`);

    try {
      // Get spots for the specified date with manual pagination
      console.log(`📄 Fetching spots from /advertising_spots/...`);
      let allSpots = [];
      let page = 1;
      let hasNext = true;

      while (hasNext) {
        console.log(`📄 Fetching page ${page} from /advertising_spots/...`);
        const response = await this.apiRequest('/advertising_spots/', {
          min_transmission_date: date,
          max_transmission_date: date,
          page: page,
          page_size: 100
        });

        console.log(`🔍 Page ${page} response type:`, typeof response);
        console.log(`🔍 Page ${page} response keys:`, Object.keys(response));
        console.log(`🔍 Page ${page} response is array:`, Array.isArray(response));
        
        let pageSpots = [];
        if (Array.isArray(response)) {
          // API returns array directly
          pageSpots = response;
          hasNext = false; // No pagination info available
        } else if (response.results && Array.isArray(response.results)) {
          pageSpots = response.results;
          hasNext = !!response.next;
        } else if (response.events && Array.isArray(response.events)) {
          pageSpots = response.events;
          hasNext = !!response.next;
        } else {
          console.log(`⚠️ Unexpected response format for page ${page}:`, response);
          hasNext = false;
        }

        console.log(`📊 Page ${page} has ${pageSpots.length} spots`);
        allSpots = allSpots.concat(pageSpots);
        
        if (pageSpots.length === 0) {
          hasNext = false;
        }
        
        page++;
        
        // Add delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('🔍 Total spots fetched:', allSpots.length);
      console.log('🔍 First few spots:', JSON.stringify(allSpots.slice(0, 3), null, 2));
      
      // Filter out null values and undefined
      const validSpots = allSpots.filter(spot => spot !== null && spot !== undefined);
      console.log(`Found ${allSpots.length} total results, ${validSpots.length} valid spots for ${date}`);

      if (validSpots.length === 0) {
        console.log('⚠️ No valid spots found for this date');
        return;
      }

      // Debug: Log the first spot to see the structure
      console.log('🔍 First spot structure:', JSON.stringify(validSpots[0], null, 2));

      // Transform spots data to match our actual database schema
      // Each spot can have multiple audience measurements, so we need to flatten the audience_views
      const transformedSpots = [];
      
      validSpots.forEach(spot => {
        // If the spot has audience_views, create a record for each audience segment
        if (spot.audience_views && Array.isArray(spot.audience_views)) {
          spot.audience_views.forEach(audience => {
            transformedSpots.push({
              id: spot.broadcaster_spot_number || `${spot.commercial_number}_${audience.audience_code}`, // Use broadcaster_spot_number as unique ID
              commercial_number: spot.commercial_number,
              transmission_datetime: spot.spot_start_datetime?.standard_datetime || null,
              date: spot.spot_start_datetime?.standard_datetime?.split(' ')[0] || date,
              time: spot.spot_start_datetime?.standard_datetime?.split(' ')[1] || null,
              channel_id: spot.station?.station_code?.toString() || null,
              channel_name: spot.station?.station_name || null,
              programme_id: null,
              programme_title: spot.preceding_programme_name || null,
              programme_episode_title: null,
              advertiser_id: spot.clearcast_information?.advertiser_code || null,
              advertiser_name: spot.clearcast_information?.advertiser_name || null,
              brand_id: spot.clearcast_information?.product_code || null,
              brand_name: spot.clearcast_information?.product_name || null,
              campaign_id: spot.campaign_approval_id?.toString() || null,
              campaign_name: null,
              buyer_id: spot.clearcast_information?.buyer_code || null,
              buyer_name: spot.clearcast_information?.buyer_name || null,
              duration: spot.spot_duration || 0,
              impacts: audience.audience_size_hundreds || 0,
              cpt: 0, // Calculate CPT if needed
              daypart: null,
              region: null,
              audience_segment: audience.description || null,
              audience_code: audience.audience_code || null,
              clearance_status: null,
              clearcast_id: null,
              metabroadcast_id: null,
              created_at: new Date().toISOString()
            });
          });
        } else {
          // If no audience_views, create a single record with basic data
          transformedSpots.push({
            id: spot.broadcaster_spot_number || spot.commercial_number,
            commercial_number: spot.commercial_number,
            transmission_datetime: spot.spot_start_datetime?.standard_datetime || null,
            date: spot.spot_start_datetime?.standard_datetime?.split(' ')[0] || date,
            time: spot.spot_start_datetime?.standard_datetime?.split(' ')[1] || null,
            channel_id: spot.station?.station_code?.toString() || null,
            channel_name: spot.station?.station_name || null,
            programme_id: null,
            programme_title: spot.preceding_programme_name || null,
            programme_episode_title: null,
            advertiser_id: spot.clearcast_information?.advertiser_code || null,
            advertiser_name: spot.clearcast_information?.advertiser_name || null,
            brand_id: spot.clearcast_information?.product_code || null,
            brand_name: spot.clearcast_information?.product_name || null,
            campaign_id: spot.campaign_approval_id?.toString() || null,
            campaign_name: null,
            buyer_id: spot.clearcast_information?.buyer_code || null,
            buyer_name: spot.clearcast_information?.buyer_name || null,
            duration: spot.spot_duration || 0,
            impacts: 0,
            cpt: 0,
            daypart: null,
            region: null,
            audience_segment: null,
            audience_code: null,
            clearance_status: null,
            clearcast_id: null,
            metabroadcast_id: null,
            created_at: new Date().toISOString()
          });
        }
      });

      // Deduplicate by broadcaster_spot_number to avoid conflicts
      const spotMap = new Map();
      transformedSpots.forEach(spot => {
        if (!spotMap.has(spot.id)) {
          spotMap.set(spot.id, spot);
        }
      });
      const uniqueSpots = Array.from(spotMap.values());
      
      console.log(`📊 Processing all ${uniqueSpots.length} spot audience records`);

      // Insert spots in batches
      const batchSize = 100;
      for (let i = 0; i < uniqueSpots.length; i += batchSize) {
        const batch = uniqueSpots.slice(i, i + batchSize);
        console.log(`📦 Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uniqueSpots.length / batchSize)}...`);

        const { error } = await supabase
          .from('barb_spots')
          .upsert(batch, { onConflict: 'id' });

        if (error) {
          console.error('❌ Error inserting spots batch:', error);
        } else {
          console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} inserted successfully`);
        }

        // Add delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`✅ Successfully populated ${uniqueSpots.length} spots for ${date}`);

      // Extract and populate brands and campaigns from spots data
      await this.extractBrandsAndCampaigns(uniqueSpots);

    } catch (error) {
      console.error('❌ Error populating spots data:', error);
      throw error;
    }
  }

  // Extract reference data from spots data
  async extractBrandsAndCampaigns(spots) {
    console.log('📊 Extracting reference data from spots data...');

    try {
      // Extract unique advertisers, brands, campaigns, buyers, and stations
      const advertisersMap = new Map();
      const brandsMap = new Map();
      const campaignsMap = new Map();
      const buyersMap = new Map();
      const stationsMap = new Map();

      spots.forEach(spot => {
        // Extract advertisers
        if (spot.advertiser_id && spot.advertiser_name) {
          advertisersMap.set(spot.advertiser_id, {
            id: spot.advertiser_id,
            name: spot.advertiser_name
          });
        }

        // Extract brands
        if (spot.brand_id && spot.brand_name && spot.advertiser_id && spot.advertiser_name) {
          brandsMap.set(spot.brand_id, {
            id: spot.brand_id,
            name: spot.brand_name,
            advertiser_id: spot.advertiser_id,
            advertiser_name: spot.advertiser_name
          });
        }

        // Extract campaigns
        if (spot.campaign_id && spot.campaign_name && spot.advertiser_id && spot.advertiser_name && spot.brand_id && spot.brand_name) {
          campaignsMap.set(spot.campaign_id, {
            id: spot.campaign_id,
            name: spot.campaign_name,
            advertiser_id: spot.advertiser_id,
            advertiser_name: spot.advertiser_name,
            brand_id: spot.brand_id,
            brand_name: spot.brand_name
          });
        }

        // Extract buyers
        if (spot.buyer_id && spot.buyer_name) {
          buyersMap.set(spot.buyer_id, {
            id: spot.buyer_id,
            name: spot.buyer_name
          });
        }

        // Extract stations
        if (spot.channel_id && spot.channel_name) {
          stationsMap.set(spot.channel_id, {
            id: spot.channel_id,
            name: spot.channel_name
          });
        }
      });

      const uniqueAdvertisers = Array.from(advertisersMap.values());
      const uniqueBrands = Array.from(brandsMap.values());
      const uniqueCampaigns = Array.from(campaignsMap.values());
      const uniqueBuyers = Array.from(buyersMap.values());
      const uniqueStations = Array.from(stationsMap.values());

      console.log(`Found ${uniqueAdvertisers.length} unique advertisers`);
      console.log(`Found ${uniqueBrands.length} unique brands`);
      console.log(`Found ${uniqueCampaigns.length} unique campaigns`);
      console.log(`Found ${uniqueBuyers.length} unique buyers`);
      console.log(`Found ${uniqueStations.length} unique stations`);

      // Insert advertisers first (since brands and campaigns reference them)
      if (uniqueAdvertisers.length > 0) {
        const { error: advertisersError } = await supabase
          .from('barb_advertisers')
          .upsert(uniqueAdvertisers, { onConflict: 'id' });

        if (advertisersError) {
          console.error('❌ Error inserting advertisers:', advertisersError);
        } else {
          console.log('✅ Advertisers populated');
        }
      }

      // Insert brands
      if (uniqueBrands.length > 0) {
        const { error: brandsError } = await supabase
          .from('barb_brands')
          .upsert(uniqueBrands, { onConflict: 'id' });

        if (brandsError) {
          console.error('❌ Error inserting brands:', brandsError);
        } else {
          console.log('✅ Brands populated');
        }
      }

      // Insert campaigns
      if (uniqueCampaigns.length > 0) {
        const { error: campaignsError } = await supabase
          .from('barb_campaigns')
          .upsert(uniqueCampaigns, { onConflict: 'id' });

        if (campaignsError) {
          console.error('❌ Error inserting campaigns:', campaignsError);
        } else {
          console.log('✅ Campaigns populated');
        }
      }

      // Insert buyers
      if (uniqueBuyers.length > 0) {
        const { error: buyersError } = await supabase
          .from('barb_buyers')
          .upsert(uniqueBuyers, { onConflict: 'id' });

        if (buyersError) {
          console.error('❌ Error inserting buyers:', buyersError);
        } else {
          console.log('✅ Buyers populated');
        }
      }

      // Insert stations
      if (uniqueStations.length > 0) {
        const { error: stationsError } = await supabase
          .from('barb_stations')
          .upsert(uniqueStations, { onConflict: 'id' });

        if (stationsError) {
          console.error('❌ Error inserting stations:', stationsError);
        } else {
          console.log('✅ Stations populated');
        }
      }

    } catch (error) {
      console.error('❌ Error extracting reference data:', error);
      throw error;
    }
  }

  // Main execution method
  async run(targetDate = null) {
    try {
      console.log('🚀 Starting BARB data population...');
      
      // Use yesterday if no date specified
      if (!targetDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        targetDate = yesterday.toISOString().split('T')[0];
      }

      console.log(`📅 Target date: ${targetDate}`);

      // Authenticate with BARB API
      await this.authenticate();

      // Verify database tables exist
      await this.verifyTables();

      // Populate reference data
      await this.populateReferenceData();

      // Populate spots data
      await this.populateSpotsData(targetDate);

      console.log('🎉 BARB data population completed successfully!');

    } catch (error) {
      console.error('💥 Fatal error during BARB data population:', error);
      process.exit(1);
    }
  }
}

// CLI execution
if (require.main === module) {
  const targetDate = process.argv[2]; // Optional date parameter (YYYY-MM-DD)
  
  const populator = new BARBDataPopulator();
  populator.run(targetDate);
}

module.exports = { BARBDataPopulator }; 