// netlify/functions/tabby-register-webhook.js
//
// ONE-TIME setup (run again after switching from test to live keys, since
// Tabby keeps test and live webhooks separately): tells Tabby where to send
// payment updates. Admin-only (same ADMIN_PASSWORD as the admin panel). Uses
// the keys stored in Netlify, so nothing secret is typed anywhere.
//
// Open tabby-setup.html, enter the admin password, done.
// Env: TABBY_SECRET_KEY, TABBY_MERCHANT_CODE, TABBY_WEBHOOK_SECRET, ADMIN_PASSWORD

const { isAdminRequest } = require('./_admin-check');
const { tabby, secretKey, merchantCode, isTestKey } = require('./_tabby');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!isAdminRequest(event)) return json(401, { error: 'Wrong admin password.' });
  if (!secretKey()) return json(400, { error: 'TABBY_SECRET_KEY is not set in Netlify.' });
  const secret = String(process.env.TABBY_WEBHOOK_SECRET || '');
  if (secret.length < 16) return json(400, { error: 'Set TABBY_WEBHOOK_SECRET in Netlify first (any random text, 16+ characters).' });

  const host = event.headers['x-forwarded-host'] || event.headers.host;
  const url = `https://${host}/.netlify/functions/tabby-webhook`;
  const headers = { 'X-Merchant-Code': merchantCode() };
  const body = { url, header: { title: 'X-Auth-Key', value: secret } };

  try {
    // Already registered for this URL? Update it instead of adding a duplicate (Tabby allows 4 max).
    const list = await tabby('/api/v1/webhooks', { headers });
    const existing = list.ok && Array.isArray(list.data) ? list.data.find(w => w && w.url === url) : null;
    const res = existing
      ? await tabby(`/api/v1/webhooks/${encodeURIComponent(existing.id)}`, { method: 'PUT', headers, body: { id: existing.id, ...body } })
      : await tabby('/api/v1/webhooks', { method: 'POST', headers, body });
    if (!res.ok) return json(502, { error: 'Tabby rejected the webhook setup.', status: res.status, detail: res.data });
    return json(200, { ok: true, webhookUrl: url, updated: !!existing, mode: isTestKey() ? 'test' : 'live' });
  } catch (e) {
    return json(500, { error: 'Could not reach Tabby.' });
  }
};
