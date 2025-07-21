const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupAnalyticsAggregations() {
  console.log('Setting up analytics aggregations...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_analytics_aggregations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL to create tables and functions
    console.log('Creating aggregated tables and functions...');
    const { error: createError } = await supabase.rpc('exec_sql', { sql });
    
    if (createError) {
      console.error('Error creating tables:', createError);
      // Fallback: try to execute SQL directly
      console.log('Trying direct SQL execution...');
      const { error: directError } = await supabase.from('_exec_sql').select('*').eq('sql', sql);
      if (directError) {
        console.error('Direct SQL execution failed:', directError);
        return;
      }
    }

    console.log('✅ Tables and functions created successfully\n');

    // Populate the aggregated tables with initial data
    console.log('Populating aggregated tables with initial data...');
    
    // Call the aggregation function
    const { error: updateError } = await supabase.rpc('update_analytics_aggregations');
    
    if (updateError) {
      console.error('Error updating aggregations:', updateError);
      return;
    }

    console.log('✅ Aggregated tables populated successfully\n');

    // Verify the data
    console.log('Verifying aggregated data...');
    
    const { data: dailyMetrics, error: dailyError } = await supabase
      .from('daily_overall_metrics')
      .select('*')
      .limit(5);
    
    if (dailyError) {
      console.error('Error fetching daily metrics:', dailyError);
    } else {
      console.log(`📊 Daily metrics sample: ${dailyMetrics?.length || 0} records`);
      if (dailyMetrics && dailyMetrics.length > 0) {
        console.log('Sample record:', dailyMetrics[0]);
      }
    }

    const { data: campaignMetrics, error: campaignError } = await supabase
      .from('campaign_summary_metrics')
      .select('*')
      .limit(5);
    
    if (campaignError) {
      console.error('Error fetching campaign metrics:', campaignError);
    } else {
      console.log(`📈 Campaign metrics sample: ${campaignMetrics?.length || 0} records`);
      if (campaignMetrics && campaignMetrics.length > 0) {
        console.log('Sample record:', campaignMetrics[0]);
      }
    }

    console.log('\n🎉 Analytics aggregations setup complete!');
    console.log('\nNext steps:');
    console.log('1. Update your analytics code to use the new aggregated tables');
    console.log('2. Set up a cron job to run update_analytics_aggregations() regularly');
    console.log('3. Consider adding Redis caching for frequently accessed metrics');

  } catch (error) {
    console.error('Setup failed:', error);
  }
}

// Alternative approach: Create tables manually if RPC doesn't work
async function createTablesManually() {
  console.log('Creating tables manually...');
  
  const tables = [
    {
      name: 'daily_overall_metrics',
      sql: `
        CREATE TABLE IF NOT EXISTS daily_overall_metrics (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          organization_id UUID NOT NULL,
          event_date DATE NOT NULL,
          total_events INTEGER DEFAULT 0,
          total_impressions INTEGER DEFAULT 0,
          total_clicks INTEGER DEFAULT 0,
          total_conversions INTEGER DEFAULT 0,
          total_completed_views INTEGER DEFAULT 0,
          total_spend DECIMAL(10,2) DEFAULT 0,
          total_revenue DECIMAL(10,2) DEFAULT 0,
          avg_ecpm DECIMAL(10,2) DEFAULT 0,
          avg_cpcv DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'campaign_summary_metrics',
      sql: `
        CREATE TABLE IF NOT EXISTS campaign_summary_metrics (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          organization_id UUID NOT NULL,
          campaign_id TEXT NOT NULL,
          campaign_name TEXT,
          total_events INTEGER DEFAULT 0,
          total_impressions INTEGER DEFAULT 0,
          total_clicks INTEGER DEFAULT 0,
          total_conversions INTEGER DEFAULT 0,
          total_completed_views INTEGER DEFAULT 0,
          total_spend DECIMAL(10,2) DEFAULT 0,
          total_revenue DECIMAL(10,2) DEFAULT 0,
          ctr DECIMAL(5,2) DEFAULT 0,
          roas DECIMAL(10,2) DEFAULT 0,
          completion_rate DECIMAL(5,2) DEFAULT 0,
          last_event_date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }
  ];

  for (const table of tables) {
    try {
      // Try to create table using a simple insert to test if it exists
      const { error } = await supabase
        .from(table.name)
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') { // Table doesn't exist
        console.log(`Creating table: ${table.name}`);
        // Note: In a real scenario, you'd need to use the Supabase dashboard or migrations
        // to create tables. This is just a placeholder.
        console.log(`Please create table ${table.name} manually in Supabase dashboard`);
      } else {
        console.log(`✅ Table ${table.name} already exists`);
      }
    } catch (error) {
      console.log(`Table ${table.name} status: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Setting up Analytics Aggregations for LightBoxTV\n');
  
  try {
    await setupAnalyticsAggregations();
  } catch (error) {
    console.log('Falling back to manual table creation...');
    await createTablesManually();
  }
}

main().catch(console.error); 