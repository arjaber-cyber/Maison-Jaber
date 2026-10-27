// netlify/functions/tamara-sweep.js
//
// Hourly safety net: the customer approves on Tamara but closes the tab before
// coming back, and the webhook is late or lost. Re-checks recent unpaid Tamara
// orders with Tamara and authorises any that were approved (same logic as the
// webhook, so nothing is handled twice). An approved order that is never
// authorised would otherwise expire and the book would never be made.

const { SUPABASE_URL, SUPABASE_KEY } = require('./_pricing');
const { settleFromTamara, apiToken } = require('./_tamara');

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

exports.handler = async () => {
  if (!apiToken()) return { statusCode: 200, body: 'no key' };
  const since = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?payment_method=eq.tamara&payment_status=eq.awaiting_payment&created_at=gte.${encodeURIComponent(since)}&select=order_number&limit=50`, { headers: H });
  if (!r.ok) { console.error('tamara sweep lookup failed', r.status); return { statusCode: 500, body: 'lookup failed' }; }
  const rows = await r.json();
  let paid = 0, closed = 0;
  for (const o of rows) {
    try {
      const res = await settleFromTamara({ orderNumber: o.order_number });
      if (res.paid) paid++; else if (res.status && res.status !== 'pending') closed++;
    } catch (e) { console.warn('tamara sweep', o.order_number, e.message); }
  }
  console.log(`tamara sweep: ${rows.length} checked, ${paid} authorised, ${closed} closed`);
  return { statusCode: 200, body: 'ok' };
};
