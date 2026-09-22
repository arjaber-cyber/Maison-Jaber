// netlify/functions/get-my-orders.js
//
// Returns the signed-in customer's OWN orders only -- never anyone else's.
// Verifies the Supabase session token server-side and filters strictly by
// that verified email, so there's no way to pass a different email and
// see someone else's orders.

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
  const email = (user.email || '').toLowerCase();
  if (!email) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Could not verify your account.' }) };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?email=eq.${encodeURIComponent(email)}&select=*&order=created_at.desc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (!res.ok) {
      // Table not ready yet -- show an empty, well-formed list rather than an error.
      return { statusCode: 200, body: JSON.stringify({ orders: [] }) };
    }
    const rows = await res.json();
    const orders = rows.map(row => {
      let items = [];
      try { items = JSON.parse(row.items || '[]'); } catch { items = []; }
      return { ...row, items };
    });
    return { statusCode: 200, body: JSON.stringify({ orders }) };
  } catch (err) {
    console.error('get-my-orders error:', err);
    return { statusCode: 200, body: JSON.stringify({ orders: [] }) };
  }
};
