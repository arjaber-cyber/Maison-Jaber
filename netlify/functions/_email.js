// netlify/functions/_email.js
//
// Shared email-sending helper, used by both order confirmations and the
// abandoned-cart reminder. Uses Resend (https://resend.com) -- a simple,
// modern email API with a generous free tier, well suited for a small
// business sending transactional email.
//
// SETUP (one-time):
//   1. Create a free Resend account, verify your sending domain (or use
//      their shared test domain while developing).
//   2. In Netlify: Site settings > Environment variables, add:
//        RESEND_API_KEY = <your Resend API key>
//        EMAIL_FROM     = Hikaya by Maison Jaber <hello@maison-jaber.com>
//   3. Redeploy. Until RESEND_API_KEY is set, sendEmail() logs a warning
//      and returns without sending -- so nothing crashes, it just quietly
//      doesn't send until it's configured.

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Hikaya by Maison Jaber <onboarding@resend.dev>';

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
      body: JSON.stringify({ from, to, subject, html }),
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

// Shared branded wrapper so every email looks consistent without repeating
// the same HTML boilerplate everywhere.
function emailShell(bodyHtml) {
  return `
  <div style="background:#F8F2E8; padding:32px 16px; font-family:Georgia,serif;">
    <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden;">
      <div style="background:#2E2018; padding:24px; text-align:center;">
        <span style="color:#C8954D; font-size:22px;">&#10022;</span>
        <div style="color:#F8F2E8; font-size:22px; font-family:Georgia,serif; margin-top:4px;">Hikaya</div>
        <div style="color:#B69675; font-size:11px; letter-spacing:1px; text-transform:uppercase; margin-top:2px;">by Maison Jaber</div>
      </div>
      <div style="padding:28px 24px; color:#2E2018;">
        ${bodyHtml}
      </div>
      <div style="padding:16px 24px; background:#F3E8D8; text-align:center; font-size:11px; color:#7d6a5a;">
        &copy; 2026 Maison Jaber. All rights reserved.
      </div>
    </div>
  </div>`;
}

module.exports = { sendEmail, emailShell };
