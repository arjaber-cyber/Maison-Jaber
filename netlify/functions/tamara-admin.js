// netlify/functions/tamara-admin.js
//
// Admin-only Tamara actions from the orders dashboard:
//   action 'capture' - take the money now (normally automatic when the order
//                      is handed to the delivery company)
//   action 'cancel'  - cancel an authorised, not-yet-captured order: the
//                      customer is not charged at all
//   action 'refund'  - refund a captured order in full through Tamara
//                      (Tamara orders are always refunded through Tamara,
//                      never as store credit)
//   action 'status'  - just show what Tamara currently says
//
// POST { orderId, action, reason? }   header x-admin-password
// Env: TAMARA_API_TOKEN, ADMIN_PASSWORD, SUPABASE_SERVICE_ROLE_KEY

const { isAdminRequest } = require('./_admin-check');
const { SUPABASE_URL, SUPABASE_KEY } = require('./_pricing');
const { apiToken, tamaraIdOf, getTamaraOrder, captureTamara, cancelTamara, refundTamara } = require('./_tamara');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!isAdminRequest(event)) return json(401, { error: 'Wrong admin password.' });
  if (!apiToken()) return json(400, { error: 'TAMARA_API_TOKEN is not set in Netlify.' });

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(String(b.orderId || ''))}&select=*`, { headers: H });
  const [order] = r.ok ? await r.json() : [];
  if (!order) return json(404, { error: 'Order not found.' });
  if (order.payment_method !== 'tamara') return json(400, { error: 'This order was not paid with Tamara.' });

  try {
    if (b.action === 'status') {
      const t = await getTamaraOrder(tamaraIdOf(order));
      return t ? json(200, { ok: true, status: t.status }) : json(404, { error: 'Tamara does not know this order.' });
    }
    const res = b.action === 'capture' ? await captureTamara(order)
      : b.action === 'cancel' ? await cancelTamara(order)
      : b.action === 'refund' ? await refundTamara(order, b.reason)
      : null;
    if (!res) return json(400, { error: 'Unknown action.' });
    return json(res.ok ? 200 : (res.notCaptured ? 409 : 502), res);
  } catch (e) {
    console.error('tamara-admin', b.action, e.message);
    return json(502, { error: 'Could not reach Tamara. Try again in a moment.' });
  }
};
