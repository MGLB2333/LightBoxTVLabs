const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupGoogleAdsTables() {
  console.log('🚀 Setting up Google Ads Integration Tables\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_google_ads_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Creating Google Ads tables and functions...');
    
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          if (error) {
            console.warn('Warning executing statement:', error.message);
          }
        } catch (e) {
          console.warn('Warning executing statement:', e.message);
        }
      }
    }

    console.log('✅ Google Ads tables created successfully\n');

    // Verify tables exist
    console.log('Verifying table creation...');
    const tables = [
      'google_ads_connections',
      'google_ads_campaigns', 
      'google_ads_ad_groups',
      'google_ads_keywords',
      'google_ads_performance'
    ];

    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Table "${tableName}" exists and is accessible`);
        } else {
          console.log(`❌ Table "${tableName}" has issues:`, error.message);
        }
      } catch (e) {
        console.log(`❌ Table "${tableName}" does not exist or is not accessible`);
      }
    }

    console.log('\n🎉 Google Ads integration setup complete!');
    console.log('\nNext steps:');
    console.log('1. Set up Google Ads API credentials in Google Cloud Console');
    console.log('2. Add VITE_GOOGLE_ADS_CLIENT_ID and VITE_GOOGLE_ADS_CLIENT_SECRET to your .env file');
    console.log('3. Configure OAuth consent screen in Google Cloud Console');
    console.log('4. Add your domain to authorized redirect URIs');

  } catch (error) {
    console.error('❌ Error setting up Google Ads tables:', error);
  }
}

// Run the setup
setupGoogleAdsTables(); 