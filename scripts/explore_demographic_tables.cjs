const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function exploreDemographicTables() {
  console.log('🔍 Exploring demographic and audience-related tables...\n');
  
  // List of possible table names to check
  const possibleTables = [
    'experian_data',
    'experian_taxonomy', 
    'experian_segments',
    'experian',
    'demographics',
    'demographic_data',
    'postcode_data',
    'postcode_demographics',
    'geo_data',
    'geographic_data',
    'audience_data',
    'audience_segments',
    'postcode_audience',
    'postcode_segments',
    'area_demographics',
    'region_demographics',
    'uk_demographics',
    'population_data',
    'household_data',
    'income_data',
    'lifestyle_data',
    'consumer_data',
    'market_data',
    'segment_data',
    'profile_data',
    'census_data',
    'postcode_census',
    'area_profiles',
    'demographic_profiles',
    'audience_profiles'
  ];

  for (const tableName of possibleTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('does not exist')) {
          // Table doesn't exist, skip
          continue;
        } else {
          console.log(`❌ Error checking ${tableName}:`, error.message);
        }
      } else {
        console.log(`✅ Table ${tableName} exists with ${data?.length || 0} sample records`);
        
        // Get column structure
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!sampleError && sampleData && sampleData.length > 0) {
          const columns = Object.keys(sampleData[0]);
          console.log(`   Columns: ${columns.join(', ')}`);
          
          // Show sample data
          console.log(`   Sample data:`, JSON.stringify(sampleData[0], null, 2));
        }
      }
    } catch (err) {
      // Table doesn't exist or other error
      continue;
    }
  }

  // Also check for any tables with 'experian' in the name
  console.log('\n🔍 Checking for tables with "experian" in the name...');
  try {
    const { data: tables, error } = await supabase
      .rpc('get_table_names')
      .like('experian%');
    
    if (!error && tables) {
      console.log('Tables with experian:', tables);
    }
  } catch (err) {
    console.log('Could not query table names via RPC');
  }

  // Check what's in the existing tables
  console.log('\n📊 Checking existing tables for demographic data...');
  
  // Check experian_data
  try {
    const { count: experianCount, error: experianError } = await supabase
      .from('experian_data')
      .select('*', { count: 'exact', head: true });
    
    if (!experianError) {
      console.log(`✅ experian_data table has ${experianCount} total records`);
      
      if (experianCount > 0) {
        const { data: experianSample, error: sampleError } = await supabase
          .from('experian_data')
          .select('*')
          .limit(1);
        
        if (!sampleError && experianSample && experianSample.length > 0) {
          console.log('   Sample experian_data:', JSON.stringify(experianSample[0], null, 2));
        }
      }
    }
  } catch (err) {
    console.log('❌ Error checking experian_data:', err.message);
  }

  // Check experian_taxonomy
  try {
    const { count: taxonomyCount, error: taxonomyError } = await supabase
      .from('experian_taxonomy')
      .select('*', { count: 'exact', head: true });
    
    if (!taxonomyError) {
      console.log(`✅ experian_taxonomy table has ${taxonomyCount} total records`);
      
      if (taxonomyCount > 0) {
        const { data: taxonomySample, error: sampleError } = await supabase
          .from('experian_taxonomy')
          .select('*')
          .limit(1);
        
        if (!sampleError && taxonomySample && taxonomySample.length > 0) {
          console.log('   Sample experian_taxonomy:', JSON.stringify(taxonomySample[0], null, 2));
        }
      }
    }
  } catch (err) {
    console.log('❌ Error checking experian_taxonomy:', err.message);
  }

  // Check Geo_lookup for demographic info
  try {
    const { count: geoCount, error: geoError } = await supabase
      .from('Geo_lookup')
      .select('*', { count: 'exact', head: true });
    
    if (!geoError) {
      console.log(`✅ Geo_lookup table has ${geoCount} total records`);
      
      if (geoCount > 0) {
        const { data: geoSample, error: sampleError } = await supabase
          .from('Geo_lookup')
          .select('*')
          .limit(1);
        
        if (!sampleError && geoSample && geoSample.length > 0) {
          console.log('   Sample Geo_lookup:', JSON.stringify(geoSample[0], null, 2));
        }
      }
    }
  } catch (err) {
    console.log('❌ Error checking Geo_lookup:', err.message);
  }
}

exploreDemographicTables().catch(console.error); 