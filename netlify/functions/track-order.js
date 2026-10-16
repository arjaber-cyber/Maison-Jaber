// netlify/functions/track-order.js
//
// Secure order tracking. Three ways in:
//
//  1. Private link  { action: 'link', token }
//     Every order has a long random tracking_token. Emails and the account page link to
//     track-order.html?t=<token>, which opens that one order with no code needed.
//
//  2. One-time code (guests)
//     a) { action: 'request', query }  query = order number, email or phone used at checkout.
//        If it matches orders, a 6-digit code is emailed to the address on the order.
//        The reply is ALWAYS the same ("if we have an order, we've sent a code"), so nobody
//        can use this page to check whether someone is a customer.
//     b) { action: 'verify', ticket, code }  -> all orders for that email, newest first.
//     Codes expire after 10 minutes, work once, and allow 5 wrong tries. Requests are
//     rate-limited per email and per connection.
//
//  3. Signed-in customers don't use this at all: the account page lists their orders and
//     links each one with its private link (get-my-orders.js, verified by their login).
//
// Nothing is ever returned without the private link or a correct code.

const crypto = require('crypto');
const { sendEmail } = require('./_email');
const { trackCode } = require('./_templates');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const SECRET = process.env.TRACK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'hikaya-track';
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

const { STAGES: STAGE_ORDER, normalizeStage } = require('./_stages');

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const MAX_PER_EMAIL_HOUR = 5;
const MAX_PER_IP_HOUR = 15;

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const COLS = 'order_number,email,phone_digits,items,amount,currency,created_at,order_status,stage_history,courier,tracking_number,tracking_url,payment_method,payment_status,tracking_token';
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const hashCode = (ticket, code) => sha(`${SECRET}:${ticket}:${code}`);
const safeEqual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Phone numbers are compared on digits only, ignoring the country code / leading zero.
const normPhone = d => String(d || '').replace(/\D/g, '').replace(/^00/, '').replace(/^0+/, '');
const phoneMatches = (rowDigits, q) => { const r = normPhone(rowDigits); return !!r && (r.endsWith(q) || q.endsWith(r)); };

async function db(path, opts) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...(opts || {}), headers: { ...H, ...((opts && opts.headers) || {}) } });
  if (!r.ok) throw new Error(`db ${r.status} ${await r.text().catch(() => '')}`);
  return r.status === 204 ? null : r.json();
}

function shape(row) {
  let items = [];
  try { items = JSON.parse(row.items || '[]'); } catch { items = []; }
  const currentStage = normalizeStage(row.order_status);
  const stageDates = {};
  (Array.isArray(row.stage_history) ? row.stage_history : []).forEach(h => { const k = normalizeStage(h && h.stage); if (h && h.at) stageDates[k] = h.at; });
  if (!stageDates.received) stageDates.received = row.created_at;
  const stageIndex = STAGE_ORDER.indexOf(currentStage);
  return {
    orderNumber: row.order_number,
    token: row.tracking_token, // only ever returned to someone who already proved access
    items: items.map(i => ({ story: i.story, childName: i.childName, bookLanguage: i.bookLanguage })),
    amount: row.amount, currency: row.currency, createdAt: row.created_at,
    orderStatus: currentStage, stageIndex: stageIndex === -1 ? 0 : stageIndex, stages: STAGE_ORDER, stageDates,
    cancelled: currentStage === 'cancelled',
    courier: row.courier || null, trackingNumber: row.tracking_number || null, trackingUrl: row.tracking_url || null,
    awaitingPayment: row.payment_method === 'ziina' && row.payment_status !== 'paid',
  };
}

/** Which email(s) does this order number / email / phone belong to? */
async function emailsFor(raw) {
  let filter, keep = () => true;
  if (/^HK-?\d{4,14}$/i.test(raw)) {
    filter = `order_number=eq.${encodeURIComponent(raw.toUpperCase().replace(/^HK-?/, 'HK-'))}`;
  } else if (raw.includes('@')) {
    if (!/^[^\s@*]+@[^\s@*]+\.[^\s@*]{2,}$/.test(raw)) return { bad: 'email' };
    const email = raw.toLowerCase();
    filter = `email=ilike.${encodeURIComponent(email)}`;
    keep = r => String(r.email || '').trim().toLowerCase() === email;
  } else {
    const q = normPhone(raw);
    if (!/^[\d\s+()\-.]+$/.test(raw) || q.length < 8 || q.length > 15) return { bad: 'phone' };
    filter = `phone_digits=like.*${q.slice(-8)}`;
    keep = r => phoneMatches(r.phone_digits, q);
  }
  const rows = (await db(`orders?${filter}&select=email,phone_digits,created_at&order=created_at.desc&limit=25`)).filter(keep);
  // The most recent order's email receives the code.
  const email = rows.length ? String(rows[0].email || '').trim().toLowerCase() : '';
  return { email };
}

async function handleRequest(p, ip) {
  const raw = String(p.query || '').trim().slice(0, 120);
  if (!raw) return json(400, { error: 'Please enter your order number, email or phone number.', reason: 'empty' });

  const since = new Date(Date.now() - 3600e3).toISOString();
  const ipCount = ip ? (await db(`track_codes?ip=eq.${encodeURIComponent(ip)}&created_at=gte.${since}&select=id`)).length : 0;
  if (ipCount >= MAX_PER_IP_HOUR) return json(429, { error: 'Too many attempts. Please try again in an hour.', reason: 'rate' });

  const found = await emailsFor(raw);
  if (found.bad) return json(400, { error: 'Please enter an order number like HK-12345678, an email address, or a full phone number.', reason: found.bad });

  const ticket = crypto.randomUUID();
  const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
  let send = !!found.email;
  if (send) {
    const emailCount = (await db(`track_codes?email=eq.${encodeURIComponent(found.email)}&created_at=gte.${since}&select=id`)).length;
    if (emailCount >= MAX_PER_EMAIL_HOUR) send = false; // silently stop flooding someone's inbox
  }
  // A ticket is stored even when nothing matched, so the reply looks the same either way.
  await db('track_codes', {
    method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ id: ticket, email: send ? found.email : '', code_hash: hashCode(ticket, send ? code : crypto.randomUUID()), ip: ip || null, expires_at: new Date(Date.now() + CODE_TTL_MIN * 60e3).toISOString() }),
  });
  if (send) {
    const m = trackCode(code, p.lang === 'ar' ? 'ar' : 'en');
    const r = await sendEmail({ to: found.email, subject: m.subject, html: m.html });
    if (!r.sent) console.error('track code email not sent', r.reason);
  }
  return json(200, { ok: true, ticket });
}

async function handleVerify(p) {
  const ticket = String(p.ticket || '');
  const code = String(p.code || '').replace(/\D/g, '');
  if (!/^[0-9a-f-]{36}$/.test(ticket) || code.length !== 6) return json(400, { error: 'Please enter the 6-digit code from the email.', reason: 'code' });
  const rows = await db(`track_codes?id=eq.${ticket}&select=*`);
  const t = rows[0];
  if (!t || t.used || new Date(t.expires_at) < new Date()) return json(400, { error: 'This code has expired. Please request a new one.', reason: 'expired' });
  if (t.attempts >= MAX_ATTEMPTS) return json(400, { error: 'Too many wrong codes. Please request a new one.', reason: 'locked' });
  if (!t.email || !safeEqual(hashCode(ticket, code), t.code_hash)) {
    await db(`track_codes?id=eq.${ticket}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ attempts: t.attempts + 1 }) });
    const left = MAX_ATTEMPTS - t.attempts - 1;
    return json(400, { error: left > 0 ? 'That code is not right. Please check the email and try again.' : 'Too many wrong codes. Please request a new one.', reason: left > 0 ? 'wrong' : 'locked', left });
  }
  await db(`track_codes?id=eq.${ticket}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ used: true }) });
  const orders = (await db(`orders?email=ilike.${encodeURIComponent(t.email)}&select=${COLS}&order=created_at.desc&limit=20`))
    .filter(r => String(r.email || '').trim().toLowerCase() === t.email).map(shape);
  if (!orders.length) return json(404, { error: 'We could not find any orders.', reason: 'none' });
  return json(200, { orders });
}

async function handleLink(p) {
  const token = String(p.token || '');
  if (!/^[0-9a-f]{64}$/.test(token)) return json(404, { error: 'This tracking link is not valid.', reason: 'link' });
  const rows = await db(`orders?tracking_token=eq.${token}&select=${COLS}`);
  if (!rows.length) return json(404, { error: 'This tracking link is not valid.', reason: 'link' });
  return json(200, { orders: rows.map(shape) });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  let p;
  try { p = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }
  const hdr = event.headers || {};
  const ip = String(hdr['x-nf-client-connection-ip'] || (hdr['x-forwarded-for'] || '').split(',')[0] || '').trim().slice(0, 64);
  try {
    if (p.action === 'link') return await handleLink(p);
    if (p.action === 'verify') return await handleVerify(p);
    if (p.action === 'request') return await handleRequest(p, ip);
    return json(400, { error: 'Please request a tracking code first.', reason: 'action' });
  } catch (err) {
    console.error('track-order error:', err);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
