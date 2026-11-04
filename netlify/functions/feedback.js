// netlify/functions/feedback.js
//
// Post-delivery feedback (feedback.html). The link in the feedback email carries
// the order's private tracking_token, so no sign-in is needed.
//
// GET  ?t=<token>  -> { lang, firstName, childName, story, submitted }
// POST { t, ratings: { recommend, story, print, delivery }, comment }
//      -> { ok, lang }
//
// Rules:
//  - All four ratings (1-5) and the comment are required.
//  - One feedback per order. Submitting again just shows the thank-you.
//  - No discount code is issued for feedback (removed Nov 2026); the customer
//    gets a short thank-you email instead.
//  - By submitting, the customer agrees comments may be used anonymously in
//    promotions (declaration on the page; time stored in promo_consent_at).
//  - Any rating of 3 or below emails the team inbox so the owner can reach out.

const crypto = require('crypto');
const { sendEmail, OWNER_INBOX, SITE_URL } = require('./_email');
const { feedbackThanks, feedbackAlert, orderLang, parseItems } = require('./_templates');
const { SUPABASE_URL, SUPABASE_KEY } = require('./_pricing');

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REWARD_PCT = 10;
const REWARD_DAYS = 30;
const LOW = 3;

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) { const e = new Error((data && data.message) || `Supabase ${res.status}`); e.status = res.status; e.code = data && data.code; throw e; }
  return data;
}
const randomPart = n => Array.from(crypto.randomBytes(n), b => ALPHABET[b % ALPHABET.length]).join('');

function orderInfo(o) {
  const items = parseItems(o);
  const names = [...new Set(items.map(i => i && i.childName).filter(Boolean))];
  const stories = [...new Set(items.map(i => i && i.story).filter(Boolean))];
  return {
    lang: orderLang(o),
    firstName: String(o.full_name || '').trim().split(/\s+/)[0] || '',
    childName: names.join(' & '),
    story: stories.length === 1 ? stories[0] : '',
  };
}

async function loadOrder(token) {
  if (!token || !/^[A-Za-z0-9_-]{16,128}$/.test(token)) return null;
  const rows = await sb(`orders?tracking_token=eq.${encodeURIComponent(token)}&select=id,order_number,full_name,email,items,country,order_status,order_type,payment_status&limit=1`);
  return rows && rows[0] || null;
}

async function codeRow(code) {
  if (!code) return null;
  const r = await sb(`discount_codes?code=eq.${encodeURIComponent(code)}&select=code,expires_at,uses_count&limit=1`);
  return r && r[0] || null;
}

// The customer's existing feedback reward, if they already earned one (any order).
async function existingReward(email) {
  if (!email) return null;
  const r = await sb(`customer_feedback?email=ilike.${encodeURIComponent(email)}&discount_code=not.is.null&select=discount_code&order=created_at.asc&limit=1`);
  return r && r[0] ? r[0].discount_code : null;
}

async function issueCode(order) {
  const email = String(order.email || '').trim().toLowerCase();
  const base = {
    type: 'percent', value: REWARD_PCT, tag: 'review', email: email || null,
    expires_at: new Date(Date.now() + REWARD_DAYS * 864e5).toISOString(),
    max_uses: 1, max_uses_per_email: 1, first_order_only: false, active: true,
    template_name: 'Feedback reward', issued_for_order: order.order_number || null,
    note: 'Automatic: post-delivery feedback form',
  };
  for (let i = 0; i < 5; i++) {
    const code = `THANKS-${randomPart(6)}`;
    try {
      const rows = await sb('discount_codes', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify([{ code, ...base }]) });
      return rows[0];
    } catch (e) { if (e.code !== '23505') throw e; }
  }
  throw new Error('Could not create a unique code');
}

const rating = v => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null; };

exports.handler = async (event) => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return json(503, { error: 'not_configured' });
  try {
    if (event.httpMethod === 'GET') {
      const o = await loadOrder((event.queryStringParameters || {}).t);
      if (!o) return json(404, { error: 'not_found' });
      const info = orderInfo(o);
      const fb = (await sb(`customer_feedback?order_id=eq.${o.id}&select=id&limit=1`))[0];
      if (fb) return json(200, { ...info, submitted: true });
      return json(200, { ...info, submitted: false });
    }
    if (event.httpMethod !== 'POST') return json(405, { error: 'method' });

    let p; try { p = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'invalid' }); }
    const o = await loadOrder(p.t);
    if (!o) return json(404, { error: 'not_found' });
    const r = p.ratings || {};
    const q = { q_recommend: rating(r.recommend), q_story: rating(r.story), q_print: rating(r.print), q_delivery: rating(r.delivery) };
    const comment = String(p.comment || '').trim().slice(0, 2000);
    if (Object.values(q).some(v => v == null) || !comment) return json(400, { error: 'incomplete' });

    const info = orderInfo(o);
    const email = String(o.email || '').trim().toLowerCase() || null;

    // Insert first: the unique order_id stops a double submit from earning twice.
    let row;
    try {
      row = (await sb('customer_feedback', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({
        order_id: o.id, order_number: o.order_number, email, lang: info.lang, child_name: info.childName || null,
        story: info.story || null, country: o.country || null, ...q, comment,
      }) }))[0];
    } catch (e) {
      if (e.code !== '23505') throw e;
      return json(200, { ok: true, already: true, lang: info.lang });
    }

    // Plain thank-you email (no discount code).
    if (email && row) {
      const mail = feedbackThanks({ lang: info.lang, firstName: info.firstName, childName: info.childName });
      await sendEmail({ to: email, subject: mail.subject, html: mail.html }).catch(e => console.error('feedback thanks email', e && e.message));
    }

    const low = Object.values(q).some(v => v <= LOW);
    if (low) {
      const mail = feedbackAlert({ order: o, info, q, comment, adminUrl: `${SITE_URL}admin.html#feedback` });
      await sendEmail({ to: OWNER_INBOX, subject: mail.subject, html: mail.html }).catch(e => console.error('feedback alert email', e && e.message));
    }

    return json(200, { ok: true, lang: info.lang });
  } catch (e) {
    console.error('feedback', e);
    return json(500, { error: 'server' });
  }
};
