// netlify/functions/_meta.js
//
// Meta Conversions API (Oct 2026): tells Instagram / Facebook about each paid
// order from our server, so ads can see which ones actually sold books even
// when the browser Pixel is blocked. The browser Pixel sends the same
// Purchase with the same id (the order number), so Meta counts it once.
//
// Only for real paid sales, and only when the customer accepted marketing
// cookies on the site. Email, phone and name are hashed (SHA-256) before
// they leave our server, as Meta requires.
//
// Env: META_PIXEL_ID, META_CAPI_TOKEN (Events Manager > Settings > Conversions API)
// Optional: META_TEST_EVENT_CODE (shows events in Events Manager > Test events)

const crypto = require('crypto');

const GRAPH = 'https://graph.facebook.com/v21.0';
const COUNTRY = { UAE: 'ae', Saudi: 'sa', Qatar: 'qa', Kuwait: 'kw', Bahrain: 'bh', Oman: 'om' };
const sha = v => crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');
const enabled = () => Boolean(process.env.META_PIXEL_ID && process.env.META_CAPI_TOKEN);

function userData(order, meta) {
  const u = {};
  if (order.email) u.em = [sha(order.email)];
  const digits = String(order.phone || '').replace(/\D/g, '');
  if (digits.length >= 8) u.ph = [sha(digits)];
  const parts = String(order.full_name || '').trim().split(/\s+/).filter(Boolean);
  if (parts[0]) u.fn = [sha(parts[0])];
  if (parts.length > 1) u.ln = [sha(parts[parts.length - 1])];
  if (order.city) u.ct = [sha(String(order.city).replace(/\s+/g, ''))];
  if (COUNTRY[order.country]) u.country = [sha(COUNTRY[order.country])];
  if (order.email) u.external_id = [sha(order.email)];
  if (meta) {
    if (meta.ip) u.client_ip_address = meta.ip;
    if (meta.ua) u.client_user_agent = meta.ua;
    if (meta.fbc) u.fbc = meta.fbc;
    if (meta.fbp) u.fbp = meta.fbp;
  }
  return u;
}

function purchaseEvent(order) {
  let items = [];
  try { items = JSON.parse(order.items || '[]'); } catch {}
  const a = order.attribution || {};
  return {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: String(order.order_number),
    action_source: 'website',
    event_source_url: `${process.env.SITE_URL || 'https://maison-jaber.com'}/hikaya/checkout.html`,
    user_data: userData(order, a.meta),
    custom_data: {
      currency: 'AED',
      value: Number(order.charged_aed) || 0,
      order_id: String(order.order_number),
      num_items: items.length || 1,
      content_type: 'product',
      contents: items.map(i => ({ id: i.slug || i.story || 'book', quantity: 1 })),
    },
  };
}

// Never throws. Returns true when Meta accepted the event.
async function sendMetaPurchase(order) {
  try {
    if (!enabled() || !order) return false;
    if (order.payment_status !== 'paid') return false; // free / waived orders are not sales
    if (order.order_type && order.order_type !== 'sale') return false; // test, gift, influencer...
    if (!order.attribution || order.attribution.marketing !== true) return false; // no marketing consent
    const body = { data: [purchaseEvent(order)] };
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
    const r = await fetch(`${GRAPH}/${encodeURIComponent(process.env.META_PIXEL_ID)}/events?access_token=${encodeURIComponent(process.env.META_CAPI_TOKEN)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) { console.warn('Meta CAPI rejected', r.status, (await r.text()).slice(0, 300)); return false; }
    return true;
  } catch (e) {
    console.warn('Meta CAPI error', e && e.message);
    return false;
  }
}

module.exports = { sendMetaPurchase, purchaseEvent, enabled };
