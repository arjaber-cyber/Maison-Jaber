// netlify/functions/tabby-refund.js
//
// Admin-only: refunds a paid Tabby order in full through Tabby's API
// (POST /api/v2/payments/{id}/refunds). Tabby then refunds the customer's
// instalments. The admin panel calls this from "Refund via Tabby", then marks
// the order refunded as usual (which can email the customer).
//
// Safe to press twice: the refund amount is whatever is still captured and
// not yet refunded, and each refund has a unique reference_id from the order.
//
// POST { orderId }   header x-admin-password
// Env: TABBY_SECRET_KEY, ADMIN_PASSWORD, SUPABASE_SERVICE_ROLE_KEY

const { isAdminRequest } = require('./_admin-check');
const { SUPABASE_URL, SUPABASE_KEY } = require('./_pricing');
const { tabby, secretKey, money, paymentIdOf, appendNote } = require('./_tabby');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const sum = (list, key = 'amount') => (Array.isArray(list) ? list : []).reduce((s, x) => s + Number((x && x[key]) || 0), 0);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!isAdminRequest(event)) return json(401, { error: 'Wrong admin password.' });
  if (!secretKey()) return json(400, { error: 'TABBY_SECRET_KEY is not set in Netlify.' });

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(b.orderId || ''))}&select=*`, { headers: H });
  const [order] = r.ok ? await r.json() : [];
  if (!order) return json(404, { error: 'Order not found.' });
  if (order.payment_method !== 'tabby') return json(400, { error: 'This order was not paid with Tabby.' });
  const pid = paymentIdOf(order);
  if (!pid) return json(400, { error: 'No Tabby payment id on this order. Refund it from the Tabby dashboard instead.' });

  const p = await tabby(`/api/v2/payments/${encodeURIComponent(pid)}`);
  if (!p.ok) return json(502, { error: `Could not read the payment from Tabby (${p.status}).` });
  const pay = p.data || {};
  const left = Math.round((sum(pay.captures) - sum(pay.refunds)) * 100) / 100;
  if (left <= 0) {
    return json(200, { ok: true, alreadyRefunded: sum(pay.refunds) > 0, refunded: money(sum(pay.refunds)), message: sum(pay.refunds) > 0 ? 'Already refunded in Tabby.' : 'Nothing was captured, so there is nothing to refund.' });
  }

  const n = (Array.isArray(pay.refunds) ? pay.refunds.length : 0) + 1;
  const ref = await tabby(`/api/v2/payments/${encodeURIComponent(pid)}/refunds`, {
    method: 'POST',
    body: { amount: money(left), reference_id: `refund-${order.order_number}-${n}`, reason: String(b.reason || 'Refund issued by Hikaya').slice(0, 200) },
  });
  if (!ref.ok) {
    console.error('tabby refund failed', pid, ref.status, JSON.stringify(ref.data).slice(0, 300));
    return json(502, { error: `Tabby did not accept the refund (${ref.status}). Try again or refund from the Tabby dashboard.` });
  }

  await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ admin_notes: appendNote(order, `Tabby refund AED ${money(left)} sent (${new Date().toISOString().slice(0, 10)}).`) }),
  }).catch(() => null);
  return json(200, { ok: true, refunded: money(left) });
};
