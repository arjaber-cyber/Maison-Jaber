// netlify/functions/create-ziina-payment.js
//
// Checkout -> Ziina. Prices the cart on the server (see _pricing.js), saves
// the order as "awaiting_payment", creates a Ziina payment for the AED
// amount and returns Ziina's hosted payment page URL. The order is only
// marked paid once Ziina confirms it (webhook or status check).
//
// POST { fullName, email, phone, address, city, country (UAE|Saudi|...),
//        isGift, giftMessage, items:[{story, childName, ageEdition, gender,
//        dedication, extraCharacterName}], promoCode, returnPath }
// Env: ZIINA_API_KEY, ZIINA_TEST_MODE (true = Ziina sandbox, no real money),
//      SUPABASE_SERVICE_ROLE_KEY, ZIINA_WEBHOOK_SECRET

const { priceOrder, SUPABASE_URL, SUPABASE_KEY, SUPABASE_ANON_KEY } = require('./_pricing');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const testMode = () => ['true', '1', 'yes', 'on'].includes(String(process.env.ZIINA_TEST_MODE || '').trim().toLowerCase());

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!process.env.ZIINA_API_KEY) return json(503, { error: 'Online payment is not available right now. Please try again later.' });

  let o;
  try { o = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }

  const req = ['fullName', 'email', 'phone', 'address', 'city', 'country'];
  if (req.some(k => !String(o[k] || '').trim())) return json(400, { error: 'Please fill in your name, email, phone, address, and city.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(o.email).trim())) return json(400, { error: 'Please enter a valid email address.' });

  let price;
  try {
    price = await priceOrder({ regionKey: o.country, items: o.items, promoCode: o.promoCode });
  } catch (e) {
    return json(400, { error: e.userMessage || 'We could not price your order. Please try again.' });
  }
  if (price.chargedAed < 2) return json(400, { error: 'This order total is too small to pay online. Please contact us.' });

  // Logged-in customers: attach the order to their account email (best effort).
  let email = String(o.email).trim();
  const auth = event.headers.authorization || event.headers.Authorization;
  if (auth) {
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY } });
      if (r.ok) { const u = await r.json(); if (u.email) email = u.email; }
    } catch {}
  }

  const cleanItems = o.items.map(i => ({
    story: String(i.story || ''), childName: String(i.childName || '').slice(0, 60), ageEdition: String(i.ageEdition || ''),
    gender: String(i.gender || ''), dedication: String(i.dedication || '').slice(0, 600), extraCharacterName: i.extraCharacterName ? String(i.extraCharacterName) : null,
  }));
  const orderNumber = `HK-${Date.now().toString().slice(-8)}`;

  // 1) Save the order first, so nothing is ever paid without a record.
  const save = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      order_number: orderNumber, full_name: String(o.fullName).trim(), email, phone: String(o.phone).trim(),
      address: String(o.address).trim(), city: String(o.city).trim(), country: o.country,
      payment_method: 'ziina', amount: price.total, currency: price.currency, charged_aed: price.chargedAed,
      is_gift: !!o.isGift, gift_message: o.isGift ? String(o.giftMessage || '').slice(0, 600) : null,
      items: JSON.stringify(cleanItems), bundle_discount_pct: price.breakdown.bundleDiscountPct, promo_code: price.breakdown.promo,
      payment_status: 'awaiting_payment', order_status: 'pending_payment', created_at: new Date().toISOString(),
    }),
  });
  if (!save.ok) {
    console.error('order save failed', save.status, await save.text().catch(() => ''));
    return json(500, { error: 'We could not start your order. Please try again.' });
  }
  const [saved] = await save.json();

  // 2) Create the Ziina payment for the server-calculated AED amount.
  const host = event.headers['x-forwarded-host'] || event.headers.host;
  const path = /^\/[a-z0-9/_-]*checkout\.html$/i.test(o.returnPath || '') ? o.returnPath : '/checkout.html';
  const back = `https://${host}${path}?order=${encodeURIComponent(orderNumber)}&pi={PAYMENT_INTENT_ID}`;
  let intent;
  try {
    const res = await fetch('https://api-v2.ziina.com/api/payment_intent', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.ZIINA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(price.chargedAed * 100), // fils
        currency_code: 'AED',
        message: `Hikaya by Maison Jaber - order ${orderNumber}`,
        success_url: back + '&ziina=success',
        cancel_url: back + '&ziina=cancel',
        failure_url: back + '&ziina=failed',
        test: testMode(),
      }),
    });
    intent = await res.json().catch(() => ({}));
    if (!res.ok || !intent.id || !intent.redirect_url) throw new Error(`Ziina ${res.status} ${JSON.stringify(intent).slice(0, 200)}`);
  } catch (e) {
    console.error('ziina create failed', e.message);
    await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${saved.id}`, {
      method: 'PATCH', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status: 'payment_start_failed' }),
    }).catch(() => {});
    return json(502, { error: 'We could not reach our payment provider. Please try again in a moment.' });
  }

  // 3) Link the payment to the order (the webhook finds the order by this id).
  await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${saved.id}`, {
    method: 'PATCH', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ziina_payment_id: intent.id }),
  });

  return json(200, { redirectUrl: intent.redirect_url, orderNumber, total: price.total, currency: price.currency, chargedAed: price.chargedAed, test: testMode() });
};
