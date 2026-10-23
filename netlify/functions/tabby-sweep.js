// netlify/functions/tabby-sweep.js
//
// Safety net for Tabby's "corner case" test: the customer finishes on Tabby
// but closes the tab before coming back, and the webhook is late or lost.
// Every hour this re-checks recent unpaid Tabby orders with Tabby and
// captures any that were approved (same logic as the webhook, so nothing is
// captured twice). Approved payments that are never captured would otherwise
// expire, leaving the customer charged nothing and the order stuck.

const { SUPABASE_URL, SUPABASE_KEY } = require('./_pricing');
const { settleFromTabby, paymentIdOf, secretKey } = require('./_tabby');

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

exports.handler = async () => {
  if (!secretKey()) return { statusCode: 200, body: 'no key' };
  const since = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?payment_method=eq.tabby&payment_status=eq.awaiting_payment&created_at=gte.${encodeURIComponent(since)}&select=order_number,admin_notes&limit=50`, { headers: H });
  if (!r.ok) { console.error('tabby sweep lookup failed', r.status); return { statusCode: 500, body: 'lookup failed' }; }
  const rows = await r.json();
  let paid = 0, closed = 0;
  for (const o of rows) {
    const pid = paymentIdOf(o);
    if (!pid) continue;
    try {
      const res = await settleFromTabby(pid);
      if (res.paid) paid++; else if (res.status && res.status !== 'pending') closed++;
    } catch (e) { console.warn('tabby sweep', o.order_number, e.message); }
  }
  console.log(`tabby sweep: ${rows.length} checked, ${paid} captured, ${closed} closed`);
  return { statusCode: 200, body: 'ok' };
};
