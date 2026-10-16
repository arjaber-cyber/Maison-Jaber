// netlify/functions/track-order.js
//
// Guest order tracking (no account needed). The customer enters ONE of:
//   - their order number (HK-12345678)
//   - the email used at checkout
//   - the phone number used at checkout (any format: +971 50..., 050..., 00971...)
// and gets the status of the matching orders, newest first (up to 10).
//
// What comes back is deliberately limited to tracking info (story, child's first name,
// status timeline, courier). No address, phone or email is ever returned.
// The invoice link is only offered when the lookup was by email, because the invoice
// itself still needs order number + email (see get-invoice.js).

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
// Server-side key (set SUPABASE_SERVICE_ROLE_KEY in Netlify env). The tables are locked with RLS,
// so the public anon key alone can only read public storefront data.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

const { STAGES: STAGE_ORDER, normalizeStage } = require('./_stages');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const NOT_FOUND = 'We could not find an order with those details. Please check and try again.';
const COLS = 'order_number,email,phone_digits,items,amount,currency,created_at,order_status,stage_history,courier,tracking_number,tracking_url,payment_method,payment_status';

// Phone numbers are compared on digits only, ignoring the country code / leading zero.
const normPhone = d => String(d || '').replace(/\D/g, '').replace(/^00/, '').replace(/^0+/, '');
const phoneMatches = (rowDigits, q) => { const r = normPhone(rowDigits); return !!r && (r.endsWith(q) || q.endsWith(r)); };

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
    items: items.map(i => ({ story: i.story, childName: i.childName, bookLanguage: i.bookLanguage })),
    amount: row.amount, currency: row.currency, createdAt: row.created_at,
    orderStatus: currentStage, stageIndex: stageIndex === -1 ? 0 : stageIndex, stages: STAGE_ORDER, stageDates,
    cancelled: currentStage === 'cancelled',
    courier: row.courier || null, trackingNumber: row.tracking_number || null, trackingUrl: row.tracking_url || null,
    // Unpaid online orders must not look like confirmed orders to the customer.
    awaitingPayment: row.payment_method === 'ziina' && row.payment_status !== 'paid',
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  let p;
  try { p = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }

  // New pages send { query }; older links may still send { orderNumber, email }.
  const raw = String(p.query || p.orderNumber || p.email || '').trim().slice(0, 120);
  if (!raw) return json(400, { error: 'Please enter your order number, email or phone number.' });

  let by, filter, keep = () => true;
  if (/^HK-?\d{4,14}$/i.test(raw)) {
    by = 'order';
    const num = raw.toUpperCase().replace(/^HK-?/, 'HK-');
    filter = `order_number=eq.${encodeURIComponent(num)}`;
  } else if (raw.includes('@')) {
    if (!/^[^\s@*]+@[^\s@*]+\.[^\s@*]{2,}$/.test(raw)) return json(400, { error: 'Please enter a valid email address.', reason: 'email' });
    by = 'email';
    const email = raw.toLowerCase();
    filter = `email=ilike.${encodeURIComponent(email)}`;
    keep = r => String(r.email || '').trim().toLowerCase() === email;
  } else {
    const q = normPhone(raw);
    if (!/^[\d\s+()\-.]+$/.test(raw) || q.length < 8 || q.length > 15) return json(400, { error: 'Please enter a full phone number, an email, or an order number like HK-12345678.', reason: 'phone' });
    by = 'phone';
    filter = `phone_digits=like.*${q.slice(-8)}`;
    keep = r => phoneMatches(r.phone_digits, q);
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?${filter}&select=${COLS}&order=created_at.desc&limit=25`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!res.ok) { console.error('track-order lookup failed', res.status, await res.text().catch(() => '')); return json(500, { error: 'Something went wrong. Please try again.' }); }
    const rows = (await res.json()).filter(keep).slice(0, 10);
    if (!rows.length) return json(404, { error: NOT_FOUND });
    const orders = rows.map(shape);
    // Keep the old single-order fields too (first = newest), so nothing that reads them breaks.
    return json(200, { by, invoiceAllowed: by === 'email', orders, ...orders[0] });
  } catch (err) {
    console.error('track-order error:', err);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
