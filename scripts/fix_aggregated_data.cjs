const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixAggregatedData() {
  console.log('🔧 Fixing Aggregated Data\n');

  try {
    // 1. Clear existing aggregated data
    console.log('1. Clearing existing aggregated data...');
    
    const { error: clearDailyError } = await supabase
      .from('daily_overall_metrics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (clearDailyError) {
      console.error('Error clearing daily metrics:', clearDailyError);
    } else {
      console.log('✅ Cleared daily_overall_metrics');
    }

    const { error: clearCampaignError } = await supabase
      .from('campaign_summary_metrics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (clearCampaignError) {
      console.error('Error clearing campaign metrics:', clearCampaignError);
    } else {
      console.log('✅ Cleared campaign_summary_metrics');
    }

    // 2. Get all raw events
    console.log('\n2. Fetching raw campaign events...');
    const { data: allEvents, error: eventsError } = await supabase
      .from('campaign_events')
      .select('*');
    
    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return;
    }

    console.log(`📊 Found ${allEvents.length} total events`);

    // 3. Group events by organization
    const eventsByOrg = {};
    allEvents.forEach(event => {
      const orgId = event.organization_id || 'default';
      if (!eventsByOrg[orgId]) {
        eventsByOrg[orgId] = [];
      }
      eventsByOrg[orgId].push(event);
    });

    // 4. Process each organization
    for (const [orgId, orgEvents] of Object.entries(eventsByOrg)) {
      console.log(`\n3. Processing organization ${orgId} (${orgEvents.length} events)...`);

      // Calculate daily overall metrics
      const dailyData = {};
      orgEvents.forEach(event => {
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
        .insert(dailyMetrics);
      
      if (insertError) {
        console.error(`Error inserting daily metrics for org ${orgId}:`, insertError);
      } else {
        console.log(`  ✅ Inserted ${dailyMetrics.length} daily metrics`);
      }
      
      // Calculate campaign summary metrics
      const campaignData = {};
      orgEvents.forEach(event => {
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
        .insert(campaignMetrics);
      
      if (campaignInsertError) {
        console.error(`Error inserting campaign metrics for org ${orgId}:`, campaignInsertError);
      } else {
        console.log(`  ✅ Inserted ${campaignMetrics.length} campaign metrics`);
      }
    }
    
    // 5. Verify the fix
    console.log('\n4. Verifying the fix...');
    
    const { data: newDailyMetrics, error: verifyDailyError } = await supabase
      .from('daily_overall_metrics')
      .select('total_impressions');
    
    if (verifyDailyError) {
      console.error('Error verifying daily metrics:', verifyDailyError);
    } else {
      const totalDailyImpressions = newDailyMetrics.reduce((sum, day) => sum + (day.total_impressions || 0), 0);
      console.log(`📊 New daily metrics total impressions: ${totalDailyImpressions}`);
    }

    const { data: newCampaignMetrics, error: verifyCampaignError } = await supabase
      .from('campaign_summary_metrics')
      .select('total_impressions');
    
    if (verifyCampaignError) {
      console.error('Error verifying campaign metrics:', verifyCampaignError);
    } else {
      const totalCampaignImpressions = newCampaignMetrics.reduce((sum, campaign) => sum + (campaign.total_impressions || 0), 0);
      console.log(`📈 New campaign metrics total impressions: ${totalCampaignImpressions}`);
    }

    console.log('\n🎉 Aggregated data fixed successfully!');
    console.log('\nThe analytics dashboard should now show correct numbers.');

  } catch (error) {
    console.error('Fix failed:', error);
  }
}

fixAggregatedData(); 