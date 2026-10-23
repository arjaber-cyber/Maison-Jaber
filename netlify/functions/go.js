// netlify/functions/go.js
//
// Short tracked links (Oct 2026): maison-jaber.com/go/eid-reel
// Made in the dashboard (Customers tab > Link maker). Counts the click, then
// sends the visitor to the page with the link's tags (utm_* + hk=<code>).
// analytics.js remembers the tags for the order and removes them from the
// address bar, so the customer only ever sees a clean link.
//
// Unknown codes still land on the shop, never on an error page.

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = () => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' });
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|meta-externalagent|whatsapp|telegram|headless|lighthouse|python|curl|wget/i;
const CODE = /^[a-z0-9-]{2,40}$/;

const redirect = (to) => ({ statusCode: 302, headers: { Location: to, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }, body: '' });

function safeDestination(dest) {
  const d = String(dest || '').trim();
  // Only pages on our own site.
  if (/^\/(?!\/)[\w\-./?=&%#]*$/.test(d)) return d;
  return '/hikaya/';
}

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const raw = String(q.c || (event.path || '').split('/go/')[1] || '').toLowerCase().replace(/\/+$/, '');
  if (!CODE.test(raw) || !SUPABASE_KEY) return redirect('/hikaya/');

  const ua = (event.headers || {})['user-agent'] || '';
  const countIt = ua && !BOT.test(ua);
  let link = null;
  try {
    if (countIt) {
      // Atomic +1 and read in one go.
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/tracked_link_click`, { method: 'POST', headers: H(), body: JSON.stringify({ p_code: raw }) });
      if (r.ok) { const rows = await r.json(); link = Array.isArray(rows) ? rows[0] : rows; }
    }
    if (!link) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/tracked_links?code=eq.${encodeURIComponent(raw)}&select=*`, { headers: H() });
      if (r.ok) link = (await r.json())[0] || null;
    }
  } catch (e) {
    console.warn('go: lookup failed', e && e.message);
  }
  if (!link || link.active === false) return redirect('/hikaya/');

  const dest = safeDestination(link.destination);
  const [pathAndQuery, hash] = dest.split('#');
  const u = new URL(pathAndQuery, 'https://maison-jaber.com');
  const set = (k, v) => { if (v) u.searchParams.set(k, v); };
  set('utm_source', link.utm_source);
  set('utm_medium', link.utm_medium);
  set('utm_campaign', link.utm_campaign || link.name);
  set('utm_content', link.code);
  set('hk', link.code);
  return redirect(u.pathname + u.search + (hash ? '#' + hash : ''));
};
