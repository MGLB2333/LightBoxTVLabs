const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fixExperianAccess() {
  console.log('🔍 Testing Experian data access...\n');
  
  // Test 1: Check if we can access the tables at all
  console.log('1. Testing basic table access...');
  try {
    const { data, error } = await supabase
      .from('experian_data')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Access error:', error.message);
      
      if (error.message.includes('policy') || error.message.includes('permission')) {
        console.log('\n🎯 SOLUTION: This is an RLS (Row Level Security) issue!');
        console.log('\nTo fix this, run these SQL commands in your Supabase SQL editor:');
        console.log(`
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
        `);
      }
    } else {
      console.log(`✅ Success! Found ${data?.length || 0} records`);
      if (data && data.length > 0) {
        console.log('Sample data:', JSON.stringify(data[0], null, 2));
      }
    }
  } catch (err) {
    console.log('❌ Test failed:', err.message);
  }
  
  // Test 2: Check if service role key is available
  console.log('\n2. Checking for service role key...');
  if (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    console.log('✅ Service role key found');
    console.log('You can also use the service role key to bypass RLS policies');
  } else {
    console.log('❌ No service role key found');
    console.log('Add VITE_SUPABASE_SERVICE_ROLE_KEY to your .env file to bypass RLS');
  }
  
  // Test 3: Check current authentication
  console.log('\n3. Checking authentication...');
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log('❌ Auth error:', authError.message);
    } else if (user) {
      console.log('✅ Authenticated as:', user.email);
    } else {
      console.log('⚠️ Not authenticated');
    }
  } catch (err) {
    console.log('❌ Auth check failed:', err.message);
  }
}

fixExperianAccess().catch(console.error); 