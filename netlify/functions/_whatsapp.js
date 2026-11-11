// netlify/functions/_whatsapp.js
//
// Sends Hikaya's one-time verification code from the Hikaya WhatsApp number
// (Meta WhatsApp Cloud API, "authentication" template with a copy-code button).
// Only ever used for verification codes -- never for promotions.
//
// Env (set in Netlify once the Meta setup is done):
//   WHATSAPP_TOKEN            permanent System User access token
//   WHATSAPP_PHONE_NUMBER_ID  the Hikaya number's Phone number ID (WhatsApp Manager > API setup)
//   WHATSAPP_OTP_TEMPLATE     optional, default "hikaya_verify" (approved in EN and AR)
//   WHATSAPP_ALERT_PHONE_NUMBER_ID  sender for owner order alerts (can be the Meta test
//                             number, so alerts work without the Hikaya number on the API;
//                             falls back to WHATSAPP_PHONE_NUMBER_ID; ALERT_WA_PHONE_ID also accepted)
//   ALERT_WA_TOKEN            token for the alert sender (falls back to WHATSAPP_TOKEN). Keeping
//                             alerts on their own token leaves customer verification switched off.
//   OWNER_WHATSAPP            optional, where new-order alerts go (default +971528011773)
//   WHATSAPP_ORDER_TEMPLATE   optional, default "hikaya_new_order" (utility template, EN):
//       "New order {{1}} received. Amount: {{2}}. Customer: {{3}}. Books: {{4}}. Open the dashboard to process it."
//   Order alerts are best effort: if WhatsApp is not set up or the send fails,
//   the order and its emails carry on untouched.
// Until these are set, verification reports itself as "not available yet" and
// the site hides the prompt.

const GRAPH = 'https://graph.facebook.com/v21.0';

const enabled = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

async function sendOtp(phoneE164, code, lang) {
  if (!enabled()) throw Object.assign(new Error('whatsapp not configured'), { reason: 'unavailable' });
  const template = process.env.WHATSAPP_OTP_TEMPLATE || 'hikaya_verify';
  const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phoneE164.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: template,
        language: { code: lang === 'ar' ? 'ar' : 'en' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
        ],
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data && data.error) || {};
    console.error('whatsapp send failed', res.status, err.code, err.message);
    // 131026 / 131030: number not on WhatsApp or can't receive messages.
    const reason = [131026, 131030, 131009].includes(err.code) ? 'not_on_whatsapp' : 'send_failed';
    throw Object.assign(new Error(err.message || 'send failed'), { reason });
  }
  return data;
}

// New-order alert to the owner's personal WhatsApp. Never throws.
const METHOD = { ziina: 'card (Ziina)', tabby: 'Tabby', tamara: 'Tamara', paytabs: 'card (PayTabs)', cod: 'cash on delivery' };
async function sendOrderAlert(order, items) {
  const sender = process.env.WHATSAPP_ALERT_PHONE_NUMBER_ID || process.env.ALERT_WA_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.ALERT_WA_TOKEN || process.env.WHATSAPP_TOKEN;
  if (!token || !sender) return { skipped: 'not_configured' };
  try {
    const to = String(process.env.OWNER_WHATSAPP || '+971528011773').replace(/[^\d]/g, '');
    const template = process.env.WHATSAPP_ORDER_TEMPLATE || 'hikaya_new_order';
    const clean = v => String(v == null ? '' : v).replace(/[\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim().slice(0, 200) || '-';
    const waived = order.payment_status === 'waived';
    const books = (items || []).map(i => `${i.story || 'Book'}${i.childName ? ' for ' + i.childName : ''}${i.bookLanguage ? ' (' + (i.bookLanguage === 'ar' ? 'Arabic' : 'English') + ')' : ''}`).join(', ') || `${(items || []).length} book(s)`;
    const via = METHOD[order.payment_method] || order.payment_method || '';
    const amount = waived ? `FREE (code ${order.promo_code || ''})` : `AED ${Number(order.charged_aed || 0).toFixed(2)}${via ? ' via ' + via : ''}${order.promo_code ? ', code ' + order.promo_code : ''}`;
    const who = `${order.full_name || ''}${order.city ? ', ' + order.city : ''}${order.country ? ', ' + order.country : ''}`;
    const res = await fetch(`${GRAPH}/${sender}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template,
          language: { code: 'en' },
          components: [{ type: 'body', parameters: [clean(order.order_number), clean(amount), clean(who), clean(books)].map(text => ({ type: 'text', text })) }],
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = (data && data.error) || {};
      console.error('whatsapp order alert failed', res.status, err.code, err.message);
      return { sent: false, status: res.status, code: err.code, error: err.message };
    }
    return { sent: true, id: data.messages && data.messages[0] && data.messages[0].id };
  } catch (e) {
    console.error('whatsapp order alert error', e && e.message);
    return { sent: false };
  }
}

// Owner-only shop alerts (Nov 2026): stuck at payment, checkout without an order, add-to-cart summary.
// Template WHATSAPP_OWNER_ALERT_TEMPLATE (default "hikaya_owner_alert", Utility, English):
//   "Hikaya alert: {{1}}  Details: {{2}}  Open the Hikaya dashboard to follow up."
// Only ever messages OWNER_WHATSAPP. Never throws.
async function sendOwnerAlert(title, details) {
  const sender = process.env.WHATSAPP_ALERT_PHONE_NUMBER_ID || process.env.ALERT_WA_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.ALERT_WA_TOKEN || process.env.WHATSAPP_TOKEN;
  if (!token || !sender) return { sent: false, error: 'not_configured' };
  try {
    const to = String(process.env.OWNER_WHATSAPP || '+971528011773').replace(/[^\d]/g, '');
    const template = process.env.WHATSAPP_OWNER_ALERT_TEMPLATE || 'hikaya_owner_alert';
    // Template parameters may not contain new lines, tabs or more than 4 spaces in a row.
    const clean = (v, n) => String(v == null ? '' : v).replace(/[\n\t\r]+/g, ' · ').replace(/ {4,}/g, '   ').trim().slice(0, n) || '-';
    const res = await fetch(`${GRAPH}/${sender}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template,
          language: { code: 'en' },
          components: [{ type: 'body', parameters: [clean(title, 80), clean(details, 900)].map(text => ({ type: 'text', text })) }],
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = (data && data.error) || {};
      console.error('whatsapp owner alert failed', res.status, err.code, err.message);
      return { sent: false, status: res.status, code: err.code, error: err.message };
    }
    return { sent: true, id: data.messages && data.messages[0] && data.messages[0].id };
  } catch (e) {
    console.error('whatsapp owner alert error', e && e.message);
    return { sent: false, error: e && e.message };
  }
}

// Any approved English template to the owner, with plain body parameters. Never throws.
async function sendTemplate(name, params) {
  const sender = process.env.WHATSAPP_ALERT_PHONE_NUMBER_ID || process.env.ALERT_WA_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.ALERT_WA_TOKEN || process.env.WHATSAPP_TOKEN;
  if (!token || !sender) return { sent: false, error: 'not_configured' };
  try {
    const to = String(process.env.OWNER_WHATSAPP || '+971528011773').replace(/[^\d]/g, '');
    const clean = v => String(v == null ? '' : v).replace(/[\n\t\r]+/g, ' ').replace(/ {4,}/g, '   ').trim().slice(0, 300) || '-';
    const res = await fetch(`${GRAPH}/${sender}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template',
        template: { name, language: { code: 'en' }, components: [{ type: 'body', parameters: (params || []).map(p => ({ type: 'text', text: clean(p) })) }] } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const err = (data && data.error) || {}; console.error('whatsapp template send failed', name, res.status, err.code, err.message); return { sent: false, status: res.status, code: err.code, error: err.message }; }
    return { sent: true };
  } catch (e) { console.error('whatsapp template send error', e && e.message); return { sent: false, error: e && e.message }; }
}

module.exports = { enabled, sendOtp, sendOrderAlert, sendOwnerAlert, sendTemplate };
