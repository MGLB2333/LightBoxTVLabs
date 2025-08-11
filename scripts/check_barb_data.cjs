const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBarbData() {
  console.log('🔍 Checking BARB data in database...\n');

  try {
    // Check spots table
    const { data: spots, error: spotsError } = await supabase
      .from('barb_spots')
      .select('*')
      .limit(5);

    if (spotsError) {
      console.error('❌ Error fetching spots:', spotsError);
    } else {
      console.log(`📊 Total spots in database: ${spots.length} (showing first 5)`);
      console.log('Sample spot data:');
      console.log(JSON.stringify(spots[0], null, 2));
    }

    // Check total count
    const { count, error: countError } = await supabase
      .from('barb_spots')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error getting count:', countError);
    } else {
      console.log(`\n📈 Total records in barb_spots: ${count}`);
    }

    // Check unique values
    const { data: uniqueDates, error: dateError } = await supabase
      .from('barb_spots')
      .select('date')
      .limit(10);

    if (!dateError && uniqueDates.length > 0) {
      console.log(`\n📅 Sample dates: ${uniqueDates.map(d => d.date).join(', ')}`);
    }

    // Check programme titles
    const { data: programmes, error: progError } = await supabase
      .from('barb_spots')
      .select('programme_title, programme_episode_title')
      .limit(10);

    if (!progError && programmes.length > 0) {
      console.log('\n📺 Sample programme data:');
      programmes.forEach((prog, i) => {
        console.log(`${i + 1}. Title: "${prog.programme_title}" | Episode: "${prog.programme_episode_title}"`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking data:', error);
    process.exit(1);
  }
}

checkBarbData(); 