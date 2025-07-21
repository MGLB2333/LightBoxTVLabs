const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function analyzeRealData() {
  console.log('🔍 Analyzing Real Campaign Events Data\n');

  try {
    // 1. Check total count of campaign_events
    console.log('1. Checking total campaign_events count...');
    const { count: totalEvents, error: countError } = await supabase
      .from('campaign_events')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting events:', countError);
    } else {
      console.log(`📊 Total campaign_events: ${totalEvents}`);
    }

    // 2. Get sample of real data to understand structure
    console.log('\n2. Analyzing sample of real data...');
    const { data: sampleEvents, error: sampleError } = await supabase
      .from('campaign_events')
      .select('*')
      .limit(1000);
    
    if (sampleError) {
      console.error('Error fetching sample:', sampleError);
      return;
    }

    console.log(`📊 Sample size: ${sampleEvents.length} events`);

    // 3. Analyze event types and distribution
    const eventTypeCounts = {};
    const campaignIds = new Set();
    const dates = new Set();
    let totalSpend = 0;
    let totalRevenue = 0;

    sampleEvents.forEach(event => {
      const type = event.event_type;
      eventTypeCounts[type] = (eventTypeCounts[type] || 0) + 1;
      
      if (event.campaign_id) campaignIds.add(event.campaign_id);
      if (event.event_date) dates.add(event.event_date);
      if (event.spend) totalSpend += parseFloat(event.spend) || 0;
      if (event.revenue) totalRevenue += parseFloat(event.revenue) || 0;
    });

    console.log('\n📊 Event type distribution in sample:');
    Object.entries(eventTypeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} events (${((count / sampleEvents.length) * 100).toFixed(1)}%)`);
    });

    console.log(`\n📊 Sample data summary:`);
    console.log(`  Unique campaigns: ${campaignIds.size}`);
    console.log(`  Date range: ${Math.min(...dates)} to ${Math.max(...dates)}`);
    console.log(`  Total spend in sample: £${totalSpend.toFixed(2)}`);
    console.log(`  Total revenue in sample: £${totalRevenue.toFixed(2)}`);

    // 4. Check if we can use SQL aggregation functions
    console.log('\n3. Testing SQL aggregation...');
    
    // Test aggregation query
    const { data: aggregatedData, error: aggError } = await supabase
      .rpc('aggregate_campaign_events', {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });
    
    if (aggError) {
      console.log('❌ RPC function not available, will need to create it');
      console.log('Error:', aggError.message);
    } else {
      console.log('✅ RPC function available');
      console.log('Aggregated data:', aggregatedData);
    }

    // 5. Check if we can use direct SQL queries
    console.log('\n4. Testing direct SQL query...');
    const { data: sqlResult, error: sqlError } = await supabase
      .from('campaign_events')
      .select(`
        event_date,
        campaign_id,
        event_type,
        spend,
        revenue
      `)
      .eq('event_type', 'impression')
      .gte('event_date', '2024-01-01')
      .lte('event_date', '2024-01-31')
      .limit(100);
    
    if (sqlError) {
      console.error('Error with SQL query:', sqlError);
    } else {
      console.log(`✅ SQL query successful, got ${sqlResult.length} impression events`);
      
      // Group by date to see daily totals
      const dailyImpressions = {};
      sqlResult.forEach(event => {
        const date = event.event_date;
        dailyImpressions[date] = (dailyImpressions[date] || 0) + 1;
      });
      
      console.log('\n📊 Daily impressions from sample:');
      Object.entries(dailyImpressions).slice(0, 5).forEach(([date, count]) => {
        console.log(`  ${date}: ${count} impressions`);
      });
    }

    // 6. Suggest solution
    console.log('\n💡 Solution Options:');
    console.log('1. Create a PostgreSQL function to aggregate all 400k+ records');
    console.log('2. Use Supabase Edge Functions to process data in batches');
    console.log('3. Set up a scheduled job to pre-aggregate data');
    console.log('4. Use direct SQL queries with proper indexing');

  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

analyzeRealData(); 