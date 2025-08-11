const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupTVRCache() {
  try {
    console.log('🔧 Setting up TVR cache table and functions...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_tvr_cache_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Error setting up TVR cache:', error);
      return;
    }
    
    console.log('✅ TVR cache table and functions created successfully');
    
    // Test the cache functions
    console.log('🧪 Testing cache functions...');
    
    // Test storing a cache entry
    const { error: storeError } = await supabase.rpc('store_tvr_cache', {
      p_cache_key: 'test_key',
      p_advertiser: 'Test Advertiser',
      p_brand: 'Test Brand',
      p_agency: 'Test Agency',
      p_date: '2025-01-01',
      p_buying_audience: 'All Adults',
      p_station: 'ITV',
      p_tvr: 10.5,
      p_impacts: 1000,
      p_spots_count: 5,
      p_total_duration: 150
    });
    
    if (storeError) {
      console.error('❌ Error testing store function:', storeError);
      return;
    }
    
    // Test retrieving the cache entry
    const { data: cachedData, error: getError } = await supabase.rpc('get_cached_tvr', {
      p_cache_key: 'test_key',
      p_max_age_minutes: 30
    });
    
    if (getError) {
      console.error('❌ Error testing get function:', getError);
      return;
    }
    
    console.log('✅ Cache test successful:', cachedData);
    
    // Clean up test data
    await supabase.from('tvr_cache').delete().eq('cache_key', 'test_key');
    
    console.log('🎉 TVR cache setup complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

setupTVRCache();

