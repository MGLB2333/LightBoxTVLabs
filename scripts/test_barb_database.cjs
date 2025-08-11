const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testDatabase() {
  console.log('🔍 Testing BARB database connection...\n');

  try {
    // Test advertisers table
    console.log('📋 Testing advertisers table...');
    const { data: advertisers, error: advError } = await supabase
      .from('barb_advertisers')
      .select('*')
      .limit(5);

    if (advError) {
      console.error('❌ Error fetching advertisers:', advError);
    } else {
      console.log(`✅ Found ${advertisers?.length || 0} advertisers`);
      if (advertisers && advertisers.length > 0) {
        console.log('📝 Sample advertiser:', advertisers[0]);
      }
    }

    // Test stations table
    console.log('\n📋 Testing stations table...');
    const { data: stations, error: staError } = await supabase
      .from('barb_stations')
      .select('*')
      .limit(5);

    if (staError) {
      console.error('❌ Error fetching stations:', staError);
    } else {
      console.log(`✅ Found ${stations?.length || 0} stations`);
      if (stations && stations.length > 0) {
        console.log('📝 Sample station:', stations[0]);
      }
    }

    // Test buyers table
    console.log('\n📋 Testing buyers table...');
    const { data: buyers, error: buyError } = await supabase
      .from('barb_buyers')
      .select('*')
      .limit(5);

    if (buyError) {
      console.error('❌ Error fetching buyers:', buyError);
    } else {
      console.log(`✅ Found ${buyers?.length || 0} buyers`);
      if (buyers && buyers.length > 0) {
        console.log('📝 Sample buyer:', buyers[0]);
      }
    }

    // Test campaigns table
    console.log('\n📋 Testing campaigns table...');
    const { data: campaigns, error: camError } = await supabase
      .from('barb_campaigns')
      .select('*')
      .limit(5);

    if (camError) {
      console.error('❌ Error fetching campaigns:', camError);
    } else {
      console.log(`✅ Found ${campaigns?.length || 0} campaigns`);
      if (campaigns && campaigns.length > 0) {
        console.log('📝 Sample campaign:', campaigns[0]);
      }
    }

    // Test spots table
    console.log('\n📋 Testing spots table...');
    const { data: spots, error: spotError } = await supabase
      .from('barb_spots')
      .select('*')
      .limit(5);

    if (spotError) {
      console.error('❌ Error fetching spots:', spotError);
    } else {
      console.log(`✅ Found ${spots?.length || 0} spots`);
      if (spots && spots.length > 0) {
        console.log('📝 Sample spot:', {
          id: spots[0].id,
          date: spots[0].date,
          channel_name: spots[0].channel_name,
          advertiser_name: spots[0].advertiser_name,
          brand_name: spots[0].brand_name
        });
      }
    }

    console.log('\n🎉 Database test completed!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabase(); 