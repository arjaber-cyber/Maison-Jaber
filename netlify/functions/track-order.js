// netlify/functions/track-order.js
//
// Lets ANY visitor (no account needed) check an order's status by
// providing both the order number and the email it was placed under --
// the same "order number + email" pattern virtually every store uses for
// guest order tracking. Requiring both prevents someone from guessing
// order numbers to see a stranger's order.

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';

const STAGE_ORDER = ['received', 'preparing', 'awaiting_approval', 'sent_to_printing', 'received_from_printing', 'shipped', 'delivered'];

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
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
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

    const currentStage = row.order_status || 'received';
    const stageIndex = STAGE_ORDER.indexOf(currentStage);

    return {
      statusCode: 200,
      body: JSON.stringify({
        orderNumber: row.order_number, items, amount: row.amount, currency: row.currency,
        createdAt: row.created_at, orderStatus: currentStage, stageIndex: stageIndex === -1 ? 0 : stageIndex,
        stages: STAGE_ORDER, city: row.city, country: row.country,
      })
    };
  } catch (err) {
    console.error('track-order error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong. Please try again.' }) };
  }
};
