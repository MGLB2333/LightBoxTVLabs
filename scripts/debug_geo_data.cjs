const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODc1NjEsImV4cCI6MjA2Njk2MzU2MX0.4_iQjbkc73aAH3pISmlPPn_tKJHRlV7pkwA8yxMuXs8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugGeoData() {
  console.log('Checking campaign_events table structure...');
  
  // First, let's get a sample record to see the structure
  const { data: sampleData, error: sampleError } = await supabase
    .from('campaign_events')
    .select('*')
    .limit(1);

  if (sampleError) {
    console.error('Error fetching sample data:', sampleError);
    return;
  }

  if (sampleData && sampleData.length > 0) {
    console.log('Table columns:', Object.keys(sampleData[0]));
    console.log('Sample record:', JSON.stringify(sampleData[0], null, 2));
  }

  // Now let's check if geo column exists and has data
  const { data, error } = await supabase
    .from('campaign_events')
    .select('geo')
    .limit(10);

  if (error) {
    console.error('Error fetching geo data:', error);
    return;
  }

  console.log('\nGeo column data:');
  data?.forEach((record, index) => {
    console.log(`${index + 1}. geo: "${record.geo}" (type: ${typeof record.geo}, null: ${record.geo === null})`);
  });

  // Count non-null geo values
  const { count, error: countError } = await supabase
    .from('campaign_events')
    .select('geo', { count: 'exact', head: true })
    .not('geo', 'is', null);

  if (countError) {
    console.error('Error counting non-null geo records:', countError);
  } else {
    console.log(`\nRecords with non-null geo: ${count}`);
  }

  // Count non-empty geo values
  const { count: nonEmptyCount, error: nonEmptyError } = await supabase
    .from('campaign_events')
    .select('geo', { count: 'exact', head: true })
    .not('geo', 'is', null)
    .neq('geo', '');

  if (nonEmptyError) {
    console.error('Error counting non-empty geo records:', nonEmptyError);
  } else {
    console.log(`Records with non-empty geo: ${nonEmptyCount}`);
  }
}

debugGeoData().catch(console.error); 