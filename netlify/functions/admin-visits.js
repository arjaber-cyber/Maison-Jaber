// netlify/functions/admin-visits.js
//
// Visitors tab of the dashboard: summary of the cookie-free counter
// (see visit.js) for a time window. Admin-gated like every admin function.
//
// GET ?range=today | 24h | yesterday | 7d | 30d   (default 24h)

const { isAdminRequest } = require('./_admin-check');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Midnight in Dubai (UTC+4, no daylight saving) for the given instant.
function dubaiMidnight(d) {
  const shifted = new Date(d.getTime() + 4 * 3600e3);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - 4 * 3600e3);
}

function windowFor(range) {
  const now = new Date();
  const today = dubaiMidnight(now);
  switch (range) {
    case 'today': return { from: today, to: now, bucket: 'hour' };
    case 'yesterday': return { from: new Date(today - 864e5), to: today, bucket: 'hour' };
    case '7d': return { from: new Date(today - 6 * 864e5), to: now, bucket: 'day' };
    case '30d': return { from: new Date(today - 29 * 864e5), to: now, bucket: 'day' };
    default: return { from: new Date(now - 864e5), to: now, bucket: 'hour' };
  }
}

exports.handler = async (event) => {
  const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
  if (!isAdminRequest(event)) return json(401, { error: 'Not authorized.' });
  if (!SUPABASE_KEY) return json(500, { error: 'Server key missing.' });

  const range = (event.queryStringParameters || {}).range || '24h';
  const w = windowFor(range);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/visits_summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ p_from: w.from.toISOString(), p_to: w.to.toISOString(), p_bucket: w.bucket }),
    });
    if (!res.ok) {
      console.error('admin-visits: rpc failed', res.status, await res.text());
      return json(502, { error: 'Could not load visitor data.' });
    }
    const summary = await res.json();
    return json(200, { range, from: w.from.toISOString(), to: w.to.toISOString(), bucket: w.bucket, ...summary });
  } catch (err) {
    console.error('admin-visits error', err);
    return json(500, { error: 'Could not load visitor data.' });
  }
};
