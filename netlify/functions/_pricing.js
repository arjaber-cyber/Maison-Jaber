// netlify/functions/_pricing.js
//
// Server-side order pricing. The browser shows prices, but the amount we
// actually charge is ALWAYS recalculated here, so nobody can edit a total
// in their browser and pay less.
//
// Keep REGIONS / BUNDLE_TIERS in sync with region.js and cart.js (the
// browser copies are for display only).

const REGIONS = {
  UAE:     { currency: 'AED', bookNow: 169,   deliveryFee: 0 },
  Saudi:   { currency: 'SAR', bookNow: 169,   deliveryFee: 30 },
  Qatar:   { currency: 'QAR', bookNow: 169,   deliveryFee: 30 },
  Kuwait:  { currency: 'KWD', bookNow: 14.25, deliveryFee: 2.52 },
  Bahrain: { currency: 'BHD', bookNow: 17.25, deliveryFee: 3.07 },
  Oman:    { currency: 'OMR', bookNow: 17.75, deliveryFee: 3.12 },
};

const BUNDLE_TIERS = [
  { minItems: 1, discountPct: 0,  freeDelivery: false },
  { minItems: 2, discountPct: 10, freeDelivery: true },
  { minItems: 3, discountPct: 15, freeDelivery: true },
];

// Ziina charges in AED. Customers see their local price; we charge the AED
// equivalent at these rates. SAR/QAR/BHD/OMR are pegged to the US dollar, as
// is AED, so these are stable. KWD floats -- review it every few months.
const AED_PER_UNIT = {
  AED: 1,
  SAR: 0.97933,   // 3.6725 / 3.75
  QAR: 1.00893,   // 3.6725 / 3.64
  BHD: 9.76729,   // 3.6725 / 0.376
  OMR: 9.55137,   // 3.6725 / 0.3845
  KWD: 11.95,     // floating -- last reviewed Oct 2026
};

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

const BUILT_IN_STORIES = ['The Bravest Little One', 'The Cloud Ship', "The Star Who Couldn't Sleep"];

const round2 = n => Math.round(n * 100) / 100;

function tierFor(count) {
  let tier = BUNDLE_TIERS[0];
  for (const t of BUNDLE_TIERS) if (count >= t.minItems) tier = t;
  return tier;
}

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

// Looks up every story in the cart: it must exist, and its extra-character
// fee comes from the database, not from the browser.
async function loadStories(titles) {
  const unique = [...new Set(titles)];
  let rows = [];
  try {
    const list = unique.map(t => `"${t.replace(/"/g, '\\"')}"`).join(',');
    rows = await sb(`stories?select=title,has_extra_character,extra_character_fee_aed,active&title=in.(${encodeURIComponent(list)})`);
  } catch (e) {
    console.warn('story lookup failed', e.message);
  }
  const byTitle = Object.fromEntries(rows.map(r => [r.title, r]));
  for (const t of unique) {
    const known = (byTitle[t] && byTitle[t].active !== false) || BUILT_IN_STORIES.includes(t);
    if (!known) throw Object.assign(new Error(`Unknown story: ${t}`), { userMessage: 'One of the stories in your cart is no longer available. Please remove it and try again.' });
  }
  return byTitle;
}

/* ---------- Discount codes (Oct 2026) ----------
   Types: percent | fixed (AED) | free_shipping | free_order (book + delivery + extras free).
   Rules: ONE discount per order. The customer gets whichever is better --
   the bundle discount or the code. A free_order code always wins.
   Codes can be locked to one email, have a start/end date, a total use
   limit, a per-email limit and a minimum order (AED, books before discounts).
   The definitive use-count check is atomic in Postgres (reserve_discount). */
const PROMO_MESSAGES = {
  not_found: "That code isn't valid.",
  inactive: 'That code is no longer active.',
  not_started: "That code isn't active yet.",
  expired: 'That code has expired.',
  wrong_email: 'This code is linked to a different email. Use the email address the code was sent to.',
  need_email: 'This code is personal. Enter your email address first, then apply it.',
  used_up: 'That code has already been used.',
  used_by_you: "You've already used this code.",
  min_order: 'Your order is below the minimum for this code.',
  unavailable: "We couldn't check that code right now. Please try again.",
};
const promoError = (reason, extra) => Object.assign(new Error(reason), { reason, userMessage: (extra && extra.message) || PROMO_MESSAGES[reason] || PROMO_MESSAGES.not_found });

// Returns the code row if it can be used by this email, otherwise throws a promoError.
async function loadPromo(code, { email } = {}) {
  if (!code) return null;
  const c = String(code).trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,40}$/.test(c)) throw promoError('not_found');
  let rows;
  try { rows = await sb(`discount_codes?code=eq.${encodeURIComponent(c)}&select=*`); }
  catch (e) { throw promoError('unavailable'); }
  const r = rows[0];
  if (!r) throw promoError('not_found');
  const now = new Date();
  if (r.active === false) throw promoError('inactive');
  if (r.starts_at && new Date(r.starts_at) > now) throw promoError('not_started');
  if (r.expires_at && new Date(r.expires_at) < now) throw promoError('expired');
  if (r.max_uses != null && (r.uses_count || 0) >= r.max_uses) throw promoError('used_up');
  if (r.email) {
    if (!email) throw promoError('need_email');
    if (String(r.email).toLowerCase() !== String(email).trim().toLowerCase()) throw promoError('wrong_email');
  }
  return {
    code: c, type: r.type, value: Number(r.value) || 0, tag: r.tag || 'campaign',
    minOrderAed: r.min_order_aed != null ? Number(r.min_order_aed) : null, lockedEmail: r.email || null,
  };
}

// What a 100%-free order becomes, based on why the code was issued.
function orderTypeForTag(tag) {
  return { influencer: 'influencer', compensation: 'replacement', test: 'test' }[tag] || 'gift';
}

// items: [{ story, extraCharacterName? }]  (anything price-related from the browser is ignored)
async function priceOrder({ regionKey, items, promoCode, email }) {
  const region = REGIONS[regionKey];
  if (!region) throw Object.assign(new Error('bad region'), { userMessage: 'We currently deliver to the UAE and GCC only.' });
  if (!Array.isArray(items) || !items.length) throw Object.assign(new Error('empty'), { userMessage: 'Your cart is empty.' });
  if (items.length > 20) throw Object.assign(new Error('too many'), { userMessage: 'Please contact us for orders of more than 20 books.' });

  const stories = await loadStories(items.map(i => String(i.story || '')));
  const toAed = n => round2(n * AED_PER_UNIT[region.currency]);
  const tier = tierFor(items.length);
  const fullBooks = region.bookNow * items.length;

  // Extra-character fee: only when the story really has one, at the database price (AED -> local).
  const rate = region.bookNow / REGIONS.UAE.bookNow;
  const extraFeeAed = items.reduce((sum, i) => {
    const s = stories[i.story];
    return sum + (i.extraCharacterName && s && s.has_extra_character ? Number(s.extra_character_fee_aed) || 0 : 0);
  }, 0);
  const extraFee = round2(extraFeeAed * rate);

  // Option A: the bundle discount.
  let booksTotal = fullBooks * (1 - tier.discountPct / 100);
  let deliveryFee = tier.freeDelivery ? 0 : region.deliveryFee;
  let extra = extraFee;
  let bundleDiscountPct = tier.discountPct;
  let applied = null, promoNotBetter = false;

  // Option B: the code instead (never both).
  const promo = await loadPromo(promoCode, { email });
  if (promo) {
    if (promo.minOrderAed != null && toAed(fullBooks) < promo.minOrderAed) {
      throw promoError('min_order', { message: `This code needs an order of at least AED ${promo.minOrderAed} (before discounts).` });
    }
    let b = fullBooks, d = region.deliveryFee, x = extraFee;
    if (promo.type === 'free_order') { b = 0; d = 0; x = 0; }
    else if (promo.type === 'free_shipping') d = 0;
    else if (promo.type === 'percent') b = fullBooks * (1 - Math.min(100, promo.value) / 100);
    else if (promo.type === 'fixed') b = Math.max(0, fullBooks - promo.value / AED_PER_UNIT[region.currency]);
    const withBundle = booksTotal + deliveryFee + extra;
    const withCode = b + d + x;
    if (promo.type === 'free_order' || withCode < withBundle - 0.001) {
      booksTotal = b; deliveryFee = d; extra = x; bundleDiscountPct = 0; applied = promo;
    } else {
      promoNotBetter = true; // bundle already gives more; the code is not used up
    }
  }

  const listValue = fullBooks + region.deliveryFee + extraFee;
  const total = round2(booksTotal + deliveryFee + extra);
  const chargedAed = toAed(total);
  return {
    currency: region.currency, total, chargedAed,
    listValueAed: toAed(listValue),
    promoDiscountAed: applied ? round2(toAed(listValue) - chargedAed) : 0,
    promo: applied, promoNotBetter,
    breakdown: { perBook: round2(booksTotal / items.length), booksTotal: round2(booksTotal), deliveryFee: round2(deliveryFee), extraFee: round2(extra), bundleDiscountPct, promo: applied ? applied.code : null },
  };
}

// Supabase RPC helpers for the atomic code reservation (service key only).
async function rpc(fn, args) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`rpc ${fn} ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}
const reserveDiscount = (code, order, total) => rpc('reserve_discount', {
  p_code: code, p_order_id: order.id, p_order_number: order.order_number, p_email: order.email,
  p_discount_aed: order.promo_discount_aed || 0, p_total_aed: total,
});
const settleDiscount = (orderId, success) => rpc('settle_discount', { p_order_id: orderId, p_success: !!success })
  .catch(e => { console.error('settle_discount failed', orderId, e.message); return null; });

module.exports = { priceOrder, loadPromo, orderTypeForTag, reserveDiscount, settleDiscount, PROMO_MESSAGES, REGIONS, AED_PER_UNIT, SUPABASE_URL, SUPABASE_KEY, SUPABASE_ANON_KEY };
