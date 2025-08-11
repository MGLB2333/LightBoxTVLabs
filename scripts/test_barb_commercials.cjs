// Test getting spot data using commercial numbers

// Load environment variables
require('dotenv').config();

async function testCommercialNumbers() {
  const baseUrl = 'https://barb-api.co.uk/api/v1';
  
  console.log('🔍 Testing commercial numbers approach...\n');
  
  try {
    // First authenticate
    const authResponse = await fetch(`${baseUrl}/auth/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: process.env.VITE_BARB_EMAIL,
        password: process.env.VITE_BARB_PASSWORD,
      }),
    });
    
    if (!authResponse.ok) {
      console.log('❌ Authentication failed');
      return;
    }
    
    const authData = await authResponse.json();
    const accessToken = authData.access;
    
    // Get advertisers to see commercial numbers
    const advertisersResponse = await fetch(`${baseUrl}/advertisers/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (advertisersResponse.ok) {
      const advertisers = await advertisersResponse.json();
      console.log(`Found ${advertisers.length} advertisers`);
      
      // Look for advertisers with commercial numbers
      const advertisersWithCommercials = advertisers.filter(adv => 
        adv.commercial_numbers && adv.commercial_numbers.length > 0
      );
      
      console.log(`Found ${advertisersWithCommercials.length} advertisers with commercial numbers`);
      
      if (advertisersWithCommercials.length > 0) {
        const testAdvertiser = advertisersWithCommercials[0];
        console.log(`\nTesting with advertiser: ${testAdvertiser.advertiser_name}`);
        console.log(`Commercial numbers: ${testAdvertiser.commercial_numbers.join(', ')}`);
        
        // Try to get data for a specific commercial number
        const testCommercialNumber = testAdvertiser.commercial_numbers[0];
        
        // Test different endpoints with commercial number
        const testEndpoints = [
          `/commercial/${testCommercialNumber}/`,
          `/commercial/${testCommercialNumber}`,
          `/spot/${testCommercialNumber}/`,
          `/spot/${testCommercialNumber}`,
          `/transmission/${testCommercialNumber}/`,
          `/transmission/${testCommercialNumber}`,
          `/broadcast/${testCommercialNumber}/`,
          `/broadcast/${testCommercialNumber}`,
          `/data/${testCommercialNumber}/`,
          `/data/${testCommercialNumber}`,
          `/advertiser/${testAdvertiser.advertiser_name}/commercials/`,
          `/advertiser/${testAdvertiser.advertiser_name}/commercials`,
          `/advertiser/${testAdvertiser.advertiser_name}/spots/`,
          `/advertiser/${testAdvertiser.advertiser_name}/spots`
        ];
        
        for (const endpoint of testEndpoints) {
          try {
            console.log(`\nTesting: ${baseUrl}${endpoint}`);
            const response = await fetch(`${baseUrl}${endpoint}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });
            
            console.log(`Status: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
              const text = await response.text();
              console.log(`✅ Success! Response: ${text.substring(0, 300)}...`);
            } else if (response.status === 404) {
              console.log(`❌ Endpoint not found`);
            } else {
              const errorText = await response.text();
              console.log(`Error: ${errorText}`);
            }
          } catch (error) {
            console.log(`Error: ${error.message}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCommercialNumbers().catch(console.error); 