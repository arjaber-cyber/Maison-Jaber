// netlify/functions/get-submissions.js
//
// Returns all "book-request" form submissions, but only to a verified admin.
//
// SETUP (one-time, in Netlify: Site settings > Environment variables):
//   1. NETLIFY_API_TOKEN — create at app.netlify.com > User settings > Applications > New access token
//   2. ADMIN_EMAILS — comma-separated list of emails allowed to view the dashboard, e.g. ar.jaber@hotmail.com
// Redeploy after adding these.

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
const SITE_ID = 'd48f5b64-a318-4ef9-8b60-a9704a807836';

exports.handler = async (event) => {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not signed in.' }) };
  }
  const token = authHeader.replace('Bearer ', '');

  // Verify this is a real, currently-valid Supabase session
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

  const netlifyToken = process.env.NETLIFY_API_TOKEN;
  if (!netlifyToken) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Dashboard is not fully set up yet: add NETLIFY_API_TOKEN in Netlify environment variables, then redeploy.' })
    };
  }

  try {
    const formsRes = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/forms`, {
      headers: { Authorization: `Bearer ${netlifyToken}` }
    });
    if (!formsRes.ok) throw new Error('Could not reach Netlify to list forms.');
    const forms = await formsRes.json();
    const form = forms.find(f => f.name === 'book-request');
    if (!form) {
      return { statusCode: 200, body: JSON.stringify({ submissions: [] }) };
    }

    const subsRes = await fetch(`https://api.netlify.com/api/v1/forms/${form.id}/submissions`, {
      headers: { Authorization: `Bearer ${netlifyToken}` }
    });
    if (!subsRes.ok) throw new Error('Could not reach Netlify to list submissions.');
    const submissions = await subsRes.json();

    // Attach fulfillment status for each submission, if the order_status table exists
    let statusMap = {};
    try {
      const statusRes = await fetch(`${SUPABASE_URL}/rest/v1/order_status?select=submission_id,status`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
      });
      if (statusRes.ok) {
        const rows = await statusRes.json();
        statusMap = Object.fromEntries(rows.map(r => [r.submission_id, r.status]));
      }
    } catch { /* order_status table may not exist yet — default status will be used */ }

    const enriched = submissions.map(s => ({ ...s, status: statusMap[String(s.id)] || 'received' }));

    return { statusCode: 200, body: JSON.stringify({ submissions: enriched }) };
  } catch (err) {
    console.error('get-submissions error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong loading submissions.' }) };
  }
};
