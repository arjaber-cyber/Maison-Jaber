// netlify/functions/resume-cart.js
//
// GET /.netlify/functions/resume-cart?t=<token from the reminder email>
//   -> 200 { status: 'ok', items: [...], lang, country }   cart rebuilt on cart.html, any device
//   -> 200 { status: 'expired' | 'completed' | 'not_found' }
//
// The token is 32 random bytes; only its SHA-256 hash is stored, so a database leak can't be
// turned into working links. Items contain private photo storage paths (never images), which
// only the server can read. Links expire after 7 days (photos are deleted after 15).

const R = require('./_recovery');

const reply = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return reply(405, { error: 'Method not allowed' });
  const token = String((event.queryStringParameters || {}).t || '');
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return reply(200, { status: 'not_found' });
  if (!R.SERVICE_KEY) return reply(200, { status: 'not_found' });
  try {
    const r = await R.sb(`abandoned_carts?resume_token_hash=eq.${R.hashToken(token)}&select=email,cart_snapshot,lang,country,completed,resume_expires_at,resumed_at`);
    const row = r.ok ? (await r.json())[0] : null;
    if (!row) return reply(200, { status: 'not_found' });
    if (row.completed) return reply(200, { status: 'completed' });
    if (!row.resume_expires_at || new Date(row.resume_expires_at) < new Date()) return reply(200, { status: 'expired' });
    const items = R.sanitizeCart(row.cart_snapshot);
    if (!items.length) return reply(200, { status: 'not_found' });
    if (!row.resumed_at) {
      await R.sb(`abandoned_carts?email=eq.${encodeURIComponent(row.email)}`, { method: 'PATCH', body: JSON.stringify({ resumed_at: new Date().toISOString() }) });
    }
    return reply(200, { status: 'ok', items, lang: row.lang === 'ar' ? 'ar' : 'en', country: row.country || null });
  } catch (err) {
    console.error('resume-cart error:', err.message);
    return reply(200, { status: 'not_found' });
  }
};
