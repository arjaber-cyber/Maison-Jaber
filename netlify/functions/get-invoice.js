// netlify/functions/get-invoice.js
//
// Returns the data needed to render an invoice for one order, found by its private,
// unguessable tracking token, so a stranger can't pull up someone else's invoice.

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
// Server-side key (set SUPABASE_SERVICE_ROLE_KEY in Netlify env). The tables are locked with RLS,
// so the public anon key alone can only read public storefront data.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

exports.handler = async (event) => {
  // Invoices open only with the order's private link token (from the order emails, the
  // account page, or after the one-time tracking code). Order number + email is no longer enough.
  const token = (event.queryStringParameters?.t || '').trim();
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'This invoice link is not valid.' }) };
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?tracking_token=eq.${token}&select=*`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await res.json();
    if (!res.ok || !rows || rows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'This invoice link is not valid.' }) };
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
