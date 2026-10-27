// netlify/functions/create-tabby-payment.js
//
// Checkout -> Tabby (Pay in 4). Same order handling as create-ziina-payment.js:
// prices the cart on the server, saves the order as "awaiting_payment",
// reserves any discount code, then opens a Tabby checkout session for the
// AED amount and returns Tabby's payment page (web_url). The order is only
// marked paid once Tabby has authorised it and we have captured it
// (tabby-order-status.js / tabby-webhook.js, via _tabby.js).
//
// Tabby store is UAE-only (AED), so Tabby is offered for UAE orders only.
// Sandbox (sk_test_ key): only Tabby's test buyers (…@tabby.ai) are accepted,
// so a real customer can never get a "paid" order from a test payment.
//
// POST: same body as create-ziina-payment.js
// Env: TABBY_SECRET_KEY, TABBY_MERCHANT_CODE, SUPABASE_SERVICE_ROLE_KEY

const { priceOrder, reserveDiscount, settleDiscount, PROMO_MESSAGES, REGIONS, SUPABASE_URL, SUPABASE_KEY, SUPABASE_ANON_KEY } = require('./_pricing');
const { checkOrderRules } = require('./_orderRules');
const { saveAttribution } = require('./_attribution');
const { tabby, secretKey, merchantCode, isTestKey, money, uaePhone, rejectMessage, rejectionReason, buyerHistory } = require('./_tabby');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const SB = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!secretKey()) return json(503, { error: 'Tabby is not available right now. Please choose another payment method.' });

  let o;
  try { o = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }

  const req = ['fullName', 'email', 'phone', 'address', 'city', 'country'];
  if (req.some(k => !String(o[k] || '').trim())) return json(400, { error: 'Please fill in your name, email, phone, address, and city.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(o.email).trim())) return json(400, { error: 'Please enter a valid email address.' });
  if (o.country !== 'UAE') return json(400, { error: 'Tabby is available for UAE orders only. Please choose another payment method.' });
  const ruleErr = checkOrderRules(o);
  if (ruleErr) return json(400, ruleErr);

  const siteLang = (Array.isArray(o.items) && o.items[0] && o.items[0].siteLang === 'ar') ? 'ar' : 'en';

  // Logged-in customers: attach the order to their account email (best effort).
  let email = String(o.email).trim();
  let registeredSince = null;
  const auth = event.headers.authorization || event.headers.Authorization;
  if (auth) {
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY } });
      if (r.ok) { const u = await r.json(); if (u.email) email = u.email; if (u.created_at) registeredSince = u.created_at; }
    } catch {}
  }
  if (isTestKey() && !/@tabby\.ai$/i.test(email)) {
    return json(400, { error: 'Tabby is in test mode. Use a Tabby test email (e.g. otp.success@tabby.ai) or choose another payment method.' });
  }

  let price;
  try {
    price = await priceOrder({ regionKey: o.country, items: o.items, promoCode: o.promoCode, email, auth: event.headers.authorization || event.headers.Authorization });
  } catch (e) {
    return json(400, { error: e.userMessage || 'We could not price your order. Please try again.', reason: e.reason });
  }
  if (price.chargedAed === 0) return json(400, { error: 'Nothing to pay on this order. Please choose the regular checkout.' });

  // Photos are stored privately by upload-child-photo.js; the order keeps only their storage paths.
  const PHOTO_PATH = /^\d{4}-\d{2}-\d{2}\/[0-9a-f]{32}\.(jpg|png|webp)$/;
  const paths = list => (Array.isArray(list) ? list : []).map(String).filter(p => PHOTO_PATH.test(p)).slice(0, 5);
  const cleanItems = o.items.map(i => ({
    story: String(i.story || ''), slug: i.slug ? String(i.slug).slice(0, 80) : null, childName: String(i.childName || '').slice(0, 60), childNameTyped: String(i.childNameTyped || i.childName || '').slice(0, 60), photoConsent: i.photoConsent === true, photoConsentAt: i.photoConsentAt ? String(i.photoConsentAt).slice(0, 40) : null, childAge: i.childAge ? String(i.childAge).slice(0, 3) : null, ageEdition: String(i.ageEdition || ''),
    gender: String(i.gender || ''), dedication: String(i.dedication || '').slice(0, 600), bookLanguage: i.bookLanguage === 'ar' ? 'ar' : 'en', siteLang: i.siteLang === 'ar' ? 'ar' : 'en', extraCharacterName: i.extraCharacterName ? String(i.extraCharacterName) : null,
    photoPaths: paths(i.photoPaths), extraCharacterPhotoPaths: paths(i.extraCharacterPhotoPaths),
    supportingChoice: ['photos', 'avatar'].includes(i.supportingChoice) ? i.supportingChoice : null,
    supportingCharacters: (Array.isArray(i.supportingCharacters) ? i.supportingCharacters : [])
      .filter(c => c && ['mother', 'father', 'grandfather', 'grandmother'].includes(c.role)).slice(0, 4)
      .map(c => ({ role: c.role, photoPaths: paths(c.photoPaths).slice(0, 2) })),
    supportingPhotoConsent: i.supportingPhotoConsent === true,
  }));
  const orderNumber = `HK-${Date.now().toString().slice(-8)}`;

  const unitNumber = String(o.unitNumber || '').trim().slice(0, 40);
  const pickedAddress = String(o.address).trim();
  const deliveryAddress = unitNumber ? `${unitNumber}, ${pickedAddress}` : pickedAddress;
  const coord = (v, max) => { const n = Number(v); return v !== null && v !== '' && Number.isFinite(n) && Math.abs(n) <= max ? n : null; };
  const nowIso = new Date().toISOString();
  const fullName = String(o.fullName).trim();
  const phone = String(o.phone).trim();

  // 1) Save the order first, so nothing is ever paid without a record.
  const save = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST', headers: { ...SB, Prefer: 'return=representation' },
    body: JSON.stringify({
      order_number: orderNumber, full_name: fullName, email, phone,
      address: deliveryAddress, city: String(o.city).trim(), country: o.country,
      unit_number: unitNumber || null, location_lat: coord(o.locationLat, 90), location_lng: coord(o.locationLng, 180),
      payment_method: 'tabby', amount: price.total, currency: price.currency, charged_aed: price.chargedAed,
      is_gift: false, gift_message: null,
      marketing_opt_in: o.marketingOptIn === true, info_confirmed_at: nowIso, photo_consent_at: nowIso,
      items: JSON.stringify(cleanItems), bundle_discount_pct: price.breakdown.bundleDiscountPct, promo_code: price.breakdown.promo,
      list_value_aed: price.listValueAed, promo_discount_aed: price.promoDiscountAed,
      order_type: 'sale', order_type_note: null,
      payment_status: 'awaiting_payment', order_status: 'pending_payment', created_at: nowIso,
    }),
  });
  if (!save.ok) {
    console.error('order save failed', save.status, await save.text().catch(() => ''));
    return json(500, { error: 'We could not start your order. Please try again.' });
  }
  const [saved] = await save.json();
  // Where this customer came from (tagged link, ad, post, Google...). Best effort, never blocks the order.
  await saveAttribution(saved.id, o.attribution, event);

  if (o.marketingOptIn === true) {
    await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?on_conflict=email`, {
      method: 'POST', headers: { ...SB, Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ email: email.toLowerCase(), lang: siteLang, subscribed_at: nowIso }),
    }).catch(e => console.warn('newsletter opt-in save failed', e));
  }
  const patchOrder = body => fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${saved.id}`, {
    method: 'PATCH', headers: SB, body: JSON.stringify(body),
  }).catch(() => null);

  // 1b) Hold the discount code for this order (atomic use-limit check).
  if (price.promo) {
    let r;
    try { r = await reserveDiscount(price.promo.code, saved, price.chargedAed, price.memberPhone); }
    catch (e) { console.error('reserve_discount failed', e.message); r = 'unavailable'; }
    if (r !== 'ok') {
      await patchOrder({ payment_status: 'code_rejected', order_status: 'cancelled', admin_notes: `Code ${price.promo.code} rejected at checkout: ${r}` });
      return json(400, { error: (PROMO_MESSAGES[r] || PROMO_MESSAGES.not_found) + ' Please remove the code and try again.', reason: r });
    }
  }

  // 2) Order lines for Tabby (helps their approval). Books at the list price,
  //    any extra-character fee as its own line, then delivery and the discount,
  //    so the lines add up exactly to the amount charged.
  const bookPrice = REGIONS.UAE.bookNow;
  const host = event.headers['x-forwarded-host'] || event.headers.host;
  const items = cleanItems.map((i, n) => ({
    title: `${i.story} (personalised for ${i.childName})`.slice(0, 200),
    description: `Personalised Hikaya storybook, ${i.bookLanguage === 'ar' ? 'Arabic' : 'English'} edition${i.ageEdition ? ', ages ' + i.ageEdition : ''}`,
    quantity: 1, unit_price: money(bookPrice), discount_amount: '0.00',
    reference_id: `${orderNumber}-${n + 1}`, category: 'Books',
    ...(i.slug ? { product_url: `https://${host}/hikaya/story.html?s=${encodeURIComponent(i.slug)}` } : {}),
  }));
  if (price.breakdown.extraFee > 0) {
    items.push({ title: 'Extra character in the story', quantity: 1, unit_price: money(price.breakdown.extraFee), discount_amount: '0.00', reference_id: `${orderNumber}-extra`, category: 'Books' });
  }
  const linesTotal = items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0) + price.breakdown.deliveryFee;
  const discount = Math.max(0, Math.round((linesTotal - price.chargedAed) * 100) / 100);

  // Returning customers: real earlier orders (Tabby's checklist wants real buyer_history / order_history).
  const history = await buyerHistory(email, registeredSince);

  const path = /^\/[a-z0-9/_-]*checkout\.html$/i.test(o.returnPath || '') ? o.returnPath : '/checkout.html';
  const back = `https://${host}${path}?order=${encodeURIComponent(orderNumber)}&tabby=`;

  // 3) Open the Tabby session.
  let session;
  try {
    session = await tabby('/api/v2/checkout', {
      method: 'POST',
      body: {
        payment: {
          amount: money(price.chargedAed),
          currency: 'AED',
          description: `Hikaya by Maison Jaber - order ${orderNumber}`,
          buyer: { name: fullName, email, phone: uaePhone(phone) },
          shipping_address: { city: String(o.city).trim(), address: deliveryAddress, zip: '00000' },
          order: {
            reference_id: orderNumber, updated_at: nowIso,
            tax_amount: '0.00', shipping_amount: money(price.breakdown.deliveryFee), discount_amount: money(discount),
            items,
          },
          buyer_history: history.buyer_history,
          order_history: history.order_history,
        },
        lang: siteLang,
        merchant_code: merchantCode(),
        merchant_urls: { success: back + 'success', cancel: back + 'cancel', failure: back + 'failure' },
      },
    });
  } catch (e) {
    session = { ok: false, status: 0, data: { error: e.message } };
  }

  const s = session.data || {};
  const webUrl = s.configuration && s.configuration.available_products && Array.isArray(s.configuration.available_products.installments)
    && s.configuration.available_products.installments[0] && s.configuration.available_products.installments[0].web_url;
  const paymentId = s.payment && s.payment.id;

  if (!session.ok || s.status !== 'created' || !webUrl || !paymentId) {
    const rejected = session.ok && s.status === 'rejected';
    const reason = rejected ? rejectionReason(s) : null;
    if (!rejected) console.error('tabby session failed', session.status, JSON.stringify(s).slice(0, 400));
    await patchOrder({
      payment_status: rejected ? 'failed' : 'payment_start_failed', order_status: 'cancelled',
      admin_notes: rejected ? `Tabby did not approve at checkout (${reason}).` : `Tabby session failed (${session.status}).`,
    });
    if (price.promo) await settleDiscount(saved.id, false);
    if (rejected) return json(400, { error: rejectMessage(reason, siteLang), rejected: true, reason });
    return json(502, { error: 'We could not reach Tabby. Please try again in a moment, or choose another payment method.' });
  }

  // 4) Keep Tabby's payment id with the order (also handy for refunds in the Tabby dashboard).
  await patchOrder({ admin_notes: `Tabby payment ${paymentId}${isTestKey() ? ' (sandbox)' : ''}` });

  return json(200, { redirectUrl: webUrl, orderNumber, trackingToken: saved.tracking_token, promoNotBetter: price.promoNotBetter, total: price.total, currency: price.currency, chargedAed: price.chargedAed, test: isTestKey() });
};
