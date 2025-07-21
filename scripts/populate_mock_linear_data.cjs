const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Mock linear TV data - postcodes that were reached by linear TV
const mockLinearData = [
  { postcode: 'E1', city: 'London', impressions: 15000, network: 'ITV', advertiser: 'Mock Brand 1', brand: 'Brand A', daypart: '6-9pm', duration: 30 },
  { postcode: 'M18', city: 'Manchester', impressions: 12000, network: 'BBC One', advertiser: 'Mock Brand 2', brand: 'Brand B', daypart: '6-9pm', duration: 30 },
  { postcode: 'SE11', city: 'London', impressions: 18000, network: 'Channel 4', advertiser: 'Mock Brand 3', brand: 'Brand C', daypart: '6-9pm', duration: 30 },
  { postcode: 'LU4', city: 'Luton', impressions: 8000, network: 'ITV', advertiser: 'Mock Brand 4', brand: 'Brand D', daypart: '6-9pm', duration: 30 },
  { postcode: 'PL5', city: 'Plymouth', impressions: 6000, network: 'BBC One', advertiser: 'Mock Brand 5', brand: 'Brand E', daypart: '6-9pm', duration: 30 },
  { postcode: 'CM1', city: 'Chelmsford', impressions: 9000, network: 'Channel 4', advertiser: 'Mock Brand 6', brand: 'Brand F', daypart: '6-9pm', duration: 30 },
  { postcode: 'TF4', city: 'Telford', impressions: 7000, network: 'ITV', advertiser: 'Mock Brand 7', brand: 'Brand G', daypart: '6-9pm', duration: 30 },
  { postcode: 'ME1', city: 'Rochester', impressions: 11000, network: 'BBC One', advertiser: 'Mock Brand 8', brand: 'Brand H', daypart: '6-9pm', duration: 30 },
  { postcode: 'PE29', city: 'Huntingdon', impressions: 5000, network: 'Channel 4', advertiser: 'Mock Brand 9', brand: 'Brand I', daypart: '6-9pm', duration: 30 },
  { postcode: 'LL11', city: 'Wrexham', impressions: 4000, network: 'ITV', advertiser: 'Mock Brand 10', brand: 'Brand J', daypart: '6-9pm', duration: 30 },
  { postcode: 'HG4', city: 'Ripon', impressions: 3000, network: 'BBC One', advertiser: 'Mock Brand 11', brand: 'Brand K', daypart: '6-9pm', duration: 30 },
  { postcode: 'CW5', city: 'Nantwich', impressions: 6500, network: 'Channel 4', advertiser: 'Mock Brand 12', brand: 'Brand L', daypart: '6-9pm', duration: 30 },
  { postcode: 'EH4', city: 'Edinburgh', impressions: 9500, network: 'ITV', advertiser: 'Mock Brand 13', brand: 'Brand M', daypart: '6-9pm', duration: 30 },
  { postcode: 'NE32', city: 'South Shields', impressions: 8500, network: 'BBC One', advertiser: 'Mock Brand 14', brand: 'Brand N', daypart: '6-9pm', duration: 30 },
  { postcode: 'G12', city: 'Glasgow', impressions: 13000, network: 'Channel 4', advertiser: 'Mock Brand 15', brand: 'Brand O', daypart: '6-9pm', duration: 30 },
  { postcode: 'TS6', city: 'Middlesbrough', impressions: 7500, network: 'ITV', advertiser: 'Mock Brand 16', brand: 'Brand P', daypart: '6-9pm', duration: 30 },
  { postcode: 'DE22', city: 'Derby', impressions: 5500, network: 'BBC One', advertiser: 'Mock Brand 17', brand: 'Brand Q', daypart: '6-9pm', duration: 30 },
  { postcode: 'ST4', city: 'Stoke-on-Trent', impressions: 7000, network: 'Channel 4', advertiser: 'Mock Brand 18', brand: 'Brand R', daypart: '6-9pm', duration: 30 },
  { postcode: 'B61', city: 'Bromsgrove', impressions: 8000, network: 'ITV', advertiser: 'Mock Brand 19', brand: 'Brand S', daypart: '6-9pm', duration: 30 },
  { postcode: 'CB1', city: 'Cambridge', impressions: 10000, network: 'BBC One', advertiser: 'Mock Brand 20', brand: 'Brand T', daypart: '6-9pm', duration: 30 }
];

async function populateMockLinearData() {
  console.log('=== Populating Mock Linear TV Data ===\n');

  try {
    // Check if samba_sample table exists and has data
    const { data: existingData, error: checkError } = await supabase
      .from('samba_sample')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('Error checking samba_sample table:', checkError);
      return;
    }

    if (existingData && existingData.length > 0) {
      console.log('samba_sample table already has data. Skipping population.');
      return;
    }

    console.log('Populating samba_sample table with mock linear TV data...');

    // Insert mock data
    const { data, error } = await supabase
      .from('samba_sample')
      .insert(mockLinearData.map(item => ({
        _id: `mock_${Math.random().toString(36).substr(2, 9)}`,
        smba_id: `smba_${Math.random().toString(36).substr(2, 9)}`,
        schedule_ts: Date.now(),
        exposure_ts: Date.now(),
        daypart: item.daypart,
        network: item.network,
        network_id: Math.floor(Math.random() * 1000),
        prior_title: 'Mock Show',
        prior_title_id: 'mock_show_1',
        next_title: 'Mock Show 2',
        next_title_id: 'mock_show_2',
        advertiser: item.advertiser,
        advertiser_id: `adv_${Math.random().toString(36).substr(2, 9)}`,
        brand: item.brand,
        brand_id: Math.floor(Math.random() * 1000),
        product: 'Mock Product',
        product_id: Math.floor(Math.random() * 1000),
        tv_spot_name: 'Mock TV Spot',
        tv_spot_id: `spot_${Math.random().toString(36).substr(2, 9)}`,
        duration: item.duration,
        buy_type: 'linear',
        subdivision: 'Mock Subdivision',
        city: item.city,
        postal_code: item.postcode
      })));

    if (error) {
      console.error('Error inserting mock data:', error);
      return;
    }

    console.log(`✅ Successfully inserted ${mockLinearData.length} mock linear TV records`);
    console.log('Mock data includes postcodes that will be used for incremental reach analysis');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

populateMockLinearData(); 