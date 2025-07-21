const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function populateAggregatedTables() {
  console.log('🚀 Populating Aggregated Analytics Tables\n');

  try {
    // First, let's check if the tables exist and create them if needed
    console.log('1. Checking/creating aggregated tables...');
    
    // Check if daily_overall_metrics exists
    const { error: dailyCheck } = await supabase
      .from('daily_overall_metrics')
      .select('id')
      .limit(1);
    
    if (dailyCheck && dailyCheck.code === '42P01') {
      console.log('❌ daily_overall_metrics table does not exist');
      console.log('Please create the table manually in Supabase dashboard with this SQL:');
      console.log(`
        CREATE TABLE daily_overall_metrics (
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
      `);
      return;
    }

    // Check if campaign_summary_metrics exists
    const { error: campaignCheck } = await supabase
      .from('campaign_summary_metrics')
      .select('id')
      .limit(1);
    
    if (campaignCheck && campaignCheck.code === '42P01') {
      console.log('❌ campaign_summary_metrics table does not exist');
      console.log('Please create the table manually in Supabase dashboard with this SQL:');
      console.log(`
        CREATE TABLE campaign_summary_metrics (
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
      `);
      return;
    }

    console.log('✅ Tables exist, proceeding with population...\n');

    // 2. Get a sample of campaign_events to understand the data structure
    console.log('2. Analyzing campaign_events data...');
    const { data: sampleEvents, error: sampleError } = await supabase
      .from('campaign_events')
      .select('*')
      .limit(1000);
    
    if (sampleError) {
      console.error('Error fetching sample events:', sampleError);
      return;
    }

    console.log(`📊 Sample size: ${sampleEvents.length} events`);
    
    // Count event types in sample
    const eventTypeCounts = {};
    sampleEvents.forEach(event => {
      const type = event.event_type;
      eventTypeCounts[type] = (eventTypeCounts[type] || 0) + 1;
    });
    
    console.log('Event type distribution in sample:');
    Object.entries(eventTypeCounts).forEach(([type, count]) => {
      const percentage = ((count / sampleEvents.length) * 100).toFixed(1);
      console.log(`  ${type}: ${count} (${percentage}%)`);
    });

    // 3. Get unique organization IDs
    const { data: orgs, error: orgError } = await supabase
      .from('campaign_events')
      .select('organization_id')
      .limit(1000);
    
    if (orgError) {
      console.error('Error fetching organizations:', orgError);
      return;
    }

    const uniqueOrgs = [...new Set(orgs.map(o => o.organization_id))];
    console.log(`\n🏢 Found ${uniqueOrgs.length} unique organizations`);

    // 4. For each organization, calculate daily metrics
    console.log('\n3. Calculating daily metrics for each organization...');
    
    for (const orgId of uniqueOrgs) {
      console.log(`Processing organization: ${orgId}`);
      
      // Get all events for this organization (paginated)
      let allOrgEvents = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data: events, error } = await supabase
          .from('campaign_events')
          .select('*')
          .eq('organization_id', orgId)
          .range(from, from + pageSize - 1);
        
        if (error || !events) {
          console.error(`Error fetching events for org ${orgId}:`, error);
          break;
        }
        
        allOrgEvents = allOrgEvents.concat(events);
        
        if (events.length < pageSize) {
          break;
        }
        
        from += pageSize;
      }
      
      console.log(`  📈 Found ${allOrgEvents.length.toLocaleString()} events`);
      
      if (allOrgEvents.length === 0) continue;
      
      // Group by date
      const dailyData = {};
      allOrgEvents.forEach(event => {
        const date = event.event_date;
        if (!dailyData[date]) {
          dailyData[date] = {
            organization_id: orgId,
            event_date: date,
            total_events: 0,
            total_impressions: 0,
            total_clicks: 0,
            total_conversions: 0,
            total_completed_views: 0,
            total_spend: 0,
            total_revenue: 0
          };
        }
        
        dailyData[date].total_events++;
        
        if (event.event_type === 'impression') dailyData[date].total_impressions++;
        if (event.event_type === 'click') dailyData[date].total_clicks++;
        if (event.event_type === 'conversion') dailyData[date].total_conversions++;
        if (event.event_type === 'videocomplete') dailyData[date].total_completed_views++;
        if (event.spend) dailyData[date].total_spend += parseFloat(event.spend) || 0;
        if (event.revenue) dailyData[date].total_revenue += parseFloat(event.revenue) || 0;
      });
      
      // Calculate derived metrics
      Object.values(dailyData).forEach(day => {
        day.avg_ecpm = day.total_impressions > 0 ? (day.total_spend / day.total_impressions) * 1000 : 0;
        day.avg_cpcv = day.total_completed_views > 0 ? day.total_spend / day.total_completed_views : 0;
      });
      
      // Insert daily metrics
      const dailyMetrics = Object.values(dailyData);
      const { error: insertError } = await supabase
        .from('daily_overall_metrics')
        .upsert(dailyMetrics, { onConflict: 'organization_id,event_date' });
      
      if (insertError) {
        console.error(`Error inserting daily metrics for org ${orgId}:`, insertError);
      } else {
        console.log(`  ✅ Inserted ${dailyMetrics.length} daily metrics`);
      }
      
      // Calculate campaign summary metrics
      const campaignData = {};
      allOrgEvents.forEach(event => {
        const campaignId = event.campaign_id || 'unknown';
        if (!campaignData[campaignId]) {
          campaignData[campaignId] = {
            organization_id: orgId,
            campaign_id: campaignId,
            campaign_name: campaignId,
            total_events: 0,
            total_impressions: 0,
            total_clicks: 0,
            total_conversions: 0,
            total_completed_views: 0,
            total_spend: 0,
            total_revenue: 0,
            last_event_date: event.event_date
          };
        }
        
        campaignData[campaignId].total_events++;
        
        if (event.event_type === 'impression') campaignData[campaignId].total_impressions++;
        if (event.event_type === 'click') campaignData[campaignId].total_clicks++;
        if (event.event_type === 'conversion') campaignData[campaignId].total_conversions++;
        if (event.event_type === 'videocomplete') campaignData[campaignId].total_completed_views++;
        if (event.spend) campaignData[campaignId].total_spend += parseFloat(event.spend) || 0;
        if (event.revenue) campaignData[campaignId].total_revenue += parseFloat(event.revenue) || 0;
        
        if (event.event_date > campaignData[campaignId].last_event_date) {
          campaignData[campaignId].last_event_date = event.event_date;
        }
      });
      
      // Calculate derived metrics for campaigns
      Object.values(campaignData).forEach(campaign => {
        campaign.ctr = campaign.total_impressions > 0 ? (campaign.total_clicks / campaign.total_impressions) * 100 : 0;
        campaign.roas = campaign.total_spend > 0 ? campaign.total_revenue / campaign.total_spend : 0;
        campaign.completion_rate = campaign.total_impressions > 0 ? (campaign.total_completed_views / campaign.total_impressions) * 100 : 0;
      });
      
      // Insert campaign metrics
      const campaignMetrics = Object.values(campaignData);
      const { error: campaignInsertError } = await supabase
        .from('campaign_summary_metrics')
        .upsert(campaignMetrics, { onConflict: 'organization_id,campaign_id' });
      
      if (campaignInsertError) {
        console.error(`Error inserting campaign metrics for org ${orgId}:`, campaignInsertError);
      } else {
        console.log(`  ✅ Inserted ${campaignMetrics.length} campaign metrics`);
      }
    }
    
    console.log('\n🎉 Aggregated tables populated successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your analytics code to use the new aggregated tables');
    console.log('2. Set up a scheduled job to refresh these tables regularly');
    console.log('3. Test the performance improvement in your analytics dashboard');

  } catch (error) {
    console.error('Population failed:', error);
  }
}

populateAggregatedTables().catch(console.error); 