const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkCpmValues() {
  console.log('🔍 Checking CPM Values\n');

  try {
    // Check daily_overall_metrics CPM values
    console.log('1. Checking daily_overall_metrics CPM values...');
    const { data: dailyMetrics, error: dailyError } = await supabase
      .from('daily_overall_metrics')
      .select('total_impressions, total_spend, avg_ecpm')
      .limit(5);
    
    if (dailyError) {
      console.error('Error fetching daily metrics:', dailyError);
    } else {
      console.log(`📊 Found ${dailyMetrics?.length || 0} daily metrics:`);
      dailyMetrics?.forEach((metric, index) => {
        const calculatedCpm = metric.total_impressions > 0 ? (metric.total_spend / metric.total_impressions) * 1000 : 0;
        console.log(`  Day ${index + 1}:`);
        console.log(`    Impressions: ${metric.total_impressions}`);
        console.log(`    Spend: £${metric.total_spend}`);
        console.log(`    Stored CPM: £${metric.avg_ecpm}`);
        console.log(`    Calculated CPM: £${calculatedCpm.toFixed(2)}`);
        console.log('    ---');
      });
    }

    // Check campaign_summary_metrics
    console.log('\n2. Checking campaign_summary_metrics...');
    const { data: campaignMetrics, error: campaignError } = await supabase
      .from('campaign_summary_metrics')
      .select('total_impressions, total_spend');
    
    if (campaignError) {
      console.error('Error fetching campaign metrics:', campaignError);
    } else {
      console.log(`📈 Found ${campaignMetrics?.length || 0} campaign metrics:`);
      campaignMetrics?.forEach(metric => {
        const calculatedCpm = metric.total_impressions > 0 ? (metric.total_spend / metric.total_impressions) * 1000 : 0;
        console.log(`  Campaign:`);
        console.log(`    Impressions: ${metric.total_impressions}`);
        console.log(`    Spend: £${metric.total_spend}`);
        console.log(`    Calculated CPM: £${calculatedCpm.toFixed(2)}`);
        console.log('    ---');
      });
    }

    // Check what the correct CPM should be
    console.log('\n3. Calculating correct CPM...');
    const totalImpressions = 243774;
    const totalSpend = 12188.70;
    const correctCpm = (totalSpend / totalImpressions) * 1000;
    console.log(`   Total impressions: ${totalImpressions}`);
    console.log(`   Total spend: £${totalSpend}`);
    console.log(`   Correct CPM: £${correctCpm.toFixed(2)}`);

  } catch (error) {
    console.error('Check failed:', error);
  }
}

checkCpmValues(); 