// netlify/functions/get-site-photos.js
//
// Public, read-only. Returns the current filename->URL overrides so
// site-photos.js can swap in admin-uploaded photos on every page load.
// Degrades gracefully to an empty override set if the `site_photos` table
// doesn't exist yet -- every page just keeps showing its default images.

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';

exports.handler = async () => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/site_photos?select=filename,url`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) {
      return { statusCode: 200, headers: { 'Cache-Control': 'public, max-age=60' }, body: JSON.stringify({ overrides: {}, tableReady: false }) };
    }
    const rows = await res.json();
    const overrides = {};
    rows.forEach(r => { overrides[r.filename] = r.url; });
    return { statusCode: 200, headers: { 'Cache-Control': 'public, max-age=60' }, body: JSON.stringify({ overrides, tableReady: true }) };
  } catch (err) {
    console.error('get-site-photos error:', err);
    return { statusCode: 200, body: JSON.stringify({ overrides: {}, tableReady: false }) };
  }
};
