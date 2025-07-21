const fs = require('fs');
const StreamArray = require('stream-json/streamers/StreamArray');

const INPUT_FILE = './lightboxlabs_db.pixeldata.json';
const OUTPUT_FILE = './scripts/sample_1000.json';

async function extractSample() {
  console.log('Extracting first 1000 rows...');
  
  const jsonStream = StreamArray.withParser();
  let count = 0;
  const sample = [];
  
  jsonStream.on('data', ({ value: row }) => {
    if (count < 1000) {
      sample.push(row);
      count++;
      
      if (count % 100 === 0) {
        console.log(`Extracted ${count} rows...`);
      }
    } else {
      // Stop processing after 1000 rows
      jsonStream.destroy();
    }
  });
  
  jsonStream.on('end', () => {
    console.log(`Sample extraction complete! Total rows: ${sample.length}`);
    
    // Write sample to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sample, null, 2));
    console.log(`Sample saved to: ${OUTPUT_FILE}`);
  });
  
  jsonStream.on('error', err => {
    console.error('Stream error:', err);
  });
  
  fs.createReadStream(INPUT_FILE).pipe(jsonStream.input);
}

extractSample(); 