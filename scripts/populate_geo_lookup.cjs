const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODc1NjEsImV4cCI6MjA2Njk2MzU2MX0.4_iQjbkc73aAH3pISmlPPn_tKJHRlV7pkwA8yxMuXs8';

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample UK postcode data with lat/lng coordinates
const samplePostcodes = [
  { "Postcode District": "N21", "Latitude": 51.6369, "Longitude": -0.1031, "Town/Area": "London", "Region": "Greater London" },
  { "Postcode District": "SO15", "Latitude": 50.9097, "Longitude": -1.4044, "Town/Area": "Southampton", "Region": "South East" },
  { "Postcode District": "DA1", "Latitude": 51.4567, "Longitude": 0.2123, "Town/Area": "Dartford", "Region": "South East" },
  { "Postcode District": "BT6", "Latitude": 54.5973, "Longitude": -5.9301, "Town/Area": "Belfast", "Region": "Northern Ireland" },
  { "Postcode District": "G22", "Latitude": 55.8642, "Longitude": -4.2518, "Town/Area": "Glasgow", "Region": "Scotland" },
  { "Postcode District": "GU11", "Latitude": 51.2489, "Longitude": -0.7633, "Town/Area": "Aldershot", "Region": "South East" },
  { "Postcode District": "WA7", "Latitude": 53.3274, "Longitude": -2.7162, "Town/Area": "Runcorn", "Region": "North West" },
  { "Postcode District": "LE11", "Latitude": 52.7719, "Longitude": -1.2278, "Town/Area": "Loughborough", "Region": "East Midlands" },
  { "Postcode District": "G78", "Latitude": 55.7939, "Longitude": -4.4044, "Town/Area": "Glasgow", "Region": "Scotland" },
  { "Postcode District": "HP2", "Latitude": 51.7539, "Longitude": -0.4734, "Town/Area": "Hemel Hempstead", "Region": "South East" },
  { "Postcode District": "BD10", "Latitude": 53.8315, "Longitude": -1.7278, "Town/Area": "Bradford", "Region": "Yorkshire and the Humber" },
  { "Postcode District": "SL4", "Latitude": 51.4795, "Longitude": -0.6494, "Town/Area": "Windsor", "Region": "South East" },
  { "Postcode District": "GL3", "Latitude": 51.8645, "Longitude": -2.2380, "Town/Area": "Gloucester", "Region": "South West" },
  { "Postcode District": "BH9", "Latitude": 50.7489, "Longitude": -1.8748, "Town/Area": "Bournemouth", "Region": "South West" },
  { "Postcode District": "CV3", "Latitude": 52.4068, "Longitude": -1.5197, "Town/Area": "Coventry", "Region": "West Midlands" },
  { "Postcode District": "CH3", "Latitude": 53.1934, "Longitude": -2.8931, "Town/Area": "Chester", "Region": "North West" },
  { "Postcode District": "HU5", "Latitude": 53.7443, "Longitude": -0.3325, "Town/Area": "Hull", "Region": "Yorkshire and the Humber" },
  { "Postcode District": "S26", "Latitude": 53.3667, "Longitude": -1.2833, "Town/Area": "Sheffield", "Region": "Yorkshire and the Humber" },
  { "Postcode District": "DT9", "Latitude": 50.9489, "Longitude": -2.5147, "Town/Area": "Sherborne", "Region": "South West" }
];

async function populateGeoLookup() {
  console.log('=== Populating Geo_lookup Table ===\n');

  try {
    // Insert the sample data
    const { data, error } = await supabase
      .from('Geo_lookup')
      .insert(samplePostcodes);

    if (error) {
      console.error('Error inserting data:', error);
      return;
    }

    console.log('Successfully inserted', samplePostcodes.length, 'postcode records');

    // Verify the data was inserted
    const { data: verifyData, error: verifyError } = await supabase
      .from('Geo_lookup')
      .select('"Postcode District", "Latitude", "Longitude"')
      .limit(5);

    if (verifyError) {
      console.error('Error verifying data:', verifyError);
    } else {
      console.log('\nVerification - first 5 records:');
      console.log(verifyData);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

populateGeoLookup().catch(console.error); 