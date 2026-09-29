// netlify/functions/ziina-register-webhook.js
//
// ONE-TIME setup: tells Ziina where to send payment events. Admin-only
// (same ADMIN_PASSWORD as the admin panel). Uses the API key from Netlify,
// so the key never has to be typed anywhere.
//
// Open ziina-setup.html once, enter the admin password, done.
// Env: ZIINA_API_KEY, ZIINA_WEBHOOK_SECRET, ADMIN_PASSWORD

const { isAdminRequest } = require('./_admin-check');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  if (!isAdminRequest(event)) return { statusCode: 401, body: JSON.stringify({ error: 'Wrong admin password.' }) };

  const host = event.headers['x-forwarded-host'] || event.headers.host;
  const url = `https://${host}/.netlify/functions/ziina-webhook`;

  try {
    const res = await fetch('https://api-v2.ziina.com/api/webhook', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ZIINA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, secret: process.env.ZIINA_WEBHOOK_SECRET }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Ziina rejected the webhook setup.', status: res.status, detail: data }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, webhookUrl: url }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not reach Ziina.' }) };
  }
};
