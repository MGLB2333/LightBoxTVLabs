const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runInventoryAggregation() {
  try {
    console.log('🔄 Starting inventory data aggregation...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_inventory_aggregation.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executing inventory aggregation SQL...');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Error executing SQL:', error);
      return;
    }
    
    console.log('✅ Inventory aggregation SQL executed successfully');
    
    // Refresh the materialized view
    console.log('🔄 Refreshing materialized view...');
    const { error: refreshError } = await supabase.rpc('refresh_inventory_summary');
    
    if (refreshError) {
      console.error('❌ Error refreshing materialized view:', refreshError);
      return;
    }
    
    console.log('✅ Materialized view refreshed successfully');
    
    // Check the results
    console.log('📊 Checking aggregated data...');
    const { data: inventoryData, error: dataError } = await supabase
      .from('inventory_summary')
      .select('*')
      .limit(5);
    
    if (dataError) {
      console.error('❌ Error fetching inventory data:', dataError);
      return;
    }
    
    console.log('📈 Sample inventory data:');
    console.table(inventoryData);
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('inventory_summary')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error getting count:', countError);
      return;
    }
    
    console.log(`📊 Total inventory records: ${count}`);
    console.log('✅ Inventory aggregation completed successfully!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

runInventoryAggregation(); 