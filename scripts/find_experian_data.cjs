const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findExperianData() {
  console.log('🔍 Comprehensive search for Experian data...\n');
  
  // Check if there are any CSV files in the project
  console.log('1. Checking for CSV files...');
  const fs = require('fs');
  const path = require('path');
  
  const scriptsDir = path.join(__dirname, '..', 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const files = fs.readdirSync(scriptsDir);
    const csvFiles = files.filter(f => f.toLowerCase().endsWith('.csv'));
    console.log('CSV files found:', csvFiles);
    
    for (const csvFile of csvFiles) {
      const filePath = path.join(scriptsDir, csvFile);
      const stats = fs.statSync(filePath);
      console.log(`${csvFile}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Check if it looks like Experian data
      if (csvFile.toLowerCase().includes('experian') || csvFile.toLowerCase().includes('demographic')) {
        console.log(`🎯 Potential Experian data file: ${csvFile}`);
        const content = fs.readFileSync(filePath, 'utf8').substring(0, 1000);
        console.log('Content preview:', content);
      }
    }
  }
  
  // Check for import scripts
  console.log('\n2. Checking for import scripts...');
  const importScripts = files.filter(f => 
    f.toLowerCase().includes('import') || 
    f.toLowerCase().includes('load') || 
    f.toLowerCase().includes('data')
  );
  console.log('Import scripts found:', importScripts);
  
  // Try different table name variations
  console.log('\n3. Trying different table name variations...');
  const tableVariations = [
    'experian_data',
    'experianData',
    'Experian_Data',
    'EXPERIAN_DATA',
    'experian',
    'experian_segments',
    'experianSegments',
    'demographics',
    'demographic_data',
    'postcode_demographics',
    'postcode_data',
    'audience_data',
    'audience_segments',
    'segments',
    'segment_data'
  ];
  
  for (const tableName of tableVariations) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (!error && data && data.length > 0) {
        console.log(`✅ Found data in ${tableName}:`, data.length, 'records');
        console.log('Columns:', Object.keys(data[0]));
        console.log('Sample:', JSON.stringify(data[0], null, 2));
      } else if (error && !error.message.includes('does not exist')) {
        console.log(`⚠️ ${tableName} exists but no data:`, error.message);
      }
    } catch (err) {
      // Table doesn't exist
    }
  }
  
  // Check if there are any other schemas
  console.log('\n4. Checking for different schemas...');
  try {
    // Try to access with different schema prefixes
    const schemas = ['public', 'experian', 'data', 'analytics'];
    
    for (const schema of schemas) {
      try {
        const { data, error } = await supabase
          .from(`${schema}.experian_data`)
          .select('*')
          .limit(1);
        
        if (!error && data && data.length > 0) {
          console.log(`✅ Found data in ${schema}.experian_data`);
        }
      } catch (err) {
        // Schema doesn't exist
      }
    }
  } catch (err) {
    console.log('Schema check failed');
  }
  
  // Check if there are any views that might contain the data
  console.log('\n5. Checking for views...');
  try {
    const { data: views, error: viewError } = await supabase
      .from('information_schema.views')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%experian%');
    
    if (!viewError && views) {
      console.log('Experian-related views:', views);
    }
  } catch (err) {
    console.log('Could not check views');
  }
  
  // Check if there are any functions that might return the data
  console.log('\n6. Checking for functions...');
  try {
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .like('routine_name', '%experian%');
    
    if (!funcError && functions) {
      console.log('Experian-related functions:', functions);
    }
  } catch (err) {
    console.log('Could not check functions');
  }
  
  // Check if the data might be in a different format
  console.log('\n7. Checking for JSON or other data formats...');
  try {
    const { data: jsonData, error: jsonError } = await supabase
      .from('experian_data')
      .select('*')
      .limit(1);
    
    if (!jsonError && jsonData) {
      console.log('experian_data structure:', jsonData.length > 0 ? Object.keys(jsonData[0]) : 'Empty');
    }
  } catch (err) {
    console.log('JSON check failed');
  }
  
  // Provide next steps
  console.log('\n8. Next steps to populate Experian data:');
  console.log(`
If the Experian tables are empty, you need to:

1. Check if there are CSV files in the scripts directory that need to be imported
2. Run the SQL schema to create the performance views:
   - Copy the SQL from the schema you provided
   - Run it in the Supabase SQL editor
   
3. Import Experian data if available:
   - Look for CSV files with Experian data
   - Use Supabase's import functionality or create import scripts
   
4. Check if the data is in a different table or schema
   - The search above should have found any existing data
   
5. If no data exists, you may need to:
   - Obtain Experian data files
   - Create import scripts to populate the tables
   - Or use the existing Geo_lookup data for geographic analysis
  `);
}

findExperianData().catch(console.error); 