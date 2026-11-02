// netlify/functions/_owner_alert.js
//
// Instant WhatsApp ping to the owner when a new order is confirmed
// (called from sendConfirmation in _ziina.js, which every payment route uses).
//
// Meta WhatsApp Cloud API, "Hikaya Messaging" app, utility template "hikaya_new_order":
//   "New order {{1}} received. Amount: {{2}}. Customer: {{3}}. Books: {{4}}. Open the dashboard to process it."
// Env (Netlify) -- deliberately separate from the customer OTP vars in _whatsapp.js:
//   ALERT_WA_TOKEN      permanent System User token (whatsapp_business_messaging)
//   ALERT_WA_PHONE_ID   sender Phone number ID
//   OWNER_WHATSAPP      owner's number, digits only with country code (e.g. 9715XXXXXXXX)
//   ALERT_WA_TEMPLATE   optional, default "hikaya_new_order"
// Until the token/phone/owner are set this does nothing. Never throws: an alert must not block an order.
// Kept light on customer data (first name + city only).

const GRAPH = 'https://graph.facebook.com/v21.0';

// Template parameters can't contain newlines/tabs or long runs of spaces.
const clean = (s, max = 200) => String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, max) || '-';

async function alertNewOrder(order) {
  const token = process.env.ALERT_WA_TOKEN;
  const phoneId = process.env.ALERT_WA_PHONE_ID;
  const to = String(process.env.OWNER_WHATSAPP || '').replace(/\D/g, '');
  if (!token || !phoneId || !to || !order) return;
  try {
    let items = [];
    try { items = JSON.parse(order.items || '[]'); } catch {}
    const waived = order.payment_status === 'waived';
    const tag = order.order_type && order.order_type !== 'sale' ? ` [${order.order_type}]` : '';
    const first = String(order.full_name || '').trim().split(/\s+/)[0] || 'Customer';
    const amount = waived
      ? `FREE (code ${order.promo_code || '-'})`
      : `AED ${Number(order.charged_aed || order.amount || 0).toFixed(2)} via ${order.payment_method || '-'}${order.promo_code ? ', code ' + order.promo_code : ''}`;
    const books = items.map(i => `${i.story || 'Book'}${i.bookLanguage === 'ar' ? ' (Arabic)' : i.bookLanguage ? ' (English)' : ''}`).join(' + ') || '-';
    const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: process.env.ALERT_WA_TEMPLATE || 'hikaya_new_order',
          language: { code: 'en' },
          components: [{ type: 'body', parameters: [
            clean(`${order.order_number || ''}${tag}`),
            clean(amount),
            clean(`${first}, ${order.city || ''}${order.country ? ' ' + order.country : ''}`),
            clean(books, 500),
          ].map(text => ({ type: 'text', text })) }],
        },
      }),
    });
    if (!res.ok) {
      const err = ((await res.json().catch(() => ({}))).error) || {};
      console.error('owner whatsapp alert failed', res.status, err.code, err.message);
    }
  } catch (e) {
    console.error('owner whatsapp alert error', e && e.message);
  }
}

module.exports = { alertNewOrder };
