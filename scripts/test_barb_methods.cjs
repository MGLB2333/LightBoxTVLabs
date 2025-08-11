// Test different HTTP methods and query parameters for BARB API

// Load environment variables
require('dotenv').config();

async function testBARBMethods() {
  const baseUrl = 'https://barb-api.co.uk/api/v1';
  
  console.log('🔍 Testing different HTTP methods and parameters...\n');
  
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
    
    // Test different approaches
    const testCases = [
      // Test POST method for spot-events
      {
        url: `${baseUrl}/spot-events/`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          advertiser_name: 'TUI UK',
          date: '2025-08-05'
        })
      },
      // Test with query parameters
      {
        url: `${baseUrl}/advertisers/?advertiser_name=TUI UK`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      },
      // Test with different content type
      {
        url: `${baseUrl}/spot-events/`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        }
      },
      // Test with different endpoint structure
      {
        url: `${baseUrl}/data/spot-events/`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      },
      // Test with commercial number
      {
        url: `${baseUrl}/advertisers/?commercial_numbers=RSLPSNV003030`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\nTest ${i + 1}: ${testCase.method} ${testCase.url}`);
      
      try {
        const response = await fetch(testCase.url, {
          method: testCase.method,
          headers: testCase.headers,
          body: testCase.body
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
      console.log('---');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testBARBMethods().catch(console.error); 