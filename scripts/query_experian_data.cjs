const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function queryExperianData() {
  console.log('🔍 Querying Experian data with correct column names...\n');
  
  // Query 1: Get taxonomy data
  console.log('1. Querying experian_taxonomy...');
  try {
    const { data: taxonomyData, error: taxonomyError } = await supabase
      .from('experian_taxonomy')
      .select('"Segment ID", "Segment Name", "Taxonomy > Parent Path"')
      .not('"Segment ID"', 'is', null)
      .order('"Segment Name"')
      .limit(10);
    
    if (taxonomyError) {
      console.log('❌ Taxonomy error:', taxonomyError.message);
    } else {
      console.log(`✅ Taxonomy data: ${taxonomyData?.length || 0} records`);
      if (taxonomyData && taxonomyData.length > 0) {
        console.log('Sample taxonomy records:');
        taxonomyData.slice(0, 3).forEach((record, index) => {
          console.log(`  ${index + 1}. ${record['Segment Name']} (ID: ${record['Segment ID']})`);
        });
        
        // Query 2: Get experian_data with segment columns
        console.log('\n2. Querying experian_data with segment columns...');
        const segmentIds = taxonomyData.map(t => t['Segment ID']).filter(Boolean).slice(0, 5);
        
        if (segmentIds.length > 0) {
          console.log(`Using segment IDs: ${segmentIds.join(', ')}`);
          
          const selectFields = ['"Postcode sector"', ...segmentIds.map(id => `"${id}"`)];
          
          const { data: experianData, error: experianError } = await supabase
            .from('experian_data')
            .select(selectFields.join(', '))
            .not('"Postcode sector"', 'is', null)
            .limit(10);
          
          if (experianError) {
            console.log('❌ Experian data error:', experianError.message);
          } else {
            console.log(`✅ Experian data: ${experianData?.length || 0} records`);
            if (experianData && experianData.length > 0) {
              console.log('Sample experian_data records:');
              experianData.slice(0, 3).forEach((record, index) => {
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
    console.error('❌ Error querying Experian data:', err);
  }
  
  // Query 3: Check column structure
  console.log('\n3. Checking column structure...');
  try {
    // Try to get a single record to see the structure
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
    }
  } catch (err) {
    console.log('❌ Structure check failed:', err.message);
  }
  
  // Query 4: Get some statistics
  console.log('\n4. Getting statistics...');
  try {
    const { count: totalTaxonomy, error: taxonomyCountError } = await supabase
      .from('experian_taxonomy')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalExperian, error: experianCountError } = await supabase
      .from('experian_data')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total records:`);
    console.log(`   experian_taxonomy: ${totalTaxonomy || 0}`);
    console.log(`   experian_data: ${totalExperian || 0}`);
  } catch (err) {
    console.log('❌ Statistics failed:', err.message);
  }
  
  // Query 5: Test with specific postcode
  console.log('\n5. Testing with specific postcode...');
  try {
    const { data: postcodeData, error: postcodeError } = await supabase
      .from('experian_data')
      .select('"Postcode sector"')
      .like('"Postcode sector"', 'EC%')
      .limit(5);
    
    if (postcodeError) {
      console.log('❌ Postcode error:', postcodeError.message);
    } else {
      console.log(`✅ Found ${postcodeData?.length || 0} postcodes starting with EC:`);
      if (postcodeData && postcodeData.length > 0) {
        postcodeData.forEach(record => {
          console.log(`   ${record['Postcode sector']}`);
        });
      }
    }
  } catch (err) {
    console.log('❌ Postcode test failed:', err.message);
  }
}

queryExperianData().catch(console.error); 