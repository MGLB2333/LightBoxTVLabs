const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testExperianFix() {
  console.log('🔍 Testing Experian data access with correct column names...\n');
  
  // Test 1: Check experian_taxonomy with quoted column names
  console.log('1. Testing experian_taxonomy with quoted columns...');
  try {
    const { data: taxonomyData, error: taxonomyError } = await supabase
      .from('experian_taxonomy')
      .select('"Segment ID", "Segment Name", "Taxonomy > Parent Path"')
      .not('"Segment ID"', 'is', null)
      .order('"Segment Name"')
      .limit(5);
    
    if (taxonomyError) {
      console.log('❌ Taxonomy error:', taxonomyError.message);
    } else {
      console.log(`✅ Taxonomy data: ${taxonomyData?.length || 0} records`);
      if (taxonomyData && taxonomyData.length > 0) {
        console.log('Sample taxonomy:', JSON.stringify(taxonomyData[0], null, 2));
        
        // Test 2: Check experian_data with segment columns
        console.log('\n2. Testing experian_data with segment columns...');
        const segmentIds = taxonomyData.map(t => t['Segment ID']).filter(Boolean).slice(0, 3);
        
        if (segmentIds.length > 0) {
          const selectFields = ['"Postcode sector"', ...segmentIds.map(id => `"${id}"`)];
          
          const { data: experianData, error: experianError } = await supabase
            .from('experian_data')
            .select(selectFields.join(', '))
            .not('"Postcode sector"', 'is', null)
            .limit(5);
          
          if (experianError) {
            console.log('❌ Experian data error:', experianError.message);
          } else {
            console.log(`✅ Experian data: ${experianData?.length || 0} records`);
            if (experianData && experianData.length > 0) {
              console.log('Sample experian_data:', JSON.stringify(experianData[0], null, 2));
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ Error testing Experian data:', err);
  }
  
  // Test 3: Check if the views exist
  console.log('\n3. Testing database views...');
  try {
    const { data: viewData, error: viewError } = await supabase
      .from('v_postcode_performance')
      .select('*')
      .limit(5);
    
    if (viewError) {
      console.log('❌ View error:', viewError.message);
      console.log('💡 You need to run the SQL schema in Supabase SQL editor to create the views');
    } else {
      console.log(`✅ View data: ${viewData?.length || 0} records`);
      if (viewData && viewData.length > 0) {
        console.log('Sample view data:', JSON.stringify(viewData[0], null, 2));
      }
    }
  } catch (err) {
    console.log('❌ View test failed:', err.message);
  }
  
  // Test 4: Check total counts
  console.log('\n4. Checking total counts...');
  try {
    const { count: taxonomyCount, error: taxonomyCountError } = await supabase
      .from('experian_taxonomy')
      .select('*', { count: 'exact', head: true });
    
    if (!taxonomyCountError) {
      console.log(`📊 experian_taxonomy: ${taxonomyCount} total records`);
    }
    
    const { count: experianCount, error: experianCountError } = await supabase
      .from('experian_data')
      .select('*', { count: 'exact', head: true });
    
    if (!experianCountError) {
      console.log(`📊 experian_data: ${experianCount} total records`);
    }
  } catch (err) {
    console.log('❌ Count check failed:', err.message);
  }
}

testExperianFix().catch(console.error); 