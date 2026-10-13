// netlify/functions/crm-unsubscribe.js
//
// Public. The unsubscribe link at the bottom of every CRM campaign email.
//
// GET  ?t=<token>          -> a small branded page with an "Unsubscribe" button. It does NOT
//                             unsubscribe on its own, because inbox link-scanners open links.
// POST ?t=<token>          -> unsubscribes. Used by the button, and by Gmail / Apple Mail's
//                             one-click "Unsubscribe" (List-Unsubscribe-Post header).
// POST ?t=<token>&undo=1   -> "I clicked by mistake" re-subscribes.

const { sb, normEmail } = require('./_crm');
const { C, SITE_URL, CUSTOMER_EMAIL, esc } = require('./_email');

const LOGO = (process.env.EMAIL_ASSET_URL || 'https://maison-jaber.com/email/').replace(/\/?$/, '/') + 'logo.png';
const T = {
  en: {
    title: 'Email preferences', ask: 'Stop receiving Hikaya emails?', askSub: 'We will stop sending you news and offers. Order updates for anything you buy will still arrive.',
    btn: 'Unsubscribe', done: "You're unsubscribed", doneSub: 'You will not receive any more news or offers from us. Order emails for future purchases will still arrive.',
    undo: 'I clicked by mistake: keep me subscribed', back: 'Back to Hikaya', again: "You're subscribed again", againSub: 'Thank you for staying with us. We write rarely and keep it short.',
    bad: 'This link is not valid', badSub: `It may be old or incomplete. Reply to any of our emails or write to ${CUSTOMER_EMAIL} and we will remove you straight away.`,
    test: 'This is a test email', testSub: 'Unsubscribe links work in real campaign emails. Nothing was changed.',
  },
  ar: {
    title: 'تفضيلات البريد', ask: 'إيقاف رسائل حكاية؟', askSub: 'سنتوقف عن إرسال الأخبار والعروض، وستظل تصلك رسائل الطلبات عند الشراء',
    btn: 'إلغاء الاشتراك', done: 'تم إلغاء اشتراكك', doneSub: 'لن تصلك أخبار أو عروض منّا بعد الآن، وستظل تصلك رسائل الطلبات عند الشراء',
    undo: 'ضغطت بالخطأ، أبقني مشتركًا', back: 'العودة إلى حكاية', again: 'عدت مشتركًا', againSub: 'شكرًا لبقائك معنا، نراسلك نادرًا وباختصار',
    bad: 'هذا الرابط غير صالح', badSub: `ربما يكون قديمًا أو ناقصًا، ردّ على أي رسالة منّا أو راسلنا على ${CUSTOMER_EMAIL} وسنحذفك فورًا`,
    test: 'هذه رسالة تجريبية', testSub: 'روابط إلغاء الاشتراك تعمل في الرسائل الحقيقية، ولم يتغير شيء',
  },
};

function page(lang, state, token) {
  const t = T[lang === 'ar' ? 'ar' : 'en'];
  const ar = lang === 'ar';
  const font = ar ? "Cairo,Tahoma,Arial,sans-serif" : "Manrope,'Helvetica Neue',Arial,sans-serif";
  const serif = ar ? "Amiri,Tahoma,serif" : "'Cormorant Garamond',Georgia,serif";
  const q = `?t=${encodeURIComponent(token || '')}&lang=${ar ? 'ar' : 'en'}`;
  const btn = (label, action, ghost) => `<form method="post" action="${q}${action}" style="margin:0;"><button type="submit" style="width:100%; padding:14px 22px; border-radius:100px; border:1.5px solid ${C.brand}; background:${ghost ? 'transparent' : C.brand}; color:${ghost ? C.brand : C.white}; font:700 15px ${font}; cursor:pointer;">${label}</button></form>`;
  const body = {
    ask: [t.ask, t.askSub, btn(t.btn, '')],
    done: [t.done, t.doneSub, btn(t.undo, '&undo=1', true)],
    again: [t.again, t.againSub, ''],
    bad: [t.bad, t.badSub, ''],
    test: [t.test, t.testSub, ''],
  }[state];
  return `<!doctype html><html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${t.title} · Hikaya</title><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;700&family=Amiri:wght@700&family=Cairo:wght@400;700&display=swap" rel="stylesheet"></head>
<body style="margin:0; min-height:100vh; background:${C.ivory}; display:flex; align-items:center; justify-content:center; padding:24px 16px; box-sizing:border-box; font-family:${font}; color:${C.ink};">
<main style="width:100%; max-width:440px; background:${C.white}; border:1px solid ${C.taupe}; border-radius:18px; padding:32px 28px; text-align:center;">
<a href="${SITE_URL}"><img src="${LOGO}" alt="Hikaya by Maison Jaber" width="110" style="width:110px; height:auto; display:inline-block; margin-bottom:18px;"></a>
<h1 style="margin:0 0 10px; font-family:${serif}; font-weight:${ar ? 700 : 600}; font-size:${ar ? 26 : 30}px; line-height:1.25;">${body[0]}</h1>
<p style="margin:0 0 22px; font-size:15px; line-height:1.65; color:${C.soft};">${esc(body[1])}</p>
${body[2]}
<p style="margin:20px 0 0;"><a href="${SITE_URL}" style="color:${C.brand}; font-weight:700; font-size:14px; text-decoration:none;">${t.back}</a></p>
</main></body></html>`;
}
const html = (code, s) => ({ statusCode: code, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }, body: s });

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const token = String(q.t || '');
  if (token === 'test') return html(200, page(q.lang, 'test', token));
  if (!/^[0-9a-f-]{36}$/i.test(token)) return html(400, page(q.lang, 'bad', token));

  let contact;
  try { [contact] = await sb(`crm_contacts?unsubscribe_token=eq.${token}&select=email,lang,marketing_status`); } catch (e) { console.error('unsubscribe lookup', e); }
  if (!contact) return html(404, page(q.lang, 'bad', token));
  const lang = q.lang === 'ar' || q.lang === 'en' ? q.lang : (contact.lang || 'en');

  if (event.httpMethod === 'GET') return html(200, page(lang, contact.marketing_status === 'unsubscribed' ? 'done' : 'ask', token));
  if (event.httpMethod !== 'POST') return html(405, page(lang, 'bad', token));

  const undo = q.undo === '1';
  const now = new Date().toISOString();
  try {
    await sb(`crm_contacts?unsubscribe_token=eq.${token}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      marketing_status: undo ? 'subscribed' : 'unsubscribed', status_source: undo ? 'resubscribed via email link' : 'unsubscribe link', status_changed_at: now, updated_at: now,
    }) });
    if (!undo) await sb(`newsletter_subscribers?email=eq.${encodeURIComponent(normEmail(contact.email))}`, { method: 'DELETE' }).catch(() => {});
  } catch (e) {
    console.error('unsubscribe update failed', e);
    return html(500, page(lang, 'bad', token));
  }
  // One-click unsubscribe from the inbox expects a plain 200; a browser form gets the page.
  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
  if (/List-Unsubscribe=One-Click/i.test(raw)) return { statusCode: 200, headers: { 'Content-Type': 'text/plain' }, body: 'Unsubscribed' };
  return html(200, page(lang, undo ? 'again' : 'done', token));
};
