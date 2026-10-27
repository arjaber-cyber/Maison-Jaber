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

module.exports = { enabled, sendOtp };
