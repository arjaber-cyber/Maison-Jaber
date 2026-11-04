// netlify/functions/_recovery.js
//
// Shared helpers for abandoned-order recovery (Nov 2026):
//   track-abandoned-cart.js     saves the cart (no photos) once a shopper enters an email at checkout
//   send-abandoned-reminders.js emails ONE reminder ~3h later, only to shoppers who opted in
//   resume-cart.js              turns the private link in that email back into the same cart, on any device
//   email-unsubscribe.js        one-click opt-out from reminders and promotions
//
// Privacy rules this file enforces:
//   - Children's photos are NEVER copied here. The cart snapshot keeps only the private storage
//     path of each photo (useless without the server key) and drops thumbnails / data: URLs.
//   - Resume links carry a random token; only its SHA-256 hash is stored, and it expires after
//     RESUME_DAYS, which is well inside the 15-day photo deletion promise.
//   - Unsubscribe links are signed (HMAC) so nobody can opt someone else out or in.

const crypto = require('crypto');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const RESUME_DAYS = 7;                // resume link lifetime (photos are deleted after 15 days)
const REMINDER_DELAY_HOURS = 3;       // "about three hours" of inactivity
const REMINDER_MAX_AGE_HOURS = 48;    // older carts are left alone rather than emailed days later
const REMINDER_COOLDOWN_DAYS = 30;    // at most one reminder per address per 30 days

const EMAIL_RE = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,24}$/i;
const PHOTO_PATH_RE = /^\d{4}-\d{2}-\d{2}\/[a-f0-9]{32}\.(jpe?g|png|webp|heic|heif)$/i;

const normEmail = e => String(e || '').trim().toLowerCase();
const validEmail = e => EMAIL_RE.test(normEmail(e)) && normEmail(e).length <= 254;

function sb(path, init) {
  const o = init || {};
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, Object.assign({}, o, {
    headers: Object.assign({ apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }, o.headers || {}),
  }));
}

/* ---------- Cart snapshot: everything needed to rebuild the cart, nothing that is a picture ---------- */
const str = (v, n) => (v == null ? null : String(v).slice(0, n));
const paths = list => (Array.isArray(list) ? list : []).filter(p => typeof p === 'string' && PHOTO_PATH_RE.test(p)).slice(0, 6);
const httpUrl = u => (typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u) ? u.slice(0, 500) : null);

function sanitizeItem(i) {
  if (!i || typeof i !== 'object') return null;
  return {
    id: str(i.id, 60),
    story: str(i.story, 160),
    slug: str(i.slug, 80),
    coverUrl: httpUrl(i.coverUrl),
    theme: str(i.theme, 40),
    childName: str(i.childName, 60),
    childNameTyped: str(i.childNameTyped, 60),
    photoConsent: i.photoConsent === true,
    photoConsentAt: str(i.photoConsentAt, 40),
    ageEdition: str(i.ageEdition, 10),
    childAge: str(i.childAge, 10),
    gender: str(i.gender, 20),
    dedication: str(i.dedication, 800),
    bookLanguage: i.bookLanguage === 'ar' ? 'ar' : 'en',
    photoCount: Number(i.photoCount) || 0,
    photoPaths: paths(i.photoPaths),
    extraCharacterName: str(i.extraCharacterName, 60),
    extraCharacterFeeAed: Number(i.extraCharacterFeeAed) || 0,
    extraCharacterPhotoCount: Number(i.extraCharacterPhotoCount) || 0,
    extraCharacterPhotoPaths: paths(i.extraCharacterPhotoPaths),
    supportingChoice: str(i.supportingChoice, 20),
    supportingCharacters: (Array.isArray(i.supportingCharacters) ? i.supportingCharacters : []).slice(0, 4)
      .map(c => ({ role: str(c && c.role, 30), photoPaths: paths(c && c.photoPaths).slice(0, 2) })),
    supportingPhotoConsent: i.supportingPhotoConsent === true,
  };
}
function sanitizeCart(items) {
  return (Array.isArray(items) ? items : []).slice(0, 8).map(sanitizeItem).filter(i => i && (i.story || i.slug));
}

/* ---------- Resume tokens ---------- */
const newToken = () => crypto.randomBytes(32).toString('base64url');
const hashToken = t => crypto.createHash('sha256').update(String(t || '')).digest('hex');

/* ---------- Signed unsubscribe links ---------- */
function secret() { return process.env.RECOVERY_SECRET || SERVICE_KEY || ''; }
function signEmail(email) {
  if (!secret()) return null;
  return crypto.createHmac('sha256', secret()).update('unsub:' + normEmail(email)).digest('base64url').slice(0, 32);
}
function verifyEmailSig(email, sig) {
  const good = signEmail(email);
  if (!good || typeof sig !== 'string' || sig.length !== good.length) return false;
  return crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig));
}
function unsubscribeUrl(email) {
  const sig = signEmail(email);
  if (!sig) return null;
  const base = String(process.env.SITE_URL || 'https://maison-jaber.com').replace(/\/+$/, '').replace(/\/hikaya$/, '');
  return `${base}/.netlify/functions/email-unsubscribe?e=${encodeURIComponent(normEmail(email))}&s=${sig}`;
}

async function isUnsubscribed(email) {
  const r = await sb(`email_unsubscribes?email=eq.${encodeURIComponent(normEmail(email))}&select=email`);
  if (!r.ok) throw new Error('unsubscribe lookup failed ' + r.status);
  return (await r.json()).length > 0;
}

module.exports = {
  SUPABASE_URL, SERVICE_KEY, sb,
  RESUME_DAYS, REMINDER_DELAY_HOURS, REMINDER_MAX_AGE_HOURS, REMINDER_COOLDOWN_DAYS,
  normEmail, validEmail, sanitizeCart, sanitizeItem, newToken, hashToken,
  signEmail, verifyEmailSig, unsubscribeUrl, isUnsubscribed,
};
