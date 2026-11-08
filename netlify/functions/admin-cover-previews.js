// netlify/functions/admin-cover-previews.js
//
// "Cover previews" tab of the dashboard (free AI cover preview). Admin-gated.
// GET  -> { rows: [...last 300 website previews, with a 10-minute link to the watermarked preview if not yet deleted],
//           settings: { mode, per_day, cap_aed, testers }, orders: [{ email, created_at }] (paid orders by people who previewed) }
// POST { action: 'settings', mode?, per_day?, cap_aed?, testers? }
//   mode: off (hidden), test (only the testers list), live (every signed-in customer)

const { isAdminRequest } = require('./_admin-check');
const { SUPABASE_URL, SUPABASE_KEY } = require('./_pricing');

const BUCKET = 'cover-previews';
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error((data && data.message) || `Supabase ${res.status}`);
  return data;
}

async function signMany(paths) {
  if (!paths.length) return {};
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}`, { method: 'POST', headers: H, body: JSON.stringify({ expiresIn: 600, paths }) });
  if (!res.ok) return {};
  const out = {};
  for (const r of await res.json()) if (r.signedURL && r.path) out[r.path] = `${SUPABASE_URL}/storage/v1${r.signedURL}`;
  return out;
}

const FLAG = { mode: 'cover_preview_mode', per_day: 'cover_preview_per_day', cap_aed: 'cover_preview_daily_cap_aed', testers: 'cover_preview_testers' };

exports.handler = async (event) => {
  if (!isAdminRequest(event)) return json(401, { error: 'Not authorized.' });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return json(503, { error: 'SUPABASE_SERVICE_ROLE_KEY still needs to be added in Netlify.' });
  try {
    if (event.httpMethod === 'GET') {
      const [rows, flags] = await Promise.all([
        sb('cover_previews?source=eq.site&select=id,created_at,status,email,story_slug,lang,child_name,child_age,child_gender,error,ms,cost_usd,qa_cost_usd,qa_status,review_notes,preview_path,purged_at&order=created_at.desc&limit=300'),
        sb(`app_flags?key=in.(${Object.values(FLAG).join(',')})&select=key,value`),
      ]);
      const f = Object.fromEntries(flags.map(x => [x.key, x.value]));
      const settings = { mode: f[FLAG.mode] || 'off', per_day: Number(f[FLAG.per_day] || 5), cap_aed: Number(f[FLAG.cap_aed] || 100), testers: f[FLAG.testers] || '' };
      const urls = await signMany(rows.filter(r => r.preview_path && !r.purged_at).slice(0, 60).map(r => r.preview_path));
      for (const r of rows) { r.preview_url = urls[r.preview_path] || null; delete r.preview_path; }
      const emails = [...new Set(rows.map(r => (r.email || '').toLowerCase()).filter(Boolean))].slice(0, 250);
      let orders = [];
      if (emails.length) {
        const list = emails.map(e => `"${e.replace(/"/g, '')}"`).join(',');
        orders = await sb(`orders?payment_status=in.(paid,waived)&email=in.(${encodeURIComponent(list)})&select=email,created_at&limit=2000`);
      }
      return json(200, { rows, settings, orders });
    }
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    let p; try { p = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }
    if (p.action === 'settings') {
      const up = [];
      if (p.mode !== undefined) { if (!['off', 'test', 'live'].includes(p.mode)) return json(400, { error: 'Mode must be off, test or live.' }); up.push([FLAG.mode, p.mode]); }
      if (p.per_day !== undefined) { const n = Math.round(Number(p.per_day)); if (!(n >= 0 && n <= 20)) return json(400, { error: 'Previews per day must be 0 to 20.' }); up.push([FLAG.per_day, String(n)]); }
      if (p.cap_aed !== undefined) { const n = Math.round(Number(p.cap_aed)); if (!(n >= 0 && n <= 2000)) return json(400, { error: 'Daily cap must be 0 to 2000 AED.' }); up.push([FLAG.cap_aed, String(n)]); }
      if (p.testers !== undefined) up.push([FLAG.testers, String(p.testers).toLowerCase().split(/[\s,;]+/).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)).join(', ')]);
      if (!up.length) return json(400, { error: 'Nothing to change.' });
      await sb('app_flags?on_conflict=key', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(up.map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }))) });
      return json(200, { ok: true });
    }
    return json(400, { error: 'Unknown action.' });
  } catch (e) {
    console.error('admin-cover-previews', e);
    return json(500, { error: 'Could not load cover previews.' });
  }
};
