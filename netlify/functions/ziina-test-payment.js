// netlify/functions/ziina-test-payment.js
//
// TEMPORARY test endpoint: creates a fixed 2 AED Ziina payment so we can
// check the integration end-to-end before wiring Ziina into checkout.html.
// Amount is fixed server-side, so nobody can change it from the browser.
//
// POST { mode: "test" | "live" }
//   test -> Ziina sandbox, any card works, no money moves
//   live -> real 2 AED charge
//
// Env: ZIINA_API_KEY

const AMOUNT_FILS = 200; // 2 AED (Ziina minimum)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  if (!process.env.ZIINA_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ZIINA_API_KEY is not set in Netlify.' }) };
  }

  let mode = 'test';
  try { mode = JSON.parse(event.body || '{}').mode === 'live' ? 'live' : 'test'; } catch {}

  // Build return URLs from the host actually serving this request, so it
  // also works on deploy previews, not just production.
  const host = event.headers['x-forwarded-host'] || event.headers.host;
  const origin = `https://${host}`;
  const ref = 'TEST-' + Date.now();

  // Auto-connect the webhook (idempotent: Ziina just overwrites it with the
  // same URL), so there's no separate setup step. Failure here doesn't block
  // the payment test.
  try {
    await fetch('https://api-v2.ziina.com/api/webhook', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.ZIINA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${origin}/.netlify/functions/ziina-webhook`, secret: process.env.ZIINA_WEBHOOK_SECRET }),
    });
  } catch (e) { console.warn('Webhook auto-register failed', e); }

  try {
    const res = await fetch('https://api-v2.ziina.com/api/payment_intent', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ZIINA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: AMOUNT_FILS,
        currency_code: 'AED',
        message: `Hikaya by Maison Jaber - integration test ${ref}`,
        success_url: `${origin}/ziina-result.html?pi={PAYMENT_INTENT_ID}&r=success`,
        cancel_url: `${origin}/ziina-result.html?pi={PAYMENT_INTENT_ID}&r=cancel`,
        test: mode === 'test',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Ziina create error', res.status, data);
      return { statusCode: 502, body: JSON.stringify({ error: 'Ziina rejected the request.', status: res.status, detail: data }) };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId: data.id,
        embeddedUrl: data.embedded_url || null,
        redirectUrl: data.redirect_url,
        mode,
      }),
    };
  } catch (err) {
    console.error('Ziina create exception', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not reach Ziina.' }) };
  }
};
