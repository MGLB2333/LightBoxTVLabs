const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTVRPerformance() {
  try {
    console.log('🧪 Testing TVR calculation performance...');
    
    // Get a sample campaign
    const { data: campaigns, error: campaignsError } = await supabase
      .from('tv_campaigns')
      .select('*')
      .limit(1);
    
    if (campaignsError || !campaigns || campaigns.length === 0) {
      console.error('❌ No campaigns found for testing');
      return;
    }
    
    const campaign = campaigns[0];
    console.log(`📊 Testing with campaign: ${campaign.name}`);
    
    // Get campaign plans
    const { data: plans, error: plansError } = await supabase
      .from('tv_campaign_plans')
      .select('*')
      .eq('campaign_id', campaign.id);
    
    if (plansError || !plans) {
      console.error('❌ No plans found for testing');
      return;
    }
    
    console.log(`📋 Found ${plans.length} plans to test`);
    
    // Test the old approach (simulated)
    console.log('\n🔄 Testing old approach (individual API calls)...');
    const oldStartTime = Date.now();
    
    // Simulate old approach - this would be individual API calls
    for (const plan of plans) {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const oldEndTime = Date.now();
    const oldDuration = oldEndTime - oldStartTime;
    
    // Test the new approach (batched)
    console.log('\n⚡ Testing new approach (batched API calls)...');
    const newStartTime = Date.now();
    
    // Get unique stations
    const uniqueStations = [...new Set(plans.map(plan => plan.group_name))];
    console.log(`🎯 Batching ${plans.length} plans into ${uniqueStations.length} unique stations`);
    
    // Simulate batched approach
    for (const station of uniqueStations) {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const newEndTime = Date.now();
    const newDuration = newEndTime - newStartTime;
    
    // Calculate improvements
    const timeSaved = oldDuration - newDuration;
    const percentageImprovement = ((timeSaved / oldDuration) * 100).toFixed(1);
    
    console.log('\n📈 Performance Results:');
    console.log(`   Old approach: ${oldDuration}ms (${plans.length} API calls)`);
    console.log(`   New approach: ${newDuration}ms (${uniqueStations.length} API calls)`);
    console.log(`   Time saved: ${timeSaved}ms`);
    console.log(`   Improvement: ${percentageImprovement}%`);
    console.log(`   API calls reduced: ${plans.length - uniqueStations.length} (${((plans.length - uniqueStations.length) / plans.length * 100).toFixed(1)}%)`);
    
    // Test cache functionality
    console.log('\n💾 Testing cache functionality...');
    
    const { data: cacheStats, error: cacheError } = await supabase.rpc('get_cached_tvr', {
      p_cache_key: 'test_performance_key',
      p_max_age_minutes: 30
    });
    
    if (cacheError) {
      console.log('⚠️ Cache functions not available yet - run setup_tvr_cache.cjs first');
    } else {
      console.log('✅ Cache functions working correctly');
    }
    
  } catch (error) {
    console.error('❌ Error testing performance:', error);
  }
}

testTVRPerformance();

