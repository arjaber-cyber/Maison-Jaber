// netlify/functions/_tamara.js
//
// Shared Tamara (pay later / instalments) helpers, used by
// create-tamara-payment.js, tamara-order-status.js (customer back on checkout),
// tamara-webhook.js (Tamara's server-to-server update), tamara-sweep.js,
// tamara-admin.js (capture / cancel / refund) and update-order.js (capture
// when the book is handed to the delivery company).
//
// Same idea as _tabby.js: Tamara is the source of truth, so every caller
// re-reads the order from Tamara with our API token before trusting it, and
// whichever caller gets there first marks our order paid (the conditional
// update in transition() stops a double confirmation email).
//
// Flow (docs.tamara.co, Direct Online Checkout):
//   checkout session -> customer approves on Tamara -> status "approved"
//   -> we AUTHORISE it -> "authorised" = paid for us (order goes to production)
//   -> when the book is handed to the courier we CAPTURE it -> "fully_captured"
//   -> Tamara settles the money to us. Not captured within 21 days = Tamara
//   auto-captures. Before capture an order can still be CANCELLED (no charge);
//   after capture it can only be REFUNDED (always through Tamara, never store credit).
//   declined / expired / canceled -> not paid, cart stays.
//
// Env: TAMARA_API_TOKEN (merchant API token, JWT), TAMARA_NOTIFICATION_TOKEN
//      (verifies webhooks), TAMARA_API_URL (defaults to the sandbox),
//      SUPABASE_SERVICE_ROLE_KEY

const crypto = require('crypto');
const { sendEmail } = require('./_email');
const { paymentNotCompleted } = require('./_templates');
const { SUPABASE_URL, SUPABASE_KEY, settleDiscount } = require('./_pricing');
const { transition, sendConfirmation } = require('./_ziina');

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

const apiToken = () => String(process.env.TAMARA_API_TOKEN || '').trim();
const notificationToken = () => String(process.env.TAMARA_NOTIFICATION_TOKEN || '').trim();
const apiBase = () => String(process.env.TAMARA_API_URL || 'https://api-sandbox.tamara.co').trim().replace(/\/$/, '');
const isSandbox = () => /sandbox/i.test(apiBase());
const round2 = n => Math.round(Number(n) * 100) / 100;
const aed = n => ({ amount: round2(n), currency: 'AED' }); // Tamara money object: decimal major units
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function tamara(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(apiBase() + path, {
    method, signal,
    headers: { Authorization: `Bearer ${apiToken()}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => '');
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 500) }; }
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
async function addNote(order, line) {
  await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ admin_notes: appendNote(order, line) }),
  }).catch(() => null);
}

// The Tamara order id lives in the order's admin notes ("Tamara order <uuid>").
const tamaraIdOf = order => {
  const m = /Tamara order ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(String((order && order.admin_notes) || ''));
  return m ? m[1] : null;
};

// Tamara's amount fields come back as { amount, currency }; be lenient about the shape.
const amountOf = v => (v && typeof v === 'object' ? Number(v.amount) : Number(v));
const currencyOf = (v, fallback = 'AED') => (v && typeof v === 'object' && v.currency ? String(v.currency).toUpperCase() : fallback);

async function getTamaraOrder(tamaraOrderId) {
  if (!UUID.test(String(tamaraOrderId || ''))) return null;
  const r = await tamara(`/merchants/orders/${encodeURIComponent(tamaraOrderId)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('tamara lookup failed ' + r.status);
  return r.data || {};
}

const PAID_STATUSES = ['authorised', 'partially_captured', 'fully_captured', 'partially_refunded', 'fully_refunded'];

// Re-reads the order from Tamara and moves our order on. Accepts either our
// order number or Tamara's order id. Returns { found, paid, status, order }.
async function settleFromTamara({ orderNumber, tamaraOrderId } = {}) {
  let order = orderNumber ? await getOrderByNumber(orderNumber) : null;
  let tid = tamaraOrderId || tamaraIdOf(order);
  let t = tid ? await getTamaraOrder(tid) : null;
  if (!t) return { found: false };
  if (!order) {
    const ref = t.order_reference_id;
    order = ref ? await getOrderByNumber(ref) : null;
  }
  if (!order || order.payment_method !== 'tamara') return { found: false };
  if (t.order_reference_id && t.order_reference_id !== order.order_number) return { found: false };
  if (order.payment_status === 'paid') return { found: true, paid: true, order, tamaraStatus: t.status };

  let status = String(t.status || '').toLowerCase();
  const now = new Date().toISOString();

  if (status === 'approved' || PAID_STATUSES.includes(status)) {
    // The approved amount must be exactly what we priced on the server.
    const amt = amountOf(t.total_amount);
    if (Math.abs(amt - Number(order.charged_aed)) > 0.005 || currencyOf(t.total_amount) !== 'AED') {
      console.error('Tamara amount mismatch', tid, amt, currencyOf(t.total_amount), order.charged_aed);
      await transition(order.id, 'awaiting_payment', { payment_status: 'amount_mismatch', status_updated_at: now, admin_notes: appendNote(order, `Tamara order ${tid}: amount ${amt} ${currencyOf(t.total_amount)} does not match the order. Not authorised, check in the Tamara partner portal.`) });
      return { found: true, paid: false, status: 'review', order };
    }

    // Approved -> authorise (idempotent on Tamara's side: an authorised order stays authorised).
    if (status === 'approved') {
      const a = await tamara(`/orders/${encodeURIComponent(tid)}/authorise`, { method: 'POST' });
      const aStatus = String((a.data && a.data.status) || '').toLowerCase();
      if (!a.ok || !PAID_STATUSES.includes(aStatus)) {
        // 409 / 400 can mean "already authorised" (webhook and customer return arriving together): re-read.
        const again = await getTamaraOrder(tid).catch(() => null);
        const s2 = String((again && again.status) || '').toLowerCase();
        if (!PAID_STATUSES.includes(s2)) {
          console.warn('Tamara authorise not done yet', tid, a.status, JSON.stringify(a.data).slice(0, 300));
          return { found: true, paid: false, status: 'pending', order };
        }
        status = s2;
      } else status = aStatus;
    }

    const patch = {
      payment_status: 'paid', order_status: 'received', status_updated_at: now,
      admin_notes: appendNote(order, `Tamara order ${tid} authorised${isSandbox() ? ' (SANDBOX, no real money)' : ''}. Captured automatically when handed to the delivery company.`),
    };
    // Sandbox payments are not real sales: keep them out of revenue.
    if (isSandbox()) { patch.order_type = 'test'; patch.order_type_note = 'Tamara sandbox test payment (no real money)'; }
    const updated = await transition(order.id, 'awaiting_payment', patch);
    if (updated) {
      if (updated.promo_code) await settleDiscount(updated.id, true);
      await sendConfirmation(updated).catch(e => console.error('confirmation email failed', e));
    }
    return { found: true, paid: true, order: updated || order, tamaraStatus: status };
  }

  if (status === 'declined' || status === 'expired' || status === 'canceled') {
    const ourStatus = status === 'declined' ? 'failed' : 'canceled';
    const moved = await transition(order.id, 'awaiting_payment', {
      payment_status: ourStatus, status_updated_at: now,
      admin_notes: appendNote(order, `Tamara order ${tid}: ${status}.`),
    });
    if (moved && moved.promo_code) await settleDiscount(moved.id, false);
    if (moved && moved.email) {
      const m = paymentNotCompleted(moved);
      await sendEmail({ to: moved.email, subject: m.subject, html: m.html }).catch(e => console.error('payment-not-completed email failed', e));
    }
    return { found: true, paid: false, status: ourStatus, order };
  }

  return { found: true, paid: false, status: 'pending', order }; // new: customer hasn't finished yet
}

// Capture the full authorised amount (called when the book goes to the courier,
// or from the admin panel). Safe to repeat: an already captured order is a no-op.
async function captureTamara(order, { courier, trackingNumber } = {}) {
  const tid = tamaraIdOf(order);
  if (!tid) return { ok: false, error: 'No Tamara order id on this order.' };
  const t = await getTamaraOrder(tid);
  if (!t) return { ok: false, error: 'Tamara does not know this order.' };
  const s = String(t.status || '').toLowerCase();
  if (s === 'fully_captured' || s === 'partially_refunded' || s === 'fully_refunded') return { ok: true, already: true, status: s };
  if (s !== 'authorised' && s !== 'partially_captured') return { ok: false, error: `Tamara order is "${s}", it can't be captured.` };
  const left = round2(amountOf(t.total_amount) - amountOf(t.captured_amount || 0) - amountOf(t.canceled_amount || 0));
  const r = await tamara('/payments/capture', {
    method: 'POST',
    body: {
      order_id: tid,
      total_amount: aed(left > 0 ? left : amountOf(t.total_amount)),
      shipping_info: {
        shipped_at: new Date().toISOString(),
        shipping_company: String(courier || order.courier || 'Local courier').slice(0, 80),
        ...(trackingNumber || order.tracking_number ? { tracking_number: String(trackingNumber || order.tracking_number).slice(0, 120) } : {}),
      },
    },
  });
  if (!r.ok) {
    console.error('tamara capture failed', tid, r.status, JSON.stringify(r.data).slice(0, 300));
    return { ok: false, error: `Tamara did not accept the capture (${r.status}).`, detail: r.data };
  }
  await addNote(order, `Tamara capture AED ${round2(left).toFixed(2)} done (${new Date().toISOString().slice(0, 10)})${r.data && r.data.capture_id ? ', capture ' + r.data.capture_id : ''}.`);
  return { ok: true, status: (r.data && r.data.status) || 'fully_captured', captured: round2(left) };
}

// Cancel an authorised (not yet captured) order in full: the customer is not charged.
async function cancelTamara(order) {
  const tid = tamaraIdOf(order);
  if (!tid) return { ok: false, error: 'No Tamara order id on this order.' };
  const t = await getTamaraOrder(tid);
  if (!t) return { ok: false, error: 'Tamara does not know this order.' };
  const s = String(t.status || '').toLowerCase();
  if (s === 'canceled') return { ok: true, already: true };
  if (s !== 'authorised') return { ok: false, error: s.includes('captured') ? 'Already captured: use "Refund via Tamara" instead.' : `Tamara order is "${s}", it can't be cancelled.` };
  const r = await tamara(`/orders/${encodeURIComponent(tid)}/cancel`, { method: 'POST', body: { total_amount: aed(amountOf(t.total_amount)) } });
  if (!r.ok) {
    console.error('tamara cancel failed', tid, r.status, JSON.stringify(r.data).slice(0, 300));
    return { ok: false, error: `Tamara did not accept the cancellation (${r.status}).`, detail: r.data };
  }
  await addNote(order, `Tamara order cancelled in full (${new Date().toISOString().slice(0, 10)}), customer not charged.`);
  return { ok: true };
}

// Refund whatever is captured and not yet refunded. Unique merchant_refund_id per attempt.
async function refundTamara(order, reason) {
  const tid = tamaraIdOf(order);
  if (!tid) return { ok: false, error: 'No Tamara order id on this order. Refund it from the Tamara partner portal instead.' };
  const t = await getTamaraOrder(tid);
  if (!t) return { ok: false, error: 'Tamara does not know this order.' };
  const s = String(t.status || '').toLowerCase();
  if (s === 'fully_refunded') return { ok: true, already: true, refunded: amountOf(t.refunded_amount) };
  if (s === 'authorised') return { ok: false, notCaptured: true, error: 'Not captured yet, so nothing to refund: use "Cancel via Tamara" instead (the customer is not charged).' };
  const left = round2(amountOf(t.captured_amount || t.total_amount) - amountOf(t.refunded_amount || 0));
  if (!(left > 0)) return { ok: true, already: true, refunded: amountOf(t.refunded_amount) };
  const r = await tamara(`/payments/simplified-refund/${encodeURIComponent(tid)}`, {
    method: 'POST',
    body: { total_amount: aed(left), comment: String(reason || 'Refund issued by Hikaya').slice(0, 200), merchant_refund_id: `refund-${order.order_number}-${Date.now().toString(36)}` },
  });
  if (!r.ok) {
    console.error('tamara refund failed', tid, r.status, JSON.stringify(r.data).slice(0, 300));
    return { ok: false, error: `Tamara did not accept the refund (${r.status}). Try again or refund from the Tamara partner portal.`, detail: r.data };
  }
  await addNote(order, `Tamara refund AED ${left.toFixed(2)} sent (${new Date().toISOString().slice(0, 10)})${r.data && r.data.refund_id ? ', refund ' + r.data.refund_id : ''}.`);
  return { ok: true, refunded: left };
}

// Verifies Tamara's webhook token: a JWT signed HS256 with our notification token.
function verifyTamaraToken(token) {
  const secret = notificationToken();
  if (!secret || !token) return false;
  const parts = String(token).split('.');
  if (parts.length !== 3) return false;
  let header;
  try { header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch { return false; }
  if (!header || header.alg !== 'HS256') return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
  let got;
  try { got = Buffer.from(parts[2], 'base64url'); } catch { return false; }
  if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) return false;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (claims.exp && Number(claims.exp) * 1000 < Date.now() - 5 * 60 * 1000) return false; // allow 5 min clock skew
  } catch { return false; }
  return true;
}

// Tamara wants an international number. Accept the usual UAE ways of typing it.
function uaePhone(raw) {
  let p = String(raw || '').replace(/[\s()-]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (/^05\d{8}$/.test(p)) p = '+971' + p.slice(1);
  if (/^5\d{8}$/.test(p)) p = '+971' + p;
  if (/^971\d{8,9}$/.test(p)) p = '+' + p;
  return p;
}

const UNAVAILABLE = {
  en: 'Tamara is not available for this order. Please choose another payment method.',
  ar: 'تمارا غير متاحة لهذا الطلب، يُرجى اختيار طريقة دفع أخرى',
};
const unavailableMessage = lang => UNAVAILABLE[lang === 'ar' ? 'ar' : 'en'];

module.exports = {
  tamara, apiToken, notificationToken, apiBase, isSandbox, round2, aed, UUID, appendNote, addNote,
  getOrderByNumber, getTamaraOrder, tamaraIdOf, settleFromTamara, captureTamara, cancelTamara, refundTamara,
  verifyTamaraToken, uaePhone, unavailableMessage,
};
