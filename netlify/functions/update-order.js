// netlify/functions/update-order.js
//
// Admin-only: update one order's fulfilment stage, payment status, courier
// details and/or internal notes. Requires the x-admin-password header (see
// _admin-check.js) and SUPABASE_SERVICE_ROLE_KEY in Netlify env.
//
// Every stage change is appended to orders.stage_history ([{stage, at}]) so
// the dashboard can show when each step happened. When an order is handed to
// the delivery company (or delivered) the customer can optionally be emailed.

const { isAdminRequest } = require('./_admin-check');
const { STAGES, normalizeStage } = require('./_stages');
const { sendEmail, emailShell } = require('./_email');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

const ALL_STAGES = [...STAGES, 'cancelled'];
const PAYMENT = ['pending', 'pending_cod', 'paid', 'refunded', 'failed', 'waived'];
// Only "sale" counts as revenue on the dashboard; the rest are giveaways/internal.
const ORDER_TYPES = ['sale', 'gift', 'influencer', 'replacement', 'test'];
const H = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
const json = (code, body) => ({ statusCode: code, body: JSON.stringify(body) });
const clip = (v, n) => (v == null ? null : String(v).trim().slice(0, n) || null);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function customerEmail(order, stage) {
  const first = String(order.full_name || '').split(' ')[0] || 'there';
  const no = esc(order.order_number || '');
  if (stage === 'with_courier') {
    const track = order.tracking_url
      ? `<p><a href="${esc(order.tracking_url)}" style="color:#8A5638;font-weight:700">Track your delivery${order.tracking_number ? ' (' + esc(order.tracking_number) + ')' : ''}</a></p>`
      : (order.tracking_number ? `<p>Tracking number: <strong>${esc(order.tracking_number)}</strong>${order.courier ? ' with ' + esc(order.courier) : ''}</p>` : '');
    return {
      subject: `Your Hikaya book is on its way · ${order.order_number || ''}`,
      html: emailShell(`<p>Hi ${esc(first)},</p><p>Good news: your personalised Hikaya book (order <strong>${no}</strong>) is gift-boxed and now with ${order.courier ? esc(order.courier) : 'our delivery partner'}.</p>${track}<p>You can also check progress any time at <a href="https://maison-jaber.com/track-order.html">maison-jaber.com/track-order</a>.</p><p>With love,<br>Hikaya by Maison Jaber</p>`),
    };
  }
  return {
    subject: `Delivered: your Hikaya book · ${order.order_number || ''}`,
    html: emailShell(`<p>Hi ${esc(first)},</p><p>Your Hikaya book (order <strong>${no}</strong>) has been delivered. We hope it becomes a favourite at bedtime.</p><p>If anything isn't perfect, just reply to this email and a real person will help.</p><p>With love,<br>Hikaya by Maison Jaber</p>`),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!isAdminRequest(event)) return json(401, { error: 'Not authorized.' });

  let p;
  try { p = JSON.parse(event.body); } catch { return json(400, { error: 'Invalid request.' }); }
  const { orderId, paymentStatus, adminNotes, notifyCustomer } = p;
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return json(400, { error: 'Missing or invalid orderId.' });

  const patch = {};
  let newStage = null;
  if (p.orderStatus !== undefined) {
    newStage = normalizeStage(p.orderStatus);
    if (!ALL_STAGES.includes(newStage)) return json(400, { error: 'Invalid stage.' });
  }
  if (paymentStatus !== undefined) {
    if (!PAYMENT.includes(paymentStatus)) return json(400, { error: 'Invalid payment status.' });
    patch.payment_status = paymentStatus;
  }
  if (adminNotes !== undefined) patch.admin_notes = String(adminNotes).slice(0, 4000);
  let newType = null;
  if (p.orderType !== undefined) {
    if (!ORDER_TYPES.includes(p.orderType)) return json(400, { error: 'Invalid order type.' });
    newType = p.orderType;
    if (p.orderTypeNote !== undefined) patch.order_type_note = clip(p.orderTypeNote, 300);
  }
  if (p.courier !== undefined) patch.courier = clip(p.courier, 80);
  if (p.trackingNumber !== undefined) patch.tracking_number = clip(p.trackingNumber, 120);
  if (p.trackingUrl !== undefined) {
    const u = clip(p.trackingUrl, 500);
    if (u && !/^https?:\/\//i.test(u)) return json(400, { error: 'Tracking link must start with https://' });
    patch.tracking_url = u;
  }
  if (!newStage && !newType && !Object.keys(patch).length) return json(400, { error: 'Nothing to update.' });

  try {
    let current = null;
    if (newType) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=order_type,order_type_history`, { headers: H });
      const rows = await r.json().catch(() => []);
      if (!r.ok || !rows.length) return json(404, { error: 'Order not found.' });
      const hist = Array.isArray(rows[0].order_type_history) ? rows[0].order_type_history : [];
      patch.order_type = newType;
      if ((rows[0].order_type || 'sale') !== newType) patch.order_type_history = [...hist, { from: rows[0].order_type || 'sale', to: newType, note: patch.order_type_note || null, at: new Date().toISOString() }].slice(-50);
    }
    if (newStage) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=order_status,stage_history`, { headers: H });
      const rows = await r.json().catch(() => []);
      if (!r.ok || !rows.length) return json(404, { error: 'Order not found.' });
      current = rows[0];
      if (normalizeStage(current.order_status) !== newStage) {
        const now = new Date().toISOString();
        const hist = Array.isArray(current.stage_history) ? current.stage_history : [];
        patch.order_status = newStage;
        patch.status_updated_at = now;
        patch.stage_history = [...hist, { stage: newStage, at: now }].slice(-50);
      } else if (!Object.keys(patch).length) {
        return json(200, { order: null, unchanged: true });
      }
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(patch),
    });
    const rows = await res.json().catch(() => []);
    if (!res.ok || !Array.isArray(rows) || !rows.length) {
      console.error('update-order failed:', res.status, rows);
      return json(502, { error: 'Could not save. Check that SUPABASE_SERVICE_ROLE_KEY is set in Netlify.' });
    }
    const { items, ...order } = rows[0];

    let emailed = false;
    if (notifyCustomer && patch.order_status && ['with_courier', 'delivered'].includes(patch.order_status) && order.email) {
      try { const m = customerEmail(order, patch.order_status); const r = await sendEmail({ to: order.email, ...m }); emailed = !!(r && r.sent !== false); }
      catch (e) { console.error('update-order email failed:', e); }
    }
    return json(200, { order, emailed });
  } catch (err) {
    console.error('update-order error:', err);
    return json(500, { error: 'Something went wrong saving the change.' });
  }
};
