require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Read the SQL file
const sqlPath = path.join(__dirname, 'fix_rls_policies.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

console.log('🔧 RLS Policy Fix SQL:');
console.log('='.repeat(50));
console.log(sql);
console.log('='.repeat(50));
console.log('\n📋 Please run this SQL in your Supabase SQL editor to fix the RLS policies.');
console.log('This will allow authenticated users to insert campaign actuals data.'); 