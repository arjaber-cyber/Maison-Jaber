// netlify/functions/story-previews.js
//
// Admin-only: manage the "A glimpse inside" preview images of one story.
// Body (JSON), one of:
//   { slug, action: 'add', base64Data, mimeType }   -> uploads + appends
//   { slug, action: 'remove', url }                  -> removes (and deletes the file)
//   { slug, action: 'move', url, dir: -1 | 1 }        -> reorders
// Images live in the public "site-photos" bucket under stories/previews/.
// The ordered list is stored in stories.preview_images (JSON array of URLs).

const { isAdminRequest } = require('./_admin-check');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const BUCKET = 'site-photos';
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_PREVIEWS = 20;

const json = (statusCode, body) => ({ statusCode, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!isAdminRequest(event)) return json(401, { error: 'Not authorized.' });

  let p;
  try { p = JSON.parse(event.body); } catch { return json(400, { error: 'Invalid request.' }); }
  const { slug, action } = p;
  if (!slug || !/^[a-z0-9-]{1,120}$/.test(slug)) return json(400, { error: 'Invalid story.' });

  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

  // Current list
  let list;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/stories?slug=eq.${slug}&select=preview_images`, { headers });
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows[0]) return json(404, { error: 'Save the story first, then add previews.' });
    list = Array.isArray(rows[0].preview_images) ? rows[0].preview_images : [];
  } catch { return json(502, { error: 'Could not read the story.' }); }

  let removedUrl = null;
  if (action === 'add') {
    const { base64Data, mimeType } = p;
    if (!base64Data || !TYPES[mimeType]) return json(400, { error: 'Please choose a JPG, PNG or WebP image.' });
    if (list.length >= MAX_PREVIEWS) return json(400, { error: `A story can have up to ${MAX_PREVIEWS} preview images.` });
    const buf = Buffer.from(base64Data, 'base64');
    if (!buf.length || buf.length > 5 * 1024 * 1024) return json(400, { error: 'Image must be under 5 MB.' });
    const path = `stories/previews/${slug}-${Date.now()}-${Math.floor(Math.random() * 1e4)}.${TYPES[mimeType]}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST', headers: { ...headers, 'Content-Type': mimeType, 'x-upsert': 'true' }, body: buf,
    });
    if (!up.ok) { console.error('story-previews upload error:', await up.text()); return json(502, { error: 'Could not upload the image. Please try again.' }); }
    list = [...list, `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`];
  } else if (action === 'remove') {
    if (!list.includes(p.url)) return json(404, { error: 'That image is not on this story.' });
    list = list.filter(u => u !== p.url);
    removedUrl = p.url;
  } else if (action === 'move') {
    const i = list.indexOf(p.url);
    const j = i + (p.dir === -1 ? -1 : 1);
    if (i < 0) return json(404, { error: 'That image is not on this story.' });
    if (j >= 0 && j < list.length) { list = list.slice(); [list[i], list[j]] = [list[j], list[i]]; }
  } else {
    return json(400, { error: 'Unknown action.' });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/stories?slug=eq.${slug}`, {
    method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ preview_images: list, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return json(502, { error: 'Could not save the change.' });

  if (removedUrl) {
    const m = removedUrl.match(/\/object\/public\/site-photos\/([^?]+)/);
    if (m) {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
        method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: [decodeURIComponent(m[1])] }),
      }).catch(() => {});
    }
  }
  return json(200, { success: true, previewImages: list });
};
