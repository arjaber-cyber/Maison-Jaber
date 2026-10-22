// netlify/functions/tabby-webhook.js
//
// Tabby calls this server-to-server when a payment changes (authorized,
// closed, rejected, expired...). It catches customers who close the tab
// before coming back to the site.
//
// Security: only Tabby's published IPs, plus the secret header we registered
// (X-Auth-Key = TABBY_WEBHOOK_SECRET, see tabby-register-webhook.js). Even so,
// nothing in the body is trusted: we re-read the payment from Tabby.
// Tabby retries on any non-200, so we answer 404 / 500 when we want a retry.
// Env: TABBY_WEBHOOK_SECRET

const crypto = require('crypto');
const { settleFromTabby, UUID } = require('./_tabby');

const TABBY_IPS = ['34.166.36.90', '34.166.35.211', '34.166.34.222', '34.166.37.207', '34.93.76.191', '34.166.128.182', '34.166.170.3', '34.166.249.7'];

function headerMatches(event) {
  const secret = String(process.env.TABBY_WEBHOOK_SECRET || '');
  const h = event.headers || {};
  const got = String(h['x-auth-key'] || h['X-Auth-Key'] || '');
  return secret && got.length === secret.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(secret));
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const ip = event.headers['x-nf-client-connection-ip'];
  if (!TABBY_IPS.includes(ip)) {
    console.warn('Tabby webhook rejected: unknown IP', ip);
    return { statusCode: 403, body: 'Forbidden' };
  }
  if (!headerMatches(event)) {
    console.warn('Tabby webhook rejected: bad auth header');
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
  let payload;
  try { payload = JSON.parse(raw); } catch { return { statusCode: 400, body: 'Bad JSON' }; }

  const id = String(payload.id || '');
  console.log('TABBY WEBHOOK', id, payload.status, payload.amount, payload.currency, payload.order && payload.order.reference_id, payload.is_test ? 'test' : 'live');
  if (!UUID.test(id)) return { statusCode: 200, body: 'ignored' };

  try {
    const r = await settleFromTabby(id);
    if (!r.found) return { statusCode: 404, body: 'order not found yet' }; // Tabby retries
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    console.error('tabby settle failed', e.message);
    return { statusCode: 500, body: 'retry' };
  }
};
