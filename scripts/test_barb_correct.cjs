// Test the correct BARB API endpoints

// Load environment variables
require('dotenv').config();

async function testBARBCorrect() {
  const baseUrl = 'https://barb-api.co.uk/api/v1';
  
  console.log('✅ Testing correct BARB API endpoints...\n');
  
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
    
    // Test the correct endpoints
    const correctEndpoints = [
      '/advertising_spots',
      '/spot_schedule',
      '/async-batch/advertising_spots',
      '/async-batch/spot_audience'
    ];
    
    for (const endpoint of correctEndpoints) {
      try {
        console.log(`\n🔍 Testing: ${baseUrl}${endpoint}`);
        
        // For GET endpoints, test with basic request
        if (endpoint.startsWith('/advertising_spots') || endpoint.startsWith('/spot_schedule')) {
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
            console.log(`⚠️ Method not allowed (try POST)`);
          } else {
            const errorText = await response.text();
            console.log(`Error: ${errorText}`);
          }
        } else {
          // For POST endpoints, test with POST method
          console.log(`Testing POST method for ${endpoint}`);
          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              advertiser: 'TUI UK',
              date: '2025-08-05'
            })
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
        }
        
      } catch (error) {
        console.log(`Error: ${error.message}`);
      }
      console.log('---');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testBARBCorrect().catch(console.error); 