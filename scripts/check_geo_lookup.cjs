const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODc1NjEsImV4cCI6MjA2Njk2MzU2MX0.4_iQjbkc73aAH3pISmlPPn_tKJHRlV7pkwA8yxMuXs8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGeoLookup() {
  console.log('=== Checking Geo_lookup Table ===\n');

  // 1. Check what's in Geo_lookup
  console.log('1. Checking Geo_lookup table...');
  const { data: geoLookupData, error: geoError } = await supabase
    .from('Geo_lookup')
    .select('"Postcode District", "Latitude", "Longitude"')
    .limit(20);

  if (geoError) {
    console.error('Error fetching Geo_lookup:', geoError);
    return;
  }

  console.log('Geo_lookup sample data:');
  geoLookupData?.forEach((item, index) => {
    console.log(`${index + 1}. "${item["Postcode District"]}" -> ${item["Latitude"]}, ${item["Longitude"]}`);
  });

  // 2. Check total count
  const { count, error: countError } = await supabase
    .from('Geo_lookup')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting Geo_lookup:', countError);
  } else {
    console.log(`\nTotal records in Geo_lookup: ${count}`);
  }

  // 3. Test with some districts we know we need
  console.log('\n3. Testing with districts we need...');
  const neededDistricts = ['L38', 'EC2N', 'LN1', 'BT1', 'EC4R', 'M60', 'L2', 'PH4', 'GY1', 'EC4N'];
  
  for (const district of neededDistricts) {
    const { data: match, error: matchError } = await supabase
      .from('Geo_lookup')
      .select('"Postcode District"')
      .eq('"Postcode District"', district);

    console.log(`District "${district}": ${match?.length > 0 ? 'FOUND' : 'NOT FOUND'}`);
  }
}

checkGeoLookup().catch(console.error); 