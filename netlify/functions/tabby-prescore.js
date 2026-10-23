// netlify/functions/tabby-prescore.js
//
// Background pre-scoring (Tabby checklist): checkout calls this once the
// customer has typed their email and phone, and again when the total changes,
// so Tabby can be shown as unavailable (with Tabby's own wording) BEFORE the
// customer clicks Place order. It only asks Tabby "would you approve this?",
// no order is saved and nothing is charged.
//
// POST { amount (AED), email, phone, lang }
//   -> { status: 'created' }                        Tabby available
//   -> { status: 'rejected', reason, message }      show Tabby as unavailable
//   -> { status: 'unknown' }                        error/timeout: Tabby stays available (Tabby's fail-safe rule)

const { tabby, secretKey, merchantCode, isTestKey, money, uaePhone, rejectMessage, rejectionReason } = require('./_tabby');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!secretKey()) return json(200, { status: 'unknown' });

  let o;
  try { o = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }
  const email = String(o.email || '').trim();
  const phone = uaePhone(o.phone);
  const amount = Number(o.amount);
  const lang = o.lang === 'ar' ? 'ar' : 'en';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+\d{9,15}$/.test(phone) || !(amount > 0 && amount < 100000)) {
    return json(400, { error: 'Invalid request.' });
  }
  // Sandbox keys only know Tabby's test buyers; anyone else is blocked at Place order anyway.
  if (isTestKey() && !/@tabby\.ai$/i.test(email)) return json(200, { status: 'unknown' });

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const r = await tabby('/api/v2/checkout', {
      method: 'POST',
      body: {
        payment: { amount: money(amount), currency: 'AED', buyer: { email, phone } },
        lang,
        merchant_code: merchantCode(),
      },
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));
    const s = r.data || {};
    if (r.ok && s.status === 'rejected') {
      const reason = rejectionReason(s);
      return json(200, { status: 'rejected', reason, message: rejectMessage(reason, lang) });
    }
    if (r.ok && s.status === 'created') return json(200, { status: 'created' });
    console.warn('tabby prescore unexpected', r.status, JSON.stringify(s).slice(0, 200));
    return json(200, { status: 'unknown' });
  } catch (e) {
    console.warn('tabby prescore failed', e.message);
    return json(200, { status: 'unknown' });
  }
};
