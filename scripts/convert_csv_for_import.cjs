const fs = require('fs');
const csv = require('csv-parser');

const INPUT_FILE = './campaigndata_400k_row_sample.csv';
const OUTPUT_FILE = './campaign_events_import.csv';

// Function to convert MongoDB ObjectId to UUID
function objectIdToUuid(objectId) {
  if (!objectId) return '';
  // Convert ObjectId to a valid UUID format
  const hex = objectId.replace(/[^a-f0-9]/gi, '');
  if (hex.length !== 24) return '';
  
  // Create a UUID v5-like string from ObjectId
  // Ensure proper UUID format with correct version and variant
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 24)}`;
  return uuid;
}

async function convertCsvForImport() {
  console.log('Converting CSV for import...');
  
  // Write CSV headers
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
  
  fs.writeFileSync(OUTPUT_FILE, headers.join(',') + '\n');
  
  let count = 0;
  
  fs.createReadStream(INPUT_FILE)
    .pipe(csv())
    .on('data', (row) => {
      const event = {
        organization_id: '16bb4799-c3b2-44c9-87a0-1d253bc83c15', // Your org UUID
        campaign_id: '', // Leave empty for now to avoid UUID issues
        event_date: row.date ? row.date.split('T')[0] : '',
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
        ip_parsed: row['ip-parsed'] || row.ip_parsed || ''
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
    })
    .on('end', () => {
      console.log(`Conversion complete! Total rows: ${count}`);
      console.log(`CSV file saved to: ${OUTPUT_FILE}`);
      console.log('\nTo import, run:');
      console.log(`psql "postgresql://postgres.sxbdtrgndejtuskugdnl:IukBIk8giz70P8VJ@aws-0-eu-west-2.pooler.supabase.com:6543/postgres" -c "\\copy campaign_events FROM '${OUTPUT_FILE}' WITH (FORMAT csv, HEADER true);"`);
    })
    .on('error', (err) => {
      console.error('Error reading CSV:', err);
    });
}

convertCsvForImport(); 