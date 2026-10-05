// netlify/functions/upload-child-photo.js
//
// Saves a parent's photo of their child to the PRIVATE Supabase Storage bucket
// "order-photos", so the photo travels with the order (the cart only keeps the
// returned storage path, never the image itself).
//
// POST { base64Data, mimeType }  ->  { path }
// - Only JPEG / PNG / WebP up to ~4.5 MB (the page resizes photos before upload).
// - Files are stored under a date folder (YYYY-MM-DD/<random>.jpg) so
//   purge-child-photos.js can delete everything older than 15 days.
// - The bucket is private: nobody can view a photo without a short-lived
//   signed link, which only the admin dashboard can request (get-orders.js).
// Env: SUPABASE_SERVICE_ROLE_KEY (required -- uploads are refused without it).
const crypto = require('crypto');
const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const BUCKET = 'order-photos';
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 4.5 * 1024 * 1024;
const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) { console.error('upload-child-photo: SUPABASE_SERVICE_ROLE_KEY is not set'); return json(503, { error: 'We could not save your photo right now. Please try again shortly.' }); }
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }
  const ext = TYPES[String(body.mimeType || '').toLowerCase()];
  if (!ext || typeof body.base64Data !== 'string') return json(400, { error: 'Please upload a JPEG, PNG or WebP photo.' });
  let buf;
  try { buf = Buffer.from(body.base64Data, 'base64'); } catch { return json(400, { error: 'That photo could not be read. Please try another.' }); }
  if (!buf.length || buf.length > MAX_BYTES) return json(413, { error: 'That photo is too large. Please try a smaller one.' });
  const day = new Date().toISOString().slice(0, 10);
  const path = `${day}/${crypto.randomBytes(16).toString('hex')}.${ext}`;
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': body.mimeType, 'x-upsert': 'false' },
      body: buf,
    });
    if (!res.ok) { console.error('upload-child-photo: storage error', res.status, await res.text().catch(() => '')); return json(502, { error: 'We could not save your photo. Please try again.' }); }
    return json(200, { path });
  } catch (err) {
    console.error('upload-child-photo error:', err);
    return json(502, { error: 'We could not save your photo. Please try again.' });
  }
};
