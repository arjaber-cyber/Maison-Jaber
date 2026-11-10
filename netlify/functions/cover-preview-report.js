// netlify/functions/cover-preview-report.js
//
// Scheduled daily at 06:00 UAE time (02:00 UTC, see netlify.toml).
// Emails the team inbox a report of the free AI cover previews from the last 24 hours:
// how many people tried, how many covers were made, what failed and why, the cost,
// and every generated cover as a picture.
//
// Privacy: no image is attached or copied into the email. Each picture is a private link
// that stops working when the cover is deleted (46 hours after it was made, see
// purge-cover-previews.js), so the report keeps the 48-hour deletion promise.
// Env: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

const { sendEmail, emailShell, ui, esc, OWNER_INBOX, SITE_URL } = require('./_email');
const { SUPABASE_URL } = require('./_pricing');

const BUCKET = 'cover-previews';
const KEEP_HOURS = 46; // same as purge-cover-previews.js
const USD_AED = 3.6725;
const HOUR = 3600 * 1000;

const titleOf = slug => String(slug || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const uaeTime = iso => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const WHY = {
  name_check_failed: 'The name on the cover came out wrong, so it was not shown',
  photo_group: 'More than one person in the photo',
  photo_noface: 'No face found in the photo',
  photo_moderation: 'Photo refused by the safety check',
  stalled: 'Stopped before finishing',
};
const reason = r => WHY[r.error] || (/credits/i.test(r.error || '') ? 'OpenAI account had no credits left' : String(r.error || r.status).slice(0, 120));

exports.handler = async () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) { console.error('cover-preview-report: SUPABASE_SERVICE_ROLE_KEY is not set'); return { statusCode: 503 }; }
  const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const now = Date.now();
  const since = new Date(now - 24 * HOUR).toISOString();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cover_previews?source=eq.site&created_at=gte.${encodeURIComponent(since)}&select=id,created_at,status,user_id,email,story_slug,lang,child_name,child_age,child_gender,error,ms,cost_usd,qa_cost_usd,qa_status,result_path,purged_at,ordered&order=created_at.asc&limit=500`, { headers: H });
    if (!res.ok) throw new Error(`select ${res.status}`);
    const rows = await res.json();

    // One private link per generated cover, valid until that cover is deleted.
    for (const r of rows) {
      if (!r.result_path || r.purged_at) continue;
      const left = Math.floor((new Date(r.created_at).getTime() + KEEP_HOURS * HOUR - now) / 1000);
      if (left < 600) continue;
      try {
        const s = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${r.result_path}`, { method: 'POST', headers: H, body: JSON.stringify({ expiresIn: left }) });
        const j = s.ok ? await s.json() : null;
        if (j && j.signedURL) r.url = `${SUPABASE_URL}/storage/v1${j.signedURL}`;
      } catch (_) { /* the row is still listed, without its picture */ }
    }

    const people = new Set(rows.map(r => r.user_id || r.email || r.id)).size;
    const shown = rows.filter(r => r.status === 'ok');
    const notShown = rows.filter(r => r.status !== 'ok' && r.status !== 'queued' && r.status !== 'running');
    const costAed = rows.reduce((t, r) => t + Number(r.cost_usd || 0) + Number(r.qa_cost_usd || 0), 0) * USD_AED;
    const who = r => (r.email ? esc(r.email) : 'Guest');
    const meta = r => `${esc(r.child_name || '')}, ${r.child_gender || ''} ${r.child_age || ''} · ${r.lang === 'ar' ? 'Arabic' : 'English'} · ${who(r)} · ${uaeTime(r.created_at)}${r.ms ? ` · ${Math.round(r.ms / 1000)}s` : ''}${r.ordered ? ' · <strong>ordered</strong>' : ''}`;
    const card = (r, note) => ui.box(
      ui.h3(esc(titleOf(r.story_slug)), 'en')
      + `<p class="hk-soft" style="margin:0 0 8px; font-family:Manrope,Arial,sans-serif; font-size:12.5px; line-height:1.5; color:#5E4A3D;">${meta(r)}${note ? `<br>${esc(note)}` : ''}</p>`
      + (r.url ? `<a href="${esc(r.url)}"><img src="${esc(r.url)}" width="400" alt="Generated cover" style="display:block; width:100%; max-width:400px; height:auto; border-radius:10px; border:0;"></a>` : ui.p('Picture not available.', 'en', true)));

    const body = [
      ui.eyebrow('Cover previews · last 24 hours'),
      ui.h(rows.length ? `${shown.length} cover${shown.length === 1 ? '' : 's'} made for ${people} ${people === 1 ? 'person' : 'people'}` : 'No cover previews in the last 24 hours'),
      rows.length ? ui.rows([
        ['People who tried', String(people)],
        ['Tries', String(rows.length)],
        ['Covers shown to the visitor', String(shown.length)],
        ['Tries that did not produce a cover', String(notShown.length)],
        ['Ordered afterwards', String(rows.filter(r => r.ordered).length)],
        ['Cost', `AED ${costAed.toFixed(2)}`],
      ], 'en') : '',
      shown.length ? ui.h3('Covers shown to visitors', 'en') + shown.map(r => card(r)).join('') : '',
      notShown.length ? ui.h3('Tries that did not produce a cover', 'en') + notShown.map(r => card(r, reason(r))).join('').replace(/Picture not available\./g, 'No picture was made.') : '',
      rows.some(r => r.url) ? ui.p('These are the full covers without the watermark, for your eyes only. The pictures stop loading about 2 days after each cover was made, when it is deleted.', 'en', true) : '',
      ui.button(`${SITE_URL}admin.html`, 'Open the dashboard &rarr;'),
    ].join('');

    const subject = rows.length ? `Hikaya cover previews: ${shown.length} made, ${people} ${people === 1 ? 'person' : 'people'}${notShown.length ? `, ${notShown.length} failed` : ''}` : 'Hikaya cover previews: none yesterday';
    const sent = await sendEmail({ to: OWNER_INBOX, subject, html: emailShell(body, { preheader: `${rows.length} tries · ${shown.length} covers · AED ${costAed.toFixed(2)}` }) });
    console.log(`cover-preview-report: ${rows.length} tries, ${shown.length} covers, sent=${sent.sent}`);
    return { statusCode: 200, body: JSON.stringify({ tries: rows.length, covers: shown.length, sent: sent.sent }) };
  } catch (err) {
    console.error('cover-preview-report error:', err);
    return { statusCode: 500 };
  }
};
