// netlify/functions/upload-story-cover.js
//
// Admin-only: uploads (or removes) the cover photo for one story.
// Body: { slug, base64Data, mimeType }  -- or { slug, remove: true }
// The image is stored in the public "site-photos" bucket under stories/ and
// its URL saved on the story row (stories.cover_image_url).

const { isAdminRequest } = require('./_admin-check');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const BUCKET = 'site-photos';
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  if (!isAdminRequest(event)) return { statusCode: 401, body: JSON.stringify({ error: 'Not authorized.' }) };

  let p;
  try { p = JSON.parse(event.body); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) }; }
  const { slug, base64Data, mimeType, remove } = p;
  if (!slug || !/^[a-z0-9-]{1,120}$/.test(slug)) return { statusCode: 400, body: JSON.stringify({ error: 'Invalid story.' }) };

  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
  let url = null;

  if (!remove) {
    if (!base64Data || !TYPES[mimeType]) return { statusCode: 400, body: JSON.stringify({ error: 'Please choose a JPG, PNG or WebP image.' }) };
    const buf = Buffer.from(base64Data, 'base64');
    if (!buf.length || buf.length > 5 * 1024 * 1024) return { statusCode: 400, body: JSON.stringify({ error: 'Image must be under 5 MB.' }) };
    const path = `stories/${slug}-${Date.now()}.${TYPES[mimeType]}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST', headers: { ...headers, 'Content-Type': mimeType, 'x-upsert': 'true' }, body: buf,
    });
    if (!up.ok) {
      const t = await up.text();
      console.error('upload-story-cover storage error:', t);
      return { statusCode: 502, body: JSON.stringify({ error: 'Could not upload the image. Please try again.' }) };
    }
    url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  }

  // Remember the old file so we can clean it up after the switch.
  let oldUrl = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/stories?slug=eq.${slug}&select=cover_image_url`, { headers });
    const rows = await r.json();
    oldUrl = rows && rows[0] ? rows[0].cover_image_url : null;
    if (!rows || !rows[0]) return { statusCode: 404, body: JSON.stringify({ error: 'Save the story first, then add its photo.' }) };
  } catch { /* ignore */ }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/stories?slug=eq.${slug}`, {
    method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ cover_image_url: url, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return { statusCode: 502, body: JSON.stringify({ error: 'Could not save the photo on the story.' }) };

  const m = (oldUrl || '').match(/\/object\/public\/site-photos\/([^?]+)/);
  if (m && oldUrl !== url) {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: [decodeURIComponent(m[1])] }),
    }).catch(() => {});
  }
  return { statusCode: 200, body: JSON.stringify({ success: true, coverImageUrl: url }) };
};
