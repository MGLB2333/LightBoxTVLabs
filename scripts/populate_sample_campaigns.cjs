const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function populateSampleCampaigns() {
  console.log('🚀 Populating Sample TV Campaign Data\n');

  try {
    // Get organization ID
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    
    if (orgError || !orgData || orgData.length === 0) {
      console.error('Error getting organization:', orgError);
      return;
    }
    
    const organizationId = orgData[0].id;
    console.log(`🏢 Using organization ID: ${organizationId}`);

    // Sample campaign data
    const sampleCampaigns = [
      {
        organization_id: organizationId,
        name: 'TUI Summer 2025',
        advertiser_name: 'TUI UK',
        brand_name: 'TUI HOLIDAYS',
        agency_name: 'WAVEMAKER LIMITED',
        start_date: '2025-06-01',
        end_date: '2025-08-31',
        total_budget: 2500000.00,
        status: 'active'
      },
      {
        organization_id: organizationId,
        name: 'TransPennine Rail Travel',
        advertiser_name: 'TRANSPENNINE EXPRESS',
        brand_name: 'FIRST TRANSPENNINE EXPRESS',
        agency_name: 'WAVEMAKER LIMITED',
        start_date: '2025-07-01',
        end_date: '2025-09-30',
        total_budget: 1200000.00,
        status: 'active'
      },
      {
        organization_id: organizationId,
        name: 'McDonalds Family Meals',
        advertiser_name: 'MCDONALDS',
        brand_name: 'MCDONALDS UK',
        agency_name: 'OMD UK',
        start_date: '2025-05-01',
        end_date: '2025-12-31',
        total_budget: 3500000.00,
        status: 'active'
      }
    ];

    // Insert campaigns
    console.log('📝 Inserting sample campaigns...');
    const { data: insertedCampaigns, error: insertError } = await supabase
      .from('tv_campaigns')
      .insert(sampleCampaigns)
      .select('id, name');

    if (insertError) {
      console.error('Error inserting campaigns:', insertError);
      return;
    }

    console.log(`✅ Inserted ${insertedCampaigns.length} campaigns`);

    // Sample plan data for the first campaign
    if (insertedCampaigns.length > 0) {
      const firstCampaignId = insertedCampaigns[0].id;
      
      const samplePlans = [
        {
          campaign_id: firstCampaignId,
          supplier_name: 'ITV Sales',
          group_name: 'MIDWEST',
          buying_audience: 'Adult',
          value_pot: 1250000.00,
          universe: 8500000,
          network_universe: 12500000,
          plan_tvr: 45.2,
          deal_tvr: 42.8,
          plan_value: 450000.00,
          budget: 450000.00,
          cpt: 12.50,
          sec: 30
        },
        {
          campaign_id: firstCampaignId,
          supplier_name: 'ITV Sales',
          group_name: 'CARLTON',
          buying_audience: 'HP+Child',
          value_pot: 980000.00,
          universe: 7200000,
          network_universe: 10800000,
          plan_tvr: 38.7,
          deal_tvr: 36.2,
          plan_value: 387000.00,
          budget: 387000.00,
          cpt: 15.20,
          sec: 25
        },
        {
          campaign_id: firstCampaignId,
          supplier_name: 'Sky Media UK Sales',
          group_name: 'SKY ONE',
          buying_audience: 'Adult',
          value_pot: 2100000.00,
          universe: 15000000,
          network_universe: 18000000,
          plan_tvr: 68.4,
          deal_tvr: 64.2,
          plan_value: 684000.00,
          budget: 684000.00,
          cpt: 8.90,
          sec: 40
        },
        {
          campaign_id: firstCampaignId,
          supplier_name: 'Channel 4',
          group_name: 'CHANNEL 4',
          buying_audience: 'Adult',
          value_pot: 1650000.00,
          universe: 11000000,
          network_universe: 13500000,
          plan_tvr: 54.2,
          deal_tvr: 50.8,
          plan_value: 542000.00,
          budget: 542000.00,
          cpt: 9.85,
          sec: 35
        }
      ];

      console.log('📋 Inserting sample campaign plans...');
      const { data: insertedPlans, error: plansError } = await supabase
        .from('tv_campaign_plans')
        .insert(samplePlans)
        .select('id, supplier_name, group_name');

      if (plansError) {
        console.error('Error inserting plans:', plansError);
      } else {
        console.log(`✅ Inserted ${insertedPlans.length} campaign plans`);
      }

      // Sample actual data
      const sampleActuals = [
        {
          campaign_id: firstCampaignId,
          supplier_name: 'ITV Sales',
          group_name: 'MIDWEST',
          date: '2025-08-05',
          actual_tvr: 43.1,
          actual_value: 431000.00,
          spots_count: 15,
          impacts: 2150000
        },
        {
          campaign_id: firstCampaignId,
          supplier_name: 'ITV Sales',
          group_name: 'CARLTON',
          date: '2025-08-05',
          actual_tvr: 37.5,
          actual_value: 375000.00,
          spots_count: 12,
          impacts: 1800000
        },
        {
          campaign_id: firstCampaignId,
          supplier_name: 'Sky Media UK Sales',
          group_name: 'SKY ONE',
          date: '2025-08-05',
          actual_tvr: 66.8,
          actual_value: 668000.00,
          spots_count: 8,
          impacts: 3200000
        },
        {
          campaign_id: firstCampaignId,
          supplier_name: 'Channel 4',
          group_name: 'CHANNEL 4',
          date: '2025-08-05',
          actual_tvr: 52.1,
          actual_value: 521000.00,
          spots_count: 10,
          impacts: 2600000
        }
      ];

      console.log('📊 Inserting sample actual data...');
      const { data: insertedActuals, error: actualsError } = await supabase
        .from('tv_campaign_actuals')
        .insert(sampleActuals)
        .select('id, supplier_name, group_name');

      if (actualsError) {
        console.error('Error inserting actuals:', actualsError);
      } else {
        console.log(`✅ Inserted ${insertedActuals.length} actual records`);
      }
    }

    console.log('\n🎉 Sample data population completed!');
    console.log('\n📋 Created:');
    console.log(`  - ${insertedCampaigns.length} campaigns`);
    console.log('  - Sample campaign plans');
    console.log('  - Sample actual TVR data');
    console.log('\n🔗 You can now test the Plan Reconciliation feature in the app!');

  } catch (error) {
    console.error('❌ Error populating sample data:', error);
  }
}

// Run the population
populateSampleCampaigns(); 