// netlify/functions/get-invoice.js
//
// Returns the data needed to render an invoice for one order. Same
// order-number + email requirement as track-order.js, so a stranger can't
// pull up someone else's invoice by guessing an order number.

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';

exports.handler = async (event) => {
  const orderNumber = (event.queryStringParameters?.orderNumber || '').trim().toUpperCase();
  const email = (event.queryStringParameters?.email || '').trim().toLowerCase();
  if (!orderNumber || !email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing order number or email.' }) };
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}&email=eq.${encodeURIComponent(email)}&select=*`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const rows = await res.json();
    if (!res.ok || !rows || rows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Invoice not found. Double-check your order number and email.' }) };
    }
    const row = rows[0];
    let items = [];
    try { items = JSON.parse(row.items || '[]'); } catch { items = []; }
    return {
      statusCode: 200,
      body: JSON.stringify({
        orderNumber: row.order_number, fullName: row.full_name, email: row.email,
        address: row.address, city: row.city, country: row.country,
        items, amount: row.amount, currency: row.currency, bundleDiscountPct: row.bundle_discount_pct || 0,
        promoCode: row.promo_code, paymentMethod: row.payment_method, createdAt: row.created_at,
      })
    };
  } catch (err) {
    console.error('get-invoice error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong loading the invoice.' }) };
  }
};
