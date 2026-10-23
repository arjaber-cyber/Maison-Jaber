// netlify/functions/_attribution.js
//
// "Where did this customer come from?" (Oct 2026)
// Checkout sends what analytics.js remembered on the visitor's device: the
// tagged link / ad / post they arrived from (first time and most recent),
// the site that sent them and the page they landed on. This turns it into
// plain words for the dashboard and saves it on the order (orders.attribution).
//
// Saved in its own update AFTER the order is created, so a problem here can
// never stop someone from ordering.

const { _sourceOf: sourceOf } = require('./visit');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = () => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' });

const clip = (v, n = 120) => (v == null || v === '' ? null : String(v).slice(0, n));
const CODE = /^[a-z0-9-]{2,40}$/;

function cleanTouch(t) {
  if (!t || typeof t !== 'object') return null;
  const ts = Number(t.ts);
  return {
    src: clip(t.src, 60), med: clip(t.med, 60), cmp: clip(t.cmp), cnt: clip(t.cnt), trm: clip(t.trm),
    hk: CODE.test(String(t.hk || '').toLowerCase()) ? String(t.hk).toLowerCase() : null,
    rh: clip(t.rh), lp: clip(t.lp, 160), clk: ['meta', 'google', 'tiktok'].includes(t.clk) ? t.clk : null,
    fbc: /^fb\.1\.\d+\.[\w-]+$/.test(String(t.fbc || '')) ? String(t.fbc).slice(0, 520) : null,
    ts: Number.isFinite(ts) && ts > 1.7e12 && ts < Date.now() + 864e5 ? ts : null,
  };
}

async function linksByCode(codes) {
  const list = [...new Set(codes.filter(Boolean))];
  if (!list.length || !SUPABASE_KEY) return {};
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/tracked_links?code=in.(${list.map(encodeURIComponent).join(',')})&select=code,name,channel`, { headers: H() });
    if (!r.ok) return {};
    return Object.fromEntries((await r.json()).map(l => [l.code, l]));
  } catch { return {}; }
}

// Plain words: { source: 'Instagram ad', detail: 'Eid reel' }
function describe(t, links, ua) {
  if (!t) return { source: 'Unknown', detail: null };
  const link = t.hk && links[t.hk];
  if (link) return { source: link.channel || 'Tracked link', detail: link.name, link: t.hk };
  let source = sourceOf({ utmSource: t.src, utmMedium: t.med, refHost: t.rh, ua: '' });
  if (source === 'Direct' && t.clk === 'meta') source = /instagram/i.test(ua || '') ? 'Instagram ad' : 'Meta ad';
  if (source === 'Direct' && t.clk === 'google') source = 'Google ad';
  if (source === 'Internal') source = 'Direct';
  const detail = [...new Set([t.cmp, t.cnt].filter(Boolean))].join(' · ') || (source === 'Google' && t.trm ? `search: ${t.trm}` : null);
  return { source, detail, link: t.hk || null };
}

async function buildAttribution(input, event) {
  if (!input || typeof input !== 'object') return null;
  const first = cleanTouch(input.first);
  const last = cleanTouch(input.last);
  if (!first && !last) return null;
  const h = (event && event.headers) || {};
  const ua = h['user-agent'] || '';
  const links = await linksByCode([first && first.hk, last && last.hk]);
  const now = describe(last || first, links, ua);
  const orig = describe(first || last, links, ua);
  const marketing = input.marketing === true;
  const out = {
    source: now.source, detail: now.detail || null, link: now.link || null,
    first_source: orig.source, first_detail: orig.detail || null, first_link: orig.link || null,
    landing: (last || first).lp, first_seen: first && first.ts ? new Date(first.ts).toISOString() : null,
    visits: Number.isInteger(input.visits) && input.visits > 0 && input.visits < 10000 ? input.visits : null,
    lang: clip(input.lang, 5),
    clarity: input.clarity && /^[\w-]{4,40}$/.test(String(input.clarity.u || '')) && /^[\w-]{4,40}$/.test(String(input.clarity.s || ''))
      ? { u: String(input.clarity.u), s: String(input.clarity.s) } : null,
    marketing,
    first, last,
  };
  // Only for Meta's Conversions API, and only when the visitor accepted marketing cookies.
  if (marketing) {
    out.meta = {
      fbc: (last && last.fbc) || (first && first.fbc) || null,
      fbp: /^fb\.\d\.\d+\.\d+$/.test(String(input.fbp || '')) ? String(input.fbp) : null,
      ip: clip(h['x-nf-client-connection-ip'] || (h['x-forwarded-for'] || '').split(',')[0].trim(), 64),
      ua: clip(ua, 400),
    };
  }
  return out;
}

// Best effort: never throws, never blocks the order.
async function saveAttribution(orderId, input, event) {
  if (!orderId || !SUPABASE_KEY) return null;
  try {
    const attribution = await buildAttribution(input, event);
    if (!attribution) return null;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: 'PATCH', headers: { ...H(), Prefer: 'return=minimal' }, body: JSON.stringify({ attribution }),
    });
    if (!r.ok) console.warn('attribution save failed', r.status, (await r.text()).slice(0, 200));
    return attribution;
  } catch (e) {
    console.warn('attribution error', e && e.message);
    return null;
  }
}

module.exports = { saveAttribution, buildAttribution, describe, cleanTouch };
