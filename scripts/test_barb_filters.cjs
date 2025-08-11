// Test different filter combinations to see what data is available

// Load environment variables
require('dotenv').config();

async function testBARBFilters() {
  const baseUrl = 'https://barb-api.co.uk/api/v1';
  
  console.log('🔍 Testing different filter combinations...\n');
  
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
    
    // Test different filter combinations
    const testCases = [
      {
        name: 'No filters (all data)',
        params: {
          min_transmission_date: '2025-08-05',
          max_transmission_date: '2025-08-05'
        }
      },
      {
        name: 'TUI UK advertiser',
        params: {
          min_transmission_date: '2025-08-05',
          max_transmission_date: '2025-08-05',
          advertiser_name: 'TUI UK'
        }
      },
      {
        name: 'TUI advertiser (without UK)',
        params: {
          min_transmission_date: '2025-08-05',
          max_transmission_date: '2025-08-05',
          advertiser_name: 'TUI'
        }
      },
      {
        name: 'Different date (2025-08-01)',
        params: {
          min_transmission_date: '2025-08-01',
          max_transmission_date: '2025-08-01'
        }
      },
      {
        name: 'Different date (2025-08-04)',
        params: {
          min_transmission_date: '2025-08-04',
          max_transmission_date: '2025-08-04'
        }
      },
      {
        name: 'Date range (2025-08-01 to 2025-08-05)',
        params: {
          min_transmission_date: '2025-08-01',
          max_transmission_date: '2025-08-05'
        }
      },
      {
        name: 'WAVEMAKER agency',
        params: {
          min_transmission_date: '2025-08-05',
          max_transmission_date: '2025-08-05',
          buyer_name: 'WAVEMAKER LIMITED'
        }
      },
      {
        name: 'WAVEMAKER agency (without LIMITED)',
        params: {
          min_transmission_date: '2025-08-05',
          max_transmission_date: '2025-08-05',
          buyer_name: 'WAVEMAKER'
        }
      }
    ];
    
    for (const testCase of testCases) {
      try {
        console.log(`\n🔍 Testing: ${testCase.name}`);
        
        const url = new URL(`${baseUrl}/advertising_spots/`);
        Object.entries(testCase.params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
        
        console.log(`URL: ${url.toString()}`);
        
        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          const eventCount = data.events ? data.events.length : 0;
          console.log(`✅ Found ${eventCount} events`);
          
          if (eventCount > 0) {
            console.log(`First event: ${JSON.stringify(data.events[0], null, 2)}`);
          }
        } else {
          const errorText = await response.text();
          console.log(`❌ Error: ${errorText}`);
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

testBARBFilters().catch(console.error); 