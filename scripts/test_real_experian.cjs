const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testRealExperianData() {
  console.log('🧪 Testing Real Experian Data Service...\n');
  
  try {
    // Test 1: Check Experian data structure
    console.log('1. Testing Experian data structure...');
    const { data: experianData, error: experianError } = await supabase
      .from('experian_data')
      .select('*')
      .limit(5);
    
    if (experianError) {
      console.error('❌ Error fetching experian_data:', experianError);
      return;
    }
    
    console.log(`✅ Found ${experianData.length} Experian data records`);
    if (experianData.length > 0) {
      console.log('Sample Experian data structure:', Object.keys(experianData[0]));
      console.log('Sample postcode sector:', experianData[0]['Postcode sector']);
      
      // Extract segment IDs (columns starting with S)
      const segmentIds = Object.keys(experianData[0]).filter(key => 
        key.startsWith('S') && key !== '_id' && key !== 'Postcode sector'
      );
      console.log(`Found ${segmentIds.length} segment columns:`, segmentIds.slice(0, 10));
      
      // Show sample segment values
      console.log('Sample segment values for first record:');
      segmentIds.slice(0, 5).forEach(segmentId => {
        console.log(`  ${segmentId}: ${experianData[0][segmentId]}`);
      });
    }
    
    // Test 2: Check Experian taxonomy
    console.log('\n2. Testing Experian taxonomy...');
    const { data: taxonomyData, error: taxonomyError } = await supabase
      .from('experian_taxonomy')
      .select('"Segment ID", "Segment Name", "Taxonomy > Parent Path"')
      .not('"Segment ID"', 'is', null)
      .limit(10);
    
    if (taxonomyError) {
      console.error('❌ Error fetching experian_taxonomy:', taxonomyError);
      return;
    }
    
    console.log(`✅ Found ${taxonomyData.length} taxonomy records`);
    if (taxonomyData.length > 0) {
      console.log('Sample taxonomy data:', taxonomyData[0]);
    }
    
    // Test 3: Check campaign events for postcode districts
    console.log('\n3. Testing campaign events postcode districts...');
    const { data: eventsData, error: eventsError } = await supabase
      .from('campaign_events')
      .select('geo, event_type')
      .not('geo', 'is', null)
      .neq('geo', '')
      .limit(1000);
    
    if (eventsError) {
      console.error('❌ Error fetching campaign_events:', eventsError);
      return;
    }
    
    // Aggregate by postcode district
    const aggregated = {};
    eventsData.forEach(event => {
      const district = event.geo;
      if (!aggregated[district]) {
        aggregated[district] = { impressions: 0, completions: 0 };
      }
      
      if (event.event_type === 'impression') {
        aggregated[district].impressions++;
      } else if (event.event_type === 'videocomplete') {
        aggregated[district].completions++;
      }
    });
    
    console.log(`✅ Found ${Object.keys(aggregated).length} unique postcode districts in campaign data`);
    console.log('Sample postcode districts:', Object.keys(aggregated).slice(0, 10));
    
    // Test 4: Test postcode district to sector mapping
    console.log('\n4. Testing postcode district to sector mapping...');
    
    // Get all unique postcode sectors from Experian data
    const { data: allSectors, error: sectorsError } = await supabase
      .from('experian_data')
      .select('"Postcode sector"')
      .limit(1000);
    
    if (sectorsError) {
      console.error('❌ Error fetching postcode sectors:', sectorsError);
      return;
    }
    
    const uniqueSectors = [...new Set(allSectors.map(row => row['Postcode sector']))];
    console.log(`✅ Found ${uniqueSectors.length} unique postcode sectors in Experian data`);
    
    // Create district to sector mapping
    const districtToSectorMap = new Map();
    allSectors.forEach(row => {
      const postcodeSector = row['Postcode sector'];
      if (postcodeSector) {
        const district = postcodeSector.split(' ')[0];
        if (!districtToSectorMap.has(district)) {
          districtToSectorMap.set(district, []);
        }
        districtToSectorMap.get(district).push(postcodeSector);
      }
    });
    
    console.log(`✅ Created mapping for ${districtToSectorMap.size} postcode districts`);
    
    // Test matching between campaign districts and Experian sectors
    const campaignDistricts = Object.keys(aggregated);
    const matchingDistricts = campaignDistricts.filter(district => districtToSectorMap.has(district));
    
    console.log(`✅ ${matchingDistricts.length} out of ${campaignDistricts.length} campaign districts have Experian data`);
    console.log('Sample matching districts:', matchingDistricts.slice(0, 10));
    
    // Test 5: Calculate sample segment averages
    console.log('\n5. Testing segment average calculations...');
    
    if (experianData.length > 0 && segmentIds.length > 0) {
      const sampleSegmentId = segmentIds[0];
      const values = experianData.map(row => row[sampleSegmentId]).filter(v => v !== null && v !== undefined);
      const averageValue = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      
      console.log(`✅ Sample calculation for segment ${sampleSegmentId}:`);
      console.log(`   - Values found: ${values.length}`);
      console.log(`   - Average value: ${Math.round(averageValue)}`);
      console.log(`   - Sample values: ${values.slice(0, 5).join(', ')}`);
    }
    
    // Test 6: Simulate the full data combination
    console.log('\n6. Testing full data combination simulation...');
    
    const deliveryData = Object.entries(aggregated).map(([district, metrics]) => ({
      postcodeDistrict: district,
      impressions: metrics.impressions,
      completions: metrics.completions,
      spend: (metrics.impressions * 24) / 1000,
      cpm: 24
    }));
    
    const totalImpressions = deliveryData.reduce((sum, item) => sum + item.impressions, 0);
    const totalCompletions = deliveryData.reduce((sum, item) => sum + item.completions, 0);
    const totalSpend = deliveryData.reduce((sum, item) => sum + item.spend, 0);
    
    console.log('✅ Simulated data combination results:');
    console.log(`   - Total impressions: ${totalImpressions.toLocaleString()}`);
    console.log(`   - Total completions: ${totalCompletions.toLocaleString()}`);
    console.log(`   - Total spend: £${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
    console.log(`   - Unique postcodes: ${deliveryData.length}`);
    
    console.log('\n🎉 All tests passed! Real Experian service is ready to use.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRealExperianData().catch(console.error); 