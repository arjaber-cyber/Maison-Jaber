// netlify/functions/complete-cart.js
//
// Called right after a successful order (checkout.html: card, Tabby, Tamara and free orders) to
// mark the shopper's saved cart as completed, so no reminder is sent.
// POST { email?, resumeToken? }  -- resumeToken comes from a reminder link: that cart is also
// marked "recovered" (counted in the dashboard / analytics as a recovered purchase).
// The hourly reminder job ALSO checks the orders table itself, so this is a fast path, not the only guard.

const R = require('./_recovery');

const ok = b => ({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  let p;
  try { p = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) }; }
  const email = R.normEmail(p.email);
  const token = typeof p.resumeToken === 'string' && /^[A-Za-z0-9_-]{40,60}$/.test(p.resumeToken) ? p.resumeToken : null;
  if (!R.validEmail(email) && !token) return { statusCode: 400, body: JSON.stringify({ error: 'Email is required.' }) };
  const now = new Date().toISOString();
  try {
    let updated = false;
    if (token) {
      const r = await R.sb(`abandoned_carts?resume_token_hash=eq.${R.hashToken(token)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ completed: true, completed_at: now, recovered: true, suppressed_reason: 'ordered' }),
      });
      updated = r.ok;
    }
    if (R.validEmail(email)) {
      const r = await R.sb(`abandoned_carts?email=eq.${encodeURIComponent(email)}&completed=eq.false`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ completed: true, completed_at: now, suppressed_reason: 'ordered' }),
      });
      updated = updated || r.ok;
    }
    return ok({ updated });
  } catch (err) {
    console.error('complete-cart error:', err.message);
    return ok({ updated: false });
  }
};
