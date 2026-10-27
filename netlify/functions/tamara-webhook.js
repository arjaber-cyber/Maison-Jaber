// netlify/functions/tamara-webhook.js
//
// Tamara calls this server-to-server when an order changes (approved,
// authorised, captured, canceled, refunded, expired, declined). It catches
// customers who close the tab before coming back to the site.
//
// Security: Tamara signs every call with a JWT (tamaraToken query param and
// Authorization: Bearer header), HS256 with our notification token. Even so,
// nothing in the body is trusted: we re-read the order from Tamara.
// Tamara retries on non-200, so we answer 404 / 500 when we want a retry.
// Env: TAMARA_NOTIFICATION_TOKEN

const { settleFromTamara, verifyTamaraToken, UUID } = require('./_tamara');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const q = event.queryStringParameters || {};
  const h = event.headers || {};
  const bearer = String(h.authorization || h.Authorization || '').replace(/^Bearer\s+/i, '');
  if (!verifyTamaraToken(q.tamaraToken) && !verifyTamaraToken(bearer)) {
    console.warn('Tamara webhook rejected: bad or missing tamaraToken');
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
  let payload;
  try { payload = JSON.parse(raw); } catch { return { statusCode: 400, body: 'Bad JSON' }; }

  const id = String(payload.order_id || '');
  console.log('TAMARA WEBHOOK', payload.event_type, id, payload.order_reference_id);
  if (!UUID.test(id)) return { statusCode: 200, body: 'ignored' };

  try {
    const r = await settleFromTamara({ tamaraOrderId: id, orderNumber: /^HK-\d{6,12}$/.test(String(payload.order_reference_id || '')) ? payload.order_reference_id : undefined });
    if (!r.found) return { statusCode: 404, body: 'order not found yet' }; // Tamara retries
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    console.error('tamara settle failed', e.message);
    return { statusCode: 500, body: 'retry' };
  }
};
