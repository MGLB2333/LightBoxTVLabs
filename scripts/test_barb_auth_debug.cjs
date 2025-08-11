// Test BARB API authentication with detailed debugging

// Load environment variables
require('dotenv').config();

async function testBARBAuthDebug() {
  const baseUrl = 'https://barb-api.co.uk/api/v1';
  
  console.log('🔍 Testing BARB API authentication with debugging...\n');
  
  // Check environment variables
  console.log('Environment variables:');
  console.log('VITE_BARB_EMAIL:', process.env.VITE_BARB_EMAIL ? 'Present' : 'Missing');
  console.log('VITE_BARB_PASSWORD:', process.env.VITE_BARB_PASSWORD ? 'Present' : 'Missing');
  console.log('');
  
  try {
    console.log('🔐 Attempting authentication...');
    
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
    
    console.log(`Auth Status: ${authResponse.status} ${authResponse.statusText}`);
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('✅ Authentication successful!');
      console.log('Access token received:', authData.access ? 'Yes' : 'No');
      console.log('Refresh token received:', authData.refresh ? 'Yes' : 'No');
      
      const accessToken = authData.access;
      
      // Test the advertising_spots endpoint with authentication
      console.log('\n🔍 Testing /advertising_spots with authentication...');
      const testUrl = new URL(`${baseUrl}/advertising_spots/`);
      testUrl.searchParams.append('min_transmission_date', '2025-08-05');
      testUrl.searchParams.append('max_transmission_date', '2025-08-05');
      testUrl.searchParams.append('advertiser_name', 'TUI UK');
      
      console.log(`Test URL: ${testUrl.toString()}`);
      
      const testResponse = await fetch(testUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`Test Status: ${testResponse.status} ${testResponse.statusText}`);
      
      if (testResponse.ok) {
        const text = await testResponse.text();
        console.log(`✅ Success! Response: ${text.substring(0, 500)}...`);
      } else {
        const errorText = await testResponse.text();
        console.log(`❌ Error: ${errorText}`);
      }
      
    } else {
      const errorText = await authResponse.text();
      console.log(`❌ Authentication failed: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testBARBAuthDebug().catch(console.error); 