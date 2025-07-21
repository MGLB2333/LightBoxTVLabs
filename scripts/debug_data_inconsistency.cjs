const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function debugDataInconsistency() {
  console.log('🔍 Debugging Data Inconsistency\n');

  try {
    // 1. Check daily_overall_metrics total impressions
    console.log('1. Checking daily_overall_metrics...');
    const { data: dailyMetrics, error: dailyError } = await supabase
      .from('daily_overall_metrics')
      .select('total_impressions, event_date')
      .order('event_date');
    
    if (dailyError) {
      console.error('Error fetching daily metrics:', dailyError);
      return;
    }

    const totalImpressionsFromDaily = dailyMetrics.reduce((sum, day) => sum + (day.total_impressions || 0), 0);
    console.log(`📊 Total impressions from daily_overall_metrics: ${totalImpressionsFromDaily}`);

    // 2. Check campaign_summary_metrics individual campaign impressions
    console.log('\n2. Checking campaign_summary_metrics...');
    const { data: campaignMetrics, error: campaignError } = await supabase
      .from('campaign_summary_metrics')
      .select('campaign_id, campaign_name, total_impressions')
      .order('total_impressions', { ascending: false });
    
    if (campaignError) {
      console.error('Error fetching campaign metrics:', campaignError);
      return;
    }

    console.log(`📈 Found ${campaignMetrics?.length || 0} campaigns:`);
    campaignMetrics?.forEach(metric => {
      console.log(`  - ${metric.campaign_name || metric.campaign_id}: ${metric.total_impressions} impressions`);
    });

    const totalImpressionsFromCampaigns = campaignMetrics.reduce((sum, campaign) => sum + (campaign.total_impressions || 0), 0);
    console.log(`\n📊 Total impressions from campaign_summary_metrics: ${totalImpressionsFromCampaigns}`);

    // 3. Check raw campaign_events data
    console.log('\n3. Checking raw campaign_events data...');
    const { data: rawEvents, error: eventsError } = await supabase
      .from('campaign_events')
      .select('campaign_id, event_type')
      .eq('event_type', 'impression');
    
    if (eventsError) {
      console.error('Error fetching raw events:', eventsError);
      return;
    }

    // Count impressions by campaign
    const impressionsByCampaign = {};
    rawEvents.forEach(event => {
      const campaignId = event.campaign_id || 'unknown';
      impressionsByCampaign[campaignId] = (impressionsByCampaign[campaignId] || 0) + 1;
    });

    console.log(`📊 Raw impressions by campaign:`);
    Object.entries(impressionsByCampaign).forEach(([campaignId, count]) => {
      console.log(`  - ${campaignId}: ${count} impressions`);
    });

    const totalRawImpressions = Object.values(impressionsByCampaign).reduce((sum, count) => sum + count, 0);
    console.log(`\n📊 Total raw impressions: ${totalRawImpressions}`);

    // 4. Identify the inconsistency
    console.log('\n4. Data Inconsistency Analysis:');
    console.log(`   Daily metrics total: ${totalImpressionsFromDaily}`);
    console.log(`   Campaign metrics total: ${totalImpressionsFromCampaigns}`);
    console.log(`   Raw events total: ${totalRawImpressions}`);
    
    if (totalImpressionsFromDaily !== totalRawImpressions) {
      console.log('❌ INCONSISTENCY: Daily metrics do not match raw events!');
    }
    
    if (totalImpressionsFromCampaigns !== totalRawImpressions) {
      console.log('❌ INCONSISTENCY: Campaign metrics do not match raw events!');
    }

    // 5. Check for the specific campaign that's causing issues
    const problematicCampaign = campaignMetrics.find(c => c.total_impressions > totalImpressionsFromDaily);
    if (problematicCampaign) {
      console.log(`\n🚨 PROBLEMATIC CAMPAIGN: ${problematicCampaign.campaign_name || problematicCampaign.campaign_id}`);
      console.log(`   Campaign impressions: ${problematicCampaign.total_impressions}`);
      console.log(`   Daily total: ${totalImpressionsFromDaily}`);
      console.log(`   This campaign has MORE impressions than the total!`);
    }

  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugDataInconsistency(); 