const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testExperianConnection() {
  console.log('🔍 Testing Experian data connection after RLS policies...\n');
  
  // Test 1: Check if we can access experian_taxonomy
  console.log('1. Testing experian_taxonomy access...');
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
        console.log('Sample taxonomy records:');
        taxonomyData.forEach((record, index) => {
          console.log(`  ${index + 1}. ${record['Segment Name']} (ID: ${record['Segment ID']})`);
        });
        
        // Test 2: Check experian_data with segment columns
        console.log('\n2. Testing experian_data access...');
        const segmentIds = taxonomyData.map(t => t['Segment ID']).filter(Boolean).slice(0, 3);
        
        if (segmentIds.length > 0) {
          console.log(`Using segment IDs: ${segmentIds.join(', ')}`);
          
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
              console.log('Sample experian_data records:');
              experianData.slice(0, 2).forEach((record, index) => {
                console.log(`  ${index + 1}. Postcode: ${record['Postcode sector']}`);
                segmentIds.forEach(segmentId => {
                  if (record[segmentId] !== null && record[segmentId] !== undefined) {
                    console.log(`     ${segmentId}: ${record[segmentId]}`);
                  }
                });
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ Error testing Experian data:', err);
  }
  
  // Test 3: Check total counts
  console.log('\n3. Checking total counts...');
  try {
    const { count: taxonomyCount, error: taxonomyCountError } = await supabase
      .from('experian_taxonomy')
      .select('*', { count: 'exact', head: true });
    
    const { count: experianCount, error: experianCountError } = await supabase
      .from('experian_data')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total records:`);
    console.log(`   experian_taxonomy: ${taxonomyCount || 0}`);
    console.log(`   experian_data: ${experianCount || 0}`);
    
    if (taxonomyCount === 0 || experianCount === 0) {
      console.log('\n⚠️ WARNING: Tables appear to be empty or inaccessible');
      console.log('This could mean:');
      console.log('1. RLS policies are still blocking access');
      console.log('2. Tables are actually empty');
      console.log('3. Column names are different than expected');
    } else {
      console.log('\n✅ SUCCESS: Experian data is accessible!');
    }
  } catch (err) {
    console.log('❌ Count check failed:', err.message);
  }
  
  // Test 4: Check column structure
  console.log('\n4. Checking column structure...');
  try {
    const { data: structureData, error: structureError } = await supabase
      .from('experian_data')
      .select('*')
      .limit(1);
    
    if (structureError) {
      console.log('❌ Structure error:', structureError.message);
    } else if (structureData && structureData.length > 0) {
      console.log('experian_data columns:', Object.keys(structureData[0]));
      
      // Count segment columns (columns starting with S)
      const segmentColumns = Object.keys(structureData[0]).filter(col => col.startsWith('S'));
      console.log(`Found ${segmentColumns.length} segment columns:`, segmentColumns.slice(0, 10));
    } else {
      console.log('⚠️ No data found to check structure');
    }
  } catch (err) {
    console.log('❌ Structure check failed:', err.message);
  }
}

testExperianConnection().catch(console.error); 