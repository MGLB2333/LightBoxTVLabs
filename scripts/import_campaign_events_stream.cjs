const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const StreamArray = require('stream-json/streamers/StreamArray');

const SUPABASE_URL = 'https://sxbdtrgndejtuskugdnl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmR0cmduZGVqdHVza3VnZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzU2MSwiZXhwIjoyMDY2OTYzNTYxfQ.r7PSjx1R9O-sKXw8MvjE7cSfZCn2NVI4kdglgNeNF3w';
const FILE_PATH = './scripts/lightboxlabs_db.pixeldata.json';
const ORG_ID = '16bb4799-c3b2-44c9-87a0-1d253bc83c15';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function insertEvent(event) {
  const { error } = await supabase.from('campaign_events').insert([event]);
  if (error) {
    console.error('Error inserting row:', error, event);
  }
}

async function main() {
  let count = 0;
  const jsonStream = StreamArray.withParser();
  jsonStream.on('data', async ({ value: row }) => {
    const event = {
      organization_id: ORG_ID,
      campaign_id: row.campaign_id?.$oid || null,
      event_date: row.date?.$date ? row.date.$date.split('T')[0] : null,
      event_time: row.time || null,
      event_type: row.event_type || null,
      bundle_id: row.bundle_id || null,
      pub_name: row.pub_name || null,
      brand: row.brand || null,
      channel_name: row.channel_name || null,
      content_genre: row.content_genre || null,
      content_title: row.content_title || null,
      content_series: row.content_series || null,
      geo: row.geo || null,
      ip_parsed: row['ip-parsed'] || null,
    };
    await insertEvent(event);
    count++;
    if (count % 100 === 0) console.log(`Inserted ${count} rows...`);
  });
  jsonStream.on('end', () => {
    console.log('Import complete! Total rows:', count);
  });
  jsonStream.on('error', err => {
    console.error('Stream error:', err);
  });
  fs.createReadStream(FILE_PATH).pipe(jsonStream.input);
}

main(); 