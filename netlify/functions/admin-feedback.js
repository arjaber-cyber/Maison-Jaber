// netlify/functions/admin-feedback.js
//
// Feedback tab of the dashboard. Admin-gated like every admin function.
// GET  -> { feedback: [...], requested, redeemed }
// POST { action: 'update', id, useInPromos?, adminNote? }

const { isAdminRequest } = require('./_admin-check');
const { SUPABASE_URL, SUPABASE_KEY } = require('./_pricing');

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error((data && data.message) || `Supabase ${res.status}`);
  return data;
}

exports.handler = async (event) => {
  if (!isAdminRequest(event)) return json(401, { error: 'Not authorized.' });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return json(503, { error: 'SUPABASE_SERVICE_ROLE_KEY still needs to be added in Netlify.' });
  try {
    if (event.httpMethod === 'GET') {
      const [feedback, requested, codes] = await Promise.all([
        sb('customer_feedback?select=*&order=created_at.desc&limit=2000'),
        sb('orders?review_requested_at=not.is.null&select=id&limit=10000'),
        sb('discount_codes?template_name=eq.Feedback%20reward&select=code,uses_count&limit=10000'),
      ]);
      return json(200, { feedback, requested: requested.length, redeemed: codes.filter(c => c.uses_count > 0).length });
    }
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    let p; try { p = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }
    if (p.action === 'update' && /^[0-9a-f-]{36}$/i.test(String(p.id || ''))) {
      const patch = {};
      if (typeof p.useInPromos === 'boolean') patch.use_in_promos = p.useInPromos;
      if (typeof p.adminNote === 'string') patch.admin_note = p.adminNote.slice(0, 1000) || null;
      const rows = await sb(`customer_feedback?id=eq.${p.id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
      return json(200, { ok: true, row: rows[0] });
    }
    return json(400, { error: 'Unknown action.' });
  } catch (e) {
    console.error('admin-feedback', e);
    return json(500, { error: 'Could not load feedback.' });
  }
};
