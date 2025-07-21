const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function investigateImpressions() {
  console.log('🔍 Investigating impression count discrepancy...\n');
  
  try {
    // Check total count of campaign_events
    console.log('1. Checking total campaign_events count...');
    const { count: totalEvents, error: countError } = await supabase
      .from('campaign_events')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error getting total count:', countError);
      return;
    }
    
    console.log(`✅ Total campaign_events records: ${totalEvents.toLocaleString()}`);
    
    // Check event types distribution
    console.log('\n2. Checking event types distribution...');
    const { data: eventTypes, error: eventTypesError } = await supabase
      .from('campaign_events')
      .select('event_type')
      .limit(10000);
    
    if (eventTypesError) {
      console.error('❌ Error getting event types:', eventTypesError);
      return;
    }
    
    const eventTypeCounts = {};
    eventTypes.forEach(event => {
      eventTypeCounts[event.event_type] = (eventTypeCounts[event.event_type] || 0) + 1;
    });
    
    console.log('Event type distribution (sample):', eventTypeCounts);
    
    // Check impressions specifically
    console.log('\n3. Checking impression events...');
    const { count: impressionCount, error: impressionError } = await supabase
      .from('campaign_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'impression');
    
    if (impressionError) {
      console.error('❌ Error getting impression count:', impressionError);
      return;
    }
    
    console.log(`✅ Total impression events: ${impressionCount.toLocaleString()}`);
    
    // Check completions
    console.log('\n4. Checking completion events...');
    const { count: completionCount, error: completionError } = await supabase
      .from('campaign_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'videocomplete');
    
    if (completionError) {
      console.error('❌ Error getting completion count:', completionError);
      return;
    }
    
    console.log(`✅ Total completion events: ${completionCount.toLocaleString()}`);
    
    // Check geo distribution
    console.log('\n5. Checking geo distribution...');
    const { data: geoData, error: geoError } = await supabase
      .from('campaign_events')
      .select('geo, event_type')
      .not('geo', 'is', null)
      .neq('geo', '')
      .limit(10000);
    
    if (geoError) {
      console.error('❌ Error getting geo data:', geoError);
      return;
    }
    
    const geoCounts = {};
    geoData.forEach(event => {
      if (!geoCounts[event.geo]) {
        geoCounts[event.geo] = { impressions: 0, completions: 0 };
      }
      
      if (event.event_type === 'impression') {
        geoCounts[event.geo].impressions++;
      } else if (event.event_type === 'videocomplete') {
        geoCounts[event.geo].completions++;
      }
    });
    
    console.log(`✅ Found ${Object.keys(geoCounts).length} unique postcode districts with geo data`);
    
    // Calculate totals from geo data
    const totalImpressionsFromGeo = Object.values(geoCounts).reduce((sum, geo) => sum + geo.impressions, 0);
    const totalCompletionsFromGeo = Object.values(geoCounts).reduce((sum, geo) => sum + geo.completions, 0);
    
    console.log(`✅ Total impressions from geo data: ${totalImpressionsFromGeo.toLocaleString()}`);
    console.log(`✅ Total completions from geo data: ${totalCompletionsFromGeo.toLocaleString()}`);
    
    // Check if there are events without geo data
    console.log('\n6. Checking events without geo data...');
    const { count: noGeoCount, error: noGeoError } = await supabase
      .from('campaign_events')
      .select('*', { count: 'exact', head: true })
      .or('geo.is.null,geo.eq.')
      .eq('event_type', 'impression');
    
    if (noGeoError) {
      console.error('❌ Error getting no-geo count:', noGeoError);
      return;
    }
    
    console.log(`✅ Impressions without geo data: ${noGeoCount.toLocaleString()}`);
    
    // Check date range
    console.log('\n7. Checking date range...');
    const { data: dateData, error: dateError } = await supabase
      .from('campaign_events')
      .select('event_date')
      .order('event_date', { ascending: true })
      .limit(1000);
    
    if (dateError) {
      console.error('❌ Error getting date data:', dateError);
      return;
    }
    
    const dates = [...new Set(dateData.map(event => event.event_date))].sort();
    console.log(`✅ Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
    console.log(`✅ Total unique dates: ${dates.length}`);
    
    // Check if there's a limit issue
    console.log('\n8. Testing with higher limits...');
    const { data: highLimitData, error: highLimitError } = await supabase
      .from('campaign_events')
      .select('geo, event_type')
      .not('geo', 'is', null)
      .neq('geo', '')
      .limit(100000);
    
    if (highLimitError) {
      console.error('❌ Error with high limit:', highLimitError);
      return;
    }
    
    console.log(`✅ Retrieved ${highLimitData.length} records with 100k limit`);
    
    // Recalculate with high limit data
    const highLimitGeoCounts = {};
    highLimitData.forEach(event => {
      if (!highLimitGeoCounts[event.geo]) {
        highLimitGeoCounts[event.geo] = { impressions: 0, completions: 0 };
      }
      
      if (event.event_type === 'impression') {
        highLimitGeoCounts[event.geo].impressions++;
      } else if (event.event_type === 'videocomplete') {
        highLimitGeoCounts[event.geo].completions++;
      }
    });
    
    const highLimitImpressions = Object.values(highLimitGeoCounts).reduce((sum, geo) => sum + geo.impressions, 0);
    const highLimitCompletions = Object.values(highLimitGeoCounts).reduce((sum, geo) => sum + geo.completions, 0);
    
    console.log(`✅ High limit - Total impressions: ${highLimitImpressions.toLocaleString()}`);
    console.log(`✅ High limit - Total completions: ${highLimitCompletions.toLocaleString()}`);
    console.log(`✅ High limit - Unique postcodes: ${Object.keys(highLimitGeoCounts).length}`);
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`Total campaign_events: ${totalEvents.toLocaleString()}`);
    console.log(`Total impressions: ${impressionCount.toLocaleString()}`);
    console.log(`Total completions: ${completionCount.toLocaleString()}`);
    console.log(`Impressions with geo data (10k limit): ${totalImpressionsFromGeo.toLocaleString()}`);
    console.log(`Impressions with geo data (100k limit): ${highLimitImpressions.toLocaleString()}`);
    console.log(`Impressions without geo data: ${noGeoCount.toLocaleString()}`);
    
    const missingImpressions = impressionCount - highLimitImpressions - noGeoCount;
    console.log(`Missing impressions (unaccounted): ${missingImpressions.toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

investigateImpressions().catch(console.error); 