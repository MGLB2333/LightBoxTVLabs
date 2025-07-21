const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODc1NjEsImV4cCI6MjA2Njk2MzU2MX0.4_iQjbkc73aAH3pISmlPPn_tKJHRlV7pkwA8yxMuXs8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSambaSample() {
  console.log('=== Checking Samba Sample Table ===\n');

  try {
    // Get a sample record to see the structure
    console.log('1. Getting sample record...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('samba_sample')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('Error fetching sample:', sampleError);
      return;
    }

    if (sampleData && sampleData.length > 0) {
      console.log('Table columns:', Object.keys(sampleData[0]));
      console.log('\nSample record:');
      console.log(JSON.stringify(sampleData[0], null, 2));
    } else {
      console.log('No data found in samba_sample table');
      return;
    }

    // Check for geographic columns
    console.log('\n2. Checking geographic data...');
    const { data: geoData, error: geoError } = await supabase
      .from('samba_sample')
      .select('postal_code, city, subdivision')
      .not('postal_code', 'is', null)
      .limit(10);

    if (geoError) {
      console.error('Error fetching geo data:', geoError);
    } else {
      console.log('Geographic data sample:', geoData);
    }

    // Check total count
    const { count, error: countError } = await supabase
      .from('samba_sample')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting records:', countError);
    } else {
      console.log(`\nTotal records in samba_sample: ${count}`);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkSambaSample(); 