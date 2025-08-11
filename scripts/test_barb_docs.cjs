// Test BARB API endpoints based on the official documentation

// Load environment variables
require('dotenv').config();

async function testBARBDocs() {
  const baseUrl = 'https://barb-api.co.uk/api/v1';
  
  console.log('📚 Testing BARB API endpoints from documentation...\n');
  
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
    
    // Test endpoints based on the documentation
    const documentedEndpoints = [
      '/spot-events/',
      '/spot-events',
      '/spot-event/',
      '/spot-event',
      '/events/',
      '/events',
      '/event/',
      '/event',
      '/spot-events/advertiser/',
      '/spot-events/station/',
      '/spot-events/date/',
      '/spot-events/commercial/',
      '/spot-events/buyer/',
      '/spot-events/brand/',
      '/spot-events/campaign/',
      '/spot-events/programme/',
      '/spot-events/transmission/',
      '/spot-events/broadcast/',
      '/spot-events/viewing/',
      '/spot-events/audience/',
      '/spot-events/impacts/',
      '/spot-events/tvr/',
      '/spot-events/cpt/',
      '/spot-events/duration/',
      '/spot-events/daypart/',
      '/spot-events/region/',
      '/spot-events/audience-segment/',
      '/spot-events/clearance-status/',
      '/spot-events/spot-type/',
      '/spot-events/spot-number/',
      '/spot-events/broadcaster-spot-number/',
      '/spot-events/commercial-number/',
      '/spot-events/clearcast-advertiser-name/',
      '/spot-events/clearcast-buyer-name/',
      '/spot-events/station-name/',
      '/spot-events/programme-title/',
      '/spot-events/date-of-transmission/',
      '/spot-events/time-of-transmission/',
      '/spot-events/audience-size-hundreds/',
      '/spot-events/audience-target-size-hundreds/'
    ];
    
    for (const endpoint of documentedEndpoints) {
      try {
        console.log(`Testing: ${baseUrl}${endpoint}`);
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
          console.log(`⚠️ Wrong method (try POST/PUT/DELETE)`);
        } else {
          const errorText = await response.text();
          console.log(`Error: ${errorText}`);
        }
        console.log('---');
      } catch (error) {
        console.log(`Error: ${error.message}`);
        console.log('---');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testBARBDocs().catch(console.error); 