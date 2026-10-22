/* Hikaya dashboard — Visitors (Oct 2026).
   Reads the cookie-free visitor counter (netlify/functions/visit.js) through
   admin-visits.js: real visitor numbers, where they came from and how far
   they got through the shop. Counts everyone, cookie banner or not.

   Loaded by admin.html; started with window.hkVisits.load(password). */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Number(n || 0).toLocaleString('en-AE');
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const RANGES = [['today', 'Today'], ['24h', 'Last 24 hours'], ['yesterday', 'Yesterday'], ['7d', '7 days'], ['30d', '30 days']];
  const PAGE_NAMES = {
    '/': 'Landing (Enter page)', '/hikaya/': 'Homepage', '/hikaya/index.html': 'Homepage', '/hikaya': 'Homepage',
    '/hikaya/stories.html': 'All stories', '/hikaya/story.html': 'Story page', '/hikaya/personalize.html': 'Personalise',
    '/hikaya/book-added.html': 'Book added', '/hikaya/cart.html': 'Cart', '/hikaya/checkout.html': 'Checkout',
    '/hikaya/our-world.html': 'Our world', '/hikaya/about.html': 'About', '/hikaya/age-groups.html': 'Age groups',
    '/hikaya/help.html': 'Help', '/hikaya/contact.html': 'Contact', '/hikaya/track-order.html': 'Track order',
    '/hikaya/account.html': 'Account', '/hikaya/login.html': 'Sign in', '/hikaya/search.html': 'Search',
    '/hikaya/privacy.html': 'Privacy', '/hikaya/terms.html': 'Terms', '/hikaya/refund-policy.html': 'Refund policy',
  };
  const pageName = p => PAGE_NAMES[p] || (p || '').replace(/^\/(hikaya|test5)\//, '/');
  let countryName = c => c;
  try { const dn = new Intl.DisplayNames(['en'], { type: 'region' }); countryName = c => (c && c.length === 2 ? dn.of(c) : c); } catch (_) {}

  let pw = null, range = '24h', busy = false;

  async function load(password) {
    if (password) pw = password;
    shell();
    fetchRange(range);
  }

  function shell() {
    const root = $('vz-root'); if (!root || root.dataset.ready) return;
    root.dataset.ready = '1';
    let noCount = false; try { noCount = localStorage.getItem('hikaya_nocount') === '1'; } catch (_) {}
    root.innerHTML = `
      <div class="op-toolbar">
        <div class="op-seg" role="group" aria-label="Time range">${RANGES.map(([k, l]) => `<button type="button" data-range="${k}" aria-pressed="${k === range}">${l}</button>`).join('')}</div>
        <button type="button" class="op-btn ghost" id="vz-refresh">Refresh</button>
        <label class="vz-self"><input type="checkbox" id="vz-nocount" ${noCount ? 'checked' : ''}/> Don't count my visits on this device</label>
      </div>
      <div id="vz-body"><div class="state-box">Loading visitors…</div></div>
      <p class="vz-note">Counts every visitor, with or without the cookie banner: no cookies and no personal data, just an anonymous code that changes every day. Someone who comes back on another day counts again for that day. Bots and link previews are left out. Orders and revenue are in the Orders tab.</p>`;
    root.querySelectorAll('[data-range]').forEach(b => b.addEventListener('click', () => {
      range = b.dataset.range;
      root.querySelectorAll('[data-range]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      fetchRange(range);
    }));
    $('vz-refresh').addEventListener('click', () => fetchRange(range));
    $('vz-nocount').addEventListener('change', e => {
      try { if (e.target.checked) localStorage.setItem('hikaya_nocount', '1'); else localStorage.removeItem('hikaya_nocount'); } catch (_) {}
    });
  }

  async function fetchRange(r) {
    if (busy) return; busy = true;
    const body = $('vz-body');
    if (body && !body.dataset.loaded) body.innerHTML = '<div class="state-box">Loading visitors…</div>';
    try {
      const res = await fetch('/.netlify/functions/admin-visits?range=' + encodeURIComponent(r), { headers: { 'x-admin-password': pw } });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not load visitors.');
      render(d);
    } catch (err) {
      if (body) body.innerHTML = `<div class="state-box">${esc(err.message)}</div>`;
    } finally { busy = false; }
  }

  function bars(rows, key, label) {
    if (!rows || !rows.length) return '<div class="vz-empty">No data yet.</div>';
    const max = Math.max(...rows.map(r => Number(r[key]) || 0), 1);
    return `<ul class="vz-bars">${rows.map(r => `<li><span class="vz-bar-l">${esc(label(r))}</span><span class="vz-bar"><i style="width:${Math.max(2, (Number(r[key]) / max) * 100)}%"></i></span><b>${num(r[key])}</b></li>`).join('')}</ul>`;
  }

  function timeline(d) {
    const rows = d.timeline || [];
    if (!rows.length) return '<div class="vz-empty">No visits in this period yet.</div>';
    const hourly = d.bucket === 'hour';
    const max = Math.max(...rows.map(r => r.visitors), 1);
    const lab = t => {
      const s = String(t); // "2026-10-22T14:00:00" already in Dubai time
      return hourly ? s.slice(11, 13) + ':00' : new Date(s.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };
    return `<div class="vz-tl" role="img" aria-label="Visitors over time">${rows.map(r => `
      <div class="vz-tl-col" title="${esc(lab(r.t))}: ${num(r.visitors)} visitors, ${num(r.views)} page views">
        <span class="vz-tl-n">${r.visitors || ''}</span>
        <span class="vz-tl-bar" style="height:${Math.max(3, (r.visitors / max) * 100)}%"></span>
        <span class="vz-tl-l">${esc(lab(r.t))}</span>
      </div>`).join('')}</div>`;
  }

  function render(d) {
    const body = $('vz-body'); if (!body) return;
    body.dataset.loaded = '1';
    const f = d.funnel || {};
    const total = f.visitors || 0;
    const ads = (d.sources || []).filter(s => / ad$|\(ad\)$/i.test(s.name)).reduce((a, s) => a + s.visitors, 0);
    const steps = [
      ['Visited the site', total], ['Opened a story', f.story], ['Started personalising', f.personalise],
      ['Reached the review step', f.review], ['Added to cart', f.cart], ['Went to checkout', f.checkout], ['Ordered', f.purchase],
    ];
    body.innerHTML = `
      <div class="op-kpis vz-kpis">
        <div class="op-kpi"><div class="l">Visitors</div><div class="n">${num(total)}</div><div class="s">${num(d.pageviews)} page views</div></div>
        <div class="op-kpi"><div class="l">From ads</div><div class="n">${num(ads)}</div><div class="s">${pct(ads, total)}% of visitors</div></div>
        <div class="op-kpi"><div class="l">Started personalising</div><div class="n">${num(f.personalise)}</div><div class="s">${pct(f.personalise, total)}% of visitors</div></div>
        <div class="op-kpi"><div class="l">Went to checkout</div><div class="n">${num(f.checkout)}</div><div class="s">${pct(f.checkout, total)}% of visitors</div></div>
        <div class="op-kpi ${f.purchase ? 'ok' : ''}"><div class="l">Ordered</div><div class="n">${num(f.purchase)}</div><div class="s">${pct(f.purchase, total)}% conversion</div></div>
      </div>

      <div class="vz-grid">
        <section class="dc-panel vz-wide"><div class="dc-panel-head"><h2>Visitors over time</h2><p>${d.bucket === 'hour' ? 'By hour, Dubai time.' : 'By day.'}</p></div>${timeline(d)}</section>

        <section class="dc-panel vz-wide"><div class="dc-panel-head"><h2>How far visitors got</h2><p>Each step shows how many of the visitors reached it.</p></div>
          <ol class="vz-funnel">${steps.map(([l, n], i) => `
            <li><span class="vz-f-l">${l}</span><span class="vz-bar"><i style="width:${total ? Math.max(1.5, (n / total) * 100) : 0}%"></i></span>
            <b>${num(n)}</b><small>${i ? pct(n, total) + '%' : ''}</small></li>`).join('')}</ol>
        </section>

        <section class="dc-panel vz-wide"><div class="dc-panel-head"><h2>Where visitors came from</h2><p>Judged by the first page each visitor opened that day.</p></div>
          ${(d.sources || []).length ? `<div class="vz-table-wrap"><table class="vz-table"><thead><tr><th>Source</th><th>Visitors</th><th>Personalised</th><th>Checkout</th><th>Ordered</th></tr></thead><tbody>
          ${d.sources.map(s => `<tr><td>${esc(s.name)}</td><td>${num(s.visitors)}</td><td>${num(s.personalise)} <small>${pct(s.personalise, s.visitors)}%</small></td><td>${num(s.checkout)}</td><td>${num(s.purchases)}</td></tr>`).join('')}
          </tbody></table></div>` : '<div class="vz-empty">No data yet.</div>'}
        </section>

        <section class="dc-panel"><div class="dc-panel-head"><h2>Top pages</h2><p>Page views.</p></div>${bars(d.pages, 'views', r => pageName(r.name))}</section>
        <section class="dc-panel"><div class="dc-panel-head"><h2>Countries</h2><p>Visitors.</p></div>${bars(d.countries, 'visitors', r => countryName(r.name))}</section>
        <section class="dc-panel"><div class="dc-panel-head"><h2>Devices</h2><p>Visitors.</p></div>${bars(d.devices, 'visitors', r => r.name)}</section>
        <section class="dc-panel"><div class="dc-panel-head"><h2>Ad campaigns</h2><p>Visitors who arrived with a campaign tag.</p></div>${bars(d.campaigns, 'visitors', r => r.name)}</section>
      </div>`;
  }

  window.hkVisits = { load };
})();
