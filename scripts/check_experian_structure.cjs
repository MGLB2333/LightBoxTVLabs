const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkExperianStructure() {
  console.log('🔍 Checking Experian table structure...\n');
  
  // Try to get a single record to see the structure
  console.log('1. Trying to get structure from experian_data...');
  try {
    const { data, error } = await supabase
      .from('experian_data')
      .select('*')
      .limit(1);
    
    console.log('Result:', { data: data?.length || 0, error: error?.message });
    
    if (data && data.length > 0) {
      console.log('Columns found:', Object.keys(data[0]));
      console.log('Sample data:', JSON.stringify(data[0], null, 2));
    } else {
      // Try to insert a test record to see the structure
      console.log('No data found, trying to understand structure...');
      
      // Try different column combinations
      const columnTests = [
        ['postcode'],
        ['postcode', 'segment'],
        ['postcode', 'segment_name'],
        ['postcode', 'value'],
        ['postcode', 'segment_name', 'value'],
        ['postcode_district'],
        ['postcode_sector'],
        ['segment'],
        ['segment_name'],
        ['value'],
        ['id'],
        ['uuid'],
        ['created_at'],
        ['updated_at']
      ];
      
      for (const columns of columnTests) {
        try {
          const { data: testData, error: testError } = await supabase
            .from('experian_data')
            .select(columns.join(', '))
            .limit(1);
          
          if (!testError && testData) {
            console.log(`✅ Found columns: ${columns.join(', ')}`);
            if (testData.length > 0) {
              console.log('Sample with these columns:', JSON.stringify(testData[0], null, 2));
            }
          } else if (testError && !testError.message.includes('does not exist')) {
            console.log(`❌ Columns ${columns.join(', ')} failed:`, testError.message);
          }
        } catch (err) {
          // Column doesn't exist
        }
      }
    }
  } catch (err) {
    console.error('Error checking experian_data structure:', err);
  }
  
  // Check experian_taxonomy structure
  console.log('\n2. Checking experian_taxonomy structure...');
  try {
    const { data, error } = await supabase
      .from('experian_taxonomy')
      .select('*')
      .limit(1);
    
    console.log('Result:', { data: data?.length || 0, error: error?.message });
    
    if (data && data.length > 0) {
      console.log('Columns found:', Object.keys(data[0]));
      console.log('Sample data:', JSON.stringify(data[0], null, 2));
    } else {
      // Try different column combinations for taxonomy
      const taxonomyColumnTests = [
        ['segment'],
        ['segment_name'],
        ['category'],
        ['description'],
        ['value'],
        ['id'],
        ['name'],
        ['type']
      ];
      
      for (const columns of taxonomyColumnTests) {
        try {
          const { data: testData, error: testError } = await supabase
            .from('experian_taxonomy')
            .select(columns.join(', '))
            .limit(1);
          
          if (!testError && testData) {
            console.log(`✅ Found taxonomy columns: ${columns.join(', ')}`);
            if (testData.length > 0) {
              console.log('Sample with these columns:', JSON.stringify(testData[0], null, 2));
            }
          } else if (testError && !testError.message.includes('does not exist')) {
            console.log(`❌ Taxonomy columns ${columns.join(', ')} failed:`, testError.message);
          }
        } catch (err) {
          // Column doesn't exist
        }
      }
    }
  } catch (err) {
    console.error('Error checking experian_taxonomy structure:', err);
  }
  
  // Check if there are any other tables with similar names
  console.log('\n3. Checking for similar table names...');
  const similarNames = [
    'experian',
    'experian_segments',
    'experianSegments',
    'experian_data_2024',
    'experian_data_2023',
    'experian_segments_2024',
    'experian_segments_2023',
    'demographics',
    'demographic_data',
    'postcode_demographics',
    'postcode_segments',
    'audience_data',
    'audience_segments'
  ];
  
  for (const tableName of similarNames) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (!error && data) {
        console.log(`✅ Found table ${tableName} with ${data.length} records`);
        if (data.length > 0) {
          console.log('Columns:', Object.keys(data[0]));
          console.log('Sample:', JSON.stringify(data[0], null, 2));
        }
      }
    } catch (err) {
      // Table doesn't exist
    }
  }
  
  // Try to check if there's a different schema
  console.log('\n4. Checking for different schemas...');
  try {
    // Try to access with schema prefix
    const { data, error } = await supabase
      .from('public.experian_data')
      .select('*')
      .limit(1);
    
    console.log('Schema-prefixed result:', { data: data?.length || 0, error: error?.message });
  } catch (err) {
    console.log('Schema prefix not supported');
  }
}

checkExperianStructure().catch(console.error); 