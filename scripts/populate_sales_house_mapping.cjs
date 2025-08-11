// Script to populate sales house and station mapping from BARB API
// Run with: node scripts/populate_sales_house_mapping.cjs

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

class SalesHouseMappingPopulator {
  constructor() {
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    this.baseUrl = 'https://barb-api.co.uk/api/v1';
    this.accessToken = null;
    this.refreshToken = null;
  }

  // Authenticate with BARB API
  async authenticate() {
    try {
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
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access;
      this.refreshToken = data.refresh;
      
      console.log('✅ BARB API authentication successful');
    } catch (error) {
      console.error('❌ Authentication error:', error);
      throw error;
    }
  }

  // Make API request with authentication
  async apiRequest(endpoint, params = {}) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value.toString());
      }
    });

    console.log(`🌐 Making BARB API request to: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`BARB API request failed: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // Get all data with pagination
  async getAllData(endpoint, params = {}) {
    let allResults = [];
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      console.log(`📄 Fetching page ${page} from BARB API ${endpoint}...`);
      
      try {
        const response = await this.apiRequest(endpoint, { 
          ...params, 
          page, 
          page_size: 100 
        });
        
        if (response.results && Array.isArray(response.results)) {
          allResults = allResults.concat(response.results);
          hasNext = !!response.next;
        } else if (response.events && Array.isArray(response.events)) {
          allResults = allResults.concat(response.events);
          hasNext = !!response.next;
        } else if (Array.isArray(response)) {
          allResults = allResults.concat(response);
          hasNext = false;
        } else {
          console.log(`⚠️ Unexpected response format for ${endpoint}:`, response);
          hasNext = false;
        }
        
        page++;
        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
      } catch (error) {
        console.error(`❌ Error fetching page ${page} from ${endpoint}:`, error);
        hasNext = false;
      }
    }

    console.log(`📊 BARB API getAllData returning ${allResults.length} total results for ${endpoint}`);
    return allResults;
  }

  // Get advertising spots to extract sales house and station relationships
  async getAdvertisingSpots(dateRange = {}) {
    console.log('🎯 Getting advertising spots from BARB API...');
    
    try {
      // Use a date range to get comprehensive data
      const params = {
        min_transmission_date: dateRange.start || '2025-01-01',
        max_transmission_date: dateRange.end || '2025-01-31'
      };
      
      const spots = await this.getAllData('/advertising_spots/', params);
      console.log(`✅ Retrieved ${spots.length} advertising spots from BARB API`);
      return spots;
    } catch (error) {
      console.error('❌ Error getting advertising spots:', error);
      throw error;
    }
  }

  // Get all stations from BARB API
  async getStations() {
    console.log('📺 Getting stations from BARB API...');
    
    try {
      const stations = await this.getAllData('/stations/');
      console.log(`✅ Retrieved ${stations.length} stations from BARB API`);
      return stations;
    } catch (error) {
      console.error('❌ Error getting stations:', error);
      throw error;
    }
  }

  // Extract sales house to station relationships from spots
  extractSalesHouseStationMapping(spots) {
    console.log('🔍 Extracting sales house to station relationships...');
    
    const salesHouseToStations = new Map();
    const salesHouseDetails = new Map();
    
    spots.forEach(spot => {
      if (spot.sales_house?.sales_house_name && spot.station?.station_name) {
        const salesHouseName = spot.sales_house.sales_house_name;
        const stationName = spot.station.station_name;
        const stationCode = spot.station.station_code;
        
        // Store sales house details
        if (!salesHouseDetails.has(salesHouseName)) {
          salesHouseDetails.set(salesHouseName, {
            sales_house_name: salesHouseName,
            sales_house_code: spot.sales_house.sales_house_code,
            description: spot.sales_house.sales_house_brand_description || `${salesHouseName} Sales House`
          });
        }
        
        // Store station relationships
        if (!salesHouseToStations.has(salesHouseName)) {
          salesHouseToStations.set(salesHouseName, new Set());
        }
        
        salesHouseToStations.get(salesHouseName).add(JSON.stringify({
          station_code: stationCode,
          station_name: stationName
        }));
      }
    });
    
    console.log(`✅ Extracted ${salesHouseDetails.size} sales houses with station relationships`);
    return { salesHouseDetails, salesHouseToStations };
  }

  // Populate sales houses table
  async populateSalesHouses(salesHouseDetails) {
    console.log('🏢 Populating sales houses table...');
    
    try {
      const salesHouses = Array.from(salesHouseDetails.values());
      
      const { error } = await this.supabase
        .from('barb_sales_houses')
        .upsert(salesHouses, { 
          onConflict: 'sales_house_name',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('❌ Error inserting sales houses:', error);
        throw error;
      }
      
      console.log(`✅ Inserted/updated ${salesHouses.length} sales houses`);
      return salesHouses;
    } catch (error) {
      console.error('❌ Error populating sales houses:', error);
      throw error;
    }
  }

  // Populate sales house to station mappings
  async populateSalesHouseStations(salesHouseToStations) {
    console.log('📺 Populating sales house to station mappings...');
    
    try {
      let totalInserted = 0;
      
      for (const [salesHouseName, stationsSet] of salesHouseToStations) {
        // Get sales house ID
        const { data: salesHouse, error: shError } = await this.supabase
          .from('barb_sales_houses')
          .select('id')
          .eq('sales_house_name', salesHouseName)
          .single();
        
        if (shError || !salesHouse) {
          console.error(`❌ Could not find sales house: ${salesHouseName}`);
          continue;
        }
        
        // Convert stations set to array
        const stations = Array.from(stationsSet).map(s => JSON.parse(s));
        
        // Prepare station mappings
        const stationMappings = stations.map(station => ({
          sales_house_id: salesHouse.id,
          station_code: station.station_code,
          station_name: station.station_name
        }));
        
        // Insert station mappings
        const { error } = await this.supabase
          .from('barb_sales_house_stations')
          .upsert(stationMappings, { 
            onConflict: 'sales_house_id,station_code',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.error(`❌ Error inserting stations for ${salesHouseName}:`, error);
        } else {
          console.log(`✅ Inserted/updated ${stations.length} stations for ${salesHouseName}`);
          totalInserted += stations.length;
        }
      }
      
      console.log(`✅ Total stations inserted/updated: ${totalInserted}`);
    } catch (error) {
      console.error('❌ Error populating sales house stations:', error);
      throw error;
    }
  }

  // Main population function
  async populateMapping() {
    try {
      console.log('🚀 Starting sales house and station mapping population...');
      
      // Get comprehensive spot data from multiple date ranges
      const dateRanges = [
        { start: '2025-01-01', end: '2025-01-31' },
        { start: '2025-02-01', end: '2025-02-28' },
        { start: '2025-03-01', end: '2025-03-31' },
        { start: '2024-12-01', end: '2024-12-31' }
      ];
      
      let allSpots = [];
      
      for (const dateRange of dateRanges) {
        try {
          console.log(`📅 Fetching spots for ${dateRange.start} to ${dateRange.end}...`);
          const spots = await this.getAdvertisingSpots(dateRange);
          allSpots.push(...spots);
        } catch (error) {
          console.log(`⚠️ Warning: Could not fetch spots for ${dateRange.start}-${dateRange.end}:`, error.message);
        }
      }
      
      console.log(`📊 Total spots collected: ${allSpots.length}`);
      
      if (allSpots.length === 0) {
        console.log('❌ No spots found. Cannot populate mapping.');
        return;
      }
      
      // Extract relationships
      const { salesHouseDetails, salesHouseToStations } = this.extractSalesHouseStationMapping(allSpots);
      
      // Populate database
      await this.populateSalesHouses(salesHouseDetails);
      await this.populateSalesHouseStations(salesHouseToStations);
      
      // Show summary
      console.log('\n📋 Population Summary:');
      console.log(`🏢 Sales Houses: ${salesHouseDetails.size}`);
      
      for (const [salesHouseName, stationsSet] of salesHouseToStations) {
        console.log(`  ${salesHouseName}: ${stationsSet.size} stations`);
      }
      
      console.log('\n✅ Sales house and station mapping population completed!');
      
    } catch (error) {
      console.error('❌ Error during population:', error);
      throw error;
    }
  }

  // Function to show current mapping
  async showCurrentMapping() {
    try {
      console.log('📋 Current sales house and station mapping:');
      
      const { data: mapping, error } = await this.supabase
        .from('barb_sales_house_station_mapping')
        .select('*')
        .order('sales_house_name, station_name');
      
      if (error) {
        console.error('❌ Error fetching mapping:', error);
        return;
      }
      
      if (!mapping || mapping.length === 0) {
        console.log('No mapping data found.');
        return;
      }
      
      const grouped = mapping.reduce((acc, item) => {
        if (!acc[item.sales_house_name]) {
          acc[item.sales_house_name] = [];
        }
        acc[item.sales_house_name].push(item.station_name);
        return acc;
      }, {});
      
      for (const [salesHouse, stations] of Object.entries(grouped)) {
        console.log(`\n🏢 ${salesHouse} (${stations.length} stations):`);
        stations.forEach(station => console.log(`  📺 ${station}`));
      }
      
    } catch (error) {
      console.error('❌ Error showing mapping:', error);
    }
  }
}

// Main execution
async function main() {
  const populator = new SalesHouseMappingPopulator();
  
  try {
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--show')) {
      await populator.showCurrentMapping();
    } else {
      await populator.populateMapping();
      console.log('\n💡 Run with --show to view the current mapping');
    }
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main(); 