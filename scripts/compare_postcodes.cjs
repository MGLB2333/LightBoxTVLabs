const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODc1NjEsImV4cCI6MjA2Njk2MzU2MX0.4_iQjbkc73aAH3pISmlPPn_tKJHRlV7pkwA8yxMuXs8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function comparePostcodes() {
  // Get unique postcodes from campaign_events
  const { data: eventPostcodes, error: eventError } = await supabase
    .from('campaign_events')
    .select('geo')
    .not('geo', 'is', null)
    .neq('geo', '')
    .limit(50);

  if (eventError) {
    console.error('Error fetching campaign_events:', eventError);
    return;
  }

  const eventGeoSet = new Set(eventPostcodes.map(e => (e.geo || '').trim()));
  console.log('Sample campaign_events.geo:', Array.from(eventGeoSet).slice(0, 10));

  // Get unique postcode districts from Geo_lookup
  const { data: lookupPostcodes, error: lookupError } = await supabase
    .from('Geo_lookup')
    .select('"Postcode District"')
    .limit(50);

  if (lookupError) {
    console.error('Error fetching Geo_lookup:', lookupError);
    return;
  }

  const lookupSet = new Set(lookupPostcodes.map(e => (e["Postcode District"] || '').trim()));
  console.log('Sample Geo_lookup."Postcode District":', Array.from(lookupSet).slice(0, 10));

  // Check for overlap
  const matches = Array.from(eventGeoSet).filter(pc => lookupSet.has(pc));
  console.log(`\nMatching postcodes (first 10):`, matches.slice(0, 10));
  console.log(`Total matches: ${matches.length} / ${eventGeoSet.size}`);
}

comparePostcodes().catch(console.error); 