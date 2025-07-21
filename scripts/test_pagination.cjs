const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testPagination() {
  console.log('🧪 Testing pagination to fetch all campaign events...\n');
  
  try {
    // Test pagination
    const allData = [];
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('campaign_events')
        .select('geo, event_type')
        .not('geo', 'is', null)
        .neq('geo', '')
        .range(from, from + pageSize - 1);
      
      if (error) {
        console.error('❌ Error fetching page:', error);
        break;
      }
      
      if (data && data.length > 0) {
        allData.push(...data);
        from += pageSize;
        console.log(`📊 Fetched ${allData.length} records so far...`);
      } else {
        hasMore = false;
      }
      
      // Safety check
      if (allData.length > 500000) {
        console.warn('⚠️ Reached safety limit, stopping');
        break;
      }
    }
    
    console.log(`\n✅ Total records fetched: ${allData.length.toLocaleString()}`);
    
    // Aggregate the data
    const aggregated = {};
    allData.forEach(event => {
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
    
    const totalImpressions = Object.values(aggregated).reduce((sum, geo) => sum + geo.impressions, 0);
    const totalCompletions = Object.values(aggregated).reduce((sum, geo) => sum + geo.completions, 0);
    
    console.log(`✅ Final results:`);
    console.log(`   - Unique postcodes: ${Object.keys(aggregated).length}`);
    console.log(`   - Total impressions: ${totalImpressions.toLocaleString()}`);
    console.log(`   - Total completions: ${totalCompletions.toLocaleString()}`);
    console.log(`   - Total spend: £${((totalImpressions * 24) / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
    
    // Show top 5 postcodes
    const sortedPostcodes = Object.entries(aggregated)
      .map(([district, metrics]) => ({ district, ...metrics }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5);
    
    console.log(`\n📊 Top 5 postcodes by impressions:`);
    sortedPostcodes.forEach((postcode, index) => {
      console.log(`   ${index + 1}. ${postcode.district}: ${postcode.impressions.toLocaleString()} impressions`);
    });
    
  } catch (error) {
    console.error('❌ Pagination test failed:', error);
  }
}

testPagination().catch(console.error); 