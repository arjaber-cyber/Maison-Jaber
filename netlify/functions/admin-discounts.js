// netlify/functions/admin-discounts.js
//
// Admin-only: create, list and manage discount codes and their templates
// (Discounts tab in the dashboard). Requires the x-admin-password header.
//
// GET                         -> { codes, templates, redemptions }
// POST { action: 'create', type, value, tag, email?, code? | prefix+count,
//        validDays? | expiresAt?, startsAt?, maxUses?, maxUsesPerEmail?,
//        minOrderAed?, note?, templateName?, issuedForOrder?, sendEmail?, customerName? }
// POST { action: 'update', code, active?, expiresAt?, maxUses?, note? }
// POST { action: 'delete', code }              (only codes never used)
// POST { action: 'send', code, email?, customerName? } (email an existing code)
// POST { action: 'template_save', id?, name, type, value, validDays, maxUses, lockToEmail, tag, prefix }
// POST { action: 'template_delete', id }
//
// Code types: percent | fixed (AED) | free_shipping | free_order.

const crypto = require('crypto');
const { isAdminRequest } = require('./_admin-check');
const { sendEmail, emailShell } = require('./_email');
const { SUPABASE_URL, SUPABASE_KEY } = require('./_pricing');

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const TYPES = ['percent', 'fixed', 'free_shipping', 'free_order'];
const TAGS = ['review', 'campaign', 'influencer', 'compensation', 'gift', 'staff', 'test'];
const SHOP_URL = process.env.SHOP_URL || 'https://maison-jaber.com/test5/stories.html';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I: easy to read out loud
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) { const e = new Error((data && data.message) || `Supabase ${res.status}`); e.status = res.status; e.code = data && data.code; throw e; }
  return data;
}

function randomPart(n) {
  const bytes = crypto.randomBytes(n);
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}
const cleanPrefix = p => String(p || 'HK').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'HK';
const num = (v, def = null) => (v === '' || v == null || isNaN(Number(v)) ? def : Number(v));
const int = (v) => { const n = num(v); return n == null ? null : Math.max(1, Math.floor(n)); };

function offerText(c) {
  if (c.type === 'percent') return `${Number(c.value)}% off your Hikaya order`;
  if (c.type === 'fixed') return `AED ${Number(c.value)} off your Hikaya order`;
  if (c.type === 'free_shipping') return 'free delivery on your Hikaya order';
  return 'a free personalised Hikaya book, delivery included';
}
function codeEmail(c, name) {
  const first = esc(String(name || '').trim().split(' ')[0] || 'there');
  const until = c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' }) : null;
  const intro = {
    review: 'Thank you for sharing your feedback with us. It genuinely helps a small studio like ours.',
    compensation: "We're sorry things weren't perfect. Here's something to make it right.",
    gift: "We'd love you to have a Hikaya story of your own.",
    influencer: "We'd love you to try Hikaya and see the magic for yourself.",
  }[c.tag] || 'Here is a little something from us.';
  return {
    subject: c.type === 'free_order' ? 'A Hikaya book, on us' : `Your Hikaya code: ${offerText(c).replace(' your Hikaya order', '')}`,
    html: emailShell(`
      <p style="font-size:14px; line-height:1.6; color:#5b4a3d;">Hi ${first},</p>
      <p style="font-size:14px; line-height:1.6; color:#5b4a3d;">${esc(intro)} Your code gives you <strong>${esc(offerText(c))}</strong>.</p>
      <div style="background:#F3E8D8; border-radius:12px; padding:18px; margin:18px 0; text-align:center;">
        <div style="font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:#7d6a5a;">Your code</div>
        <div style="font-family:Menlo,Consolas,monospace; font-size:24px; font-weight:700; letter-spacing:.08em; color:#2E2018; margin-top:6px;">${esc(c.code)}</div>
        ${until ? `<div style="font-size:12.5px; color:#7d6a5a; margin-top:8px;">Valid until ${esc(until)}</div>` : ''}
      </div>
      <p style="font-size:13px; line-height:1.6; color:#7d6a5a;">Enter it at checkout.${c.email ? ' It works with this email address only.' : ''}${c.max_uses === 1 ? ' It can be used once.' : ''} One discount applies per order.</p>
      <p><a href="${esc(SHOP_URL)}" style="display:inline-block; background:#2E2018; color:#fff; text-decoration:none; padding:11px 22px; border-radius:100px; font-weight:700; font-size:14px;">Choose a story</a></p>
      <p style="font-size:13px; color:#7d6a5a;">With love,<br>Hikaya by Maison Jaber</p>`),
  };
}

exports.handler = async (event) => {
  if (!isAdminRequest(event)) return json(401, { error: 'Not authorized.' });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return json(503, { error: 'SUPABASE_SERVICE_ROLE_KEY still needs to be added in Netlify.' });

  try {
    if (event.httpMethod === 'GET') {
      const [codes, templates, redemptions] = await Promise.all([
        sb('discount_codes?select=*&order=created_at.desc&limit=5000'),
        sb('discount_templates?select=*&order=sort_order.asc,created_at.asc'),
        sb('discount_redemptions?select=code,order_id,order_number,email,discount_aed,order_total_aed,status,created_at,settled_at&order=created_at.desc&limit=10000'),
      ]);
      return json(200, { codes, templates, redemptions });
    }
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    let p; try { p = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }

    if (p.action === 'create') {
      const type = p.type;
      if (!TYPES.includes(type)) return json(400, { error: 'Pick a code type.' });
      const tag = TAGS.includes(p.tag) ? p.tag : 'campaign';
      let value = num(p.value, 0);
      if (type === 'percent' && !(value > 0 && value <= 100)) return json(400, { error: 'Percent must be between 1 and 100.' });
      if (type === 'fixed' && !(value > 0 && value <= 10000)) return json(400, { error: 'Enter the AED amount off.' });
      if (type === 'free_shipping' || type === 'free_order') value = 0;
      const email = String(p.email || '').trim().toLowerCase() || null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'That email address looks wrong.' });

      let expiresAt = null;
      if (p.expiresAt) { const d = new Date(p.expiresAt); if (isNaN(d)) return json(400, { error: 'Invalid end date.' }); expiresAt = d.toISOString(); }
      else if (num(p.validDays)) { expiresAt = new Date(Date.now() + num(p.validDays) * 864e5).toISOString(); }
      let startsAt = null;
      if (p.startsAt) { const d = new Date(p.startsAt); if (!isNaN(d)) startsAt = d.toISOString(); }

      const base = {
        type, value, tag, email, expires_at: expiresAt, starts_at: startsAt,
        max_uses: int(p.maxUses), max_uses_per_email: int(p.maxUsesPerEmail),
        min_order_aed: num(p.minOrderAed) > 0 ? num(p.minOrderAed) : null,
        note: p.note ? String(p.note).slice(0, 500) : null,
        template_name: p.templateName ? String(p.templateName).slice(0, 120) : null,
        issued_for_order: p.issuedForOrder ? String(p.issuedForOrder).slice(0, 40) : null,
        active: true,
      };

      let codes;
      if (p.code) {
        const c = String(p.code).trim().toUpperCase();
        if (!/^[A-Z0-9-]{3,30}$/.test(c)) return json(400, { error: 'Codes can use letters, numbers and dashes (3–30 characters).' });
        codes = [c];
      } else {
        const count = Math.min(200, Math.max(1, Math.floor(num(p.count, 1))));
        if (count > 1 && email) return json(400, { error: 'A batch of codes can’t all be locked to one email.' });
        const prefix = cleanPrefix(p.prefix);
        const set = new Set(); while (set.size < count) set.add(`${prefix}-${randomPart(6)}`);
        codes = [...set];
      }

      let rows;
      try {
        rows = await sb('discount_codes', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(codes.map(code => ({ code, ...base }))) });
      } catch (e) {
        if (e.code === '23505') return json(409, { error: p.code ? 'That code already exists. Pick another.' : 'A generated code clashed with an existing one. Please try again.' });
        throw e;
      }

      let emailed = null;
      if (p.sendEmail && email && rows.length === 1) {
        const r = await sendEmail({ to: email, ...codeEmail(rows[0], p.customerName) }).catch(e => ({ sent: false, reason: e.message }));
        emailed = !(r && r.sent === false);
      }
      return json(200, { codes: rows, emailed });
    }

    if (p.action === 'update') {
      const code = String(p.code || '').toUpperCase();
      if (!code) return json(400, { error: 'Missing code.' });
      const patch = { updated_at: new Date().toISOString() };
      if (p.active !== undefined) patch.active = !!p.active;
      if (p.expiresAt !== undefined) { if (p.expiresAt === null || p.expiresAt === '') patch.expires_at = null; else { const d = new Date(p.expiresAt); if (isNaN(d)) return json(400, { error: 'Invalid end date.' }); patch.expires_at = d.toISOString(); } }
      if (p.maxUses !== undefined) patch.max_uses = int(p.maxUses);
      if (p.note !== undefined) patch.note = p.note ? String(p.note).slice(0, 500) : null;
      const rows = await sb(`discount_codes?code=eq.${encodeURIComponent(code)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
      if (!rows.length) return json(404, { error: 'Code not found.' });
      return json(200, { code: rows[0] });
    }

    if (p.action === 'delete') {
      const code = String(p.code || '').toUpperCase();
      const used = await sb(`discount_redemptions?code=eq.${encodeURIComponent(code)}&select=order_id&limit=1`);
      if (used.length) return json(400, { error: 'This code has been used on an order, so it is kept for your records. Pause it instead.' });
      await sb(`discount_codes?code=eq.${encodeURIComponent(code)}&uses_count=eq.0`, { method: 'DELETE' });
      return json(200, { deleted: code });
    }

    if (p.action === 'send') {
      const code = String(p.code || '').toUpperCase();
      const rows = await sb(`discount_codes?code=eq.${encodeURIComponent(code)}&select=*`);
      if (!rows.length) return json(404, { error: 'Code not found.' });
      const to = String(rows[0].email || p.email || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json(400, { error: 'Enter an email address to send it to.' });
      const r = await sendEmail({ to, ...codeEmail(rows[0], p.customerName) });
      if (r && r.sent === false) return json(503, { error: r.reason === 'not_configured' ? 'Email sending isn’t set up yet (RESEND_API_KEY). Copy the code instead.' : 'The email could not be sent.' });
      return json(200, { sent: true });
    }

    if (p.action === 'template_save') {
      const t = {
        name: String(p.name || '').trim().slice(0, 120), type: p.type, value: num(p.value, 0),
        valid_days: int(p.validDays), max_uses: int(p.maxUses), lock_to_email: !!p.lockToEmail,
        tag: TAGS.includes(p.tag) ? p.tag : 'campaign', prefix: cleanPrefix(p.prefix),
      };
      if (!t.name) return json(400, { error: 'Give the template a name.' });
      if (!TYPES.includes(t.type)) return json(400, { error: 'Pick a code type.' });
      if (t.type === 'free_shipping' || t.type === 'free_order') t.value = 0;
      const rows = p.id
        ? await sb(`discount_templates?id=eq.${encodeURIComponent(p.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(t) })
        : await sb('discount_templates', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(t) });
      return json(200, { template: rows[0] });
    }

    if (p.action === 'template_delete') {
      if (!/^[0-9a-f-]{36}$/i.test(p.id || '')) return json(400, { error: 'Missing template.' });
      await sb(`discount_templates?id=eq.${p.id}`, { method: 'DELETE' });
      return json(200, { deleted: p.id });
    }

    return json(400, { error: 'Unknown action.' });
  } catch (err) {
    console.error('admin-discounts error:', err);
    return json(500, { error: err.message || 'Something went wrong.' });
  }
};
