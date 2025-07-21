const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function deepExperianCheck() {
  console.log('🔍 Deep check of Experian tables...\n');
  
  // Check experian_data table thoroughly
  console.log('1. Checking experian_data table...');
  try {
    // Try different approaches to get data
    const { data: data1, error: error1 } = await supabase
      .from('experian_data')
      .select('*')
      .limit(5);
    
    console.log('Direct select result:', { data: data1?.length || 0, error: error1?.message });
    
    if (data1 && data1.length > 0) {
      console.log('Sample experian_data:', JSON.stringify(data1[0], null, 2));
    }
    
    // Try with count
    const { count: count1, error: countError1 } = await supabase
      .from('experian_data')
      .select('*', { count: 'exact', head: true });
    
    console.log('Count result:', { count: count1, error: countError1?.message });
    
    // Try selecting specific columns
    const { data: data2, error: error2 } = await supabase
      .from('experian_data')
      .select('id, postcode, segment_name, value')
      .limit(5);
    
    console.log('Column select result:', { data: data2?.length || 0, error: error2?.message });
    
    if (data2 && data2.length > 0) {
      console.log('Sample with specific columns:', JSON.stringify(data2[0], null, 2));
    }
    
  } catch (err) {
    console.error('Error with experian_data:', err);
  }
  
  // Check experian_taxonomy table thoroughly
  console.log('\n2. Checking experian_taxonomy table...');
  try {
    const { data: data1, error: error1 } = await supabase
      .from('experian_taxonomy')
      .select('*')
      .limit(5);
    
    console.log('Direct select result:', { data: data1?.length || 0, error: error1?.message });
    
    if (data1 && data1.length > 0) {
      console.log('Sample experian_taxonomy:', JSON.stringify(data1[0], null, 2));
    }
    
    // Try with count
    const { count: count1, error: countError1 } = await supabase
      .from('experian_taxonomy')
      .select('*', { count: 'exact', head: true });
    
    console.log('Count result:', { count: count1, error: countError1?.message });
    
  } catch (err) {
    console.error('Error with experian_taxonomy:', err);
  }
  
  // Check table structure
  console.log('\n3. Checking table structure...');
  try {
    // Try to get column information
    const { data: columns, error: colError } = await supabase
      .rpc('get_table_columns', { table_name: 'experian_data' });
    
    if (!colError && columns) {
      console.log('experian_data columns:', columns);
    } else {
      console.log('Could not get column info via RPC:', colError?.message);
    }
    
  } catch (err) {
    console.log('RPC not available for column info');
  }
  
  // Try different table name variations
  console.log('\n4. Trying different table name variations...');
  const tableVariations = [
    'experian_data',
    'experianData',
    'Experian_Data',
    'EXPERIAN_DATA',
    'experian',
    'experian_segments',
    'experianSegments'
  ];
  
  for (const tableName of tableVariations) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (!error && data && data.length > 0) {
        console.log(`✅ Found data in ${tableName}:`, data.length, 'records');
        console.log('Sample:', JSON.stringify(data[0], null, 2));
      } else if (error && !error.message.includes('does not exist')) {
        console.log(`⚠️ ${tableName} exists but no data:`, error.message);
      }
    } catch (err) {
      // Table doesn't exist
    }
  }
  
  // Check if there are any RLS policies blocking access
  console.log('\n5. Checking for RLS policies...');
  try {
    const { data: policies, error: policyError } = await supabase
      .rpc('get_rls_policies', { table_name: 'experian_data' });
    
    if (!policyError && policies) {
      console.log('RLS policies:', policies);
    } else {
      console.log('Could not check RLS policies:', policyError?.message);
    }
  } catch (err) {
    console.log('Could not check RLS policies');
  }
  
  // Try with different user roles
  console.log('\n6. Checking with different authentication...');
  try {
    // Try as authenticated user
    const { data: authData, error: authError } = await supabase
      .from('experian_data')
      .select('*')
      .limit(1);
    
    console.log('Authenticated query result:', { data: authData?.length || 0, error: authError?.message });
    
  } catch (err) {
    console.log('Authentication check failed:', err.message);
  }
  
  // Check if there are any views instead of tables
  console.log('\n7. Checking for views...');
  try {
    const { data: views, error: viewError } = await supabase
      .from('information_schema.views')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%experian%');
    
    if (!viewError && views) {
      console.log('Experian-related views:', views);
    } else {
      console.log('Could not check views:', viewError?.message);
    }
  } catch (err) {
    console.log('Could not check views');
  }
}

deepExperianCheck().catch(console.error); 