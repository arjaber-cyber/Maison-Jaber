// netlify/functions/admin-campaigns.js
//
// Campaigns tab of the dashboard (Nov 2026): Google Ads campaigns side by side —
// spend, clicks, tracked sessions, engagement, free cover previews, checkouts, paid orders,
// revenue, CPA and ROAS. Admin-gated like every admin function. Counts and AED sums only.
//
// GET ?range=7d | 14d | 30d | all   or   ?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Sources: site_events (cookie-free counter), orders (paid, confirmed orders only; free-code /
// influencer / gift orders are never revenue), ads_daily (Google Ads spend and clicks).
// The work is done by the database function campaign_report().

const { isAdminRequest } = require('./_admin-check');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const dubaiDay = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });

function windowFor(q) {
  if (DATE.test(q.from || '') && DATE.test(q.to || '') && q.from <= q.to) return { from: q.from, to: q.to };
  const today = dubaiDay(Date.now());
  const back = (n) => dubaiDay(Date.parse(today + 'T12:00:00Z') - n * 864e5);
  switch (q.range) {
    case 'today': return { from: today, to: today };
    case '14d': return { from: back(13), to: today };
    case '30d': return { from: back(29), to: today };
    case 'all': return { from: '2026-11-01', to: today };
    default: return { from: back(6), to: today };
  }
}

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
  if (!isAdminRequest(event)) return json(401, { error: 'Not authorized.' });
  if (!SUPABASE_KEY) return json(500, { error: 'Server key missing.' });
  const q = event.queryStringParameters || {};
  const w = windowFor(q);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/campaign_report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ date_from: w.from, date_to: w.to }),
    });
    if (!res.ok) {
      console.error('admin-campaigns: rpc failed', res.status, (await res.text()).slice(0, 300));
      return json(502, { error: 'Could not load campaign data.' });
    }
    return json(200, { range: q.range || '7d', from: w.from, to: w.to, rows: await res.json() });
  } catch (err) {
    console.error('admin-campaigns error', err && err.message);
    return json(500, { error: 'Could not load campaign data.' });
  }
};

exports._windowFor = windowFor;
