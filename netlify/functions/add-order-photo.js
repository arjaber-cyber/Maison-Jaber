// netlify/functions/add-order-photo.js
//
// "Add the photo later" (Nov 2026): a parent can order without a photo and upload it afterwards from
// the private link in their confirmation email / thank-you screen (hikaya/add-photo.html?t=<token>).
// The same page also serves a re-upload when our team asks for a clearer photo.
//
//   GET  ?t=<orders.tracking_token>
//        -> { status:'ok', lang, orderNumber, firstName, books:[{ i, childName, story, slug, bookLanguage, hasPhoto, needsPhoto }] }
//        -> { status:'not_found' | 'closed' }
//   POST { t, i, base64Data, mimeType, consent:true }
//        -> { ok:true, childName }   photo saved to the private bucket and attached to book i
//
// Rules:
//  - The tracking token is long and random; only someone who received the order email has it.
//  - Photos go to the same private "order-photos" bucket as at ordering (date folder, so the
//    15-day automatic deletion in purge-child-photos.js covers them too).
//  - Permission is required on upload (same wording as at ordering), and recorded on the book.
//  - At most 2 photos per book; uploads stop once printing has started or the order is cancelled.
//  - The owner gets a WhatsApp alert so production can start (never the customer).

const crypto = require('crypto');
const R = require('./_recovery');
const { orderLang, parseItems } = require('./_templates');
const { normalizeStage } = require('./_stages');
const { sendOwnerAlert } = require('./_whatsapp');

const BUCKET = 'order-photos';
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 4.5 * 1024 * 1024;
const MAX_PER_BOOK = 2;
const OPEN_STAGES = ['received', 'ai_production'];
const COLS = 'id,order_number,full_name,items,order_status,payment_status,order_type,photo_consent_at';

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }, body: JSON.stringify(body) });
const validToken = t => typeof t === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(t);

async function loadOrder(token) {
  const r = await R.sb(`orders?tracking_token=eq.${encodeURIComponent(token)}&select=${COLS}&limit=1`);
  if (!r.ok) throw new Error('order lookup failed ' + r.status);
  return (await r.json())[0] || null;
}
const isOpen = o => o && normalizeStage(o.order_status) !== 'cancelled' && OPEN_STAGES.includes(normalizeStage(o.order_status))
  && !['refunded', 'awaiting_payment', 'payment_start_failed', 'amount_mismatch', 'code_rejected'].includes(o.payment_status);
const photoCount = it => (Array.isArray(it.photoPaths) ? it.photoPaths.length : 0);

exports.handler = async (event) => {
  if (!R.SERVICE_KEY) { console.error('add-order-photo: SUPABASE_SERVICE_ROLE_KEY missing'); return json(503, { error: 'unavailable' }); }

  if (event.httpMethod === 'GET') {
    const token = String((event.queryStringParameters || {}).t || '');
    if (!validToken(token)) return json(200, { status: 'not_found' });
    try {
      const o = await loadOrder(token);
      if (!o) return json(200, { status: 'not_found' });
      const items = parseItems(o);
      const base = { lang: orderLang(o), orderNumber: o.order_number, firstName: String(o.full_name || '').trim().split(/\s+/)[0] || '' };
      if (!isOpen(o)) return json(200, Object.assign({ status: 'closed' }, base));
      return json(200, Object.assign({ status: 'ok' }, base, {
        books: items.map((it, i) => ({
          i, childName: it.childName || '', story: it.story || '', slug: it.slug || '', bookLanguage: require('./_bookLangs').normBookLang(it.bookLanguage),
          hasPhoto: photoCount(it) > 0, needsPhoto: it.photoLater === true && photoCount(it) === 0, full: photoCount(it) >= MAX_PER_BOOK,
        })),
      }));
    } catch (err) {
      console.error('add-order-photo GET:', err.message);
      return json(500, { error: 'server' });
    }
  }

  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  let p;
  try { p = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'bad_request' }); }
  if (!validToken(p.t)) return json(400, { error: 'not_found' });
  if (p.consent !== true) return json(400, { error: 'consent' });
  const ext = TYPES[String(p.mimeType || '').toLowerCase()];
  if (!ext || typeof p.base64Data !== 'string') return json(400, { error: 'type' });
  let buf;
  try { buf = Buffer.from(p.base64Data, 'base64'); } catch { return json(400, { error: 'type' }); }
  if (!buf.length || buf.length > MAX_BYTES) return json(413, { error: 'size' });

  try {
    const o = await loadOrder(p.t);
    if (!o) return json(404, { error: 'not_found' });
    if (!isOpen(o)) return json(409, { error: 'closed' });
    const items = parseItems(o);
    const idx = Number(p.i);
    if (!Number.isInteger(idx) || idx < 0 || idx >= items.length) return json(400, { error: 'book' });
    if (photoCount(items[idx]) >= MAX_PER_BOOK) return json(409, { error: 'full' });

    const day = new Date().toISOString().slice(0, 10);
    const path = `${day}/${crypto.randomBytes(16).toString('hex')}.${ext}`;
    const up = await fetch(`${R.SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: { apikey: R.SERVICE_KEY, Authorization: `Bearer ${R.SERVICE_KEY}`, 'Content-Type': String(p.mimeType).toLowerCase(), 'x-upsert': 'false' },
      body: buf,
    });
    if (!up.ok) { console.error('add-order-photo: storage error', up.status, await up.text().catch(() => '')); return json(502, { error: 'storage' }); }

    // Re-read just before writing so two quick uploads (two books) never overwrite each other.
    const fresh = await loadOrder(p.t);
    const list = parseItems(fresh || o);
    const it = Object.assign({}, list[idx]);
    const now = new Date().toISOString();
    it.photoPaths = (Array.isArray(it.photoPaths) ? it.photoPaths : []).concat(path).slice(0, MAX_PER_BOOK);
    it.photoCount = it.photoPaths.length;
    it.photoConsent = true;
    it.photoConsentAt = it.photoConsentAt || now;
    if (it.photoLater) it.photoAddedAt = now; // keeps photoLater: true as a record of how it was ordered
    list[idx] = it;
    const patch = { items: list };
    if (!o.photo_consent_at) patch.photo_consent_at = now;
    const w = await R.sb(`orders?id=eq.${encodeURIComponent(o.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
    if (!w.ok) { console.error('add-order-photo: order update failed', w.status, await w.text().catch(() => '')); return json(502, { error: 'save' }); }

    try {
      const waiting = list.filter(x => x && x.photoLater && !(Array.isArray(x.photoPaths) && x.photoPaths.length)).length;
      await sendOwnerAlert('Photo received for ' + (o.order_number || 'an order'),
        `${it.childName || 'Child'} · ${it.story || 'story'} · uploaded by the customer from their link.${waiting ? ` Still waiting for ${waiting} more photo${waiting > 1 ? 's' : ''} on this order.` : ' All photos are in, ready for production.'}`);
    } catch (_) { /* alerts never block the upload */ }

    return json(200, { ok: true, childName: it.childName || '' });
  } catch (err) {
    console.error('add-order-photo POST:', err.message);
    return json(500, { error: 'server' });
  }
};
