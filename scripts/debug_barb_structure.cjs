require('dotenv').config();

async function debugBARBStructure() {
  try {
    // First authenticate
    const authResponse = await fetch('https://barb-api.co.uk/api/v1/auth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: process.env.BARB_USERNAME,
        password: process.env.BARB_PASSWORD,
      }),
    });

    if (!authResponse.ok) {
      throw new Error(`Auth failed: ${authResponse.status} ${authResponse.statusText}`);
    }

    const authData = await authResponse.json();
    const accessToken = authData.access;

    console.log('✅ Authenticated successfully');

    // Get a sample of advertising spots
    const spotsResponse = await fetch('https://barb-api.co.uk/api/v1/advertising_spots/?min_transmission_date=2025-08-01&max_transmission_date=2025-08-01&page=1&page_size=5', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!spotsResponse.ok) {
      throw new Error(`Spots request failed: ${spotsResponse.status} ${spotsResponse.statusText}`);
    }

    const spotsData = await spotsResponse.json();
    
    console.log('\n📊 BARB API Response Structure:');
    console.log('Response keys:', Object.keys(spotsData));
    
    if (spotsData.events && spotsData.events.length > 0) {
      const firstSpot = spotsData.events[0];
      console.log('\n🔍 First spot structure:');
      console.log('Top-level keys:', Object.keys(firstSpot));
      
      if (firstSpot.clearcast_information) {
        console.log('\n📺 Clearcast information keys:', Object.keys(firstSpot.clearcast_information));
        console.log('Programme title field:', firstSpot.clearcast_information.programme_title);
        console.log('Programme name field:', firstSpot.clearcast_information.programme_name);
        console.log('Programme field:', firstSpot.clearcast_information.programme);
      }
      
      if (firstSpot.station) {
        console.log('\n📡 Station keys:', Object.keys(firstSpot.station));
      }
      
      if (firstSpot.audience) {
        console.log('\n👥 Audience keys:', Object.keys(firstSpot.audience));
      }
      
      // Look for any programme-related fields
      console.log('\n🔍 Searching for programme-related fields...');
      const searchForProgramme = (obj, path = '') => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          if (typeof value === 'string' && key.toLowerCase().includes('programme')) {
            console.log(`Found programme field: ${currentPath} = "${value}"`);
          } else if (typeof value === 'object' && value !== null) {
            searchForProgramme(value, currentPath);
          }
        }
      };
      
      searchForProgramme(firstSpot);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugBARBStructure(); 