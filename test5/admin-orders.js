/* Hikaya dashboard — Orders (Oct 2026 rebuild).
   Six-step fulfilment pipeline, every amount in AED, list + board views.

     received → ai_production → printing → back_from_printing → with_courier → delivered

   Loaded by admin.html; started with window.hkOrders.load(password). */
(function () {
  'use strict';

  /* ---------- Pipeline ---------- */
  const STAGES = [
    { key: 'received', label: 'Received', short: 'Received', next: 'Start AI production', hint: 'New order. Check the photo, name and age, then start AI production.', sla: 1,
      icon: '<path d="M4 7l8-4 8 4v10l-8 4-8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/>' },
    { key: 'ai_production', label: 'AI production', short: 'AI', next: 'Send to printing', hint: 'Illustrations are being generated and checked. Send the final files to the printer when they look right.', sla: 2,
      icon: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>' },
    { key: 'printing', label: 'At the printer', short: 'Printing', next: 'Received from printing', hint: 'The book is being printed. Mark it received once it is back with you.', sla: 4,
      icon: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>' },
    { key: 'back_from_printing', label: 'Back from printing', short: 'Packing', next: 'Hand to delivery company', hint: 'Quality-check the book, gift-box it, then hand it to the delivery company.', sla: 1,
      icon: '<rect x="3.5" y="9" width="17" height="11" rx="1"/><path d="M3 9h18M12 9v11M12 9c-1.5-3.5-5.5-4-5.5-1.5S10 9 12 9zm0 0c1.5-3.5 5.5-4 5.5-1.5S14 9 12 9z"/>' },
    { key: 'with_courier', label: 'With delivery company', short: 'Courier', next: 'Mark delivered', hint: 'Out for delivery. Mark delivered once the customer has it.', sla: 7,
      icon: '<path d="M2 6h11v10H2zM13 9h4.5L21 12.5V16h-8"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>' },
    { key: 'delivered', label: 'Delivered', short: 'Delivered', next: null, hint: 'Done. The customer has their book.', sla: null,
      icon: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.5 9"/>' },
  ];
  const KEYS = STAGES.map(s => s.key);
  const LEGACY = { preparing: 'ai_production', awaiting_approval: 'ai_production', sent_to_printing: 'printing', received_from_printing: 'back_from_printing', shipped: 'with_courier' };
  const stageOf = o => { const s = o.order_status || 'received'; return s === 'cancelled' || KEYS.includes(s) ? s : (LEGACY[s] || 'received'); };
  const S = k => STAGES.find(s => s.key === k);
  const COURIERS = ['Aramex', 'Emirates Post', 'DHL', 'SMSA', 'Quiqup', 'Fetchr', 'Own delivery'];

  const PAY = { pending: ['Awaiting payment', 'warn'], awaiting_payment: ['Awaiting payment', 'warn'], pending_cod: ['Cash on delivery', 'info'], paid: ['Paid', 'ok'], waived: ['Nothing to pay (code)', 'type'], refunded: ['Refunded', 'bad'], failed: ['Payment failed', 'bad'], canceled: ['Payment cancelled', 'bad'], payment_start_failed: ['Payment not started', 'bad'], amount_mismatch: ['Check amount', 'warn'], code_rejected: ['Code rejected', 'bad'] };
  /* What kind of order it is. Only "sale" counts as revenue; the others are
     tracked as giveaways (their retail value is shown separately). This is
     different from is_gift, which means a paying customer sent the book to
     someone else. */
  const TYPES = {
    sale: { label: 'Sale', hint: 'A normal paying order. Counts as revenue.' },
    gift: { label: 'Gift (free)', hint: 'A book we gave away. Not revenue.' },
    influencer: { label: 'Influencer (free)', hint: 'Sent to a creator for content. Not revenue.' },
    replacement: { label: 'Replacement', hint: 'Reprint for a damaged or wrong book. Not revenue.' },
    test: { label: 'Test', hint: 'Internal test order. Not revenue.' },
  };
  const typeOf = o => (TYPES[o.order_type] ? o.order_type : 'sale');
  const isSale = o => typeOf(o) === 'sale';
  const METHOD = { free: 'No payment (covered by a code)', ziina: 'Ziina (card / Apple Pay)', cod: 'Cash on delivery', card: 'Card', applepay: 'Apple Pay', googlepay: 'Google Pay', tabby: 'Tabby', tamara: 'Tamara', shamcash: 'Sham Cash', paytabs: 'PayTabs' };

  /* ---------- Money: everything in AED ---------- */
  /* AED per 1 unit of each currency (GCC pegs; USD peg 3.6725). Keep in sync with region.js. */
  const AED_PER = Object.assign({ AED: 1, SAR: 0.97933, QAR: 1.00893, BHD: 9.76729, OMR: 9.55137, KWD: 11.95, USD: 3.6725, EUR: 4.0, GBP: 4.65 }, window.HIKAYA_AED_RATES || {});
  function aed(o) {
    if (o.charged_aed != null && o.charged_aed !== '') return Number(o.charged_aed);
    const n = parseFloat(o.amount); if (isNaN(n)) return null;
    const r = AED_PER[(o.currency || 'AED').toUpperCase()]; return r ? n * r : n;
  }
  const fmtAED = n => n == null ? '—' : 'AED ' + Number(n).toLocaleString('en-AE', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const origNote = o => { const c = (o.currency || 'AED').toUpperCase(); return c !== 'AED' && o.amount != null && o.payment_status !== 'waived' ? `Customer paid ${Number(o.amount).toFixed(2)} ${c}` : ''; };
  const counts = o => !['refunded', 'failed'].includes(o.payment_status) && stageOf(o) !== 'cancelled';
  const earned = o => counts(o) && isSale(o) && (o.payment_status === 'paid' || o.payment_status === 'pending_cod');
  const retail = o => (o.list_value_aed != null && o.list_value_aed !== '' ? Number(o.list_value_aed) : aed(o)) || 0;
  const giveaway = o => counts(o) && !isSale(o) && typeOf(o) !== 'test' && ['paid', 'waived', 'pending_cod'].includes(o.payment_status);

  /* ---------- Helpers ---------- */
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAY = 864e5;
  const fmtDate = d => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDay = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
  function ago(d) {
    if (!d) return ''; const ms = Date.now() - new Date(d).getTime();
    if (ms < 36e5) return Math.max(1, Math.round(ms / 6e4)) + ' min';
    if (ms < DAY) return Math.round(ms / 36e5) + ' h';
    const n = Math.floor(ms / DAY); return n + (n === 1 ? ' day' : ' days');
  }
  /* When each stage happened: stage_history first, then sensible fallbacks for older orders. */
  function stageTimes(o) {
    const t = {};
    (Array.isArray(o.stage_history) ? o.stage_history : []).forEach(h => { if (h && h.at) { const k = LEGACY[h.stage] || h.stage; t[k] = h.at; } });
    if (!t.received) t.received = o.created_at;
    const cur = stageOf(o); if (cur !== 'cancelled' && !t[cur]) t[cur] = o.status_updated_at || o.created_at;
    return t;
  }
  const sinceStage = o => stageTimes(o)[stageOf(o)] || o.status_updated_at || o.created_at;
  function isLate(o) {
    const st = stageOf(o); const s = S(st); if (!s || !s.sla) return false;
    if (st === 'received' && o.payment_status === 'pending') return false; // not paid yet: not ours to chase
    return (Date.now() - new Date(sinceStage(o)).getTime()) / DAY > s.sla;
  }
  const items = o => { if (Array.isArray(o.items)) return o.items; try { return JSON.parse(o.items || '[]'); } catch (_) { return []; } };
  const kidsLine = o => items(o).map(i => `${esc(i.childName || '—')} · ${esc(i.story || '')}`).join(' + ') || 'Order';
  const svg = (p, c) => `<svg class="${c || 'ic'}" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;

  /* ---------- State ---------- */
  let pw = null, orders = [];
  const open = new Set(), full = new Map();
  const f = { q: '', stage: 'active', pay: 'all', type: 'all', view: (function () { try { return localStorage.getItem('hk_admin_view') || 'list'; } catch (_) { return 'list'; } })() };
  const $ = id => document.getElementById(id);

  async function api(path, opts) {
    const res = await fetch('/.netlify/functions/' + path, Object.assign({ headers: { 'Content-Type': 'application/json', 'x-admin-password': pw } }, opts || {}));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  async function load(password) {
    if (password) pw = password;
    const box = $('orders-state-box'), sub = $('orders-sub');
    try {
      const data = await api('get-orders');
      if (!data.tableReady) { box.textContent = "Orders can't be loaded yet — SUPABASE_SERVICE_ROLE_KEY still needs to be added in Netlify."; sub.textContent = ''; return; }
      orders = (data.orders || []).map(o => Object.assign(o, { _items: items(o) }));
      sub.textContent = `${orders.length} order${orders.length === 1 ? '' : 's'} · all amounts in AED · updated ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
      renderStats();
      box.style.display = orders.length ? 'none' : '';
      if (!orders.length) { box.textContent = 'No orders yet. They will appear here the moment a customer checks out.'; return; }
      shell();
    } catch (err) { console.error(err); box.textContent = err.message || 'Could not load orders.'; }
  }

  /* ---------- KPIs (AED) ---------- */
  function renderStats() {
    const row = $('orders-stats-row'); if (!row) return;
    const live = orders.filter(counts);
    const rev = live.filter(earned).reduce((a, o) => a + (aed(o) || 0), 0);
    const paidN = live.filter(earned).length;
    const now = Date.now();
    const month = live.filter(o => o.created_at && new Date(o.created_at).getMonth() === new Date().getMonth() && new Date(o.created_at).getFullYear() === new Date().getFullYear() && earned(o)).reduce((a, o) => a + (aed(o) || 0), 0);
    const week = live.filter(o => o.created_at && now - new Date(o.created_at) < 7 * DAY).length;
    const toDo = live.filter(o => stageOf(o) !== 'delivered').length;
    const late = live.filter(isLate).length;
    const books = live.filter(earned).reduce((a, o) => a + (o._items.length || 1), 0);
    const gifts = live.filter(giveaway);
    const giftVal = gifts.reduce((a, o) => a + retail(o), 0);
    const disc = live.filter(earned).reduce((a, o) => a + (Number(o.promo_discount_aed) || 0), 0);
    const withCode = live.filter(o => earned(o) && o.promo_code).length;
    row.style.display = 'grid';
    row.className = 'wrap op-kpis op-kpis-7';
    row.innerHTML = [
      ['Revenue (sales only)', fmtAED(Math.round(rev)), `${paidN} paid order${paidN === 1 ? '' : 's'} · free orders excluded`],
      ['This month', fmtAED(Math.round(month)), new Date().toLocaleDateString('en-GB', { month: 'long' })],
      ['Average order', paidN ? fmtAED(Math.round(rev / paidN)) : '—', `${books} book${books === 1 ? '' : 's'} sold`],
      ['Giveaways', String(gifts.length), gifts.length ? `${fmtAED(Math.round(giftVal))} retail value` : 'Gift, influencer & replacement orders'],
      ['Code discounts', fmtAED(Math.round(disc)), `${withCode} sale${withCode === 1 ? '' : 's'} used a code`],
      ['To fulfil', String(toDo), `${week} new this week`],
      ['Needs attention', String(late), late ? 'Over the usual time for their step' : 'Everything on time', late ? 'warn' : 'ok'],
    ].map(([l, n, s, tone]) => `<div class="op-kpi ${tone || ''}" ${l === 'Needs attention' && late ? 'data-late role="button" tabindex="0" title="Show these orders"' : ''}><div class="l">${esc(l)}</div><div class="n">${esc(n)}</div><div class="s">${esc(s)}</div></div>`).join('');
    const lateCard = row.querySelector('[data-late]');
    if (lateCard) { const go = () => { f.stage = 'late'; f.view = 'list'; renderAll(); }; lateCard.onclick = go; lateCard.onkeydown = e => { if (e.key === 'Enter') go(); }; }
  }

  /* ---------- Shell ---------- */
  function shell() {
    const box = $('orders-content');
    let el = $('op-shell'); if (!el) { el = document.createElement('div'); el.id = 'op-shell'; box.appendChild(el); }
    el.innerHTML = `
      <div class="op-flow" id="op-flow" role="tablist" aria-label="Orders by step"></div>
      <div class="op-toolbar">
        <label class="op-search">${svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>')}<input type="search" id="op-q" placeholder="Search order no., child, customer, phone, city…" value="${esc(f.q)}"></label>
        <select id="op-pay" aria-label="Payment"><option value="all">All payments</option>${Object.entries(PAY).filter(([k]) => k !== 'awaiting_payment').map(([k, [l]]) => `<option value="${k}">${l}</option>`).join('')}</select>
        <select id="op-type" aria-label="Order type"><option value="all">All order types</option><option value="sale">Sales only</option><option value="free">Free &amp; internal only</option>${Object.entries(TYPES).filter(([k]) => k !== 'sale').map(([k, t]) => `<option value="${k}">${t.label}</option>`).join('')}</select>
        <div class="op-seg" role="group" aria-label="View"><button data-view="list">List</button><button data-view="board">Board</button></div>
        <button class="op-btn ghost" id="op-refresh" title="Refresh">${svg('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>')}<span>Refresh</span></button>
        <button class="op-btn ghost" id="op-export">${svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>')}<span>Export CSV</span></button>
      </div>
      <div id="op-main"></div>`;
    $('op-pay').value = f.pay; $('op-type').value = f.type;
    $('op-type').onchange = e => { f.type = e.target.value; renderMain(); renderFlow(); };
    $('op-q').oninput = e => { f.q = e.target.value; renderMain(); renderFlow(); };
    $('op-pay').onchange = e => { f.pay = e.target.value; renderMain(); renderFlow(); };
    $('op-refresh').onclick = () => load();
    $('op-export').onclick = exportCsv;
    el.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { f.view = b.dataset.view; try { localStorage.setItem('hk_admin_view', f.view); } catch (_) {} renderAll(); });
    renderAll();
  }
  function renderAll() { renderFlow(); renderMain(); document.querySelectorAll('#op-shell [data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === f.view))); }

  function match(o, ignoreStage) {
    const st = stageOf(o);
    if (!ignoreStage) {
      if (f.stage === 'active' && (st === 'delivered' || st === 'cancelled')) return false;
      if (f.stage === 'late' && !isLate(o)) return false;
      if (!['all', 'active', 'late'].includes(f.stage) && st !== f.stage) return false;
    }
    if (f.pay !== 'all' && o.payment_status !== f.pay && !(f.pay === 'pending' && o.payment_status === 'awaiting_payment')) return false;
    if (f.type === 'sale' && !isSale(o)) return false;
    if (f.type === 'free' && isSale(o)) return false;
    if (!['all', 'sale', 'free'].includes(f.type) && typeOf(o) !== f.type) return false;
    const q = f.q.trim().toLowerCase();
    if (q) {
      const kids = o._items.map(i => `${i.childName || ''} ${i.story || ''}`).join(' ');
      if (![o.order_number, o.full_name, o.email, o.phone, o.city, o.country, o.tracking_number, o.promo_code, kids].join(' ').toLowerCase().includes(q)) return false;
    }
    return true;
  }

  /* The pipeline strip: one tile per step with a count, click to filter. */
  function renderFlow() {
    const base = orders.filter(o => match(o, true));
    const c = k => base.filter(o => stageOf(o) === k).length;
    const lateN = base.filter(o => isLate(o)).length;
    const activeN = base.filter(o => !['delivered', 'cancelled'].includes(stageOf(o))).length;
    $('op-flow').innerHTML = `
      <div class="op-flow-steps">${STAGES.map((s, i) => {
        const n = c(s.key); const lt = base.filter(o => stageOf(o) === s.key && isLate(o)).length;
        return `<button role="tab" class="op-step ${f.stage === s.key ? 'on' : ''} ${n ? '' : 'empty'}" data-st="${s.key}" aria-selected="${f.stage === s.key}">
          <span class="op-step-ic">${svg(s.icon)}</span><span class="op-step-n">${n}</span><span class="op-step-l">${esc(s.label)}</span>
          ${lt ? `<span class="op-step-late" title="${lt} over the usual time">${lt} late</span>` : ''}
          ${i < STAGES.length - 1 ? '<span class="op-step-arrow" aria-hidden="true"></span>' : ''}</button>`;
      }).join('')}</div>
      <div class="op-flow-filters">
        <button class="op-chip ${f.stage === 'active' ? 'on' : ''}" data-st="active">In progress <b>${activeN}</b></button>
        <button class="op-chip warn ${f.stage === 'late' ? 'on' : ''}" data-st="late" ${lateN ? '' : 'disabled'}>Needs attention <b>${lateN}</b></button>
        <button class="op-chip ${f.stage === 'all' ? 'on' : ''}" data-st="all">All orders <b>${base.length}</b></button>
        <button class="op-chip ${f.stage === 'cancelled' ? 'on' : ''}" data-st="cancelled">Cancelled <b>${c('cancelled')}</b></button>
      </div>`;
    $('op-flow').querySelectorAll('[data-st]').forEach(b => b.onclick = () => { f.stage = f.stage === b.dataset.st && KEYS.includes(b.dataset.st) ? 'active' : b.dataset.st; renderAll(); });
  }

  function renderMain() {
    const main = $('op-main'); if (!main) return;
    if (f.view === 'board') return renderBoard(main);
    const rows = orders.filter(o => match(o));
    const title = f.stage === 'active' ? 'In progress' : f.stage === 'late' ? 'Needs attention' : f.stage === 'all' ? 'All orders' : f.stage === 'cancelled' ? 'Cancelled' : S(f.stage).label;
    main.innerHTML = `<div class="op-listhead"><h2>${esc(title)}</h2><span>${rows.length} order${rows.length === 1 ? '' : 's'}</span></div>` +
      (rows.length ? rows.map(card).join('') : `<div class="op-empty">${svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.5 9"/>', 'big')}<p>${f.stage === 'late' ? 'Nothing is running late.' : 'No orders here right now.'}</p></div>`);
    rows.forEach(bind);
  }

  /* ---------- Board (kanban) ---------- */
  function renderBoard(main) {
    const base = orders.filter(o => match(o, true));
    main.innerHTML = `<div class="op-board">${STAGES.map(s => {
      const col = base.filter(o => stageOf(o) === s.key).sort((a, b) => new Date(sinceStage(a)) - new Date(sinceStage(b)));
      const shown = s.key === 'delivered' ? col.slice(-8).reverse() : col;
      return `<section class="op-col ${f.stage === s.key ? 'on' : ''}"><header><span class="op-step-ic sm">${svg(s.icon)}</span><h3>${esc(s.label)}</h3><b>${col.length}</b></header>
        <div class="op-col-body">${shown.map(o => `<article class="op-mini ${isLate(o) ? 'late' : ''}" data-open="${o.id}" tabindex="0">
          <div class="t">${kidsLine(o)}</div>
          <div class="m"><span>${esc(o.order_number || '')}</span><span>${isSale(o) ? fmtAED(aed(o)) : `<b class="op-free">${esc(TYPES[typeOf(o)].label)}</b>`}</span></div>
          <div class="m"><span>${esc(o.city || o.country || '')}</span><span class="${isLate(o) ? 'lt' : ''}">${ago(sinceStage(o))}</span></div>
          ${S(s.key).next ? `<button class="op-btn primary sm" data-next="${o.id}">${esc(S(s.key).next)} →</button>` : ''}
        </article>`).join('') || '<p class="op-col-empty">Nothing here</p>'}
        ${s.key === 'delivered' && col.length > 8 ? `<p class="op-col-empty">Showing the latest 8</p>` : ''}</div></section>`;
    }).join('')}</div>`;
    main.querySelectorAll('[data-open]').forEach(el => {
      const go = e => { if (e.target.closest('[data-next]')) return; open.add(el.dataset.open); f.view = 'list'; f.stage = stageOf(orders.find(o => o.id === el.dataset.open)); renderAll(); const c = $('op-' + el.dataset.open); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter') go(e); };
    });
    main.querySelectorAll('[data-next]').forEach(b => b.onclick = e => {
      e.stopPropagation(); const o = orders.find(x => x.id === b.dataset.next); const i = KEYS.indexOf(stageOf(o));
      if (KEYS[i + 1] === 'with_courier') { open.add(o.id); f.view = 'list'; f.stage = stageOf(o); renderAll(); const c = $('op-' + o.id); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'start' }); const inp = c.querySelector('[data-courier]'); inp && inp.focus(); } return; }
      move(o, KEYS[i + 1], {});
    });
  }

  /* ---------- Order card ---------- */
  function progressDots(o) {
    const st = stageOf(o); const idx = KEYS.indexOf(st);
    return `<div class="op-dots" aria-label="Step ${idx + 1} of ${KEYS.length}: ${esc(S(st) ? S(st).label : st)}">${STAGES.map((s, i) => `<i class="${i < idx ? 'd' : i === idx ? 'c' : ''}" title="${esc(s.label)}"></i>`).join('')}</div>`;
  }

  function stepper(o) {
    const st = stageOf(o); const idx = KEYS.indexOf(st); const t = stageTimes(o);
    return `<ol class="op-stepper">${STAGES.map((s, i) => {
      const state = i < idx ? 'done' : i === idx ? 'cur' : 'todo';
      const when = state !== 'todo' && t[s.key] ? fmtDate(t[s.key]) : state === 'todo' ? '' : '';
      const dur = state === 'cur' && s.key !== 'delivered' ? `for ${ago(t[s.key] || sinceStage(o))}` : '';
      return `<li class="${state} ${state === 'cur' && isLate(o) ? 'late' : ''}">
        <button type="button" class="op-node" data-set="${s.key}" title="${state === 'cur' ? 'Current step' : 'Set to ' + esc(s.label)}" ${state === 'cur' ? 'disabled' : ''}>${state === 'done' ? svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>') : svg(s.icon)}</button>
        <div class="op-node-l">${esc(s.label)}</div><div class="op-node-t">${esc(when)}${dur ? `<br><b>${esc(dur)}</b>` : ''}</div></li>`;
    }).join('')}</ol>`;
  }

  function nextPanel(o) {
    const st = stageOf(o); if (st === 'cancelled') return `<div class="op-next cancelled"><div><b>This order is cancelled.</b><p>Restore it to put it back at “Received”.</p></div><button class="op-btn" data-restore>Restore order</button></div>`;
    const i = KEYS.indexOf(st); const cur = S(st); const nk = KEYS[i + 1];
    if (!nk) return `<div class="op-next done"><div><b>Delivered ${esc(fmtDay(stageTimes(o).delivered))}</b><p>${esc(cur.hint)}</p></div></div>`;
    const unpaid = o.payment_status === 'pending' || o.payment_status === 'failed';
    const courierForm = nk === 'with_courier' ? `
      <div class="op-courier">
        <label><span>Delivery company</span><input data-courier list="op-couriers-${o.id}" value="${esc(o.courier || '')}" placeholder="e.g. Aramex"><datalist id="op-couriers-${o.id}">${COURIERS.map(c => `<option value="${c}">`).join('')}</datalist></label>
        <label><span>Tracking number <small>(optional)</small></span><input data-tno value="${esc(o.tracking_number || '')}" placeholder="e.g. 3487 2210 77"></label>
        <label class="wide"><span>Tracking link <small>(optional)</small></span><input data-turl type="url" value="${esc(o.tracking_url || '')}" placeholder="https://…"></label>
      </div>` : '';
    const notify = (nk === 'with_courier' || nk === 'delivered') && o.email ? `<label class="op-check"><input type="checkbox" data-notify checked> Email the customer${nk === 'with_courier' ? ' that it’s on its way' : ' that it’s delivered'}</label>` : '';
    return `<div class="op-next ${isLate(o) ? 'late' : ''}">
      <div class="op-next-copy"><span class="op-now">Now: ${esc(cur.label)} · ${esc(ago(sinceStage(o)))}${isLate(o) ? ' · <em>over the usual ' + cur.sla + ' day' + (cur.sla > 1 ? 's' : '') + '</em>' : ''}</span><p>${esc(cur.hint)}</p>
        ${unpaid ? '<p class="op-warn">Payment is not confirmed yet. Check before starting production.</p>' : ''}</div>
      ${courierForm}
      <div class="op-next-actions">${notify}
        <button class="op-btn primary lg" data-advance="${nk}">${esc(cur.next)} →</button>
        ${i > 0 ? `<button class="op-btn link" data-back="${KEYS[i - 1]}">← Move back a step (${esc(S(KEYS[i - 1]).label)})</button>` : ''}
      </div>
    </div>`;
  }

  function card(o) {
    const st = stageOf(o); const its = o._items;
    const [payL, payC] = PAY[o.payment_status] || [o.payment_status || '—', ''];
    const phone = (o.phone || '').replace(/[^\d]/g, '');
    const lang = its.map(i => i.bookLanguage).filter(Boolean);
    const stBadge = st === 'cancelled' ? '<span class="op-badge bad">Cancelled</span>' : `<span class="op-badge stage s-${st}">${esc(S(st).label)}</span>`;
    return `
    <article class="op-card ${open.has(o.id) ? 'open' : ''} ${isLate(o) ? 'late' : ''} ${isSale(o) ? '' : 'nonsale'}" id="op-${o.id}">
      <div class="op-head" data-toggle role="button" tabindex="0" aria-expanded="${open.has(o.id)}">
        <div class="op-head-main">
          <div class="op-title">${kidsLine(o)}</div>
          <div class="op-sub"><span class="no">${esc(o.order_number || '')}</span> · ${esc(o.full_name || o.email || '')}${o.city ? ' · ' + esc(o.city) : ''}${o.country ? ', ' + esc(o.country) : ''}</div>
          <div class="op-badges">${stBadge}<span class="op-badge ${payC}">${payL}</span>${its.length > 1 ? `<span class="op-badge">${its.length} books</span>` : ''}${lang.length ? `<span class="op-badge">${lang.map(l => l === 'ar' ? 'Arabic' : 'English').filter((v, i, a) => a.indexOf(v) === i).join(' + ')} book</span>` : ''}${isSale(o) ? '' : `<span class="op-badge type">${esc(TYPES[typeOf(o)].label)}</span>`}${o.is_gift ? '<span class="op-badge info">Sent as a gift</span>' : ''}${o.promo_code ? `<span class="op-badge">Code ${esc(o.promo_code)}</span>` : ''}${isLate(o) ? `<span class="op-badge warn">${esc(ago(sinceStage(o)))} in this step</span>` : ''}</div>
        </div>
        <div class="op-head-side">
          <div class="op-amt">${isSale(o) ? fmtAED(aed(o)) : `<span class="op-free">Free</span>`}</div>${isSale(o) ? '' : `<div class="op-date">value ${fmtAED(Math.round(retail(o)))}</div>`}
          <div class="op-date">${esc(fmtDate(o.created_at))}</div>
          ${st !== 'cancelled' ? progressDots(o) : ''}
        </div>
        <span class="op-chev" aria-hidden="true">${svg('<path d="M6 9l6 6 6-6"/>')}</span>
      </div>
      <div class="op-body">
        ${st !== 'cancelled' ? stepper(o) : ''}
        ${nextPanel(o)}
        <div class="op-grid">
          <section class="op-box"><h4>Books (${its.length})</h4>${its.map((it, n) => `
            <div class="op-item"><strong>${esc(it.story || '—')}</strong>
              <div class="op-item-m">${esc(it.childName || '—')}${it.childAge ? ' · age ' + esc(it.childAge) : ''}${it.ageEdition ? ' · ' + esc(it.ageEdition) + ' edition' : ''}${it.gender ? ' · ' + esc(it.gender) : ''}${it.extraCharacterName ? ' · + ' + esc(it.extraCharacterName) : ''}${it.bookLanguage ? ' · <b>' + (it.bookLanguage === 'ar' ? 'Arabic' : 'English') + ' book</b>' : ''}</div>
              ${it.dedication ? `<div class="op-quote">“${esc(it.dedication)}”</div>` : ''}
              <div class="op-photos" data-photos="${n}">${((it.photos || []).length + (it.photoPaths || []).length) ? '<span class="op-muted">Loading photos…</span>' : '<span class="op-muted">No photos</span>'}</div>
            </div>`).join('')}</section>
          <section class="op-box"><h4>Customer &amp; delivery</h4><dl class="op-kv">
            <dt>Name</dt><dd>${esc(o.full_name || '—')}</dd>
            <dt>Email</dt><dd>${o.email ? `<a href="mailto:${esc(o.email)}?subject=${encodeURIComponent('Your Hikaya order ' + (o.order_number || ''))}">${esc(o.email)}</a>` : '—'}</dd>
            <dt>Phone</dt><dd>${o.phone ? `${esc(o.phone)}${phone ? ` · <a target="_blank" rel="noopener" href="https://wa.me/${phone}">WhatsApp</a>` : ''}` : '—'}</dd>
            <dt>Address</dt><dd>${esc([o.address, o.city, o.country].filter(Boolean).join(', ') || '—')}</dd>
            ${o.courier || o.tracking_number ? `<dt>Courier</dt><dd>${esc(o.courier || '—')}${o.tracking_number ? ' · ' + (o.tracking_url ? `<a target="_blank" rel="noopener" href="${esc(o.tracking_url)}">${esc(o.tracking_number)}</a>` : esc(o.tracking_number)) : ''}</dd>` : ''}
          </dl>${o.is_gift && o.gift_message ? `<div class="op-quote">Gift note: “${esc(o.gift_message)}”</div>` : ''}</section>
          <section class="op-box"><h4>Payment</h4><dl class="op-kv">
            <dt>Total</dt><dd class="big">${fmtAED(aed(o))}${isSale(o) ? '' : ' <span class="op-muted">· not revenue</span>'}</dd>
            ${o.list_value_aed != null && Number(o.list_value_aed) !== Number(aed(o)) ? `<dt>List price</dt><dd>${fmtAED(o.list_value_aed)}</dd>` : ''}
            ${origNote(o) ? `<dt></dt><dd class="op-muted">${esc(origNote(o))}</dd>` : ''}
            <dt>Status</dt><dd><span class="op-badge ${payC}">${payL}</span></dd>
            <dt>Method</dt><dd>${esc(METHOD[o.payment_method] || o.payment_method || '—')}</dd>
            ${o.bundle_discount_pct ? `<dt>Bundle</dt><dd>−${esc(o.bundle_discount_pct)}%</dd>` : ''}
            ${o.promo_code ? `<dt>Code</dt><dd><a href="#discounts" data-code="${esc(o.promo_code)}">${esc(o.promo_code)}</a>${Number(o.promo_discount_aed) ? ' · −' + fmtAED(o.promo_discount_aed) : ''}</dd>` : ''}
            ${o.ziina_payment_id ? `<dt>Ziina ref</dt><dd class="op-mono">${esc(o.ziina_payment_id)}</dd>` : ''}
            ${o.paytabs_tran_ref ? `<dt>PayTabs ref</dt><dd class="op-mono">${esc(o.paytabs_tran_ref)}</dd>` : ''}
            <dt>Placed</dt><dd>${esc(fmtDate(o.created_at))}</dd>
          </dl></section>
        </div>
        <section class="op-box op-notes-box"><h4>Order type <span class="op-muted">· ${esc(TYPES[typeOf(o)].hint)}</span></h4>
          <div class="op-type">
            <label><span>Type</span><select data-otype>${Object.entries(TYPES).map(([k, t]) => `<option value="${k}" ${typeOf(o) === k ? 'selected' : ''}>${t.label}</option>`).join('')}</select></label>
            <label><span>Reason <small>(optional)</small></span><input data-otype-note value="${esc(o.order_type_note || '')}" placeholder="e.g. Instagram creator @…"></label>
            <button type="button" class="op-btn" data-otype-save>Save type</button>
            ${o.email ? '<button type="button" class="op-btn ghost" data-issue-code title="Create a code for this customer (e.g. a feedback reward)">Give this customer a code</button>' : ''}
          </div></section>
        <section class="op-box op-notes-box"><h4>Internal notes <span class="op-muted" data-note-status></span></h4>
          <textarea class="op-notes" data-notes placeholder="Only you can see this. E.g. printer job no., special requests…">${esc(o.admin_notes || '')}</textarea></section>
        <div class="op-foot">
          ${o.payment_status === 'waived' ? '' : o.payment_status !== 'paid' ? '<button class="op-btn" data-pay="paid">Mark as paid</button>' : '<button class="op-btn" data-pay="refunded">Mark refunded</button>'}
          ${o.order_number && o.email ? `<a class="op-btn" target="_blank" rel="noopener" href="invoice.html?order=${encodeURIComponent(o.order_number)}&email=${encodeURIComponent(o.email)}">Invoice</a>` : ''}
          ${st === 'cancelled' ? '' : '<button class="op-btn danger" data-cancel>Cancel order</button>'}
          <span class="op-status" data-status role="status"></span>
        </div>
      </div>
    </article>`;
  }

  function bind(o) {
    const el = $('op-' + o.id); if (!el) return;
    const head = el.querySelector('[data-toggle]');
    const toggle = () => { el.classList.toggle('open'); const on = el.classList.contains('open'); head.setAttribute('aria-expanded', String(on)); if (on) { open.add(o.id); photos(o, el); } else open.delete(o.id); };
    head.onclick = e => { if (e.target.closest('a')) return; toggle(); };
    head.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
    if (el.classList.contains('open')) photos(o, el);

    const adv = el.querySelector('[data-advance]');
    if (adv) adv.onclick = () => {
      const extra = {}; const nk = adv.dataset.advance;
      if (nk === 'with_courier') {
        const c = el.querySelector('[data-courier]').value.trim();
        if (!c) { status(el, 'Add the delivery company first.', true); el.querySelector('[data-courier]').focus(); return; }
        extra.courier = c; extra.trackingNumber = el.querySelector('[data-tno]').value.trim(); extra.trackingUrl = el.querySelector('[data-turl]').value.trim();
        if (extra.trackingUrl && !/^https?:\/\//i.test(extra.trackingUrl)) { status(el, 'The tracking link should start with https://', true); return; }
      }
      const nt = el.querySelector('[data-notify]'); if (nt) extra.notifyCustomer = nt.checked;
      move(o, nk, extra);
    };
    const back = el.querySelector('[data-back]'); if (back) back.onclick = () => move(o, back.dataset.back, {});
    el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
      const target = b.dataset.set; const from = KEYS.indexOf(stageOf(o)); const to = KEYS.indexOf(target);
      if (Math.abs(to - from) > 1 && !confirm(`Jump this order straight to “${S(target).label}”?`)) return;
      move(o, target, {});
    });
    const rs = el.querySelector('[data-restore]'); if (rs) rs.onclick = () => move(o, 'received', {}, 'Order restored');
    el.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => save(o, { paymentStatus: b.dataset.pay }, `Marked ${PAY[b.dataset.pay][0].toLowerCase()}`));
    const c = el.querySelector('[data-cancel]'); if (c) c.onclick = () => { if (confirm(`Cancel order ${o.order_number || ''}? You can restore it later.`)) move(o, 'cancelled', {}, 'Order cancelled'); };
    const ts = el.querySelector('[data-otype-save]');
    if (ts) ts.onclick = () => {
      const t = el.querySelector('[data-otype]').value, note = el.querySelector('[data-otype-note]').value.trim();
      if (t !== 'sale' && isSale(o) && (aed(o) || 0) > 0 && ['paid', 'pending_cod'].includes(o.payment_status) &&
        !confirm(`This order collected ${fmtAED(aed(o))}. Marking it “${TYPES[t].label}” removes it from revenue. Continue?`)) return;
      save(o, { orderType: t, orderTypeNote: note }, `Marked as ${TYPES[t].label}`);
    };
    const ic = el.querySelector('[data-issue-code]');
    if (ic) ic.onclick = () => window.hkDiscounts && window.hkDiscounts.prefill({ email: o.email, name: o.full_name, orderNumber: o.order_number, templateTag: 'review' });
    el.querySelectorAll('[data-code]').forEach(a => a.onclick = e => {
      e.preventDefault(); const tab = document.querySelector('.op-tabs [data-tab="discounts"]'); if (tab) tab.click();
      const q = document.getElementById('dc-q'); if (q) { q.value = a.dataset.code; q.dispatchEvent(new Event('input')); }
    });
    const ta = el.querySelector('[data-notes]'), ns = el.querySelector('[data-note-status]'); let tm;
    ta.oninput = () => { ns.textContent = '· unsaved'; clearTimeout(tm); tm = setTimeout(async () => {
      try { await api('update-order', { method: 'POST', body: JSON.stringify({ orderId: o.id, adminNotes: ta.value }) }); o.admin_notes = ta.value; ns.textContent = '· saved'; }
      catch (e) { ns.textContent = '· ' + e.message; }
    }, 700); };
  }

  function status(el, msg, bad) { const s = el && el.querySelector('[data-status]'); if (s) { s.textContent = msg; s.classList.toggle('bad', !!bad); } }

  async function move(o, stage, extra, msg) {
    const label = stage === 'cancelled' ? 'Cancelled' : S(stage).label;
    await save(o, Object.assign({ orderStatus: stage }, extra), msg || `Moved to ${label}`);
  }
  async function save(o, patch, okMsg) {
    const el = $('op-' + o.id); status(el, 'Saving…');
    document.querySelectorAll(`[data-next="${o.id}"],#op-${o.id} [data-advance]`).forEach(b => b.disabled = true);
    try {
      const r = await api('update-order', { method: 'POST', body: JSON.stringify(Object.assign({ orderId: o.id }, patch)) });
      if (r.order) Object.assign(o, r.order, { _items: o._items });
      open.add(o.id);
      renderStats(); renderAll();
      const msg = okMsg + (r.emailed ? ' · customer emailed' : (patch.notifyCustomer ? ' · email not sent (email sending isn’t set up yet)' : ''));
      toast(msg);
      status($('op-' + o.id), msg);
    } catch (e) {
      status($('op-' + o.id), e.message, true); toast(e.message, true);
      document.querySelectorAll(`[data-next="${o.id}"],#op-${o.id} [data-advance]`).forEach(b => b.disabled = false);
    }
  }

  let toastT;
  function toast(msg, bad) {
    let t = $('op-toast'); if (!t) { t = document.createElement('div'); t.id = 'op-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.className = 'show' + (bad ? ' bad' : ''); clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, 2600);
  }

  async function photos(o, el) {
    const needs = o._items.some(i => (i.photos || []).length || (i.extraCharacterPhotos || []).length || (i.photoPaths || []).length || (i.extraCharacterPhotoPaths || []).length);
    if (!needs) return;
    let its = full.get(o.id);
    if (!its) {
      try { const d = await api('get-orders?id=' + encodeURIComponent(o.id)); its = (d.orders && d.orders[0] && items(d.orders[0])) || []; full.set(o.id, its); }
      catch (_) { its = []; }
    }
    its.forEach((it, n) => {
      const box = el.querySelector(`[data-photos="${n}"]`); if (!box) return;
      const pics = [...(it.photos || []).map(p => ({ ...p, who: it.childName || 'Child' })), ...(it.extraCharacterPhotos || []).map(p => ({ ...p, who: it.extraCharacterName || 'Extra' }))]
        .filter(p => p.dataUrl && (/^data:image\//.test(p.dataUrl) || p.dataUrl.indexOf('https://zxzlarlpoctpnnnvzced.supabase.co/storage/v1/object/sign/') === 0));
      box.innerHTML = pics.length ? pics.map((p, k) => `<a href="${p.dataUrl}" download="${esc((o.order_number || 'order') + '-' + p.who + '-' + (k + 1))}" title="${esc(p.who)}: click to download"><img src="${p.dataUrl}" alt="${esc(p.who)}"><span>${esc(p.who)}</span></a>`).join('') : '<span class="op-muted">No photos</span>';
    });
  }

  function exportCsv() {
    const cell = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const head = ['order_number', 'placed', 'order_type', 'counts_as_revenue', 'step', 'step_since', 'payment_status', 'payment_method', 'total_aed', 'list_value_aed', 'code_discount_aed', 'paid_currency', 'paid_amount', 'full_name', 'email', 'phone', 'address', 'city', 'country', 'courier', 'tracking_number', 'is_gift', 'gift_message', 'promo_code', 'bundle_discount_pct', 'books', 'admin_notes'];
    const rows = orders.filter(o => match(o)).map(o => [o.order_number, o.created_at, TYPES[typeOf(o)].label, earned(o) ? 'yes' : 'no', stageOf(o) === 'cancelled' ? 'Cancelled' : S(stageOf(o)).label, sinceStage(o), o.payment_status, o.payment_method, aed(o) == null ? '' : aed(o).toFixed(2), o.list_value_aed ?? '', o.promo_discount_aed ?? '', o.currency, o.amount, o.full_name, o.email, o.phone, o.address, o.city, o.country, o.courier, o.tracking_number, o.is_gift, o.gift_message, o.promo_code, o.bundle_discount_pct,
      o._items.map(i => `${i.story} for ${i.childName}${i.bookLanguage ? ' (' + i.bookLanguage + ')' : ''}`).join('; '), o.admin_notes].map(cell).join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + [head.join(','), ...rows].join('\n')], { type: 'text/csv' }));
    a.download = `hikaya-orders-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  }

  // Jump to one order (used by the Discounts tab).
  function focus(no) {
    const tab = document.querySelector('.op-tabs [data-tab="orders"]'); if (tab) tab.click();
    const o = orders.find(x => x.order_number === no);
    f.q = no || ''; f.stage = 'all'; f.pay = 'all'; f.type = 'all'; f.view = 'list';
    if (o) open.add(o.id);
    if ($('op-shell')) { $('op-q').value = f.q; $('op-pay').value = 'all'; $('op-type').value = 'all'; renderAll(); }
    const c = o && $('op-' + o.id); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'start' }); photos(o, c); }
  }

  window.hkOrders = { load, focus, STAGES, aed, fmtAED };
})();
