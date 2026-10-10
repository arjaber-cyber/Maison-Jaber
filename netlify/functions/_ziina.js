// netlify/functions/_ziina.js
//
// Shared by ziina-webhook.js (Ziina's server-to-server confirmation) and
// ziina-order-status.js (the customer's return to checkout). Whichever runs
// first marks the order; the other sees it's already done, so the
// confirmation email is sent exactly once.

const { sendEmail, emailShell, OWNER_INBOX } = require('./_email');
const { SUPABASE_URL, SUPABASE_KEY } = require('./_pricing');

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

async function getOrderByPaymentId(pi) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?ziina_payment_id=eq.${encodeURIComponent(pi)}&select=*`, { headers: H });
  if (!res.ok) throw new Error('order lookup failed ' + res.status);
  const rows = await res.json();
  return rows[0] || null;
}

async function fetchZiinaIntent(pi) {
  const res = await fetch(`https://api-v2.ziina.com/api/payment_intent/${encodeURIComponent(pi)}`, {
    headers: { Authorization: `Bearer ${process.env.ZIINA_API_KEY}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('ziina lookup failed ' + res.status);
  return data;
}

// Conditional update: only flips an order that is still awaiting payment,
// so two callers racing can't both "win" and double-send the email.
async function transition(orderId, fromStatus, patch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&payment_status=eq.${fromStatus}`, {
    method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('order update failed ' + res.status);
  const rows = await res.json();
  return rows[0] || null; // null = someone else already moved it
}

// Ziina is the source of truth: we re-read the payment from Ziina before
// trusting any status, and check the amount matches what we asked for.
async function settleFromZiina(pi) {
  const order = await getOrderByPaymentId(pi);
  if (!order) return { found: false };
  if (order.payment_status === 'paid') return { found: true, paid: true, order };

  const intent = await fetchZiinaIntent(pi);
  const expectedFils = Math.round(Number(order.charged_aed) * 100);
  if (intent.status === 'completed') {
    if (Number(intent.amount) !== expectedFils || (intent.currency_code || 'AED') !== 'AED') {
      console.error('Ziina amount mismatch', pi, intent.amount, expectedFils);
      await transition(order.id, 'awaiting_payment', { payment_status: 'amount_mismatch', status_updated_at: new Date().toISOString() });
      return { found: true, paid: false, status: 'review', order };
    }
    const updated = await transition(order.id, 'awaiting_payment', {
      payment_status: 'paid', order_status: 'received', status_updated_at: new Date().toISOString(),
    });
    if (updated) await sendConfirmation(updated).catch(e => console.error('confirmation email failed', e));
    return { found: true, paid: true, order: updated || order };
  }
  if (intent.status === 'failed' || intent.status === 'canceled') {
    await transition(order.id, 'awaiting_payment', { payment_status: intent.status, status_updated_at: new Date().toISOString() });
    return { found: true, paid: false, status: intent.status, order };
  }
  return { found: true, paid: false, status: intent.status || 'pending', order };
}

async function sendConfirmation(order) {
  let items = [];
  try { items = JSON.parse(order.items || '[]'); } catch {}
  const list = items.map(i => `<li>${esc(i.story)}${i.childName ? ' for ' + esc(i.childName) : ''}</li>`).join('');
  const first = esc(String(order.full_name || '').split(' ')[0] || 'there');
  const localLine = order.currency && order.currency !== 'AED' ? ` (${order.amount} ${order.currency})` : '';
  await sendEmail({
    to: order.email,
    subject: `Your Hikaya order is confirmed — ${order.order_number}`,
    html: emailShell(`
      <h2 style="font-family:Georgia,serif; font-size:20px; margin:0 0 12px;">Thank you, ${first}!</h2>
      <p style="font-size:14px; line-height:1.6; color:#5b4a3d;">Your payment went through and their story is officially on its way:</p>
      <ul style="font-size:14px; line-height:1.8; color:#5b4a3d; padding-left:18px;">${list}</ul>
      <p style="font-size:14px; line-height:1.6; color:#5b4a3d;">Paid: <strong>AED ${Number(order.charged_aed).toFixed(2)}</strong>${localLine}. It ships to <strong>${esc(order.address)}, ${esc(order.city)}</strong>, in about 5–7 working days.</p>
      <div style="background:#F3E8D8; border-radius:10px; padding:14px 16px; margin:18px 0; font-size:13px;"><strong>Order reference:</strong> ${esc(order.order_number)}</div>
      <p style="font-size:13px; color:#7d6a5a;">Questions? Just reply to this email.</p>`),
  });
  /* New-order alert for the team (info@). */
  const books = items.map(i => `<li>${esc(i.story)}${i.childName ? ' for ' + esc(i.childName) : ''}${i.bookLanguage ? ' (' + (i.bookLanguage === 'ar' ? 'Arabic' : 'English') + ' book)' : ''}</li>`).join('');
  await sendEmail({
    to: OWNER_INBOX,
    replyTo: order.email,
    subject: `New paid order ${order.order_number} · AED ${Number(order.charged_aed).toFixed(2)}`,
    html: emailShell(`
      <h2 style="font-family:Georgia,serif; font-size:20px; margin:0 0 12px;">New order: ${esc(order.order_number)}</h2>
      <p style="font-size:14px; color:#5b4a3d;"><strong>${esc(order.full_name)}</strong> · ${esc(order.email)}${order.phone ? ' · ' + esc(order.phone) : ''}<br>${esc(order.address)}, ${esc(order.city)}${order.country ? ', ' + esc(order.country) : ''}</p>
      <ul style="font-size:14px; line-height:1.8; color:#5b4a3d; padding-left:18px;">${books}</ul>
      <p style="font-size:14px; color:#5b4a3d;">Paid: <strong>AED ${Number(order.charged_aed).toFixed(2)}</strong>${localLine}${order.is_gift ? ' · Gift' : ''}</p>
      <p><a href="https://maison-jaber.com/test5/admin.html" style="color:#8A5638; font-weight:700;">Open the dashboard →</a></p>`),
  });
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

module.exports = { settleFromZiina, getOrderByPaymentId, transition };
