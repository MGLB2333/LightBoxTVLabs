const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkAllTables() {
  console.log('🔍 Checking all available tables in the database...\n');
  
  // List of potential table names to check
  const potentialTables = [
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
    'campaign_events',
    'Geo_lookup',
    'geo_lookup'
  ];
  
  for (const tableName of potentialTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table ${tableName}: ${error.message}`);
      } else {
        const rowCount = data ? data.length : 0;
        console.log(`✅ Table ${tableName}: ${rowCount} sample records`);
        
        if (rowCount > 0 && data[0]) {
          console.log(`   Structure: ${Object.keys(data[0]).join(', ')}`);
          
          // Check if this looks like Experian data
          const hasPostcodeSector = Object.keys(data[0]).some(key => 
            key.toLowerCase().includes('postcode') && key.toLowerCase().includes('sector')
          );
          const hasSegmentColumns = Object.keys(data[0]).some(key => 
            key.startsWith('S') && key.length > 5
          );
          
          if (hasPostcodeSector || hasSegmentColumns) {
            console.log(`   🎯 POTENTIAL EXPERIAN DATA FOUND!`);
            console.log(`   Sample data:`, JSON.stringify(data[0], null, 2));
          }
        }
      }
    } catch (err) {
      console.log(`❌ Table ${tableName}: ${err.message}`);
    }
  }
  
  // Also try to get a list of all tables via a different approach
  console.log('\n🔍 Trying alternative table discovery...');
  
  // Try to query information_schema
  try {
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_table_names');
    
    if (schemaError) {
      console.log('❌ Cannot get table list via RPC:', schemaError.message);
    } else {
      console.log('✅ Available tables via RPC:', schemaData);
    }
  } catch (err) {
    console.log('❌ RPC call failed:', err.message);
  }
  
  // Try a direct query to information_schema
  try {
    const { data: infoData, error: infoError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (infoError) {
      console.log('❌ Cannot query information_schema:', infoError.message);
    } else {
      console.log('✅ Tables from information_schema:', infoData?.map(t => t.table_name));
    }
  } catch (err) {
    console.log('❌ information_schema query failed:', err.message);
  }
}

checkAllTables().catch(console.error); 