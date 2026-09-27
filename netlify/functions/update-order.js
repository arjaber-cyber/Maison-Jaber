// netlify/functions/update-order.js
//
// Admin-only: update one order's fulfillment stage, payment status and/or
// internal notes. Requires the x-admin-password header (see _admin-check.js)
// and SUPABASE_SERVICE_ROLE_KEY in Netlify env (the orders table is locked).

const { isAdminRequest } = require('./_admin-check');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

const STAGES = ['received', 'preparing', 'awaiting_approval', 'sent_to_printing', 'received_from_printing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT = ['pending', 'pending_cod', 'paid', 'refunded', 'failed'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  if (!isAdminRequest(event)) return { statusCode: 401, body: JSON.stringify({ error: 'Not authorized.' }) };

  let p;
  try { p = JSON.parse(event.body); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) }; }
  const { orderId, orderStatus, paymentStatus, adminNotes } = p;
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid orderId.' }) };

  const patch = {};
  if (orderStatus !== undefined) {
    if (!STAGES.includes(orderStatus)) return { statusCode: 400, body: JSON.stringify({ error: 'Invalid stage.' }) };
    patch.order_status = orderStatus;
    patch.status_updated_at = new Date().toISOString();
  }
  if (paymentStatus !== undefined) {
    if (!PAYMENT.includes(paymentStatus)) return { statusCode: 400, body: JSON.stringify({ error: 'Invalid payment status.' }) };
    patch.payment_status = paymentStatus;
  }
  if (adminNotes !== undefined) patch.admin_notes = String(adminNotes).slice(0, 4000);
  if (!Object.keys(patch).length) return { statusCode: 400, body: JSON.stringify({ error: 'Nothing to update.' }) };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(patch),
    });
    const rows = await res.json().catch(() => []);
    if (!res.ok || !Array.isArray(rows) || !rows.length) {
      console.error('update-order failed:', res.status, rows);
      return { statusCode: 502, body: JSON.stringify({ error: 'Could not save. Check that SUPABASE_SERVICE_ROLE_KEY is set in Netlify.' }) };
    }
    const { items, ...order } = rows[0];
    return { statusCode: 200, body: JSON.stringify({ order }) };
  } catch (err) {
    console.error('update-order error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong saving the change.' }) };
  }
};
