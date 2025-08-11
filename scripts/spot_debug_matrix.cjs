#!/usr/bin/env node
/**
 * Build a quick matrix of station x audience (description) -> counts and sum of audience_size_hundreds.
 */
const { authenticate, getAll } = require('./barb_api_utils.cjs');

async function main() {
  const access = await authenticate(process.env.BARB_EMAIL, process.env.BARB_PASSWORD);
  const advertiser = (process.env.ADV || '').toLowerCase();
  const brand = (process.env.BRAND || '').toLowerCase();
  const agency = (process.env.AGENCY || '').toLowerCase();
  const date = process.env.DATE || new Date().toISOString().slice(0,10);

  const spots = await getAll(access, '/advertising_spots/', {
    min_transmission_date: date,
    max_transmission_date: date,
  });

  const filtered = spots.filter(s => {
    const adv = (s.clearcast_information?.advertiser_name || '').toLowerCase();
    const br = (s.clearcast_information?.product_name || '').toLowerCase();
    const ag = (s.clearcast_information?.buyer_name || '').toLowerCase();
    return (!advertiser || adv.includes(advertiser)) &&
           (!brand || br.includes(brand)) &&
           (!agency || ag.includes(agency));
  });

  const matrix = {};
  for (const s of filtered) {
    const st = s.station?.station_name || 'Unknown';
    const views = s.audience_views || [];
    for (const v of views) {
      const key = `${st}|||${v.description || 'Unknown'}`;
      if (!matrix[key]) matrix[key] = { count: 0, sum: 0 };
      matrix[key].count += 1;
      matrix[key].sum += v.audience_size_hundreds || 0;
    }
  }

  const rows = Object.entries(matrix).map(([k, v]) => {
    const [station, audience] = k.split('|||');
    return { station, audience, count: v.count, sum_audience_hundreds: v.sum };
  }).sort((a,b) => a.station.localeCompare(b.station) || b.sum_audience_hundreds - a.sum_audience_hundreds);

  console.log(JSON.stringify({ date, total_spots: spots.length, filtered_spots: filtered.length, rows }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });


