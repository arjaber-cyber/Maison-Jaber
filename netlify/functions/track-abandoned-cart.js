// netlify/functions/track-abandoned-cart.js
//
// Called from checkout.html once a shopper has typed a valid email, and again whenever
// they tick / untick "Email me a link to finish my order". Saves a copy of the cart
// (story, child's name, age, language, message, private photo paths; never the photos
// themselves) so send-abandoned-reminders.js can send ONE reminder with a private link
// that rebuilds the cart on any device.
//
// POST { email, consent: true|false, lang: 'en'|'ar', country: 'UAE'|'Saudi'|..., items: [cart items] }
//
// Never blocks the page: every failure returns 200 { tracked: false }.

const R = require('./_recovery');

const COUNTRIES = ['UAE', 'Saudi', 'Qatar', 'Kuwait', 'Bahrain', 'Oman'];
const ok = body => ({ statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  let p;
  try { p = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) }; }

  const email = R.normEmail(p.email);
  if (!R.validEmail(email)) return { statusCode: 400, body: JSON.stringify({ error: 'A valid email is required.' }) };
  if (!R.SERVICE_KEY) { console.warn('track-abandoned-cart: SUPABASE_SERVICE_ROLE_KEY missing'); return ok({ tracked: false }); }

  const items = R.sanitizeCart(p.items);
  const first = items[0] || {};
  const now = new Date();

  try {
    // Read the existing row first so a returning shopper never gets a second reminder inside the cooldown.
    const cur = await R.sb(`abandoned_carts?email=eq.${encodeURIComponent(email)}&select=reminder_sent,reminder_sent_at,consent_at,completed`);
    const prev = cur.ok ? ((await cur.json())[0] || null) : null;
    const coolOff = new Date(now - R.REMINDER_COOLDOWN_DAYS * 864e5);
    const recentlyReminded = !!(prev && prev.reminder_sent && (!prev.reminder_sent_at || new Date(prev.reminder_sent_at) > coolOff));

    const row = {
      email,
      child_name: first.childName || null,
      story: first.story || null,
      age_edition: first.ageEdition || null,
      lang: p.lang === 'ar' ? 'ar' : 'en',
      country: COUNTRIES.includes(p.country) ? p.country : null,
      cart_snapshot: items,
      item_count: items.length,
      completed: false,
      completed_at: null,
      reminder_sent: recentlyReminded,
      last_seen_at: now.toISOString(),
      suppressed_reason: null,
    };
    if (!recentlyReminded) { row.reminder_sent_at = null; row.resume_token_hash = null; row.resume_expires_at = null; }
    // Consent is only ever recorded from an explicit tick; unticking withdraws it. Undefined = leave as is.
    if (p.consent === true) { row.consent_at = (prev && prev.consent_at) || now.toISOString(); row.consent_source = 'checkout_finish_link'; }
    else if (p.consent === false) { row.consent_at = null; row.consent_source = null; }

    const res = await R.sb('abandoned_carts?on_conflict=email', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(row),
    });
    if (!res.ok) console.warn('track-abandoned-cart: upsert failed', res.status, await res.text());
    return ok({ tracked: res.ok });
  } catch (err) {
    console.error('track-abandoned-cart error:', err.message);
    return ok({ tracked: false });
  }
};
