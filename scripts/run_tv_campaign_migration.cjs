const fs = require('fs');
const path = require('path');

async function runTVCampaignMigration() {
  console.log('🚀 TV Campaign Database Migration\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_tv_campaign_tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📋 SQL Migration Script Generated Successfully!');
    console.log('\n📝 To create the TV Campaign tables:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the following SQL:');
    console.log('\n' + '='.repeat(80));
    console.log(sqlContent);
    console.log('='.repeat(80));
    
    console.log('\n📊 This will create the following tables:');
    console.log('  - tv_campaigns');
    console.log('  - tv_campaign_plans');
    console.log('  - tv_campaign_actuals');
    console.log('  - tv_campaign_quality');
    console.log('\n🔐 RLS policies will be enabled for all tables');
    console.log('📈 Indexes will be created for performance');

  } catch (error) {
    console.error('❌ Error reading SQL file:', error);
  }
}

// Run the migration
runTVCampaignMigration(); 