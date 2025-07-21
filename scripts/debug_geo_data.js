const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODc1NjEsImV4cCI6MjA2Njk2MzU2MX0.4_iQjbkc73aAH3pISmlPPn_tKJHRlV7pkwA8yxMuXs8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugGeoData() {
  console.log('Fetching geo data from campaign_events...');
  
  // First, let's see how many records have geo data
  const { count, error: countError } = await supabase
    .from('campaign_events')
    .select('*', { count: 'exact', head: true })
    .not('geo', 'is', null)
    .neq('geo', '');

  if (countError) {
    console.error('Error counting geo records:', countError);
    return;
  }

  console.log(`Total records with geo data: ${count}`);

  // Now let's get some sample geo data
  const { data, error } = await supabase
    .from('campaign_events')
    .select('geo')
    .not('geo', 'is', null)
    .neq('geo', '')
    .limit(20);

  if (error) {
    console.error('Error fetching geo data:', error);
    return;
  }

  console.log('\nSample geo data:');
  data?.forEach((record, index) => {
    console.log(`${index + 1}. "${record.geo}" (type: ${typeof record.geo})`);
  });

  // Let's also check if there are any records with valid UK coordinates
  console.log('\nChecking for valid UK coordinates...');
  const ukRecords = data?.filter(record => {
    try {
      const [lat, lng] = record.geo.split(',').map(Number);
      return !isNaN(lat) && !isNaN(lng) && 
             lat >= 49.9 && lat <= 60.9 && 
             lng >= -8.2 && lng <= 1.8;
    } catch (err) {
      return false;
    }
  });

  console.log(`Records with valid UK coordinates: ${ukRecords?.length || 0}`);
  
  if (ukRecords && ukRecords.length > 0) {
    console.log('Sample UK coordinates:');
    ukRecords.slice(0, 5).forEach((record, index) => {
      const [lat, lng] = record.geo.split(',').map(Number);
      console.log(`${index + 1}. Lat: ${lat}, Lng: ${lng}`);
    });
  }
}

debugGeoData().catch(console.error); 