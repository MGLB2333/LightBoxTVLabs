const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODc1NjEsImV4cCI6MjA2Njk2MzU2MX0.4_iQjbkc73aAH3pISmlPPn_tKJHRlV7pkwA8yxMuXs8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPostcodeMismatch() {
  console.log('=== Debugging Postcode Format Mismatch ===\n');

  // 1. Check experian_data table structure and sample data
  console.log('1. Checking experian_data table...');
  const { data: experianSample, error: experianError } = await supabase
    .from('experian_data')
    .select('"Postcode sector"')
    .limit(10);

  if (experianError) {
    console.error('Error fetching experian_data:', experianError);
    return;
  }

  console.log('Sample experian_data postcodes:');
  experianSample?.forEach((item, index) => {
    console.log(`${index + 1}. "${item['Postcode sector']}"`);
  });

  // 2. Check Geo_lookup table structure and sample data
  console.log('\n2. Checking Geo_lookup table...');
  const { data: geoLookupSample, error: geoError } = await supabase
    .from('Geo_lookup')
    .select('postcode_district')
    .limit(10);

  if (geoError) {
    console.error('Error fetching Geo_lookup:', geoError);
    return;
  }

  console.log('Sample Geo_lookup postcodes:');
  geoLookupSample?.forEach((item, index) => {
    console.log(`${index + 1}. "${item.postcode_district}"`);
  });

  // 3. Test the conversion from postcode sector to district
  console.log('\n3. Testing postcode sector to district conversion...');
  if (experianSample && experianSample.length > 0) {
    const sampleSector = experianSample[0]['Postcode sector'];
    console.log(`Sample sector: "${sampleSector}"`);
    
    // Extract district from sector (e.g., "BD10 1" -> "BD10")
    const district = sampleSector.split(' ')[0];
    console.log(`Extracted district: "${district}"`);
    
    // Check if this district exists in Geo_lookup
    const { data: districtCheck, error: checkError } = await supabase
      .from('Geo_lookup')
      .select('postcode_district, latitude, longitude')
      .eq('postcode_district', district);

    if (checkError) {
      console.error('Error checking district:', checkError);
    } else {
      console.log(`District "${district}" found in Geo_lookup:`, districtCheck?.length > 0);
      if (districtCheck && districtCheck.length > 0) {
        console.log('Coordinates:', districtCheck[0]);
      }
    }
  }

  // 4. Test with multiple sectors
  console.log('\n4. Testing multiple sectors...');
  const testSectors = experianSample?.slice(0, 5).map(item => item['Postcode sector']) || [];
  
  for (const sector of testSectors) {
    const district = sector.split(' ')[0];
    const { data: match, error: matchError } = await supabase
      .from('Geo_lookup')
      .select('postcode_district')
      .eq('postcode_district', district);

    console.log(`Sector: "${sector}" -> District: "${district}" -> Found: ${match?.length > 0}`);
  }
}

debugPostcodeMismatch().catch(console.error); 