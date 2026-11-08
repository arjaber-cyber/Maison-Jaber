// netlify/functions/gads-conversions.js
//
// Google Ads offline conversions for CONFIRMED PAID orders (Nov 2026).
// Hourly (netlify.toml). Sends each eligible order once to the conversion action "Hikaya Paid Purchase"
// through Google's Data Manager API (events:ingest), matched on the ad click id saved with the order.
//
// What is sent, per order: transactionId = order number (Google de-duplicates on it), the click id
// (gclid / gbraid / wbraid), the payment-confirmed time, charged_aed as the value, currency AED, and the
// visitor's ad consent when they accepted marketing cookies. No name, email, phone, address or basket.
//
// Which orders: decided only in the database (view gads_eligible_orders): order_type 'sale',
// payment_status 'paid', charged_aed > 0, with a click id. Never test, influencer, gift / free-code,
// complimentary, pending, failed, cancelled or refunded orders. Orders are uploaded 6 hours after payment
// (Google needs the click processed first) and within 60 days.
//
// Idempotency: public.gads_conversion_uploads has one row per order (primary key = order number).
// gads_claim_conversions() locks due rows (SKIP LOCKED) and never returns a row already sent; a resend after
// a crash carries the same transactionId, which Google ignores as a duplicate.
// Logging: status, attempts, request id and a short error code per order in gads_conversion_uploads.
//
// Environment (Netlify > Site configuration > Environment variables):
//   GOOGLE_DM_SERVICE_ACCOUNT   the service account JSON key (raw JSON or base64)  [required]
//   GADS_CONVERSION_ACTION_ID   numeric id of "Hikaya Paid Purchase"                [required]
//   GADS_CUSTOMER_ID            Google Ads customer id, digits only (default 9064305186)
//   GADS_LOGIN_CUSTOMER_ID      only if access goes through a manager account
//   GADS_UPLOADS_LIVE=1         send for real. Anything else = validate-only dry run (nothing recorded by Google)

const crypto = require('crypto');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DM = 'https://datamanager.googleapis.com/v1';
const SCOPE = 'https://www.googleapis.com/auth/datamanager';

const digits = (v) => String(v || '').replace(/\D/g, '');
const CUSTOMER_ID = digits(process.env.GADS_CUSTOMER_ID || '9064305186');
const LOGIN_ID = digits(process.env.GADS_LOGIN_CUSTOMER_ID);
const ACTION_ID = digits(process.env.GADS_CONVERSION_ACTION_ID);
const LIVE = process.env.GADS_UPLOADS_LIVE === '1';

const sbH = () => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' });
async function rpc(fn, args) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: sbH(), body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`rpc ${fn} ${r.status}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const finish = (order, status, requestId, error) =>
  rpc('gads_finish_conversion', { p_order: order, p_status: status, p_request_id: requestId || null, p_error: error || null });

// Short, data-free error text: HTTP code + Google's status / reason codes only (never ids or values).
function errCode(httpStatus, body) {
  let s = `http_${httpStatus}`;
  try {
    const j = typeof body === 'string' ? JSON.parse(body) : body;
    const e = j && j.error;
    if (e && e.status) s += `:${e.status}`;
    const reasons = [];
    (e && e.details || []).forEach((d) => {
      if (d.reason) reasons.push(d.reason);
      (d.fieldViolations || []).forEach((v) => v.field && reasons.push(String(v.field).replace(/\[\d+\]/g, '[]')));
    });
    if (reasons.length) s += `:${[...new Set(reasons)].slice(0, 4).join('|')}`;
  } catch { /* plain code only */ }
  return s.replace(/[A-Za-z0-9_-]{25,}/g, '…').slice(0, 200);
}

function serviceAccount() {
  const raw = process.env.GOOGLE_DM_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const txt = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const sa = JSON.parse(txt);
    return sa.client_email && sa.private_key ? sa : null;
  } catch { return null; }
}

async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`token ${r.status} ${j.error || ''}`.trim());
  return j.access_token;
}

function destination() {
  const d = { operatingAccount: { accountType: 'GOOGLE_ADS', accountId: CUSTOMER_ID }, productDestinationId: ACTION_ID };
  if (LOGIN_ID) d.loginAccount = { accountType: 'GOOGLE_ADS', accountId: LOGIN_ID };
  return d;
}

function buildEvent(o) {
  const ad = {};
  if (o.gclid) ad.gclid = o.gclid;
  if (o.gbraid) ad.gbraid = o.gbraid;
  if (o.wbraid) ad.wbraid = o.wbraid;
  const ev = {
    transactionId: o.order_number,
    eventTimestamp: new Date(o.paid_at).toISOString(),
    adIdentifiers: ad,
    conversionValue: Math.round(Number(o.value_aed) * 100) / 100,
    currency: 'AED',
    eventSource: 'WEB',
  };
  // Only a consent the visitor actually gave is passed on (UAE / GCC traffic needs no consent signal).
  if (o.ad_consent === true) ev.consent = { adUserData: 'CONSENT_GRANTED', adPersonalization: 'CONSENT_GRANTED' };
  return ev;
}

// 1) Check what Google did with earlier uploads (processing is asynchronous).
async function checkSent(token) {
  const since = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/gads_conversion_uploads?status=eq.sent&request_id=not.is.null&sent_at=lt.${since}&select=order_number,request_id&limit=25`, { headers: sbH() });
  const rows = r.ok ? await r.json() : [];
  const out = [];
  for (const row of rows) {
    try {
      const s = await fetch(`${DM}/requestStatus:retrieve?requestId=${encodeURIComponent(row.request_id)}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await s.text();
      if (!s.ok) { out.push([row.order_number, 'check_failed', errCode(s.status, body)]); continue; }
      const st = (JSON.parse(body).requestStatusPerDestination || [])[0] || {};
      const status = st.requestStatus || 'REQUEST_STATUS_UNKNOWN';
      const reasons = ((st.errorInfo && st.errorInfo.errorCounts) || []).map((c) => c.reason).filter(Boolean);
      const reasonTxt = reasons.join('|').slice(0, 180);
      if (status === 'SUCCESS') { await finish(row.order_number, 'confirmed', null, null); out.push([row.order_number, 'confirmed']); }
      else if (status === 'FAILURE' || status === 'FAILED' || status === 'PARTIAL_SUCCESS') {
        if (reasons.some((x) => /DUPLICATE/.test(x))) { await finish(row.order_number, 'confirmed', null, null); out.push([row.order_number, 'confirmed_duplicate']); }
        else if (reasons.some((x) => /CLICK_NOT_FOUND|TOO_RECENT|NOT_YET|TEMPORARY|INTERNAL/.test(x))) { await finish(row.order_number, 'failed', null, `google:${reasonTxt}`); out.push([row.order_number, 'retry', reasonTxt]); }
        else { await finish(row.order_number, 'rejected', null, `google:${reasonTxt || status}`); out.push([row.order_number, 'rejected', reasonTxt]); }
      } else out.push([row.order_number, 'processing']);
    } catch (e) { out.push([row.order_number, 'check_error', String(e.message).slice(0, 80)]); }
  }
  return out;
}

// 2) Send newly due orders, one per request so one bad row never blocks another.
async function sendDue(token) {
  const due = await rpc('gads_claim_conversions', { p_action_id: ACTION_ID, p_limit: 20, p_min_age: '6 hours' }) || [];
  const out = [];
  for (const o of due) {
    try {
      const r = await fetch(`${DM}/events:ingest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinations: [destination()], events: [buildEvent(o)], validateOnly: !LIVE }),
      });
      const body = await r.text();
      if (r.ok) {
        let reqId = null; try { reqId = JSON.parse(body).requestId || null; } catch {}
        await finish(o.order_number, LIVE ? 'sent' : 'validated', reqId, null);
        out.push([o.order_number, LIVE ? 'sent' : 'validated']);
      } else {
        // 400 = Google refused this record as invalid: retrying would not help. Anything else: retry later.
        const permanent = r.status === 400 || r.status === 404;
        await finish(o.order_number, permanent ? 'rejected' : 'failed', null, errCode(r.status, body));
        out.push([o.order_number, permanent ? 'rejected' : 'failed', r.status]);
      }
    } catch (e) {
      await finish(o.order_number, 'failed', null, `network:${String(e.message).slice(0, 60)}`).catch(() => {});
      out.push([o.order_number, 'failed', 'network']);
    }
  }
  return out;
}

exports.handler = async () => {
  const sa = serviceAccount();
  if (!SUPABASE_KEY || !sa || !ACTION_ID || !CUSTOMER_ID) {
    console.log('gads-conversions: not configured yet (needs GOOGLE_DM_SERVICE_ACCOUNT and GADS_CONVERSION_ACTION_ID); nothing sent');
    return { statusCode: 200, body: 'not configured' };
  }
  try {
    const token = await accessToken(sa);
    const checked = LIVE ? await checkSent(token) : [];
    const sent = await sendDue(token);
    console.log('gads-conversions', JSON.stringify({ live: LIVE, checked, sent }));
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    console.error('gads-conversions error', String(e.message).slice(0, 200));
    return { statusCode: 200, body: 'error' };
  }
};

exports._buildEvent = buildEvent;
exports._errCode = errCode;
