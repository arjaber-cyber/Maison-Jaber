/* Hikaya dashboard — Cover previews (Nov 2026).
   The free AI "see your child on the cover" preview: on/off switch, daily limits,
   cost, how many previews became orders, and every recent preview.
   Loaded by admin.html; started with window.hkCoverPreviews.load(password). */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const USD_AED = 3.6725;
  const dubaiDay = iso => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
  const when = iso => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' });
  const STATUS = { ok: ['Shown', 'ok'], failed: ['Failed (not counted)', 'warn'], error: ['Failed (not counted)', 'warn'], rejected: ['Photo refused', 'warn'], blocked: ['Photo refused', 'warn'], queued: ['Working', ''], running: ['Working', ''], generating: ['Working', ''] };

  let pw = null, data = null;

  async function api(method, body) {
    const r = await fetch('/.netlify/functions/admin-cover-previews', { method, headers: { 'x-admin-password': pw, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Could not load cover previews.');
    return j;
  }

  async function load(password) {
    if (password) pw = password;
    const root = $('cpv-root'); if (!root) return;
    root.innerHTML = '<div class="state-box">Loading cover previews…</div>';
    try { data = await api('GET'); render(); }
    catch (e) { root.innerHTML = `<div class="state-box">${esc(e.message)}</div>`; }
  }

  function render() {
    const root = $('cpv-root');
    const rows = data.rows || [], s = data.settings;
    const today = dubaiDay(new Date().toISOString());
    const cost = r => (Number(r.cost_usd) || 0) + (Number(r.qa_cost_usd) || 0);
    const tRows = rows.filter(r => dubaiDay(r.created_at) === today);
    const okAll = rows.filter(r => r.status === 'ok');
    const people = new Set(okAll.map(r => (r.email || '').toLowerCase()).filter(Boolean));
    const firstPreview = {};
    okAll.forEach(r => { const e = (r.email || '').toLowerCase(); if (!firstPreview[e] || r.created_at < firstPreview[e]) firstPreview[e] = r.created_at; });
    const buyers = new Set((data.orders || []).filter(o => { const e = (o.email || '').toLowerCase(); return firstPreview[e] && o.created_at > firstPreview[e]; }).map(o => o.email.toLowerCase()));
    const failed = rows.filter(r => r.status === 'failed' || r.status === 'error').length;
    const avgMs = okAll.filter(r => r.ms).reduce((a, r, _, arr) => a + r.ms / arr.length, 0);
    const spendToday = tRows.reduce((a, r) => a + cost(r), 0) * USD_AED;
    const spendAll = rows.reduce((a, r) => a + cost(r), 0) * USD_AED;

    const modeText = { off: 'Off: hidden from everyone', test: 'Test: only the testers below can use it', live: 'Live: every signed-in customer can use it' };
    root.innerHTML = `
      <div class="op-kpis">
        <div class="op-kpi ${s.mode === 'live' ? 'ok' : s.mode === 'test' ? 'warn' : ''}"><div class="l">Status</div><div class="n" style="text-transform:capitalize">${esc(s.mode)}</div><div class="s">${esc(modeText[s.mode] || '')}</div></div>
        <div class="op-kpi"><div class="l">Previews today</div><div class="n">${tRows.filter(r => r.status === 'ok').length}</div><div class="s">AED ${spendToday.toFixed(2)} spent of AED ${s.cap_aed} daily cap</div></div>
        <div class="op-kpi"><div class="l">Families who previewed</div><div class="n">${people.size}</div><div class="s">${okAll.length} previews shown in total (last 300)</div></div>
        <div class="op-kpi ${buyers.size ? 'ok' : ''}"><div class="l">Then ordered</div><div class="n">${buyers.size}</div><div class="s">${people.size ? Math.round(buyers.size / people.size * 100) + '% of families who previewed' : 'Paid orders after a preview'}</div></div>
        <div class="op-kpi ${failed ? 'warn' : ''}"><div class="l">Failed</div><div class="n">${failed}</div><div class="s">not counted against the customer · avg ${avgMs ? Math.round(avgMs / 1000) + 's' : '–'} to make</div></div>
        <div class="op-kpi"><div class="l">Total cost</div><div class="n">AED ${spendAll.toFixed(0)}</div><div class="s">${okAll.length ? 'about AED ' + (spendAll / okAll.length).toFixed(2) + ' per preview' : 'about AED 0.32 per preview'}</div></div>
      </div>

      <section class="dc-panel" style="margin-top:18px">
        <div class="dc-panel-head"><h2 style="margin:0;font-size:18px">Settings</h2></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-top:12px">
          <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600">Who can use it
            <select id="cpv-mode"><option value="off">Off (hidden)</option><option value="test">Test (testers only)</option><option value="live">Live (all signed-in customers)</option></select></label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600">Previews per account per day
            <input id="cpv-perday" type="number" min="0" max="20" /></label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600">Daily spending cap (AED)
            <input id="cpv-cap" type="number" min="0" max="2000" /></label>
        </div>
        <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;margin-top:14px">Testers (emails that can use it in Test mode)
          <textarea id="cpv-testers" rows="2" style="font:inherit;font-size:13px"></textarea></label>
        <div style="display:flex;gap:12px;align-items:center;margin-top:14px"><button class="btn btn-primary" id="cpv-save" type="button">Save settings</button><span id="cpv-saved" style="font-size:13px"></span></div>
        <p class="vz-note" style="margin:10px 0 0">The page is maison-jaber.com/hikaya/cover-preview.html. Photos, illustrations and previews are deleted automatically within 48 hours.</p>
      </section>

      <section class="dc-panel" style="margin-top:18px">
        <div class="dc-panel-head"><h2 style="margin:0;font-size:18px">Recent previews</h2></div>
        ${rows.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;margin-top:12px">${rows.map(r => {
          const st = STATUS[r.status] || [r.status, ''];
          return `<article style="border:1px solid var(--line,#e6d9c7);border-radius:12px;padding:10px;background:#fff;font-size:12.5px;line-height:1.45">
            ${r.preview_url ? `<a href="${esc(r.preview_url)}" target="_blank" rel="noopener"><img src="${esc(r.preview_url)}" alt="" loading="lazy" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;display:block;margin-bottom:8px"></a>` : `<div style="aspect-ratio:1;border-radius:8px;background:#f3ead8;display:flex;align-items:center;justify-content:center;color:#8a7766;margin-bottom:8px;text-align:center;padding:10px">${r.purged_at ? 'Deleted after 48 hours' : r.status === 'ok' ? 'Preview link not loaded' : esc(st[0])}</div>`}
            <b>${esc(r.child_name)}</b> · ${esc(r.child_gender)} · ${esc(r.child_age)} · ${r.lang === 'ar' ? 'AR' : 'EN'}<br>
            ${esc(r.story_slug)}<br>
            <span style="color:#8a7766">${when(r.created_at)} · ${esc(r.email || '')}</span><br>
            <span class="${st[1] === 'ok' ? '' : ''}" style="font-weight:700;color:${st[1] === 'ok' ? '#2f6b3a' : st[1] === 'warn' ? '#a2612a' : '#555'}">${esc(st[0])}</span>${r.review_notes ? ` · ${esc(r.review_notes)}` : ''}${r.error ? ` · ${esc(r.error)}` : ''}${r.ms ? ` · ${Math.round(r.ms / 1000)}s` : ''} · AED ${(cost(r) * USD_AED).toFixed(2)}
          </article>`; }).join('')}</div>` : '<p class="vz-empty">No previews yet.</p>'}
      </section>`;

    $('cpv-mode').value = s.mode; $('cpv-perday').value = s.per_day; $('cpv-cap').value = s.cap_aed; $('cpv-testers').value = s.testers;
    $('cpv-save').addEventListener('click', async () => {
      const mode = $('cpv-mode').value;
      if (mode === 'live' && s.mode !== 'live' && !confirm('Turn the free cover preview on for every signed-in customer?')) return;
      $('cpv-saved').textContent = 'Saving…';
      try {
        await api('POST', { action: 'settings', mode, per_day: $('cpv-perday').value, cap_aed: $('cpv-cap').value, testers: $('cpv-testers').value });
        $('cpv-saved').textContent = 'Saved'; setTimeout(() => load(), 600);
      } catch (e) { $('cpv-saved').textContent = e.message; }
    });
  }

  window.hkCoverPreviews = { load };
})();
