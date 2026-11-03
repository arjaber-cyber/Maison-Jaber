// netlify/functions/wa-test-alert.js
//
// One-off check that the owner's WhatsApp order alert works end to end.
// Locked: it only runs while Supabase app_flags has key "wa_test_alert" set to
// "register" (one-time Cloud API registration of the alert sender, fixes error
// 133010; the PIN it sets is kept in app_flags "wa_alert_pin"), "hello" (Meta's
// approved hello_world template) or "order" (the real
// hikaya_new_order template with sample data), set less than 15 minutes ago.
// Each run clears the flag, so it fires at most once per flag. It only ever
// messages the owner's number (OWNER_WHATSAPP), never anyone else.

const { sendOrderAlert } = require('./_whatsapp');
const { SUPABASE_URL, SUPABASE_KEY } = require('./_pricing');

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

exports.handler = async () => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/app_flags?key=eq.wa_test_alert&select=value,updated_at`, { headers: H });
  const row = r.ok ? (await r.json())[0] : null;
  if (!row || !['diag', 'register', 'hello', 'order'].includes(row.value) || Date.now() - new Date(row.updated_at).getTime() > 15 * 60 * 1000) {
    return json(403, { error: 'locked' });
  }
  await fetch(`${SUPABASE_URL}/rest/v1/app_flags?key=eq.wa_test_alert`, { method: 'DELETE', headers: H });

  if (row.value === 'order') {
    const out = await sendOrderAlert(
      { order_number: 'TEST-0001', charged_aed: 169, payment_method: 'tabby', full_name: 'Test customer', city: 'Dubai' },
      [{ story: 'Safari with Grandpa', bookLanguage: 'ar' }],
    );
    return json(200, { mode: 'order', ...out });
  }

  const sender = process.env.WHATSAPP_ALERT_PHONE_NUMBER_ID || process.env.ALERT_WA_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.ALERT_WA_TOKEN || process.env.WHATSAPP_TOKEN;
  if (!sender || !token) return json(200, { mode: row.value, sent: false, error: 'not_configured' });

  if (row.value === 'diag') {
    const g = async path => { const r = await fetch(`https://graph.facebook.com/v21.0/${path}`, { headers: { Authorization: `Bearer ${token}` } }); return r.json().catch(() => ({})); };
    const dbg = await g(`debug_token?input_token=${encodeURIComponent(token)}`);
    const d = dbg.data || {};
    const phone = await g(`${sender}?fields=display_phone_number,verified_name,status,platform_type,code_verification_status,quality_rating,throughput`);
    const waba = process.env.ALERT_WA_WABA_ID || '4740417332904358';
    const apps = await g(`${waba}/subscribed_apps`);
    return json(200, {
      mode: 'diag',
      token: { app_id: d.app_id, application: d.application, type: d.type, valid: d.is_valid, expires_at: d.expires_at, scopes: d.scopes, granular: d.granular_scopes, error: dbg.error && dbg.error.message },
      phone,
      subscribed_apps: apps,
    });
  }

  if (row.value === 'register') {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const res = await fetch(`https://graph.facebook.com/v21.0/${sender}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await fetch(`${SUPABASE_URL}/rest/v1/app_flags`, {
        method: 'POST',
        headers: { ...H, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ key: 'wa_alert_pin', value: pin, updated_at: new Date().toISOString() }),
      });
    }
    const err = (data && data.error) || {};
    return json(200, { mode: 'register', ok: res.ok, status: res.status, code: err.code, error: err.message });
  }
  const to = String(process.env.OWNER_WHATSAPP || '+971528011773').replace(/[^\d]/g, '');
  const res = await fetch(`https://graph.facebook.com/v21.0/${sender}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template: { name: 'hello_world', language: { code: 'en_US' } } }),
  });
  const data = await res.json().catch(() => ({}));
  const err = (data && data.error) || {};
  return json(200, { mode: 'hello', sent: res.ok, status: res.status, code: err.code, error: err.message });
};
