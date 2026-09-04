// netlify/functions/update-order-status.js
//
// Updates the fulfillment stage of one order. Requires the order_status
// table (see get-submissions.js comments for the same Supabase setup notes).

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';

const VALID_STAGES = [
  'received', 'preparing', 'awaiting_approval', 'sent_to_printing',
  'received_from_printing', 'shipped', 'delivered'
];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

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
    return { statusCode: 403, body: JSON.stringify({ error: 'This account is not authorized.' }) };
  }

  let payload;
  try { payload = JSON.parse(event.body); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) }; }

  const { submissionId, status } = payload;
  if (!submissionId || !VALID_STAGES.includes(status)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid submissionId/status.' }) };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/order_status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify({ submission_id: submissionId, status, updated_at: new Date().toISOString() })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Supabase upsert error:', errText);
      return { statusCode: 502, body: JSON.stringify({ error: 'Could not save status. The order_status table may not exist yet.' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('update-order-status error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong saving the status.' }) };
  }
};
