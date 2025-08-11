#!/usr/bin/env node
/**
 * Sample the audience_views structures for a given station to see available audience descriptions and sizes.
 * Env: BARB_EMAIL, BARB_PASSWORD
 * Args via env: ADV, BRAND, AGENCY, DATE, STATION
 */
const { authenticate, getAll } = require('./barb_api_utils.cjs');

async function main() {
  const access = await authenticate(process.env.BARB_EMAIL, process.env.BARB_PASSWORD);
  const advertiser = (process.env.ADV || '').toLowerCase();
  const brand = (process.env.BRAND || '').toLowerCase();
  const agency = (process.env.AGENCY || '').toLowerCase();
  const date = process.env.DATE || new Date().toISOString().slice(0,10);
  const station = (process.env.STATION || '').toLowerCase();

  const spots = await getAll(access, '/advertising_spots/', {
    min_transmission_date: date,
    max_transmission_date: date,
  });

  const filtered = spots.filter(s => {
    const adv = (s.clearcast_information?.advertiser_name || '').toLowerCase();
    const br = (s.clearcast_information?.product_name || '').toLowerCase();
    const ag = (s.clearcast_information?.buyer_name || '').toLowerCase();
    const st = (s.station?.station_name || '').toLowerCase();
    return (!advertiser || adv.includes(advertiser)) &&
           (!brand || br.includes(brand)) &&
           (!agency || ag.includes(agency)) &&
           (!station || st === station);
  });

  const sample = filtered.slice(0, 20).map(s => ({
    station: s.station?.station_name,
    break_title: s.break_title || s.clearcast_information?.break_title,
    commercial_title: s.clearcast_information?.commercial_title || s.clearcast_information?.commercial_name,
    audience_views: (s.audience_views || []).map(a => ({
      description: a.description,
      audience_size_hundreds: a.audience_size_hundreds,
      audience_target_size_hundreds: a.audience_target_size_hundreds,
    }))
  }));

  console.log(JSON.stringify({
    advertiser, brand, agency, date, station,
    total_spots: spots.length,
    filtered_spots: filtered.length,
    sample,
  }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });


