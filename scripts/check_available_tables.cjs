const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load environment variables from .env file
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = {};
      
      envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          envVars[key.trim()] = value.trim();
        }
      });
      
      return envVars;
    }
  } catch (error) {
    console.log('Could not load .env file');
  }
  return {};
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAvailableTables() {
  try {
    console.log('🔍 Checking available tables in Supabase...');
    
    // Try some common table names
    const commonTables = [
      'campaign_events',
      'campaigns', 
      'advertisers',
      'daily_overall_metrics',
      'campaign_summary_metrics',
      'inventory_summary'
    ];
    
    for (const tableName of commonTables) {
      try {
        const { data, error: tableError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!tableError && data !== null) {
          console.log(`✅ Table "${tableName}" exists`);
          if (data.length > 0) {
            console.log(`   Sample columns:`, Object.keys(data[0]));
          }
        } else {
          console.log(`❌ Table "${tableName}" does not exist`);
        }
      } catch (e) {
        console.log(`❌ Table "${tableName}" does not exist`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
  }
}

checkAvailableTables(); 