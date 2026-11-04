// netlify/functions/email-unsubscribe.js
//
// Signed unsubscribe link from Hikaya reminder / promotional emails:
//   GET  ?e=<email>&s=<signature>  -> small confirmation page with one button (link scanners can't unsubscribe anyone)
//   POST ?e=<email>&s=<signature>  -> adds the address to email_unsubscribes (also the RFC 8058 one-click
//                                     "List-Unsubscribe-Post" that Gmail / Apple Mail send)
// Order emails (confirmation, shipping, delivery) are transactional and are not affected.

const R = require('./_recovery');

const page = (title, msg, form) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<style>body{margin:0;background:#F3EADF;font-family:Manrope,Arial,sans-serif;color:#261C17}main{max-width:440px;margin:48px auto;padding:28px 24px;background:#FFFCF7;border:1px solid #EEE4D6;border-radius:16px;text-align:center}
img{width:112px;height:auto}h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:24px;margin:14px 0 8px}p{color:#5E4A3D;font-size:14.5px;line-height:1.6;margin:0 0 10px}
p[dir=rtl]{font-family:Cairo,Tahoma,Arial,sans-serif}button{margin-top:10px;background:#573624;color:#FFFCF7;border:0;border-radius:24px;padding:11px 24px;font:700 14px Manrope,Arial,sans-serif;cursor:pointer}a{color:#8A5638}</style></head>
<body><main><img src="https://maison-jaber.com/email/logo.png" alt="Hikaya by Maison Jaber"><h1>${title}</h1>${msg}${form || ''}<p style="margin-top:16px;font-size:12.5px"><a href="https://maison-jaber.com/hikaya/">maison-jaber.com/hikaya</a></p></main></body></html>`;

const html = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }, body });

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const email = R.normEmail(q.e);
  if (!R.validEmail(email) || !R.verifyEmailSig(email, q.s)) {
    return html(400, page('Link not valid', '<p>This unsubscribe link is incomplete. Reply to any Hikaya email and we will remove you straight away.</p><p dir="rtl">رابط إلغاء الاشتراك غير مكتمل، ردّ على أي بريد من حكاية وسنزيلك فورًا</p>'));
  }
  if (event.httpMethod === 'GET') {
    const action = `?e=${encodeURIComponent(email)}&amp;s=${encodeURIComponent(q.s)}`;
    return html(200, page('Unsubscribe', '<p>Stop reminder and offer emails from Hikaya? Emails about orders you place will still arrive.</p><p dir="rtl">إيقاف رسائل التذكير والعروض من حكاية؟ ستصلك رسائل طلباتك كالمعتاد</p>',
      `<form method="post" action="${action}"><button type="submit">Unsubscribe &middot; إلغاء الاشتراك</button></form>`));
  }
  if (event.httpMethod !== 'POST') return html(405, page('Not allowed', ''));
  try {
    const r = await R.sb('email_unsubscribes?on_conflict=email', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ email, scope: 'marketing', source: 'email_link' }),
    });
    if (!r.ok) throw new Error('insert ' + r.status);
    // Stop any pending reminder for this address too.
    await R.sb(`abandoned_carts?email=eq.${encodeURIComponent(email)}`, { method: 'PATCH', body: JSON.stringify({ consent_at: null, suppressed_reason: 'unsubscribed' }) });
    await R.sb(`newsletter_subscribers?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE' });
    return html(200, page("You're unsubscribed", '<p>We won\'t send you reminders or offers again. Order emails will still reach you.</p><p dir="rtl">لن نرسل لك تذكيرات أو عروضًا بعد الآن، وستصلك رسائل طلباتك كالمعتاد</p>'));
  } catch (err) {
    console.error('email-unsubscribe error:', err.message);
    return html(500, page('Something went wrong', '<p>Please try again, or reply to the email and we will remove you by hand.</p><p dir="rtl">يرجى المحاولة مرة أخرى، أو الرد على البريد وسنزيلك يدويًا</p>'));
  }
};
