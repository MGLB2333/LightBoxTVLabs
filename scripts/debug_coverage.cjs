const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function debugCoverage() {
  console.log('🔍 Debugging Coverage Calculation\n');

  try {
    // 1. Get all unique publishers
    console.log('1. Getting all unique publishers...');
    const { data: allPublishers, error: pubError } = await supabase
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

    allPublishers?.forEach(event => {
      const pubName = event.pub_name || 'Unknown';
      uniquePublishers.add(pubName);
      publisherCounts[pubName] = (publisherCounts[pubName] || 0) + 1;
    });

    console.log(`📊 Total unique publishers: ${uniquePublishers.size}`);
    console.log('📋 All publishers:');
    Array.from(uniquePublishers).sort().forEach(pub => {
      console.log(`  - ${pub}: ${publisherCounts[pub].toLocaleString()} events`);
    });

    // 2. Test the exact same logic as the frontend
    console.log('\n2. Testing frontend logic for each publisher...');
    const contentFields = ['channel_name', 'content_genre', 'content_title', 'content_series'];
    
    for (const publisher of Array.from(uniquePublishers).sort()) {
      console.log(`\n📊 ${publisher}:`);
      
      // Get total events for this publisher
      const { count: pubTotalEvents } = await supabase
        .from('campaign_events')
        .select('campaign_id', { count: 'exact', head: true })
        .eq('pub_name', publisher);

      console.log(`  Total events: ${pubTotalEvents?.toLocaleString()}`);

      // Test coverage for each field using the same logic as frontend
      for (const field of contentFields) {
        const { count: filledCount } = await supabase
          .from('campaign_events')
          .select('campaign_id', { count: 'exact', head: true })
          .eq('pub_name', publisher)
          .not(field, 'is', null)
          .neq(field, '')
          .neq(field, 'Unknown');

        const filled = Number(filledCount || 0);
        const total = Number(pubTotalEvents || 0);
        const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
        
        console.log(`  ${field}: ${filled.toLocaleString()} filled / ${total.toLocaleString()} total = ${pct}%`);
      }
    }

    // 3. Check if any publishers have all 0% coverage
    console.log('\n3. Checking which publishers have all 0% coverage...');
    for (const publisher of Array.from(uniquePublishers).sort()) {
      let allZero = true;
      
      for (const field of contentFields) {
        const { count: filledCount } = await supabase
          .from('campaign_events')
          .select('campaign_id', { count: 'exact', head: true })
          .eq('pub_name', publisher)
          .not(field, 'is', null)
          .neq(field, '')
          .neq(field, 'Unknown');

        if ((filledCount || 0) > 0) {
          allZero = false;
          break;
        }
      }
      
      if (allZero) {
        console.log(`  ${publisher}: ALL FIELDS 0%`);
      } else {
        console.log(`  ${publisher}: Has some non-zero coverage`);
      }
    }

  } catch (error) {
    console.error('Error in debugCoverage:', error);
  }
}

debugCoverage(); 