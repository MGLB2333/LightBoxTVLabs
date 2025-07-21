const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkExperianSQL() {
  console.log('🔍 Checking Experian data import requirements...\n');
  
  // Check if there are any CSV files or data sources
  console.log('1. Checking for data import scripts...');
  
  const fs = require('fs');
  const path = require('path');
  
  // Check scripts directory for import files
  const scriptsDir = path.join(__dirname, '..', 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const files = fs.readdirSync(scriptsDir);
    const experianFiles = files.filter(f => f.toLowerCase().includes('experian'));
    console.log('Experian-related files in scripts:', experianFiles);
    
    for (const file of experianFiles) {
      const filePath = path.join(scriptsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`\nFile: ${file}`);
      console.log('Content preview:', content.substring(0, 500));
    }
  }
  
  // Check for CSV files
  console.log('\n2. Checking for CSV files...');
  const csvFiles = [];
  const searchDirs = ['.', './scripts', './data', './imports'];
  
  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      const csvs = files.filter(f => f.toLowerCase().endsWith('.csv'));
      csvFiles.push(...csvs.map(f => path.join(dir, f)));
    }
  }
  
  console.log('CSV files found:', csvFiles);
  
  // Check if there are any SQL files
  console.log('\n3. Checking for SQL files...');
  const sqlFiles = [];
  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      const sqls = files.filter(f => f.toLowerCase().endsWith('.sql'));
      sqlFiles.push(...sqls.map(f => path.join(dir, f)));
    }
  }
  
  console.log('SQL files found:', sqlFiles);
  
  // Try to insert a test record to see if the table structure is correct
  console.log('\n4. Testing table structure with insert...');
  try {
    const testRecord = {
      postcode: 'EC1N',
      segment_name: 'Test Segment',
      value: 100
    };
    
    const { data, error } = await supabase
      .from('experian_data')
      .insert([testRecord])
      .select();
    
    if (error) {
      console.log('Insert error:', error.message);
      
      // Try different column names
      const alternativeRecords = [
        { postcode_district: 'EC1N', segment: 'Test Segment', value: 100 },
        { postcode: 'EC1N', segment: 'Test Segment', value: 100 },
        { postcode_sector: 'EC1N', segment_name: 'Test Segment', value: 100 }
      ];
      
      for (const altRecord of alternativeRecords) {
        try {
          const { data: altData, error: altError } = await supabase
            .from('experian_data')
            .insert([altRecord])
            .select();
          
          if (!altError) {
            console.log('✅ Successfully inserted with columns:', Object.keys(altRecord));
            console.log('Inserted data:', altData);
            
            // Clean up test record
            await supabase
              .from('experian_data')
              .delete()
              .eq('postcode', 'EC1N');
            
            break;
          } else {
            console.log('Alternative insert failed:', altError.message);
          }
        } catch (err) {
          console.log('Alternative insert error:', err.message);
        }
      }
    } else {
      console.log('✅ Successfully inserted test record');
      console.log('Inserted data:', data);
      
      // Clean up test record
      await supabase
        .from('experian_data')
        .delete()
        .eq('postcode', 'EC1N');
    }
  } catch (err) {
    console.log('Insert test failed:', err.message);
  }
  
  // Check if there are any views or functions that might contain the data
  console.log('\n5. Checking for views and functions...');
  try {
    // Try to call any functions that might return Experian data
    const { data: funcData, error: funcError } = await supabase
      .rpc('get_experian_data');
    
    if (!funcError && funcData) {
      console.log('✅ Found Experian data via function:', funcData.length, 'records');
    } else {
      console.log('No get_experian_data function found');
    }
  } catch (err) {
    console.log('Function check failed');
  }
  
  // Provide SQL queries to check and populate tables
  console.log('\n6. Suggested SQL queries to run in Supabase SQL editor:');
  console.log(`
-- Check if tables exist and have data
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%experian%';

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'experian_data'
ORDER BY ordinal_position;

-- Check for any data
SELECT COUNT(*) FROM experian_data;
SELECT COUNT(*) FROM experian_taxonomy;

-- Check for RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename LIKE '%experian%';

-- Create sample data structure (if needed)
CREATE TABLE IF NOT EXISTS experian_data (
  id SERIAL PRIMARY KEY,
  postcode VARCHAR(10) NOT NULL,
  segment_name VARCHAR(255) NOT NULL,
  value INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experian_taxonomy (
  id SERIAL PRIMARY KEY,
  segment_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
  `);
}

checkExperianSQL().catch(console.error); 