// Test BARB API endpoints with required parameters

// Load environment variables
require('dotenv').config();

async function testBARBWithParams() {
  const baseUrl = 'https://barb-api.co.uk/api/v1';
  
  console.log('✅ Testing BARB API endpoints with required parameters...\n');
  
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
    
    // Test advertising_spots with required date parameters
    console.log('\n🔍 Testing /advertising_spots with date parameters...');
    const advertisingSpotsUrl = new URL(`${baseUrl}/advertising_spots`);
    advertisingSpotsUrl.searchParams.append('min_transmission_date', '2025-08-05');
    advertisingSpotsUrl.searchParams.append('max_transmission_date', '2025-08-05');
    advertisingSpotsUrl.searchParams.append('advertiser_name', 'TUI UK');
    
    console.log(`URL: ${advertisingSpotsUrl.toString()}`);
    
    const advertisingSpotsResponse = await fetch(advertisingSpotsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Status: ${advertisingSpotsResponse.status} ${advertisingSpotsResponse.statusText}`);
    
    if (advertisingSpotsResponse.ok) {
      const text = await advertisingSpotsResponse.text();
      console.log(`✅ Success! Response: ${text.substring(0, 500)}...`);
    } else {
      const errorText = await advertisingSpotsResponse.text();
      console.log(`Error: ${errorText}`);
    }
    
    // Test spot_schedule with required date parameters
    console.log('\n🔍 Testing /spot_schedule with date parameters...');
    const spotScheduleUrl = new URL(`${baseUrl}/spot_schedule`);
    spotScheduleUrl.searchParams.append('min_scheduled_date', '2025-08-05');
    spotScheduleUrl.searchParams.append('max_scheduled_date', '2025-08-05');
    spotScheduleUrl.searchParams.append('station_name', 'ITV1');
    
    console.log(`URL: ${spotScheduleUrl.toString()}`);
    
    const spotScheduleResponse = await fetch(spotScheduleUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Status: ${spotScheduleResponse.status} ${spotScheduleResponse.statusText}`);
    
    if (spotScheduleResponse.ok) {
      const text = await spotScheduleResponse.text();
      console.log(`✅ Success! Response: ${text.substring(0, 500)}...`);
    } else {
      const errorText = await spotScheduleResponse.text();
      console.log(`Error: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testBARBWithParams().catch(console.error); 