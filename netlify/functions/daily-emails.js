// netlify/functions/daily-emails.js
//
// Runs once a day (schedule in netlify.toml, 08:00 UAE time):
//   1. Feedback request to customers whose book was delivered 5+ days ago
//      (once per order, tracked in orders.review_requested_at). Customers who
//      reply get their 10% thank-you code from the dashboard.
//   2. A "needs attention" summary to the team inbox (info@): late orders,
//      unpaid orders and new contact messages.
//
// Needs SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY.

const { sendEmail, OWNER_INBOX, SITE_URL } = require('./_email');
const { reviewRequest, teamDigest } = require('./_templates');
const { SUPABASE_URL } = require('./_pricing');
const { normalizeStage } = require('./_stages');

const REVIEW_AFTER_DAYS = 5;
const REVIEW_MAX_AGE_DAYS = 30; // never ask about books delivered long ago
const SLA = { received: 1, ai_production: 2, printing: 4, back_from_printing: 1, with_courier: 7 }; // same targets as the dashboard
const LABEL = { received: 'Received', ai_production: 'AI production', printing: 'At the printer', back_from_printing: 'Back from printing', with_courier: 'With delivery company' };
const DAY = 86400000;

exports.handler = async () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return { statusCode: 200, body: 'SUPABASE_SERVICE_ROLE_KEY not set, nothing to do.' };
  const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const get = async path => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H }); if (!r.ok) throw new Error(path.split('?')[0] + ' ' + r.status); return r.json(); };
  const now = Date.now();
  const enteredAt = o => {
    const st = normalizeStage(o.order_status);
    const h = Array.isArray(o.stage_history) ? o.stage_history.filter(x => normalizeStage(x.stage) === st) : [];
    return new Date((h.length && h[h.length - 1].at) || o.status_updated_at || o.created_at).getTime();
  };
  const real = o => !['test'].includes(o.order_type || 'sale');

  let reviewsSent = 0;
  const log = [];

  // ---- 1) Feedback requests ----
  try {
    const delivered = await get(`orders?order_status=eq.delivered&review_requested_at=is.null&select=*&order=status_updated_at.asc&limit=200`);
    for (const o of delivered) {
      if (!o.email || !real(o) || o.payment_status === 'refunded') continue;
      const age = (now - enteredAt(o)) / DAY;
      if (age < REVIEW_AFTER_DAYS) continue;
      const stamp = new Date().toISOString();
      // Mark first (only if still unmarked), so a retry can never email twice.
      const m = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${o.id}&review_requested_at=is.null`, { method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ review_requested_at: stamp }) });
      const rows = await m.json().catch(() => []);
      if (!m.ok || !rows.length) continue;
      if (age > REVIEW_MAX_AGE_DAYS) continue; // old order: marked, not emailed
      const mail = reviewRequest(o);
      const r = await sendEmail({ to: o.email, subject: mail.subject, html: mail.html });
      if (r.sent) reviewsSent++;
      else await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${o.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ review_requested_at: null }) }); // try again tomorrow
      if (reviewsSent >= 50) break;
    }
  } catch (e) { log.push('reviews: ' + e.message); console.error('daily-emails reviews', e); }

  // ---- 2) Team digest ----
  try {
    const active = await get(`orders?order_status=not.in.(delivered,cancelled)&select=order_number,full_name,email,order_status,status_updated_at,created_at,stage_history,payment_status,order_type&limit=1000`);
    const late = active
      .filter(o => real(o) && ['paid', 'waived', 'pending_cod'].includes(o.payment_status))
      .map(o => { const st = normalizeStage(o.order_status); const days = Math.floor((now - enteredAt(o)) / DAY); return { ...o, st, days, sla: SLA[st] }; })
      .filter(o => o.sla && o.days > o.sla)
      .map(o => ({ ...o, stageLabel: LABEL[o.st] || o.st }))
      .sort((a, b) => (b.days - b.sla) - (a.days - a.sla));
    const since3 = new Date(now - 3 * DAY).toISOString();
    const unpaid = (await get(`orders?payment_status=in.(awaiting_payment,failed,canceled,payment_start_failed,amount_mismatch)&created_at=gte.${since3}&select=order_number,full_name,email,payment_status,order_type&order=created_at.desc&limit=50`)).filter(real);
    const since1 = new Date(now - DAY).toISOString();
    let messages = [];
    try { messages = await get(`contact_messages?created_at=gte.${since1}&select=name,email,order_number,message&order=created_at.desc&limit=50`); } catch {}
    const mail = teamDigest({ late, unpaid, messages, reviewsSent, adminUrl: `${SITE_URL}admin.html` });
    await sendEmail({ to: OWNER_INBOX, subject: mail.subject, html: mail.html });
  } catch (e) { log.push('digest: ' + e.message); console.error('daily-emails digest', e); }

  return { statusCode: 200, body: `Feedback emails sent: ${reviewsSent}.${log.length ? ' Problems: ' + log.join('; ') : ''}` };
};
