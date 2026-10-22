// netlify/functions/_tabby.js
//
// Shared Tabby (Pay in 4) helpers, used by create-tabby-payment.js,
// tabby-order-status.js (customer back on checkout) and tabby-webhook.js
// (Tabby's server-to-server update). Same idea as _ziina.js: Tabby is the
// source of truth, so every caller re-reads the payment from Tabby with our
// secret key before trusting it, and whichever caller gets there first marks
// the order paid (the conditional update stops a double confirmation email).
//
// Flow (docs.tabby.ai, custom integration):
//   session created -> customer approves on Tabby -> payment AUTHORIZED
//   -> we check the amount and CAPTURE the full amount -> payment CLOSED
//   -> order paid. REJECTED / EXPIRED -> order not paid, cart stays.
//
// Env: TABBY_SECRET_KEY (sk_test_... = sandbox, sk_... = live),
//      TABBY_MERCHANT_CODE (defaults to MJAE), SUPABASE_SERVICE_ROLE_KEY

const { sendEmail } = require('./_email');
const { paymentNotCompleted } = require('./_templates');
const { SUPABASE_URL, SUPABASE_KEY, settleDiscount } = require('./_pricing');
const { transition, sendConfirmation } = require('./_ziina');

const TABBY_API = 'https://api.tabby.ai'; // UAE store (KSA would be api.tabby.sa)
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

const secretKey = () => String(process.env.TABBY_SECRET_KEY || '').trim();
const merchantCode = () => String(process.env.TABBY_MERCHANT_CODE || 'MJAE').trim();
const isTestKey = () => secretKey().startsWith('sk_test_');
const money = n => (Math.round(Number(n) * 100) / 100).toFixed(2);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function tabby(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(TABBY_API + path, {
    method,
    headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/json', ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function getOrderByNumber(orderNumber) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}&select=*`, { headers: H });
  if (!res.ok) throw new Error('order lookup failed ' + res.status);
  const rows = await res.json();
  return rows[0] || null;
}

function appendNote(order, line) {
  return [order.admin_notes, line].filter(Boolean).join('\n').slice(0, 4000);
}

// Re-reads the payment from Tabby and moves the matching order on.
// Returns { found, paid, status, order }.
async function settleFromTabby(paymentId) {
  if (!UUID.test(String(paymentId || ''))) return { found: false };
  const p = await tabby(`/api/v2/payments/${encodeURIComponent(paymentId)}`);
  if (p.status === 404) return { found: false };
  if (!p.ok) throw new Error('tabby lookup failed ' + p.status);
  const pay = p.data || {};

  const ref = pay.order && pay.order.reference_id;
  if (!ref) return { found: false };
  const order = await getOrderByNumber(ref);
  if (!order || order.payment_method !== 'tabby') return { found: false };
  if (order.payment_status === 'paid') return { found: true, paid: true, order };

  const status = String(pay.status || '').toUpperCase();
  const now = new Date().toISOString();

  if (status === 'AUTHORIZED' || status === 'CLOSED') {
    // The approved amount must be exactly what we priced on the server.
    if (Math.abs(Number(pay.amount) - Number(order.charged_aed)) > 0.005 || String(pay.currency || '').toUpperCase() !== 'AED') {
      console.error('Tabby amount mismatch', paymentId, pay.amount, pay.currency, order.charged_aed);
      await transition(order.id, 'awaiting_payment', { payment_status: 'amount_mismatch', status_updated_at: now, admin_notes: appendNote(order, `Tabby payment ${paymentId}: amount ${pay.amount} ${pay.currency} does not match the order. Not captured, check in Tabby.`) });
      return { found: true, paid: false, status: 'review', order };
    }

    // Capture the full amount (idempotent: the same reference_id never captures twice).
    if (status === 'AUTHORIZED') {
      const cap = await tabby(`/api/v2/payments/${encodeURIComponent(paymentId)}/captures`, {
        method: 'POST',
        body: { amount: money(pay.amount), reference_id: `capture-${order.order_number}` },
      });
      const capStatus = String((cap.data && cap.data.status) || '').toUpperCase();
      if (!cap.ok || capStatus !== 'CLOSED') {
        // 409 = Tabby is busy with this payment (e.g. the webhook and the
        // customer's return arrived together). Either way, try again later.
        console.warn('Tabby capture not done yet', paymentId, cap.status, JSON.stringify(cap.data).slice(0, 300));
        return { found: true, paid: false, status: 'pending', order };
      }
    }

    const patch = {
      payment_status: 'paid', order_status: 'received', status_updated_at: now,
      admin_notes: appendNote(order, `Tabby payment ${paymentId} captured${pay.is_test ? ' (TEST, no real money)' : ''}.`),
    };
    // Sandbox payments are not real sales: keep them out of revenue.
    if (pay.is_test) { patch.order_type = 'test'; patch.order_type_note = 'Tabby sandbox test payment (no real money)'; }
    const updated = await transition(order.id, 'awaiting_payment', patch);
    if (updated) {
      if (updated.promo_code) await settleDiscount(updated.id, true);
      await sendConfirmation(updated).catch(e => console.error('confirmation email failed', e));
    }
    return { found: true, paid: true, order: updated || order };
  }

  if (status === 'REJECTED' || status === 'EXPIRED') {
    const ourStatus = status === 'REJECTED' ? 'failed' : 'canceled';
    const moved = await transition(order.id, 'awaiting_payment', {
      payment_status: ourStatus, status_updated_at: now,
      admin_notes: appendNote(order, `Tabby payment ${paymentId}: ${status.toLowerCase()}.`),
    });
    if (moved && moved.promo_code) await settleDiscount(moved.id, false);
    if (moved && moved.email) {
      const m = paymentNotCompleted(moved);
      await sendEmail({ to: moved.email, subject: m.subject, html: m.html }).catch(e => console.error('payment-not-completed email failed', e));
    }
    return { found: true, paid: false, status: ourStatus, order };
  }

  return { found: true, paid: false, status: 'pending', order }; // CREATED: not finished yet
}

module.exports = { tabby, settleFromTabby, getOrderByNumber, secretKey, merchantCode, isTestKey, money, UUID, appendNote };
