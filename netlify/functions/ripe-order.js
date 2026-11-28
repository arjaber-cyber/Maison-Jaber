// netlify/functions/ripe-order.js
//
// "Ripe" quick order (Nov 2026) — maison-jaber.com/hikaya/ripe
// The customer gives only a WhatsApp number and picks a story. We save a bare
// order (no payment, no child details), hand back the order number, and send
// the owner a WhatsApp alert so he can take it forward by hand.
//
// POST { phone: "+971501234567", slug: "story-slug", lang: "en"|"ar" }
//   -> { orderNumber, story }
//
// Saved as: payment_method 'whatsapp', payment_status 'pending' (shown as
// "Awaiting payment" in the admin, but NOT one of the statuses owner-alerts
// chases), order_status 'received', order_type_note 'Ripe quick order'.
// Env: SUPABASE_SERVICE_ROLE_KEY (+ the WhatsApp alert env used by _whatsapp.js)

const { SUPABASE_URL, SUPABASE_KEY } = require('./_pricing');
const { sendOwnerAlert } = require('./_whatsapp');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const SB = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

const COUNTRY_BY_DIAL = { '971': 'UAE', '966': 'KSA', '974': 'Qatar', '965': 'Kuwait', '973': 'Bahrain', '968': 'Oman' };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }
  const lang = b.lang === 'ar' ? 'ar' : 'en';
  const msg = (en, ar) => (lang === 'ar' ? ar : en);

  const digits = String(b.phone || '').replace(/\D/g, '').replace(/^00/, '');
  if (!/^[1-9]\d{7,14}$/.test(digits)) return json(400, { error: msg('Please enter a valid WhatsApp number.', 'يرجى إدخال رقم واتساب صحيح') });
  const phone = '+' + digits;

  const slug = String(b.slug || '').trim().slice(0, 80);
  if (!/^[a-z0-9-]+$/.test(slug)) return json(400, { error: msg('Please choose a story.', 'يرجى اختيار القصة') });

  // The story must be a live one in the catalogue.
  let story;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/stories?slug=eq.${encodeURIComponent(slug)}&select=slug,title,title_ar,active&limit=1`, { headers: SB });
    [story] = r.ok ? await r.json() : [];
  } catch {}
  if (!story || story.active === false) return json(400, { error: msg('Please choose a story from the list.', 'يرجى اختيار قصة من القائمة') });

  // Double taps / refreshes: same number + same story in the last 10 minutes returns the same order.
  try {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?phone=eq.${encodeURIComponent(phone)}&payment_method=eq.whatsapp&created_at=gte.${encodeURIComponent(since)}&select=order_number,items&order=created_at.desc&limit=5`, { headers: SB });
    const recent = r.ok ? await r.json() : [];
    const same = recent.find(o => { try { return JSON.parse(o.items || '[]').some(i => i.slug === slug); } catch { return false; } });
    if (same) return json(200, { orderNumber: same.order_number, story: lang === 'ar' && story.title_ar ? story.title_ar : story.title });
    if (recent.length >= 3) return json(429, { error: msg('We already have your orders. We will message you on WhatsApp shortly.', 'استلمنا طلباتك وسنتواصل معك عبر واتساب قريباً') });
  } catch {}

  const orderNumber = `HK-${Date.now().toString().slice(-8)}`;
  const nowIso = new Date().toISOString();
  const dial = Object.keys(COUNTRY_BY_DIAL).find(d => digits.startsWith(d));
  const items = [{ story: story.title, slug: story.slug, bookLanguage: lang, siteLang: lang, source: 'ripe' }];

  const save = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST', headers: { ...SB, Prefer: 'return=representation' },
    body: JSON.stringify({
      order_number: orderNumber, phone, full_name: null, email: null,
      country: dial ? COUNTRY_BY_DIAL[dial] : null,
      payment_method: 'whatsapp', payment_status: 'pending', order_status: 'received',
      order_type: 'sale', order_type_note: 'Ripe quick order (WhatsApp number + story only)',
      items: JSON.stringify(items), is_gift: false, marketing_opt_in: false, created_at: nowIso,
    }),
  });
  if (!save.ok) {
    console.error('ripe order save failed', save.status, await save.text().catch(() => ''));
    return json(500, { error: msg('We could not place your order. Please try again.', 'تعذّر إرسال طلبك، يرجى المحاولة مرة أخرى') });
  }

  await sendOwnerAlert(`Ripe order ${orderNumber}`, `Story: ${story.title} (${lang === 'ar' ? 'Arabic' : 'English'} page) · WhatsApp: ${phone}`);

  return json(200, { orderNumber, story: lang === 'ar' && story.title_ar ? story.title_ar : story.title });
};
