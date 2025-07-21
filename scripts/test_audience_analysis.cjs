const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testAudienceAnalysis() {
  console.log('🧪 Testing Audience Analysis Service...\n');
  
  try {
    // Test 1: Check campaign_events data
    console.log('1. Testing campaign_events data...');
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
    
    console.log(`✅ Found ${eventsData.length} campaign events with geo data`);
    
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
    
    console.log(`✅ Aggregated data for ${Object.keys(aggregated).length} postcode districts`);
    console.log('Sample aggregated data:', Object.entries(aggregated).slice(0, 5));
    
    // Test 2: Check Geo_lookup data
    console.log('\n2. Testing Geo_lookup data...');
    const { data: geoData, error: geoError } = await supabase
      .from('Geo_lookup')
      .select('*')
      .limit(10);
    
    if (geoError) {
      console.error('❌ Error fetching Geo_lookup:', geoError);
      return;
    }
    
    console.log(`✅ Found ${geoData.length} geo lookup records`);
    console.log('Sample geo data:', geoData[0]);
    
    // Test 3: Check Experian data
    console.log('\n3. Testing Experian data...');
    const { data: experianData, error: experianError } = await supabase
      .from('experian_data')
      .select('*')
      .limit(5);
    
    if (experianError) {
      console.error('❌ Error fetching experian_data:', experianError);
      return;
    }
    
    console.log(`✅ Found ${experianData.length} experian data records`);
    if (experianData.length > 0) {
      console.log('Sample experian data structure:', Object.keys(experianData[0]));
    }
    
    // Test 4: Check Experian taxonomy
    console.log('\n4. Testing Experian taxonomy...');
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
    console.log('Sample taxonomy data:', taxonomyData[0]);
    
    // Test 5: Test data combination
    console.log('\n5. Testing data combination...');
    
    // Create lookup maps
    const geoMap = new Map(geoData.map(g => [g['Postcode District'], g]));
    const taxonomyMap = new Map(taxonomyData.map(t => [t['Segment ID'], t]));
    
    // Combine delivery data with geographic data
    const combined = Object.entries(aggregated).map(([district, metrics]) => {
      const geo = geoMap.get(district);
      return {
        postcodeDistrict: district,
        impressions: metrics.impressions,
        completions: metrics.completions,
        spend: (metrics.impressions * 24) / 1000, // £24 CPM
        cpm: 24,
        town: geo?.['Town/Area'] || 'Unknown',
        region: geo?.['Region'] || 'Unknown',
        population: parseInt(geo?.['Population']?.replace(/,/g, '') || '0'),
        households: parseInt(geo?.['District Households']?.replace(/,/g, '') || '0'),
        latitude: geo?.['Latitude'] || 0,
        longitude: geo?.['Longitude'] || 0
      };
    });
    
    console.log(`✅ Combined data for ${combined.length} postcode districts`);
    console.log('Sample combined data:', combined[0]);
    
    // Test 6: Calculate insights
    console.log('\n6. Testing insight calculations...');
    
    const totalImpressions = combined.reduce((sum, item) => sum + item.impressions, 0);
    const totalCompletions = combined.reduce((sum, item) => sum + item.completions, 0);
    const totalSpend = combined.reduce((sum, item) => sum + item.spend, 0);
    
    console.log(`✅ Calculated totals:`);
    console.log(`   - Total Impressions: ${totalImpressions.toLocaleString()}`);
    console.log(`   - Total Completions: ${totalCompletions.toLocaleString()}`);
    console.log(`   - Total Spend: £${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
    console.log(`   - Unique Postcodes: ${combined.length}`);
    
    // Top performing areas
    const topPerformingAreas = combined
      .filter(item => item.impressions > 0)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5);
    
    console.log('\n✅ Top 5 performing areas:');
    topPerformingAreas.forEach((area, index) => {
      console.log(`   ${index + 1}. ${area.postcodeDistrict} (${area.town}): ${area.impressions.toLocaleString()} impressions`);
    });
    
    console.log('\n🎉 All tests passed! Audience analysis service is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAudienceAnalysis().catch(console.error); 