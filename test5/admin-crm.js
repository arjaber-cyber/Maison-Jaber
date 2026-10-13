/* Hikaya dashboard — CRM (Oct 2026).
   Contacts: everyone we have an email for (orders, newsletter, accounts, unfinished
   books, contact form, added by hand), with consent, tags, notes and history.
   Campaigns: build branded emails (English + Arabic) from ready-made templates, preview
   them live, send a test, then send to a segment. Opens, clicks and orders are tracked.
   Messages: the contact-form inbox.

   Loaded by admin.html; started with window.hkCRM.load(password). */
(function () {
  'use strict';

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const fmtAED = n => 'AED ' + Number(n || 0).toLocaleString('en-AE', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const fmtDay = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' }) : '—';
  const fmtTime = d => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' }) : '—';
  const pct = (a, b) => b ? Math.round((a / b) * 100) + '%' : '—';
  const DAY = 864e5;
  function ago(d) {
    if (!d) return '—'; const ms = Date.now() - new Date(d).getTime();
    if (ms < 36e5) return Math.max(1, Math.round(ms / 6e4)) + ' min ago';
    if (ms < DAY) return Math.round(ms / 36e5) + ' h ago';
    if (ms < 30 * DAY) return Math.round(ms / DAY) + ' d ago';
    return fmtDay(d);
  }
  const svg = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const IC = {
    users: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3.5 5.5"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
    inbox: svg('<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    upload: svg('<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'),
    download: svg('<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>'),
    up: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'), down: svg('<path d="M12 5v14M6 13l6 6 6-6"/>'),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>'), back: svg('<path d="M15 6l-6 6 6 6"/>'),
    send: svg('<path d="M4 12l16-8-6 16-3-7z"/>'), eye: svg('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    phone: svg('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'), desk: svg('<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'),
  };

  const CONSENT = {
    subscribed: ['Subscribed', 'ok', 'Signed up for news (or you marked them). Receives campaigns.'],
    customer: ['Customer', 'info', 'Bought from you. Receives campaigns (soft opt-in) unless they unsubscribe.'],
    not_opted_in: ['Not opted in', 'warn', 'Never agreed to marketing (contact form, unfinished book, account only). Left out of campaigns by default.'],
    unsubscribed: ['Unsubscribed', 'bad', 'Asked not to receive marketing. Never emailed by campaigns.'],
  };
  const SOURCES = { order: 'Orders', newsletter: 'Newsletter', account: 'Account', cart: 'Started a book', contact: 'Contact form', manual: 'Added by you' };
  const BLOCKS = {
    eyebrow: 'Small label', heading: 'Heading', subheading: 'Subheading', text: 'Paragraph', small: 'Small print',
    hand: 'Handwritten line', button: 'Button', image: 'Photo', story: 'Story card', code: 'Discount code', divider: 'Divider', signoff: 'Sign-off',
  };
  const CSTATUS = { draft: ['Draft', ''], sending: ['Sending', 'warn'], sent: ['Sent', 'ok'] };

  let pw = null, contacts = [], messages = [], segments = {}, campaigns = [], codes = [], stories = [], configured = true, daily = { limit: 0, today: 0 };
  let view = 'contacts', loaded = false;
  const f = { q: '', seg: 'all', consent: 'any', lang: 'any', country: 'any', tag: '', sort: 'recent' };
  const sel = new Set(); const openRows = new Set(); let shown = 150;
  let mf = 'open';
  let ed = null;           // campaign being edited
  const listeners = [];

  /* ---------- API ---------- */
  async function call(fn, body) {
    const res = await fetch('/.netlify/functions/' + fn, body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': pw }, body: JSON.stringify(body) }
      : { headers: { 'x-admin-password': pw } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }
  const C = body => call('crm-contacts', body);
  const K = body => call('crm-campaigns', body);

  async function load(password) {
    if (password) pw = password;
    const box = $('crm-state');
    try {
      const [a, b] = await Promise.all([call('crm-contacts'), call('crm-campaigns')]);
      contacts = a.contacts || []; messages = a.messages || []; segments = a.segments || {};
      campaigns = b.campaigns || []; codes = b.codes || []; stories = b.stories || []; configured = b.configured !== false;
      daily = { limit: b.dailyLimit || 0, today: b.sentToday || 0 };
      loaded = true;
      if (box) box.remove();
      shell(); notify();
      if (campaigns.some(c => c.status === 'sending')) renderCampaigns();
    } catch (e) { if (box) box.textContent = e.message; }
  }
  async function reloadCampaigns() { const b = await call('crm-campaigns'); campaigns = b.campaigns || []; codes = b.codes || []; stories = b.stories || []; daily = { limit: b.dailyLimit || 0, today: b.sentToday || 0 }; }
  async function reloadContacts() { const a = await call('crm-contacts'); contacts = a.contacts || []; messages = a.messages || []; notify(); }
  function notify() { listeners.forEach(fn => { try { fn({ contacts, messages, campaigns }); } catch (_) {} }); badge(); }
  function badge() {
    const t = document.querySelector('.op-tabs [data-tab="crm"]'); if (!t) return;
    const n = messages.filter(m => !m.handled).length;
    let b = t.querySelector('.tab-badge'); if (!b) { b = document.createElement('span'); b.className = 'tab-badge'; t.appendChild(b); }
    b.textContent = n; b.hidden = !n; b.title = `${n} unanswered message${n === 1 ? '' : 's'}`;
  }

  /* ---------- Layout ---------- */
  function shell() {
    const root = $('crm-root'); if (!root) return;
    root.innerHTML = `
      <div class="crm-sub" role="tablist" aria-label="CRM sections">
        <button data-v="contacts" role="tab">${IC.users}Contacts <b id="crm-n-contacts"></b></button>
        <button data-v="campaigns" role="tab">${IC.mail}Email campaigns <b id="crm-n-campaigns"></b></button>
        <button data-v="messages" role="tab">${IC.inbox}Messages <b id="crm-n-messages"></b></button>
      </div>
      ${configured ? '' : `<div class="crm-note warn"><b>Email sending isn't switched on yet.</b> Add <code>RESEND_API_KEY</code> in Netlify (Site settings → Environment variables) and redeploy. You can still build campaigns and manage contacts.</div>`}
      <div id="crm-view"></div>`;
    root.querySelectorAll('.crm-sub [data-v]').forEach(b => b.onclick = () => { view = b.dataset.v; ed = null; render(); });
    render();
  }
  function counts() {
    const n = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    n('crm-n-contacts', contacts.length); n('crm-n-campaigns', campaigns.length || ''); n('crm-n-messages', messages.filter(m => !m.handled).length || '');
    document.querySelectorAll('.crm-sub [data-v]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === view)));
  }
  function render() {
    counts();
    if (view === 'contacts') renderContacts();
    else if (view === 'campaigns') ed ? renderEditor() : renderCampaigns();
    else renderMessages();
  }

  /* =================== CONTACTS =================== */
  const allTags = () => [...new Set(contacts.flatMap(c => c.tags || []))].sort();
  const allCountries = () => [...new Set(contacts.map(c => c.country).filter(Boolean))].sort();
  const SEG_TESTS = {
    all: () => true,
    customers: c => c.isCustomer,
    repeat: c => c.orders >= 2,
    subscribers: c => c.consent === 'subscribed',
    never_bought: c => !c.isCustomer,
    carts: c => !!c.cart,
    lapsed: c => c.isCustomer && Date.now() - new Date(c.lastOrderAt) > 90 * DAY,
    recent: c => c.isCustomer && Date.now() - new Date(c.lastOrderAt) <= 30 * DAY,
  };
  function matches(c) {
    if (!(SEG_TESTS[f.seg] || SEG_TESTS.all)(c)) return false;
    if (f.consent === 'can' && !c.canEmail) return false;
    if (f.consent !== 'any' && f.consent !== 'can' && c.consent !== f.consent) return false;
    if (f.lang !== 'any' && c.lang !== f.lang) return false;
    if (f.country !== 'any' && c.country !== f.country) return false;
    if (f.tag && !(c.tags || []).includes(f.tag)) return false;
    if (f.q) {
      const q = f.q.toLowerCase();
      if (![c.email, c.name, c.phone, c.country, c.city, c.lastOrderNo, ...(c.tags || []), c.notes].some(v => String(v || '').toLowerCase().includes(q))) return false;
    }
    return true;
  }
  const SORTS = {
    recent: (a, b) => String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || '')),
    spent: (a, b) => b.spent - a.spent || b.orders - a.orders,
    orders: (a, b) => b.orders - a.orders || b.spent - a.spent,
    name: (a, b) => (a.name || a.email).localeCompare(b.name || b.email),
    added: (a, b) => String(b.firstSeenAt || '').localeCompare(String(a.firstSeenAt || '')),
  };

  function renderContacts() {
    const v = $('crm-view'); if (!v) return;
    const can = contacts.filter(c => c.canEmail).length;
    const cust = contacts.filter(c => c.isCustomer).length;
    const subs = contacts.filter(c => c.consent === 'subscribed').length;
    const unsub = contacts.filter(c => c.consent === 'unsubscribed').length;
    const ltv = cust ? contacts.reduce((a, c) => a + c.spent, 0) / cust : 0;
    v.innerHTML = `
      <div class="op-kpis crm-kpis">
        <div class="op-kpi"><div class="l">Contacts</div><div class="n">${contacts.length}</div><div class="s">${contacts.filter(c => Date.now() - new Date(c.firstSeenAt) < 30 * DAY).length} new in 30 days</div></div>
        <div class="op-kpi ok"><div class="l">Can email</div><div class="n">${can}</div><div class="s">${pct(can, contacts.length)} of contacts</div></div>
        <div class="op-kpi"><div class="l">Customers</div><div class="n">${cust}</div><div class="s">${contacts.filter(c => c.orders >= 2).length} repeat · ${fmtAED(Math.round(ltv))} avg spend</div></div>
        <div class="op-kpi"><div class="l">Subscribers</div><div class="n">${subs}</div><div class="s">opted in to news</div></div>
        <div class="op-kpi ${unsub ? '' : 'ok'}"><div class="l">Unsubscribed</div><div class="n">${unsub}</div><div class="s">never emailed</div></div>
      </div>
      <div class="op-toolbar crm-toolbar">
        <label class="op-search">${IC.search}<input id="crm-q" type="search" placeholder="Search name, email, phone, order no., tag…" value="${esc(f.q)}" aria-label="Search contacts"></label>
        <select id="crm-seg" aria-label="Segment">${Object.entries(segments).map(([k, l]) => `<option value="${k}" ${f.seg === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
        <select id="crm-consent" aria-label="Email permission">
          ${[['any', 'Any permission'], ['can', 'Can email'], ['subscribed', 'Subscribed'], ['customer', 'Customer'], ['not_opted_in', 'Not opted in'], ['unsubscribed', 'Unsubscribed']].map(([k, l]) => `<option value="${k}" ${f.consent === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <select id="crm-lang" aria-label="Language"><option value="any">Any language</option><option value="en" ${f.lang === 'en' ? 'selected' : ''}>English</option><option value="ar" ${f.lang === 'ar' ? 'selected' : ''}>Arabic</option></select>
        <select id="crm-country" aria-label="Country"><option value="any">Any country</option>${allCountries().map(c => `<option ${f.country === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
        <select id="crm-tag" aria-label="Tag"><option value="">Any tag</option>${allTags().map(t => `<option ${f.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
        <select id="crm-sort" aria-label="Sort"><option value="recent">Recent activity</option><option value="spent" ${f.sort === 'spent' ? 'selected' : ''}>Top spenders</option><option value="orders" ${f.sort === 'orders' ? 'selected' : ''}>Most orders</option><option value="added" ${f.sort === 'added' ? 'selected' : ''}>Newest</option><option value="name" ${f.sort === 'name' ? 'selected' : ''}>Name A–Z</option></select>
      </div>
      <div class="crm-actions-row">
        <button class="op-btn" id="crm-add">${IC.plus}<span>Add contact</span></button>
        <button class="op-btn" id="crm-import">${IC.upload}<span>Import</span></button>
        <button class="op-btn" id="crm-export">${IC.download}<span>Export CSV</span></button>
        <span class="crm-spacer"></span>
        <button class="op-btn primary" id="crm-email-these">${IC.mail}<span>Email these contacts</span></button>
      </div>
      <div id="crm-form-slot"></div>
      <div id="crm-bulk"></div>
      <div id="crm-list"></div>`;
    const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };
    let t; on('crm-q', 'input', e => { clearTimeout(t); t = setTimeout(() => { f.q = e.target.value.trim(); shown = 150; renderList(); }, 180); });
    [['crm-seg', 'seg'], ['crm-consent', 'consent'], ['crm-lang', 'lang'], ['crm-country', 'country'], ['crm-tag', 'tag'], ['crm-sort', 'sort']]
      .forEach(([id, k]) => on(id, 'change', e => { f[k] = e.target.value; shown = 150; renderList(); }));
    on('crm-add', 'click', () => addForm());
    on('crm-import', 'click', () => importForm());
    on('crm-export', 'click', exportCsv);
    on('crm-email-these', 'click', () => {
      const list = contacts.filter(matches).filter(c => c.consent !== 'unsubscribed');
      if (!list.length) return toast('No contacts in this view', true);
      newCampaign(null, sel.size ? { emails: [...sel] } : audienceFromFilters());
    });
    renderList();
  }
  function audienceFromFilters() {
    return { segment: f.seg, lang: f.lang, country: f.country, tag: f.tag, includeUnconsented: f.consent === 'not_opted_in' };
  }

  function renderList() {
    const list = contacts.filter(matches).sort(SORTS[f.sort] || SORTS.recent);
    const box = $('crm-list'); if (!box) return;
    renderBulk(list);
    if (!contacts.length) {
      box.innerHTML = `<div class="op-empty">No contacts yet. They appear here automatically as people order, sign up for news, create an account or write to you. You can also add or import them.</div>`;
      return;
    }
    if (!list.length) { box.innerHTML = `<div class="op-empty">Nobody matches these filters.</div>`; return; }
    const allOn = list.every(c => sel.has(c.email));
    box.innerHTML = `
      <div class="op-listhead"><h2>${list.length === contacts.length ? 'All contacts' : 'Matching contacts'}</h2><span>${list.length} of ${contacts.length} · ${list.filter(c => c.canEmail).length} can be emailed</span></div>
      <div class="crm-table" role="table" aria-label="Contacts">
        <div class="crm-tr crm-th" role="row">
          <span><input type="checkbox" id="crm-all" ${allOn ? 'checked' : ''} aria-label="Select all shown"></span>
          <span>Contact</span><span>Permission</span><span>Lang</span><span>Orders</span><span>Spent</span><span>Last active</span>
        </div>
        ${list.slice(0, shown).map(row).join('')}
      </div>
      ${list.length > shown ? `<div style="text-align:center; margin-top:12px;"><button class="op-btn" id="crm-more">Show ${Math.min(150, list.length - shown)} more</button></div>` : ''}`;
    $('crm-all').onchange = e => { list.forEach(c => e.target.checked ? sel.add(c.email) : sel.delete(c.email)); renderList(); };
    const more = $('crm-more'); if (more) more.onclick = () => { shown += 150; renderList(); };
    box.querySelectorAll('[data-sel]').forEach(cb => cb.onchange = () => { cb.checked ? sel.add(cb.dataset.sel) : sel.delete(cb.dataset.sel); renderBulk(list); });
    box.querySelectorAll('[data-open]').forEach(r => r.onclick = e => {
      if (e.target.closest('input,button,a,select,textarea,label,.crm-detail')) return;
      const em = r.dataset.open; openRows.has(em) ? openRows.delete(em) : openRows.add(em); renderList();
    });
    box.querySelectorAll('[data-open]').forEach(r => r.onkeydown = e => { if (e.key === 'Enter' && e.target === r) r.click(); });
    list.slice(0, shown).filter(c => openRows.has(c.email)).forEach(bindDetail);
  }

  function row(c) {
    const [cl, cc] = CONSENT[c.consent] || ['', ''];
    const isOpen = openRows.has(c.email);
    return `
      <div class="crm-tr ${isOpen ? 'open' : ''}" role="row" data-open="${esc(c.email)}" tabindex="0" aria-expanded="${isOpen}">
        <span><input type="checkbox" data-sel="${esc(c.email)}" ${sel.has(c.email) ? 'checked' : ''} aria-label="Select ${esc(c.email)}"></span>
        <span class="crm-who"><b>${esc(c.name || c.email.split('@')[0])}</b><small dir="ltr">${esc(c.email)}</small>
          <span class="crm-chips">${c.sources.map(s => `<i>${esc(SOURCES[s] || s)}</i>`).join('')}${(c.tags || []).map(t => `<i class="tag">#${esc(t)}</i>`).join('')}${c.cart ? '<i class="warn">Unfinished book</i>' : ''}${c.openMessages ? `<i class="warn">${c.openMessages} message${c.openMessages > 1 ? 's' : ''}</i>` : ''}</span></span>
        <span data-l="Permission"><span class="op-badge ${cc}">${cl}</span></span>
        <span data-l="Language">${c.lang === 'ar' ? 'Arabic' : 'English'}${c.country ? `<small>${esc(c.country)}</small>` : ''}</span>
        <span data-l="Orders">${c.orders || '—'}${c.lastOrderAt ? `<small>last ${esc(fmtDay(c.lastOrderAt))}</small>` : ''}</span>
        <span data-l="Spent"><b>${c.spent ? fmtAED(c.spent) : '—'}</b></span>
        <span data-l="Last active">${esc(ago(c.lastSeenAt))}${c.emailsSent ? `<small>${c.opened}/${c.emailsSent} emails opened</small>` : ''}</span>
        ${isOpen ? `<div class="crm-detail" data-detail="${esc(c.email)}">${detailHtml(c)}</div>` : ''}
      </div>`;
  }

  function detailHtml(c) {
    const [cl, , hint] = CONSENT[c.consent];
    const wa = c.phone ? String(c.phone).replace(/[^\d]/g, '') : '';
    return `
      <div class="crm-detail-grid">
        <form class="crm-edit" data-edit autocomplete="off">
          <h4>Details</h4>
          <label>Name<input name="name" value="${esc(c.name)}" dir="auto"></label>
          <div class="crm-2">
            <label>Language<select name="lang"><option value="en" ${c.lang !== 'ar' ? 'selected' : ''}>English</option><option value="ar" ${c.lang === 'ar' ? 'selected' : ''}>Arabic</option></select></label>
            <label>Phone<input name="phone" value="${esc(c.phone)}" dir="ltr"></label>
          </div>
          <label>Tags <small>comma-separated, e.g. vip, eid-2026, influencer</small><input name="tags" value="${esc((c.tags || []).join(', '))}"></label>
          <label>Notes <small>private, only you see these</small><textarea name="notes" rows="3" dir="auto">${esc(c.notes)}</textarea></label>
          <label>Email permission
            <select name="marketing_status">
              <option value="unknown" ${c.marketing_status === 'unknown' ? 'selected' : ''}>Automatic (${c.isCustomer ? 'customer, can email' : c.newsletter ? 'subscriber' : 'not opted in'})</option>
              <option value="subscribed" ${c.marketing_status === 'subscribed' ? 'selected' : ''}>Opted in: agreed to emails</option>
              <option value="unsubscribed" ${c.marketing_status === 'unsubscribed' ? 'selected' : ''}>Unsubscribed: never email</option>
            </select>
            <small>Now: <b>${esc(cl)}</b>. ${esc(hint)}${c.status_changed_at ? ` Changed ${esc(fmtDay(c.status_changed_at))}${c.status_source ? ' via ' + esc(c.status_source) : ''}.` : ''}</small>
          </label>
          <div class="crm-row-actions">
            <button class="op-btn primary" type="submit">Save</button>
            ${c.added_manually && c.consent !== 'unsubscribed' && c.sources.length === 1 ? '<button class="op-btn link danger" type="button" data-remove>Remove from list</button>' : ''}
            <span class="op-status" data-say></span>
          </div>
        </form>
        <div class="crm-side">
          <h4>Quick actions</h4>
          <div class="crm-quick">
            ${c.consent !== 'unsubscribed' ? `<button class="op-btn sm2" type="button" data-email>${IC.mail}Email campaign</button>` : ''}
            <button class="op-btn sm2" type="button" data-code>Send a discount code</button>
            <a class="op-btn sm2" href="mailto:${esc(c.email)}">Write in Zoho</a>
            ${wa ? `<a class="op-btn sm2" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
            ${c.lastOrderNo ? `<button class="op-btn sm2" type="button" data-order="${esc(c.lastOrderNo)}">Open last order</button>` : ''}
          </div>
          <h4>Summary</h4>
          <dl class="op-kv crm-kv">
            <dt>First seen</dt><dd>${esc(fmtDay(c.firstSeenAt))}</dd>
            <dt>Orders</dt><dd>${c.orders} · ${c.books} book${c.books === 1 ? '' : 's'}</dd>
            <dt>Spent</dt><dd>${fmtAED(c.spent)}${c.paidOrders ? ` · avg ${fmtAED(Math.round(c.spent / c.paidOrders))}` : ''}</dd>
            ${c.country ? `<dt>Location</dt><dd>${esc([c.city, c.country].filter(Boolean).join(', '))}</dd>` : ''}
            ${c.cart ? `<dt>Unfinished</dt><dd>${esc(c.cart.story || 'A book')}${c.cart.child ? ' for ' + esc(c.cart.child) : ''} · ${esc(ago(c.cart.at))}</dd>` : ''}
            ${c.codesUsed && c.codesUsed.length ? `<dt>Codes used</dt><dd>${c.codesUsed.map(esc).join(', ')}</dd>` : ''}
            <dt>Emails</dt><dd>${c.emailsSent ? `${c.emailsSent} sent · ${c.opened} opened · ${c.clicked} clicked` : 'No campaigns yet'}</dd>
          </dl>
          <h4>History</h4>
          <div class="crm-timeline" data-timeline><span class="op-muted">Loading…</span></div>
        </div>
      </div>`;
  }

  const timelineCache = new Map();
  async function bindDetail(c) {
    const el = document.querySelector(`[data-detail="${CSS.escape(c.email)}"]`); if (!el) return;
    const fm = el.querySelector('[data-edit]'), say = el.querySelector('[data-say]');
    fm.onsubmit = async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(fm));
      if (d.marketing_status === 'subscribed' && c.consent !== 'subscribed' && !confirm(`Only mark ${c.email} as opted in if they agreed to receive emails from Hikaya. Continue?`)) return;
      say.textContent = 'Saving…'; say.className = 'op-status';
      try {
        await C({ action: 'save', email: c.email, ...d });
        await reloadContacts(); toast('Contact saved'); renderList();
      } catch (err) { say.textContent = err.message; say.className = 'op-status bad'; }
    };
    const rm = el.querySelector('[data-remove]');
    if (rm) rm.onclick = async () => {
      if (!confirm(`Remove ${c.email} from your contact list?`)) return;
      try { await C({ action: 'remove', email: c.email }); openRows.delete(c.email); sel.delete(c.email); await reloadContacts(); renderList(); toast('Removed'); }
      catch (err) { toast(err.message, true); }
    };
    const em = el.querySelector('[data-email]'); if (em) em.onclick = () => newCampaign(null, { emails: [c.email], includeUnconsented: c.consent === 'not_opted_in' });
    el.querySelector('[data-code]').onclick = () => { if (window.hkDiscounts) window.hkDiscounts.prefill({ email: c.email, name: c.name, templateTag: c.isCustomer ? 'review' : 'campaign' }); };
    const ord = el.querySelector('[data-order]'); if (ord) ord.onclick = () => window.hkOrders && window.hkOrders.focus(ord.dataset.order);

    const tl = el.querySelector('[data-timeline]');
    try {
      const d = timelineCache.get(c.email) || await C({ action: 'detail', email: c.email });
      timelineCache.set(c.email, d);
      const items = [
        ...d.orders.map(o => ({ at: o.created_at, html: `<b>Order <a href="#" data-o="${esc(o.order_number)}">${esc(o.order_number || '')}</a></b> · ${o.order_type !== 'sale' ? esc(o.order_type) : (o.earned ? fmtAED(o.aed) : esc(o.payment_status))}${o.promo_code ? ' · code ' + esc(o.promo_code) : ''}<br><span>${o.books.map(bk => esc([bk.story, bk.child && 'for ' + bk.child].filter(Boolean).join(' '))).join(' · ') || ''}</span>` })),
        ...d.messages.map(m => ({ at: m.created_at, html: `<b>Message${m.handled ? '' : ' <em class="op-warn">open</em>'}</b>${m.order_number ? ' · ' + esc(m.order_number) : ''}<br><span>${esc(String(m.message || '').slice(0, 220))}</span>` })),
        ...d.emails.map(s => ({ at: s.sent_at, html: `<b>Email: ${esc(s.campaign)}</b> · ${s.status === 'sent' ? (s.clicked_at ? 'clicked' : s.opened_at ? 'opened' : 'delivered') : esc(s.status)}` })),
        ...(c.subscribedAt ? [{ at: c.subscribedAt, html: '<b>Joined the newsletter</b>' }] : []),
        ...(c.cart ? [{ at: c.cart.at, html: `<b>Started a book</b> · ${esc(c.cart.story || '')} ${c.cart.child ? 'for ' + esc(c.cart.child) : ''}` }] : []),
      ].filter(x => x.at).sort((a, b) => String(b.at).localeCompare(String(a.at)));
      tl.innerHTML = items.length ? items.slice(0, 30).map(x => `<div class="crm-ev"><time>${esc(fmtTime(x.at))}</time><div>${x.html}</div></div>`).join('') : '<span class="op-muted">Nothing yet.</span>';
      tl.querySelectorAll('[data-o]').forEach(a => a.onclick = e => { e.preventDefault(); window.hkOrders && window.hkOrders.focus(a.dataset.o); });
    } catch (err) { tl.innerHTML = `<span class="op-muted">${esc(err.message)}</span>`; }
  }

  function renderBulk(list) {
    const box = $('crm-bulk'); if (!box) return;
    const btn = $('crm-email-these');
    if (btn) btn.querySelector('span').textContent = sel.size ? `Email ${sel.size} selected` : `Email these ${list.filter(c => c.consent !== 'unsubscribed' && (c.canEmail || f.consent === 'not_opted_in')).length} contacts`;
    if (!sel.size) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="crm-bulkbar" role="region" aria-label="Bulk actions">
      <b>${sel.size} selected</b>
      <input id="crm-bulk-tag" placeholder="tag name" list="crm-taglist" aria-label="Tag"><datalist id="crm-taglist">${allTags().map(t => `<option value="${esc(t)}">`).join('')}</datalist>
      <button class="op-btn sm2" data-b="tag">Add tag</button><button class="op-btn sm2" data-b="untag">Remove tag</button>
      <button class="op-btn sm2" data-b="subscribed">Mark opted in</button><button class="op-btn sm2 danger" data-b="unsubscribed">Unsubscribe</button>
      <button class="op-btn link" data-b="clear">Clear</button></div>`;
    box.querySelectorAll('[data-b]').forEach(b => b.onclick = async () => {
      const k = b.dataset.b, emails = [...sel];
      try {
        if (k === 'clear') { sel.clear(); return renderList(); }
        if (k === 'tag' || k === 'untag') {
          const tag = $('crm-bulk-tag').value.trim(); if (!tag) return toast('Type a tag name first', true);
          await C({ action: 'bulk_tag', emails, tag, remove: k === 'untag' });
        } else {
          if (k === 'subscribed' && !confirm(`Mark ${emails.length} contact${emails.length > 1 ? 's' : ''} as opted in? Only do this if they agreed to receive emails from Hikaya.`)) return;
          if (k === 'unsubscribed' && !confirm(`Unsubscribe ${emails.length} contact${emails.length > 1 ? 's' : ''}? They will never receive campaigns.`)) return;
          await C({ action: 'bulk_status', emails, marketing_status: k });
        }
        timelineCache.clear(); await reloadContacts(); renderContacts(); toast('Done');
      } catch (err) { toast(err.message, true); }
    });
  }

  function addForm() {
    const slot = $('crm-form-slot');
    slot.innerHTML = `<form class="dc-panel crm-inline-form" id="crm-add-form" autocomplete="off">
      <div class="dc-panel-head"><h2>Add a contact</h2></div>
      <div class="dc-form">
        <label class="wide">Email<input name="email" type="email" required dir="ltr" placeholder="name@email.com"></label>
        <label>Name<input name="name" dir="auto"></label>
        <label>Language<select name="lang"><option value="en">English</option><option value="ar">Arabic</option></select></label>
        <label class="wide">Tags <small>optional, comma-separated</small><input name="tags" placeholder="e.g. school-fair, vip"></label>
        <label class="op-check wide"><input type="checkbox" name="consent">They agreed to receive news and offers from Hikaya</label>
        <div class="dc-actions"><button class="op-btn ghost" type="button" data-cancel>Cancel</button><button class="op-btn primary" type="submit">Add contact</button></div>
      </div></form>`;
    const fm = $('crm-add-form'); fm.email.focus();
    fm.querySelector('[data-cancel]').onclick = () => { slot.innerHTML = ''; };
    fm.onsubmit = async e => {
      e.preventDefault();
      try {
        const r = await C({ action: 'add', email: fm.email.value, name: fm.name.value, lang: fm.lang.value, tags: fm.tags.value, consent: fm.consent.checked });
        slot.innerHTML = ''; await reloadContacts(); renderContacts();
        toast(r.keptUnsubscribed ? 'Added, but they unsubscribed before so they stay unsubscribed' : 'Contact added', !!r.keptUnsubscribed);
      } catch (err) { toast(err.message, true); }
    };
  }

  /* CSV: header row with email (required), name, lang/language, tags. Also accepts a plain list of emails. */
  function parseCsv(text) {
    const rows = []; let cur = [''], q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur[cur.length - 1] += '"'; i++; } else q = false; } else cur[cur.length - 1] += ch; continue; }
      if (ch === '"') q = true; else if (ch === ',' || ch === ';' || ch === '\t') cur.push(''); else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; rows.push(cur); cur = ['']; } else cur[cur.length - 1] += ch;
    }
    rows.push(cur);
    const clean = rows.map(r => r.map(x => x.trim())).filter(r => r.some(Boolean));
    if (!clean.length) return [];
    const head = clean[0].map(h => h.toLowerCase());
    const ei = head.findIndex(h => /e-?mail/.test(h));
    if (ei < 0) return clean.flat().filter(x => /@/.test(x)).map(email => ({ email }));
    const col = re => head.findIndex(h => re.test(h));
    const ni = col(/^(full )?name|first/), li = col(/^lang/), ti = col(/^tags?$/);
    return clean.slice(1).map(r => ({ email: r[ei], name: ni >= 0 ? r[ni] : '', lang: li >= 0 ? r[li] : '', tags: ti >= 0 ? r[ti] : '' })).filter(r => r.email);
  }
  function importForm() {
    const slot = $('crm-form-slot');
    slot.innerHTML = `<form class="dc-panel crm-inline-form" id="crm-imp-form">
      <div class="dc-panel-head"><h2>Import contacts</h2><p>Upload a CSV (columns: <code>email</code>, and optionally <code>name</code>, <code>language</code>, <code>tags</code>) or paste a list of emails. Anyone who unsubscribed before stays unsubscribed.</p></div>
      <div class="dc-form">
        <label class="wide">CSV file<input type="file" name="file" accept=".csv,text/csv,.txt"></label>
        <label class="wide">Tag everyone in this import <small>optional</small><input name="tags" placeholder="e.g. school-fair-oct26"></label>
        <label class="wide" style="grid-column:1/-1;">…or paste<textarea name="paste" rows="4" placeholder="email,name,language&#10;sara@email.com,Sara,ar&#10;mark@email.com,Mark,en"></textarea></label>
        <label class="op-check" style="grid-column:1/-1;"><input type="checkbox" name="consent">These people agreed to receive news and offers from Hikaya (for example, they signed up on a form)</label>
        <div class="crm-imp-preview" id="crm-imp-preview" style="grid-column:1/-1;"></div>
        <div class="dc-actions"><button class="op-btn ghost" type="button" data-cancel>Cancel</button><button class="op-btn primary" type="submit" disabled>Import</button></div>
      </div></form>`;
    const fm = $('crm-imp-form'); let rows = [];
    const show = () => {
      const valid = rows.filter(r => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(r.email).trim()));
      $('crm-imp-preview').innerHTML = rows.length ? `<b>${valid.length}</b> valid email${valid.length === 1 ? '' : 's'}${rows.length - valid.length ? `, ${rows.length - valid.length} skipped` : ''}. ${valid.slice(0, 4).map(r => esc(r.email)).join(', ')}${valid.length > 4 ? '…' : ''}` : '';
      fm.querySelector('[type=submit]').disabled = !valid.length;
    };
    fm.file.onchange = async () => { const file = fm.file.files[0]; if (!file) return; rows = parseCsv(await file.text()); show(); };
    fm.paste.oninput = () => { rows = parseCsv(fm.paste.value); show(); };
    fm.querySelector('[data-cancel]').onclick = () => { slot.innerHTML = ''; };
    fm.onsubmit = async e => {
      e.preventDefault();
      try {
        const r = await C({ action: 'import', rows, tags: fm.tags.value, consent: fm.consent.checked });
        slot.innerHTML = ''; await reloadContacts(); renderContacts();
        toast(`Imported ${r.imported}${r.invalid ? ` · ${r.invalid} invalid skipped` : ''}${r.keptUnsubscribed ? ` · ${r.keptUnsubscribed} kept unsubscribed` : ''}`);
      } catch (err) { toast(err.message, true); }
    };
  }

  function exportCsv() {
    const list = contacts.filter(matches);
    const head = ['email', 'name', 'language', 'country', 'phone', 'permission', 'can_email', 'orders', 'books', 'spent_aed', 'first_order', 'last_order', 'sources', 'tags', 'emails_sent', 'emails_opened', 'first_seen', 'last_active', 'notes'];
    const cell = v => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [head.join(',')].concat(list.map(c => [c.email, c.name, c.lang, c.country, c.phone, (CONSENT[c.consent] || [''])[0], c.canEmail ? 'yes' : 'no', c.orders, c.books, c.spent, c.firstOrderAt ? c.firstOrderAt.slice(0, 10) : '', c.lastOrderAt ? c.lastOrderAt.slice(0, 10) : '', c.sources.join(' '), (c.tags || []).join(' '), c.emailsSent, c.opened, (c.firstSeenAt || '').slice(0, 10), (c.lastSeenAt || '').slice(0, 10), c.notes].map(cell).join(',')));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = `hikaya-contacts-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`Exported ${list.length} contacts`);
  }

  /* =================== CAMPAIGNS =================== */
  let poller = null;
  function renderCampaigns() {
    const v = $('crm-view'); if (!v) return;
    const sent = campaigns.filter(c => c.status === 'sent' && c.stats);
    const tot = k => sent.reduce((a, c) => a + (c.stats[k] || 0), 0);
    const deliv = tot('sent');
    v.innerHTML = `
      <div class="op-kpis crm-kpis">
        <div class="op-kpi"><div class="l">Campaigns sent</div><div class="n">${sent.length}</div><div class="s">${campaigns.filter(c => c.status === 'draft').length} draft${campaigns.filter(c => c.status === 'draft').length === 1 ? '' : 's'}</div></div>
        <div class="op-kpi"><div class="l">Emails delivered</div><div class="n">${deliv}</div><div class="s">${tot('failed')} failed</div></div>
        <div class="op-kpi"><div class="l">Open rate</div><div class="n">${pct(tot('opened'), deliv)}</div><div class="s">Apple Mail can inflate opens</div></div>
        <div class="op-kpi"><div class="l">Click rate</div><div class="n">${pct(tot('clicked'), deliv)}</div><div class="s">${tot('clicked')} people clicked</div></div>
        <div class="op-kpi ok"><div class="l">Orders after emails</div><div class="n">${tot('orders')}</div><div class="s">${fmtAED(Math.round(tot('revenue_aed')))} within 7 days</div></div>
      </div>
      <section class="dc-panel">
        <div class="dc-panel-head"><h2>Start a new email</h2><p>Pick a ready-made email (English and Arabic are both written for you), then change anything you like.</p></div>
        <div class="crm-tpls">${(window.HK_CRM_TEMPLATES || []).map(t => `
          <button class="crm-tpl" type="button" data-tpl="${esc(t.key)}">
            ${(im => im ? `<span class="crm-tpl-img" style="background-image:url('${esc(im.url)}')"></span>` : `<span class="crm-tpl-img blank">${IC.mail}</span>`)(t.content.en.blocks.find(b => b.t === 'image' && b.url))}
            <b>${esc(t.name)}</b><small>${esc(t.desc)}</small></button>`).join('')}
        </div>
      </section>
      <div class="op-listhead"><h2>Your campaigns</h2><span>${campaigns.length ? 'Newest first' : ''}</span></div>
      <div id="crm-camps">${campaigns.length ? campaigns.map(campCard).join('') : '<div class="op-empty">No campaigns yet. Start with one of the emails above.</div>'}</div>`;
    v.querySelectorAll('[data-tpl]').forEach(b => b.onclick = () => newCampaign(b.dataset.tpl));
    v.querySelectorAll('[data-camp]').forEach(card => {
      const c = campaigns.find(x => x.id === card.dataset.camp);
      card.querySelectorAll('[data-act]').forEach(b => b.onclick = () => campAct(c, b.dataset.act));
    });
    clearTimeout(poller);
    if (campaigns.some(c => c.status === 'sending') && !sendingNow) poller = setTimeout(async () => { if (view === 'campaigns' && !ed) { await reloadCampaigns(); renderCampaigns(); } }, 8000);
  }
  function campCard(c) {
    const s = c.stats || {}, [sl, sc] = CSTATUS[c.status] || ['', ''];
    const en = (c.content || {}).en || {}, ar = (c.content || {}).ar || {};
    const langs = [en.subject && 'English', ar.subject && 'Arabic'].filter(Boolean).join(' + ') || 'Not written yet';
    const delivered = s.sent || 0, total = c.recipients || (s.queued + s.sending + s.sent + s.failed) || 0;
    const prog = c.status === 'sending' && total ? Math.round(((s.sent + s.failed) / total) * 100) : 0;
    return `<article class="crm-camp" data-camp="${esc(c.id)}">
      <div class="crm-camp-main">
        <div class="crm-camp-title"><b>${esc(c.name)}</b><span class="op-badge ${sc}">${sl}</span>${c.discount_code ? `<span class="op-badge">Code ${esc(c.discount_code)}</span>` : ''}</div>
        <div class="op-sub">${esc(en.subject || ar.subject || 'No subject yet')}</div>
        <div class="op-muted">${esc(langs)} · ${c.status === 'sent' ? `sent ${esc(fmtTime(c.sent_at))} to ${total}` : c.status === 'sending' ? `sending: ${s.sent || 0} of ${total}` : `edited ${esc(ago(c.updated_at))}`}</div>
        ${c.status === 'sending' ? `<div class="crm-prog"><i style="width:${prog}%"></i></div>` : ''}
      </div>
      ${c.status !== 'draft' ? `<dl class="crm-camp-stats">
        <div><dt>Delivered</dt><dd>${delivered}</dd></div>
        <div><dt>Opened</dt><dd>${pct(s.opened, delivered)}</dd></div>
        <div><dt>Clicked</dt><dd>${pct(s.clicked, delivered)}</dd></div>
        <div><dt>Orders · 7d</dt><dd>${s.orders || 0}<small>${s.revenue_aed ? fmtAED(Math.round(s.revenue_aed)) : ''}</small></dd></div>
      </dl>` : ''}
      <div class="crm-camp-act">
        ${c.status === 'draft' ? '<button class="op-btn primary sm2" data-act="edit">Edit</button>' : '<button class="op-btn sm2" data-act="view">View email</button>'}
        ${c.status === 'sending' ? '<button class="op-btn primary sm2" data-act="resume">Resume sending</button>' : ''}
        ${c.status === 'sent' && s.failed ? `<button class="op-btn sm2" data-act="retry">Retry ${s.failed} failed</button>` : ''}
        <button class="op-btn sm2" data-act="dup">Duplicate</button>
        ${c.status !== 'sending' ? '<button class="op-btn link danger" data-act="del">Delete</button>' : ''}
      </div></article>`;
  }
  async function campAct(c, a) {
    try {
      if (a === 'edit' || a === 'view') { ed = clone(c); ed.readonly = c.status !== 'draft'; return renderEditor(); }
      if (a === 'dup') { const r = await K({ action: 'duplicate', id: c.id }); await reloadCampaigns(); ed = clone(r.campaign); toast('Copy created'); return renderEditor(); }
      if (a === 'del') {
        if (!confirm(c.status === 'sent' ? `Delete "${c.name}" and its report? This can't be undone.` : `Delete the draft "${c.name}"?`)) return;
        await K({ action: 'delete', id: c.id }); await reloadCampaigns(); renderCampaigns(); return toast('Deleted');
      }
      if (a === 'resume') return runSend(c.id, c.name);
      if (a === 'retry') { const r = await K({ action: 'retry_failed', id: c.id }); if (!r.requeued) return toast('Nothing to retry'); return runSend(c.id, c.name); }
    } catch (e) { toast(e.message, true); }
  }
  const clone = o => JSON.parse(JSON.stringify(o));

  function newCampaign(key, audience) {
    const tpls = window.HK_CRM_TEMPLATES || [];
    const t = tpls.find(x => x.key === key) || tpls.find(x => x.key === 'blank') || { content: { en: { subject: '', blocks: [] }, ar: { subject: '', blocks: [] } }, audience: {} };
    const content = clone(t.content);
    // Pre-fill story cards with the first story in the catalogue so the preview isn't empty.
    if (stories[0]) for (const l of ['en', 'ar']) (content[l].blocks || []).forEach(b => { if (b.t === 'story' && !b.slug) b.slug = stories[0].slug; });
    ed = {
      id: null, name: key ? t.name : 'New email', status: 'draft', lang_mode: 'auto', content,
      audience: Object.assign({ segment: 'all', lang: 'any', country: 'any', tag: '', emails: [], includeUnconsented: false }, t.audience || {}, audience || {}),
      discount_code: '', template_key: t.key || null,
    };
    view = 'campaigns'; counts();
    renderEditor();
    document.querySelector('[data-panel="crm"]').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Editor ---------- */
  let edLang = 'en', pvLang = 'en', pvWidth = 'desk', dirty = false, pvTimer = null, audTimer = null;
  function renderEditor() {
    const v = $('crm-view'); if (!v || !ed) return;
    const ro = !!ed.readonly;
    const a = ed.audience || {};
    v.innerHTML = `
      <div class="crm-ed-top">
        <button class="op-btn ghost" id="ed-back">${IC.back}<span>All campaigns</span></button>
        <input id="ed-name" class="crm-ed-name" value="${esc(ed.name)}" aria-label="Campaign name (only you see this)" ${ro ? 'disabled' : ''}>
        <span class="crm-spacer"></span>
        ${ro ? `<span class="op-badge ${(CSTATUS[ed.status] || [])[1]}">${(CSTATUS[ed.status] || [''])[0]}</span>` : `
        <span class="op-status" id="ed-saved"></span>
        <button class="op-btn" id="ed-save">Save draft</button>
        <button class="op-btn primary" id="ed-review">${IC.send}<span>Review &amp; send</span></button>`}
      </div>
      <div class="crm-ed">
        <div class="crm-ed-left">
          ${ro ? `<div class="crm-note">This campaign was ${ed.status === 'sent' ? 'sent' : 'started'}, so it can't be changed. Use <b>Duplicate</b> to send a new version.</div>` : ''}
          <fieldset class="crm-card" ${ro ? 'disabled' : ''}>
            <legend>1 · Who gets it</legend>
            ${a.emails && a.emails.length ? `
              <div class="crm-picked"><b>${a.emails.length} hand-picked contact${a.emails.length > 1 ? 's' : ''}</b><small>${esc(a.emails.slice(0, 3).join(', '))}${a.emails.length > 3 ? '…' : ''}</small>
              <button class="op-btn link" type="button" id="ed-unpick">Use a segment instead</button></div>` : `
              <div class="dc-form crm-aud">
                <label class="wide">Segment<select id="ed-seg">${Object.entries(segments).map(([k, l]) => `<option value="${k}" ${a.segment === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
                <label>Language<select id="ed-alang"><option value="any">Any</option><option value="en" ${a.lang === 'en' ? 'selected' : ''}>English speakers</option><option value="ar" ${a.lang === 'ar' ? 'selected' : ''}>Arabic speakers</option></select></label>
                <label>Country<select id="ed-country"><option value="any">Any</option>${allCountries().map(c => `<option ${a.country === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
                <label class="wide">Tag<select id="ed-tag"><option value="">Any</option>${allTags().map(t => `<option ${a.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
              </div>`}
            <label class="op-check crm-unc"><input type="checkbox" id="ed-unc" ${a.includeUnconsented ? 'checked' : ''}>Also include people who haven't opted in <small>(contact form, unfinished books). Use sparingly.</small></label>
            <div class="crm-aud-count" id="ed-count" aria-live="polite">Counting…</div>
          </fieldset>
          <fieldset class="crm-card" ${ro ? 'disabled' : ''}>
            <legend>2 · Language &amp; offer</legend>
            <div class="dc-form crm-aud">
              <label class="wide">Language sent<select id="ed-lmode">
                <option value="auto" ${ed.lang_mode === 'auto' ? 'selected' : ''}>Each person's language (Arabic or English)</option>
                <option value="en" ${ed.lang_mode === 'en' ? 'selected' : ''}>English to everyone</option>
                <option value="ar" ${ed.lang_mode === 'ar' ? 'selected' : ''}>Arabic to everyone</option></select></label>
              <label class="wide">Discount code<select id="ed-code"><option value="">No code</option>${codes.map(c => `<option value="${esc(c.code)}" ${ed.discount_code === c.code ? 'selected' : ''}>${esc(c.code)} · ${esc(offer(c))}${c.max_uses != null ? ` · ${Math.max(0, c.max_uses - (c.uses_count || 0))} uses left` : ''}</option>`).join('')}
                ${ed.discount_code && !codes.some(c => c.code === ed.discount_code) ? `<option value="${esc(ed.discount_code)}" selected>${esc(ed.discount_code)}</option>` : ''}</select>
                <small>Shows in the "Discount code" box. Use a shared code (not locked to one email) with enough uses. <a href="#" id="ed-newcode">Create one</a></small></label>
            </div>
          </fieldset>
          <fieldset class="crm-card" ${ro ? 'disabled' : ''}>
            <legend>3 · The email</legend>
            <div class="crm-langtabs" role="tablist">
              <button type="button" data-el="en" aria-selected="${edLang === 'en'}">English ${okMark('en')}</button>
              <button type="button" data-el="ar" aria-selected="${edLang === 'ar'}">العربية ${okMark('ar')}</button>
            </div>
            <div id="ed-content"></div>
          </fieldset>
        </div>
        <div class="crm-ed-right">
          <div class="crm-pv-bar">
            <div class="op-seg"><button type="button" data-pl="en" aria-pressed="${pvLang === 'en'}">English</button><button type="button" data-pl="ar" aria-pressed="${pvLang === 'ar'}">Arabic</button></div>
            <div class="op-seg"><button type="button" data-pw="desk" aria-pressed="${pvWidth === 'desk'}" title="Desktop">${IC.desk}</button><button type="button" data-pw="phone" aria-pressed="${pvWidth === 'phone'}" title="Phone">${IC.phone}</button></div>
            ${ro ? '' : '<button class="op-btn sm2" id="ed-test">Send me a test</button>'}
          </div>
          <div class="crm-inbox"><b id="pv-from">Hikaya by Maison Jaber</b><span id="pv-subj"></span><small id="pv-pre"></small></div>
          <div class="crm-pv-frame ${pvWidth}"><iframe id="ed-pv" title="Email preview" sandbox="allow-same-origin allow-popups"></iframe></div>
          <p class="op-muted" style="margin-top:8px;">Preview uses a sample name. Links, the open tracker and the unsubscribe link are added when it's sent.</p>
        </div>
      </div>`;

    $('ed-back').onclick = () => { if (dirty && !ro && !confirm('Leave without saving your changes?')) return; ed = null; dirty = false; renderCampaigns(); };
    if (!ro) {
      $('ed-name').oninput = e => { ed.name = e.target.value; touch(false); };
      $('ed-save').onclick = () => save().then(() => toast('Draft saved')).catch(e => toast(e.message, true));
      $('ed-review').onclick = review;
      $('ed-test').onclick = testSend;
      const aud = (id, k, fn) => { const el = $(id); if (el) el.onchange = e => { ed.audience[k] = fn ? fn(e.target) : e.target.value; touch(false); countAudience(); }; };
      aud('ed-seg', 'segment'); aud('ed-alang', 'lang'); aud('ed-country', 'country'); aud('ed-tag', 'tag'); aud('ed-unc', 'includeUnconsented', el => el.checked);
      const un = $('ed-unpick'); if (un) un.onclick = () => { ed.audience.emails = []; touch(false); renderEditor(); };
      $('ed-lmode').onchange = e => { ed.lang_mode = e.target.value; touch(false); countAudience(); };
      $('ed-code').onchange = e => { ed.discount_code = e.target.value; touch(); };
      $('ed-newcode').onclick = e => { e.preventDefault(); const t = document.querySelector('.op-tabs [data-tab="discounts"]'); if (t) t.click(); toast('Create a code (leave the email empty), then come back: it will be in the list'); };
    }
    v.querySelectorAll('[data-el]').forEach(b => b.onclick = () => { edLang = b.dataset.el; pvLang = edLang; renderEditor(); });
    v.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => { pvLang = b.dataset.pl; v.querySelectorAll('[data-pl]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); preview(); });
    v.querySelectorAll('[data-pw]').forEach(b => b.onclick = () => { pvWidth = b.dataset.pw; v.querySelector('.crm-pv-frame').className = 'crm-pv-frame ' + pvWidth; v.querySelectorAll('[data-pw]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
    renderBlocks(); preview(); countAudience();
  }
  const offer = c => ({ percent: `${Number(c.value)}% off`, fixed: `AED ${Number(c.value)} off`, free_shipping: 'Free delivery', free_order: 'Free order' }[c.type] || c.type);
  function okMark(l) { const v = (ed.content || {})[l] || {}; return v.subject && (v.blocks || []).length ? '<i class="ok">✓</i>' : '<i>empty</i>'; }

  function touch(pv = true) {
    dirty = true; const s = $('ed-saved'); if (s) { s.textContent = 'Unsaved changes'; s.className = 'op-status bad'; }
    if (pv) { clearTimeout(pvTimer); pvTimer = setTimeout(preview, 450); }
  }

  function renderBlocks() {
    const box = $('ed-content'); if (!box) return;
    const ro = !!ed.readonly; const L = edLang; const ar = L === 'ar';
    ed.content[L] = ed.content[L] || { subject: '', preheader: '', blocks: [] };
    const v = ed.content[L];
    const other = ed.content[ar ? 'en' : 'ar'];
    box.innerHTML = `
      <div class="dc-form crm-aud">
        <label class="wide" style="grid-column:1/-1;">Subject line <small>${v.subject.length}/200 · keep it under ~60 characters</small><input id="ed-subj" value="${esc(v.subject)}" dir="${ar ? 'rtl' : 'ltr'}" maxlength="200" placeholder="${ar ? 'عنوان الرسالة' : 'What people see in their inbox'}"></label>
        <label class="wide" style="grid-column:1/-1;">Preview text <small>the grey line after the subject in most inboxes</small><input id="ed-pre" value="${esc(v.preheader || '')}" dir="${ar ? 'rtl' : 'ltr'}" maxlength="200"></label>
      </div>
      ${!v.blocks.length && other && (other.blocks || []).length && !ro ? `<div class="crm-note">No ${ar ? 'Arabic' : 'English'} version yet. ${ed.lang_mode === 'auto' ? `People who read ${ar ? 'Arabic' : 'English'} will get the ${ar ? 'English' : 'Arabic'} version until you write one.` : ''} <button class="op-btn sm2" type="button" id="ed-copylayout">Copy the layout from ${ar ? 'English' : 'Arabic'}</button></div>` : ''}
      <ol class="crm-blocks" id="ed-blocks">${v.blocks.map((b, i) => blockHtml(b, i, v.blocks.length, ar)).join('')}</ol>
      ${ro ? '' : `<div class="crm-addblock"><span>Add:</span>${Object.entries(BLOCKS).map(([k, l]) => `<button type="button" class="op-chip" data-add="${k}">+ ${l}</button>`).join('')}</div>
      <p class="op-muted crm-tokens">Personal touches: <code>{{first_name}}</code> becomes the person's first name (or "${ar ? 'صديقنا' : 'there'}"). In paragraphs: <code>**bold**</code>, <code>*italic*</code>, <code>[link text](stories.html)</code>.</p>`}`;
    if (ro) { box.querySelectorAll('input,textarea,select,button').forEach(el => { if (!el.closest('.crm-langtabs')) el.disabled = true; }); return; }
    $('ed-subj').oninput = e => { v.subject = e.target.value; touch(); const sm = e.target.previousSibling; };
    $('ed-pre').oninput = e => { v.preheader = e.target.value; touch(); };
    const cp = $('ed-copylayout'); if (cp) cp.onclick = () => { v.blocks = clone(other.blocks).map(b => ({ ...b, text: b.text ? '' : b.text, label: b.label ? '' : b.label, note: '' })); if (!v.subject) v.subject = ''; touch(); renderBlocks(); };
    box.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
      const t = b.dataset.add, nb = { t };
      if (t === 'button') { nb.label = ar ? 'تصفّح القصص ←' : 'Browse the stories →'; nb.url = 'stories.html'; }
      if (t === 'story' && stories[0]) nb.slug = stories[0].slug;
      if (t === 'image') { nb.url = (window.HK_CRM_PHOTOS || [{}])[0].url || ''; nb.link = 'stories.html'; }
      const signIdx = v.blocks.findIndex(x => x.t === 'signoff');
      if (signIdx >= 0 && t !== 'signoff') v.blocks.splice(signIdx, 0, nb); else v.blocks.push(nb);
      touch(); renderBlocks();
      const els = box.querySelectorAll('.crm-block'); const target = els[signIdx >= 0 && t !== 'signoff' ? signIdx : els.length - 1];
      if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); const inp = target.querySelector('textarea,input'); if (inp) inp.focus(); }
    });
    box.querySelectorAll('.crm-block').forEach(li => {
      const i = +li.dataset.i, b = v.blocks[i];
      li.querySelectorAll('[data-f]').forEach(inp => inp.oninput = inp.onchange = () => { b[inp.dataset.f] = inp.value; touch(); if (inp.dataset.f === 'url' && b.t === 'image') { const th = li.querySelector('.crm-thumb'); if (th) th.style.backgroundImage = `url('${inp.value}')`; } });
      li.querySelectorAll('[data-photo]').forEach(p => p.onclick = () => { b.url = p.dataset.photo; touch(); renderBlocks(); });
      li.querySelector('[data-mv="up"]').onclick = () => { if (i > 0) { [v.blocks[i - 1], v.blocks[i]] = [v.blocks[i], v.blocks[i - 1]]; touch(); renderBlocks(); } };
      li.querySelector('[data-mv="down"]').onclick = () => { if (i < v.blocks.length - 1) { [v.blocks[i + 1], v.blocks[i]] = [v.blocks[i], v.blocks[i + 1]]; touch(); renderBlocks(); } };
      li.querySelector('[data-mv="del"]').onclick = () => { v.blocks.splice(i, 1); touch(); renderBlocks(); };
    });
  }
  function blockHtml(b, i, n, ar) {
    const d = `dir="${ar ? 'rtl' : 'ltr'}"`;
    const input = (k, ph, extra = '') => `<input data-f="${k}" value="${esc(b[k] || '')}" placeholder="${esc(ph)}" ${extra}>`;
    const area = (k, ph, rows = 3) => `<textarea data-f="${k}" rows="${rows}" placeholder="${esc(ph)}" ${d}>${esc(b[k] || '')}</textarea>`;
    let body = '';
    switch (b.t) {
      case 'eyebrow': case 'heading': case 'subheading': case 'hand': body = input('text', BLOCKS[b.t], d); break;
      case 'text': body = area('text', ar ? 'اكتب هنا…' : 'Write here…', Math.min(10, Math.max(3, String(b.text || '').split('\n').length + 1))); break;
      case 'small': body = area('text', 'Small print', 2); break;
      case 'button': body = `<div class="crm-2">${input('label', 'Button text', d)}${input('url', 'Link, e.g. stories.html', 'dir="ltr"')}</div>`; break;
      case 'image': body = `<div class="crm-img-row"><span class="crm-thumb" style="background-image:url('${esc(b.url || '')}')"></span><div style="flex:1; min-width:0;">
          ${input('url', 'Image link (https://… or images/…jpg)', 'dir="ltr"')}<div class="crm-2" style="margin-top:6px;">${input('alt', 'Describe the photo', d)}${input('link', 'Opens when tapped (optional)', 'dir="ltr"')}</div>
          <div class="crm-photos">${(window.HK_CRM_PHOTOS || []).map(p => `<button type="button" data-photo="${esc(p.url)}" title="${esc(p.label)}" style="background-image:url('${esc(p.url)}')" ${p.url === b.url ? 'aria-pressed="true"' : ''}></button>`).join('')}</div></div></div>`; break;
      case 'story': body = `<select data-f="slug"><option value="">Choose a story…</option>${stories.map(s => `<option value="${esc(s.slug)}" ${b.slug === s.slug ? 'selected' : ''}>${esc(ar && s.title_ar ? s.title_ar : s.title)}</option>`).join('')}</select>
          ${input('note', 'Short line under the title (optional: uses the story description)', d)}`; break;
      case 'code': body = `${input('note', ar ? 'سطر تحت الكود (اختياري)' : 'Line under the code (optional: shows the expiry date)', d)}${ed.discount_code ? '' : '<small class="op-warn">Pick a code in step 2, or this box will be left out.</small>'}`; break;
      case 'divider': body = '<small class="op-muted">A thin line</small>'; break;
      case 'signoff': body = `<small class="op-muted">${ar ? 'قصص صغيرة، ذكريات كبيرة · مع الحب، فريق حكاية' : 'Little stories. Big memories. · With love, the Hikaya team'}</small>`; break;
    }
    return `<li class="crm-block" data-i="${i}"><div class="crm-block-h"><b>${esc(BLOCKS[b.t] || b.t)}</b><span>
      <button type="button" data-mv="up" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${IC.up}</button>
      <button type="button" data-mv="down" ${i === n - 1 ? 'disabled' : ''} aria-label="Move down">${IC.down}</button>
      <button type="button" data-mv="del" aria-label="Remove">${IC.x}</button></span></div>${body}</li>`;
  }

  let pvSeq = 0;
  async function preview() {
    const fr = $('ed-pv'); if (!fr || !ed) return;
    const seq = ++pvSeq;
    const v = (ed.content || {})[pvLang] || {};
    $('pv-subj').textContent = v.subject || '(no subject yet)';
    $('pv-pre').textContent = v.preheader || '';
    if (!(v.blocks || []).length) { fr.srcdoc = `<body style="font:600 14px Inter,sans-serif; color:#7d6a5a; display:flex; align-items:center; justify-content:center; height:90vh; margin:0; background:#F7F1E8;">No ${pvLang === 'ar' ? 'Arabic' : 'English'} version yet</body>`; return; }
    try {
      const r = await K({ action: 'preview', campaign: { name: ed.name, content: ed.content, discount_code: ed.discount_code }, lang: pvLang });
      if (seq !== pvSeq) return;
      $('pv-subj').textContent = r.subject;
      fr.srcdoc = r.html.replace('<head>', '<head><base target="_blank">');
      fr.onload = () => { try { fr.style.height = Math.max(500, fr.contentDocument.documentElement.scrollHeight + 10) + 'px'; } catch (_) {} };
    } catch (e) { if (seq === pvSeq) fr.srcdoc = `<p style="font:14px sans-serif; color:#a3402b; padding:20px;">${esc(e.message)}</p>`; }
  }

  let audSeq = 0;
  function countAudience() {
    clearTimeout(audTimer);
    audTimer = setTimeout(async () => {
      const el = $('ed-count'); if (!el) return; const seq = ++audSeq;
      el.textContent = 'Counting…';
      try {
        const r = await K({ action: 'audience', audience: ed.audience });
        if (seq !== audSeq || !$('ed-count')) return;
        ed._count = r.count;
        const mode = ed.lang_mode;
        el.innerHTML = r.count
          ? `<b>${r.count} ${r.count === 1 ? 'person' : 'people'}</b> will get this · ${mode === 'auto' ? `${r.en} in English, ${r.ar} in Arabic` : `all in ${mode === 'ar' ? 'Arabic' : 'English'}`}${r.notOptedIn && !ed.audience.includeUnconsented ? `<small>${r.notOptedIn} more match but haven't opted in</small>` : ''}${ed.audience.includeUnconsented && r.notOptedIn ? `<small class="op-warn">Includes ${r.notOptedIn} who haven't opted in</small>` : ''}`
          : `<b>Nobody matches yet.</b>${r.notOptedIn ? `<small>${r.notOptedIn} match but haven't opted in</small>` : ''}`;
      } catch (e) { el.textContent = e.message; }
    }, 250);
  }

  async function save() {
    if (ed.readonly) return ed;
    const r = await K({ action: 'save', id: ed.id || undefined, name: ed.name, lang_mode: ed.lang_mode, content: ed.content, audience: ed.audience, discount_code: ed.discount_code, template_key: ed.template_key });
    const keep = { readonly: false, _count: ed._count };
    ed = Object.assign(clone(r.campaign), keep); dirty = false;
    const s = $('ed-saved'); if (s) { s.textContent = 'Saved'; s.className = 'op-status'; }
    await reloadCampaigns();
    return ed;
  }

  async function testSend() {
    let to = '';
    try { to = localStorage.getItem('hk_crm_test_to') || ''; } catch (_) {}
    to = prompt('Send a test to which email? Both language versions are sent.', to || 'info@maison-jaber.com');
    if (!to) return;
    try { localStorage.setItem('hk_crm_test_to', to); } catch (_) {}
    try {
      const r = await K({ action: 'test', campaign: { name: ed.name, content: ed.content, discount_code: ed.discount_code }, to, lang: 'both', name: 'Abdulrazak' });
      toast(`Test sent to ${to} (${r.sent} email${r.sent > 1 ? 's' : ''})`);
    } catch (e) { toast(e.message, true); }
  }

  function problems() {
    const out = [];
    const has = l => { const v = (ed.content || {})[l] || {}; return !!(v.subject && (v.blocks || []).length); };
    if (!has('en') && !has('ar')) out.push('Write the email: it needs a subject and some content.');
    if (ed.lang_mode === 'en' && !has('en')) out.push('You chose English for everyone, but the English version is empty.');
    if (ed.lang_mode === 'ar' && !has('ar')) out.push('You chose Arabic for everyone, but the Arabic version is empty.');
    for (const l of ['en', 'ar']) {
      if (!has(l)) continue;
      const bl = ed.content[l].blocks;
      if (bl.some(b => b.t === 'code') && !ed.discount_code) out.push(`The ${l === 'ar' ? 'Arabic' : 'English'} email has a code box but no code is chosen (it will be left out).`);
      if (bl.some(b => b.t === 'story' && !b.slug)) out.push(`A story card in the ${l === 'ar' ? 'Arabic' : 'English'} email has no story chosen (it will be left out).`);
      if (bl.some(b => (b.t === 'heading' || b.t === 'text') && !String(b.text || '').trim())) out.push(`The ${l === 'ar' ? 'Arabic' : 'English'} email has an empty heading or paragraph.`);
    }
    if (ed.lang_mode === 'auto' && has('en') !== has('ar')) out.push(`Only the ${has('en') ? 'English' : 'Arabic'} version is written, so everyone gets that one.`);
    return out;
  }

  async function review() {
    try { await save(); } catch (e) { return toast(e.message, true); }
    let r; try { r = await K({ action: 'audience', audience: ed.audience }); } catch (e) { return toast(e.message, true); }
    const warn = problems(); const blocking = warn.filter(w => /^Write the email|is empty\.$/.test(w));
    const code = codes.find(c => c.code === ed.discount_code);
    const codeWarn = code && code.max_uses != null && (code.max_uses - (code.uses_count || 0)) < r.count ? `Code ${code.code} has only ${Math.max(0, code.max_uses - (code.uses_count || 0))} uses left for ${r.count} people.` : '';
    const dlg = document.createElement('div'); dlg.className = 'crm-modal'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true');
    dlg.innerHTML = `<div class="crm-modal-card">
      <h2>Send “${esc(ed.name)}”?</h2>
      <dl class="op-kv crm-kv">
        <dt>To</dt><dd><b>${r.count}</b> ${r.count === 1 ? 'person' : 'people'}${ed.lang_mode === 'auto' ? ` · ${r.en} English, ${r.ar} Arabic` : ''}</dd>
        <dt>Subject</dt><dd>${esc((ed.content.en || {}).subject || '')}${(ed.content.ar || {}).subject ? `<br><span dir="rtl">${esc(ed.content.ar.subject)}</span>` : ''}</dd>
        <dt>Code</dt><dd>${ed.discount_code ? esc(ed.discount_code) : 'None'}</dd>
        <dt>From</dt><dd>Hikaya by Maison Jaber · replies go to hello@</dd>
      </dl>
      ${warn.length || codeWarn ? `<ul class="crm-warns">${[...warn, codeWarn].filter(Boolean).map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '<p class="op-muted">Everything looks ready. Each email includes an unsubscribe link.</p>'}
      ${daily.limit && r.count > daily.limit - daily.today ? `<p class="op-warn">Daily limit: ${Math.max(0, daily.limit - daily.today)} more campaign emails can go out today (the limit keeps room for order emails). The rest wait; press Resume tomorrow.</p>` : ''}
      ${ed.audience.includeUnconsented ? '<p class="op-warn">This includes people who never opted in to marketing.</p>' : ''}
      ${!configured ? '<p class="op-warn">Email sending is not switched on yet (RESEND_API_KEY).</p>' : ''}
      <label class="op-check"><input type="checkbox" id="crm-sure">I've checked the preview and sent myself a test</label>
      <div class="crm-modal-act"><button class="op-btn ghost" data-x>Not yet</button><button class="op-btn primary" data-send disabled>${IC.send}Send to ${r.count}</button></div></div>`;
    document.body.appendChild(dlg);
    const close = () => dlg.remove();
    dlg.querySelector('[data-x]').onclick = close; dlg.onclick = e => { if (e.target === dlg) close(); };
    const go = dlg.querySelector("[data-send]");
    dlg.querySelector('#crm-sure').onchange = e => { go.disabled = !e.target.checked || !r.count || !!blocking.length || !configured; };
    go.onclick = async () => {
      close();
      try { await K({ action: 'start', id: ed.id }); runSend(ed.id, ed.name); }
      catch (e) { toast(e.message, true); }
    };
    dlg.querySelector('#crm-sure').focus();
  }

  let sendingNow = false;
  async function runSend(id, name) {
    if (sendingNow) return toast('Already sending, please wait', true);
    sendingNow = true; ed = null; view = 'campaigns';
    await reloadCampaigns().catch(() => {}); renderCampaigns();
    const bar = document.createElement('div'); bar.className = 'crm-sendbar'; bar.setAttribute('role', 'status');
    document.body.appendChild(bar);
    let sent = 0, failed = 0, remaining = 1, lastErr = '';
    const paint = () => { bar.innerHTML = `<b>Sending “${esc(name)}”</b><span>${sent} sent${failed ? ` · ${failed} failed` : ''} · ${remaining} to go</span><small>Keep this tab open. If you close it, press Resume later.</small>`; };
    paint();
    window.addEventListener('beforeunload', guard);
    try {
      let rounds = 0;
      while (remaining > 0 && rounds < 500) {
        rounds++;
        const r = await K({ action: 'batch', id });
        sent += r.sent || 0; failed += r.failed || 0; remaining = r.remaining || 0; lastErr = r.error || lastErr; paint();
        if (r.paused) { toast(r.error || 'Sending paused', true); if (r.dailyLimit) remaining = r.remaining; break; }
        if (r.done) break;
        await new Promise(res => setTimeout(res, 700));   // stay under the email service's rate limit
      }
      if (!remaining) toast(`Sent to ${sent}${failed ? ` · ${failed} failed${lastErr ? ': ' + lastErr.slice(0, 80) : ''}` : ''}`, !!failed);
    } catch (e) { toast(e.message + ' · press Resume to continue', true); }
    finally {
      window.removeEventListener('beforeunload', guard);
      sendingNow = false; bar.remove();
      await reloadCampaigns().catch(() => {}); await reloadContacts().catch(() => {});
      if (view === 'campaigns' && !ed) renderCampaigns();
    }
  }
  function guard(e) { e.preventDefault(); e.returnValue = ''; }

  /* =================== MESSAGES =================== */
  function renderMessages() {
    const v = $('crm-view'); if (!v) return;
    const list = messages.filter(m => mf === 'all' || (mf === 'open' ? !m.handled : m.handled));
    v.innerHTML = `
      <div class="op-toolbar">
        <div class="op-seg">${[['open', 'To answer'], ['done', 'Done'], ['all', 'All']].map(([k, l]) => `<button type="button" data-mf="${k}" aria-pressed="${mf === k}">${l} <span class="op-muted">${k === 'open' ? messages.filter(m => !m.handled).length : k === 'done' ? messages.filter(m => m.handled).length : messages.length}</span></button>`).join('')}</div>
      </div>
      ${list.length ? list.map(m => {
        const c = contacts.find(x => x.email === String(m.email || '').toLowerCase());
        const subj = encodeURIComponent(`Re: your message to Hikaya${m.order_number ? ' (' + m.order_number + ')' : ''}`);
        const body = encodeURIComponent(`\n\n---\n${m.name || ''} wrote on ${fmtDay(m.created_at)}:\n${m.message || ''}`);
        return `<article class="crm-msg ${m.handled ? 'done' : ''}">
          <header><div><b>${esc(m.name || 'Someone')}</b> <span class="op-muted" dir="ltr">${esc(m.email || '')}</span>${m.order_number ? ` <button class="op-badge" data-ord="${esc(m.order_number)}">${esc(m.order_number)}</button>` : ''}${c && c.isCustomer ? ` <span class="op-badge info">Customer · ${c.orders} order${c.orders > 1 ? 's' : ''}</span>` : ''}</div><time>${esc(fmtTime(m.created_at))}</time></header>
          <p dir="auto">${esc(m.message || '')}</p>
          <div class="crm-row-actions">
            <a class="op-btn sm2 primary" href="mailto:${esc(m.email || '')}?subject=${subj}&body=${body}">Reply by email</a>
            ${c && c.phone ? `<a class="op-btn sm2" href="https://wa.me/${esc(String(c.phone).replace(/[^\d]/g, ''))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
            ${c ? `<button class="op-btn sm2" data-contact="${esc(c.email)}">Open contact</button>` : ''}
            <button class="op-btn sm2 ${m.handled ? '' : 'ok'}" data-done="${esc(m.id)}" data-h="${m.handled ? '0' : '1'}">${m.handled ? 'Mark as to answer' : '✓ Mark as done'}</button>
          </div></article>`;
      }).join('') : `<div class="op-empty">${mf === 'open' ? 'All messages answered.' : 'No messages yet.'}</div>`}`;
    v.querySelectorAll('[data-mf]').forEach(b => b.onclick = () => { mf = b.dataset.mf; renderMessages(); });
    v.querySelectorAll('[data-done]').forEach(b => b.onclick = async () => {
      try {
        await C({ action: 'message_handled', id: b.dataset.done, handled: b.dataset.h === '1' });
        const m = messages.find(x => x.id === b.dataset.done); if (m) m.handled = b.dataset.h === '1';
        notify(); counts(); renderMessages(); toast(b.dataset.h === '1' ? 'Marked as done' : 'Moved back to “to answer”');
      } catch (e) { toast(e.message, true); }
    });
    v.querySelectorAll('[data-contact]').forEach(b => b.onclick = () => focusContact(b.dataset.contact));
    v.querySelectorAll('[data-ord]').forEach(b => b.onclick = () => window.hkOrders && window.hkOrders.focus(b.dataset.ord));
  }

  function focusContact(email) {
    const tab = document.querySelector('.op-tabs [data-tab="crm"]'); if (tab && tab.getAttribute('aria-selected') !== 'true') tab.click();
    view = 'contacts'; ed = null; Object.assign(f, { q: email, seg: 'all', consent: 'any', lang: 'any', country: 'any', tag: '' });
    openRows.add(String(email).toLowerCase()); render();
    const r = document.querySelector(`[data-open="${CSS.escape(String(email).toLowerCase())}"]`); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function open(v) {
    const tab = document.querySelector('.op-tabs [data-tab="crm"]'); if (tab) tab.click();
    if (v) { view = v; ed = null; if (loaded) render(); }
  }

  let toastT;
  function toast(msg, bad) {
    let t = $('op-toast'); if (!t) { t = document.createElement('div'); t.id = 'op-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.className = 'show' + (bad ? ' bad' : ''); clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, 3200);
  }

  window.hkCRM = {
    load, open, focusContact, newCampaign,
    onData(fn) { listeners.push(fn); if (loaded) fn({ contacts, messages, campaigns }); },
    get contacts() { return contacts; }, get messages() { return messages; }, get campaigns() { return campaigns; },
  };
})();
