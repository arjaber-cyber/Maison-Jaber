// netlify/functions/track-abandoned-cart.js
//
// Called from personalize.html the moment a visitor types a valid email
// (in either the sign-in or guest flow) but hasn't submitted their request
// yet. Logs a row to Supabase so send-abandoned-reminders.js (a scheduled
// function) can follow up later if they never finish.
//
// This degrades gracefully: if the `abandoned_carts` table doesn't exist
// yet in Supabase, this just logs a warning and returns success anyway --
// it should never block or break the personalize page.

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

  const { email, childName, story, ageEdition } = payload;
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email is required.' }) };
  }

  try {
    // Upsert on email so re-visiting the page updates the same row instead
    // of creating duplicates every time they type.
    const res = await fetch(`${SUPABASE_URL}/rest/v1/abandoned_carts?on_conflict=email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        email, child_name: childName || null, story: story || null, age_edition: ageEdition || null,
        completed: false, reminder_sent: false,
        last_seen_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      console.warn('abandoned_carts insert failed (table may not exist yet):', await res.text());
    }
    return { statusCode: 200, body: JSON.stringify({ tracked: res.ok }) };
  } catch (err) {
    console.error('track-abandoned-cart error:', err);
    // Never fail the page over this -- it's a nice-to-have, not critical.
    return { statusCode: 200, body: JSON.stringify({ tracked: false }) };
  }
};
