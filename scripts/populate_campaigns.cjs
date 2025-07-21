const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function populateCampaigns() {
  console.log('🚀 Populating Campaigns Table and Linking Data\n');

  try {
    // 1. Get unique campaign IDs from campaign_events
    console.log('1. Extracting unique campaign IDs from events...');
    
    let allCampaignIds = new Set();
    let from = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: events, error } = await supabase
        .from('campaign_events')
        .select('campaign_id, organization_id')
        .range(from, from + pageSize - 1);
      
      if (error || !events) {
        console.error('Error fetching campaign IDs:', error);
        break;
      }
      
      events.forEach(event => {
        if (event.campaign_id) {
          allCampaignIds.add(event.campaign_id);
        }
      });
      
      if (events.length < pageSize) {
        break;
      }
      
      from += pageSize;
    }
    
    const campaignIds = Array.from(allCampaignIds);
    console.log(`📊 Found ${campaignIds.length} unique campaign IDs`);
    
    if (campaignIds.length === 0) {
      console.log('No campaign IDs found in events data');
      return;
    }

    // 2. Get organization ID from events
    const { data: orgData, error: orgError } = await supabase
      .from('campaign_events')
      .select('organization_id')
      .limit(1);
    
    if (orgError || !orgData || orgData.length === 0) {
      console.error('Error getting organization ID:', orgError);
      return;
    }
    
    const organizationId = orgData[0].organization_id;
    console.log(`🏢 Using organization ID: ${organizationId}`);

    // 3. Create campaign records
    console.log('\n2. Creating campaign records...');
    
    const campaignsToInsert = campaignIds.map(campaignId => ({
      organization_id: organizationId,
      name: `Campaign ${campaignId.substring(0, 8)}`, // Use first 8 chars as name
      old_objectid: campaignId, // Store the original campaign_id here
      status: 'active',
      start_date: null, // Will be calculated from events
      end_date: null,   // Will be calculated from events
      advertiser: null,
      advertiser_url: null,
      advertiser_id: null,
      uuid_id: null
    }));

    // Insert campaigns
    const { data: insertedCampaigns, error: insertError } = await supabase
      .from('campaigns')
      .insert(campaignsToInsert)
      .select('id, name, old_objectid');
    
    if (insertError) {
      console.error('Error inserting campaigns:', insertError);
      return;
    }

    console.log(`✅ Inserted ${insertedCampaigns.length} campaigns`);

    // 4. Update campaign dates based on event data
    console.log('\n3. Updating campaign dates from event data...');
    
    for (const campaign of insertedCampaigns) {
      // Get date range for this campaign
      const { data: campaignEvents, error: dateError } = await supabase
        .from('campaign_events')
        .select('event_date')
        .eq('campaign_id', campaign.old_objectid)
        .order('event_date');
      
      if (dateError || !campaignEvents || campaignEvents.length === 0) {
        console.log(`⚠️  No events found for campaign ${campaign.name}`);
        continue;
      }
      
      const startDate = campaignEvents[0].event_date;
      const endDate = campaignEvents[campaignEvents.length - 1].event_date;
      
      // Update campaign with date range
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          start_date: startDate,
          end_date: endDate
        })
        .eq('id', campaign.id);
      
      if (updateError) {
        console.error(`Error updating dates for campaign ${campaign.name}:`, updateError);
      } else {
        console.log(`📅 Updated ${campaign.name}: ${startDate} to ${endDate}`);
      }
    }

    // 5. Update campaign_summary_metrics to use proper campaign names
    console.log('\n4. Updating campaign summary metrics with proper names...');
    
    const { data: allCampaigns, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, name, old_objectid');
    
    if (fetchError) {
      console.error('Error fetching campaigns:', fetchError);
      return;
    }
    
    // Create a mapping from old_objectid to campaign name
    const campaignNameMap = {};
    allCampaigns.forEach(campaign => {
      campaignNameMap[campaign.old_objectid] = campaign.name;
    });
    
    // Update campaign_summary_metrics
    for (const campaign of allCampaigns) {
      const { error: updateError } = await supabase
        .from('campaign_summary_metrics')
        .update({
          campaign_name: campaign.name
        })
        .eq('campaign_id', campaign.old_objectid);
      
      if (updateError) {
        console.error(`Error updating campaign name for ${campaign.old_objectid}:`, updateError);
      }
    }

    // 6. Verify the data
    console.log('\n5. Verifying the data...');
    
    const { data: campaignCount, error: countError } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting campaigns:', countError);
    } else {
      console.log(`📊 Total campaigns in database: ${campaignCount}`);
    }
    
    const { data: sampleCampaigns, error: sampleError } = await supabase
      .from('campaigns')
      .select('*')
      .limit(5);
    
    if (sampleError) {
      console.error('Error fetching sample campaigns:', sampleError);
    } else {
      console.log('\nSample campaigns:');
      sampleCampaigns.forEach(campaign => {
        console.log(`  - ${campaign.name} (${campaign.start_date} to ${campaign.end_date})`);
      });
    }

    console.log('\n🎉 Campaigns table populated successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your analytics code to use campaign names instead of IDs');
    console.log('2. Test the campaign filtering in your analytics dashboard');
    console.log('3. Consider adding more campaign metadata (advertiser, budget, etc.)');

  } catch (error) {
    console.error('Campaign population failed:', error);
  }
}

populateCampaigns().catch(console.error); 