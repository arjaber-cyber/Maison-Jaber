// netlify/functions/ziina-status.js
//
// GET ?pi=<payment intent id> -> { status, amount, currency }
// Lets the result page show the REAL status from Ziina instead of trusting
// whichever URL the browser landed on.
// Env: ZIINA_API_KEY

exports.handler = async (event) => {
  const pi = (event.queryStringParameters || {}).pi || '';
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(pi)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid payment id.' }) };
  }
  try {
    const res = await fetch(`https://api-v2.ziina.com/api/payment_intent/${pi}`, {
      headers: { Authorization: `Bearer ${process.env.ZIINA_API_KEY}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { statusCode: 502, body: JSON.stringify({ error: 'Ziina lookup failed.', status: res.status }) };
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        status: data.status,
        amount: data.amount,
        currency: data.currency_code,
        error: data.latest_error ? data.latest_error.message : null,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not reach Ziina.' }) };
  }
};
