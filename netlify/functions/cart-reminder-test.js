// netlify/functions/cart-reminder-test.js  (admin only: x-admin-password header)
//
// POST { action: 'dry-run' }          -> what the hourly job would do right now (counts only, nothing sent or changed)
// POST { action: 'send-sample', lang } -> sends a sample reminder (EN or AR) to the owner inbox only, with a
//                                        working resume link to a throw-away test cart, to check delivery,
//                                        look and the resume flow before CART_REMINDERS_LIVE is switched on.

const { isAdminRequest } = require('./_admin-check');
const { sendEmail, OWNER_INBOX, SITE_URL } = require('./_email');
const { cartReminder } = require('./_templates');
const R = require('./_recovery');
const { run } = require('./send-abandoned-reminders');

const json = (c, b) => ({ statusCode: c, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(b) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!isAdminRequest(event)) return json(401, { error: 'Unauthorized' });
  let p = {};
  try { p = JSON.parse(event.body || '{}'); } catch { /* empty */ }

  if (p.action === 'dry-run') return json(200, { ...(await run({ live: false })), live_switch: process.env.CART_REMINDERS_LIVE === '1' });

  if (p.action === 'send-sample') {
    const lang = p.lang === 'ar' ? 'ar' : 'en';
    const email = R.normEmail(OWNER_INBOX);
    const token = R.newToken();
    const snapshot = [{ id: 'item_test_recovery', story: lang === 'ar' ? 'قصة تجريبية' : 'Sample story (test)', slug: null, childName: lang === 'ar' ? 'سارة' : 'Sara', ageEdition: '4-6', bookLanguage: lang, photoPaths: [], dedication: '' }];
    // A test row keyed to the owner inbox: never "consented", so the hourly job ignores it.
    const up = await R.sb('abandoned_carts?on_conflict=email', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ email, child_name: snapshot[0].childName, story: snapshot[0].story, lang, cart_snapshot: snapshot, item_count: 1, completed: false,
        consent_at: null, reminder_sent: true, reminder_sent_at: new Date().toISOString(), resume_token_hash: R.hashToken(token),
        resume_expires_at: new Date(Date.now() + R.RESUME_DAYS * 864e5).toISOString(), last_seen_at: new Date().toISOString(), suppressed_reason: 'owner_test' }),
    });
    if (!up.ok) return json(500, { error: 'could not save test cart', status: up.status });
    const unsub = R.unsubscribeUrl(email);
    const resumeUrl = `${SITE_URL}cart.html?resume=${encodeURIComponent(token)}&utm_source=hikaya_email&utm_medium=email&utm_campaign=cart_recovery_test`;
    const mail = cartReminder({ lang, cart_snapshot: snapshot }, { resumeUrl, unsubscribeUrl: unsub });
    const r = await sendEmail({ to: email, subject: '[TEST] ' + mail.subject, html: mail.html,
      headers: unsub ? { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined });
    return json(200, { sent: !!r.sent, to: email, reason: r.reason || null });
  }
  return json(400, { error: "action must be 'dry-run' or 'send-sample'" });
};
