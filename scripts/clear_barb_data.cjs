const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearBarbData() {
  console.log('🧹 Clearing existing BARB data...');
  
  try {
    // Clear all BARB tables in the correct order (respecting foreign keys)
    const tables = [
      'barb_spots',      // Clear spots first (references other tables)
      'barb_brands',     // Clear brands (references advertisers)
      'barb_advertisers', // Clear advertisers
      'barb_campaigns',   // Clear campaigns
      'barb_buyers',     // Clear buyers
      'barb_stations'    // Clear stations
    ];
    
    for (const table of tables) {
      console.log(`🗑️  Clearing ${table}...`);
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', 'dummy'); // Delete all rows
      
      if (error) {
        console.error(`❌ Error clearing ${table}:`, error);
      } else {
        console.log(`✅ Cleared ${table}`);
      }
    }
    
    console.log('🎉 All BARB data cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  }
}

clearBarbData(); 