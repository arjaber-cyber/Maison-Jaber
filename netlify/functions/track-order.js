// netlify/functions/track-order.js
//
// Lets ANY visitor (no account needed) check an order's status by
// providing both the order number and the email it was placed under --
// the same "order number + email" pattern virtually every store uses for
// guest order tracking. Requiring both prevents someone from guessing
// order numbers to see a stranger's order.

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
// Server-side key (set SUPABASE_SERVICE_ROLE_KEY in Netlify env). The tables are locked with RLS,
// so the public anon key alone can only read public storefront data.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

const { STAGES: STAGE_ORDER, normalizeStage } = require('./_stages');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  const orderNumber = (payload.orderNumber || '').trim().toUpperCase();
  const email = (payload.email || '').trim().toLowerCase();
  if (!orderNumber || !email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please enter both your order number and email.' }) };
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}&email=eq.${encodeURIComponent(email)}&select=*`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) {
      return { statusCode: 404, body: JSON.stringify({ error: 'We could not find that order. Double-check your order number and email.' }) };
    }
    const rows = await res.json();
    if (!rows || rows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'We could not find that order. Double-check your order number and email.' }) };
    }
    const row = rows[0];
    let items = [];
    try { items = JSON.parse(row.items || '[]'); } catch { items = []; }

    const currentStage = normalizeStage(row.order_status);
    /* When each step happened (dates only), for the customer timeline. */
    const stageDates = {};
    (Array.isArray(row.stage_history) ? row.stage_history : []).forEach(h => { const k = normalizeStage(h && h.stage); if (h && h.at) stageDates[k] = h.at; });
    if (!stageDates.received) stageDates.received = row.created_at;
    const stageIndex = STAGE_ORDER.indexOf(currentStage);

    return {
      statusCode: 200,
      body: JSON.stringify({
        orderNumber: row.order_number, items, amount: row.amount, currency: row.currency,
        createdAt: row.created_at, orderStatus: currentStage, stageIndex: stageIndex === -1 ? 0 : stageIndex,
        stages: STAGE_ORDER, stageDates, cancelled: currentStage === 'cancelled', city: row.city, country: row.country,
        courier: row.courier || null, trackingNumber: row.tracking_number || null, trackingUrl: row.tracking_url || null,
        // Unpaid online orders must not look like confirmed orders to the customer.
        awaitingPayment: row.payment_method === 'ziina' && row.payment_status !== 'paid',
      })
    };
  } catch (err) {
    console.error('track-order error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong. Please try again.' }) };
  }
};
