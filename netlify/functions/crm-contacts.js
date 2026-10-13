// netlify/functions/crm-contacts.js
//
// Admin-only (x-admin-password). The CRM tab's contact list and inbox.
//
// GET                                   -> { contacts, messages, segments }
// POST { action: 'detail', email }      -> { orders, messages, emails } (timeline for one contact)
// POST { action: 'save', email, name?, lang?, phone?, country?, tags?, notes?, marketing_status? }
// POST { action: 'add', email, name?, lang?, tags?, consent? }       (add one contact by hand)
// POST { action: 'import', rows: [{ email, name?, lang?, tags? }], consent?, tags? }
// POST { action: 'bulk_tag', emails, tag, remove? }
// POST { action: 'bulk_status', emails, marketing_status }
// POST { action: 'remove', email }      (only contacts added by hand; customers stay)
// POST { action: 'message_handled', id, handled }
//
// Nobody marked "unsubscribed" is ever switched back by an import; only an explicit
// change on that contact can do that.

const { isAdminRequest } = require('./_admin-check');
const { sb, json, emailRe, normEmail, loadContacts, SEGMENTS, orderAed, orderEarned } = require('./_crm');
const { parseItems } = require('./_templates');

const STATUSES = ['subscribed', 'unsubscribed', 'unknown'];
const cleanTag = t => String(t || '').trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/\s+/g, '-').slice(0, 32);
const cleanTags = list => [...new Set((Array.isArray(list) ? list : String(list || '').split(/[,;|]/)).map(cleanTag).filter(Boolean))].slice(0, 20);
const cleanLang = l => (l === 'ar' || l === 'en' ? l : (/^(arabic|عربي|العربية)$/i.test(String(l || '').trim()) ? 'ar' : (/^english$/i.test(String(l || '').trim()) ? 'en' : null)));
const str = (v, n) => (v == null ? null : String(v).trim().slice(0, n) || null);
const now = () => new Date().toISOString();

async function existing(emails) {
  const out = new Map();
  for (let i = 0; i < emails.length; i += 80) {
    const chunk = emails.slice(i, i + 80).map(e => `"${e.replace(/"/g, '')}"`).join(',');
    const rows = await sb(`crm_contacts?select=*&email=in.(${encodeURIComponent(chunk)})`);
    rows.forEach(r => out.set(r.email, r));
  }
  return out;
}
async function upsert(rows) {
  for (let i = 0; i < rows.length; i += 500) {
    await sb('crm_contacts?on_conflict=email', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows.slice(i, i + 500)) });
  }
}
/* Same columns on every row so PostgREST accepts the bulk upsert. */
function row(base, prev, patch) {
  const r = Object.assign({
    email: base, name: null, lang: null, country: null, phone: null, tags: [], notes: null,
    marketing_status: 'unknown', status_source: null, status_changed_at: null, added_manually: false, updated_at: now(),
  }, prev ? {
    name: prev.name, lang: prev.lang, country: prev.country, phone: prev.phone, tags: prev.tags || [], notes: prev.notes,
    marketing_status: prev.marketing_status, status_source: prev.status_source, status_changed_at: prev.status_changed_at, added_manually: prev.added_manually,
  } : {}, patch);
  delete r.unsubscribe_token; delete r.created_at; delete r.bounced;
  return r;
}

exports.handler = async (event) => {
  if (!isAdminRequest(event)) return json(401, { error: 'Not authorized.' });

  try {
    if (event.httpMethod === 'GET') {
      const [contacts, messages] = await Promise.all([
        loadContacts(),
        sb('contact_messages?select=id,name,email,order_number,message,created_at,handled,handled_at&order=created_at.desc&limit=500').catch(() => []),
      ]);
      return json(200, {
        contacts, messages,
        segments: Object.fromEntries(Object.entries(SEGMENTS).map(([k, v]) => [k, v.label])),
        crmReady: true,
      });
    }
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    let b = {}; try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }
    const email = normEmail(b.email);

    switch (b.action) {
      case 'detail': {
        if (!emailRe.test(email)) return json(400, { error: 'Invalid email.' });
        const q = encodeURIComponent(email);
        const [orders, messages, sends] = await Promise.all([
          sb(`orders?select=id,order_number,created_at,amount,currency,charged_aed,payment_status,order_status,order_type,promo_code,items,country&email=ilike.${q}&order=created_at.desc&limit=100`).catch(() => []),
          sb(`contact_messages?select=id,message,order_number,created_at,handled&email=ilike.${q}&order=created_at.desc&limit=50`).catch(() => []),
          sb(`crm_sends?select=campaign_id,status,sent_at,opened_at,clicked_at,lang,crm_campaigns(name)&email=eq.${q}&order=created_at.desc&limit=100`).catch(() => []),
        ]);
        return json(200, {
          orders: orders.map(o => ({
            id: o.id, order_number: o.order_number, created_at: o.created_at, order_status: o.order_status, payment_status: o.payment_status,
            order_type: o.order_type || 'sale', promo_code: o.promo_code, aed: Math.round(orderAed(o) * 100) / 100, earned: orderEarned(o),
            books: parseItems(o).map(i => ({ story: i.storyTitle || i.story || i.title || '', child: i.childName || i.child_name || '', lang: i.bookLanguage || '' })),
          })),
          messages,
          emails: sends.map(s => ({ campaign: (s.crm_campaigns && s.crm_campaigns.name) || 'Campaign', status: s.status, sent_at: s.sent_at, opened_at: s.opened_at, clicked_at: s.clicked_at })),
        });
      }

      case 'save': {
        if (!emailRe.test(email)) return json(400, { error: 'Invalid email.' });
        const prev = (await existing([email])).get(email);
        const patch = {};
        if ('name' in b) patch.name = str(b.name, 120);
        if ('lang' in b) patch.lang = cleanLang(b.lang);
        if ('phone' in b) patch.phone = str(b.phone, 40);
        if ('country' in b) patch.country = str(b.country, 60);
        if ('tags' in b) patch.tags = cleanTags(b.tags);
        if ('notes' in b) patch.notes = str(b.notes, 4000);
        if ('marketing_status' in b) {
          if (!STATUSES.includes(b.marketing_status)) return json(400, { error: 'Unknown status.' });
          if (!prev || prev.marketing_status !== b.marketing_status) Object.assign(patch, { marketing_status: b.marketing_status, status_source: 'dashboard', status_changed_at: now() });
        }
        const r = row(email, prev, patch);
        await upsert([r]);
        // Unsubscribing in the CRM also takes them off the newsletter list.
        if (patch.marketing_status === 'unsubscribed') await sb(`newsletter_subscribers?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE' }).catch(() => {});
        return json(200, { ok: true, contact: r });
      }

      case 'add': {
        if (!emailRe.test(email)) return json(400, { error: 'Please enter a valid email address.' });
        const prev = (await existing([email])).get(email);
        const keepUnsub = prev && prev.marketing_status === 'unsubscribed';
        const r = row(email, prev, {
          name: str(b.name, 120) || (prev && prev.name) || null,
          lang: cleanLang(b.lang) || (prev && prev.lang) || null,
          tags: cleanTags([...((prev && prev.tags) || []), ...cleanTags(b.tags)]),
          added_manually: true,
          ...(b.consent && !keepUnsub ? { marketing_status: 'subscribed', status_source: 'added in dashboard', status_changed_at: now() } : {}),
        });
        await upsert([r]);
        return json(200, { ok: true, contact: r, keptUnsubscribed: !!keepUnsub });
      }

      case 'import': {
        const raw = Array.isArray(b.rows) ? b.rows.slice(0, 5000) : [];
        const extraTags = cleanTags(b.tags);
        const seen = new Map(); let invalid = 0;
        for (const x of raw) {
          const e = normEmail(x && x.email);
          if (!emailRe.test(e)) { invalid++; continue; }
          seen.set(e, x);
        }
        const emails = [...seen.keys()];
        if (!emails.length) return json(400, { error: 'No valid email addresses found.' });
        const prevMap = await existing(emails);
        let kept = 0;
        const rows = emails.map(e => {
          const x = seen.get(e), prev = prevMap.get(e);
          const unsub = prev && prev.marketing_status === 'unsubscribed';
          if (unsub) kept++;
          return row(e, prev, {
            name: str(x.name, 120) || (prev && prev.name) || null,
            lang: cleanLang(x.lang) || (prev && prev.lang) || null,
            tags: cleanTags([...((prev && prev.tags) || []), ...cleanTags(x.tags), ...extraTags]),
            added_manually: prev ? prev.added_manually : true,
            ...(b.consent && !unsub && (!prev || prev.marketing_status !== 'subscribed') ? { marketing_status: 'subscribed', status_source: 'import', status_changed_at: now() } : {}),
          });
        });
        await upsert(rows);
        return json(200, { ok: true, imported: rows.length, updated: [...prevMap.keys()].length, invalid, keptUnsubscribed: kept });
      }

      case 'bulk_tag': {
        const tag = cleanTag(b.tag);
        const emails = [...new Set((b.emails || []).map(normEmail).filter(e => emailRe.test(e)))].slice(0, 5000);
        if (!tag || !emails.length) return json(400, { error: 'Pick contacts and a tag.' });
        const prevMap = await existing(emails);
        await upsert(emails.map(e => {
          const prev = prevMap.get(e); const tags = new Set((prev && prev.tags) || []);
          if (b.remove) tags.delete(tag); else tags.add(tag);
          return row(e, prev, { tags: [...tags] });
        }));
        return json(200, { ok: true, count: emails.length });
      }

      case 'bulk_status': {
        if (!STATUSES.includes(b.marketing_status)) return json(400, { error: 'Unknown status.' });
        const emails = [...new Set((b.emails || []).map(normEmail).filter(e => emailRe.test(e)))].slice(0, 5000);
        if (!emails.length) return json(400, { error: 'Pick some contacts first.' });
        const prevMap = await existing(emails);
        await upsert(emails.map(e => row(e, prevMap.get(e), { marketing_status: b.marketing_status, status_source: 'dashboard', status_changed_at: now() })));
        if (b.marketing_status === 'unsubscribed') {
          for (let i = 0; i < emails.length; i += 80) {
            const chunk = emails.slice(i, i + 80).map(e => `"${e}"`).join(',');
            await sb(`newsletter_subscribers?email=in.(${encodeURIComponent(chunk)})`, { method: 'DELETE' }).catch(() => {});
          }
        }
        return json(200, { ok: true, count: emails.length });
      }

      case 'remove': {
        if (!emailRe.test(email)) return json(400, { error: 'Invalid email.' });
        const prev = (await existing([email])).get(email);
        if (!prev || !prev.added_manually) return json(400, { error: 'Only contacts you added by hand can be removed. Customers and sign-ups stay; unsubscribe them instead.' });
        if (prev.marketing_status === 'unsubscribed') return json(400, { error: 'This person unsubscribed. Keep them on the list so they are never emailed again.' });
        await sb(`crm_contacts?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE' });
        return json(200, { ok: true });
      }

      case 'message_handled': {
        if (!/^[0-9a-f-]{36}$/i.test(String(b.id || ''))) return json(400, { error: 'Invalid message.' });
        await sb(`contact_messages?id=eq.${b.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ handled: !!b.handled, handled_at: b.handled ? now() : null }) });
        return json(200, { ok: true });
      }

      default: return json(400, { error: 'Unknown action.' });
    }
  } catch (err) {
    console.error('crm-contacts error:', err);
    if (err.code === '42P01' || err.status === 404) return json(200, { contacts: [], messages: [], segments: {}, crmReady: false, error: 'CRM tables are missing in Supabase.' });
    return json(500, { error: err.message || 'Something went wrong.' });
  }
};
