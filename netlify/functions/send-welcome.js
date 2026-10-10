// netlify/functions/send-welcome.js
//
// One-time welcome email after a customer's first sign-in (Google, Facebook
// or email link). Called by test5/welcome.js with the customer's session.
//
// Sent once per account: the account is marked with app_metadata.welcome_sent
// (no extra table needed). Accounts created more than 7 days ago never get it,
// so existing customers are not surprised by a "welcome" long after joining.
//
// Needs SUPABASE_SERVICE_ROLE_KEY (to mark the account) and RESEND_API_KEY.

const { sendEmail } = require('./_email');
const { welcome } = require('./_templates');
const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('./_pricing');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const NEW_ACCOUNT_DAYS = 7;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!service) return json(200, { sent: false, reason: 'not_configured' });

  const auth = event.headers.authorization || event.headers.Authorization || '';
  if (!/^Bearer\s+\S+/.test(auth)) return json(401, { error: 'Not signed in.' });
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}
  const lang = body.lang === 'ar' ? 'ar' : 'en';

  // Who is this? (Verified by Supabase from the customer's own session token.)
  const me = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY } });
  if (!me.ok) return json(401, { error: 'Not signed in.' });
  const user = await me.json();
  if (!user || !user.id || !user.email) return json(400, { error: 'No email on this account.' });

  const meta = user.app_metadata || {};
  if (meta.welcome_sent) return json(200, { sent: false, reason: 'already_sent' });
  const ageDays = (Date.now() - new Date(user.created_at).getTime()) / 86400000;
  const admin = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' };

  // Mark first, so two pages loading at once can't both send it.
  const mark = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT', headers: admin,
    body: JSON.stringify({ app_metadata: { ...meta, welcome_sent: new Date().toISOString() } }),
  });
  if (!mark.ok) { console.error('send-welcome: could not mark account', mark.status, await mark.text().catch(() => '')); return json(200, { sent: false, reason: 'mark_failed' }); }
  if (!(ageDays <= NEW_ACCOUNT_DAYS)) return json(200, { sent: false, reason: 'existing_account' });

  const um = user.user_metadata || {};
  const mail = welcome({ name: um.full_name || um.name || '', lang });
  const r = await sendEmail({ to: user.email, subject: mail.subject, html: mail.html });
  return json(200, { sent: !!r.sent });
};
