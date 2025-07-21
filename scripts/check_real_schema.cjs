const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkRealSchema() {
  console.log('🔍 Checking Real Campaign Events Schema\n');

  try {
    // Get a few sample records to see the actual structure
    console.log('1. Getting sample records to understand schema...');
    const { data: sampleEvents, error: sampleError } = await supabase
      .from('campaign_events')
      .select('*')
      .limit(5);
    
    if (sampleError) {
      console.error('Error fetching sample:', sampleError);
      return;
    }

    console.log(`📊 Sample records: ${sampleEvents.length}`);
    
    if (sampleEvents.length > 0) {
      console.log('\n📊 Sample record structure:');
      const sample = sampleEvents[0];
      Object.keys(sample).forEach(key => {
        console.log(`  ${key}: ${typeof sample[key]} = ${sample[key]}`);
      });
    }

    // Check what columns actually exist
    console.log('\n2. Testing different column names...');
    const testColumns = [
      'spend', 'cost', 'amount', 'price', 'value',
      'revenue', 'income', 'earnings', 'profit',
      'event_date', 'date', 'timestamp', 'created_at',
      'campaign_id', 'campaign', 'campaign_name'
    ];

    for (const column of testColumns) {
      try {
        const { data, error } = await supabase
          .from('campaign_events')
          .select(column)
          .limit(1);
        
        if (!error && data && data.length > 0 && data[0][column] !== undefined) {
          console.log(`✅ Column '${column}' exists`);
        }
      } catch (e) {
        // Column doesn't exist
      }
    }

    // Get actual event types
    console.log('\n3. Getting all unique event types...');
    const { data: eventTypes, error: eventError } = await supabase
      .from('campaign_events')
      .select('event_type')
      .limit(1000);
    
    if (!eventError && eventTypes) {
      const uniqueTypes = [...new Set(eventTypes.map(e => e.event_type))];
      console.log(`📊 Unique event types: ${uniqueTypes.join(', ')}`);
    }

    // Check date range
    console.log('\n4. Checking date range...');
    const { data: dateRange, error: dateError } = await supabase
      .from('campaign_events')
      .select('event_date')
      .order('event_date', { ascending: true })
      .limit(1000);
    
    if (!dateError && dateRange && dateRange.length > 0) {
      const dates = dateRange.map(d => d.event_date).filter(d => d);
      if (dates.length > 0) {
        console.log(`📊 Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
      }
    }

    // Check campaign IDs
    console.log('\n5. Checking campaign IDs...');
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaign_events')
      .select('campaign_id')
      .limit(1000);
    
    if (!campaignError && campaigns) {
      const uniqueCampaigns = [...new Set(campaigns.map(c => c.campaign_id))];
      console.log(`📊 Unique campaigns: ${uniqueCampaigns.length}`);
      console.log(`📊 Sample campaign IDs: ${uniqueCampaigns.slice(0, 5).join(', ')}`);
    }

  } catch (error) {
    console.error('Schema check failed:', error);
  }
}

checkRealSchema(); 