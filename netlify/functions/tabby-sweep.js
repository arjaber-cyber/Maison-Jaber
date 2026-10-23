// netlify/functions/tabby-sweep.js
//
// Safety net for Tabby's "corner case" test: the customer finishes on Tabby
// but closes the tab before coming back, and the webhook is late or lost.
// Every hour this re-checks recent unpaid Tabby orders with Tabby and
// captures any that were approved (same logic as the webhook, so nothing is
// captured twice). Approved payments that are never captured would otherwise
// expire, leaving the customer charged nothing and the order stuck.

const { SUPABASE_URL, SUPABASE_KEY } = require('./_pricing');
const { settleFromTabby, paymentIdOf, secretKey, merchantCode, tabby } = require('./_tabby');

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

// Keeps Tabby's webhook registered for the current key (test or live), so
// nobody has to run tabby-setup.html by hand. Adds it once if missing.
async function ensureWebhook() {
  const secret = String(process.env.TABBY_WEBHOOK_SECRET || '');
  const site = String(process.env.SITE_URL || 'https://maison-jaber.com').replace(/\/$/, '');
  if (secret.length < 16) return console.warn('tabby webhook: TABBY_WEBHOOK_SECRET missing');
  const url = `${site}/.netlify/functions/tabby-webhook`;
  const headers = { 'X-Merchant-Code': merchantCode() };
  const list = await tabby('/api/v1/webhooks', { headers });
  if (!list.ok) return console.warn('tabby webhook list failed', list.status);
  const found = Array.isArray(list.data) && list.data.find(w => w && w.url === url);
  if (found && found.header && found.header.value === secret) return;
  const body = { url, header: { title: 'X-Auth-Key', value: secret } };
  const res = found
    ? await tabby(`/api/v1/webhooks/${encodeURIComponent(found.id)}`, { method: 'PUT', headers, body: { id: found.id, ...body } })
    : await tabby('/api/v1/webhooks', { method: 'POST', headers, body });
  console.log('tabby webhook', found ? 'updated' : 'registered', res.status, url);
}

exports.handler = async () => {
  if (!secretKey()) return { statusCode: 200, body: 'no key' };
  try { await ensureWebhook(); } catch (e) { console.warn('tabby webhook check failed', e.message); }
  const since = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?payment_method=eq.tabby&payment_status=eq.awaiting_payment&created_at=gte.${encodeURIComponent(since)}&select=order_number,admin_notes&limit=50`, { headers: H });
  if (!r.ok) { console.error('tabby sweep lookup failed', r.status); return { statusCode: 500, body: 'lookup failed' }; }
  const rows = await r.json();
  let paid = 0, closed = 0;
  for (const o of rows) {
    const pid = paymentIdOf(o);
    if (!pid) continue;
    try {
      const res = await settleFromTabby(pid);
      if (res.paid) paid++; else if (res.status && res.status !== 'pending') closed++;
    } catch (e) { console.warn('tabby sweep', o.order_number, e.message); }
  }
  console.log(`tabby sweep: ${rows.length} checked, ${paid} captured, ${closed} closed`);
  return { statusCode: 200, body: 'ok' };
};
