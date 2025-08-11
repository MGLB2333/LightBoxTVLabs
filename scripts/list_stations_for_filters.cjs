#!/usr/bin/env node
/**
 * List distinct station names present for an advertiser/brand/agency/date window.
 * Env: BARB_EMAIL, BARB_PASSWORD
 */
const { authenticate, getAll, buildUrl } = require('./barb_api_utils.cjs');

async function main() {
  const email = process.env.BARB_EMAIL;
  const password = process.env.BARB_PASSWORD;
  const access = await authenticate(email, password);

  const advertiser = process.env.ADV || '';
  const brand = process.env.BRAND || '';
  const agency = process.env.AGENCY || '';
  const dateFrom = process.env.DATE_FROM || process.env.DATE || new Date().toISOString().slice(0,10);
  const dateTo = process.env.DATE_TO || process.env.DATE || new Date().toISOString().slice(0,10);

  const params = {
    min_transmission_date: dateFrom,
    max_transmission_date: dateTo,
  };
  // Pull a broad set, then filter client-side by clearcast info (API filters can be loose)
  const spots = await getAll(access, '/advertising_spots/', params);
  const filtered = spots.filter(s => {
    const adv = (s.clearcast_information?.advertiser_name || '').toLowerCase();
    const br = (s.clearcast_information?.product_name || '').toLowerCase();
    const ag = (s.clearcast_information?.buyer_name || '').toLowerCase();
    return (!advertiser || adv.includes(advertiser.toLowerCase())) &&
           (!brand || br.includes(brand.toLowerCase())) &&
           (!agency || ag.includes(agency.toLowerCase()));
  });

  const stations = [...new Set(filtered.map(s => s.station?.station_name).filter(Boolean))].sort();
  console.log(JSON.stringify({
    advertiser, brand, agency,
    date_from: dateFrom, date_to: dateTo,
    total_spots: spots.length,
    filtered_spots: filtered.length,
    stations,
  }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


