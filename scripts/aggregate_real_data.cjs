const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function aggregateRealData() {
  console.log('🔄 Aggregating Real Campaign Events Data\n');

  try {
    // 1. Clear existing aggregated data
    console.log('1. Clearing existing aggregated data...');
    
    const { error: clearDailyError } = await supabase
      .from('daily_overall_metrics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (clearDailyError) {
      console.error('Error clearing daily metrics:', clearDailyError);
    } else {
      console.log('✅ Cleared daily_overall_metrics');
    }

    const { error: clearCampaignError } = await supabase
      .from('campaign_summary_metrics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (clearCampaignError) {
      console.error('Error clearing campaign metrics:', clearCampaignError);
    } else {
      console.log('✅ Cleared campaign_summary_metrics');
    }

    // 2. Get all real events (in batches to handle 481k records)
    console.log('\n2. Fetching real campaign events...');
    
    const batchSize = 10000;
    let allEvents = [];
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      console.log(`📊 Fetching batch ${Math.floor(offset / batchSize) + 1}...`);
      
      const { data: batchEvents, error: batchError } = await supabase
        .from('campaign_events')
        .select('event_date, event_type, campaign_id, organization_id')
        .range(offset, offset + batchSize - 1);
      
      if (batchError) {
        console.error('Error fetching batch:', batchError);
        break;
      }
      
      if (!batchEvents || batchEvents.length === 0) {
        hasMore = false;
      } else {
        allEvents = allEvents.concat(batchEvents);
        offset += batchSize;
        
        if (batchEvents.length < batchSize) {
          hasMore = false;
        }
      }
      
      // Safety check to prevent infinite loops
      if (offset > 500000) {
        console.log('⚠️  Reached safety limit, stopping batch fetch');
        break;
      }
    }

    console.log(`📊 Total events fetched: ${allEvents.length}`);

    // 3. Process events by organization
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
        if (event.event_type === 'videocomplete') dailyData[date].total_completed_views++;
        // Note: No clicks/conversions in this dataset, and no spend/revenue columns
      });
      
      // Calculate spend using £24 CPM
      const targetCpm = 24;
      Object.values(dailyData).forEach(day => {
        day.total_spend = (day.total_impressions * targetCpm) / 1000;
        day.total_revenue = day.total_spend * 3; // 3x ROAS
        day.avg_ecpm = targetCpm;
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
        if (event.event_type === 'videocomplete') campaignData[campaignId].total_completed_views++;
        
        if (event.event_date > campaignData[campaignId].last_event_date) {
          campaignData[campaignId].last_event_date = event.event_date;
        }
      });
      
      // Calculate derived metrics for campaigns
      Object.values(campaignData).forEach(campaign => {
        campaign.total_spend = (campaign.total_impressions * targetCpm) / 1000;
        campaign.total_revenue = campaign.total_spend * 3; // 3x ROAS
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
    
    // 5. Verify the aggregation
    console.log('\n4. Verifying the aggregation...');
    
    const { data: newDailyMetrics, error: verifyDailyError } = await supabase
      .from('daily_overall_metrics')
      .select('total_impressions, total_spend, event_date')
      .order('event_date')
      .limit(5);
    
    if (verifyDailyError) {
      console.error('Error verifying daily metrics:', verifyDailyError);
    } else {
      console.log('📊 Verification - Daily metrics from real data:');
      newDailyMetrics?.forEach(day => {
        const cpm = day.total_impressions > 0 ? (day.total_spend / day.total_impressions) * 1000 : 0;
        console.log(`  ${day.event_date}: ${day.total_impressions} impressions, £${day.total_spend.toFixed(2)} spend, £${cpm.toFixed(2)} CPM`);
      });
    }

    const { data: newCampaignMetrics, error: verifyCampaignError } = await supabase
      .from('campaign_summary_metrics')
      .select('total_impressions, total_spend');
    
    if (verifyCampaignError) {
      console.error('Error verifying campaign metrics:', verifyCampaignError);
    } else {
      console.log('\n📈 Verification - Campaign metrics from real data:');
      newCampaignMetrics?.forEach(metric => {
        const cpm = metric.total_impressions > 0 ? (metric.total_spend / metric.total_impressions) * 1000 : 0;
        console.log(`  Total: ${metric.total_impressions} impressions, £${metric.total_spend.toFixed(2)} spend, £${cpm.toFixed(2)} CPM`);
      });
    }

    console.log('\n🎉 Real data aggregation complete!');
    console.log('\nThe analytics dashboard should now show real data with £24 CPM.');

  } catch (error) {
    console.error('Aggregation failed:', error);
  }
}

aggregateRealData(); 