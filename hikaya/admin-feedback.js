/* Hikaya dashboard — Feedback (Nov 2026).
   Answers from feedback.html (sent 3 days after delivery): promoter score,
   average per area, every comment, and which comments can go in promotions.
   Loaded by admin.html; started with window.hkFeedback.load(password). */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const AREAS = [['q_recommend', 'Would recommend'], ['q_story', 'Story and likeness'], ['q_print', 'Print and packaging'], ['q_delivery', 'Ordering and delivery']];
  const COUNTRY = { UAE: 'the UAE', Saudi: 'Saudi Arabia', Qatar: 'Qatar', Kuwait: 'Kuwait', Bahrain: 'Bahrain', Oman: 'Oman' };
  const stars = n => `<span class="fb-stars" aria-label="${n} out of 5">${'★'.repeat(n)}<span>${'★'.repeat(5 - n)}</span></span>`;
  const avg = (rows, k) => rows.length ? rows.reduce((s, r) => s + r[k], 0) / rows.length : 0;
  const low = r => AREAS.some(([k]) => r[k] <= 3);
  const when = iso => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' });

  let pw = null, data = null, filter = 'all';

  async function load(password) {
    if (password) pw = password;
    const root = $('fb-root'); if (!root) return;
    root.innerHTML = '<div class="state-box">Loading feedback…</div>';
    try {
      const r = await fetch('/.netlify/functions/admin-feedback', { headers: { 'x-admin-password': pw } });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Could not load feedback.');
      data = await r.json();
      render();
    } catch (e) { root.innerHTML = `<div class="state-box">${esc(e.message)}</div>`; }
  }

  function render() {
    const root = $('fb-root');
    const all = data.feedback || [];
    const n = all.length;
    const promoters = all.filter(r => r.q_recommend === 5).length;
    const detractors = all.filter(r => r.q_recommend <= 3).length;
    const score = n ? Math.round(((promoters - detractors) / n) * 100) : 0;
    const rate = data.requested ? Math.round((n / data.requested) * 100) : 0;
    const lowCount = all.filter(low).length;

    const kpis = `
      <div class="op-kpis fb-kpis">
        <div class="op-kpi"><div class="l">Responses</div><div class="n">${n}</div><div class="s">${data.requested ? `${rate}% of ${data.requested} emails sent` : 'No feedback emails sent yet'}</div></div>
        <div class="op-kpi ${n && score >= 50 ? 'ok' : ''}"><div class="l">Promoter score</div><div class="n">${n ? (score > 0 ? '+' : '') + score : '–'}</div><div class="s">${n ? `${promoters} gave 5 · ${detractors} gave 1–3` : 'From −100 to +100'}</div></div>
        <div class="op-kpi"><div class="l">Average overall</div><div class="n">${n ? avg(all, 'q_recommend').toFixed(1) : '–'}</div><div class="s">out of 5</div></div>
        <div class="op-kpi ${lowCount ? 'warn' : ''}"><div class="l">Need a follow-up</div><div class="n">${lowCount}</div><div class="s">any score of 3 or below</div></div>
        <div class="op-kpi"><div class="l">Codes used</div><div class="n">${data.redeemed}</div><div class="s">10% thank-you codes</div></div>
      </div>`;

    const areas = `
      <section class="dc-panel"><div class="dc-panel-head"><h2 style="margin:0;font-size:18px">Score by area</h2></div>
        ${n ? `<ul class="vz-bars" style="margin-top:12px">${AREAS.map(([k, l]) => { const a = avg(all, k); return `<li><span class="vz-bar-l">${l}</span><span class="vz-bar"><i style="width:${(a / 5) * 100}%;${a < 4 ? 'background:#e0b25c' : ''}"></i></span><b>${a.toFixed(1)}</b></li>`; }).join('')}</ul>
        <p class="vz-note" style="margin:10px 0 0">Areas under 4.0 are marked in amber.</p>` : '<p class="vz-empty">Scores appear here once customers start answering.</p>'}
      </section>`;

    const rows = all.filter(r => filter === 'low' ? low(r) : filter === 'promo' ? r.use_in_promos : true);
    const list = rows.length ? rows.map(r => `
      <article class="fb-item ${low(r) ? 'low' : ''}" data-id="${r.id}">
        <div class="fb-top"><b>${esc(r.child_name || 'Customer')}</b>${r.story ? ` · ${esc(r.story)}` : ''}<span>${when(r.created_at)} · ${esc(r.order_number || '')} · ${r.lang === 'ar' ? 'Arabic' : 'English'}</span></div>
        <div class="fb-scores">${AREAS.map(([k, l]) => `<div><span>${l}</span>${stars(r[k])}</div>`).join('')}</div>
        <blockquote class="fb-comment" dir="auto">${esc(r.comment)}</blockquote>
        <div class="fb-actions">
          <label><input type="checkbox" data-promo ${r.use_in_promos ? 'checked' : ''}/> Use in promotions</label>
          <button type="button" class="op-btn ghost" data-copy>Copy anonymous quote</button>
          <span class="fb-meta">${esc(r.email || '')}${r.discount_code ? ` · code ${esc(r.discount_code)}` : ''}</span>
        </div>
      </article>`).join('') : `<p class="vz-empty">${n ? 'Nothing matches this filter.' : 'No feedback yet. The first emails go out 3 days after an order is marked Delivered.'}</p>`;

    root.innerHTML = `${kpis}${areas}
      <section class="dc-panel">
        <div class="op-toolbar" style="margin-bottom:12px">
          <div class="op-seg" role="group" aria-label="Filter">${[['all', `All (${n})`], ['low', `Needs follow-up (${lowCount})`], ['promo', 'For promotions']].map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${k === filter}">${l}</button>`).join('')}</div>
          <button type="button" class="op-btn ghost" id="fb-refresh">Refresh</button>
        </div>
        <div class="fb-list">${list}</div>
        <p class="vz-note">Customers agree on the form that their ratings and comments may be used anonymously in promotions. Before posting a quote, check it doesn't mention a name. If someone asks you not to use theirs, untick "Use in promotions".</p>
      </section>`;

    root.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; render(); }));
    $('fb-refresh').addEventListener('click', () => load());
    root.querySelectorAll('.fb-item').forEach(el => {
      const r = all.find(x => x.id === el.dataset.id);
      el.querySelector('[data-promo]').addEventListener('change', async e => {
        const want = e.target.checked; e.target.disabled = true;
        try {
          const res = await fetch('/.netlify/functions/admin-feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': pw }, body: JSON.stringify({ action: 'update', id: r.id, useInPromos: want }) });
          if (!res.ok) throw new Error();
          r.use_in_promos = want;
        } catch (_) { e.target.checked = !want; alert('Could not save. Try again.'); }
        e.target.disabled = false;
      });
      el.querySelector('[data-copy]').addEventListener('click', e => {
        const who = r.lang === 'ar' ? `ولي أمر من ${({ UAE: 'الإمارات', Saudi: 'السعودية', Qatar: 'قطر', Kuwait: 'الكويت', Bahrain: 'البحرين', Oman: 'عُمان' })[r.country] || 'الخليج'}` : `Parent from ${COUNTRY[r.country] || 'the GCC'}`;
        const text = `“${r.comment}” — ${who}`;
        const done = () => { e.target.textContent = 'Copied ✓'; setTimeout(() => { e.target.textContent = 'Copy anonymous quote'; }, 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done); else done();
      });
    });
  }

  window.hkFeedback = { load };
})();
