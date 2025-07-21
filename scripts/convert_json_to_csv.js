const fs = require('fs');
const StreamArray = require('stream-json/streamers/StreamArray');

const INPUT_FILE = './scripts/lightboxlabs_db.pixeldata.json';
const OUTPUT_FILE = './scripts/campaign_events.csv';

// CSV headers
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

async function convertJsonToCsv() {
  console.log('Converting JSON to CSV...');
  
  // Write CSV headers
  fs.writeFileSync(OUTPUT_FILE, headers.join(',') + '\n');
  
  const jsonStream = StreamArray.withParser();
  let count = 0;
  
  jsonStream.on('data', ({ value: row }) => {
    const event = {
      organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15',
      campaign_id: row.campaign_id?.$oid || '',
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
    if (count % 10000 === 0) {
      console.log(`Processed ${count} rows...`);
    }
  });
  
  jsonStream.on('end', () => {
    console.log(`Conversion complete! Total rows: ${count}`);
    console.log(`CSV file saved to: ${OUTPUT_FILE}`);
  });
  
  jsonStream.on('error', err => {
    console.error('Stream error:', err);
  });
  
  fs.createReadStream(INPUT_FILE).pipe(jsonStream.input);
}

convertJsonToCsv(); 