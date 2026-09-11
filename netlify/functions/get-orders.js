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
// Same admin-gating as get-submissions.js: requires a signed-in Supabase
// session whose email is in ADMIN_EMAILS.

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';

exports.handler = async (event) => {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not signed in.' }) };
  }
  const token = authHeader.replace('Bearer ', '');

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
  });
  if (!userRes.ok) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Your session has expired. Please sign in again.' }) };
  }
  const user = await userRes.json();

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (!adminEmails.includes((user.email || '').toLowerCase())) {
    return { statusCode: 403, body: JSON.stringify({ error: 'This account is not authorized to view the dashboard.' }) };
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
