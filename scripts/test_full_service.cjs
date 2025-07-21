const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testFullService() {
  console.log('🧪 Testing Full RealExperianService...\n');
  
  try {
    // Test the actual service method
    console.log('1. Testing RealExperianService.getGeographicAudienceData()...');
    
    // Import and use the service
    const { RealExperianService } = require('../src/lib/realExperianService.ts');
    
    const data = await RealExperianService.getGeographicAudienceData();
    
    console.log('✅ Service returned data:');
    console.log(`   - Total impressions: ${data.totalImpressions.toLocaleString()}`);
    console.log(`   - Total completions: ${data.totalCompletions.toLocaleString()}`);
    console.log(`   - Total spend: £${data.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
    console.log(`   - Unique postcodes: ${data.postcodePerformance.length}`);
    console.log(`   - Top segments: ${data.topSegments.length}`);
    
    // Show top 5 postcodes
    console.log('\n2. Top 5 postcodes by impressions:');
    data.postcodePerformance.slice(0, 5).forEach((postcode, index) => {
      console.log(`   ${index + 1}. ${postcode.postcodeDistrict}: ${postcode.impressions.toLocaleString()} impressions`);
    });
    
  } catch (error) {
    console.error('❌ Service test failed:', error);
    
    // Fallback: test the raw data fetching
    console.log('\n🔄 Fallback: Testing raw data fetching...');
    
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('campaign_events')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error getting total count:', countError);
      return;
    }
    
    console.log(`📊 Total campaign_events records: ${totalCount?.toLocaleString()}`);
    
    // Get impression count
    const { count: impressionCount, error: impressionError } = await supabase
      .from('campaign_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'impression');
    
    if (impressionError) {
      console.error('❌ Error getting impression count:', impressionError);
    } else {
      console.log(`📊 Total impression events: ${impressionCount?.toLocaleString()}`);
    }
    
    // Get completion count
    const { count: completionCount, error: completionError } = await supabase
      .from('campaign_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'videocomplete');
    
    if (completionError) {
      console.error('❌ Error getting completion count:', completionError);
    } else {
      console.log(`📊 Total completion events: ${completionCount?.toLocaleString()}`);
    }
    
    // Test with different limits
    console.log('\n3. Testing with different limits...');
    
    const limits = [1000, 10000, 100000, 500000];
    
    for (const limit of limits) {
      try {
        const { data, error } = await supabase
          .from('campaign_events')
          .select('geo, event_type')
          .not('geo', 'is', null)
          .neq('geo', '')
          .limit(limit);
        
        if (error) {
          console.log(`❌ Limit ${limit.toLocaleString()}: ${error.message}`);
        } else {
          const impressions = data.filter(e => e.event_type === 'impression').length;
          const completions = data.filter(e => e.event_type === 'videocomplete').length;
          console.log(`✅ Limit ${limit.toLocaleString()}: ${data.length} records, ${impressions} impressions, ${completions} completions`);
        }
      } catch (err) {
        console.log(`❌ Limit ${limit.toLocaleString()}: ${err.message}`);
      }
    }
  }
}

testFullService().catch(console.error); 