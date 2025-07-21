const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function debugCampaigns() {
  console.log('🔍 Debugging Campaign Data\n');

  try {
    // 1. Check campaigns table
    console.log('1. Checking campaigns table...');
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*');
    
    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
    } else {
      console.log(`📊 Found ${campaigns?.length || 0} campaigns:`);
      campaigns?.forEach(campaign => {
        console.log(`  - ID: ${campaign.id}`);
        console.log(`    Name: ${campaign.name}`);
        console.log(`    Old Object ID: ${campaign.old_objectid}`);
        console.log(`    Advertiser: ${campaign.advertiser}`);
        console.log(`    Status: ${campaign.status}`);
        console.log('    ---');
      });
    }

    // 2. Check campaign_summary_metrics table
    console.log('\n2. Checking campaign_summary_metrics table...');
    const { data: summaryMetrics, error: summaryError } = await supabase
      .from('campaign_summary_metrics')
      .select('*');
    
    if (summaryError) {
      console.error('Error fetching summary metrics:', summaryError);
    } else {
      console.log(`📈 Found ${summaryMetrics?.length || 0} summary metrics:`);
      summaryMetrics?.forEach(metric => {
        console.log(`  - Campaign ID: ${metric.campaign_id}`);
        console.log(`    Campaign Name: ${metric.campaign_name}`);
        console.log(`    Impressions: ${metric.total_impressions}`);
        console.log('    ---');
      });
    }

    // 3. Test the join query
    console.log('\n3. Testing join query...');
    const { data: joinedData, error: joinError } = await supabase
      .from('campaign_summary_metrics')
      .select(`
        *,
        campaigns(
          name,
          advertiser,
          status
        )
      `);
    
    if (joinError) {
      console.error('Error with join query:', joinError);
    } else {
      console.log(`🔗 Join query returned ${joinedData?.length || 0} records:`);
      joinedData?.forEach(item => {
        console.log(`  - Campaign ID: ${item.campaign_id}`);
        console.log(`    Campaign Name: ${item.campaign_name}`);
        console.log(`    Campaigns Data:`, item.campaigns);
        console.log('    ---');
      });
    }

    // 4. Check if there's a foreign key relationship
    console.log('\n4. Checking campaign_events for campaign_id values...');
    const { data: sampleEvents, error: eventsError } = await supabase
      .from('campaign_events')
      .select('campaign_id')
      .limit(5);
    
    if (eventsError) {
      console.error('Error fetching sample events:', eventsError);
    } else {
      console.log('Sample campaign_ids from events:');
      sampleEvents?.forEach(event => {
        console.log(`  - ${event.campaign_id}`);
      });
    }

  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugCampaigns().catch(console.error); 