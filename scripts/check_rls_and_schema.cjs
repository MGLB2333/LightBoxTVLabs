const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkRLSAndSchema() {
  console.log('🔍 Checking RLS policies and schema access...\n');
  
  // Check 1: Try with service role key if available
  console.log('1. Checking if service role key is available...');
  if (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    console.log('✅ Service role key found, trying with service role...');
    const serviceSupabase = createClient(
      process.env.VITE_SUPABASE_URL, 
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    );
    
    try {
      const { data, error } = await serviceSupabase
        .from('experian_data')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log('❌ Service role error:', error.message);
      } else {
        console.log(`✅ Service role access: ${data?.length || 0} records`);
        if (data && data.length > 0) {
          console.log('Sample data with service role:', JSON.stringify(data[0], null, 2));
        }
      }
    } catch (err) {
      console.log('❌ Service role failed:', err.message);
    }
  } else {
    console.log('❌ No service role key found');
  }
  
  // Check 2: Try different authentication methods
  console.log('\n2. Trying different authentication methods...');
  
  // Try as authenticated user
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log('❌ Auth error:', authError.message);
    } else if (user) {
      console.log('✅ Authenticated as user:', user.email);
      
      // Try query with authenticated user
      const { data, error } = await supabase
        .from('experian_data')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log('❌ Authenticated query error:', error.message);
      } else {
        console.log(`✅ Authenticated access: ${data?.length || 0} records`);
      }
    } else {
      console.log('⚠️ Not authenticated');
    }
  } catch (err) {
    console.log('❌ Auth check failed:', err.message);
  }
  
  // Check 3: Try to bypass RLS
  console.log('\n3. Trying to check RLS policies...');
  try {
    // Try to query RLS policies
    const { data: policies, error: policyError } = await supabase
      .rpc('get_rls_policies', { table_name: 'experian_data' });
    
    if (policyError) {
      console.log('❌ RLS policy check failed:', policyError.message);
    } else {
      console.log('✅ RLS policies:', policies);
    }
  } catch (err) {
    console.log('❌ RLS check failed:', err.message);
  }
  
  // Check 4: Try different table access methods
  console.log('\n4. Trying different table access methods...');
  
  // Try with raw SQL
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', { sql: 'SELECT COUNT(*) FROM experian_data' });
    
    if (error) {
      console.log('❌ Raw SQL error:', error.message);
    } else {
      console.log('✅ Raw SQL result:', data);
    }
  } catch (err) {
    console.log('❌ Raw SQL failed:', err.message);
  }
  
  // Check 5: Try to access via different schema
  console.log('\n5. Trying different schemas...');
  const schemas = ['public', 'experian', 'data', 'analytics', 'main'];
  
  for (const schema of schemas) {
    try {
      const { data, error } = await supabase
        .from(`${schema}.experian_data`)
        .select('*')
        .limit(1);
      
      if (!error && data && data.length > 0) {
        console.log(`✅ Found data in ${schema}.experian_data`);
        break;
      }
    } catch (err) {
      // Schema doesn't exist
    }
  }
  
  // Check 6: Try to get table information
  console.log('\n6. Getting table information...');
  try {
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .like('table_name', '%experian%');
    
    if (tableError) {
      console.log('❌ Table info error:', tableError.message);
    } else {
      console.log('✅ Experian tables found:', tables);
    }
  } catch (err) {
    console.log('❌ Table info failed:', err.message);
  }
  
  // Check 7: Try to access with different column names
  console.log('\n7. Trying different column name formats...');
  const columnFormats = [
    'postcode_sector',
    'Postcode sector',
    '"Postcode sector"',
    'postcode',
    'Postcode',
    'segment_id',
    'Segment ID',
    '"Segment ID"'
  ];
  
  for (const column of columnFormats) {
    try {
      const { data, error } = await supabase
        .from('experian_data')
        .select(column)
        .limit(1);
      
      if (!error && data && data.length > 0) {
        console.log(`✅ Success with column: ${column}`);
        break;
      }
    } catch (err) {
      // Column doesn't exist
    }
  }
  
  // Check 8: Provide next steps
  console.log('\n8. Next steps to resolve:');
  console.log(`
The issue appears to be RLS (Row Level Security) policies blocking access to the Experian tables.

To fix this:

1. **Check RLS policies in Supabase dashboard:**
   - Go to Authentication > Policies
   - Look for experian_data and experian_taxonomy tables
   - Check if there are restrictive policies

2. **Create a policy to allow access:**
   ```sql
   -- Allow read access to experian_data
   CREATE POLICY "Allow read access to experian_data" 
   ON experian_data FOR SELECT 
   TO anon 
   USING (true);
   
   -- Allow read access to experian_taxonomy
   CREATE POLICY "Allow read access to experian_taxonomy" 
   ON experian_taxonomy FOR SELECT 
   TO anon 
   USING (true);
   ```

3. **Or use service role key:**
   - Add VITE_SUPABASE_SERVICE_ROLE_KEY to your .env file
   - This bypasses RLS policies

4. **Check if data is in a different environment:**
   - Verify you're connecting to the correct database
   - Check if there are multiple environments (dev/staging/prod)
  `);
}

checkRLSAndSchema().catch(console.error); 