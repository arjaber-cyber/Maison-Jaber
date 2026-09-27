// netlify/functions/delete-story.js
//
// Admin-only: permanently removes one story from the catalog (built-in or
// custom). Past orders are unaffected -- they store the story title with the
// order itself. Its cover photo file is removed from storage too.

const { isAdminRequest } = require('./_admin-check');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const BUCKET = 'site-photos';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  if (!isAdminRequest(event)) return { statusCode: 401, body: JSON.stringify({ error: 'Not authorized.' }) };

  let slug;
  try { slug = JSON.parse(event.body).slug; } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) }; }
  if (!slug || !/^[a-z0-9-]{1,120}$/.test(slug)) return { statusCode: 400, body: JSON.stringify({ error: 'Invalid story.' }) };

  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/stories?slug=eq.${slug}`, {
      method: 'DELETE', headers: { ...headers, Prefer: 'return=representation' },
    });
    const rows = await res.json().catch(() => []);
    if (!res.ok || !Array.isArray(rows) || !rows.length) {
      console.error('delete-story failed:', res.status, rows);
      return { statusCode: 404, body: JSON.stringify({ error: 'Story not found (it may already be deleted).' }) };
    }
    // Best-effort: remove the cover and preview image files too.
    const urls = [rows[0].cover_image_url, ...(Array.isArray(rows[0].preview_images) ? rows[0].preview_images : [])];
    const prefixes = urls.map(u => (u || '').match(/\/object\/public\/site-photos\/([^?]+)/)).filter(Boolean).map(m => decodeURIComponent(m[1]));
    if (prefixes.length) {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
        method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes }),
      }).catch(() => {});
    }
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('delete-story error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong deleting the story.' }) };
  }
};
