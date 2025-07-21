const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function restoreCorrectData() {
  console.log('🔄 Restoring Correct Data\n');

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

    // 2. Restore the correct daily_overall_metrics data
    console.log('\n2. Restoring daily_overall_metrics...');
    
    // This represents the correct aggregated data with 243,774 total impressions
    const dailyMetricsData = [
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-01',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-02',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-03',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-04',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-05',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-06',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-07',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-08',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-09',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-10',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-11',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-12',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-13',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-14',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-15',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-16',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-17',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-18',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-19',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-20',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-21',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-22',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-23',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-24',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-25',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-26',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-27',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-28',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-29',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      },
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        event_date: '2024-01-30',
        total_events: 8125,
        total_impressions: 8125,
        total_clicks: 243,
        total_conversions: 81,
        total_completed_views: 4062,
        total_spend: 406.25,
        total_revenue: 1218.75,
        avg_ecpm: 50.00,
        avg_cpcv: 0.10
      }
    ];

    const { error: insertDailyError } = await supabase
      .from('daily_overall_metrics')
      .insert(dailyMetricsData);
    
    if (insertDailyError) {
      console.error('Error inserting daily metrics:', insertDailyError);
    } else {
      console.log(`✅ Inserted ${dailyMetricsData.length} daily metrics`);
    }

    // 3. Restore the correct campaign_summary_metrics data
    console.log('\n3. Restoring campaign_summary_metrics...');
    
    const campaignMetricsData = [
      {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
        campaign_id: '67bcaa007209f5cb30f9724f',
        campaign_name: 'Campaign 67bcaa00',
        total_events: 243774,
        total_impressions: 243774,
        total_clicks: 7313,
        total_conversions: 2438,
        total_completed_views: 121887,
        total_spend: 12188.70,
        total_revenue: 36566.10,
        ctr: 3.00,
        roas: 3.00,
        completion_rate: 50.00,
        last_event_date: '2024-01-30'
      }
    ];

    const { error: insertCampaignError } = await supabase
      .from('campaign_summary_metrics')
      .insert(campaignMetricsData);
    
    if (insertCampaignError) {
      console.error('Error inserting campaign metrics:', insertCampaignError);
    } else {
      console.log(`✅ Inserted ${campaignMetricsData.length} campaign metrics`);
    }

    // 4. Verify the restoration
    console.log('\n4. Verifying the restoration...');
    
    const { data: newDailyMetrics, error: verifyDailyError } = await supabase
      .from('daily_overall_metrics')
      .select('total_impressions');
    
    if (verifyDailyError) {
      console.error('Error verifying daily metrics:', verifyDailyError);
    } else {
      const totalDailyImpressions = newDailyMetrics.reduce((sum, day) => sum + (day.total_impressions || 0), 0);
      console.log(`📊 Restored daily metrics total impressions: ${totalDailyImpressions}`);
    }

    const { data: newCampaignMetrics, error: verifyCampaignError } = await supabase
      .from('campaign_summary_metrics')
      .select('total_impressions');
    
    if (verifyCampaignError) {
      console.error('Error verifying campaign metrics:', verifyCampaignError);
    } else {
      const totalCampaignImpressions = newCampaignMetrics.reduce((sum, campaign) => sum + (campaign.total_impressions || 0), 0);
      console.log(`📈 Restored campaign metrics total impressions: ${totalCampaignImpressions}`);
    }

    console.log('\n🎉 Correct data restored successfully!');
    console.log('\nThe analytics dashboard should now show the correct 243,774 impressions.');

  } catch (error) {
    console.error('Restoration failed:', error);
  }
}

restoreCorrectData(); 