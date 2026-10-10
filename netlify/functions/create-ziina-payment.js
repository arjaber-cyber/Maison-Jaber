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
//
// Discount codes: the code's use is reserved for this order (atomic, so a
// single-use code can't be used twice) and only counts once Ziina confirms
// payment. A code that makes the order free (AED 0) skips Ziina entirely:
// the order is saved as "waived", goes straight to "received", and is
// flagged as a gift / influencer / replacement order so it never counts as
// revenue.

const { priceOrder, orderTypeForTag, reserveDiscount, settleDiscount, PROMO_MESSAGES, SUPABASE_URL, SUPABASE_KEY, SUPABASE_ANON_KEY } = require('./_pricing');
const { sendConfirmation } = require('./_ziina');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const testMode = () => ['true', '1', 'yes', 'on'].includes(String(process.env.ZIINA_TEST_MODE || '').trim().toLowerCase());

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let o;
  try { o = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }

  const req = ['fullName', 'email', 'phone', 'address', 'city', 'country'];
  if (req.some(k => !String(o[k] || '').trim())) return json(400, { error: 'Please fill in your name, email, phone, address, and city.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(o.email).trim())) return json(400, { error: 'Please enter a valid email address.' });

  // Logged-in customers: attach the order to their account email (best effort).
  let email = String(o.email).trim();
  const auth = event.headers.authorization || event.headers.Authorization;
  if (auth) {
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY } });
      if (r.ok) { const u = await r.json(); if (u.email) email = u.email; }
    } catch {}
  }

  let price;
  try {
    price = await priceOrder({ regionKey: o.country, items: o.items, promoCode: o.promoCode, email });
  } catch (e) {
    return json(400, { error: e.userMessage || 'We could not price your order. Please try again.', reason: e.reason });
  }
  const free = price.chargedAed === 0;
  if (!free && !process.env.ZIINA_API_KEY) return json(503, { error: 'Online payment is not available right now. Please try again later.' });
  if (!free && price.chargedAed < 2) return json(400, { error: 'This order total is too small to pay online. Please contact us.' });

  // Photos are stored privately by upload-child-photo.js; the order keeps only their storage paths.
  const PHOTO_PATH = /^\d{4}-\d{2}-\d{2}\/[0-9a-f]{32}\.(jpg|png|webp)$/;
  const paths = list => (Array.isArray(list) ? list : []).map(String).filter(p => PHOTO_PATH.test(p)).slice(0, 5);
  const cleanItems = o.items.map(i => ({
    story: String(i.story || ''), slug: i.slug ? String(i.slug).slice(0, 80) : null, childName: String(i.childName || '').slice(0, 60), childAge: i.childAge ? String(i.childAge).slice(0, 3) : null, ageEdition: String(i.ageEdition || ''),
    gender: String(i.gender || ''), dedication: String(i.dedication || '').slice(0, 600), bookLanguage: i.bookLanguage === 'ar' ? 'ar' : 'en', extraCharacterName: i.extraCharacterName ? String(i.extraCharacterName) : null,
    photoPaths: paths(i.photoPaths), extraCharacterPhotoPaths: paths(i.extraCharacterPhotoPaths),
  }));
  const orderNumber = `HK-${Date.now().toString().slice(-8)}`;

  // 1) Save the order first, so nothing is ever paid without a record.
  const save = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      order_number: orderNumber, full_name: String(o.fullName).trim(), email, phone: String(o.phone).trim(),
      address: String(o.address).trim(), city: String(o.city).trim(), country: o.country,
      payment_method: free ? 'free' : 'ziina', amount: price.total, currency: price.currency, charged_aed: price.chargedAed,
      is_gift: !!o.isGift, gift_message: o.isGift ? String(o.giftMessage || '').slice(0, 600) : null,
      items: JSON.stringify(cleanItems), bundle_discount_pct: price.breakdown.bundleDiscountPct, promo_code: price.breakdown.promo,
      list_value_aed: price.listValueAed, promo_discount_aed: price.promoDiscountAed,
      order_type: free && price.promo ? orderTypeForTag(price.promo.tag) : 'sale',
      order_type_note: free && price.promo ? `Free order via code ${price.promo.code}` : null,
      payment_status: 'awaiting_payment', order_status: 'pending_payment', created_at: new Date().toISOString(),
    }),
  });
  if (!save.ok) {
    console.error('order save failed', save.status, await save.text().catch(() => ''));
    return json(500, { error: 'We could not start your order. Please try again.' });
  }
  const [saved] = await save.json();
  const patchOrder = body => fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${saved.id}`, {
    method: 'PATCH', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body),
  }).then(r => r.json()).then(rows => rows[0]).catch(() => null);

  // 1b) Hold the discount code for this order (atomic use-limit check).
  if (price.promo) {
    let r;
    try { r = await reserveDiscount(price.promo.code, saved, price.chargedAed); }
    catch (e) { console.error('reserve_discount failed', e.message); r = 'unavailable'; }
    if (r !== 'ok') {
      await patchOrder({ payment_status: 'code_rejected', order_status: 'cancelled', admin_notes: `Code ${price.promo.code} rejected at checkout: ${r}` });
      return json(400, { error: (PROMO_MESSAGES[r] || PROMO_MESSAGES.not_found) + ' Please remove the code and try again.', reason: r });
    }
  }

  // 1c) Fully covered by a code: nothing to pay, so no Ziina.
  if (free) {
    const now = new Date().toISOString();
    const done = await patchOrder({ payment_status: 'waived', order_status: 'received', status_updated_at: now, stage_history: [{ stage: 'received', at: now }] });
    await settleDiscount(saved.id, true);
    if (done) await sendConfirmation(done).catch(e => console.error('confirmation email failed', e));
    return json(200, { free: true, orderNumber, total: 0, currency: price.currency, chargedAed: 0 });
  }

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
    if (price.promo) await settleDiscount(saved.id, false);
    return json(502, { error: 'We could not reach our payment provider. Please try again in a moment.' });
  }

  // 3) Link the payment to the order (the webhook finds the order by this id).
  await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${saved.id}`, {
    method: 'PATCH', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ziina_payment_id: intent.id }),
  });

  return json(200, { redirectUrl: intent.redirect_url, orderNumber, promoNotBetter: price.promoNotBetter, total: price.total, currency: price.currency, chargedAed: price.chargedAed, test: testMode() });
};
