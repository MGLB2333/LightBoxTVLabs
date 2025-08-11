// Using built-in fetch (Node.js 18+)

async function testBARBApi() {
  const baseUrl = 'https://barb-api.co.uk/api/v1';
  
  console.log('🔍 Testing BARB API endpoints...\n');
  
  // Test different possible endpoints for spots/commercials
  const endpoints = [
    '/advertising-spots/',
    '/advertising-spots',
    '/spots/',
    '/spots',
    '/spot/',
    '/spot',
    '/commercial/',
    '/commercial',
    '/commercials/',
    '/commercials',
    '/transmission/',
    '/transmission',
    '/broadcast/',
    '/broadcast',
    '/programme/',
    '/programme',
    '/programmes/',
    '/programmes',
    '/viewing/',
    '/viewing',
    '/audience/',
    '/audience',
    '/data/',
    '/data',
    '/',
    '/auth/token/',
    '/auth/',
    '/advertisers/',
    '/brands/',
    '/buyers/',
    '/stations/',
    '/channels/',
    '/campaigns/'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${baseUrl}${endpoint}`);
      const response = await fetch(`${baseUrl}${endpoint}`);
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const text = await response.text();
        console.log(`Response: ${text.substring(0, 200)}...`);
      } else if (response.status === 401) {
        console.log(`✅ Endpoint exists but requires authentication`);
      } else if (response.status === 405) {
        console.log(`✅ Endpoint exists but wrong method (try POST)`);
      }
      console.log('---');
    } catch (error) {
      console.log(`Error: ${error.message}`);
      console.log('---');
    }
  }
}

testBARBApi().catch(console.error); 