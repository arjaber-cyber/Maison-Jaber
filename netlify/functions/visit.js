// netlify/functions/visit.js
//
// Cookie-free visitor counter (Oct 2026). analytics.js sends one small beacon
// per page view and per shop step (story viewed, personalise steps, add to
// cart, checkout, purchase). It counts EVERY visitor, not only the ones who
// accept the cookie banner, because nothing here can identify a person:
//   - no cookies, nothing stored on the visitor's device
//   - the IP address is never saved: it is mixed with the browser string,
//     today's date and a server secret into a one-way hash, so the same
//     person counts once per day and cannot be followed across days
//   - only country (from Netlify), device type and where the visit came from
//
// Rows land in Supabase `site_events` (service-role only). The dashboard reads
// them through admin-visits.js. Never blocks or breaks a page: always 204.

const crypto = require('crypto');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SECRET = process.env.VISIT_HASH_SECRET || SUPABASE_KEY || 'hikaya';

const EVENTS = new Set(['pageview', 'view_item', 'personalize_step', 'add_to_cart', 'view_cart', 'begin_checkout', 'purchase', 'whatsapp_click', 'newsletter_signup']);
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|meta-externalagent|headless|lighthouse|pagespeed|python|curl|wget|httpclient|axios|node-fetch|go-http|java\/|scrapy|phantom|selenium|puppeteer|playwright/i;
const OWN_HOSTS = /(^|\.)maison-jaber\.com$|netlify\.app$/i;

const clip = (v, n) => (v == null || v === '' ? null : String(v).slice(0, n));
const NO = { statusCode: 204, headers: { 'Cache-Control': 'no-store' }, body: '' };

function device(ua) {
  if (/ipad|tablet|kindle|silk|(android(?!.*mobile))/i.test(ua)) return 'Tablet';
  if (/mobi|iphone|ipod|android/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

function country(headers) {
  try {
    const g = headers['x-nf-geo'];
    if (g) {
      const geo = JSON.parse(Buffer.from(g, 'base64').toString('utf8'));
      if (geo && geo.country && geo.country.code) return geo.country.code;
    }
  } catch (_) { /* fall through */ }
  return clip(headers['x-country'], 2);
}

// Where the visit came from, in plain words the dashboard can show as-is.
function sourceOf({ utmSource, utmMedium, refHost, ua }) {
  const s = (utmSource || '').toLowerCase();
  const m = (utmMedium || '').toLowerCase();
  const paid = /paid|cpc|ppc|ads?$/.test(m);
  const insta = s === 'ig' || s.includes('instagram') || /instagram/i.test(refHost || '') || /instagram/i.test(ua);
  const fb = s === 'fb' || s.includes('facebook') || /facebook|fb\.com/i.test(refHost || '') || /FBAN|FBAV/i.test(ua);
  if (insta) return paid ? 'Instagram ad' : 'Instagram';
  if (fb) return paid ? 'Facebook ad' : 'Facebook';
  if (s) return paid ? `${utmSource} (ad)` : utmSource;
  if (!refHost) return 'Direct';
  if (OWN_HOSTS.test(refHost)) return 'Internal';
  if (/google\./i.test(refHost)) return 'Google';
  if (/bing\.|duckduckgo|yahoo\./i.test(refHost)) return 'Other search';
  if (/whatsapp|wa\.me/i.test(refHost)) return 'WhatsApp';
  if (/tiktok/i.test(refHost)) return 'TikTok';
  if (/snapchat/i.test(refHost)) return 'Snapchat';
  if (/t\.co$|twitter|x\.com/i.test(refHost)) return 'X';
  return refHost.replace(/^www\./, '');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST' || !SUPABASE_KEY) return NO;
  const h = event.headers || {};
  const ua = h['user-agent'] || '';
  if (!ua || BOT.test(ua)) return NO;

  let p;
  try { p = JSON.parse(event.body || '{}'); } catch { return NO; }
  if (!p || !EVENTS.has(p.e)) return NO;

  let refHost = null;
  try { if (p.r) refHost = new URL(p.r).hostname.toLowerCase(); } catch (_) { refHost = null; }

  const ip = h['x-nf-client-connection-ip'] || (h['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
  const visitor = crypto.createHash('sha256').update(`${SECRET}|${day}|${ip}|${ua}`).digest('hex').slice(0, 24);

  const row = {
    visitor,
    event: p.e,
    page: clip(p.p, 120),
    step: clip(p.s, 40),
    story: clip(p.st, 80),
    value: Number.isFinite(Number(p.v)) && p.v !== null && p.v !== '' ? Number(p.v) : null,
    utm_source: clip(p.us, 60),
    utm_medium: clip(p.um, 60),
    utm_campaign: clip(p.uc, 120),
    referrer_host: clip(refHost, 120),
    source: clip(sourceOf({ utmSource: p.us, utmMedium: p.um, refHost, ua }), 60),
    country: country(h),
    device: device(ua),
    lang: clip(p.l, 5),
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/site_events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    if (!res.ok) console.warn('visit: insert failed', res.status, await res.text());
  } catch (err) {
    console.warn('visit: insert error', err && err.message);
  }
  return NO;
};

// Exposed for the local test only.
exports._sourceOf = sourceOf;
exports._device = device;
