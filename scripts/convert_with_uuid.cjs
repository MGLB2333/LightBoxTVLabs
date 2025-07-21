const fs = require('fs');
const StreamArray = require('stream-json/streamers/StreamArray');

const INPUT_FILE = './sample_1000.json';
const OUTPUT_FILE = './campaign_events_uuid.csv';

// Match exact column names from your table
const headers = [
  'organization_id',
  'campaign_id', 
  'event_date',
  'event_time',
  'event_type',
  'bundle_id',
  'pub_name',
  'brand',
  'channel_name',
  'content_genre',
  'content_title',
  'content_series',
  'geo',
  'ip_parsed'
];

// Function to convert MongoDB ObjectId to UUID
function objectIdToUuid(objectId) {
  if (!objectId) return '';
  // Convert ObjectId to a valid UUID format
  const hex = objectId.replace(/[^a-f0-9]/gi, '');
  if (hex.length !== 24) return '';
  
  // Create a UUID v5-like string from ObjectId
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 24)}`;
}

async function convertWithUuid() {
  console.log('Converting sample to CSV with UUID conversion...');
  
  // Write CSV headers
  fs.writeFileSync(OUTPUT_FILE, headers.join(',') + '\n');
  
  const jsonStream = StreamArray.withParser();
  let count = 0;
  
  jsonStream.on('data', ({ value: row }) => {
    const event = {
      organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15', // Your org UUID
      campaign_id: row.campaign_id?.$oid ? objectIdToUuid(row.campaign_id.$oid) : '',
      event_date: row.date?.$date ? row.date.$date.split('T')[0] : '',
      event_time: row.time || '',
      event_type: row.event_type || '',
      bundle_id: row.bundle_id || '',
      pub_name: row.pub_name || '',
      brand: row.brand || '',
      channel_name: row.channel_name || '',
      content_genre: row.content_genre || '',
      content_title: row.content_title || '',
      content_series: row.content_series || '',
      geo: row.geo || '',
      ip_parsed: row['ip-parsed'] || ''
    };
    
    // Escape CSV values and write line
    const csvLine = headers.map(header => {
      const value = event[header] || '';
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const escaped = value.toString().replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') 
        ? `"${escaped}"` 
        : escaped;
    }).join(',');
    
    fs.appendFileSync(OUTPUT_FILE, csvLine + '\n');
    
    count++;
    if (count % 100 === 0) {
      console.log(`Processed ${count} rows...`);
    }
  });
  
  jsonStream.on('end', () => {
    console.log(`Conversion complete! Total rows: ${count}`);
    console.log(`CSV file saved to: ${OUTPUT_FILE}`);
    console.log('\nTo import, run:');
    console.log(`psql "postgresql://postgres.sxbdtrgndejtuskugdnl:IukBIk8giz70P8VJ@aws-0-eu-west-2.pooler.supabase.com:6543/postgres" -c "\\copy campaign_events FROM '${OUTPUT_FILE}' WITH (FORMAT csv, HEADER true);"`);
  });
  
  jsonStream.on('error', err => {
    console.error('Stream error:', err);
  });
  
  fs.createReadStream(INPUT_FILE).pipe(jsonStream.input);
}

convertWithUuid(); 