// netlify/functions/create-tamara-payment.js
//
// Checkout -> Tamara (pay later / instalments). Same order handling as
// create-tabby-payment.js: prices the cart on the server, saves the order as
// "awaiting_payment", reserves any discount code, then opens a Tamara checkout
// session for the AED amount and returns Tamara's payment page (checkout_url).
// The order is only marked paid once Tamara has approved it and we have
// authorised it (tamara-order-status.js / tamara-webhook.js / tamara-sweep.js,
// via _tamara.js). The money is captured when the book goes to the courier.
//
// UAE store (AED) only, so Tamara is offered for UAE orders only.
//
// POST: same body as create-ziina-payment.js
// Env: TAMARA_API_TOKEN, TAMARA_API_URL, SUPABASE_SERVICE_ROLE_KEY

const { priceOrder, reserveDiscount, settleDiscount, PROMO_MESSAGES, REGIONS, SUPABASE_URL, SUPABASE_KEY, SUPABASE_ANON_KEY } = require('./_pricing');
const { checkOrderRules } = require('./_orderRules');
const { saveAttribution } = require('./_attribution');
const { tamara, apiToken, isSandbox, aed, round2, uaePhone, unavailableMessage } = require('./_tamara');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const SB = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

// Tamara wants first + last name separately.
function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { first_name: parts[0] || 'Customer', last_name: parts[0] || 'Customer' };
  return { first_name: parts.slice(0, -1).join(' ').slice(0, 60), last_name: parts[parts.length - 1].slice(0, 60) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!apiToken()) return json(503, { error: 'Tamara is not available right now. Please choose another payment method.' });

  let o;
  try { o = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }

  const req = ['fullName', 'email', 'phone', 'address', 'city', 'country'];
  if (req.some(k => !String(o[k] || '').trim())) return json(400, { error: 'Please fill in your name, email, phone, address, and city.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(o.email).trim())) return json(400, { error: 'Please enter a valid email address.' });
  if (o.country !== 'UAE') return json(400, { error: 'Tamara is available for UAE orders only. Please choose another payment method.' });
  const ruleErr = checkOrderRules(o);
  if (ruleErr) return json(400, ruleErr);

  const siteLang = (Array.isArray(o.items) && o.items[0] && o.items[0].siteLang === 'ar') ? 'ar' : 'en';

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
      payment_method: 'tamara', amount: price.total, currency: price.currency, charged_aed: price.chargedAed,
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

  // 2) Order lines for Tamara. Books at the list price, any extra-character fee
  //    as its own line, then delivery and the discount (bundle or code, with its
  //    name, as Tamara asks), so everything adds up exactly to the amount charged.
  const bookPrice = REGIONS.UAE.bookNow;
  const host = event.headers['x-forwarded-host'] || event.headers.host;
  const items = cleanItems.map((i, n) => ({
    reference_id: `${orderNumber}-${n + 1}`,
    type: 'Physical',
    name: `${i.story} (personalised for ${i.childName})`.slice(0, 255),
    sku: (i.slug || 'hikaya-book').slice(0, 128),
    quantity: 1,
    unit_price: aed(bookPrice), discount_amount: aed(0), tax_amount: aed(0), total_amount: aed(bookPrice),
    ...(i.slug ? { item_url: `https://${host}/hikaya/story.html?s=${encodeURIComponent(i.slug)}` } : {}),
  }));
  if (price.breakdown.extraFee > 0) {
    const fee = price.breakdown.extraFee;
    items.push({ reference_id: `${orderNumber}-extra`, type: 'Physical', name: 'Extra character in the story', sku: 'hikaya-extra-character', quantity: 1, unit_price: aed(fee), discount_amount: aed(0), tax_amount: aed(0), total_amount: aed(fee) });
  }
  const linesTotal = items.reduce((s, i) => s + i.total_amount.amount, 0) + price.breakdown.deliveryFee;
  const discount = Math.max(0, round2(linesTotal - price.chargedAed));
  const discountName = [
    price.breakdown.bundleDiscountPct ? `Bundle ${price.breakdown.bundleDiscountPct}%` : '',
    price.breakdown.promo ? String(price.breakdown.promo) : '',
  ].filter(Boolean).join(';') || 'Discount';

  const name = splitName(fullName);
  const tamaraPhone = uaePhone(phone);
  const path = /^\/[a-z0-9/_-]*checkout\.html$/i.test(o.returnPath || '') ? o.returnPath : '/checkout.html';
  const back = `https://${host}${path}?order=${encodeURIComponent(orderNumber)}&tamara=`;

  // 3) Open the Tamara session.
  let session;
  try {
    session = await tamara('/checkout', {
      method: 'POST',
      body: {
        order_reference_id: orderNumber,
        order_number: orderNumber,
        total_amount: aed(price.chargedAed),
        description: `Hikaya by Maison Jaber - order ${orderNumber}`.slice(0, 256),
        country_code: 'AE',
        payment_type: 'PAY_BY_INSTALMENTS',
        instalments: null,
        locale: siteLang === 'ar' ? 'ar_SA' : 'en_US',
        items,
        consumer: { ...name, phone_number: tamaraPhone, email },
        shipping_address: { ...name, line1: deliveryAddress.slice(0, 255), city: String(o.city).trim(), country_code: 'AE', phone_number: tamaraPhone },
        billing_address: { ...name, line1: deliveryAddress.slice(0, 255), city: String(o.city).trim(), country_code: 'AE', phone_number: tamaraPhone },
        tax_amount: aed(0),
        shipping_amount: aed(price.breakdown.deliveryFee),
        ...(discount > 0 ? { discount: { name: discountName.slice(0, 255), amount: aed(discount) } } : {}),
        merchant_url: {
          success: back + 'success',
          failure: back + 'failure',
          cancel: back + 'cancel',
          notification: `https://${host}/.netlify/functions/tamara-webhook`,
        },
        platform: 'Hikaya website',
        is_mobile: false,
      },
    });
  } catch (e) {
    session = { ok: false, status: 0, data: { error: e.message } };
  }

  const s = session.data || {};
  if (!session.ok || !s.checkout_url || !s.order_id) {
    console.error('tamara session failed', session.status, JSON.stringify(s).slice(0, 600));
    // 400 with a business error usually means this customer / amount isn't eligible.
    const ineligible = session.status === 400 && /eligib|not available|limit|amount/i.test(JSON.stringify(s));
    await patchOrder({
      payment_status: ineligible ? 'failed' : 'payment_start_failed', order_status: 'cancelled',
      admin_notes: `Tamara session failed (${session.status}): ${JSON.stringify(s).slice(0, 300)}`,
    });
    if (price.promo) await settleDiscount(saved.id, false);
    if (ineligible) return json(400, { error: unavailableMessage(siteLang), rejected: true });
    return json(502, { error: 'We could not reach Tamara. Please try again in a moment, or choose another payment method.' });
  }

  // 4) Keep Tamara's order id with our order (every later call needs it).
  await patchOrder({ admin_notes: `Tamara order ${s.order_id}${isSandbox() ? ' (sandbox)' : ''}${s.checkout_id ? ', checkout ' + s.checkout_id : ''}` });

  return json(200, { redirectUrl: s.checkout_url, orderNumber, trackingToken: saved.tracking_token, promoNotBetter: price.promoNotBetter, total: price.total, currency: price.currency, chargedAed: price.chargedAed, test: isSandbox() });
};
