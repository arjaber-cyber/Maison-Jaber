// netlify/functions/save-progress.js
//
// "Not ready yet? Email me a link to finish later" on the photo step of personalize.html (Nov 2026).
//
//   POST { email, lang, country, draft:{ story, storyTitle, coverUrl, childName, childAge, gender, bookLanguage, dedication } }
//        -> { sent:true }   saves the draft and emails ONE private link straight away
//   GET  ?t=<token>  -> { status:'ok', draft } | { status:'expired' | 'not_found' }
//
// Privacy:
//  - Only what the parent typed is saved; photos are never sent here (they stay on the device).
//  - The link carries a random token; only its SHA-256 hash is stored. Links work for 14 days and
//    expired rows are deleted on the next save.
//  - The email is used only to send this link (no marketing, no reminders). At most 3 links per
//    address per day.
//  - The owner gets an anonymous WhatsApp note (story and age only, never the email or name).

const R = require('./_recovery');
const { sendEmail, SITE_URL } = require('./_email');
const { savedProgress } = require('./_templates');
const { sendOwnerAlert } = require('./_whatsapp');

const DAYS = 14;
const PER_DAY = 3;
const COUNTRIES = ['UAE', 'Saudi', 'Qatar', 'Kuwait', 'Bahrain', 'Oman'];
const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }, body: JSON.stringify(body) });
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const okCover = u => typeof u === 'string' && /^https:\/\/(maison-jaber\.com|zxzlarlpoctpnnnvzced\.supabase\.co)\/[^\s"'<>]+$/.test(u) ? u.slice(0, 500) : null;

function cleanDraft(d) {
  const x = d && typeof d === 'object' ? d : {};
  return {
    story: str(x.story, 160).replace(/[^\w\- '’&,.!?؀-ۿ]/g, ''),
    storyTitle: str(x.storyTitle, 160),
    coverUrl: okCover(x.coverUrl),
    childName: str(x.childName, 60),
    childAge: /^\d{1,2}$/.test(String(x.childAge || '')) ? String(x.childAge) : '',
    gender: ['boy', 'girl'].includes(x.gender) ? x.gender : '',
    bookLanguage: x.bookLanguage === 'ar' ? 'ar' : x.bookLanguage === 'en' ? 'en' : '',
    dedication: str(x.dedication, 600),
  };
}

exports.handler = async (event) => {
  if (!R.SERVICE_KEY) { console.error('save-progress: SUPABASE_SERVICE_ROLE_KEY missing'); return json(503, { error: 'unavailable' }); }

  if (event.httpMethod === 'GET') {
    const token = String((event.queryStringParameters || {}).t || '');
    if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return json(200, { status: 'not_found' });
    try {
      const r = await R.sb(`saved_progress?token_hash=eq.${R.hashToken(token)}&select=id,draft,expires_at,opened_at&limit=1`);
      const row = r.ok ? (await r.json())[0] : null;
      if (!row) return json(200, { status: 'not_found' });
      if (new Date(row.expires_at) < new Date()) return json(200, { status: 'expired' });
      if (!row.opened_at) await R.sb(`saved_progress?id=eq.${row.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ opened_at: new Date().toISOString() }) });
      const d = cleanDraft(row.draft);
      delete d.coverUrl;
      return json(200, { status: 'ok', draft: d });
    } catch (err) {
      console.error('save-progress GET:', err.message);
      return json(200, { status: 'not_found' });
    }
  }

  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  let p;
  try { p = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'bad_request' }); }
  const email = R.normEmail(p.email);
  if (!R.validEmail(email)) return json(400, { error: 'email' });
  const draft = cleanDraft(p.draft);
  const lang = p.lang === 'ar' ? 'ar' : 'en';

  try {
    // Housekeeping: expired links are deleted, and an address gets at most PER_DAY links a day.
    await R.sb(`saved_progress?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }).catch(() => {});
    const since = new Date(Date.now() - 864e5).toISOString();
    const c = await R.sb(`saved_progress?email=eq.${encodeURIComponent(email)}&created_at=gt.${encodeURIComponent(since)}&select=id`);
    if (c.ok && (await c.json()).length >= PER_DAY) return json(429, { error: 'limit' });

    const token = R.newToken();
    const row = {
      email, token_hash: R.hashToken(token), draft, lang,
      country: COUNTRIES.includes(p.country) ? p.country : null,
      expires_at: new Date(Date.now() + DAYS * 864e5).toISOString(),
    };
    const w = await R.sb('saved_progress', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
    if (!w.ok) { console.error('save-progress: insert failed', w.status, await w.text().catch(() => '')); return json(502, { error: 'save' }); }

    const q = new URLSearchParams();
    if (draft.story) q.set('story', draft.story);
    if (lang === 'ar') q.set('lang', 'ar');
    q.set('resume', token);
    const url = `${SITE_URL}personalize.html?${q.toString()}`;
    const mail = savedProgress({ lang, childName: draft.childName, storyTitle: draft.storyTitle, coverUrl: draft.coverUrl, url });
    const sent = await sendEmail({ to: email, subject: mail.subject, html: mail.html });
    if (!sent || !sent.sent) { console.error('save-progress: email failed', sent && sent.reason); return json(502, { error: 'email_send' }); }

    try {
      await sendOwnerAlert('A shopper saved their progress',
        `Asked for a link to finish later at the photo step · ${draft.storyTitle || draft.story || 'no story yet'}${draft.childAge ? ' · age ' + draft.childAge : ''} · ${row.country || 'country unknown'} · ${lang === 'ar' ? 'Arabic' : 'English'} site.`);
    } catch (_) { /* never blocks the email */ }
    return json(200, { sent: true });
  } catch (err) {
    console.error('save-progress POST:', err.message);
    return json(500, { error: 'server' });
  }
};
