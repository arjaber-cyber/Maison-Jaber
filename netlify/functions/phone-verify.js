// netlify/functions/phone-verify.js
//
// "Add your WhatsApp number" for signed-in customers (Oct 2026).
// A 6-digit code is sent from the Hikaya WhatsApp number; once confirmed the
// number is saved to the account for good. Required to use discount codes.
//
// All calls need the customer's session token (Authorization: Bearer ...).
// POST { action: 'status' }
//   -> { available, verified, phone, marketingOptin, skipped }
// POST { action: 'send', phone, lang }
//   -> { sent: true, phone, expiresIn, resendIn }
// POST { action: 'confirm', phone, code, marketingOptin, optinText, lang }
//   -> { verified: true, phone }
// POST { action: 'skip' }                       dismiss the after-sign-up prompt
// POST { action: 'optin', marketingOptin, optinText, lang }   change offers preference later
// Errors: { error, reason }  reason: need_account | bad_phone | taken | cooldown |
//   too_many | not_on_whatsapp | send_failed | unavailable | bad_code | expired | locked

const crypto = require('crypto');
const { SUPABASE_URL, SUPABASE_KEY, H, authHeaderOf, currentUser, phoneRow } = require('./_member');
const { enabled: waEnabled, sendOtp } = require('./_whatsapp');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const fail = (code, reason, error) => json(code, { error, reason });

const CODE_TTL_MIN = 10;
const RESEND_SEC = 60;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

// Default optin wording, stored with the consent so it can be proven later.
const OPTIN_TEXT = {
  en: 'Send me offers, discounts and new stories by WhatsApp and email. I can unsubscribe anytime.',
  ar: 'أرسلوا لي العروض والخصومات والقصص الجديدة عبر واتساب والبريد الإلكتروني ويمكنني إلغاء الاشتراك في أي وقت',
};

// "+971 50 123 4567", "00971501234567", "971501234567" -> "+971501234567"
function normalizePhone(raw) {
  let p = String(raw || '').replace(/[\s\-().]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (!p.startsWith('+')) p = '+' + p;
  // Drop a trunk 0 typed after the country code (+9710501234567 -> +971501234567).
  p = p.replace(/^\+(971|966|974|965|973|968)0/, '+$1');
  return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
}

const hash = (id, code) => crypto.createHmac('sha256', process.env.OTP_SECRET || SUPABASE_KEY || 'hikaya').update(`${id}:${code}`).digest('hex');

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: H(opts.headers) });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) { const e = new Error((data && data.message) || `Supabase ${res.status}`); e.status = res.status; e.code = data && data.code; throw e; }
  return data;
}

async function upsertPhoneRow(user, fields) {
  return sb('customer_phones?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ user_id: user.id, email: user.email, updated_at: new Date().toISOString(), ...fields }),
  });
}

function consentFields(body) {
  const lang = body.lang === 'ar' ? 'ar' : 'en';
  const now = new Date().toISOString();
  if (body.marketingOptin === true) {
    return { marketing_optin: true, optin_at: now, optin_text: String(body.optinText || OPTIN_TEXT[lang]).slice(0, 400), optin_lang: lang, optout_at: null };
  }
  return { marketing_optin: false };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }

  const user = await currentUser(authHeaderOf(event));
  if (!user) return fail(401, 'need_account', 'Please sign in first.');
  const action = String(body.action || 'status');

  try {
    if (action === 'status') {
      const row = await phoneRow(user.id);
      return json(200, {
        available: waEnabled(),
        verified: Boolean(row && row.verified_at),
        phone: row && row.verified_at ? row.phone : null,
        marketingOptin: Boolean(row && row.marketing_optin),
        skipped: Boolean(row && row.skipped_at),
      });
    }

    if (action === 'skip') {
      await upsertPhoneRow(user, { skipped_at: new Date().toISOString() });
      return json(200, { ok: true });
    }

    if (action === 'optin') {
      const row = await phoneRow(user.id);
      const fields = body.marketingOptin === true ? consentFields(body) : { marketing_optin: false, optout_at: new Date().toISOString() };
      if (!row) await upsertPhoneRow(user, fields);
      else await sb(`customer_phones?user_id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }) });
      return json(200, { ok: true, marketingOptin: body.marketingOptin === true });
    }

    if (action === 'send') {
      if (!waEnabled()) return fail(503, 'unavailable', 'WhatsApp verification is not switched on yet. Please try again soon.');
      const phone = normalizePhone(body.phone);
      if (!phone) return fail(400, 'bad_phone', 'Please check the number, including the country code.');

      // Already verified on another account?
      const owner = await sb(`customer_phones?phone=eq.${encodeURIComponent(phone)}&verified_at=not.is.null&select=user_id`);
      if (owner.length && owner[0].user_id !== user.id) return fail(409, 'taken', 'This number is already linked to another Hikaya account. Sign in with that account, or use a different number.');

      // Rate limits: one code per minute, five per hour (per account and per number).
      const hourAgo = new Date(Date.now() - 3600e3).toISOString();
      const recent = await sb(`phone_otps?or=(user_id.eq.${user.id},phone.eq.${encodeURIComponent(phone)})&created_at=gt.${hourAgo}&select=created_at&order=created_at.desc`);
      if (recent.length) {
        const wait = RESEND_SEC - Math.floor((Date.now() - new Date(recent[0].created_at).getTime()) / 1000);
        if (wait > 0) return json(429, { error: `Please wait ${wait} seconds before asking for a new code.`, reason: 'cooldown', resendIn: wait });
      }
      if (recent.length >= MAX_SENDS_PER_HOUR) return fail(429, 'too_many', 'Too many codes requested. Please try again in an hour.');

      const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
      const id = crypto.randomUUID();
      await sb('phone_otps', { method: 'POST', body: JSON.stringify({ id, user_id: user.id, phone, code_hash: hash(id, code), expires_at: new Date(Date.now() + CODE_TTL_MIN * 60e3).toISOString() }) });
      try {
        await sendOtp(phone, code, body.lang);
      } catch (e) {
        await sb(`phone_otps?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
        if (e.reason === 'not_on_whatsapp') return fail(400, 'not_on_whatsapp', "We couldn't reach this number on WhatsApp. Please check it, or use a number that has WhatsApp.");
        return fail(502, e.reason === 'unavailable' ? 'unavailable' : 'send_failed', "We couldn't send the code just now. Please try again.");
      }
      return json(200, { sent: true, phone, expiresIn: CODE_TTL_MIN * 60, resendIn: RESEND_SEC });
    }

    if (action === 'confirm') {
      const phone = normalizePhone(body.phone);
      const code = String(body.code || '').replace(/\D/g, '');
      if (!phone) return fail(400, 'bad_phone', 'Please check the number, including the country code.');
      if (code.length !== 6) return fail(400, 'bad_code', 'Please enter the 6-digit code.');

      const rows = await sb(`phone_otps?user_id=eq.${user.id}&phone=eq.${encodeURIComponent(phone)}&used_at=is.null&select=*&order=created_at.desc&limit=1`);
      const otp = rows[0];
      if (!otp || new Date(otp.expires_at) < new Date()) return fail(400, 'expired', 'That code has expired. Tap "Send a new code".');
      if (otp.attempts >= MAX_ATTEMPTS) return fail(429, 'locked', 'Too many wrong tries. Tap "Send a new code".');

      const ok = crypto.timingSafeEqual(Buffer.from(hash(otp.id, code)), Buffer.from(otp.code_hash));
      if (!ok) {
        await sb(`phone_otps?id=eq.${otp.id}`, { method: 'PATCH', body: JSON.stringify({ attempts: otp.attempts + 1 }) });
        const left = MAX_ATTEMPTS - otp.attempts - 1;
        return json(400, { error: left > 0 ? "That code doesn't match. Please try again." : 'Too many wrong tries. Tap "Send a new code".', reason: left > 0 ? 'bad_code' : 'locked', attemptsLeft: left });
      }

      await sb(`phone_otps?id=eq.${otp.id}`, { method: 'PATCH', body: JSON.stringify({ used_at: new Date().toISOString() }) });
      try {
        await upsertPhoneRow(user, { phone, verified_at: new Date().toISOString(), ...consentFields(body) });
      } catch (e) {
        if (e.code === '23505') return fail(409, 'taken', 'This number is already linked to another Hikaya account.');
        throw e;
      }
      // Clean up this account's old codes.
      sb(`phone_otps?user_id=eq.${user.id}&id=neq.${otp.id}`, { method: 'DELETE' }).catch(() => {});
      return json(200, { verified: true, phone, marketingOptin: body.marketingOptin === true });
    }

    return json(400, { error: 'Unknown action.' });
  } catch (e) {
    console.error('phone-verify', action, e.message);
    return fail(500, 'unavailable', 'Something went wrong. Please try again.');
  }
};

module.exports.normalizePhone = normalizePhone;
