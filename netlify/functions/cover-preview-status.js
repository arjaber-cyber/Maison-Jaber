// netlify/functions/cover-preview-status.js
//
// Backup route for the free cover preview's status checks (Nov 2026).
// Some phones (seen on iPhone + mobile data) lose their connection to the Supabase server mid-wait while
// maison-jaber.com itself still loads fine, so the page sat on "Connection lost. Reconnecting…" even though
// the cover was ready. When a direct check fails, the page asks this same-site endpoint instead, which passes
// the check on to the cover-preview-live function server-to-server.
//
// Only the read-only actions are passed on ("status" and "quota"); starting a preview always goes direct.
// Nothing is stored or logged here; the customer's own sign-in token / guest key is forwarded unchanged,
// so the Supabase function applies exactly the same ownership checks.

const FN = 'https://zxzlarlpoctpnnnvzced.supabase.co/functions/v1/cover-preview-live';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  if ((event.body || '').length > 4000) return json(413, { error: 'too large' });
  let p;
  try { p = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'bad json' }); }
  if (p.action !== 'status' && p.action !== 'quota') return json(400, { code: 'action' });

  const h = event.headers || {};
  const auth = String(h.authorization || h.Authorization || '');
  const ip = String(h['x-nf-client-connection-ip'] || '').trim();
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch(FN, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: /^Bearer [\w.-]+$/.test(auth) ? auth : 'Bearer ' + ANON, ...(ip ? { 'x-forwarded-for': ip } : {}) },
      body: JSON.stringify(p),
    });
    return json(r.status, await r.text());
  } catch (e) {
    return json(502, { code: 'upstream' });
  } finally { clearTimeout(to); }
};
