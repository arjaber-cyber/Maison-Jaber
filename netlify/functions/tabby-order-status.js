// netlify/functions/tabby-order-status.js
//
// GET ?order=HK-xxxx&payment_id=<Tabby payment id>
// Called when the customer comes back from Tabby. Re-checks the payment with
// Tabby itself (never trusts the URL), captures it and marks the order paid
// if it was approved, and tells checkout what to show. Safe to call repeatedly.

const { settleFromTabby, UUID } = require('./_tabby');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const pid = String(q.payment_id || ''); const order = String(q.order || '');
  if (!UUID.test(pid) || !/^HK-\d{6,12}$/.test(order)) return json(400, { error: 'Invalid request.' });
  try {
    const r = await settleFromTabby(pid);
    if (!r.found || (r.order && r.order.order_number !== order)) return json(404, { error: 'Order not found.' });
    return json(200, { paid: !!r.paid, status: r.paid ? 'paid' : (r.status || 'pending'), orderNumber: order });
  } catch (e) {
    console.error('tabby-order-status', e.message);
    return json(502, { error: 'Could not confirm the payment yet.', status: 'pending' });
  }
};
