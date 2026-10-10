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

const FALLBACK_CODES = {
  WELCOME10: { type: 'percent', value: 10 },
  FREESHIP: { type: 'free_shipping', value: 0 },
};

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

async function loadPromo(code) {
  if (!code) return null;
  const c = String(code).trim().toUpperCase();
  try {
    const rows = await sb(`discount_codes?code=eq.${encodeURIComponent(c)}&select=*`);
    if (rows.length) {
      const r = rows[0];
      const expired = r.expires_at && new Date(r.expires_at) < new Date();
      const usedUp = r.max_uses != null && (r.uses_count || 0) >= r.max_uses;
      if (r.active === false || expired || usedUp) return null;
      return { code: c, type: r.type, value: Number(r.value) || 0 };
    }
  } catch (e) { /* table missing -> fall back */ }
  return FALLBACK_CODES[c] ? { code: c, ...FALLBACK_CODES[c] } : null;
}

// items: [{ story, extraCharacterName? }]  (anything price-related from the browser is ignored)
async function priceOrder({ regionKey, items, promoCode }) {
  const region = REGIONS[regionKey];
  if (!region) throw Object.assign(new Error('bad region'), { userMessage: 'We currently deliver to the UAE and GCC only.' });
  if (!Array.isArray(items) || !items.length) throw Object.assign(new Error('empty'), { userMessage: 'Your cart is empty.' });
  if (items.length > 20) throw Object.assign(new Error('too many'), { userMessage: 'Please contact us for orders of more than 20 books.' });

  const stories = await loadStories(items.map(i => String(i.story || '')));
  const tier = tierFor(items.length);
  const perBook = region.bookNow * (1 - tier.discountPct / 100);
  let booksTotal = perBook * items.length;
  let deliveryFee = tier.freeDelivery ? 0 : region.deliveryFee;

  // Extra-character fee: only when the story really has one, at the database price (AED -> local).
  const rate = region.bookNow / REGIONS.UAE.bookNow;
  const extraFeeAed = items.reduce((sum, i) => {
    const s = stories[i.story];
    return sum + (i.extraCharacterName && s && s.has_extra_character ? Number(s.extra_character_fee_aed) || 0 : 0);
  }, 0);
  const extraFee = round2(extraFeeAed * rate);

  const promo = await loadPromo(promoCode);
  if (promo) {
    if (promo.type === 'free_shipping') deliveryFee = 0;
    else if (promo.type === 'percent') booksTotal -= booksTotal * (promo.value / 100);
    else if (promo.type === 'fixed') booksTotal = Math.max(0, booksTotal - promo.value);
  }

  const total = round2(booksTotal + deliveryFee + extraFee);
  const chargedAed = round2(total * AED_PER_UNIT[region.currency]);
  return {
    currency: region.currency, total, chargedAed,
    breakdown: { perBook: round2(perBook), booksTotal: round2(booksTotal), deliveryFee: round2(deliveryFee), extraFee, bundleDiscountPct: tier.discountPct, promo: promo ? promo.code : null },
  };
}

module.exports = { priceOrder, REGIONS, AED_PER_UNIT, SUPABASE_URL, SUPABASE_KEY, SUPABASE_ANON_KEY };
