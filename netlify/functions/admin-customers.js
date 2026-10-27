// netlify/functions/admin-customers.js
//
// Customers tab of the dashboard (Oct 2026). Admin-only.
//
// GET ?range=7d|30d|90d|all  (default 30d) ->
//   sources      paid orders grouped by where the customer came from (latest visit and first visit)
//   links        tracked short links: clicks, orders, revenue
//   customers    everyone who bought, repeat buyers first-class
//   unpaid       checkouts that reached payment but were never paid
//   whatsapp     WhatsApp button clicks
//   search       Google Search Console (when connected)
//   setup        what still needs a one-time step (database columns, Meta, Google)
//
// POST { action: 'create_link', name, channel, destination, code?, promoCode? }
// POST { action: 'update_link', code, active }
// POST { action: 'delete_link', code }

const { isAdminRequest } = require('./_admin-check');
const { searchSummary, configured: gscConfigured } = require('./_gsc');
const { enabled: metaEnabled } = require('./_meta');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = (extra) => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', ...(extra || {}) });
const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

// Where a link will be posted -> the tags it carries (and the name shown on orders).
const CHANNELS = {
  'Instagram': { s: 'instagram', m: 'social' },
  'Instagram story': { s: 'instagram', m: 'story' },
  'Instagram ad': { s: 'instagram', m: 'paid' },
  'TikTok': { s: 'tiktok', m: 'social' },
  'TikTok ad': { s: 'tiktok', m: 'paid' },
  'Facebook': { s: 'facebook', m: 'social' },
  'Snapchat': { s: 'snapchat', m: 'social' },
  'WhatsApp': { s: 'whatsapp', m: 'message' },
  'Email': { s: 'email', m: 'email' },
  'Influencer': { s: 'influencer', m: 'referral' },
  'Google ad': { s: 'google', m: 'paid' },
  'Printed (QR / flyer)': { s: 'print', m: 'offline' },
  'Other': { s: 'other', m: 'link' },
};

const DAY = 864e5;
const PAID = new Set(['paid', 'pending_cod']);
const UNPAID = new Set(['awaiting_payment', 'failed', 'canceled', 'payment_start_failed']);
const typeOf = o => o.order_type || 'sale';
const aed = o => (o.charged_aed != null && o.charged_aed !== '' ? Number(o.charged_aed) : Number(o.amount) || 0);
const isSale = o => typeOf(o) === 'sale' && PAID.has(o.payment_status) && o.order_status !== 'cancelled';
const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: H(opts.headers) });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) { const e = new Error((data && data.message) || `Supabase ${res.status}`); e.status = res.status; e.code = data && data.code; throw e; }
  return { data, res };
}

const ORDER_COLS = 'id,order_number,created_at,full_name,email,phone,country,city,payment_status,order_status,order_type,payment_method,charged_aed,amount,currency,promo_code,items';

async function loadOrders() {
  try {
    const { data } = await sb(`orders?select=${ORDER_COLS},attribution&order=created_at.desc&limit=5000`);
    return { orders: data || [], hasAttribution: true };
  } catch (e) {
    // The attribution column is added by the one-time SQL step; keep working without it.
    const { data } = await sb(`orders?select=${ORDER_COLS}&order=created_at.desc&limit=5000`);
    return { orders: data || [], hasAttribution: false };
  }
}

async function loadLinks() {
  try { const { data } = await sb('tracked_links?select=*&order=created_at.desc'); return { links: data || [], ok: true }; }
  catch { return { links: [], ok: false }; }
}

async function countEvents(event, from) {
  try {
    const { res } = await sb(`site_events?select=id&event=eq.${event}${from ? `&created_at=gte.${from.toISOString()}` : ''}&limit=1`, { headers: { Prefer: 'count=exact' } });
    const m = /\/(\d+)$/.exec(res.headers.get('content-range') || '');
    return m ? Number(m[1]) : null;
  } catch { return null; }
}

function bump(map, key, o, extra) {
  const k = key || 'Unknown';
  const r = map.get(k) || { name: k, orders: 0, revenue: 0, emails: new Set(), detail: new Map() };
  r.orders += 1; r.revenue += aed(o); if (o.email) r.emails.add(o.email.toLowerCase());
  if (extra) r.detail.set(extra, (r.detail.get(extra) || 0) + 1);
  map.set(k, r);
}
const finish = map => [...map.values()]
  .map(r => ({ name: r.name, orders: r.orders, revenue: Math.round(r.revenue * 100) / 100, customers: r.emails.size, top: [...r.detail.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => ({ name: n, orders: c })) }))
  .sort((a, b) => b.orders - a.orders || b.revenue - a.revenue);

function summarise(orders, links, from) {
  const inRange = o => !from || new Date(o.created_at) >= from;
  const byPromo = Object.fromEntries(links.filter(l => l.promo_code).map(l => [String(l.promo_code).toUpperCase(), l]));
  const byCode = Object.fromEntries(links.map(l => [l.code, l]));

  // Where the order came from: the tagged link / ad / site, else the post's discount code.
  const attrOf = o => {
    const a = o.attribution || null;
    const promoLink = o.promo_code && byPromo[String(o.promo_code).toUpperCase()];
    if (a && a.link && byCode[a.link]) return { source: a.source, detail: a.detail, link: a.link, first: a.first_source, firstDetail: a.first_detail, firstLink: a.first_link };
    if (promoLink && (!a || ['Direct', 'Unknown'].includes(a.source))) {
      return { source: promoLink.channel, detail: promoLink.name + ' (code)', link: promoLink.code, first: a ? a.first_source : promoLink.channel, firstDetail: a ? a.first_detail : null, firstLink: a ? a.first_link : null };
    }
    if (!a) return { source: 'Not recorded', detail: null, link: null, first: 'Not recorded', firstDetail: null, firstLink: null };
    return { source: a.source, detail: a.detail, link: a.link, first: a.first_source, firstDetail: a.first_detail, firstLink: a.first_link };
  };

  const sales = orders.filter(isSale);
  const rangeSales = sales.filter(inRange);
  const last = new Map(), first = new Map();
  rangeSales.forEach(o => { const a = attrOf(o); bump(last, a.source, o, a.detail); bump(first, a.first, o, a.firstDetail); });

  // Links: clicks (all time, counted by /go/), orders and revenue in the range.
  const linkStats = links.map(l => ({ code: l.code, name: l.name, channel: l.channel, destination: l.destination, promo_code: l.promo_code || null, active: l.active !== false, clicks: l.clicks || 0, created_at: l.created_at, orders: 0, revenue: 0, firstOrders: 0 }));
  const ls = Object.fromEntries(linkStats.map(l => [l.code, l]));
  rangeSales.forEach(o => {
    const a = attrOf(o);
    if (a.link && ls[a.link]) { ls[a.link].orders += 1; ls[a.link].revenue += aed(o); }
    if (a.firstLink && a.firstLink !== a.link && ls[a.firstLink]) ls[a.firstLink].firstOrders += 1;
  });
  linkStats.forEach(l => { l.revenue = Math.round(l.revenue * 100) / 100; });

  // Customers (all time): grouped by email.
  const cust = new Map();
  sales.slice().reverse().forEach(o => { // oldest first
    const k = String(o.email || '').toLowerCase(); if (!k) return;
    const a = attrOf(o);
    const c = cust.get(k) || { email: o.email, name: o.full_name, phone: o.phone, country: o.country, orders: 0, spent: 0, books: 0, firstOrder: o.created_at, lastOrder: o.created_at, firstSource: a.first || a.source, numbers: [] };
    let books = 1; try { books = JSON.parse(o.items || '[]').length || 1; } catch {}
    c.orders += 1; c.spent += aed(o); c.books += books; c.lastOrder = o.created_at; c.name = o.full_name || c.name; c.phone = o.phone || c.phone;
    c.numbers.push(o.order_number);
    cust.set(k, c);
  });
  const customers = [...cust.values()].map(c => ({ ...c, spent: Math.round(c.spent * 100) / 100, repeat: c.orders > 1 })).sort((a, b) => new Date(b.lastOrder) - new Date(a.lastOrder));
  const repeat = customers.filter(c => c.repeat);
  const repeatBySource = new Map();
  customers.forEach(c => { const r = repeatBySource.get(c.firstSource) || { name: c.firstSource, customers: 0, repeat: 0 }; r.customers += 1; if (c.repeat) r.repeat += 1; repeatBySource.set(c.firstSource, r); });

  // Reached payment but never paid (and didn't pay later with another order).
  const paidAfter = (email, at) => sales.some(s => String(s.email || '').toLowerCase() === email && new Date(s.created_at) >= at);
  const hourAgo = Date.now() - 3600e3;
  const unpaid = orders.filter(o => inRange(o) && UNPAID.has(o.payment_status) && typeOf(o) === 'sale'
      && !(o.payment_status === 'awaiting_payment' && new Date(o.created_at).getTime() > hourAgo)
      && !paidAfter(String(o.email || '').toLowerCase(), new Date(o.created_at)))
    .map(o => { const a = attrOf(o); let books = 0; try { books = JSON.parse(o.items || '[]').length; } catch {} return { order_number: o.order_number, created_at: o.created_at, name: o.full_name, email: o.email, phone: o.phone, country: o.country, amount: aed(o), method: o.payment_method, status: o.payment_status, books, source: a.source, detail: a.detail }; });

  const revenue = rangeSales.reduce((s, o) => s + aed(o), 0);
  const fromAds = rangeSales.filter(o => /\bad\b|\(ad\)/i.test(attrOf(o).source || '')).length;
  const recorded = rangeSales.filter(o => o.attribution).length;
  return {
    kpis: {
      orders: rangeSales.length, revenue: Math.round(revenue * 100) / 100, fromAds,
      newCustomers: customers.filter(c => !from || new Date(c.firstOrder) >= from).length,
      customers: customers.length, repeatCustomers: repeat.length,
      repeatRate: customers.length ? Math.round((repeat.length / customers.length) * 100) : 0,
      avgOrder: rangeSales.length ? Math.round((revenue / rangeSales.length) * 100) / 100 : 0,
      unpaid: unpaid.length, unpaidValue: Math.round(unpaid.reduce((s, u) => s + u.amount, 0) * 100) / 100,
      recorded,
    },
    sources: { last: finish(last), first: finish(first) },
    links: linkStats,
    customers: customers.slice(0, 200),
    repeatBySource: [...repeatBySource.values()].sort((a, b) => b.customers - a.customers),
    unpaid: unpaid.slice(0, 100),
  };
}

function rangeStart(range) {
  const dubaiMidnight = () => { const s = new Date(Date.now() + 4 * 3600e3); s.setUTCHours(0, 0, 0, 0); return new Date(s.getTime() - 4 * 3600e3); };
  const days = { '7d': 7, '30d': 30, '90d': 90 }[range];
  return days ? new Date(dubaiMidnight().getTime() - (days - 1) * DAY) : null;
}

async function createLink(p) {
  const name = String(p.name || '').trim().slice(0, 80);
  if (!name) return json(400, { error: 'Give the link a name, e.g. "Eid reel".' });
  const channel = CHANNELS[p.channel] ? p.channel : 'Other';
  let destination = String(p.destination || '/hikaya/').trim();
  try { // Accept a full maison-jaber.com address too.
    if (/^https?:\/\//i.test(destination)) {
      const u = new URL(destination);
      if (!/(^|\.)maison-jaber\.com$/i.test(u.hostname)) return json(400, { error: 'The link must go to a page on maison-jaber.com.' });
      destination = u.pathname + u.search + u.hash;
    }
  } catch { return json(400, { error: 'That page address does not look right.' }); }
  if (!/^\/(?!\/)/.test(destination)) destination = '/hikaya/' + destination.replace(/^\/+/, '');
  let code = slug(p.code || name) || 'link';
  const promo = p.promoCode ? String(p.promoCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 30) : null;

  // Pick a free code: eid-reel, eid-reel-2, ...
  const { data: taken } = await sb(`tracked_links?select=code&code=like.${encodeURIComponent(code)}*`);
  const used = new Set((taken || []).map(t => t.code));
  if (used.has(code)) { let n = 2; while (used.has(`${code}-${n}`)) n++; code = `${code.slice(0, 36)}-${n}`; }

  const row = { code, name, channel, destination, utm_source: CHANNELS[channel].s, utm_medium: CHANNELS[channel].m, utm_campaign: slug(name), promo_code: promo, active: true, clicks: 0 };
  const { data } = await sb('tracked_links', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
  return json(200, { link: data[0] });
}

exports.handler = async (event) => {
  if (!isAdminRequest(event)) return json(401, { error: 'Not authorized.' });
  if (!SUPABASE_KEY) return json(500, { error: 'Server key missing.' });

  try {
    if (event.httpMethod === 'POST') {
      let p; try { p = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }
      if (p.action === 'create_link') return await createLink(p);
      const code = slug(p.code);
      if (!code) return json(400, { error: 'Missing link.' });
      if (p.action === 'update_link') {
        const patch = {};
        if (typeof p.active === 'boolean') patch.active = p.active;
        if (p.name) patch.name = String(p.name).trim().slice(0, 80);
        await sb(`tracked_links?code=eq.${code}`, { method: 'PATCH', body: JSON.stringify(patch) });
        return json(200, { ok: true });
      }
      if (p.action === 'delete_link') {
        await sb(`tracked_links?code=eq.${code}`, { method: 'DELETE' });
        return json(200, { ok: true });
      }
      return json(400, { error: 'Unknown action.' });
    }

    const range = (event.queryStringParameters || {}).range || '30d';
    const from = rangeStart(range);
    const [{ orders, hasAttribution }, { links, ok: linksOk }, whatsapp, search, members] = await Promise.all([
      loadOrders(), loadLinks(), countEvents('whatsapp_click', from), searchSummary(28), loadMembers(),
    ]);
    return json(200, {
      range, from: from ? from.toISOString() : null,
      ...summarise(orders, links, from),
      whatsapp,
      search,
      members,
      channels: Object.keys(CHANNELS),
      setup: { attribution: hasAttribution, links: linksOk, meta: metaEnabled(), google: gscConfigured() },
    });
  } catch (err) {
    console.error('admin-customers error', err);
    if (err.code === '42P01' || /tracked_links/.test(err.message || '')) return json(503, { error: 'Links need the one-time database step first.', setup: true });
    return json(500, { error: 'Could not load customer data.' });
  }
};

exports._summarise = summarise;

// Verified WhatsApp members and their offers consent (customer_phones, Oct 2026).
async function loadMembers() {
  try {
    const { data } = await sb('customer_phones?verified_at=not.is.null&select=email,phone,verified_at,marketing_optin,optin_at,optout_at&order=verified_at.desc&limit=1000');
    const rows = data || [];
    return { total: rows.length, optedIn: rows.filter(r => r.marketing_optin).length, rows };
  } catch (e) { return { total: 0, optedIn: 0, rows: [], error: true }; }
}
