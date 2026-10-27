// netlify/functions/tamara-precheck.js
//
// Pre-checkout eligibility (Tamara's step 1, "Important"): checkout calls this
// once the customer has typed their phone (and email), and again when the
// total changes. If Tamara says this customer can't use it for this amount,
// the Tamara row is greyed out BEFORE they click Place order. No order is
// saved and nothing is charged.
//
// POST { amount (AED), email, phone, lang }
//   -> { status: 'available' }                 show Tamara
//   -> { status: 'unavailable', message }      grey it out with this message
//   -> { status: 'unknown' }                   error / timeout: Tamara stays available
//                                              (the session call is the final check)

const { tamara, apiToken, round2, uaePhone, unavailableMessage } = require('./_tamara');

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

const withTimeout = (ms, fn) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fn(ctrl.signal).finally(() => clearTimeout(timer));
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!apiToken()) return json(200, { status: 'unknown' });

  let o;
  try { o = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }
  const email = String(o.email || '').trim();
  const phone = uaePhone(o.phone);
  const amount = round2(o.amount);
  const lang = o.lang === 'ar' ? 'ar' : 'en';
  if (!/^\+\d{9,15}$/.test(phone) || !(amount > 0 && amount < 100000)) return json(400, { error: 'Invalid request.' });

  try {
    // Payment-options pre-check (country + amount + phone).
    const r = await withTimeout(5000, signal => tamara('/checkout/payment-options-pre-check', {
      method: 'POST', signal,
      body: { country: 'AE', order_value: { amount, currency: 'AED' }, phone_number: phone, is_vip: false },
    }));
    const d = r.data || {};
    if (r.ok && typeof d.has_available_payment_options === 'boolean') {
      return json(200, d.has_available_payment_options
        ? { status: 'available', labels: Array.isArray(d.available_payment_labels) ? d.available_payment_labels.slice(0, 6) : [] }
        : { status: 'unavailable', message: unavailableMessage(lang) });
    }

    // Newer pre-checkout eligibility endpoint, if the one above isn't enabled for this account.
    const e = await withTimeout(5000, signal => tamara('/pre-checkout/v1/eligibility', {
      method: 'POST', signal,
      body: { order: { amount, currency: 'AED' }, customer: { phone_number: phone, ...(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? { email } : {}) } },
    }));
    const ed = e.data || {};
    if (e.ok && typeof ed.is_eligible === 'boolean') {
      return json(200, ed.is_eligible ? { status: 'available' } : { status: 'unavailable', message: unavailableMessage(lang) });
    }
    console.warn('tamara precheck unexpected', r.status, JSON.stringify(d).slice(0, 200), e.status, JSON.stringify(ed).slice(0, 200));
    return json(200, { status: 'unknown' });
  } catch (err) {
    console.warn('tamara precheck failed', err.message);
    return json(200, { status: 'unknown' });
  }
};
