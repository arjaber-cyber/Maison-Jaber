/* Hikaya dashboard — Customers (Oct 2026).
   One place for "who are my customers and where did they come from":
   where each order came from, the short-link maker (one tagged link per
   post), repeat customers, checkouts that were never paid, WhatsApp clicks
   and Google searches. Data from admin-customers.js.

   Loaded by admin.html; started with window.hkCustomers.load(password). */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => (n == null ? '—' : Number(n).toLocaleString('en-AE'));
  const AED = n => 'AED ' + Number(n || 0).toLocaleString('en-AE', { maximumFractionDigits: 0 });
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const date = d => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' }) : '—');
  const ago = d => { const h = (Date.now() - new Date(d)) / 3600e3; return h < 24 ? Math.max(1, Math.round(h)) + 'h ago' : Math.round(h / 24) + 'd ago'; };
  const SITE = 'https://maison-jaber.com';
  const RANGES = [['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days'], ['all', 'All time']];
  const PAGES = [['/hikaya/', 'Homepage'], ['/hikaya/stories.html', 'All stories'], ['custom', 'Another page…']];
  const STATUS = { awaiting_payment: 'Left at payment', failed: 'Payment failed', canceled: 'Cancelled at payment', payment_start_failed: "Payment didn't open" };
  const COUNTRY_CODE = { UAE: '971', Saudi: '966', Qatar: '974', Kuwait: '965', Bahrain: '973', Oman: '968' };

  let pw = null, range = '30d', busy = false, data = null, srcView = 'last', custFilter = '', repeatOnly = false;

  const api = async (path, opts = {}) => {
    const res = await fetch('/.netlify/functions/' + path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-admin-password': pw, ...(opts.headers || {}) } });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Something went wrong.');
    return d;
  };

  function load(password) {
    if (password) pw = password;
    shell();
    fetchData();
  }

  function shell() {
    const root = $('cu-root'); if (!root || root.dataset.ready) return;
    root.dataset.ready = '1';
    root.innerHTML = `
      <div class="op-toolbar">
        <div class="op-seg" role="group" aria-label="Time range">${RANGES.map(([k, l]) => `<button type="button" data-cu-range="${k}" aria-pressed="${k === range}">${l}</button>`).join('')}</div>
        <button type="button" class="op-btn ghost" id="cu-refresh">Refresh</button>
      </div>
      <div id="cu-body"><div class="state-box">Loading customers…</div></div>`;
    root.querySelectorAll('[data-cu-range]').forEach(b => b.addEventListener('click', () => {
      range = b.dataset.cuRange;
      root.querySelectorAll('[data-cu-range]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      fetchData();
    }));
    $('cu-refresh').addEventListener('click', fetchData);
  }

  async function fetchData() {
    if (busy) return; busy = true;
    const body = $('cu-body');
    try {
      data = await api('admin-customers?range=' + encodeURIComponent(range));
      render();
    } catch (err) {
      if (body) body.innerHTML = `<div class="state-box">${esc(err.message)}</div>`;
    } finally { busy = false; }
  }

  /* ---------- Sections ---------- */

  function setupBox(s) {
    const steps = [];
    if (!s.attribution || !s.links) steps.push(`<li><b>Turn on order sources and short links</b> (one time, 1 minute): in Supabase open <em>SQL Editor</em>, paste the file <code>supabase/2026-10-customer-tracking.sql</code> from the site code and press Run.</li>`);
    if (!s.meta) steps.push(`<li><b>Connect Meta</b> so Instagram knows who bought: send Claude your <em>Pixel ID</em> and a <em>Conversions API token</em> (Meta Events Manager → your dataset → Settings).</li>`);
    if (!s.google) steps.push(`<li><b>Connect Google Search Console</b> to see what people searched on Google. Steps are in the Google searches box below.</li>`);
    if (!steps.length) return '';
    return `<section class="cu-setup"><h2>A few one-time steps left</h2><ol>${steps.join('')}</ol><p>Everything else already works. Orders placed before this was switched on show as "Not recorded".</p></section>`;
  }

  function kpis(k) {
    return `<div class="op-kpis cu-kpis">
      <div class="op-kpi"><div class="l">Orders</div><div class="n">${num(k.orders)}</div><div class="s">${AED(k.revenue)}</div></div>
      <div class="op-kpi"><div class="l">From ads</div><div class="n">${num(k.fromAds)}</div><div class="s">${pct(k.fromAds, k.orders)}% of orders</div></div>
      <div class="op-kpi"><div class="l">New customers</div><div class="n">${num(k.newCustomers)}</div><div class="s">avg order ${AED(k.avgOrder)}</div></div>
      <div class="op-kpi ${k.repeatCustomers ? 'ok' : ''}"><div class="l">Repeat customers</div><div class="n">${num(k.repeatCustomers)}</div><div class="s">${k.repeatRate}% of ${num(k.customers)} customers</div></div>
      <div class="op-kpi ${k.unpaid ? 'warn' : ''}"><div class="l">Didn't finish paying</div><div class="n">${num(k.unpaid)}</div><div class="s">${AED(k.unpaidValue)} left behind</div></div>
      <div class="op-kpi"><div class="l">WhatsApp clicks</div><div class="n">${num(data.whatsapp)}</div><div class="s">people who asked a question</div></div>
    </div>`;
  }

  function sourcesPanel() {
    const rows = data.sources[srcView] || [];
    const total = rows.reduce((s, r) => s + r.orders, 0);
    return `<section class="dc-panel"><div class="dc-panel-head cu-head"><div><h2>Where orders came from</h2>
        <p>${srcView === 'last' ? 'The visit that ended in the order (last click).' : 'How each customer first found Hikaya, even if they ordered on a later visit.'}</p></div>
        <div class="op-seg" role="group" aria-label="Which visit"><button type="button" data-src="last" aria-pressed="${srcView === 'last'}">Visit that ordered</button><button type="button" data-src="first" aria-pressed="${srcView === 'first'}">First found us</button></div></div>
      ${rows.length ? `<div class="vz-table-wrap"><table class="vz-table"><thead><tr><th>Source</th><th>Orders</th><th>Share</th><th>Revenue</th><th>Top posts / campaigns</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>${esc(r.name)}</td><td>${num(r.orders)}</td><td><span class="cu-share"><i style="width:${pct(r.orders, total)}%"></i></span> ${pct(r.orders, total)}%</td><td>${AED(r.revenue)}</td>
          <td class="cu-top">${r.top.length ? r.top.map(t => `<span>${esc(t.name)} <b>${t.orders}</b></span>`).join('') : '<span class="op-muted">—</span>'}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vz-empty">No paid orders in this period yet.</div>'}
    </section>`;
  }

  function linksPanel() {
    const links = data.links || [];
    const off = !data.setup.links;
    return `<section class="dc-panel" id="cu-links"><div class="dc-panel-head"><h2>Link maker</h2>
        <p>Make one short link per post, story, ad or influencer. Every click and order through it is counted below. Customers see a clean link.</p></div>
      ${off ? '<div class="cu-note">Links switch on after the one-time database step above.</div>' : `
      <form id="cu-link-form" class="dc-form" autocomplete="off">
        <label class="wide"><span>Name of the post</span><input name="postName" required maxlength="80" placeholder="e.g. Eid reel, Bio link, Sara (influencer)"></label>
        <label><span>Where you'll post it</span><select name="channel">${data.channels.map(c => `<option>${esc(c)}</option>`).join('')}</select></label>
        <label><span>Opens</span><select name="page">${PAGES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
        <label class="wide" data-custom hidden><span>Page address <small>(copy it from the site, e.g. a story page)</small></span><input name="destination" placeholder="https://maison-jaber.com/hikaya/story.html?s=…" dir="ltr"></label>
        <label><span>Discount for this post <small>(optional)</small></span><select name="discount"><option value="">No code</option><option>5</option><option>10</option><option>15</option><option>20</option></select><small>Makes a code for the caption, for posts where links can't be clicked</small></label>
        <div class="dc-actions"><button type="submit" class="op-btn primary">Make link</button></div>
      </form>
      <div id="cu-link-made"></div>`}
      ${links.length ? `<div class="vz-table-wrap cu-links"><table class="vz-table"><thead><tr><th>Post</th><th>Short link</th><th>Clicks</th><th>Orders</th><th>Revenue</th><th>Code</th><th></th></tr></thead><tbody>
        ${links.map(l => `<tr class="${l.active ? '' : 'cu-off'}"><td>${esc(l.name)}<small>${esc(l.channel || '')}${l.active ? '' : ' · paused'}</small></td>
          <td><button type="button" class="cu-copy" data-copy="${esc(SITE + '/go/' + l.code)}" title="Copy">maison-jaber.com/go/${esc(l.code)}</button></td>
          <td>${num(l.clicks)}</td><td>${num(l.orders)}${l.firstOrders ? `<small>+${l.firstOrders} found us here first</small>` : ''}</td><td>${AED(l.revenue)}</td>
          <td>${l.promo_code ? `<code>${esc(l.promo_code)}</code>` : '<span class="op-muted">—</span>'}</td>
          <td class="cu-act"><button type="button" class="op-btn ghost" data-pause="${esc(l.code)}" data-on="${l.active}">${l.active ? 'Pause' : 'Turn on'}</button>${l.clicks ? '' : `<button type="button" class="op-btn ghost danger" data-del="${esc(l.code)}">Delete</button>`}</td></tr>`).join('')}
      </tbody></table></div>` : (off ? '' : '<div class="vz-empty">No links yet. Make your first one above.</div>')}
      <p class="vz-note">Tip: links in normal Instagram captions can't be clicked. Use the link in your bio, stories and ads, and the post's discount code in the caption.</p>
    </section>`;
  }

  function customersPanel() {
    const q = custFilter.trim().toLowerCase();
    const rows = (data.customers || []).filter(c => (!repeatOnly || c.repeat) && (!q || [c.name, c.email, c.phone, c.country, c.firstSource, (c.numbers || []).join(' ')].join(' ').toLowerCase().includes(q)));
    return `<section class="dc-panel" id="cu-customers"><div class="dc-panel-head cu-head"><div><h2>Customers</h2><p>Everyone who has bought, newest first. All time.</p></div>
        <div class="cu-filters"><input type="search" id="cu-q" placeholder="Search name, email, order…" value="${esc(custFilter)}"><label class="vz-self"><input type="checkbox" id="cu-repeat" ${repeatOnly ? 'checked' : ''}/> Repeat only</label></div></div>
      ${rows.length ? `<div class="vz-table-wrap"><table class="vz-table cu-cust"><thead><tr><th>Customer</th><th>Orders</th><th>Books</th><th>Spent</th><th>First found us via</th><th>Last order</th></tr></thead><tbody>
        ${rows.slice(0, 100).map(c => `<tr><td>${esc(c.name || '—')}${c.repeat ? ' <span class="op-badge ok">Repeat</span>' : ''}<small>${esc(c.email || '')}${c.phone ? ' · ' + esc(c.phone) : ''}</small></td>
          <td>${num(c.orders)}<small>${(c.numbers || []).slice(-3).map(esc).join(', ')}</small></td><td>${num(c.books)}</td><td>${AED(c.spent)}</td><td>${esc(c.firstSource || '—')}</td><td>${date(c.lastOrder)}</td></tr>`).join('')}
      </tbody></table></div>${rows.length > 100 ? `<p class="vz-note">Showing 100 of ${rows.length}. Search to narrow down.</p>` : ''}` : '<div class="vz-empty">No customers match.</div>'}
      ${(data.repeatBySource || []).length ? `<h3 class="cu-sub">Which sources bring customers back</h3><ul class="vz-bars">${data.repeatBySource.slice(0, 8).map(r => `<li><span class="vz-bar-l">${esc(r.name)}</span><span class="vz-bar"><i style="width:${Math.max(2, pct(r.repeat, r.customers))}%"></i></span><b>${pct(r.repeat, r.customers)}%</b></li>`).join('')}</ul><p class="vz-note">Share of each source's customers who ordered again.</p>` : ''}
    </section>`;
  }

  function waLink(u) {
    let d = String(u.phone || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('00')) d = d.slice(2);
    else if (d.startsWith('0') && COUNTRY_CODE[u.country]) d = COUNTRY_CODE[u.country] + d.slice(1);
    const first = String(u.name || '').trim().split(' ')[0];
    const msg = `Hi ${first}, this is Hikaya. We noticed your order ${u.order_number} wasn't completed. Can we help with anything?`;
    return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`;
  }

  function unpaidPanel() {
    const rows = data.unpaid || [];
    return `<section class="dc-panel"><div class="dc-panel-head"><h2>Didn't finish paying</h2>
        <p>Reached the payment page but never paid, and didn't order later. A friendly message often brings them back. (Customers who left earlier, at the photo step, still get the automatic reminder email.)</p></div>
      ${rows.length ? `<div class="vz-table-wrap"><table class="vz-table"><thead><tr><th>Customer</th><th>Value</th><th>What happened</th><th>Came from</th><th>When</th><th></th></tr></thead><tbody>
        ${rows.map(u => `<tr><td>${esc(u.name || '—')}<small>${esc(u.email || '')}${u.phone ? ' · ' + esc(u.phone) : ''}</small></td><td>${AED(u.amount)}<small>${u.books || 1} book${u.books > 1 ? 's' : ''} · ${esc(u.order_number)}</small></td>
          <td>${esc(STATUS[u.status] || u.status)}<small>${esc(u.method || '')}</small></td><td>${esc(u.source || '—')}${u.detail ? `<small>${esc(u.detail)}</small>` : ''}</td><td>${ago(u.created_at)}</td>
          <td class="cu-act">${waLink(u) ? `<a class="op-btn ghost" target="_blank" rel="noopener" href="${esc(waLink(u))}">WhatsApp</a>` : ''}${u.email ? `<a class="op-btn ghost" href="mailto:${esc(u.email)}?subject=${encodeURIComponent('Your Hikaya story')}">Email</a>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vz-empty">Nobody left at the payment step in this period.</div>'}
    </section>`;
  }

  function searchPanel() {
    const s = data.search || {};
    let inner;
    if (!s.configured) {
      inner = `<div class="cu-note"><b>Not connected yet.</b> Free, one time (about 10 minutes):
        <ol><li>In <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud</a>, make a project and turn on the <em>Google Search Console API</em>.</li>
        <li>Create a <em>service account</em> and download a JSON key for it.</li>
        <li>In <a href="https://search.google.com/search-console" target="_blank" rel="noopener">Search Console</a> (property maison-jaber.com) → Settings → Users and permissions → add the service account's email as <em>Restricted</em>.</li>
        <li>Send Claude the key file and it will finish the rest.</li></ol>
        Google only gives search words as totals, never per person. The site opens to Google on 1 Nov, so searches start showing a few days after.</div>`;
    } else if (s.error) {
      inner = `<div class="cu-note">Couldn't read Search Console: ${esc(s.error)}</div>`;
    } else {
      const t = s.totals || {};
      inner = `<div class="cu-gsc-tot"><span><b>${num(t.clicks)}</b> clicks from Google</span><span><b>${num(t.impressions)}</b> times shown</span><span class="op-muted">${date(s.from)} – ${date(s.to)}</span></div>
        ${(s.queries || []).length ? `<div class="vz-table-wrap"><table class="vz-table"><thead><tr><th>What people searched</th><th>Clicks</th><th>Shown</th><th>Avg. position</th></tr></thead><tbody>
          ${s.queries.map(r => `<tr><td>${esc(r.name)}</td><td>${num(r.clicks)}</td><td>${num(r.impressions)}</td><td>${r.position ? r.position.toFixed(1) : '—'}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="vz-empty">No searches yet. Google needs a few days after launch.</div>'}`;
    }
    return `<section class="dc-panel"><div class="dc-panel-head"><h2>Google searches</h2><p>What people typed on Google before visiting Hikaya. Last 28 days.</p></div>${inner}</section>`;
  }

  function render() {
    const body = $('cu-body'); if (!body || !data) return;
    body.innerHTML = setupBox(data.setup) + kpis(data.kpis) + sourcesPanel() + linksPanel() + customersPanel() + unpaidPanel() + searchPanel()
      + '<p class="vz-note">Sources come from the link or ad each customer arrived through, saved with their order. Visitor numbers and the shop funnel are in the Visitors tab.</p>';
    wire();
  }

  /* ---------- Actions ---------- */

  function copy(text, btn) {
    const done = () => { if (!btn) return; const o = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(() => { btn.textContent = o; }, 1400); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => prompt('Copy this link:', text));
    else prompt('Copy this link:', text);
  }

  function wire() {
    const body = $('cu-body');
    body.querySelectorAll('[data-src]').forEach(b => b.addEventListener('click', () => { srcView = b.dataset.src; render(); }));
    body.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copy(b.dataset.copy, b)));
    const q = $('cu-q');
    if (q) q.addEventListener('input', () => {
      custFilter = q.value; const pos = q.selectionStart;
      const sec = $('cu-customers'); const tmp = document.createElement('div'); tmp.innerHTML = customersPanel(); sec.replaceWith(tmp.firstElementChild);
      wire(); const n = $('cu-q'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {}
    });
    const rp = $('cu-repeat'); if (rp) rp.addEventListener('change', () => { repeatOnly = rp.checked; render(); });

    body.querySelectorAll('[data-pause]').forEach(b => b.addEventListener('click', async () => {
      b.disabled = true;
      try { await api('admin-customers', { method: 'POST', body: JSON.stringify({ action: 'update_link', code: b.dataset.pause, active: b.dataset.on !== 'true' }) }); await fetchData(); }
      catch (e) { alert(e.message); b.disabled = false; }
    }));
    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Delete this link? Anyone who still has it will land on the homepage.')) return;
      b.disabled = true;
      try { await api('admin-customers', { method: 'POST', body: JSON.stringify({ action: 'delete_link', code: b.dataset.del }) }); await fetchData(); }
      catch (e) { alert(e.message); b.disabled = false; }
    }));

    const fm = $('cu-link-form'); if (!fm) return;
    const field = n => fm.querySelector(`[name="${n}"]`);
    field('page').addEventListener('change', () => { fm.querySelector('[data-custom]').hidden = field('page').value !== 'custom'; });
    fm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = fm.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Making…';
      const out = $('cu-link-made');
      try {
        const name = field('postName').value.trim();
        const destination = field('page').value === 'custom' ? field('destination').value.trim() : field('page').value;
        let promoCode = null;
        if (field('discount').value) {
          // A caption code for this post, made in the Discounts tab's system (unlimited uses, tracked there too).
          const base = name.toUpperCase().normalize('NFKD').replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'HIKAYA';
          const made = await api('admin-discounts', { method: 'POST', body: JSON.stringify({ action: 'create', type: 'percent', value: Number(field('discount').value), tag: 'campaign', code: base + field('discount').value, maxUses: null, validDays: null, note: 'Post: ' + name }) })
            .catch(async err => { // name taken: add a number
              return api('admin-discounts', { method: 'POST', body: JSON.stringify({ action: 'create', type: 'percent', value: Number(field('discount').value), tag: 'campaign', code: base + field('discount').value + Math.floor(Math.random() * 90 + 10), maxUses: null, validDays: null, note: 'Post: ' + name }) });
            });
          promoCode = (made.code && made.code.code) || (made.codes && made.codes[0] && made.codes[0].code) || made.code || null;
          if (typeof promoCode !== 'string') promoCode = null;
        }
        const { link } = await api('admin-customers', { method: 'POST', body: JSON.stringify({ action: 'create_link', name, channel: field('channel').value, destination, promoCode }) });
        const url = SITE + '/go/' + link.code;
        await fetchData();
        const out2 = $('cu-link-made');
        if (out2) {
          out2.innerHTML = `<div class="dc-made"><div><small>Your link for “${esc(link.name)}”</small><div class="dc-code-big cu-url">${esc(url.replace('https://', ''))}</div>${link.promo_code ? `<small>Caption code: <b>${esc(link.promo_code)}</b> (${esc(field('discount').value)}% off)</small>` : ''}</div>
            <div class="dc-made-actions"><button type="button" class="op-btn primary" id="cu-copy-new">Copy link</button>${link.promo_code ? '<button type="button" class="op-btn" id="cu-copy-code">Copy code</button>' : ''}</div></div>`;
          $('cu-copy-new').addEventListener('click', ev => copy(url, ev.currentTarget));
          if ($('cu-copy-code')) $('cu-copy-code').addEventListener('click', ev => copy(link.promo_code, ev.currentTarget));
          out2.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } catch (err) {
        if (out) out.innerHTML = `<div class="cu-note">${esc(err.message)}</div>`;
        btn.disabled = false; btn.textContent = 'Make link';
      }
    });
  }

  window.hkCustomers = { load };
})();
