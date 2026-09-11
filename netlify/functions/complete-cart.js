// netlify/functions/complete-cart.js
//
// Called right after a successful order submission (personalize.html's
// form success, or checkout.html's process-payment success) to mark the
// matching abandoned_carts row as completed, so the reminder job leaves
// this customer alone.

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }
  const { email } = payload;
  if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'Email is required.' }) };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/abandoned_carts?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ completed: true }),
    });
    if (!res.ok) console.warn('complete-cart update failed (table may not exist yet):', await res.text());
    return { statusCode: 200, body: JSON.stringify({ updated: res.ok }) };
  } catch (err) {
    console.error('complete-cart error:', err);
    return { statusCode: 200, body: JSON.stringify({ updated: false }) };
  }
};
