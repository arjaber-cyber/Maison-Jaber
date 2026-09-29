// netlify/functions/ziina-webhook.js
//
// Ziina calls this server-to-server whenever a payment or refund changes
// status. This is the source of truth for "paid" -- a customer can close
// the tab before the success page loads, but this still arrives.
//
// Security: only Ziina's published IPs, and the HMAC-SHA256 signature of
// the raw body must match ZIINA_WEBHOOK_SECRET.
// Env: ZIINA_WEBHOOK_SECRET

const crypto = require('crypto');

const ZIINA_IPS = ['3.29.184.186', '3.29.190.95', '20.233.47.127', '13.202.161.181'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const ip = event.headers['x-nf-client-connection-ip'];
  if (!ZIINA_IPS.includes(ip)) {
    console.warn('Ziina webhook rejected: unknown IP', ip);
    return { statusCode: 403, body: 'Forbidden' };
  }

  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
  const secret = process.env.ZIINA_WEBHOOK_SECRET || '';
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const got = String(event.headers['x-hmac-signature'] || '');
  const ok = secret && got.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  if (!ok) {
    console.warn('Ziina webhook rejected: bad signature');
    return { statusCode: 401, body: 'Bad signature' };
  }

  let payload;
  try { payload = JSON.parse(raw); } catch { return { statusCode: 400, body: 'Bad JSON' }; }
  const { event: name, data = {} } = payload;

  if (name === 'payment_intent.status.updated') {
    console.log(`ZIINA PAYMENT ${data.status}`, data.id, data.amount, data.currency_code);
    // Next step: when wired into checkout, look up the order by data.id in
    // Supabase and mark it paid here (same job paytabs-callback.js does).
  } else if (name === 'refund.status.updated') {
    console.log('ZIINA REFUND', data.id, data.status);
  }

  return { statusCode: 200, body: 'ok' };
};
