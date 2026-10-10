/* Hikaya dashboard — Discounts (Oct 2026).
   Generate codes (one-off, personal or in batches), one-click templates,
   and a tracker showing every code's status, uses and what it cost / earned.
   All amounts in AED. Rule shown to customers: one discount per order —
   whichever is better, the bundle discount or the code.

   Loaded by admin.html; started with window.hkDiscounts.load(password). */
(function () {
  'use strict';

  const TYPES = {
    percent: { label: '% off', long: v => `${v}% off` },
    fixed: { label: 'AED off', long: v => `AED ${v} off` },
    free_shipping: { label: 'Free delivery', long: () => 'Free delivery' },
    free_order: { label: 'Free order (100%)', long: () => 'Free order: book + delivery' },
  };
  const TAGS = {
    review: 'Feedback reward', campaign: 'Campaign', influencer: 'Influencer', compensation: 'Compensation',
    gift: 'Gift', staff: 'Staff', test: 'Test',
  };
  const STATUS = { active: ['Active', 'ok'], paused: ['Paused', ''], expired: ['Expired', 'bad'], used: ['Used up', 'info'], scheduled: ['Not started', 'warn'] };

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtAED = n => 'AED ' + Number(n || 0).toLocaleString('en-AE', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const fmtDay = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' }) : '';
  const svg = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const $ = id => document.getElementById(id);
  const SHOP_URL = 'https://maison-jaber.com/test5/stories.html';

  let pw = null, codes = [], templates = [], reds = [], lastCreated = [];
  const f = { q: '', status: 'all', tag: 'all' };
  const open = new Set();

  async function api(opts) {
    const res = await fetch('/.netlify/functions/admin-discounts', Object.assign({ headers: { 'Content-Type': 'application/json', 'x-admin-password': pw } }, opts || {}));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }
  const post = body => api({ method: 'POST', body: JSON.stringify(body) });

  function statusOf(c) {
    if (c.active === false) return 'paused';
    if (c.starts_at && new Date(c.starts_at) > new Date()) return 'scheduled';
    if (c.expires_at && new Date(c.expires_at) < new Date()) return 'expired';
    if (c.max_uses != null && (c.uses_count || 0) >= c.max_uses) return 'used';
    return 'active';
  }
  const offer = c => TYPES[c.type] ? TYPES[c.type].long(Number(c.value)) : c.type;
  const redsFor = code => reds.filter(r => r.code === code && r.status === 'redeemed');

  /* ---------- Load ---------- */
  async function load(password) {
    if (password) pw = password;
    const box = $('dc-state');
    try {
      const d = await api();
      codes = d.codes || []; templates = d.templates || []; reds = d.redemptions || [];
      if (box) box.remove();
      shell();
    } catch (e) {
      if (box) box.textContent = e.message;
    }
  }

  /* ---------- Layout ---------- */
  function shell() {
    const root = $('dc-root'); if (!root) return;
    if (!$('dc-kpis')) {
      root.innerHTML = `
        <div class="op-kpis dc-kpis" id="dc-kpis"></div>
        <section class="dc-panel" aria-labelledby="dc-new-h">
          <div class="dc-panel-head"><h2 id="dc-new-h">New code</h2><p>Pick a template or set your own rules. Personal codes are locked to one email and can be emailed straight to the customer.</p></div>
          <div class="dc-templates" id="dc-templates"></div>
          <form id="dc-form" class="dc-form" autocomplete="off">
            <label><span>Type</span><select name="type">${Object.entries(TYPES).map(([k, t]) => `<option value="${k}">${t.label}</option>`).join('')}</select></label>
            <label data-value><span data-value-l>Percent off</span><input name="value" type="number" min="1" step="1" value="10" inputmode="decimal"></label>
            <label><span>Reason</span><select name="tag">${Object.entries(TAGS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
            <label><span>Valid for</span><div class="dc-inline"><input name="validDays" type="number" min="1" step="1" value="60" inputmode="numeric"><em>days</em></div><small>Leave empty for no end date</small></label>
            <label class="wide"><span>Customer email <small>(optional, locks the code to them)</small></span><input name="email" type="email" placeholder="customer@email.com" dir="ltr"></label>
            <label><span>Customer name <small>(for the email)</small></span><input name="customerName" placeholder="e.g. Sara"></label>
            <label><span>How many uses</span><select name="uses"><option value="1">Single use</option><option value="n">Limited…</option><option value="">Unlimited</option></select><input name="maxUses" type="number" min="1" step="1" placeholder="e.g. 50" hidden></label>
            <label><span>Min. order <small>(AED, optional)</small></span><input name="minOrderAed" type="number" min="0" step="1" placeholder="—"></label>
            <label><span>Linked order <small>(optional)</small></span><input name="issuedForOrder" placeholder="HK-12345678"></label>
            <details class="wide dc-more"><summary>Code name, batches, start date</summary>
              <div class="dc-form inner">
                <label><span>Custom code <small>(optional)</small></span><input name="code" placeholder="e.g. EID10" style="text-transform:uppercase"></label>
                <label><span>Prefix for generated codes</span><input name="prefix" value="HK" style="text-transform:uppercase"></label>
                <label><span>How many codes</span><input name="count" type="number" min="1" max="200" value="1"><small>Up to 200 unique codes at once</small></label>
                <label><span>Starts on <small>(optional)</small></span><input name="startsAt" type="date"></label>
              </div></details>
            <label class="wide"><span>Internal note <small>(optional)</small></span><input name="note" placeholder="e.g. Left a lovely Instagram story"></label>
            <div class="wide dc-actions">
              <label class="op-check"><input type="checkbox" name="sendEmail"> Email the code to the customer</label>
              <span class="dc-rule">${svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>')} One discount per order: customers get the bundle discount or the code, whichever is better.</span>
              <button type="button" class="op-btn ghost" id="dc-save-tpl">Save as template</button>
              <button type="submit" class="op-btn primary lg" id="dc-create">Generate code</button>
            </div>
            <input type="hidden" name="templateName">
          </form>
          <div id="dc-result" class="dc-result" hidden></div>
        </section>
        <section class="dc-panel" aria-labelledby="dc-track-h">
          <div class="dc-panel-head"><h2 id="dc-track-h">Code tracker</h2><p>Every code, how often it was used, the discount it gave and the sales it brought in.</p></div>
          <div class="dc-bytag" id="dc-bytag"></div>
          <div class="op-toolbar">
            <label class="op-search">${svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>')}<input type="search" id="dc-q" placeholder="Search code, email, note, order no.…"></label>
            <select id="dc-status" aria-label="Status"><option value="all">All statuses</option>${Object.entries(STATUS).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join('')}</select>
            <select id="dc-tag" aria-label="Reason"><option value="all">All reasons</option>${Object.entries(TAGS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
            <button class="op-btn ghost" id="dc-refresh">${svg('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>')}<span>Refresh</span></button>
            <button class="op-btn ghost" id="dc-export">${svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>')}<span>Export CSV</span></button>
          </div>
          <div id="dc-list"></div>
        </section>`;
      bindForm();
      $('dc-q').oninput = e => { f.q = e.target.value; renderList(); };
      $('dc-status').onchange = e => { f.status = e.target.value; renderList(); };
      $('dc-tag').onchange = e => { f.tag = e.target.value; renderList(); renderByTag(); };
      $('dc-refresh').onclick = () => load();
      $('dc-export').onclick = exportCsv;
    }
    renderKpis(); renderTemplates(); renderByTag(); renderList();
  }

  /* ---------- KPIs ---------- */
  function renderKpis() {
    const redeemed = reds.filter(r => r.status === 'redeemed');
    const active = codes.filter(c => statusOf(c) === 'active').length;
    const given = redeemed.reduce((a, r) => a + Number(r.discount_aed || 0), 0);
    const sales = redeemed.reduce((a, r) => a + Number(r.order_total_aed || 0), 0);
    const free = redeemed.filter(r => Number(r.order_total_aed || 0) === 0).length;
    const issued30 = codes.filter(c => c.created_at && Date.now() - new Date(c.created_at) < 30 * 864e5).length;
    $('dc-kpis').innerHTML = [
      ['Active codes', String(active), `${codes.length} created · ${issued30} in the last 30 days`],
      ['Times used', String(redeemed.length), 'Paid orders that used a code'],
      ['Discount given', fmtAED(Math.round(given)), 'Value off list price'],
      ['Sales with a code', fmtAED(Math.round(sales)), 'Money collected on those orders'],
      ['Free orders', String(free), 'Fully covered by a code · not revenue'],
    ].map(([l, n, s]) => `<div class="op-kpi"><div class="l">${esc(l)}</div><div class="n">${esc(n)}</div><div class="s">${esc(s)}</div></div>`).join('');
  }

  /* ---------- Templates ---------- */
  function renderTemplates() {
    const el = $('dc-templates');
    el.innerHTML = templates.length
      ? templates.map(t => `<span class="dc-tpl"><button type="button" data-tpl="${t.id}"><b>${esc(t.name)}</b><small>${esc(TYPES[t.type] ? TYPES[t.type].long(Number(t.value)) : t.type)} · ${t.valid_days ? t.valid_days + ' days' : 'no end date'} · ${t.max_uses === 1 ? 'single use' : t.max_uses ? t.max_uses + ' uses' : 'unlimited'}${t.lock_to_email ? ' · personal' : ''}</small></button><button type="button" class="dc-tpl-x" data-tpl-del="${t.id}" title="Delete template" aria-label="Delete template ${esc(t.name)}">×</button></span>`).join('')
      : '<p class="op-muted">No templates yet. Set up a code below and press “Save as template”.</p>';
    el.querySelectorAll('[data-tpl]').forEach(b => b.onclick = () => applyTemplate(templates.find(t => t.id === b.dataset.tpl)));
    el.querySelectorAll('[data-tpl-del]').forEach(b => b.onclick = async () => {
      const t = templates.find(x => x.id === b.dataset.tplDel);
      if (!confirm(`Delete the template “${t.name}”? Codes already made from it are not affected.`)) return;
      try { await post({ action: 'template_delete', id: t.id }); templates = templates.filter(x => x.id !== t.id); renderTemplates(); toast('Template deleted'); }
      catch (e) { toast(e.message, true); }
    });
  }

  function applyTemplate(t) {
    const fm = $('dc-form');
    fm.type.value = t.type; fm.value.value = Number(t.value) || '';
    fm.tag.value = t.tag; fm.validDays.value = t.valid_days || '';
    fm.uses.value = t.max_uses === 1 ? '1' : t.max_uses ? 'n' : ''; fm.maxUses.value = t.max_uses > 1 ? t.max_uses : '';
    fm.prefix.value = t.prefix || 'HK'; fm.templateName.value = t.name; fm.code.value = ''; fm.count.value = 1;
    fm.sendEmail.checked = !!t.lock_to_email;
    fm.dataset.lock = t.lock_to_email ? '1' : '';
    syncForm();
    document.querySelectorAll('#dc-templates [data-tpl]').forEach(b => b.classList.toggle('on', b.dataset.tpl === t.id));
    (t.lock_to_email ? fm.email : fm.note).focus();
  }

  /* ---------- Form ---------- */
  function syncForm() {
    const fm = $('dc-form'); const type = fm.type.value;
    const showVal = type === 'percent' || type === 'fixed';
    fm.querySelector('[data-value]').hidden = !showVal;
    fm.querySelector('[data-value-l]').textContent = type === 'fixed' ? 'AED off' : 'Percent off';
    fm.value.max = type === 'percent' ? 100 : 10000;
    fm.maxUses.hidden = fm.uses.value !== 'n';
    const many = Number(fm.count.value) > 1;
    fm.email.disabled = many; if (many) fm.email.value = '';
    fm.sendEmail.disabled = many || !fm.email.value.trim();
    if (fm.sendEmail.disabled) fm.sendEmail.checked = false;
    $('dc-create').textContent = many ? `Generate ${Number(fm.count.value)} codes` : 'Generate code';
  }

  function readForm() {
    const fm = $('dc-form'); const v = n => fm[n].value.trim();
    const body = {
      type: v('type'), value: v('value'), tag: v('tag'), validDays: v('validDays') || null,
      email: v('email') || null, customerName: v('customerName') || null,
      maxUses: fm.uses.value === '1' ? 1 : fm.uses.value === 'n' ? v('maxUses') : null,
      minOrderAed: v('minOrderAed') || null, issuedForOrder: v('issuedForOrder') || null,
      code: v('code') || null, prefix: v('prefix') || 'HK', count: v('count') || 1,
      startsAt: v('startsAt') || null, note: v('note') || null, templateName: v('templateName') || null,
      sendEmail: fm.sendEmail.checked,
    };
    if (body.email && body.maxUses == null) body.maxUsesPerEmail = 1;
    return body;
  }

  function bindForm() {
    const fm = $('dc-form');
    ['type', 'uses', 'count', 'email'].forEach(n => { fm[n].addEventListener('input', syncForm); fm[n].addEventListener('change', syncForm); });
    syncForm();
    fm.onsubmit = async e => {
      e.preventDefault();
      const body = readForm();
      if (fm.dataset.lock && !body.email && Number(body.count) === 1 && !confirm('This template is meant for one customer. Create it without an email (anyone with the code can use it)?')) return;
      if (body.type === 'free_order' && body.maxUses == null && !confirm('An unlimited free-order code gives away free books to anyone who has it. Continue?')) return;
      const btn = $('dc-create'); btn.disabled = true; const old = btn.textContent; btn.textContent = 'Creating…';
      try {
        const r = await post(Object.assign({ action: 'create' }, body));
        lastCreated = r.codes || [];
        codes = [...lastCreated, ...codes];
        renderKpis(); renderByTag(); renderList(); showResult(lastCreated, r.emailed, body);
        fm.code.value = ''; fm.email.value = ''; fm.customerName.value = ''; fm.note.value = ''; fm.issuedForOrder.value = ''; fm.count.value = 1; syncForm();
        toast(lastCreated.length > 1 ? `${lastCreated.length} codes created` : `Code ${lastCreated[0].code} created${r.emailed ? ' · emailed' : ''}`);
      } catch (err) { toast(err.message, true); }
      finally { btn.disabled = false; btn.textContent = old; syncForm(); }
    };
    $('dc-save-tpl').onclick = async () => {
      const b = readForm();
      const name = prompt('Template name', b.templateName || `${TAGS[b.tag]} · ${TYPES[b.type].long(b.value)}${b.validDays ? ' · ' + b.validDays + ' days' : ''}`);
      if (!name) return;
      try {
        const r = await post({ action: 'template_save', name, type: b.type, value: b.value, validDays: b.validDays, maxUses: b.maxUses, lockToEmail: !!b.email || $('dc-form').dataset.lock === '1', tag: b.tag, prefix: b.prefix });
        templates.push(r.template); renderTemplates(); toast('Template saved');
      } catch (e) { toast(e.message, true); }
    };
  }

  function shareText(c, name) {
    const until = c.expires_at ? ` Valid until ${fmtDay(c.expires_at)}.` : '';
    return `Hi${name ? ' ' + name : ''}! Here is your Hikaya code: ${c.code} (${offer(c).toLowerCase()}).${until} Enter it at checkout: ${SHOP_URL}`;
  }

  function showResult(list, emailed, body) {
    const el = $('dc-result'); el.hidden = false;
    if (list.length === 1) {
      const c = list[0];
      el.innerHTML = `<div class="dc-made"><div><span class="op-muted">New code</span><div class="dc-code-big">${esc(c.code)}</div>
        <div class="op-muted">${esc(offer(c))} · ${esc(TAGS[c.tag] || c.tag)}${c.expires_at ? ' · until ' + esc(fmtDay(c.expires_at)) : ''}${c.email ? ' · for ' + esc(c.email) : ''}${c.max_uses === 1 ? ' · single use' : ''}</div>
        ${body.sendEmail ? `<div class="${emailed ? 'op-status' : 'op-status bad'}">${emailed ? 'Emailed to the customer' : 'Email not sent (email sending isn’t set up yet). Copy it instead.'}</div>` : ''}</div>
        <div class="dc-made-actions"><button type="button" class="op-btn" data-copy="${esc(c.code)}">Copy code</button><button type="button" class="op-btn" data-copy-msg="${esc(c.code)}">Copy message</button>
        <a class="op-btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(shareText(c, body.customerName))}">WhatsApp</a></div></div>`;
      el.querySelector('[data-copy-msg]').onclick = () => copy(shareText(c, body.customerName), 'Message copied');
    } else {
      el.innerHTML = `<div class="dc-made"><div><span class="op-muted">${list.length} new codes · ${esc(offer(list[0]))}</span><div class="dc-batch">${list.map(c => `<code>${esc(c.code)}</code>`).join('')}</div></div>
        <div class="dc-made-actions"><button type="button" class="op-btn" data-copy-all>Copy all</button><button type="button" class="op-btn" data-batch-csv>Download CSV</button></div></div>`;
      el.querySelector('[data-copy-all]').onclick = () => copy(list.map(c => c.code).join('\n'), 'Codes copied');
      el.querySelector('[data-batch-csv]').onclick = () => download(`hikaya-codes-${new Date().toISOString().slice(0, 10)}.csv`, ['code,offer,valid_until', ...list.map(c => `${c.code},"${offer(c)}",${c.expires_at ? c.expires_at.slice(0, 10) : ''}`)].join('\n'));
    }
    el.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copy(b.dataset.copy, 'Code copied'));
  }

  /* ---------- Tracker ---------- */
  function match(c) {
    if (f.status !== 'all' && statusOf(c) !== f.status) return false;
    if (f.tag !== 'all' && c.tag !== f.tag) return false;
    const q = f.q.trim().toLowerCase();
    if (q) {
      const orders = reds.filter(r => r.code === c.code).map(r => r.order_number).join(' ');
      if (![c.code, c.email, c.note, c.template_name, c.issued_for_order, orders].join(' ').toLowerCase().includes(q)) return false;
    }
    return true;
  }

  function renderByTag() {
    const el = $('dc-bytag');
    const rows = Object.entries(TAGS).map(([k, l]) => {
      const cs = codes.filter(c => c.tag === k); if (!cs.length) return null;
      const rr = reds.filter(r => r.status === 'redeemed' && cs.some(c => c.code === r.code));
      return { k, l, issued: cs.length, used: rr.length, given: rr.reduce((a, r) => a + Number(r.discount_aed || 0), 0), sales: rr.reduce((a, r) => a + Number(r.order_total_aed || 0), 0) };
    }).filter(Boolean);
    el.innerHTML = rows.length ? `<div class="dc-tags">${rows.map(r => `<button type="button" class="dc-tagcard ${f.tag === r.k ? 'on' : ''}" data-tagf="${r.k}">
      <b>${esc(r.l)}</b><span>${r.issued} issued · ${r.used} used${r.issued ? ' (' + Math.round(r.used / r.issued * 100) + '%)' : ''}</span><span>${fmtAED(Math.round(r.given))} off · ${fmtAED(Math.round(r.sales))} sales</span></button>`).join('')}</div>` : '';
    el.querySelectorAll('[data-tagf]').forEach(b => b.onclick = () => { f.tag = f.tag === b.dataset.tagf ? 'all' : b.dataset.tagf; $('dc-tag').value = f.tag; renderByTag(); renderList(); });
  }

  function renderList() {
    const el = $('dc-list');
    const rows = codes.filter(match);
    if (!codes.length) { el.innerHTML = '<div class="op-empty">No codes yet. Create your first one above.</div>'; return; }
    if (!rows.length) { el.innerHTML = '<div class="op-empty">No codes match these filters.</div>'; return; }
    el.innerHTML = `<div class="dc-table" role="table" aria-label="Discount codes">
      <div class="dc-tr dc-th" role="row"><span role="columnheader">Code</span><span role="columnheader">Offer</span><span role="columnheader">Status</span><span role="columnheader">Used</span><span role="columnheader">Valid until</span><span role="columnheader">Discount · sales</span><span role="columnheader"></span></div>
      ${rows.slice(0, 500).map(row).join('')}</div>${rows.length > 500 ? `<p class="op-muted" style="margin-top:8px">Showing the newest 500 of ${rows.length}. Use search to narrow down.</p>` : ''}`;
    rows.slice(0, 500).forEach(bindRow);
  }

  function row(c) {
    const st = statusOf(c); const [sl, sc] = STATUS[st];
    const rr = redsFor(c.code);
    const given = rr.reduce((a, r) => a + Number(r.discount_aed || 0), 0), sales = rr.reduce((a, r) => a + Number(r.order_total_aed || 0), 0);
    const held = reds.filter(r => r.code === c.code && r.status === 'reserved').length;
    const isOpen = open.has(c.code);
    return `<div class="dc-tr ${isOpen ? 'open' : ''}" role="row" id="dc-${esc(c.code)}">
      <span role="cell" class="dc-c-code"><button type="button" class="dc-code" data-toggle title="Show details">${esc(c.code)}</button><small>${esc(TAGS[c.tag] || c.tag)}${c.email ? ' · ' + esc(c.email) : ''}</small></span>
      <span role="cell" data-l="Offer">${esc(offer(c))}${c.min_order_aed ? `<small>min. ${fmtAED(c.min_order_aed)}</small>` : ''}</span>
      <span role="cell" data-l="Status"><span class="op-badge ${sc}">${sl}</span>${held ? `<small>${held} at checkout now</small>` : ''}</span>
      <span role="cell" data-l="Used">${c.uses_count || 0}${c.max_uses != null ? ' / ' + c.max_uses : ' · no limit'}</span>
      <span role="cell" data-l="Valid until">${c.expires_at ? esc(fmtDay(c.expires_at)) : '<span class="op-muted">No end date</span>'}</span>
      <span role="cell" data-l="Discount · sales">${rr.length ? `${fmtAED(Math.round(given))} · ${fmtAED(Math.round(sales))}` : '<span class="op-muted">—</span>'}</span>
      <span role="cell" class="dc-c-act"><button type="button" class="op-btn sm2" data-copy="${esc(c.code)}" title="Copy code">Copy</button><button type="button" class="op-btn sm2" data-toggle>${isOpen ? 'Close' : 'More'}</button></span>
      ${isOpen ? detail(c, rr) : ''}
    </div>`;
  }

  function detail(c, rr) {
    const st = statusOf(c);
    return `<div class="dc-detail" role="cell">
      <dl class="op-kv">
        <dt>Created</dt><dd>${esc(fmtDay(c.created_at))}${c.template_name ? ' · from “' + esc(c.template_name) + '”' : ''}</dd>
        ${c.starts_at ? `<dt>Starts</dt><dd>${esc(fmtDay(c.starts_at))}</dd>` : ''}
        ${c.email ? `<dt>Only for</dt><dd>${esc(c.email)}</dd>` : ''}
        ${c.issued_for_order ? `<dt>Linked order</dt><dd><a href="#orders" data-order="${esc(c.issued_for_order)}">${esc(c.issued_for_order)}</a></dd>` : ''}
        ${c.note ? `<dt>Note</dt><dd>${esc(c.note)}</dd>` : ''}
        <dt>Orders</dt><dd>${rr.length ? rr.map(r => `<a href="#orders" data-order="${esc(r.order_number)}">${esc(r.order_number)}</a> <span class="op-muted">${esc(fmtDay(r.created_at))} · ${Number(r.order_total_aed) === 0 ? 'free order' : fmtAED(r.order_total_aed)} · ${fmtAED(r.discount_aed)} off</span>`).join('<br>') : '<span class="op-muted">Not used yet</span>'}</dd>
      </dl>
      <div class="dc-detail-actions">
        ${st === 'paused' ? '<button type="button" class="op-btn" data-act="resume">Resume</button>' : '<button type="button" class="op-btn" data-act="pause">Pause</button>'}
        <button type="button" class="op-btn" data-act="extend">+30 days</button>
        <button type="button" class="op-btn" data-act="enddate">Change end date</button>
        <button type="button" class="op-btn" data-act="email">Email to customer</button>
        <button type="button" class="op-btn" data-act="msg">Copy message</button>
        ${(c.uses_count || 0) === 0 && !reds.some(r => r.code === c.code) ? '<button type="button" class="op-btn danger" data-act="delete">Delete</button>' : ''}
        <span class="op-status" data-status></span>
      </div>
    </div>`;
  }

  function bindRow(c) {
    const el = document.getElementById('dc-' + c.code); if (!el) return;
    el.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => { open.has(c.code) ? open.delete(c.code) : open.add(c.code); renderList(); });
    el.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copy(c.code, 'Code copied'));
    el.querySelectorAll('[data-order]').forEach(a => a.onclick = e => { e.preventDefault(); if (window.hkOrders && window.hkOrders.focus) window.hkOrders.focus(a.dataset.order); });
    el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => act(c, b.dataset.act, el));
  }

  async function act(c, a, el) {
    const say = (m, bad) => { const s = el.querySelector('[data-status]'); if (s) { s.textContent = m; s.classList.toggle('bad', !!bad); } };
    try {
      if (a === 'msg') return copy(shareText(c), 'Message copied');
      if (a === 'delete') {
        if (!confirm(`Delete ${c.code}? It has never been used.`)) return;
        await post({ action: 'delete', code: c.code }); codes = codes.filter(x => x.code !== c.code); open.delete(c.code);
        renderKpis(); renderByTag(); renderList(); return toast('Code deleted');
      }
      if (a === 'email') {
        const to = c.email || prompt('Send this code to which email?', '');
        if (!to) return;
        say('Sending…'); await post({ action: 'send', code: c.code, email: to }); say('Emailed to ' + to); return;
      }
      let patch;
      if (a === 'pause') patch = { active: false };
      if (a === 'resume') patch = { active: true };
      if (a === 'extend') { const base = c.expires_at && new Date(c.expires_at) > new Date() ? new Date(c.expires_at) : new Date(); patch = { expiresAt: new Date(base.getTime() + 30 * 864e5).toISOString() }; }
      if (a === 'enddate') {
        const cur = c.expires_at ? c.expires_at.slice(0, 10) : '';
        const v = prompt('New end date (YYYY-MM-DD). Leave empty for no end date.', cur);
        if (v === null) return;
        if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return toast('Use the format YYYY-MM-DD', true);
        patch = { expiresAt: v ? new Date(v.trim() + 'T23:59:59+04:00').toISOString() : null };
      }
      say('Saving…');
      const r = await post(Object.assign({ action: 'update', code: c.code }, patch));
      Object.assign(c, r.code); renderKpis(); renderByTag(); renderList(); toast('Saved');
    } catch (e) { say(e.message, true); toast(e.message, true); }
  }

  /* ---------- Utils ---------- */
  function copy(text, msg) {
    const done = () => toast(msg || 'Copied');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallback());
    else fallback();
    function fallback() { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (_) { prompt('Copy this:', text); } ta.remove(); }
  }
  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; a.click();
  }
  function exportCsv() {
    const cell = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const head = ['code', 'offer', 'reason', 'status', 'uses', 'max_uses', 'valid_until', 'email', 'discount_given_aed', 'sales_aed', 'orders', 'created', 'note'];
    const lines = codes.filter(match).map(c => {
      const rr = redsFor(c.code);
      return [c.code, offer(c), TAGS[c.tag] || c.tag, STATUS[statusOf(c)][0], c.uses_count || 0, c.max_uses ?? '', c.expires_at ? c.expires_at.slice(0, 10) : '', c.email || '',
        rr.reduce((a, r) => a + Number(r.discount_aed || 0), 0).toFixed(2), rr.reduce((a, r) => a + Number(r.order_total_aed || 0), 0).toFixed(2), rr.map(r => r.order_number).join(' '), (c.created_at || '').slice(0, 10), c.note || ''].map(cell).join(',');
    });
    download(`hikaya-discount-codes-${new Date().toISOString().slice(0, 10)}.csv`, [head.join(','), ...lines].join('\n'));
  }
  let toastT;
  function toast(msg, bad) {
    let t = $('op-toast'); if (!t) { t = document.createElement('div'); t.id = 'op-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.className = 'show' + (bad ? ' bad' : ''); clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, 2600);
  }

  // Used by the Orders tab: "issue a code for this order" pre-fills the form.
  function prefill({ email, name, orderNumber, templateTag }) {
    const tab = document.querySelector('.op-tabs [data-tab="discounts"]'); if (tab) tab.click();
    const go = () => {
      const fm = $('dc-form'); if (!fm) return setTimeout(go, 150);
      const t = templates.find(x => x.tag === (templateTag || 'review')) || null;
      if (t) applyTemplate(t);
      fm.email.value = email || ''; fm.customerName.value = (name || '').split(' ')[0]; fm.issuedForOrder.value = orderNumber || '';
      fm.sendEmail.checked = !!email; syncForm();
      fm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    go();
  }

  window.hkDiscounts = { load, prefill };
})();
