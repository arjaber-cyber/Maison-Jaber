// netlify/functions/_email.js
//
// Shared email-sending helper and branded template pieces, used by every
// customer and team email (order confirmation, shipping/delivered updates,
// abandoned-cart reminder, contact form, discount codes). Uses Resend
// (https://resend.com).
//
// SETUP (one-time):
//   1. Create a free Resend account and verify the maison-jaber.com domain.
//   2. In Netlify: Site settings > Environment variables, add:
//        RESEND_API_KEY = <your Resend API key>
//        EMAIL_FROM     = Hikaya by Maison Jaber <hello@maison-jaber.com>   (optional, this is the default)
//        CONTACT_INBOX_EMAIL = info@maison-jaber.com                        (optional, this is the default)
//        SITE_URL       = https://maison-jaber.com/                         (optional; set at launch when the redesign leaves /test5/)
//   3. Redeploy. Until RESEND_API_KEY is set, sendEmail() logs a warning
//      and returns without sending -- so nothing crashes, it just quietly
//      doesn't send until it's configured.

/* Mailboxes (Zoho): hello@ is the customer-facing address, info@ receives the business alerts. */
const CUSTOMER_EMAIL = 'hello@maison-jaber.com';
const OWNER_INBOX = process.env.CONTACT_INBOX_EMAIL || 'info@maison-jaber.com';
/* Where the live shop pages are. The redesign lives under /test5/ until launch. */
const SITE_URL = (process.env.SITE_URL || 'https://maison-jaber.com/test5/').replace(/\/?$/, '/');
const WHATSAPP = '971508011769';
const WHATSAPP_DISPLAY = '+971 50 801 1769';

/* Delivery estimate (working days) by checkout country -- matches the website and FAQ. */
const ETA_DAYS = { UAE: 5, Saudi: 5, Qatar: 7, Kuwait: 7, Bahrain: 7, Oman: 7 };
const etaDays = country => ETA_DAYS[country] || 7;

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Plain-text version of an HTML email (better inbox placement, and readable on any client). */
function htmlToText(html) {
  return String(html || '')
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<div data-preheader[\s\S]*?<\/div>/i, '')
    .replace(/<\/td>\s*<td[^>]*>/gi, ': ')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, txt) => {
      const t = txt.replace(/<[^>]+>/g, '').trim();
      return href.startsWith('mailto:') || t === href ? t : `${t} (${href})`;
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|li|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&zwnj;/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&rarr;/g, '→').replace(/&larr;/g, '←').replace(/&middot;/g, '·').replace(/&copy;/g, '©').replace(/&#10022;/g, '✦')
    .replace(/^[ \t]+/gm, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function sendEmail({ to, subject, html, text, replyTo }) {
  const rawKey = process.env.RESEND_API_KEY || '';
  /* Keys pasted via notes/chat apps can pick up smart quotes or spaces; strip anything that can't be in a key. */
  const apiKey = rawKey.replace(/[^\x21-\x7E]/g, '').replace(/^['"`]+|['"`]+$/g, '');
  if (rawKey && apiKey !== rawKey) {
    const odd = [...rawKey].map((c, i) => (c.charCodeAt(0) < 0x21 || c.charCodeAt(0) > 0x7E) ? `${i}:U+${c.charCodeAt(0).toString(16)}` : null).filter(Boolean);
    console.warn(`[email] RESEND_API_KEY had unexpected characters (raw length ${rawKey.length}, cleaned ${apiKey.length}, starts "${apiKey.slice(0, 3)}", odd chars at ${odd.join(', ')}). Re-paste it in Netlify.`);
  }
  const from = process.env.EMAIL_FROM || `Hikaya by Maison Jaber <${CUSTOMER_EMAIL}>`;

  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set -- skipping email to ${to} ("${subject}"). Add it in Netlify env vars to enable sending.`);
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html, text: text || htmlToText(html), reply_to: replyTo || CUSTOMER_EMAIL }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[email] Resend API error:', errText);
      return { sent: false, reason: 'api_error', detail: errText };
    }
    return { sent: true };
  } catch (err) {
    console.error('[email] send failed:', err);
    return { sent: false, reason: 'network_error' };
  }
}

/* ---------- Template building blocks (inline styles only: email clients ignore stylesheets) ---------- */
const C = { ink: '#2E2018', soft: '#5b4a3d', mute: '#7d6a5a', gold: '#C8954D', cream: '#F8F2E8', sand: '#F3E8D8', brown: '#8A5638' };
const FONT_AR = "Tahoma,'Segoe UI',Arial,sans-serif";
const font = lang => (lang === 'ar' ? FONT_AR : 'Georgia,serif');
const bodyFont = lang => (lang === 'ar' ? FONT_AR : "'Helvetica Neue',Arial,sans-serif");

const ui = {
  h(text, lang) { return `<h2 style="font-family:${font(lang)}; font-size:21px; line-height:1.35; margin:0 0 14px; color:${C.ink}; font-weight:normal;">${text}</h2>`; },
  p(text, lang, small) { return `<p style="font-family:${bodyFont(lang)}; font-size:${small ? 13 : 15}px; line-height:1.65; color:${small ? C.mute : C.soft}; margin:0 0 14px;">${text}</p>`; },
  box(inner) { return `<div style="background:${C.sand}; border-radius:12px; padding:16px 18px; margin:6px 0 18px;">${inner}</div>`; },
  button(href, label, lang) {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;"><tr><td style="background:${C.ink}; border-radius:100px;"><a href="${esc(href)}" style="display:inline-block; padding:13px 28px; font-family:${bodyFont(lang)}; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none;">${label}</a></td></tr></table>`;
  },
  row(label, value, lang) {
    return `<tr><td style="padding:5px 0; font-family:${bodyFont(lang)}; font-size:13px; color:${C.mute}; vertical-align:top; width:42%;">${label}</td><td style="padding:5px 0; font-family:${bodyFont(lang)}; font-size:14px; color:${C.ink}; font-weight:bold; vertical-align:top;">${value}</td></tr>`;
  },
  rows(list, lang) { return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${list.map(([l, v]) => ui.row(l, v, lang)).join('')}</table>`; },
  sign(lang) { return ui.p(lang === 'ar' ? 'مع الحب،<br>فريق حكاية من ميزون جابر' : 'With love,<br>The Hikaya team at Maison Jaber', lang); },
};

// Shared branded wrapper so every email looks consistent.
// emailShell(bodyHtml)                      -- English, no preheader (older callers)
// emailShell(bodyHtml, { lang, preheader }) -- lang 'ar' switches to right-to-left
function emailShell(bodyHtml, opts) {
  const o = opts || {};
  const lang = o.lang === 'ar' ? 'ar' : 'en';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const align = lang === 'ar' ? 'right' : 'left';
  const pre = o.preheader ? `<div data-preheader style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${C.cream}; opacity:0;">${esc(o.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>` : '';
  const help = lang === 'ar'
    ? `هل تحتاج مساعدة؟ ردّ على هذا البريد، أو راسلنا على <a href="https://wa.me/${WHATSAPP}" style="color:${C.brown};">واتساب</a> <span dir="ltr">${WHATSAPP_DISPLAY}</span>`
    : `Need help? Just reply to this email, or message us on <a href="https://wa.me/${WHATSAPP}" style="color:${C.brown};">WhatsApp</a> (${WHATSAPP_DISPLAY}).`;
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
  <body style="margin:0; padding:0; background:${C.cream};">${pre}
  <div dir="${dir}" style="background:${C.cream}; padding:32px 14px; text-align:${align};">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden;">
      <div style="background:${C.ink}; padding:24px; text-align:center;">
        <a href="${SITE_URL}" style="text-decoration:none;">
          <span style="color:${C.gold}; font-size:22px;">&#10022;</span>
          <div style="color:${C.cream}; font-size:24px; font-family:Georgia,serif; margin-top:4px;">Hikaya</div>
          <div style="color:#B69675; font-size:11px; letter-spacing:1px; text-transform:uppercase; margin-top:2px; font-family:Georgia,serif;">by Maison Jaber</div>
        </a>
      </div>
      <div style="padding:30px 26px 14px; color:${C.ink};">
        ${bodyHtml}
      </div>
      <div style="padding:0 26px 22px;">
        <p style="font-family:${bodyFont(lang)}; font-size:12.5px; line-height:1.6; color:${C.mute}; margin:0; border-top:1px solid ${C.sand}; padding-top:16px;">${help}</p>
      </div>
      <div style="padding:16px 24px; background:${C.sand}; text-align:center; font-family:${bodyFont('en')}; font-size:11px; line-height:1.6; color:${C.mute};">
        Hikaya by Maison Jaber &middot; Maison Jaber FZ-LLC, United Arab Emirates<br>
        <a href="${SITE_URL}" style="color:${C.mute};">maison-jaber.com</a> &middot; <a href="mailto:${CUSTOMER_EMAIL}" style="color:${C.mute};">${CUSTOMER_EMAIL}</a>
      </div>
    </div>
  </div></body></html>`;
}

module.exports = { sendEmail, emailShell, htmlToText, ui, esc, etaDays, OWNER_INBOX, CUSTOMER_EMAIL, SITE_URL, WHATSAPP, WHATSAPP_DISPLAY };
