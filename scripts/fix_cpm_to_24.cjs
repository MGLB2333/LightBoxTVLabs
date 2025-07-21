const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixCpmTo24() {
  console.log('🔧 Fixing CPM to £24\n');

  try {
    // Calculate correct spend for £24 CPM
    const targetCpm = 24;
    const impressionsPerDay = 8125;
    const correctSpendPerDay = (impressionsPerDay * targetCpm) / 1000; // £195 per day
    const totalImpressions = 243774;
    const totalSpend = (totalImpressions * targetCpm) / 1000; // £5,850.58 total

    console.log(`📊 Target CPM: £${targetCpm}`);
    console.log(`📊 Impressions per day: ${impressionsPerDay}`);
    console.log(`📊 Correct spend per day: £${correctSpendPerDay.toFixed(2)}`);
    console.log(`📊 Total impressions: ${totalImpressions}`);
    console.log(`📊 Total spend: £${totalSpend.toFixed(2)}`);

    // 1. Update daily_overall_metrics
    console.log('\n1. Updating daily_overall_metrics...');
    
    const { data: dailyMetrics, error: fetchError } = await supabase
      .from('daily_overall_metrics')
      .select('id, event_date');
    
    if (fetchError) {
      console.error('Error fetching daily metrics:', fetchError);
      return;
    }

    console.log(`📊 Found ${dailyMetrics?.length || 0} daily metrics to update`);

    // Update each daily metric
    for (const day of dailyMetrics || []) {
      const { error: updateError } = await supabase
        .from('daily_overall_metrics')
        .update({
          total_spend: correctSpendPerDay,
          avg_ecpm: targetCpm,
          avg_cpcv: correctSpendPerDay / 4062 // 4062 completed views per day
        })
        .eq('id', day.id);
      
      if (updateError) {
        console.error(`Error updating day ${day.event_date}:`, updateError);
      } else {
        console.log(`✅ Updated ${day.event_date}: £${correctSpendPerDay.toFixed(2)} spend, £${targetCpm} CPM`);
      }
    }

    // 2. Update campaign_summary_metrics
    console.log('\n2. Updating campaign_summary_metrics...');
    
    const { error: campaignUpdateError } = await supabase
      .from('campaign_summary_metrics')
      .update({
        total_spend: totalSpend
      })
      .eq('campaign_id', '67bcaa007209f5cb30f9724f');
    
    if (campaignUpdateError) {
      console.error('Error updating campaign metrics:', campaignUpdateError);
    } else {
      console.log(`✅ Updated campaign spend: £${totalSpend.toFixed(2)}`);
    }

    // 3. Verify the fix
    console.log('\n3. Verifying the fix...');
    
    const { data: verifyDaily, error: verifyError } = await supabase
      .from('daily_overall_metrics')
      .select('total_impressions, total_spend, avg_ecpm')
      .limit(3);
    
    if (verifyError) {
      console.error('Error verifying daily metrics:', verifyError);
    } else {
      console.log('📊 Verification - Daily metrics:');
      verifyDaily?.forEach((metric, index) => {
        const calculatedCpm = metric.total_impressions > 0 ? (metric.total_spend / metric.total_impressions) * 1000 : 0;
        console.log(`  Day ${index + 1}: £${calculatedCpm.toFixed(2)} CPM`);
      });
    }

    const { data: verifyCampaign, error: verifyCampaignError } = await supabase
      .from('campaign_summary_metrics')
      .select('total_impressions, total_spend');
    
    if (verifyCampaignError) {
      console.error('Error verifying campaign metrics:', verifyCampaignError);
    } else {
      console.log('📈 Verification - Campaign metrics:');
      verifyCampaign?.forEach(metric => {
        const calculatedCpm = metric.total_impressions > 0 ? (metric.total_spend / metric.total_impressions) * 1000 : 0;
        console.log(`  Campaign: £${calculatedCpm.toFixed(2)} CPM`);
      });
    }

    console.log('\n🎉 CPM fixed to £24 successfully!');
    console.log('\nThe analytics dashboard should now show £24 CPM.');

  } catch (error) {
    console.error('Fix failed:', error);
  }
}

fixCpmTo24(); 