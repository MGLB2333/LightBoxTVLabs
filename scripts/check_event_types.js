import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODc1NjEsImV4cCI6MjA2Njk2MzU2MX0.4_iQjbkc73aAH3pISmlPPn_tKJHRlV7pkwA8yxMuXs8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEventTypes() {
  console.log('Checking event type distribution...\n');
  
  // Get total count
  const { count: totalCount } = await supabase
    .from('campaign_events')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total records: ${totalCount.toLocaleString()}\n`);
  
  // Get event type breakdown
  const { data: eventTypes, error } = await supabase
    .from('campaign_events')
    .select('event_type')
    .order('event_type');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Count each event type
  const counts = {};
  eventTypes.forEach(event => {
    const type = event.event_type;
    counts[type] = (counts[type] || 0) + 1;
  });
  
  console.log('Event type distribution:');
  Object.entries(counts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
      const percentage = ((count / totalCount) * 100).toFixed(2);
      console.log(`  ${type}: ${count.toLocaleString()} (${percentage}%)`);
    });
}

checkEventTypes().catch(console.error); 