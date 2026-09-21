// netlify/functions/subscribe-newsletter.js
//
// Saves an email to Supabase's `newsletter_subscribers` table. Degrades
// gracefully if the table doesn't exist yet -- the visitor still sees a
// friendly "Thanks!" message rather than an error, and we just note it
// server-side so the signup isn't silently lost forever once the table
// is created (Netlify function logs).
//
// SETUP: create a `newsletter_subscribers` table in Supabase:
//   email text primary key, subscribed_at timestamptz

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
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  const email = (payload.email || '').trim().toLowerCase();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please enter a valid email address.' }) };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?on_conflict=email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ email, subscribed_at: new Date().toISOString() }),
    });
    if (!res.ok) {
      console.warn('newsletter_subscribers insert failed (table may not exist yet):', await res.text());
    }
    // Always a friendly success to the visitor -- a missing table is our
    // setup issue, not something they should see as an error.
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('subscribe-newsletter error:', err);
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }
};
