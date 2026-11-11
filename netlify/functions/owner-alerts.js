// netlify/functions/owner-alerts.js
//
// Owner-only WhatsApp alerts (Nov 2026), so Abdulrazak can personally help shoppers finish.
// Scheduled every 5 minutes (netlify.toml). Messages ONLY the owner's number (OWNER_WHATSAPP),
// never a customer. Uses the "hikaya_owner_alert" template (see _whatsapp.js).
//
//   1. Stuck at payment   an order was placed but is still unpaid STUCK_MIN minutes later
//                         (closed the Ziina / Tabby / Tamara page, payment failed, etc.).
//                         Includes name, phone (tap-to-chat link), email, amount, method, books.
//   2. Checkout, no order a shopper clicked through to checkout but never pressed Pay within
//                         CHECKOUT_MIN minutes. Anonymous (the visitor counter keeps no contact
//                         details, and the privacy policy says unfinished checkouts are only saved
//                         for the opt-in reminder), so this shows device, country, source, stories, value.
//   3. Cart summary       at SUMMARY_HOURS (Dubai time): add-to-carts, checkouts and orders since the
//                         last summary. Skipped when nothing happened.
//
// Each alert is claimed in Supabase `owner_alerts` first, so nothing is ever sent twice.
// Dry run (logs only) when OWNER_ALERTS_LIVE = 0.

const { sendOwnerAlert } = require('./_whatsapp');
const { SUPABASE_URL, SUPABASE_KEY } = require('./_pricing');

const STUCK_MIN = 15;          // order placed, still unpaid after this many minutes
const CHECKOUT_MIN = 20;       // reached checkout, no Pay press after this many minutes
const LOOKBACK_H = 6;          // never alert about anything older than this
const SUMMARY_HOURS = [10, 13, 16, 19, 22]; // Dubai time
const START = '2026-11-11T17:45:00Z'; // ignore anything from before these alerts existed
const UNPAID = ['awaiting_payment', 'payment_start_failed', 'amount_mismatch', 'code_rejected'];
const METHOD = { ziina: 'card (Ziina)', tabby: 'Tabby', tamara: 'Tamara', paytabs: 'card (PayTabs)', bank_transfer: 'bank transfer', free: 'free code' };
const WHY = { awaiting_payment: 'payment not completed', payment_start_failed: 'payment page failed to open', amount_mismatch: 'amount mismatch at payment', code_rejected: 'discount code rejected' };

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const sb = async (path) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H }); if (!r.ok) throw new Error(`${path.split('?')[0]} ${r.status}`); return r.json(); };
const iso = (ms) => new Date(ms).toISOString();
const later = (a, b) => (Date.parse(a) > Date.parse(b) ? a : b);
const live = () => process.env.OWNER_ALERTS_LIVE !== '0';

// Claim an alert key; true only for the first caller.
async function claim(key, kind) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/owner_alerts?on_conflict=key`, {
    method: 'POST',
    headers: Object.assign({}, H, { Prefer: 'resolution=ignore-duplicates,return=representation' }),
    body: JSON.stringify({ key, kind }),
  });
  if (!r.ok) throw new Error(`claim ${r.status}`);
  return (await r.json()).length > 0;
}
async function note(key, result) {
  await fetch(`${SUPABASE_URL}/rest/v1/owner_alerts?key=eq.${encodeURIComponent(key)}`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ result: String(result).slice(0, 300) }),
  }).catch(() => {});
}
let templateReady = false; // set by ensureTemplate(); until approved, alerts wait (they stay inside their look-back window)
async function send(key, kind, title, details) {
  if (!templateReady && process.env.WHATSAPP_OWNER_ALERT_TEMPLATE == null) { console.log('[waiting for template]', kind, title); return; }
  if (!live()) { console.log('[dry run]', kind, title, '|', details); return; }
  if (!(await claim(key, kind))) return;
  const out = await sendOwnerAlert(title, details);
  await note(key, out.sent ? 'sent' : `failed ${out.code || ''} ${out.error || ''}`);
}

const ago = (t) => { const m = Math.round((Date.now() - Date.parse(t)) / 60000); return m < 60 ? `${m} min ago` : `${Math.floor(m / 60)}h ${m % 60}m ago`; };
const dubai = (ms) => new Date(ms).toLocaleTimeString('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' });
const money = (o) => (o.charged_aed != null ? `AED ${Number(o.charged_aed).toFixed(0)}` : `${o.currency || 'AED'} ${Number(o.amount || 0).toFixed(0)}`);
function books(o, titles) {
  let items = [];
  try { items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); } catch {}
  if (!Array.isArray(items) || !items.length) return '';
  return items.map(i => `${titles[i.slug] || i.story || 'Book'}${i.childName ? ' for ' + i.childName : ''}${i.bookLanguage === 'ar' ? ' (AR)' : ''}`).join(', ');
}
const waLink = (phone) => { const d = String(phone || '').replace(/[^\d]/g, ''); return d.length >= 8 ? `wa.me/${d}` : ''; };

/* ---------- 1. Stuck at payment ---------- */
async function stuckAtPayment(titles) {
  const from = later(iso(Date.now() - LOOKBACK_H * 3600e3), START);
  const to = iso(Date.now() - STUCK_MIN * 60e3);
  const rows = await sb(`orders?select=order_number,full_name,email,phone,city,country,payment_method,payment_status,amount,currency,charged_aed,items,promo_code,created_at,order_type`
    + `&payment_status=in.(${UNPAID.join(',')})&created_at=gte.${from}&created_at=lte.${to}&order_type=neq.test&order=created_at.asc&limit=20`);
  for (const o of rows) {
    // Already finished with a new attempt? Then there's nothing to chase.
    if (o.email) {
      const done = await sb(`orders?select=order_number&email=eq.${encodeURIComponent(o.email)}&payment_status=in.(paid,waived)&created_at=gte.${o.created_at}&limit=1`);
      if (done.length) continue;
    }
    const parts = [
      `${o.order_number} · ${money(o)} via ${METHOD[o.payment_method] || o.payment_method || '?'}${o.promo_code ? ' · code ' + o.promo_code : ''}`,
      `${WHY[o.payment_status] || o.payment_status}, placed ${ago(o.created_at)}`,
      `${o.full_name || 'No name'}${o.city ? ', ' + o.city : ''}${o.country ? ', ' + o.country : ''}`,
      [o.phone, waLink(o.phone), o.email].filter(Boolean).join(' · '),
      books(o, titles),
    ].filter(Boolean);
    await send(`pay:${o.order_number}`, 'stuck_payment', 'Stuck at payment', parts.join(' | '));
  }
}

/* ---------- 2. Reached checkout, never pressed Pay ---------- */
async function checkoutNoOrder(titles) {
  const from = later(iso(Date.now() - 3 * 3600e3), START);
  const to = iso(Date.now() - CHECKOUT_MIN * 60e3);
  const starts = await sb(`site_events?select=visitor,created_at,value,currency,country,device,source,lt_source,lt_campaign,lang&event=eq.begin_checkout&created_at=gte.${from}&created_at=lte.${to}&order=created_at.desc&limit=50`);
  const seen = new Set();
  for (const s of starts) {
    if (seen.has(s.visitor)) continue; // latest checkout per visitor only
    seen.add(s.visitor);
    const after = await sb(`site_events?select=event&visitor=eq.${s.visitor}&event=in.(add_payment_info,purchase,complimentary_order_complete)&created_at=gte.${s.created_at}&limit=1`);
    if (after.length) continue; // pressed Pay (stuck-at-payment covers the rest) or bought
    const carts = await sb(`site_events?select=story&visitor=eq.${s.visitor}&event=eq.add_to_cart&order=created_at.desc&limit=5`);
    const stories = [...new Set(carts.map(c => titles[c.story] || c.story).filter(Boolean))].join(', ');
    const src = s.lt_source ? `${s.lt_source}${s.lt_campaign ? ' / ' + s.lt_campaign : ''}` : (s.source || 'Direct');
    const parts = [
      `Reached checkout ${ago(s.created_at)} and has not pressed Pay`,
      s.value != null ? `Cart ${s.currency || 'AED'} ${Number(s.value).toFixed(0)}` : '',
      stories ? `Books: ${stories}` : '',
      `${s.device || '?'} · ${s.country || '?'} · ${s.lang === 'ar' ? 'Arabic site' : 'English site'} · from ${src}`,
      'No contact details (no order placed)',
    ].filter(Boolean);
    await send(`checkout:${s.visitor}`, 'checkout_no_order', 'Checkout, no order', parts.join(' | '));
  }
}

/* ---------- 3. Add-to-cart summary ---------- */
async function summary(titles) {
  const now = new Date();
  const hour = Number(now.toLocaleString('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', hour12: false }));
  if (!SUMMARY_HOURS.includes(hour)) return;
  const day = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
  const key = `summary:${day}-${hour}`;
  // Window: from the previous summary slot (on the hour, Dubai = UTC+4) to this one.
  const idx = SUMMARY_HOURS.indexOf(hour);
  const slotEnd = Date.parse(`${day}T${String(hour).padStart(2, '0')}:00:00+04:00`);
  const gapH = idx > 0 ? hour - SUMMARY_HOURS[idx - 1] : hour + 24 - SUMMARY_HOURS[SUMMARY_HOURS.length - 1];
  const fromMs = Math.max(slotEnd - gapH * 3600e3, Date.parse(START));
  const from = iso(fromMs), to = iso(slotEnd);

  const ev = await sb(`site_events?select=visitor,event,story&event=in.(add_to_cart,begin_checkout)&created_at=gte.${from}&created_at=lt.${to}&limit=2000`);
  const cartVisitors = new Set(), coVisitors = new Set(), storyCount = {};
  for (const e of ev) {
    if (e.event === 'add_to_cart') { cartVisitors.add(e.visitor); const t = titles[e.story] || e.story || 'Unknown'; storyCount[t] = (storyCount[t] || 0) + 1; }
    else coVisitors.add(e.visitor);
  }
  const paid = await sb(`orders?select=charged_aed&payment_status=eq.paid&paid_at=gte.${from}&paid_at=lt.${to}&order_type=neq.test`);
  const free = await sb(`orders?select=order_number&payment_status=eq.waived&created_at=gte.${from}&created_at=lt.${to}&order_type=neq.test`);
  const unpaid = await sb(`orders?select=order_number&payment_status=in.(${UNPAID.join(',')})&created_at=gte.${from}&created_at=lt.${to}&order_type=neq.test`);
  if (!cartVisitors.size && !coVisitors.size && !paid.length && !free.length && !unpaid.length) return; // quiet period: no message

  const aed = paid.reduce((t, o) => t + Number(o.charged_aed || 0), 0);
  const top = Object.entries(storyCount).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}${n > 1 ? ' x' + n : ''}`).join(', ');
  const parts = [
    `${dubai(fromMs)}-${dubai(slotEnd)} Dubai`,
    `Added to cart: ${cartVisitors.size} shopper${cartVisitors.size === 1 ? '' : 's'}${top ? ' (' + top + ')' : ''}`,
    `Reached checkout: ${coVisitors.size}`,
    `Paid orders: ${paid.length}${paid.length ? ' (AED ' + aed.toFixed(0) + ')' : ''}${free.length ? ' · free-code orders: ' + free.length : ''}`,
    unpaid.length ? `Still unpaid: ${unpaid.length}` : '',
  ].filter(Boolean);
  await send(key, 'cart_summary', 'Cart summary', parts.join(' | '));
}

/* ---------- 0. One-time setup: create the "hikaya_owner_alert" template on the alert sender's WhatsApp account ----------
   Progress is kept in app_flags "owner_alert_template" (JSON). Re-checks the status at most every 30 min until approved. */
const GRAPH = 'https://graph.facebook.com/v21.0';
const TEMPLATE = process.env.WHATSAPP_OWNER_ALERT_TEMPLATE || 'hikaya_owner_alert';
async function ensureTemplate() {
  const flag = (await sb('app_flags?key=eq.owner_alert_template&select=value,updated_at'))[0];
  let state = {}; try { state = flag ? JSON.parse(flag.value) : {}; } catch {}
  if (state.status === 'APPROVED') { templateReady = true; return; }
  if (flag && Date.now() - Date.parse(flag.updated_at) < 30 * 60e3 && state.status) return;
  const sender = process.env.WHATSAPP_ALERT_PHONE_NUMBER_ID || process.env.ALERT_WA_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.ALERT_WA_TOKEN || process.env.WHATSAPP_TOKEN;
  const save = async (v) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/app_flags?on_conflict=key`, {
      method: 'POST', headers: Object.assign({}, H, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ key: 'owner_alert_template', value: JSON.stringify(Object.assign({ at: new Date().toISOString() }, v)), updated_at: new Date().toISOString() }),
    });
    if (!r.ok) console.error('owner-alerts: flag save failed', r.status, await r.text());
  };
  if (!sender || !token) return save({ status: 'not_configured' });
  const g = async (path, init) => { const r = await fetch(`${GRAPH}/${path}`, Object.assign({ headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }, init || {})); return r.json().catch(() => ({})); };

  // Which WhatsApp Business Account owns the alert sender? Check the known ones plus any the token can manage.
  const cands = new Set([process.env.ALERT_WA_WABA_ID, '1492270739537979'].filter(Boolean));
  try {
    const dbg = await g(`debug_token?input_token=${encodeURIComponent(token)}`);
    ((dbg.data && dbg.data.granular_scopes) || []).forEach(s => { if (/whatsapp/.test(s.scope)) (s.target_ids || []).forEach(id => cands.add(id)); });
  } catch {}
  let waba = null;
  for (const id of cands) {
    const nums = await g(`${id}/phone_numbers?fields=id,display_phone_number`);
    if ((nums.data || []).some(n => String(n.id) === String(sender))) { waba = id; break; }
  }
  if (!waba) return save({ status: 'no_waba', tried: [...cands] });

  const existing = await g(`${waba}/message_templates?name=${TEMPLATE}&fields=id,name,status,category,rejected_reason,language`);
  const found = (existing.data || []).find(t => t.name === TEMPLATE);
  if (found && found.status === 'APPROVED') templateReady = true;
  if (found) return save({ status: found.status, id: found.id, category: found.category, reason: found.rejected_reason || null, waba });

  const created = await g(`${waba}/message_templates`, {
    method: 'POST',
    body: JSON.stringify({
      name: TEMPLATE,
      category: 'UTILITY',
      language: 'en',
      components: [{
        type: 'BODY',
        text: 'Hikaya alert: {{1}}\n\n{{2}}\n\nOpen the Hikaya dashboard to follow up.',
        example: { body_text: [['Stuck at payment', 'HK-123456 · AED 169 via Tabby | payment not completed, placed 22 min ago | Sara, Dubai | +971501112222']] },
      }],
    }),
  });
  if (created.error) return save({ status: 'create_failed', waba, code: created.error.code, error: created.error.message, detail: created.error.error_user_msg || null });
  return save({ status: created.status || 'PENDING', id: created.id, category: created.category, waba });
}

exports.handler = async () => {
  if (!SUPABASE_KEY) return { statusCode: 200, body: 'no key' };
  try { await ensureTemplate(); } catch (e) { console.error('owner-alerts template', e && e.message); }
  let titles = {};
  try { titles = Object.fromEntries((await sb('stories?select=slug,title')).map(s => [s.slug, s.title])); } catch {}
  for (const [name, fn] of [['stuck', stuckAtPayment], ['checkout', checkoutNoOrder], ['summary', summary]]) {
    try { await fn(titles); } catch (e) { console.error('owner-alerts', name, e && e.message); }
  }
  return { statusCode: 200, body: 'ok' };
};

// Exposed for the local test only.
exports._books = books;
exports._waLink = waLink;
