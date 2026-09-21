// netlify/functions/paytabs-return.js
//
// PayTabs redirects the payment iframe here once the customer finishes
// (paid, cancelled, or failed). This function's only job is to relay that
// result to the parent checkout page via postMessage, so the UI can react
// right away.
//
// IMPORTANT: this is a convenience signal only, never the source of truth
// for whether payment actually succeeded -- that's paytabs-callback.js,
// which PayTabs calls server-to-server regardless of what the browser
// does. checkout.html re-verifies with check-paytabs-status.js before
// showing a final success state, rather than trusting this message alone.

exports.handler = async (event) => {
  let payload = {};
  try {
    payload = event.httpMethod === 'POST'
      ? (event.headers['content-type']?.includes('application/json') ? JSON.parse(event.body) : Object.fromEntries(new URLSearchParams(event.body)))
      : Object.fromEntries(new URLSearchParams(event.queryStringParameters || {}));
  } catch { /* fall through with empty payload */ }

  const tranRef = payload.tran_ref || '';
  const cartId = payload.cart_id || '';
  const status = payload.payment_result?.response_status || payload.respStatus || '';

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Processing…</title></head>
<body style="font-family:sans-serif; text-align:center; padding-top:80px; color:#7d6a5a;">
  <p>Finishing up…</p>
  <script>
    (function () {
      var msg = { source: 'hikaya-paytabs', tranRef: ${JSON.stringify(tranRef)}, cartId: ${JSON.stringify(cartId)}, status: ${JSON.stringify(status)} };
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
    })();
  </script>
</body></html>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html,
  };
};
