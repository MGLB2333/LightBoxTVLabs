// Test getting detailed data from advertisers and explore other endpoints

// Load environment variables
require('dotenv').config();

async function testBARBDetailed() {
  const baseUrl = 'https://barb-api.co.uk/api/v1';
  
  console.log('🔍 Testing detailed data retrieval...\n');
  
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
    
    console.log('✅ Authentication successful!');
    
    // Test getting TUI UK advertiser data
    console.log('\n🔍 Getting TUI UK advertiser data...');
    const tuiResponse = await fetch(`${baseUrl}/advertisers/?advertiser_name=TUI UK`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (tuiResponse.ok) {
      const tuiData = await tuiResponse.json();
      console.log(`Found ${tuiData.length} TUI UK advertisers`);
      
      if (tuiData.length > 0) {
        const tuiAdvertiser = tuiData[0];
        console.log('TUI UK advertiser data:', JSON.stringify(tuiAdvertiser, null, 2));
        
        if (tuiAdvertiser.commercial_numbers && tuiAdvertiser.commercial_numbers.length > 0) {
          console.log(`\n🔍 Testing commercial number: ${tuiAdvertiser.commercial_numbers[0]}`);
          
          // Test different endpoints with the commercial number
          const commercialNumber = tuiAdvertiser.commercial_numbers[0];
          const testEndpoints = [
            `/commercial/${commercialNumber}/`,
            `/commercial/${commercialNumber}`,
            `/spot/${commercialNumber}/`,
            `/spot/${commercialNumber}`,
            `/transmission/${commercialNumber}/`,
            `/transmission/${commercialNumber}`,
            `/broadcast/${commercialNumber}/`,
            `/broadcast/${commercialNumber}`,
            `/data/${commercialNumber}/`,
            `/data/${commercialNumber}`,
            `/events/${commercialNumber}/`,
            `/events/${commercialNumber}`,
            `/spot-events/${commercialNumber}/`,
            `/spot-events/${commercialNumber}`,
            `/viewing/${commercialNumber}/`,
            `/viewing/${commercialNumber}`,
            `/audience/${commercialNumber}/`,
            `/audience/${commercialNumber}`,
            `/impacts/${commercialNumber}/`,
            `/impacts/${commercialNumber}`,
            `/tvr/${commercialNumber}/`,
            `/tvr/${commercialNumber}`,
            `/cpt/${commercialNumber}/`,
            `/cpt/${commercialNumber}`,
            `/duration/${commercialNumber}/`,
            `/duration/${commercialNumber}`,
            `/daypart/${commercialNumber}/`,
            `/daypart/${commercialNumber}`,
            `/region/${commercialNumber}/`,
            `/region/${commercialNumber}`,
            `/audience-segment/${commercialNumber}/`,
            `/audience-segment/${commercialNumber}`,
            `/clearance-status/${commercialNumber}/`,
            `/clearance-status/${commercialNumber}`,
            `/spot-type/${commercialNumber}/`,
            `/spot-type/${commercialNumber}`,
            `/spot-number/${commercialNumber}/`,
            `/spot-number/${commercialNumber}`,
            `/broadcaster-spot-number/${commercialNumber}/`,
            `/broadcaster-spot-number/${commercialNumber}`,
            `/commercial-number/${commercialNumber}/`,
            `/commercial-number/${commercialNumber}`,
            `/clearcast-advertiser-name/${commercialNumber}/`,
            `/clearcast-advertiser-name/${commercialNumber}`,
            `/clearcast-buyer-name/${commercialNumber}/`,
            `/clearcast-buyer-name/${commercialNumber}`,
            `/station-name/${commercialNumber}/`,
            `/station-name/${commercialNumber}`,
            `/programme-title/${commercialNumber}/`,
            `/programme-title/${commercialNumber}`,
            `/date-of-transmission/${commercialNumber}/`,
            `/date-of-transmission/${commercialNumber}`,
            `/time-of-transmission/${commercialNumber}/`,
            `/time-of-transmission/${commercialNumber}`,
            `/audience-size-hundreds/${commercialNumber}/`,
            `/audience-size-hundreds/${commercialNumber}`,
            `/audience-target-size-hundreds/${commercialNumber}/`,
            `/audience-target-size-hundreds/${commercialNumber}`
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
              } else if (response.status === 401) {
                console.log(`🔒 Requires authentication`);
              } else if (response.status === 405) {
                console.log(`⚠️ Method not allowed`);
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
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testBARBDetailed().catch(console.error); 