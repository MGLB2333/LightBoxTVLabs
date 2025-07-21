const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testTVIntelligence() {
  console.log('=== Testing TV Intelligence Service ===\n');

  const orgId = '16bb4799-c3b2-44c9-87a0-1d253bc83c15';
  const campaignId = '67bcaa007209f5cb30f9724f';

  try {
    // 1. Test campaigns loading
    console.log('1. Testing campaigns loading...');
    
    // Get campaigns from campaigns table
    const { data: campaignsData, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, advertiser, start_date, end_date, old_objectid')
      .eq('organization_id', orgId);

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
    } else {
      console.log('Campaigns found:', campaignsData?.length);
      campaignsData?.forEach(campaign => {
        console.log(`  - ID: ${campaign.id}`);
        console.log(`    Name: ${campaign.name}`);
        console.log(`    Old Object ID: ${campaign.old_objectid}`);
        console.log('    ---');
      });
    }

    // 2. Test campaign events
    console.log('\n2. Testing campaign events...');
    const { data: eventsData, error: eventsError } = await supabase
      .from('campaign_events')
      .select('geo, event_type, event_date')
      .eq('organization_id', orgId)
      .eq('campaign_id', campaignId)
      .not('geo', 'is', null)
      .neq('geo', '');

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
    } else {
      console.log('Events found:', eventsData?.length);
      if (eventsData && eventsData.length > 0) {
        console.log('Sample events:');
        eventsData.slice(0, 5).forEach(event => {
          console.log(`  - Geo: ${event.geo}, Type: ${event.event_type}, Date: ${event.event_date}`);
        });
      }
    }

    // 3. Test geo lookup
    if (eventsData && eventsData.length > 0) {
      console.log('\n3. Testing geo lookup...');
      const postcodes = [...new Set(eventsData.map(e => e.geo).filter(Boolean))];
      console.log('Unique postcodes:', postcodes.length, postcodes.slice(0, 5));

      const { data: geoData, error: geoError } = await supabase
        .from('Geo_lookup')
        .select('"Postcode District", "Latitude", "Longitude", "Region", "Town"')
        .in('"Postcode District"', postcodes);

      if (geoError) {
        console.error('Error fetching geo data:', geoError);
      } else {
        console.log('Geo data found:', geoData?.length);
        if (geoData && geoData.length > 0) {
          console.log('Sample geo data:');
          geoData.slice(0, 3).forEach(geo => {
            console.log(`  - Postcode: ${geo["Postcode District"]}`);
            console.log(`    Lat: ${geo.Latitude}, Lng: ${geo.Longitude}`);
            console.log(`    Region: ${geo.Region}, Town: ${geo.Town}`);
            console.log('    ---');
          });
        }
      }
    }

    // 4. Test summary metrics
    console.log('\n4. Testing summary metrics...');
    const { data: metricsData, error: metricsError } = await supabase
      .from('campaign_summary_metrics')
      .select('*')
      .eq('organization_id', orgId)
      .eq('campaign_id', campaignId);

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError);
    } else {
      console.log('Metrics found:', metricsData?.length);
      if (metricsData && metricsData.length > 0) {
        const metric = metricsData[0];
        console.log('  - Campaign ID:', metric.campaign_id);
        console.log('  - Total Impressions:', metric.total_impressions);
        console.log('  - Total Events:', metric.total_events);
        console.log('  - Total Spend:', metric.total_spend);
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testTVIntelligence(); 