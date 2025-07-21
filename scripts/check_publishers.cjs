const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkPublishers() {
  console.log('🔍 Checking Publisher Data\n');

  try {
    // 1. Get total count of events
    console.log('1. Getting total event count...');
    const { count: totalEvents, error: countError } = await supabase
      .from('campaign_events')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting total count:', countError);
      return;
    }

    console.log(`📊 Total events: ${totalEvents?.toLocaleString()}`);

    // 2. Get unique publishers
    console.log('\n2. Getting unique publishers...');
    const { data: publishers, error: pubError } = await supabase
      .from('campaign_events')
      .select('pub_name')
      .not('pub_name', 'is', null)
      .neq('pub_name', '');

    if (pubError) {
      console.error('Error getting publishers:', pubError);
      return;
    }

    // Count unique publishers
    const uniquePublishers = new Set();
    const publisherCounts = {};

    publishers?.forEach(event => {
      const pubName = event.pub_name || 'Unknown';
      uniquePublishers.add(pubName);
      publisherCounts[pubName] = (publisherCounts[pubName] || 0) + 1;
    });

    console.log(`📊 Unique publishers: ${uniquePublishers.size}`);
    console.log('📋 Publishers:');
    Array.from(uniquePublishers).sort().forEach(pub => {
      console.log(`  - ${pub}: ${publisherCounts[pub].toLocaleString()} events`);
    });

    // 3. Test the coverage query for all publishers
    console.log('\n3. Testing coverage calculation for all publishers...');
    const fields = ['channel_name', 'content_genre', 'content_title', 'content_series'];
    
    for (const publisher of Array.from(uniquePublishers).sort()) {
      console.log(`\n📊 ${publisher}:`);
      
      // Get total events for this publisher
      const { count: pubTotalEvents } = await supabase
        .from('campaign_events')
        .select('campaign_id', { count: 'exact', head: true })
        .eq('pub_name', publisher);

      console.log(`  Total events: ${pubTotalEvents?.toLocaleString()}`);

      // Test coverage for each field
      for (const field of fields) {
        const { count: filledCount } = await supabase
          .from('campaign_events')
          .select('campaign_id', { count: 'exact', head: true })
          .eq('pub_name', publisher)
          .not(field, 'is', null)
          .neq(field, '')
          .neq(field, 'Unknown');

        const percentage = pubTotalEvents ? Math.round(((filledCount || 0) / pubTotalEvents) * 100) : 0;
        console.log(`  ${field}: ${filledCount?.toLocaleString()} filled / ${pubTotalEvents?.toLocaleString()} total = ${percentage}%`);
      }
    }

    // 4. Check sample data for one publisher to see actual values
    console.log('\n4. Checking sample data for Discovery+...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('campaign_events')
      .select('pub_name, channel_name, content_genre, content_title, content_series')
      .eq('pub_name', 'Discovery+')
      .limit(5);

    if (sampleError) {
      console.error('Error getting sample data:', sampleError);
    } else {
      console.log('Sample data:');
      sampleData?.forEach((row, i) => {
        console.log(`  Row ${i + 1}:`);
        console.log(`    pub_name: "${row.pub_name}"`);
        console.log(`    channel_name: "${row.channel_name}"`);
        console.log(`    content_genre: "${row.content_genre}"`);
        console.log(`    content_title: "${row.content_title}"`);
        console.log(`    content_series: "${row.content_series}"`);
      });
    }

  } catch (error) {
    console.error('Error in checkPublishers:', error);
  }
}

checkPublishers(); 