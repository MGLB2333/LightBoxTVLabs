const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBarbSpotsCount() {
  try {
    console.log('🔍 Checking barb_spots table...');
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('barb_spots')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error getting count:', countError);
      return;
    }
    
    console.log(`📊 Total records in barb_spots: ${count}`);
    
    // Get a sample of records to examine structure
    const { data: sampleData, error: sampleError } = await supabase
      .from('barb_spots')
      .select('*')
      .limit(5);
    
    if (sampleError) {
      console.error('❌ Error getting sample data:', sampleError);
      return;
    }
    
    console.log('\n📋 Sample records:');
    sampleData.forEach((record, index) => {
      console.log(`\nRecord ${index + 1}:`);
      console.log(`  ID: ${record.id}`);
      console.log(`  Date: ${record.date}`);
      console.log(`  Channel: ${record.channel_name}`);
      console.log(`  Advertiser: ${record.advertiser_name}`);
      console.log(`  Brand: ${record.brand_name}`);
      console.log(`  Campaign: ${record.campaign_name}`);
      console.log(`  Impacts: ${record.impacts}`);
    });
    
    // Check for duplicates based on key fields
    const { data: allData, error: allError } = await supabase
      .from('barb_spots')
      .select('id, date, channel_id, advertiser_id, brand_id, campaign_id, impacts');
    
    if (allError) {
      console.error('❌ Error getting all data for duplicate check:', allError);
      return;
    }
    
    // Check for exact duplicates
    const seen = new Set();
    const duplicates = [];
    
    allData.forEach(record => {
      const key = `${record.id}-${record.date}-${record.channel_id}-${record.advertiser_id}-${record.brand_id}-${record.campaign_id}-${record.impacts}`;
      if (seen.has(key)) {
        duplicates.push(record);
      } else {
        seen.add(key);
      }
    });
    
    console.log(`\n🔍 Duplicate analysis:`);
    console.log(`  Total records: ${allData.length}`);
    console.log(`  Unique records: ${seen.size}`);
    console.log(`  Duplicates found: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log('\n📋 Sample duplicates:');
      duplicates.slice(0, 3).forEach((dup, index) => {
        console.log(`  Duplicate ${index + 1}: ID ${dup.id}, Date ${dup.date}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkBarbSpotsCount(); 