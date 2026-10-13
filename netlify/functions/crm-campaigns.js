// netlify/functions/crm-campaigns.js
//
// Admin-only (x-admin-password). Email campaigns for the CRM tab.
//
// GET                                         -> { campaigns (with stats), codes, stories, configured }
// POST { action: 'save', id?, name, lang_mode, content, audience, discount_code, template_key }
// POST { action: 'duplicate', id }
// POST { action: 'delete', id }
// POST { action: 'preview', campaign, lang, name? }      -> { subject, html }   (unsaved edits are fine)
// POST { action: 'audience', audience }                  -> { count, en, ar, notOptedIn, sample }
// POST { action: 'test', campaign, to, lang: 'en'|'ar'|'both' }
// POST { action: 'start', id }                           -> queues every recipient, returns { total }
// POST { action: 'batch', id }                           -> sends the next 50, returns { sent, failed, remaining }
// POST { action: 'retry_failed', id }
//
// Sending is done in small batches the dashboard calls one after another, so a big list
// never hits the function time limit, and closing the tab just pauses it (Resume picks up
// where it stopped). Each recipient is claimed atomically, so nobody gets it twice.

const { isAdminRequest } = require('./_admin-check');
const { sendBatch } = require('./_email');
const {
  sb, rpc, json, emailRe, normEmail, FN, loadContacts, matchAudience, renderCampaign, langFor,
  collectLinks, storiesFor, codeFor, slugify, CUSTOMER_EMAIL,
} = require('./_crm');

const BATCH = 50;
/* Campaign emails share the Resend quota with order emails (free plan: 100/day). Keep
   room for order confirmations: by default campaigns stop at 80 a day and resume the
   next day. Set MARKETING_DAILY_LIMIT in Netlify (0 = no limit) once on a paid plan. */
const DAILY = (() => { const v = process.env.MARKETING_DAILY_LIMIT; return v === undefined || v === '' ? 80 : Math.max(0, parseInt(v, 10) || 0); })();
function dubaiMidnightIso() {
  const d = new Date(Date.now() + 4 * 3600e3); d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - 4 * 3600e3).toISOString();
}
async function sentToday() {
  if (!DAILY) return 0;
  const rows = await sb(`crm_sends?select=id&status=eq.sent&sent_at=gte.${encodeURIComponent(dubaiMidnightIso())}&limit=${DAILY + 1}`);
  return rows.length;
}
const uuid = v => /^[0-9a-f-]{36}$/i.test(String(v || ''));
const BLOCKS = ['eyebrow', 'heading', 'subheading', 'text', 'small', 'hand', 'button', 'image', 'story', 'code', 'divider', 'signoff'];

function cleanContent(content) {
  const out = {};
  for (const lang of ['en', 'ar']) {
    const v = (content || {})[lang];
    if (!v) continue;
    out[lang] = {
      subject: String(v.subject || '').slice(0, 200),
      preheader: String(v.preheader || '').slice(0, 200),
      blocks: (Array.isArray(v.blocks) ? v.blocks : []).slice(0, 40).filter(b => b && BLOCKS.includes(b.t)).map(b => {
        const o = { t: b.t };
        for (const k of ['text', 'label', 'url', 'alt', 'link', 'slug', 'note']) if (b[k] != null) o[k] = String(b[k]).slice(0, 4000);
        return o;
      }),
    };
  }
  return out;
}
function cleanAudience(a) {
  a = a || {};
  return {
    segment: String(a.segment || 'all').slice(0, 30),
    lang: ['en', 'ar'].includes(a.lang) ? a.lang : 'any',
    country: a.country && a.country !== 'any' ? String(a.country).slice(0, 60) : 'any',
    tag: a.tag ? String(a.tag).slice(0, 32) : '',
    emails: Array.isArray(a.emails) ? [...new Set(a.emails.map(normEmail).filter(e => emailRe.test(e)))].slice(0, 5000) : [],
    includeUnconsented: !!a.includeUnconsented,
  };
}
const getCampaign = async id => (await sb(`crm_campaigns?id=eq.${id}&select=*`))[0];

async function withStats(list) {
  const stats = await rpc('crm_campaign_stats').catch(e => { console.warn('stats failed', e.message); return []; });
  const by = Object.fromEntries(stats.map(s => [s.campaign_id, s]));
  return list.map(c => ({ ...c, stats: by[c.id] || null }));
}

/* Render one email for one recipient (tracked links, open pixel, unsubscribe). */
function personalised(campaign, recipient, extras) {
  const lang = recipient.lang || 'en';
  const links = campaign.links || [];
  const unsub = recipient.token ? `${FN}crm-unsubscribe?t=${recipient.token}&lang=${lang === 'ar' ? 'ar' : 'en'}` : null;
  const m = renderCampaign(campaign, {
    lang, name: recipient.name || '', code: extras.code, stories: extras.stories, utm: slugify(campaign.name),
    linkFor: recipient.sendId ? (u => { const i = links.indexOf(u); return i >= 0 ? `${FN}crm-track?s=${recipient.sendId}&l=${i}` : u; }) : null,
    pixel: recipient.sendId ? `${FN}crm-track?s=${recipient.sendId}&o=1` : null,
    footer: { unsubscribeUrl: unsub },
  });
  if (unsub) m.headers = {
    'List-Unsubscribe': `<${unsub}>, <mailto:${CUSTOMER_EMAIL}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
  return m;
}

exports.handler = async (event) => {
  if (!isAdminRequest(event)) return json(401, { error: 'Not authorized.' });
  try {
    if (event.httpMethod === 'GET') {
      const [campaigns, codes, stories] = await Promise.all([
        sb('crm_campaigns?select=*&order=updated_at.desc&limit=200'),
        sb('discount_codes?select=code,type,value,expires_at,active,max_uses,uses_count,email,tag&order=created_at.desc&limit=300').catch(() => []),
        sb('stories?select=slug,title,title_ar,cover_image_url,active&order=sort_order.asc&limit=200').catch(() => []),
      ]);
      return json(200, {
        campaigns: await withStats(campaigns),
        codes: codes.filter(c => c.active !== false && !c.email && (!c.expires_at || new Date(c.expires_at) > new Date())),
        stories: stories.filter(s => s.active !== false),
        configured: !!process.env.RESEND_API_KEY,
        dailyLimit: DAILY, sentToday: await sentToday().catch(() => 0),
      });
    }
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    let b = {}; try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }

    switch (b.action) {
      case 'save': {
        const row = {
          name: String(b.name || '').trim().slice(0, 120) || 'Untitled campaign',
          lang_mode: ['auto', 'en', 'ar'].includes(b.lang_mode) ? b.lang_mode : 'auto',
          content: cleanContent(b.content),
          audience: cleanAudience(b.audience),
          discount_code: b.discount_code ? String(b.discount_code).toUpperCase().slice(0, 40) : null,
          template_key: b.template_key ? String(b.template_key).slice(0, 40) : null,
          updated_at: new Date().toISOString(),
        };
        if (b.id) {
          if (!uuid(b.id)) return json(400, { error: 'Invalid campaign.' });
          const cur = await getCampaign(b.id);
          if (!cur) return json(404, { error: 'Campaign not found.' });
          if (cur.status !== 'draft') return json(400, { error: 'This campaign has already been sent. Duplicate it to make changes.' });
          const [saved] = await sb(`crm_campaigns?id=eq.${b.id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
          return json(200, { campaign: saved });
        }
        const [saved] = await sb('crm_campaigns', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
        return json(200, { campaign: saved });
      }

      case 'duplicate': {
        if (!uuid(b.id)) return json(400, { error: 'Invalid campaign.' });
        const cur = await getCampaign(b.id);
        if (!cur) return json(404, { error: 'Campaign not found.' });
        const [saved] = await sb('crm_campaigns', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({
          name: `${cur.name} (copy)`.slice(0, 120), lang_mode: cur.lang_mode, content: cur.content, audience: cur.audience,
          discount_code: cur.discount_code, template_key: cur.template_key,
        }) });
        return json(200, { campaign: saved });
      }

      case 'delete': {
        if (!uuid(b.id)) return json(400, { error: 'Invalid campaign.' });
        const cur = await getCampaign(b.id);
        if (cur && cur.status === 'sending') return json(400, { error: 'This campaign is sending. Let it finish first.' });
        await sb(`crm_campaigns?id=eq.${b.id}`, { method: 'DELETE' });
        return json(200, { ok: true });
      }

      case 'preview': {
        const c = { ...(b.campaign || {}), content: cleanContent((b.campaign || {}).content) };
        const lang = b.lang === 'ar' ? 'ar' : 'en';
        const [stories, code] = await Promise.all([storiesFor(c), codeFor(c)]);
        const m = renderCampaign(c, { lang, name: b.name != null ? b.name : (lang === 'ar' ? 'سارة' : 'Sarah'), code, stories, utm: slugify(c.name), preview: true, footer: { unsubscribeUrl: '#unsubscribe' } });
        return json(200, m);
      }

      case 'audience': {
        const contacts = await loadContacts({ withEngagement: false });
        const a = cleanAudience(b.audience);
        const list = matchAudience(contacts, a);
        const withUnconsented = matchAudience(contacts, { ...a, includeUnconsented: true });
        return json(200, {
          count: list.length,
          en: list.filter(c => c.lang !== 'ar').length,
          ar: list.filter(c => c.lang === 'ar').length,
          notOptedIn: a.includeUnconsented ? list.filter(c => !c.canEmail).length : withUnconsented.length - list.length,
          sample: list.slice(0, 6).map(c => ({ email: c.email, name: c.name, lang: c.lang })),
        });
      }

      case 'test': {
        const to = normEmail(b.to);
        if (!emailRe.test(to)) return json(400, { error: 'Enter a valid email for the test.' });
        const c = { ...(b.campaign || {}), content: cleanContent((b.campaign || {}).content) };
        const [stories, code] = await Promise.all([storiesFor(c), codeFor(c)]);
        const langs = b.lang === 'both' ? ['en', 'ar'] : [b.lang === 'ar' ? 'ar' : 'en'];
        const msgs = langs.filter(l => (c.content[l] || {}).subject).map(l => {
          const m = renderCampaign(c, { lang: l, name: b.name || '', code, stories, utm: slugify(c.name), footer: { unsubscribeUrl: `${FN}crm-unsubscribe?t=test` } });
          return { to, subject: `[Test] ${m.subject}`, html: m.html };
        });
        if (!msgs.length) return json(400, { error: 'Add a subject line first.' });
        const r = await sendBatch(msgs);
        const bad = r.find(x => !x.sent);
        if (bad) return json(400, { error: bad.reason === 'not_configured' ? 'Email sending is not set up yet (RESEND_API_KEY missing in Netlify).' : `Could not send: ${bad.detail || bad.reason}` });
        return json(200, { ok: true, sent: msgs.length });
      }

      case 'start': {
        if (!uuid(b.id)) return json(400, { error: 'Invalid campaign.' });
        if (!process.env.RESEND_API_KEY) return json(400, { error: 'Email sending is not set up yet (RESEND_API_KEY missing in Netlify).' });
        const c = await getCampaign(b.id);
        if (!c) return json(404, { error: 'Campaign not found.' });
        if (c.status === 'sent') return json(400, { error: 'This campaign was already sent.' });
        if (c.status === 'sending') {
          const [s] = (await rpc('crm_campaign_stats')).filter(x => x.campaign_id === c.id);
          return json(200, { total: c.recipients, remaining: s ? s.queued + s.sending : 0, resumed: true });
        }
        const en = c.content.en || {}, ar = c.content.ar || {};
        if (!(en.subject && (en.blocks || []).length) && !(ar.subject && (ar.blocks || []).length)) return json(400, { error: 'Write the email (subject and content) before sending.' });

        const contacts = await loadContacts({ withEngagement: false });
        const list = matchAudience(contacts, c.audience);
        if (!list.length) return json(400, { error: 'Nobody matches this audience.' });

        const stories = await storiesFor(c);
        const links = collectLinks(c, stories);

        // Every recipient needs an unsubscribe link: make sure they have a CRM row.
        for (let i = 0; i < list.length; i += 500) {
          await sb('crm_contacts?on_conflict=email', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(list.slice(i, i + 500).map(x => ({ email: x.email }))) });
        }
        for (let i = 0; i < list.length; i += 500) {
          await sb('crm_sends?on_conflict=campaign_id,email', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(list.slice(i, i + 500).map(x => ({ campaign_id: c.id, email: x.email, name: x.name || null, lang: langFor(c, x) }))) });
        }
        const startedAt = new Date().toISOString();
        await sb(`crm_campaigns?id=eq.${c.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'sending', links, recipients: list.length, started_at: startedAt, updated_at: startedAt }) });
        return json(200, { total: list.length, remaining: list.length });
      }

      case 'batch': {
        if (!uuid(b.id)) return json(400, { error: 'Invalid campaign.' });
        const c = await getCampaign(b.id);
        if (!c) return json(404, { error: 'Campaign not found.' });
        if (c.status !== 'sending') return json(200, { sent: 0, failed: 0, remaining: 0, done: true });

        let room = BATCH;
        if (DAILY) {
          room = Math.min(BATCH, DAILY - await sentToday());
          if (room <= 0) {
            const [s0] = (await rpc('crm_campaign_stats')).filter(x => x.campaign_id === c.id);
            return json(200, { sent: 0, failed: 0, remaining: s0 ? s0.queued + s0.sending : 0, paused: true, dailyLimit: true,
              error: `Today's limit of ${DAILY} campaign emails is reached (keeps room for order emails). Press Resume tomorrow to send the rest.` });
          }
        }
        const claimed = await rpc('crm_claim_batch', { p_campaign: c.id, p_limit: room });
        let sent = 0, failed = 0, skipped = 0, lastError = '';
        if (claimed.length) {
          const [stories, code] = await Promise.all([storiesFor(c), codeFor(c)]);
          const emails = claimed.map(x => `"${x.email.replace(/"/g, '')}"`).join(',');
          const meta = await sb(`crm_contacts?select=email,unsubscribe_token,marketing_status,bounced,name&email=in.(${encodeURIComponent(emails)})`);
          const byEmail = Object.fromEntries(meta.map(m => [m.email, m]));

          const go = [], skip = [];
          for (const r of claimed) {
            const m = byEmail[r.email];
            if (!m || m.marketing_status === 'unsubscribed' || m.bounced) { skip.push(r); continue; }
            go.push({ r, mail: personalised(c, { lang: r.lang, name: r.name || m.name, token: m.unsubscribe_token, sendId: r.id }, { stories, code }) });
          }
          const results = go.length ? await sendBatch(go.map(g => ({ to: g.r.email, subject: g.mail.subject, html: g.mail.html, headers: g.mail.headers }))) : [];
          const stamp = new Date().toISOString();
          const okRows = [], badRows = [];
          go.forEach((g, i) => {
            const res = results[i] || {};
            if (res.sent) { sent++; okRows.push({ id: g.r.id, campaign_id: c.id, email: g.r.email, status: 'sent', sent_at: stamp, error: null }); }
            else { failed++; lastError = res.detail || res.reason || 'Failed'; badRows.push({ id: g.r.id, campaign_id: c.id, email: g.r.email, status: 'failed', sent_at: null, error: String(lastError).slice(0, 300) }); }
          });
          skip.forEach(r => { skipped++; badRows.push({ id: r.id, campaign_id: c.id, email: r.email, status: 'skipped', sent_at: null, error: 'Unsubscribed before sending' }); });
          for (const rows of [okRows, badRows]) if (rows.length) {
            await sb('crm_sends?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) });
          }
          // If the email service refused the whole batch (quota, bad key), stop instead of burning through the list.
          if (go.length && failed === go.length) {
            const [s] = (await rpc('crm_campaign_stats')).filter(x => x.campaign_id === c.id);
            await sb(`crm_campaigns?id=eq.${c.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ sent_count: s ? s.sent : 0, failed_count: s ? s.failed : 0, updated_at: stamp }) });
            return json(200, { sent, failed, skipped, remaining: s ? s.queued + s.sending : 0, paused: true, error: `The email service refused this batch: ${lastError}` });
          }
        }
        const [s] = (await rpc('crm_campaign_stats')).filter(x => x.campaign_id === c.id);
        const remaining = s ? s.queued + s.sending : 0;
        const patch = { sent_count: s ? s.sent : 0, failed_count: s ? s.failed : 0, updated_at: new Date().toISOString() };
        if (!remaining) Object.assign(patch, { status: 'sent', sent_at: new Date().toISOString() });
        await sb(`crm_campaigns?id=eq.${c.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
        return json(200, { sent, failed, skipped, remaining, done: !remaining, error: lastError || undefined });
      }

      case 'retry_failed': {
        if (!uuid(b.id)) return json(400, { error: 'Invalid campaign.' });
        const rows = await sb(`crm_sends?campaign_id=eq.${b.id}&status=eq.failed`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'queued', error: null, sent_at: null }) });
        if (!rows.length) return json(200, { requeued: 0 });
        await sb(`crm_campaigns?id=eq.${b.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'sending', updated_at: new Date().toISOString() }) });
        return json(200, { requeued: rows.length });
      }

      default: return json(400, { error: 'Unknown action.' });
    }
  } catch (err) {
    console.error('crm-campaigns error:', err);
    return json(500, { error: err.message || 'Something went wrong.' });
  }
};
