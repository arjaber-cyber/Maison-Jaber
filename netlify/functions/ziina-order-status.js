// netlify/functions/ziina-order-status.js
//
// GET ?order=HK-xxxx&pi=<payment intent id>
// Called when the customer returns from Ziina. Re-checks the payment with
// Ziina itself (never trusts the URL), marks the order paid if it is, and
// tells checkout what to show. Safe to call repeatedly.

const { settleFromZiina } = require('./_ziina');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const pi = String(q.pi || ''); const order = String(q.order || '');
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(pi) || !/^HK-\d{6,12}$/.test(order)) return json(400, { error: 'Invalid request.' });
  try {
    const r = await settleFromZiina(pi);
    if (!r.found || (r.order && r.order.order_number !== order)) return json(404, { error: 'Order not found.' });
    return json(200, { paid: !!r.paid, status: r.paid ? 'paid' : (r.status || 'pending'), orderNumber: order });
  } catch (e) {
    console.error('ziina-order-status', e.message);
    return json(502, { error: 'Could not confirm the payment yet.', status: 'pending' });
  }
};
