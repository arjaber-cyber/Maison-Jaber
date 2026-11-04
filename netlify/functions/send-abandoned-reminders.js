// netlify/functions/send-abandoned-reminders.js
//
// Scheduled hourly (netlify.toml). Sends ONE reminder to shoppers who:
//   - ticked "Email me a link to finish my order" at checkout (consent_at is set),
//   - left 3+ hours ago (but less than 48 hours ago),
//   - have not ordered since (no order of ANY status for that email since they left: paid orders
//     are complete; unpaid / cancelled ones already get their own "payment not completed" email),
//   - have not unsubscribed, and have not had a reminder in the last 30 days.
// Each reminder carries a private, expiring resume link (only its hash is stored) and a signed
// one-click unsubscribe link. A row is "claimed" atomically before sending, so two runs can never
// email the same person twice.
//
// SAFETY SWITCH: emails only go out when the Netlify env var CART_REMINDERS_LIVE = 1.
// Without it the job runs in dry-run mode: it logs how many shoppers WOULD be emailed and changes nothing.

const { sendEmail, SITE_URL } = require('./_email');
const { cartReminder } = require('./_templates');
const R = require('./_recovery');

const HOUR = 36e5;

async function run({ live, now = new Date() } = {}) {
  if (!R.SERVICE_KEY) return { error: 'SUPABASE_SERVICE_ROLE_KEY missing' };
  const from = new Date(now - R.REMINDER_MAX_AGE_HOURS * HOUR).toISOString();
  const to = new Date(now - R.REMINDER_DELAY_HOURS * HOUR).toISOString();

  const cr = await R.sb(`abandoned_carts?completed=eq.false&reminder_sent=eq.false&consent_at=not.is.null&item_count=gt.0`
    + `&last_seen_at=lt.${encodeURIComponent(to)}&last_seen_at=gt.${encodeURIComponent(from)}&select=*&limit=50`);
  if (!cr.ok) return { error: 'read abandoned_carts ' + cr.status };
  const carts = await cr.json();
  if (!carts.length) return { checked: 0, eligible: 0, sent: 0, suppressed: 0 };

  // Orders since the earliest candidate left (minus an hour of slack), compared by lower-cased email.
  const since = new Date(Math.min(...carts.map(c => +new Date(c.last_seen_at))) - HOUR).toISOString();
  const or = await R.sb(`orders?created_at=gte.${encodeURIComponent(since)}&select=email,created_at,payment_status,order_status`);
  if (!or.ok) return { error: 'read orders ' + or.status }; // never email blind
  const orders = await or.json();

  let eligible = 0, sent = 0, suppressed = 0, failed = 0;
  for (const cart of carts) {
    const email = R.normEmail(cart.email);
    const left = +new Date(cart.last_seen_at) - HOUR;
    const ordered = orders.find(o => R.normEmail(o.email) === email && +new Date(o.created_at) >= left);
    let reason = null;
    if (ordered) reason = /^(paid|waived)$/.test(ordered.payment_status) ? 'ordered' : 'order_' + (ordered.order_status === 'cancelled' ? 'cancelled' : 'unpaid');
    else if (!R.validEmail(email)) reason = 'invalid_email';
    else if (await R.isUnsubscribed(email)) reason = 'unsubscribed';

    if (reason) {
      suppressed++;
      if (live) {
        await R.sb(`abandoned_carts?email=eq.${encodeURIComponent(cart.email)}`, {
          method: 'PATCH',
          body: JSON.stringify(reason === 'ordered'
            ? { completed: true, completed_at: now.toISOString(), suppressed_reason: reason }
            : { suppressed_reason: reason, ...(reason === 'unsubscribed' || reason.startsWith('order_') ? { completed: true, completed_at: now.toISOString() } : {}) }),
        });
      }
      continue;
    }
    eligible++;
    if (!live) continue;

    // Claim the row: only one run can flip reminder_sent false -> true.
    const token = R.newToken();
    const claim = await R.sb(`abandoned_carts?email=eq.${encodeURIComponent(cart.email)}&reminder_sent=eq.false&completed=eq.false`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        reminder_sent: true, reminder_sent_at: now.toISOString(),
        resume_token_hash: R.hashToken(token),
        resume_expires_at: new Date(+now + R.RESUME_DAYS * 864e5).toISOString(),
      }),
    });
    const claimed = claim.ok ? await claim.json() : [];
    if (!claimed.length) continue;

    const resumeUrl = `${SITE_URL}cart.html?resume=${encodeURIComponent(token)}&utm_source=hikaya_email&utm_medium=email&utm_campaign=cart_recovery`;
    const unsub = R.unsubscribeUrl(email);
    const mail = cartReminder(claimed[0], { resumeUrl, unsubscribeUrl: unsub });
    const headers = unsub ? { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined;
    const result = await sendEmail({ to: email, subject: mail.subject, html: mail.html, headers });
    if (result.sent) sent++;
    else {
      failed++;
      // Release the claim so the next hourly run can try again.
      await R.sb(`abandoned_carts?email=eq.${encodeURIComponent(cart.email)}`, {
        method: 'PATCH',
        body: JSON.stringify({ reminder_sent: false, reminder_sent_at: null, resume_token_hash: null, resume_expires_at: null }),
      });
    }
  }
  return { checked: carts.length, eligible, sent, suppressed, failed, live: !!live };
}

exports.run = run;
exports.handler = async () => {
  const live = process.env.CART_REMINDERS_LIVE === '1';
  try {
    const r = await run({ live });
    // Counts only: no emails or names in the logs.
    console.log('send-abandoned-reminders', JSON.stringify(r));
    return { statusCode: 200, body: JSON.stringify(r) };
  } catch (err) {
    console.error('send-abandoned-reminders error:', err.message);
    return { statusCode: 200, body: JSON.stringify({ error: 'failed' }) };
  }
};
