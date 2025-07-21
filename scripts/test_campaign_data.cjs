const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODc1NjEsImV4cCI6MjA2Njk2MzU2MX0.4_iQjbkc73aAH3pISmlPPn_tKJHRlV7pkwA8yxMuXs8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCampaignData() {
  console.log('=== Testing Campaign Events Data ===\n');

  // 1. Check if we can access campaign_events
  console.log('1. Checking campaign_events table...');
  const { data: eventsData, error: eventsError } = await supabase
    .from('campaign_events')
    .select('geo')
    .not('geo', 'is', null)
    .neq('geo', '')
    .limit(20);

  if (eventsError) {
    console.error('Error accessing campaign_events:', eventsError);
    return;
  }

  console.log('Campaign events found:', eventsData?.length);
  console.log('Sample geo values:', eventsData?.map(e => e.geo));

  // 2. Get unique postcodes from campaign_events
  const uniquePostcodes = [...new Set(eventsData?.map(e => e.geo).filter(Boolean))];
  console.log('\n2. Unique postcodes from campaign_events:', uniquePostcodes);

  // 3. Check if these postcodes exist in Geo_lookup
  console.log('\n3. Checking Geo_lookup for these postcodes...');
  const { data: geoLookupData, error: geoError } = await supabase
    .from('Geo_lookup')
    .select('"Postcode District", "Latitude", "Longitude"')
    .in('"Postcode District"', uniquePostcodes);

  if (geoError) {
    console.error('Error accessing Geo_lookup:', geoError);
    return;
  }

  console.log('Geo_lookup matches found:', geoLookupData?.length);
  if (geoLookupData && geoLookupData.length > 0) {
    console.log('Matched postcodes:', geoLookupData.map(g => g["Postcode District"]));
  } else {
    console.log('NO MATCHES FOUND!');
    
    // 4. Let's check what postcodes are actually in Geo_lookup
    console.log('\n4. Checking what postcodes are in Geo_lookup...');
    const { data: allGeoLookup, error: allGeoError } = await supabase
      .from('Geo_lookup')
      .select('"Postcode District"')
      .limit(20);

    if (allGeoError) {
      console.error('Error fetching all Geo_lookup:', allGeoError);
    } else {
      console.log('Sample Geo_lookup postcodes:', allGeoLookup?.map(g => g["Postcode District"]));
    }
  }

  // 5. Test with a specific postcode that we know exists
  console.log('\n5. Testing with a known postcode...');
  const { data: testData, error: testError } = await supabase
    .from('Geo_lookup')
    .select('"Postcode District", "Latitude", "Longitude"')
    .eq('"Postcode District"', 'AB1')
    .limit(1);

  if (testError) {
    console.error('Error testing known postcode:', testError);
  } else {
    console.log('Test with AB1:', testData);
  }
}

testCampaignData().catch(console.error); 