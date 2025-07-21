const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODc1NjEsImV4cCI6MjA2Njk2MzU2MX0.4_iQjbkc73aAH3pISmlPPn_tKJHRlV7pkwA8yxMuXs8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugMapData() {
  console.log('=== Debugging Map Data ===\n');

  // 1. Check Geo_lookup table
  console.log('1. Checking Geo_lookup table...');
  const { data: geoLookupData, error: geoError } = await supabase
    .from('Geo_lookup')
    .select('"Postcode District", "Latitude", "Longitude"')
    .not('"Latitude"', 'is', null)
    .not('"Longitude"', 'is', null)
    .limit(5);

  if (geoError) {
    console.error('Error fetching geo lookup:', geoError);
    return;
  }

  console.log('Geo lookup sample:', geoLookupData);
  console.log('Geo lookup count:', geoLookupData?.length);

  // 2. Check campaign_events with geo data
  console.log('\n2. Checking campaign_events with geo data...');
  const { data: eventsData, error: eventsError } = await supabase
    .from('campaign_events')
    .select('geo')
    .not('geo', 'is', null)
    .neq('geo', '')
    .limit(10);

  if (eventsError) {
    console.error('Error fetching events:', eventsError);
    return;
  }

  console.log('Events sample:', eventsData);
  console.log('Events count:', eventsData?.length);

  // 3. Test the join manually
  console.log('\n3. Testing manual join...');
  const samplePostcodes = eventsData?.slice(0, 5).map(e => e.geo) || [];
  console.log('Sample postcodes from events:', samplePostcodes);

  if (samplePostcodes.length > 0) {
    const { data: joinedData, error: joinError } = await supabase
      .from('Geo_lookup')
      .select('"Postcode District", "Latitude", "Longitude"')
      .in('"Postcode District"', samplePostcodes);

    if (joinError) {
      console.error('Error joining data:', joinError);
    } else {
      console.log('Joined data:', joinedData);
      console.log('Matched postcodes:', joinedData?.length);
    }
  }

  // 4. Test H3 conversion
  console.log('\n4. Testing H3 conversion...');
  if (joinedData && joinedData.length > 0) {
    const { latLngToCell } = require('h3-js');
    
    joinedData.forEach((item, index) => {
      try {
        const h3Index = latLngToCell(item.Latitude, item.Longitude, 6);
        console.log(`${index + 1}. Postcode: ${item["Postcode District"]}, Lat: ${item.Latitude}, Lng: ${item.Longitude}, H3: ${h3Index}`);
      } catch (err) {
        console.error(`Error converting to H3: ${item["Postcode District"]}`, err);
      }
    });
  }
}

debugMapData().catch(console.error); 