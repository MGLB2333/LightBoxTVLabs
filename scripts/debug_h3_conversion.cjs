const { createClient } = require('@supabase/supabase-js');
const { latLngToCell, cellToBoundary } = require('h3-js');

const supabaseUrl = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODc1NjEsImV4cCI6MjA2Njk2MzU2MX0.4_iQjbkc73aAH3pISmlPPn_tKJHRlV7pkwA8yxMuXs8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugH3Conversion() {
  console.log('=== Testing H3 Conversion ===\n');

  // Test 1: Basic H3 conversion
  console.log('1. Testing basic H3 conversion...');
  try {
    const h3Index = latLngToCell(51.5074, -0.1278, 6); // London coordinates
    console.log('London H3 index (res 6):', h3Index);
    
    const boundary = cellToBoundary(h3Index, true);
    console.log('London H3 boundary (first 3 points):', boundary.slice(0, 3));
  } catch (error) {
    console.error('H3 conversion error:', error);
  }

  // Test 2: Get real data from your tables
  console.log('\n2. Testing with real data...');
  
  // Get some campaign events with geo data
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

  const uniquePostcodes = [...new Set(eventsData?.map(e => e.geo).filter(Boolean))];
  console.log('Sample postcodes:', uniquePostcodes);

  // Get coordinates for these postcodes
  const { data: geoLookupData, error: geoError } = await supabase
    .from('Geo_lookup')
    .select('"Postcode District", "Latitude", "Longitude"')
    .in('"Postcode District"', uniquePostcodes)
    .not('"Latitude"', 'is', null)
    .not('"Longitude"', 'is', null);

  if (geoError) {
    console.error('Error fetching geo lookup:', geoError);
    return;
  }

  console.log('Geo lookup matches:', geoLookupData?.length);

  // Test H3 conversion for each match
  geoLookupData?.forEach((item, index) => {
    try {
      const h3Index = latLngToCell(item.Latitude, item.Longitude, 6);
      const boundary = cellToBoundary(h3Index, true);
      
      console.log(`${index + 1}. Postcode: ${item["Postcode District"]}`);
      console.log(`   Lat: ${item.Latitude}, Lng: ${item.Longitude}`);
      console.log(`   H3 Index: ${h3Index}`);
      console.log(`   Boundary points: ${boundary.length}`);
      console.log(`   First boundary point: [${boundary[0][0]}, ${boundary[0][1]}]`);
      console.log('');
    } catch (error) {
      console.error(`Error converting ${item["Postcode District"]}:`, error);
    }
  });

  // Test 3: Check if coordinates are in UK bounds
  console.log('\n3. Checking UK bounds...');
  const ukBounds = {
    minLat: 49.9, maxLat: 60.9,
    minLng: -8.2, maxLng: 1.8
  };

  geoLookupData?.forEach((item) => {
    const inBounds = item.Latitude >= ukBounds.minLat && 
                    item.Latitude <= ukBounds.maxLat &&
                    item.Longitude >= ukBounds.minLng && 
                    item.Longitude <= ukBounds.maxLng;
    
    if (!inBounds) {
      console.log(`Postcode ${item["Postcode District"]} (${item.Latitude}, ${item.Longitude}) is OUTSIDE UK bounds`);
    }
  });
}

debugH3Conversion().catch(console.error); 