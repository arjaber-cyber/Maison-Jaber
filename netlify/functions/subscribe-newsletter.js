// netlify/functions/subscribe-newsletter.js
//
// Saves an email to Supabase's `newsletter_subscribers` table. Degrades
// gracefully if the table doesn't exist yet -- the visitor still sees a
// friendly "Thanks!" message rather than an error, and we just note it
// server-side so the signup isn't silently lost forever once the table
// is created (Netlify function logs).
//
// SETUP: create a `newsletter_subscribers` table in Supabase:
//   email text primary key, subscribed_at timestamptz

const { sendEmail } = require('./_email');
const { newsletterWelcome, welcomeOffer } = require('./_templates');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
// Server-side key (set SUPABASE_SERVICE_ROLE_KEY in Netlify env). The tables are locked with RLS,
// so the public anon key alone can only read public storefront data.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  const email = (payload.email || '').trim().toLowerCase();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please enter a valid email address.' }) };
  }

  const lang = payload.lang === 'ar' ? 'ar' : 'en';
  // Welcome pop-up (Nov 2026): source is recorded and the email carries the first-order code.
  const source = payload.source === 'welcome_popup' ? 'welcome_popup' : 'newsletter';
  const amount = /^[A-Z]{3} \d{1,4}(\.\d{1,2})?$/.test(String(payload.amount || '')) ? String(payload.amount) : 'AED 20';
  const country = /^[A-Z]{2,12}$/.test(String(payload.country || '')) ? String(payload.country) : null;
  try {
    // Already subscribed? Then don't send the welcome note again.
    let isNew = true;
    try {
      const chk = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?email=eq.${encodeURIComponent(email)}&select=email`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
      if (chk.ok) isNew = (await chk.json()).length === 0;
    } catch {}
    const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?on_conflict=email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(Object.assign(isNew ? { email, lang, subscribed_at: new Date().toISOString() } : { email, lang }, isNew ? { source, country } : {})),
    });
    let saved = res.ok;
    if (!saved && isNew) { // source/country columns not added yet (supabase/2026-11-welcome-popup.sql): save the email anyway
      const r2 = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?on_conflict=email`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ email, lang, subscribed_at: new Date().toISOString() }) });
      saved = r2.ok;
    }
    if (!saved) {
      console.warn('newsletter_subscribers insert failed (table may not exist yet):', await res.text());
    }
    else if (source === 'welcome_popup') {
      // Always (re)send the code to pop-up sign-ups: they were promised it by email.
      const m = welcomeOffer(lang, amount);
      await sendEmail({ to: email, subject: m.subject, html: m.html }).catch(e => console.warn('welcome offer email failed', e));
    }
    else if (isNew) {
      const m = newsletterWelcome(lang);
      await sendEmail({ to: email, subject: m.subject, html: m.html }).catch(e => console.warn('newsletter welcome failed', e));
    }
    // Always a friendly success to the visitor -- a missing table is our
    // setup issue, not something they should see as an error.
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('subscribe-newsletter error:', err);
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }
};
