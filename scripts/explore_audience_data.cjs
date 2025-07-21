const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function exploreData() {
  console.log('🔍 Exploring data structure for audience analysis...\n');
  
  // Check campaign_events structure
  console.log('1. Campaign Events Structure:');
  const { data: eventsSample, error: eventsError } = await supabase
    .from('campaign_events')
    .select('*')
    .limit(3);
  
  if (eventsError) {
    console.error('Error:', eventsError);
  } else {
    console.log('Sample campaign_events:', JSON.stringify(eventsSample, null, 2));
  }
  
  // Check geo field distribution
  console.log('\n2. Campaign Events Geo Distribution:');
  const { data: geoFields, error: geoError } = await supabase
    .from('campaign_events')
    .select('geo')
    .not('geo', 'is', null)
    .limit(1000);
  
  if (geoError) {
    console.error('Error:', geoError);
  } else {
    const uniqueGeos = new Set(geoFields.map(g => g.geo));
    console.log(`Unique geo codes in campaign_events: ${uniqueGeos.size}`);
    console.log('Sample geo codes:', Array.from(uniqueGeos).slice(0, 20));
  }
  
  // Check what tables exist
  console.log('\n3. Checking for Experian and related tables:');
  const tablesToCheck = ['experian_data', 'experian_segments', 'geo_lookup', 'postcode_lookup', 'demographics'];
  
  for (const tableName of tablesToCheck) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Table ${tableName}: ${error.message}`);
    } else {
      console.log(`✅ Table ${tableName} exists with ${data.length} sample records`);
      if (data.length > 0) {
        console.log(`   Sample structure:`, Object.keys(data[0]));
      }
    }
  }
  
  // Check for any tables with 'experian' in the name
  console.log('\n4. Searching for Experian-related tables:');
  const { data: allTables, error: tablesError } = await supabase
    .rpc('get_table_names');
  
  if (tablesError) {
    console.log('Cannot get table list via RPC, trying alternative...');
    // Try to query a known table to see what's available
    const { data: testData, error: testError } = await supabase
      .from('campaign_events')
      .select('count')
      .limit(1);
    
    if (!testError) {
      console.log('✅ campaign_events table accessible');
    }
  } else {
    console.log('Available tables:', allTables);
  }
  
  // Check if there's a geo_lookup table
  console.log('\n5. Checking geo_lookup table:');
  const { data: geoLookup, error: geoLookupError } = await supabase
    .from('geo_lookup')
    .select('*')
    .limit(5);
  
  if (geoLookupError) {
    console.log('❌ geo_lookup table error:', geoLookupError.message);
  } else {
    console.log('✅ geo_lookup table exists');
    console.log('Sample geo_lookup data:', JSON.stringify(geoLookup, null, 2));
  }
  
  // Check experian_data table structure
  console.log('\n6. Exploring experian_data table structure:');
  const { data: experianStructure, error: experianStructureError } = await supabase
    .from('experian_data')
    .select('*')
    .limit(1);
  
  if (experianStructureError) {
    console.log('❌ experian_data error:', experianStructureError.message);
  } else {
    console.log('✅ experian_data table structure:', experianStructure.length > 0 ? Object.keys(experianStructure[0]) : 'Empty table');
  }
  
  // Check if we can create a geo mapping from the campaign_events data
  console.log('\n7. Analyzing geo codes for mapping:');
  const { data: geoAnalysis, error: geoAnalysisError } = await supabase
    .from('campaign_events')
    .select('geo, event_type')
    .not('geo', 'is', null)
    .limit(1000);
  
  if (geoAnalysisError) {
    console.log('❌ geo analysis error:', geoAnalysisError.message);
  } else {
    const geoCounts = {};
    geoAnalysis.forEach(event => {
      geoCounts[event.geo] = (geoCounts[event.geo] || 0) + 1;
    });
    
    console.log(`Analyzed ${Object.keys(geoCounts).length} unique geo codes`);
    console.log('Top 10 geo codes by event count:', 
      Object.entries(geoCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([geo, count]) => `${geo}: ${count}`)
    );
  }
  
  // Check for any other relevant tables
  console.log('\n8. Checking for other potential mapping tables:');
  const potentialTables = ['postcodes', 'postcode_data', 'geo_mapping', 'location_data'];
  
  for (const tableName of potentialTables) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Table ${tableName}: ${error.message}`);
    } else {
      console.log(`✅ Table ${tableName} exists`);
      if (data.length > 0) {
        console.log(`   Structure:`, Object.keys(data[0]));
      }
    }
  }
  
  // Check experian_taxonomy table (used in Audience Builder)
  console.log('\n9. Checking experian_taxonomy table:');
  const { data: taxonomyData, error: taxonomyError } = await supabase
    .from('experian_taxonomy')
    .select('*')
    .limit(5);
  
  if (taxonomyError) {
    console.log('❌ experian_taxonomy error:', taxonomyError.message);
  } else {
    console.log('✅ experian_taxonomy table exists');
    console.log('Sample taxonomy data:', JSON.stringify(taxonomyData, null, 2));
  }
  
  // Check Geo_lookup table (used in Audience Builder)
  console.log('\n10. Checking Geo_lookup table:');
  const { data: geoLookupData, error: geoLookupDataError } = await supabase
    .from('Geo_lookup')
    .select('*')
    .limit(5);
  
  if (geoLookupDataError) {
    console.log('❌ Geo_lookup error:', geoLookupDataError.message);
  } else {
    console.log('✅ Geo_lookup table exists');
    console.log('Sample Geo_lookup data:', JSON.stringify(geoLookupData, null, 2));
  }
  
  // Check if there's a mapping between campaign_events geo codes and postcodes
  console.log('\n11. Analyzing geo code to postcode mapping:');
  const { data: geoMapping, error: geoMappingError } = await supabase
    .from('campaign_events')
    .select('geo')
    .not('geo', 'is', null)
    .limit(1000);
  
  if (geoMappingError) {
    console.log('❌ geo mapping error:', geoMappingError.message);
  } else {
    const uniqueGeos = new Set(geoMapping.map(g => g.geo));
    console.log(`Found ${uniqueGeos.size} unique geo codes in campaign_events`);
    
    // Check if any of these geo codes match postcode districts in Geo_lookup
    const geoArray = Array.from(uniqueGeos).slice(0, 20); // Check first 20
    
    const { data: geoMatch, error: geoMatchError } = await supabase
      .from('Geo_lookup')
      .select('"Postcode District"')
      .in('"Postcode District"', geoArray);
    
    if (geoMatchError) {
      console.log('❌ geo match error:', geoMatchError.message);
    } else {
      const matchingDistricts = geoMatch.map(g => g['Postcode District']);
      console.log(`Geo codes that match postcode districts: ${matchingDistricts.length}`);
      console.log('Matching districts:', matchingDistricts);
    }
  }
}

exploreData().catch(console.error); 