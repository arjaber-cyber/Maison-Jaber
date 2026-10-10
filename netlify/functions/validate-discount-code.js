// netlify/functions/validate-discount-code.js
//
// Checkout "Apply" button. Tells the shopper whether a code can be used and
// what it does, so the summary can show it. This is for display only: the
// real price is always recalculated in _pricing.js when the order is placed,
// and the use is reserved atomically in Postgres (reserve_discount).
//
// POST { code, email? }
// 200 { valid: true, code, type, value }   value: % for percent, AED for fixed
// 4xx { error, reason }                    reason: see PROMO_MESSAGES in _pricing.js
//
// Codes live in Supabase `discount_codes` and are managed from the admin
// dashboard (Discounts tab). Rule: one discount per order -- the customer
// gets whichever is better, the bundle discount or the code.

const { loadPromo } = require('./_pricing');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request body.' }); }

  const code = String(payload.code || '').trim().toUpperCase();
  if (!code) return json(400, { error: 'Please enter a code.', reason: 'empty' });
  const email = String(payload.email || '').trim();

  try {
    const promo = await loadPromo(code, { email: email || null });
    return json(200, { valid: true, code: promo.code, type: promo.type, value: promo.value, minOrderAed: promo.minOrderAed });
  } catch (e) {
    if (e.reason) return json(e.reason === 'unavailable' ? 503 : 400, { error: e.userMessage, reason: e.reason });
    console.error('validate-discount-code', e);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
