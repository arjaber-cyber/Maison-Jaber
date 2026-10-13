// netlify/functions/_crm.js
//
// Shared CRM logic for the dashboard's CRM tab (crm-contacts.js, crm-campaigns.js,
// crm-unsubscribe.js, crm-track.js):
//
//   loadContacts()      one list of everyone we have an email for, merged from orders,
//                       newsletter sign-ups, accounts, abandoned carts, contact messages
//                       and contacts added by hand (crm_contacts holds tags, notes,
//                       language and marketing consent on top of that).
//   matchAudience()     the segment rules used for the live count AND the real send.
//   renderCampaign()    a campaign (blocks, EN + AR) -> branded HTML, the same shell as
//                       every other Hikaya email.
//
// Marketing consent rules (UAE/GCC practice; every email carries an unsubscribe link):
//   unsubscribed / bounced         -> never receives campaigns
//   newsletter or marked opted in  -> "subscribed", receives campaigns
//   bought from us (not a test)    -> "customer" (soft opt-in), receives campaigns
//   everyone else (carts, contact  -> "not opted in": left out unless the campaign
//   form, accounts with no order)     explicitly includes them

const { emailShell, ui, esc, C, SANS, SITE_URL, CUSTOMER_EMAIL } = require('./_email');
const { orderLang, parseItems } = require('./_templates');
const { SUPABASE_URL, SUPABASE_KEY, AED_PER_UNIT } = require('./_pricing');

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const emailRe = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/;
const normEmail = e => String(e || '').trim().toLowerCase();
const DAY = 864e5;

/* Public base for function links in emails (tracking, unsubscribe). */
const PUBLIC_BASE = (process.env.PUBLIC_BASE_URL || new URL(SITE_URL).origin).replace(/\/$/, '');
const FN = `${PUBLIC_BASE}/.netlify/functions/`;

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) { const e = new Error((data && data.message) || `Supabase ${res.status}`); e.status = res.status; e.code = data && data.code; throw e; }
  return data;
}
const rpc = (fn, args) => sb(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args || {}) });
/* Optional sources: a missing table must never break the CRM. */
const soft = p => p.catch(e => { console.warn('[crm] source skipped:', e.message); return []; });

/* ---------- Money (AED), same rules as the Orders tab ---------- */
function orderAed(o) {
  if (o.charged_aed != null && o.charged_aed !== '') return Number(o.charged_aed);
  const n = parseFloat(o.amount); if (isNaN(n)) return 0;
  return n * (AED_PER_UNIT[(o.currency || 'AED').toUpperCase()] || 1);
}
const orderCounts = o => !['refunded', 'failed'].includes(o.payment_status) && o.order_status !== 'cancelled';
const orderIsSale = o => !o.order_type || o.order_type === 'sale';
const orderEarned = o => orderCounts(o) && orderIsSale(o) && ['paid', 'pending_cod'].includes(o.payment_status);
/* Received a book from us (paid, cash on delivery, or a free/gift order) -> a real customer. */
const orderReal = o => orderCounts(o) && o.order_type !== 'test' && ['paid', 'pending_cod', 'waived'].includes(o.payment_status);

async function authUsers() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!r.ok) break;
    const d = await r.json();
    const users = d.users || [];
    out.push(...users);
    if (users.length < 1000) break;
  }
  return out;
}

/* ---------- Everyone we can email, merged by address ---------- */
async function loadContacts({ withEngagement = true } = {}) {
  const [orders, subs, carts, msgs, users, meta, sends] = await Promise.all([
    soft(sb('orders?select=id,order_number,email,full_name,phone,country,city,amount,currency,charged_aed,payment_status,order_status,order_type,promo_code,items,created_at&order=created_at.asc&limit=10000')),
    soft(sb('newsletter_subscribers?select=email,lang,subscribed_at&limit=20000')),
    soft(sb('abandoned_carts?select=email,child_name,story,age_edition,completed,last_seen_at,created_at&limit=20000')),
    soft(sb('contact_messages?select=id,name,email,order_number,message,created_at,handled&order=created_at.asc&limit=20000')),
    soft(authUsers()),
    soft(sb('crm_contacts?select=*&limit=20000')),
    withEngagement ? soft(sb('crm_sends?select=email,status,sent_at,opened_at,clicked_at&status=eq.sent&limit=50000')) : [],
  ]);

  const map = new Map();
  const get = (email) => {
    const e = normEmail(email);
    if (!emailRe.test(e)) return null;
    if (!map.has(e)) map.set(e, {
      email: e, name: '', lang: null, country: '', city: '', phone: '', tags: [], notes: '',
      marketing_status: 'unknown', added_manually: false, bounced: false,
      sources: [], orders: 0, paidOrders: 0, spent: 0, books: 0, lastOrderAt: null, firstOrderAt: null, lastOrderNo: '',
      newsletter: false, subscribedAt: null, account: false, cart: null, messages: 0, openMessages: 0,
      firstSeenAt: null, lastSeenAt: null, emailsSent: 0, opened: 0, clicked: 0, lastEmailAt: null, codesUsed: [],
    });
    return map.get(e);
  };
  const add = (c, src) => { if (!c.sources.includes(src)) c.sources.push(src); };
  const seen = (c, at) => {
    if (!at) return; const t = new Date(at).toISOString();
    if (!c.firstSeenAt || t < c.firstSeenAt) c.firstSeenAt = t;
    if (!c.lastSeenAt || t > c.lastSeenAt) c.lastSeenAt = t;
  };
  const orderLangOf = new Map();

  for (const o of orders) {
    const c = get(o.email); if (!c) continue;
    add(c, 'order'); seen(c, o.created_at);
    if (o.full_name) c.name = o.full_name;
    if (o.phone) c.phone = o.phone;
    if (o.country) c.country = o.country;
    if (o.city) c.city = o.city;
    if (orderReal(o)) {
      c.orders++;
      c.books += parseItems(o).length || 1;
      if (!c.firstOrderAt) c.firstOrderAt = o.created_at;
      c.lastOrderAt = o.created_at; c.lastOrderNo = o.order_number || '';
      try { orderLangOf.set(c.email, orderLang(o)); } catch {}
    }
    if (orderEarned(o)) { c.paidOrders++; c.spent += orderAed(o); }
    if (o.promo_code && orderCounts(o)) c.codesUsed.push(o.promo_code);
  }
  for (const s of subs) {
    const c = get(s.email); if (!c) continue;
    add(c, 'newsletter'); c.newsletter = true; c.subscribedAt = s.subscribed_at; seen(c, s.subscribed_at);
    if (!c.lang && s.lang) c.lang = s.lang === 'ar' ? 'ar' : 'en';
  }
  for (const u of users) {
    const c = get(u.email); if (!c) continue;
    add(c, 'account'); c.account = true; seen(c, u.created_at); seen(c, u.last_sign_in_at);
    const um = u.user_metadata || {};
    if (!c.name && (um.full_name || um.name)) c.name = um.full_name || um.name;
  }
  for (const a of carts) {
    const c = get(a.email); if (!c) continue;
    add(c, 'cart'); seen(c, a.last_seen_at || a.created_at);
    if (!a.completed) c.cart = { story: a.story || '', child: a.child_name || '', age: a.age_edition || '', at: a.last_seen_at || a.created_at };
  }
  for (const m of msgs) {
    const c = get(m.email); if (!c) continue;
    add(c, 'contact'); seen(c, m.created_at); c.messages++; if (!m.handled) c.openMessages++;
    if (!c.name && m.name) c.name = m.name;
  }
  for (const r of meta) {
    const c = get(r.email); if (!c) continue;
    if (r.added_manually) add(c, 'manual');
    if (r.name) c.name = r.name;
    if (r.phone) c.phone = r.phone;
    if (r.country) c.country = r.country;
    if (r.lang) c.lang = r.lang;
    c.tags = r.tags || []; c.notes = r.notes || '';
    c.marketing_status = r.marketing_status || 'unknown';
    c.status_changed_at = r.status_changed_at; c.status_source = r.status_source;
    c.added_manually = !!r.added_manually; c.bounced = !!r.bounced;
    seen(c, r.created_at);
  }
  for (const s of sends) {
    const c = map.get(normEmail(s.email)); if (!c) continue;
    c.emailsSent++; if (s.opened_at) c.opened++; if (s.clicked_at) c.clicked++;
    if (!c.lastEmailAt || s.sent_at > c.lastEmailAt) c.lastEmailAt = s.sent_at;
  }

  const list = [...map.values()];
  for (const c of list) {
    if (!c.lang) c.lang = orderLangOf.get(c.email) || 'en';
    c.spent = Math.round(c.spent * 100) / 100;
    // A cart counts as abandoned only if they never bought after it.
    if (c.cart && c.lastOrderAt && new Date(c.lastOrderAt) >= new Date(c.cart.at)) c.cart = null;
    c.isCustomer = c.orders > 0;
    c.consent = consentOf(c);
    c.canEmail = c.consent === 'subscribed' || c.consent === 'customer';
  }
  list.sort((a, b) => String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || '')));
  return list;
}

function consentOf(c) {
  if (c.marketing_status === 'unsubscribed' || c.bounced) return 'unsubscribed';
  if (c.marketing_status === 'subscribed' || c.newsletter) return 'subscribed';
  if (c.isCustomer) return 'customer';
  return 'not_opted_in';
}

/* ---------- Segments (used by the live count and the real send) ---------- */
const SEGMENTS = {
  all: { label: 'Everyone', test: () => true },
  customers: { label: 'Customers', test: c => c.isCustomer },
  repeat: { label: 'Repeat customers (2+ orders)', test: c => c.orders >= 2 },
  subscribers: { label: 'Newsletter subscribers', test: c => c.consent === 'subscribed' },
  never_bought: { label: 'Never bought yet', test: c => !c.isCustomer },
  carts: { label: 'Left a story unfinished', test: c => !!c.cart },
  lapsed: { label: 'No order in 90+ days', test: c => c.isCustomer && Date.now() - new Date(c.lastOrderAt) > 90 * DAY },
  recent: { label: 'Bought in the last 30 days', test: c => c.isCustomer && Date.now() - new Date(c.lastOrderAt) <= 30 * DAY },
};

/* audience: { segment, lang: 'any'|'en'|'ar', country: 'any'|name, tag, emails: [..], includeUnconsented } */
function matchAudience(contacts, audience) {
  const a = audience || {};
  const picked = Array.isArray(a.emails) && a.emails.length ? new Set(a.emails.map(normEmail)) : null;
  const seg = SEGMENTS[a.segment] || SEGMENTS.all;
  return contacts.filter(c => {
    if (c.consent === 'unsubscribed') return false;                       // never, whatever the settings
    if (!c.canEmail && !a.includeUnconsented) return false;
    if (picked) return picked.has(c.email);
    if (!seg.test(c)) return false;
    if (a.lang && a.lang !== 'any' && c.lang !== a.lang) return false;
    if (a.country && a.country !== 'any' && c.country !== a.country) return false;
    if (a.tag && !(c.tags || []).includes(a.tag)) return false;
    return true;
  });
}

/* ---------- Rendering a campaign ---------- */
const L = l => (l === 'ar' ? 'ar' : 'en');
const slugify = s => String(s || 'campaign').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 40) || 'campaign';

/* Relative links point at the shop; links to our own site get GA4 campaign tags. */
function absUrl(u, utm) {
  let url = String(u || '').trim();
  if (!url) return SITE_URL;
  if (/^(mailto:|tel:|https?:\/\/wa\.me)/i.test(url)) return url;
  if (!/^https?:\/\//i.test(url)) url = SITE_URL + url.replace(/^\.?\//, '');
  try {
    const p = new URL(url);
    if (utm && /(^|\.)maison-jaber\.com$/i.test(p.hostname)) {
      if (!p.searchParams.has('utm_source')) p.searchParams.set('utm_source', 'hikaya_email');
      if (!p.searchParams.has('utm_medium')) p.searchParams.set('utm_medium', 'email');
      if (!p.searchParams.has('utm_campaign')) p.searchParams.set('utm_campaign', utm);
    }
    return p.toString();
  } catch { return url; }
}

function fill(text, ctx) {
  return String(text || '').replace(/\{\{\s*(first_name|name|code)\s*(?:\|([^}]*))?\}\}/g, (m, key, fb) => {
    const fallback = fb != null ? fb.trim() : (key === 'code' ? '' : (ctx.lang === 'ar' ? 'صديقنا' : 'there'));
    if (key === 'code') return ctx.code ? ctx.code.code : fallback;
    const nm = String(ctx.name || '').trim();
    const v = key === 'first_name' ? nm.split(/\s+/)[0] : nm;
    return v || fallback;
  });
}
/* Text blocks: escaped, then **bold**, *italic*, [label](url) and line breaks. */
function rich(text, ctx, link) {
  let s = esc(fill(text, ctx));
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:' + C.ink + ';">$1</strong>')
       .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
       .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => `<a href="${esc(link(href.replace(/&amp;/g, '&')))}" style="color:${C.brand}; font-weight:700;">${label}</a>`)
       .replace(/\n/g, '<br>');
  return s;
}

function offerLine(code, lang) {
  if (!code) return '';
  const v = Number(code.value);
  const t = {
    percent: [`${v}% off your order`, `خصم ${v}% على طلبك`],
    fixed: [`AED ${v} off your order`, `خصم ${v} درهم على طلبك`],
    free_shipping: ['Free delivery on your order', 'توصيل مجاني لطلبك'],
    free_order: ['A personalised book, on us', 'كتاب مخصّص هدية منّا'],
  }[code.type] || ['A special offer', 'عرض خاص'];
  return lang === 'ar' ? t[1] : t[0];
}

function storyCard(story, note, lang, link) {
  if (!story) return '';
  const title = lang === 'ar' && story.title_ar ? story.title_ar : story.title;
  const prem = story.premise && typeof story.premise === 'object' ? story.premise : {};
  const line = note || (lang === 'ar' ? prem.ar : prem.en) || (lang === 'ar' ? '' : story.description) || '';
  const href = link(`story.html?s=${encodeURIComponent(story.slug)}`);
  const side = lang === 'ar' ? 'left' : 'right';
  const img = story.cover_image_url ? `<td width="112" style="width:112px; vertical-align:top; padding-${side}:16px;"><a href="${esc(href)}"><img src="${esc(story.cover_image_url)}" width="112" height="112" alt="" style="display:block; width:112px; height:112px; border-radius:12px; object-fit:cover; border:0;"></a></td>` : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.card}; border-radius:16px; margin:0 0 14px;"><tr><td style="padding:16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${img}<td style="vertical-align:middle;">${ui.h3(esc(title), lang)}${line ? `<p style="margin:0 0 10px; font-family:${SANS[lang]}; font-size:13.5px; line-height:1.55; color:${C.soft};">${esc(line)}</p>` : ''}<a href="${esc(href)}" style="font-family:${SANS[lang]}; font-size:13.5px; font-weight:700; color:${C.brand}; text-decoration:none;">${lang === 'ar' ? 'اكتشف القصة &larr;' : 'See the story &rarr;'}</a></td></tr></table></td></tr></table>`;
}

function codeBox(code, note, lang, ctx) {
  if (!code) return ctx.preview ? `<div style="border:1.5px dashed ${C.taupe}; border-radius:14px; padding:18px; margin:4px 0 16px; text-align:center; font-family:${SANS.en}; font-size:13px; color:${C.mute};">Discount code box: pick a code in the campaign settings</div>` : '';
  const until = code.expires_at ? new Date(code.expires_at).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' }) : '';
  const sub = note ? esc(fill(note, ctx)) : (until ? (lang === 'ar' ? `صالح حتى ${until}` : `Valid until ${until}`) : (lang === 'ar' ? 'أدخله عند الدفع' : 'Enter it at checkout'));
  return `<div style="background:${C.card}; border:1.5px dashed ${C.taupe}; border-radius:14px; padding:20px; margin:4px 0 16px; text-align:center;">
    <div style="font-family:${SANS[lang]}; font-size:11.5px; font-weight:700; letter-spacing:${lang === 'ar' ? '0' : '.14em'}; text-transform:uppercase; color:${C.brand};">${esc(offerLine(code, lang))}</div>
    <div dir="ltr" style="font-family:Menlo,Consolas,monospace; font-size:26px; font-weight:700; letter-spacing:.1em; color:${C.ink}; margin-top:8px;">${esc(code.code)}</div>
    <div style="font-family:${SANS[lang]}; font-size:12.5px; color:${C.mute}; margin-top:8px;">${sub}</div></div>`;
}

/* content[lang] = { subject, preheader, blocks: [{ t, ... }] }
   ctx = { lang, name, code (discount row), stories (slug -> row), utm, preview,
           linkFor(url) -> tracked url, footer: { unsubscribeUrl } , pixel } */
function renderCampaign(campaign, ctx) {
  const lang = L(ctx.lang);
  const ver = ((campaign.content || {})[lang]) || {};
  const link = href => {
    const abs = absUrl(href, ctx.utm);
    return ctx.linkFor ? ctx.linkFor(abs) : abs;
  };
  const parts = (ver.blocks || []).map(b => {
    switch (b.t) {
      case 'eyebrow': return b.text ? ui.eyebrow(esc(fill(b.text, ctx)), lang) : '';
      case 'heading': return b.text ? ui.h(esc(fill(b.text, ctx)), lang) : '';
      case 'subheading': return b.text ? ui.h3(esc(fill(b.text, ctx)), lang) + '<div style="height:6px;"></div>' : '';
      case 'text': return b.text ? ui.p(rich(b.text, ctx, link), lang) : '';
      case 'small': return b.text ? ui.p(rich(b.text, ctx, link), lang, true) : '';
      case 'hand': return b.text ? ui.hand(esc(fill(b.text, ctx)), lang) : '';
      case 'button': return b.label ? ui.button(link(b.url || 'stories.html'), esc(fill(b.label, ctx)), lang) : '';
      case 'image': {
        if (!b.url) return ctx.preview ? `<div style="background:${C.card}; border-radius:14px; padding:40px 16px; margin:0 0 16px; text-align:center; font-family:${SANS.en}; font-size:13px; color:${C.mute};">Image: paste an image link</div>` : '';
        const img = `<img src="${esc(absUrl(b.url))}" width="488" alt="${esc(b.alt || '')}" style="display:block; width:100%; max-width:488px; height:auto; border-radius:14px; border:0;">`;
        return `<div style="margin:0 0 18px;">${b.link ? `<a href="${esc(link(b.link))}">${img}</a>` : img}</div>`;
      }
      case 'story': return storyCard((ctx.stories || {})[b.slug], b.note ? fill(b.note, ctx) : '', lang, link);
      case 'code': return codeBox(ctx.code, b.note, lang, ctx);
      case 'divider': return `<div style="height:1px; background:${C.sand}; margin:8px 0 20px;"></div>`;
      case 'signoff': return ui.sign(lang);
      default: return '';
    }
  });

  const unsub = ctx.footer && ctx.footer.unsubscribeUrl;
  const footer = `<p style="margin:18px 0 0; font-family:${SANS[lang]}; font-size:11.5px; line-height:1.6; color:${C.mute};">${lang === 'ar'
    ? `وصلتك هذه الرسالة لأنك من عائلة حكاية${unsub ? `، يمكنك <a href="${esc(unsub)}" style="color:${C.mute}; text-decoration:underline;">إلغاء الاشتراك</a> في أي وقت` : ''}`
    : `You're receiving this because you're part of the Hikaya family.${unsub ? ` <a href="${esc(unsub)}" style="color:${C.mute}; text-decoration:underline;">Unsubscribe</a> any time.` : ''}`}</p>`;
  const pixel = ctx.pixel ? `<img src="${esc(ctx.pixel)}" width="1" height="1" alt="" style="display:block; width:1px; height:1px; border:0; opacity:0;">` : '';

  return {
    subject: fill(ver.subject || campaign.name || 'Hikaya', ctx).replace(/[\r\n]+/g, ' ').slice(0, 200),
    html: emailShell(parts.join('') + footer + pixel, { lang, preheader: ver.preheader ? fill(ver.preheader, ctx) : '' }),
  };
}

/* Which language a contact gets: the campaign's fixed language, or theirs (falling back
   to English if the campaign has no Arabic version yet). */
function langFor(campaign, contact) {
  const has = l => {
    const v = (campaign.content || {})[l];
    return v && v.subject && (v.blocks || []).length;
  };
  if (campaign.lang_mode === 'en' || campaign.lang_mode === 'ar') return campaign.lang_mode;
  const want = contact && contact.lang === 'ar' ? 'ar' : 'en';
  return has(want) ? want : (has('en') ? 'en' : 'ar');
}

/* Every link a campaign can contain (both languages), so tracked links are stable indexes. */
function collectLinks(campaign, stories) {
  const out = [];
  const ctxBase = { utm: slugify(campaign.name), stories, preview: false };
  for (const lang of ['en', 'ar']) {
    const v = (campaign.content || {})[lang];
    if (!v || !(v.blocks || []).length) continue;
    renderCampaign(campaign, { ...ctxBase, lang, name: '', linkFor: u => { if (!out.includes(u)) out.push(u); return u; } });
  }
  return out.slice(0, 200);
}

async function storiesFor(campaign) {
  const slugs = new Set();
  for (const v of Object.values(campaign.content || {})) for (const b of (v && v.blocks) || []) if (b.t === 'story' && b.slug) slugs.add(String(b.slug));
  if (!slugs.size) return {};
  const list = [...slugs].map(s => `"${s.replace(/"/g, '')}"`).join(',');
  const rows = await soft(sb(`stories?select=slug,title,title_ar,description,premise,cover_image_url&slug=in.(${encodeURIComponent(list)})`));
  return Object.fromEntries(rows.map(r => [r.slug, r]));
}
async function codeFor(campaign) {
  if (!campaign.discount_code) return null;
  const rows = await soft(sb(`discount_codes?code=eq.${encodeURIComponent(campaign.discount_code)}&select=code,type,value,expires_at,active`));
  return rows[0] || null;
}

module.exports = {
  sb, rpc, json, H, emailRe, normEmail, FN, PUBLIC_BASE, SEGMENTS, DAY,
  loadContacts, matchAudience, consentOf, renderCampaign, langFor, collectLinks, storiesFor, codeFor, slugify, absUrl,
  orderAed, orderEarned, orderCounts, orderReal, CUSTOMER_EMAIL,
};
