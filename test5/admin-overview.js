/* Hikaya dashboard — Overview (Oct 2026).
   The landing tab: sales in AED for a chosen period (vs the period before), a revenue
   chart, what needs attention today, the order pipeline, what sells, and the audience.
   Revenue rules match the Orders tab exactly: only paying "sale" orders count; gifts,
   influencer, replacement and test orders are tracked as giveaways.

   Needs window.hkOrders (admin-orders.js) and window.hkCRM (admin-crm.js). */
(function () {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const DAY = 864e5;
  const fmtAED = n => 'AED ' + Math.round(Number(n || 0)).toLocaleString('en-AE');
  const compact = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K' : String(Math.round(n));
  const dubaiDay = d => new Date(new Date(d).toLocaleString('en-US', { timeZone: 'Asia/Dubai' })).toDateString();
  const fmtDay = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Dubai' });
  const fmtMonth = d => new Date(d).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'Asia/Dubai' });
  function ago(d) {
    const ms = Date.now() - new Date(d).getTime();
    if (ms < 36e5) return Math.max(1, Math.round(ms / 6e4)) + ' min ago';
    if (ms < DAY) return Math.round(ms / 36e5) + ' h ago';
    return Math.round(ms / DAY) + ' d ago';
  }
  const PERIODS = { 7: 'Last 7 days', 30: 'Last 30 days', 90: 'Last 90 days', 0: 'All time' };
  let period = 30;
  try { const raw = localStorage.getItem('hk_ov_period'); if (raw !== null && Number(raw) in PERIODS) period = Number(raw); } catch (_) {}
  let crm = null;

  async function load() {
    const root = $('ov-root'); if (!root) return;
    await window.hkOrders.ready;
    if (window.hkCRM) window.hkCRM.onData(d => { crm = d; render(); });
    render();
  }

  function render() {
    const root = $('ov-root'); if (!root || !window.hkOrders) return;
    const O = window.hkOrders, h = O.helpers, all = O.orders || [];
    const now = Date.now();
    const start = period ? now - period * DAY : 0;
    const prevStart = period ? start - period * DAY : 0;
    const inP = (o, a, b) => { const t = new Date(o.created_at).getTime(); return t >= a && t < b; };
    const live = all.filter(h.counts);
    const cur = live.filter(o => inP(o, start, now + 1));
    const prev = period ? live.filter(o => inP(o, prevStart, start)) : [];
    const rev = list => list.filter(h.earned).reduce((a, o) => a + (O.aed(o) || 0), 0);
    const paid = list => list.filter(h.earned);
    const books = list => list.filter(h.earned).reduce((a, o) => a + (h.items(o).length || 1), 0);
    const R = rev(cur), Rp = rev(prev), N = paid(cur).length, Np = paid(prev).length;
    const aov = N ? R / N : 0, aovP = Np ? Rp / Np : 0;
    const give = cur.filter(h.giveaway).reduce((a, o) => a + h.retail(o), 0);

    // New vs returning customers in the period (by email, paying sales).
    const firstBuy = new Map();
    live.filter(h.earned).forEach(o => { const e = String(o.email || '').toLowerCase(); const t = new Date(o.created_at).getTime(); if (e && (!firstBuy.has(e) || t < firstBuy.get(e))) firstBuy.set(e, t); });
    const buyers = new Set(paid(cur).map(o => String(o.email || '').toLowerCase()).filter(Boolean));
    const newBuyers = [...buyers].filter(e => firstBuy.get(e) >= start).length;

    const delta = (a, b) => {
      if (!period) return '';
      if (!b) return a ? '<span class="ov-d up">new</span>' : '<span class="ov-d">no change</span>';
      const p = Math.round(((a - b) / b) * 100);
      return `<span class="ov-d ${p > 0 ? 'up' : p < 0 ? 'down' : ''}">${p > 0 ? '▲' : p < 0 ? '▼' : ''} ${Math.abs(p)}%</span>`;
    };
    const vs = period ? `vs previous ${period} days` : 'since launch';

    // Needs attention
    const open = live.filter(o => h.stageOf(o) !== 'delivered');
    const late = live.filter(h.isLate);
    const unpaid = all.filter(o => ['pending', 'awaiting_payment', 'amount_mismatch'].includes(o.payment_status) && h.stageOf(o) !== 'cancelled' && now - new Date(o.created_at) < 14 * DAY);
    const msgs = crm ? crm.messages.filter(m => !m.handled) : [];
    const carts = crm ? crm.contacts.filter(c => c.cart && now - new Date(c.cart.at) < 14 * DAY) : [];
    const sending = crm ? crm.campaigns.filter(c => c.status === 'sending') : [];
    const att = [
      late.length && { n: late.length, l: `order${late.length > 1 ? 's' : ''} running late`, s: 'Over the target time for their step', go: () => clickLate(), warn: true },
      unpaid.length && { n: unpaid.length, l: `awaiting payment`, s: 'Started checkout in the last 14 days, not paid', go: () => tab('orders'), warn: true },
      msgs.length && { n: msgs.length, l: `message${msgs.length > 1 ? 's' : ''} to answer`, s: 'From the contact form', go: () => window.hkCRM.open('messages'), warn: true },
      sending.length && { n: sending.length, l: `campaign${sending.length > 1 ? 's' : ''} paused mid-send`, s: 'Open Email campaigns and press Resume', go: () => window.hkCRM.open('campaigns'), warn: true },
      carts.length && { n: carts.length, l: `unfinished book${carts.length > 1 ? 's' : ''}`, s: 'Started personalising in the last 14 days', go: () => window.hkCRM.open('contacts') },
    ].filter(Boolean);

    // Pipeline
    const pipe = O.STAGES.map(s => ({ s, n: live.filter(o => h.stageOf(o) === s.key && (s.key !== 'delivered' || inP(o, start, now + 1))).length }));

    // What sells (books in paying + free orders in the period)
    const storyCount = {}, langCount = { en: 0, ar: 0 }, countryRev = {}, codeUse = {};
    cur.filter(o => h.earned(o) || h.giveaway(o)).forEach(o => {
      h.items(o).forEach(it => { const k = it.story || it.storyTitle || 'Unknown'; storyCount[k] = (storyCount[k] || 0) + 1; langCount[it.bookLanguage === 'ar' ? 'ar' : 'en']++; });
    });
    paid(cur).forEach(o => { const c = o.country || 'Unknown'; countryRev[c] = (countryRev[c] || 0) + (O.aed(o) || 0); if (o.promo_code) codeUse[o.promo_code] = (codeUse[o.promo_code] || 0) + 1; });

    // Audience
    const cs = crm ? crm.contacts : [];
    const newContacts = cs.filter(c => c.firstSeenAt && new Date(c.firstSeenAt).getTime() >= start).length;
    const lastCamp = crm ? crm.campaigns.filter(c => c.status === 'sent').sort((a, b) => String(b.sent_at).localeCompare(String(a.sent_at)))[0] : null;

    const hr = new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Dubai' });
    const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

    root.innerHTML = `
      <div class="ov-head">
        <div><h1>${greet}</h1><p>${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Dubai' })} · all amounts in AED</p></div>
        <div class="op-seg" role="group" aria-label="Period">${Object.entries(PERIODS).map(([k, l]) => `<button type="button" data-p="${k}" aria-pressed="${Number(k) === period}">${l.replace('Last ', '')}</button>`).join('')}</div>
      </div>

      <div class="op-kpis ov-kpis">
        <div class="op-kpi ov-hero"><div class="l">Revenue</div><div class="n">${fmtAED(R)}</div><div class="s">${delta(R, Rp)} ${vs}</div></div>
        <div class="op-kpi"><div class="l">Paid orders</div><div class="n">${N}</div><div class="s">${delta(N, Np)} · ${books(cur)} book${books(cur) === 1 ? '' : 's'}</div></div>
        <div class="op-kpi"><div class="l">Avg order</div><div class="n">${N ? fmtAED(aov) : '—'}</div><div class="s">${N && Np ? delta(aov, aovP) : '&nbsp;'}</div></div>
        <div class="op-kpi"><div class="l">Customers</div><div class="n">${buyers.size}</div><div class="s">${newBuyers} new · ${buyers.size - newBuyers} returning</div></div>
        <div class="op-kpi"><div class="l">Given away</div><div class="n">${fmtAED(give)}</div><div class="s">retail value, not revenue</div></div>
      </div>

      <div class="ov-grid">
        <section class="ov-card ov-wide">
          <div class="ov-card-h"><h2>Revenue</h2><span>${esc(PERIODS[period])} · paying orders only</span></div>
          ${chart(live.filter(h.earned), start, now, O.aed)}
        </section>
        <section class="ov-card">
          <div class="ov-card-h"><h2>Needs attention</h2><span>${att.length ? '' : 'today'}</span></div>
          ${att.length ? `<ul class="ov-att">${att.map((a, i) => `<li><button type="button" data-att="${i}" class="${a.warn ? 'warn' : ''}"><b>${a.n}</b><span>${esc(a.l)}<small>${esc(a.s)}</small></span><i aria-hidden="true">→</i></button></li>`).join('')}</ul>` : '<div class="ov-clear"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.5 9"/></svg>All clear. Nothing is late or waiting on you.</div>'}
        </section>
      </div>

      <section class="ov-card">
        <div class="ov-card-h"><h2>Order pipeline</h2><span>${open.length} open${late.length ? ` · ${late.length} late` : ''} · delivered counts ${esc(PERIODS[period].toLowerCase())}</span></div>
        <div class="ov-pipe">${pipe.map(p => `<button type="button" data-stage="${esc(p.s.key)}" class="${p.n ? '' : 'empty'}"><b>${p.n}</b><span>${esc(p.s.label)}</span></button>`).join('<i aria-hidden="true"></i>')}</div>
      </section>

      <div class="ov-grid three">
        <section class="ov-card"><div class="ov-card-h"><h2>Top stories</h2><span>books ordered</span></div>${bars(storyCount, v => `${v} book${v === 1 ? '' : 's'}`)}</section>
        <section class="ov-card"><div class="ov-card-h"><h2>Revenue by country</h2><span>AED</span></div>${bars(countryRev, fmtAED)}</section>
        <section class="ov-card"><div class="ov-card-h"><h2>Book language</h2><span>books ordered</span></div>${bars({ English: langCount.en, Arabic: langCount.ar }, v => `${v} book${v === 1 ? '' : 's'}`, true)}
          ${Object.keys(codeUse).length ? `<div class="ov-card-h" style="margin-top:16px;"><h2>Codes used</h2><span>orders</span></div>${bars(codeUse, v => `${v} order${v === 1 ? '' : 's'}`)}` : ''}</section>
      </div>

      <div class="ov-grid">
        <section class="ov-card">
          <div class="ov-card-h"><h2>Audience</h2><button type="button" class="op-btn link" data-go="contacts">Open CRM →</button></div>
          ${crm ? `<div class="ov-mini">
            <div><b>${cs.length}</b><span>contacts</span></div>
            <div><b>${cs.filter(c => c.canEmail).length}</b><span>can be emailed</span></div>
            <div><b>${newContacts}</b><span>new · ${esc(PERIODS[period].toLowerCase())}</span></div>
            <div><b>${cs.filter(c => c.orders >= 2).length}</b><span>repeat customers</span></div>
          </div>
          ${lastCamp && lastCamp.stats ? `<p class="ov-last">Last email: <b>${esc(lastCamp.name)}</b> · ${lastCamp.stats.sent} delivered · ${lastCamp.stats.sent ? Math.round(lastCamp.stats.opened / lastCamp.stats.sent * 100) : 0}% opened · ${lastCamp.stats.orders} order${lastCamp.stats.orders === 1 ? '' : 's'} in 7 days</p>` : '<p class="ov-last">No campaigns sent yet.</p>'}
          <button type="button" class="op-btn primary" data-go="new">Write an email campaign</button>` : '<p class="op-muted">Loading contacts…</p>'}
        </section>
        <section class="ov-card">
          <div class="ov-card-h"><h2>Latest activity</h2></div>
          ${feed(all, crm)}
        </section>
      </div>`;

    root.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { period = Number(b.dataset.p); try { localStorage.setItem('hk_ov_period', period); } catch (_) {} render(); });
    root.querySelectorAll('[data-att]').forEach(b => b.onclick = () => att[+b.dataset.att].go());
    root.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { tab('orders'); const s = document.querySelector(`.op-step[data-st="${CSS.escape(b.dataset.stage)}"]`); if (s && !s.classList.contains("on")) s.click(); });
    root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => b.dataset.go === 'new' ? (tab('crm'), window.hkCRM.newCampaign('launch')) : window.hkCRM.open('contacts'));
    root.querySelectorAll('[data-feed-order]').forEach(a => a.onclick = e => { e.preventDefault(); window.hkOrders.focus(a.dataset.feedOrder); });
    root.querySelectorAll('[data-feed-contact]').forEach(a => a.onclick = e => { e.preventDefault(); window.hkCRM.focusContact(a.dataset.feedContact); });
    bindTips(root);
  }

  function tab(k) { const t = document.querySelector(`.op-tabs [data-tab="${k}"]`); if (t) t.click(); }
  function clickLate() { tab('orders'); const k = document.querySelector('.op-kpi[data-late]'); if (k) k.click(); }

  /* Revenue columns: one per day (<= 90 days) or per month (all time). Single series, so no legend. */
  function chart(orders, start, now, aed) {
    let buckets = [];
    if (period) {
      for (let t = start; t <= now; t += DAY) buckets.push({ key: dubaiDay(t), label: fmtDay(t), v: 0, n: 0 });
    } else {
      const first = orders.length ? new Date(Math.min(...orders.map(o => new Date(o.created_at)))) : new Date();
      const d = new Date(first.getFullYear(), first.getMonth(), 1);
      while (d <= new Date()) { buckets.push({ key: d.getFullYear() + '-' + d.getMonth(), label: fmtMonth(d), v: 0, n: 0 }); d.setMonth(d.getMonth() + 1); }
    }
    const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    orders.forEach(o => {
      const t = new Date(o.created_at); if (period && t.getTime() < start) return;
      const k = period ? dubaiDay(t) : t.getFullYear() + '-' + t.getMonth();
      if (idx[k] != null) { buckets[idx[k]].v += aed(o) || 0; buckets[idx[k]].n++; }
    });
    const total = buckets.reduce((a, b) => a + b.v, 0);
    if (!total) return `<div class="ov-nochart">No paid orders in this period yet. Revenue will chart here day by day.</div>`;
    const W = 720, Hh = 200, pl = 44, pr = 8, pt = 14, pb = 26;
    const max = Math.max(...buckets.map(b => b.v));
    const step = niceStep(max / 4); const top = Math.ceil(max / step) * step || 1;
    const bw = (W - pl - pr) / buckets.length; const barW = Math.max(2, Math.min(24, bw - 2));
    const y = v => pt + (Hh - pt - pb) * (1 - v / top);
    const ticks = []; for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
    const labelEvery = Math.ceil(buckets.length / 8);
    const peak = buckets.reduce((m, b, i) => b.v > buckets[m].v ? i : m, 0);
    return `<svg class="ov-chart" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Revenue per ${period ? 'day' : 'month'}, total ${fmtAED(total)}">
      ${ticks.map(v => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="g"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end" class="t">${compact(v)}</text>`).join('')}
      ${buckets.map((b, i) => {
        const x = pl + i * bw + (bw - barW) / 2, yy = y(b.v), hgt = Math.max(0, Hh - pb - yy);
        const r = Math.min(4, barW / 2, hgt);
        const path = hgt > 0 ? `M${x},${Hh - pb} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + barW - r} Q${x + barW},${yy} ${x + barW},${yy + r} V${Hh - pb} Z` : '';
        return `<g class="hit" data-tip="${esc(b.label)}: ${esc(fmtAED(b.v))} · ${b.n} order${b.n === 1 ? '' : 's'}"><rect x="${pl + i * bw}" y="${pt}" width="${bw}" height="${Hh - pt - pb}" fill="transparent"/>${path ? `<path d="${path}" class="b"/>` : ''}</g>
          ${i % labelEvery === 0 ? `<text x="${pl + i * bw + bw / 2}" y="${Hh - 8}" text-anchor="middle" class="t">${esc(b.label)}</text>` : ''}
          ${i === peak && b.v ? `<text x="${Math.min(W - pr - 4, Math.max(pl + 20, x + barW / 2))}" y="${yy - 4}" text-anchor="middle" class="v">${esc(compact(b.v))}</text>` : ''}`;
      }).join('')}
      <line x1="${pl}" x2="${W - pr}" y1="${Hh - pb}" y2="${Hh - pb}" class="a"/>
    </svg>
    <details class="ov-table"><summary>Show as table</summary><table><thead><tr><th>${period ? 'Day' : 'Month'}</th><th>Orders</th><th>Revenue</th></tr></thead><tbody>${buckets.filter(b => b.n).map(b => `<tr><td>${esc(b.label)}</td><td>${b.n}</td><td>${esc(fmtAED(b.v))}</td></tr>`).join('')}</tbody></table></details>`;
  }
  function niceStep(raw) {
    if (!raw) return 1; const p = Math.pow(10, Math.floor(Math.log10(raw))); const f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }

  /* Horizontal bars (magnitude, one hue), value labelled at the tip. */
  function bars(obj, fmt, keepZero) {
    const rows = Object.entries(obj).filter(([, v]) => keepZero || v > 0).sort((a, b) => b[1] - a[1]);
    if (!rows.length || !rows.some(([, v]) => v > 0)) return '<p class="op-muted ov-nochart sm">Nothing in this period yet.</p>';
    const shown = rows.slice(0, 6); const rest = rows.slice(6).reduce((a, [, v]) => a + v, 0);
    if (rest) shown.push(['Other', rest]);
    const max = Math.max(...shown.map(r => r[1])) || 1;
    return `<ul class="ov-bars">${shown.map(([k, v]) => `<li data-tip="${esc(k)}: ${esc(fmt(v))}"><span class="k">${esc(k)}</span><span class="bar"><i style="width:${Math.max(2, (v / max) * 100)}%"></i></span><span class="v">${esc(fmt(v))}</span></li>`).join('')}</ul>`;
  }

  function feed(orders, crm) {
    const ev = [];
    orders.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8).forEach(o => ev.push({ at: o.created_at, html: `<a href="#" data-feed-order="${esc(o.order_number)}">${esc(o.full_name || 'Someone')}</a> placed <b>${esc(o.order_number || 'an order')}</b>${window.hkOrders.helpers.isSale(o) && window.hkOrders.helpers.earned(o) ? ` · ${esc(fmtAED(window.hkOrders.aed(o)))}` : ''}` }));
    if (crm) {
      crm.messages.slice(0, 5).forEach(m => ev.push({ at: m.created_at, html: `<a href="#" data-feed-contact="${esc(String(m.email || '').toLowerCase())}">${esc(m.name || m.email)}</a> sent a message` }));
      crm.contacts.filter(c => c.subscribedAt).sort((a, b) => String(b.subscribedAt).localeCompare(String(a.subscribedAt))).slice(0, 5).forEach(c => ev.push({ at: c.subscribedAt, html: `<a href="#" data-feed-contact="${esc(c.email)}">${esc(c.name || c.email)}</a> joined the newsletter` }));
      crm.campaigns.filter(c => c.sent_at).slice(0, 3).forEach(c => ev.push({ at: c.sent_at, html: `Email <b>${esc(c.name)}</b> sent to ${c.recipients}` }));
    }
    const list = ev.filter(e => e.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 9);
    return list.length ? `<ul class="ov-feed">${list.map(e => `<li><span>${e.html}</span><time>${esc(ago(e.at))}</time></li>`).join('')}</ul>` : '<p class="op-muted">Nothing yet.</p>';
  }

  /* One tooltip for every chart mark (hover, focus or tap). */
  function bindTips(root) {
    let tip = $('ov-tip'); if (!tip) { tip = document.createElement('div'); tip.id = 'ov-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    const show = (el, x, y) => { tip.textContent = el.dataset.tip; tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('on'); };
    root.querySelectorAll('[data-tip]').forEach(el => {
      el.addEventListener('mousemove', e => show(el, e.clientX, e.clientY));
      el.addEventListener('mouseleave', () => tip.classList.remove('on'));
      el.addEventListener('click', e => { show(el, e.clientX, e.clientY); setTimeout(() => tip.classList.remove('on'), 1800); });
    });
  }

  window.hkOverview = { load, render };
})();
