const fs = require('fs');
const csv = require('csv-parser');
const { stringify } = require('csv-stringify/sync');

const INPUT_FILE = './campaigndata_400k_row_sample.csv';
const OUTPUT_FILE = './campaigndata_supabase_ready.csv';
const ORG_ID = '16bb4799-c3b2-44c9-87a0-1d253bc83c15';

// Desired column order for Supabase
const headers = [
  'id',
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

const rows = [];

// Convert decimal day to HH:MM:SS
function decimalDayToTime(decimal) {
  if (!decimal || isNaN(decimal)) return '';
  const totalSeconds = Math.round(Number(decimal) * 24 * 60 * 60);
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Simple UUID v4 generator
function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

fs.createReadStream(INPUT_FILE)
  .pipe(csv())
  .on('data', (row) => {
    // Build new row with correct order and org id
    const newRow = {
      id: row.id && row.id.trim() ? row.id : randomUUID(),
      organization_id: ORG_ID,
      campaign_id: row.campaign_id,
      event_date: row.event_date ? row.event_date.split('T')[0] : '',
      event_time: decimalDayToTime(row.event_time),
      event_type: row.event_type,
      bundle_id: row.bundle_id,
      pub_name: row.pub_name,
      brand: row.brand,
      channel_name: row.channel_name,
      content_genre: row.content_genre,
      content_title: row.content_title,
      content_series: row.content_series,
      geo: row.geo,
      ip_parsed: row.ip_parsed || row['ip-parsed']
    };
    rows.push(newRow);
    if (rows.length % 10000 === 0) {
      console.log(`Processed ${rows.length} rows...`);
    }
  })
  .on('end', () => {
    // Write new CSV
    const output = stringify(rows, { header: true, columns: headers });
    fs.writeFileSync(OUTPUT_FILE, output);
    console.log(`Done! Output: ${OUTPUT_FILE}`);
  })
  .on('error', (err) => {
    console.error('Error:', err);
  }); 