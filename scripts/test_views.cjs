const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testViews() {
  console.log('🧪 Testing database views for fast analytics...\n');
  
  try {
    // Test 1: Check if views exist
    console.log('1. Checking if views exist...');
    const { data: views, error: viewsError } = await supabase
      .from('information_schema.views')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['v_postcode_performance', 'v_daily_performance', 'v_total_metrics']);
    
    if (viewsError) {
      console.error('❌ Error checking views:', viewsError);
      return;
    }
    
    console.log('✅ Available views:', views?.map(v => v.table_name));
    
    // Test 2: Test postcode performance view
    console.log('\n2. Testing v_postcode_performance view...');
    const startTime = Date.now();
    
    const { data: postcodeData, error: postcodeError } = await supabase
      .from('v_postcode_performance')
      .select('*')
      .limit(10);
    
    const endTime = Date.now();
    
    if (postcodeError) {
      console.error('❌ Error fetching postcode performance:', postcodeError);
    } else {
      console.log(`✅ View query completed in ${endTime - startTime}ms`);
      console.log(`✅ Retrieved ${postcodeData?.length || 0} postcode districts`);
      
      if (postcodeData && postcodeData.length > 0) {
        console.log('📊 Sample data:');
        postcodeData.slice(0, 3).forEach((row, index) => {
          console.log(`   ${index + 1}. ${row.postcode_district}: ${row.impressions.toLocaleString()} impressions, £${row.spend}`);
        });
      }
    }
    
    // Test 3: Test total metrics view
    console.log('\n3. Testing v_total_metrics view...');
    const { data: totalData, error: totalError } = await supabase
      .from('v_total_metrics')
      .select('*');
    
    if (totalError) {
      console.error('❌ Error fetching total metrics:', totalError);
    } else {
      console.log('✅ Total metrics:');
      if (totalData && totalData.length > 0) {
        const metrics = totalData[0];
        console.log(`   - Total impressions: ${metrics.total_impressions?.toLocaleString()}`);
        console.log(`   - Total completions: ${metrics.total_completions?.toLocaleString()}`);
        console.log(`   - Total spend: £${metrics.total_spend?.toLocaleString()}`);
        console.log(`   - Unique postcodes: ${metrics.unique_postcodes?.toLocaleString()}`);
      }
    }
    
    // Test 4: Performance comparison
    console.log('\n4. Performance comparison...');
    
    // Test view performance
    const viewStart = Date.now();
    const { data: viewData, error: viewError } = await supabase
      .from('v_postcode_performance')
      .select('*');
    const viewEnd = Date.now();
    
    if (!viewError && viewData) {
      console.log(`✅ View query: ${viewData.length} records in ${viewEnd - viewStart}ms`);
    }
    
    // Test raw query performance (limited)
    const rawStart = Date.now();
    const { data: rawData, error: rawError } = await supabase
      .from('campaign_events')
      .select('geo, event_type')
      .not('geo', 'is', null)
      .neq('geo', '')
      .limit(1000);
    const rawEnd = Date.now();
    
    if (!rawError && rawData) {
      console.log(`✅ Raw query: ${rawData.length} records in ${rawEnd - rawStart}ms`);
    }
    
    // Calculate performance improvement
    if (!viewError && !rawError && viewData && rawData) {
      const improvement = ((rawEnd - rawStart) / (viewEnd - viewStart)).toFixed(1);
      console.log(`🚀 Performance improvement: ${improvement}x faster with views!`);
    }
    
  } catch (error) {
    console.error('❌ View test failed:', error);
  }
}

testViews().catch(console.error); 