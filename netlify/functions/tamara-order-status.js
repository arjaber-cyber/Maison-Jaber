// netlify/functions/tamara-order-status.js
//
// GET ?order=HK-xxxx
// Called when the customer comes back from Tamara. Re-checks the order with
// Tamara itself (never trusts the URL), authorises it and marks our order paid
// if Tamara approved it, and tells checkout what to show. Safe to call repeatedly.

const { settleFromTamara } = require('./_tamara');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const order = String(q.order || '');
  if (!/^HK-\d{6,12}$/.test(order)) return json(400, { error: 'Invalid request.' });
  try {
    const r = await settleFromTamara({ orderNumber: order });
    if (!r.found || (r.order && r.order.order_number !== order)) return json(404, { error: 'Order not found.' });
    return json(200, { paid: !!r.paid, status: r.paid ? 'paid' : (r.status || 'pending'), orderNumber: order });
  } catch (e) {
    console.error('tamara-order-status', e.message);
    return json(502, { error: 'Could not confirm the payment yet.', status: 'pending' });
  }
};
