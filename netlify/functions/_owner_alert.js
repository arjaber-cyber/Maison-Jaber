// netlify/functions/_owner_alert.js
//
// Instant WhatsApp ping to the owner when a new order is confirmed
// (called from sendConfirmation in _ziina.js, which every payment route uses).
//
// Uses CallMeBot (free personal WhatsApp alerts). Env (Netlify):
//   OWNER_WHATSAPP           owner's WhatsApp number, e.g. +9715XXXXXXXX
//   CALLMEBOT_APIKEY         key CallMeBot sends back after activation
// Until both are set this does nothing. Never throws: an alert must not block an order.
// Kept deliberately light on customer data (first name + city only).

async function alertNewOrder(order) {
  const phone = process.env.OWNER_WHATSAPP;
  const key = process.env.CALLMEBOT_APIKEY;
  if (!phone || !key || !order) return;
  try {
    let items = [];
    try { items = JSON.parse(order.items || '[]'); } catch {}
    const waived = order.payment_status === 'waived';
    const first = String(order.full_name || '').trim().split(/\s+/)[0] || 'Customer';
    const books = items.map(i => `• ${i.story || 'Book'}${i.bookLanguage === 'ar' ? ' (AR)' : i.bookLanguage ? ' (EN)' : ''}`).join('\n');
    const money = waived
      ? `FREE order · code ${order.promo_code || '-'}`
      : `AED ${Number(order.charged_aed || order.amount || 0).toFixed(2)} · ${order.payment_method || ''}${order.promo_code ? ' · code ' + order.promo_code : ''}`;
    const tag = order.order_type && order.order_type !== 'sale' ? ` [${order.order_type}]` : '';
    const text = [
      `🛎️ New Hikaya order ${order.order_number || ''}${tag}`,
      money,
      `${first} · ${order.city || ''}${order.country ? ', ' + order.country : ''}`,
      books,
      'https://maison-jaber.com/hikaya/admin.html',
    ].filter(Boolean).join('\n');
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(key)}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
    if (!res.ok) console.error('owner whatsapp alert failed', res.status);
  } catch (e) {
    console.error('owner whatsapp alert error', e && e.message);
  }
}

module.exports = { alertNewOrder };
