// netlify/functions/tamara-register-webhook.js
//
// ONE-TIME setup (run again after switching from sandbox to live keys, since
// Tamara keeps them separately): tells Tamara to send order updates to
// /.netlify/functions/tamara-webhook. Admin-only (same ADMIN_PASSWORD as the
// admin panel). Uses the token stored in Netlify, so nothing secret is typed.
// Alternative: add the same URL and events in the Tamara Partners Portal.
//
// Open tamara-setup.html, enter the admin password, done.
// Env: TAMARA_API_TOKEN, TAMARA_API_URL, ADMIN_PASSWORD

const { isAdminRequest } = require('./_admin-check');
const { tamara, apiToken, isSandbox } = require('./_tamara');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// Every status change Tamara's onboarding email asks us to subscribe to.
const EVENTS = ['order_approved', 'order_authorised', 'order_captured', 'order_canceled', 'order_refunded', 'order_expired', 'order_declined'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!isAdminRequest(event)) return json(401, { error: 'Wrong admin password.' });
  if (!apiToken()) return json(400, { error: 'TAMARA_API_TOKEN is not set in Netlify.' });

  const host = event.headers['x-forwarded-host'] || event.headers.host;
  const url = `https://${host}/.netlify/functions/tamara-webhook`;
  try {
    const res = await tamara('/webhooks', { method: 'POST', body: { type: 'order', events: EVENTS, url, headers: {} } });
    const already = !res.ok && /exist|duplicate|already/i.test(JSON.stringify(res.data || {}));
    if (!res.ok && !already) return json(502, { error: 'Tamara rejected the webhook setup.', status: res.status, detail: res.data });
    return json(200, { ok: true, webhookUrl: url, events: EVENTS, alreadyRegistered: already, webhookId: res.data && res.data.webhook_id, mode: isSandbox() ? 'sandbox' : 'live' });
  } catch (e) {
    return json(500, { error: 'Could not reach Tamara.' });
  }
};
