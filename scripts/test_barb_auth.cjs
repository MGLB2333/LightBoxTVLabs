// Test BARB API authentication and explore endpoints

// Load environment variables
require('dotenv').config();

async function testBARBAuth() {
  const baseUrl = 'https://barb-api.co.uk/api/v1';
  
  console.log('🔐 Testing BARB API authentication...\n');
  
  // Get credentials from environment
  const email = process.env.VITE_BARB_EMAIL;
  const password = process.env.VITE_BARB_PASSWORD;
  
  if (!email || !password) {
    console.log('❌ BARB credentials not found in environment variables');
    console.log('Please set VITE_BARB_EMAIL and VITE_BARB_PASSWORD');
    return;
  }
  
  try {
    console.log(`🔐 Authenticating with email: ${email}`);
    
    const authResponse = await fetch(`${baseUrl}/auth/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });
    
    console.log(`Auth Status: ${authResponse.status} ${authResponse.statusText}`);
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('✅ Authentication successful!');
      console.log('Access token received');
      
      // Now test authenticated endpoints
      const accessToken = authData.access;
      
      console.log('\n🔍 Testing authenticated endpoints...\n');
      
      const authenticatedEndpoints = [
        '/advertisers/',
        '/buyers/',
        '/stations/',
        '/advertising-spots/',
        '/spots/',
        '/commercial/',
        '/transmission/',
        '/broadcast/',
        '/programme/',
        '/viewing/',
        '/audience/',
        '/data/',
        '/commercials/',
        '/spot/',
        '/spot-data/',
        '/spot-data',
        '/commercial-data/',
        '/commercial-data',
        '/transmission-data/',
        '/transmission-data',
        '/broadcast-data/',
        '/broadcast-data',
        '/viewing-data/',
        '/viewing-data',
        '/audience-data/',
        '/audience-data',
        '/campaign/',
        '/campaigns/',
        '/campaign-data/',
        '/campaign-data',
        '/brand/',
        '/brands/',
        '/brand-data/',
        '/brand-data'
      ];
      
      for (const endpoint of authenticatedEndpoints) {
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
            console.log(`Response: ${text.substring(0, 300)}...`);
          } else if (response.status === 404) {
            console.log(`❌ Endpoint not found`);
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
      
    } else {
      const errorText = await authResponse.text();
      console.log(`❌ Authentication failed: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Authentication error:', error);
  }
}

testBARBAuth().catch(console.error); 