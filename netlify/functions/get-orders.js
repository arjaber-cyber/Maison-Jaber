// netlify/functions/get-orders.js
//
// Returns real completed orders from Supabase's `orders` table -- this is
// where the actual multi-book cart, bundle discount, and promo code data
// lands once checkout succeeds (see process-payment.js). This is separate
// from get-submissions.js, which only shows Netlify Forms data (one entry
// per book added to a cart, not the full completed order) -- the admin
// dashboard should treat THIS as the source of truth for what customers
// actually bought.
//
// Admin-gated via a single shared password (see admin-auth.js / ADMIN_PASSWORD).

const { isAdminRequest } = require('./_admin-check');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';

exports.handler = async (event) => {
  if (!isAdminRequest(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authorized.' }) };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (!res.ok) {
      // Table doesn't exist yet (the known blocked-migration issue) --
      // return an empty, well-formed response rather than an error, so
      // the dashboard just shows "no orders yet" instead of breaking.
      return { statusCode: 200, body: JSON.stringify({ orders: [], tableReady: false }) };
    }
    const rows = await res.json();
    const orders = rows.map(row => {
      let items = [];
      try { items = JSON.parse(row.items || '[]'); } catch { items = []; }
      return { ...row, items };
    });
    return { statusCode: 200, body: JSON.stringify({ orders, tableReady: true }) };
  } catch (err) {
    console.error('get-orders error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong loading orders.' }) };
  }
};
