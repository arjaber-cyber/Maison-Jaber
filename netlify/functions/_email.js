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

function resendKey() {
  const rawKey = process.env.RESEND_API_KEY || '';
  /* Keys pasted via notes/chat apps can pick up smart quotes or spaces; strip anything that can't be in a key. */
  const apiKey = rawKey.replace(/[^\x21-\x7E]/g, '').replace(/^['"`]+|['"`]+$/g, '');
  if (rawKey && apiKey !== rawKey) {
    const odd = [...rawKey].map((c, i) => (c.charCodeAt(0) < 0x21 || c.charCodeAt(0) > 0x7E) ? `${i}:U+${c.charCodeAt(0).toString(16)}` : null).filter(Boolean);
    console.warn(`[email] RESEND_API_KEY had unexpected characters (raw length ${rawKey.length}, cleaned ${apiKey.length}, starts "${apiKey.slice(0, 3)}", odd chars at ${odd.join(', ')}). Re-paste it in Netlify.`);
  }
  return apiKey;
}
const fromAddress = () => process.env.EMAIL_FROM || `Hikaya by Maison Jaber <${CUSTOMER_EMAIL}>`;

/* Marketing mail (CRM campaigns): up to 100 emails in one Resend call.
   list: [{ to, subject, html, text?, headers? }]. Resolves to one result per email, in order. */
async function sendBatch(list) {
  const apiKey = resendKey();
  if (!apiKey) return list.map(() => ({ sent: false, reason: 'not_configured' }));
  const from = process.env.MARKETING_EMAIL_FROM || fromAddress();
  try {
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(list.map(m => ({ from, to: m.to, subject: m.subject, html: m.html, text: m.text || htmlToText(m.html), reply_to: CUSTOMER_EMAIL, headers: m.headers || undefined }))),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error('[email] Resend batch error:', res.status, body);
      let msg = body; try { msg = JSON.parse(body).message || body; } catch {}
      return list.map(() => ({ sent: false, reason: 'api_error', detail: String(msg).slice(0, 300), status: res.status }));
    }
    let ids = []; try { ids = (JSON.parse(body).data || []).map(d => d.id); } catch {}
    return list.map((m, i) => ({ sent: true, id: ids[i] || null }));
  } catch (err) {
    console.error('[email] batch send failed:', err);
    return list.map(() => ({ sent: false, reason: 'network_error', detail: 'Could not reach the email service.' }));
  }
}

async function sendEmail({ to, subject, html, text, replyTo, headers }) {
  const apiKey = resendKey();
  const from = fromAddress();

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
      body: JSON.stringify({ from, to, subject, html, text: text || htmlToText(html), reply_to: replyTo || CUSTOMER_EMAIL, headers: headers || undefined }),
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

/* ---------- Template building blocks ----------
   Same design system as the website (test5/hikaya.css): ivory background, brand-brown
   buttons, Cormorant Garamond headings, Manrope body, Caveat accents, dark-brown footer.
   Inline styles only, because email clients ignore stylesheets. Web fonts load in Apple
   Mail / iOS; Gmail and Outlook fall back to Georgia and Arial. */
const ASSETS = (process.env.EMAIL_ASSET_URL || 'https://maison-jaber.com/email/').replace(/\/?$/, '/');
const C = {
  ivory: '#F7F1E8', sand: '#EEE4D6', card: '#F3EADF', white: '#FFFCF7',
  ink: '#261C17', soft: '#5E4A3D', brand: '#8A5638', brandDark: '#573624',
  taupe: '#D8C5B3', gold: '#C7A56C', footText: '#E6D6C2', footSoft: '#D2BCA2', footHead: '#FFF8EE',
  mute: '#7A6555',
};
const SERIF = { en: "'Cormorant Garamond',Georgia,'Times New Roman',serif", ar: "Amiri,'Traditional Arabic',Tahoma,serif" };
const SANS = { en: "Manrope,'Helvetica Neue',Arial,sans-serif", ar: "Cairo,Tahoma,'Segoe UI',Arial,sans-serif" };
const HAND = { en: "Caveat,'Segoe Print','Bradley Hand',cursive", ar: "Amiri,Tahoma,serif" };
const L = lang => (lang === 'ar' ? 'ar' : 'en');

const ui = {
  eyebrow(text, lang) { return `<p style="margin:0 0 10px; font-family:${SANS[L(lang)]}; font-size:11.5px; font-weight:700; letter-spacing:${lang === 'ar' ? '0' : '.14em'}; text-transform:uppercase; color:${C.brand};">${text}</p>`; },
  h(text, lang) { return `<h1 style="margin:0 0 14px; font-family:${SERIF[L(lang)]}; font-size:${lang === 'ar' ? 26 : 32}px; line-height:${lang === 'ar' ? 1.45 : 1.12}; font-weight:${lang === 'ar' ? 700 : 600}; color:${C.ink}; letter-spacing:${lang === 'ar' ? '0' : '-.01em'};">${text}</h1>`; },
  h3(text, lang) { return `<h3 style="margin:0 0 4px; font-family:${SERIF[L(lang)]}; font-size:${lang === 'ar' ? 18 : 21}px; line-height:1.25; font-weight:${lang === 'ar' ? 700 : 600}; color:${C.ink};">${text}</h3>`; },
  p(text, lang, small) { return `<p style="margin:0 0 14px; font-family:${SANS[L(lang)]}; font-size:${small ? 13.5 : 15.5}px; line-height:1.65; color:${small ? C.mute : C.soft};">${text}</p>`; },
  hand(text, lang) { return `<p style="margin:4px 0 6px; font-family:${HAND[L(lang)]}; font-size:${lang === 'ar' ? 20 : 27}px; line-height:1.1; color:${C.brand};">${text}</p>`; },
  box(inner) { return `<div style="background:${C.card}; border-radius:14px; padding:16px 18px; margin:0 0 14px;">${inner}</div>`; },
  /* A story line with its square cover, like the cart on the website. */
  storyCard(title, meta, cover, lang) {
    const img = cover ? `<td width="76" style="width:76px; vertical-align:top; padding-${lang === 'ar' ? 'left' : 'right'}:14px;"><img src="${esc(cover)}" width="76" height="76" alt="" style="display:block; width:76px; height:76px; border-radius:10px; object-fit:cover; border:0;"></td>` : '';
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.card}; border-radius:14px; margin:0 0 12px;"><tr><td style="padding:14px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${img}<td style="vertical-align:middle;">${ui.h3(title, lang)}<p style="margin:0; font-family:${SANS[L(lang)]}; font-size:13.5px; line-height:1.5; color:${C.soft};">${meta}</p></td></tr></table></td></tr></table>`;
  },
  button(href, label, lang) {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 22px;"><tr><td style="background:${C.brand}; border-radius:28px;"><a href="${esc(href)}" style="display:inline-block; padding:15px 30px; font-family:${SANS[L(lang)]}; font-size:15px; font-weight:700; line-height:20px; color:${C.white}; text-decoration:none; border-radius:28px;">${label}</a></td></tr></table>`;
  },
  row(label, value, lang) {
    return `<tr><td style="padding:9px 0; border-bottom:1px solid ${C.sand}; font-family:${SANS[L(lang)]}; font-size:13.5px; color:${C.mute}; vertical-align:top; width:40%;">${label}</td><td style="padding:9px 0; border-bottom:1px solid ${C.sand}; font-family:${SANS[L(lang)]}; font-size:14.5px; line-height:1.5; color:${C.ink}; font-weight:700; vertical-align:top;">${value}</td></tr>`;
  },
  rows(list, lang) { return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;">${list.map(([l, v]) => ui.row(l, v, lang)).join('')}</table>`; },
  sign(lang) {
    return ui.hand(lang === 'ar' ? 'قصص صغيرة، ذكريات كبيرة' : 'Little stories. Big memories.', lang)
      + ui.p(lang === 'ar' ? 'مع الحب، فريق حكاية' : 'With love, the Hikaya team', lang, true);
  },
};

// Shared branded wrapper so every email looks like the website.
// emailShell(bodyHtml)                      -- English, no preheader (older callers)
// emailShell(bodyHtml, { lang, preheader }) -- lang 'ar' switches to right-to-left
function emailShell(bodyHtml, opts) {
  const o = opts || {};
  const lang = L(o.lang);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const align = lang === 'ar' ? 'right' : 'left';
  const T = (en, ar) => (lang === 'ar' ? ar : en);
  const pre = o.preheader ? `<div data-preheader style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${C.ivory}; opacity:0;">${esc(o.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>` : '';
  const help = T(
    `Need help? Reply to this email, or message us on <a href="https://wa.me/${WHATSAPP}" style="color:${C.brand}; font-weight:700;">WhatsApp</a> at <span style="white-space:nowrap;">${WHATSAPP_DISPLAY}</span>. A real person in the UAE will answer.`,
    `تحتاج مساعدة؟ ردّ على هذا البريد، أو راسلنا على <a href="https://wa.me/${WHATSAPP}" style="color:${C.brand}; font-weight:700;">واتساب</a> <span dir="ltr" style="white-space:nowrap; unicode-bidi:isolate;">&#8294;${WHATSAPP_DISPLAY}&#8297;</span>، وسيردّ عليك شخص من فريقنا في الإمارات`);
  const link = (href, text) => `<a href="${href}" style="color:${C.footText}; text-decoration:none;">${text}</a>`;
  const sep = `<span style="color:${C.footSoft};">&nbsp;&middot;&nbsp;</span>`;
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;600;700&family=Caveat:wght@500&family=Amiri:wght@700&family=Cairo:wght@400;700&display=swap" rel="stylesheet">
<style>a{color:${C.brand};} @media (max-width:520px){ .hk-pad{padding-left:22px !important; padding-right:22px !important;} }</style></head>
<body style="margin:0; padding:0; background:${C.ivory}; -webkit-text-size-adjust:100%;">${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ivory};"><tr><td align="center" style="padding:28px 12px 36px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="max-width:560px; text-align:${align};">
    <tr><td style="background:${C.brandDark}; border-radius:14px 14px 0 0; padding:9px 20px; text-align:center; font-family:${SANS[lang]}; font-size:12px; color:#F2E6D6;">${T('Personalised hardcover storybooks &middot; Gift-boxed &middot; UAE &amp; GCC', 'كتب قصص مخصّصة بغلاف مقوّى &middot; في علبة هدية &middot; الإمارات والخليج')}</td></tr>
    <tr><td style="background:${C.white}; border-left:1px solid ${C.taupe}; border-right:1px solid ${C.taupe}; border-bottom:1px solid ${C.sand}; padding:22px 20px 18px; text-align:center;">
      <a href="${SITE_URL}" style="text-decoration:none;"><img src="${ASSETS}logo.png" width="132" height="103" alt="Hikaya by Maison Jaber" style="display:inline-block; width:132px; height:auto; border:0;"></a>
    </td></tr>
    <tr><td class="hk-pad" style="background:${C.white}; border-left:1px solid ${C.taupe}; border-right:1px solid ${C.taupe}; padding:32px 36px 8px; color:${C.ink};">
      ${bodyHtml}
    </td></tr>
    <tr><td class="hk-pad" style="background:${C.white}; border-left:1px solid ${C.taupe}; border-right:1px solid ${C.taupe}; padding:4px 36px 28px;">
      <p style="margin:0; padding-top:18px; border-top:1px solid ${C.sand}; font-family:${SANS[lang]}; font-size:13px; line-height:1.65; color:${C.mute};">${help}</p>
    </td></tr>
    <tr><td style="background:${C.brandDark}; border-radius:0 0 14px 14px; padding:28px 24px 24px; text-align:center;">
      <a href="${SITE_URL}" style="text-decoration:none;"><img src="${ASSETS}logo-cream.png" width="104" height="81" alt="Hikaya by Maison Jaber" style="display:inline-block; width:104px; height:auto; border:0;"></a>
      <p style="margin:14px auto 16px; max-width:360px; font-family:${SANS[lang]}; font-size:12.5px; line-height:1.6; color:${C.footSoft};">${T('Personalised hardcover storybooks, made for one child at a time and delivered gift-boxed across the UAE and GCC.', 'كتب قصص مخصّصة بغلاف مقوّى، تُصنع لكل طفل على حدة وتصل في علبة هدية إلى الإمارات ودول الخليج')}</p>
      <p style="margin:0 0 14px; font-family:${SANS[lang]}; font-size:13px; font-weight:700;">${link(SITE_URL + 'stories.html', T('Stories', 'القصص'))}${sep}${link(SITE_URL + 'track-order.html', T('Track your order', 'تتبّع طلبك'))}${sep}${link(SITE_URL + 'help.html', T('Help', 'المساعدة'))}</p>
      <p style="margin:0; font-family:${SANS.en}; font-size:11px; line-height:1.6; color:${C.footSoft};">Maison Jaber FZ-LLC &middot; United Arab Emirates<br>${link('mailto:' + CUSTOMER_EMAIL, CUSTOMER_EMAIL)}</p>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

module.exports = { sendEmail, sendBatch, emailShell, htmlToText, ui, esc, etaDays, C, SERIF, SANS, HAND, OWNER_INBOX, CUSTOMER_EMAIL, SITE_URL, WHATSAPP, WHATSAPP_DISPLAY };
