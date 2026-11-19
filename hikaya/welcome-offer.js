/* Hikaya welcome pop-up (Nov 2026)
   A warm email sign-up that gives the first-order code (FIRSTORDER) and keeps it ready for checkout.

   When it shows
   - Only on shop pages that load this file (home, stories, story page), never on guides,
     country pages, gift landing pages, cart, checkout or personalise.
   - After 12 seconds for visitors from Instagram/Facebook/TikTok, 25 seconds for everyone else (counted across
     pages in this visit), never on arrival. On desktop it can come a little earlier (after 8 seconds) when the
     mouse heads for the tab bar to leave.
   - NOT for visitors who came from Google/Bing/other search without an ad click (SEO-safe:
     organic search visitors never see it during that visit), and never for bots.
   - Not again for 14 days after "No thanks", and never again after signing up or ordering.
   - Not while another dialog is open (cover preview, menus, cookie options), and not while the cookie banner
     is still on screen (it waits until the visitor has answered it).
   - Social visitors are recognised on every page here (ad links, referrer, in-app browser), not only the homepage.

   Preview it straight away with ?welcome=1 (ignores all the rules above). */
(function () {
  'use strict';
  const CODE = 'FIRSTORDER', AED = 20, DELAY_SOCIAL = 12000, DELAY_OTHER = 25000, SNOOZE_DAYS = 14;
  const K_STATE = 'hk_wo', K_CODE = 'hk_welcome_code', K_START = 'hk_wo_start', K_ORGANIC = 'hk_wo_organic';
  const force = /[?&]welcome=1(&|$)/.test(location.search);

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ---------- Should it show at all? ---------- */
  const SEARCH = /(^|\.)(google\.[a-z.]+|bing\.com|yahoo\.com|duckduckgo\.com|yandex\.[a-z]+|ecosia\.org|baidu\.com|search\.brave\.com|startpage\.com)$/i;
  const AD_PARAMS = /[?&](gclid|gbraid|wbraid|gad_source|gad_campaignid|msclkid|fbclid|ttclid|utm_source|utm_medium|hk)=/i;
  function lastTouch() {
    // The latest visit source analytics.js saved (refreshed on every new ad click or outside link), kept 30 days.
    try { const a = JSON.parse(localStorage.getItem('hikaya_attr_v1') || 'null'); const l = a && a.last; return l && Date.now() - (l.ts || 0) < 2592e6 ? l : null; } catch (e) { return null; }
  }
  function organicThisVisit() {
    try {
      if (sessionStorage.getItem(K_ORGANIC) === '1') return true;
      if (sessionStorage.getItem(K_ORGANIC) === '0') return false;
      let host = '';
      try { host = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
      // An ad click is not organic. The ad tags may already be tidied out of the address bar, so the saved
      // visit source counts too (a Google Ads click is saved with clk 'google').
      const lt = lastTouch();
      const adClick = AD_PARAMS.test(location.search) || !!(lt && (lt.clk || lt.gc || lt.gb || lt.wb || lt.src));
      const organic = !!host && SEARCH.test(host) && !adClick;
      // Only the landing page decides: moving around our own site keeps the first answer.
      const internal = /(^|\.)maison-jaber\.com$|netlify\.app$/i.test(host);
      if (!internal) sessionStorage.setItem(K_ORGANIC, organic ? '1' : '0');
      return organic;
    } catch (e) { return false; }
  }
  /* Social visitor (Instagram/Facebook/TikTok/Snapchat ad or link, or their in-app browser), on ANY page this
     file runs on: the homepage decides it in its <head>, but many ads land straight on a story page. Same signals
     as the homepage; remembered in hikaya_hero_v so the homepage, GA4 and Clarity treat the visit the same way. */
  function socialVisit() {
    try {
      const hv = window.hkHero || JSON.parse(localStorage.getItem('hikaya_hero_v') || 'null');
      if (hv && hv.ch === 'social' && (!hv.t || Date.now() - hv.t < 2592e6)) return true;
      const q = location.search, ref = document.referrer || '', ua = navigator.userAgent || '';
      /* analytics.js tidies the ad tags out of the address bar before this runs, so also read the visit
         source it saved (hikaya_attr_v1, last touch). */
      const lt = lastTouch();
      const social = (lt && (/^(ig|instagram|fb|facebook|meta|tiktok|snapchat|snap)$/i.test(lt.src || '') || /^(paid_?social|social)$/i.test(lt.med || '')
          || lt.clk === 'meta' || lt.clk === 'tiktok' || /(instagram|facebook|tiktok|snapchat)\.com$/i.test(lt.rh || '')))
        || /[?&](fbclid|ttclid|igshid|sccid)=/.test(q) || /[?&]utm_source=(ig|instagram|fb|facebook|meta|tiktok|snapchat|snap)(&|$)/i.test(q)
        || /[?&]utm_medium=(paid_?social|social)(&|$)/i.test(q) || /(instagram|facebook|tiktok|snapchat)\.com/i.test(ref)
        || /Instagram|FBAN|FBAV|musical_ly|TikTok|Snapchat/.test(ua);
      if (social && !window.hkHero) localStorage.setItem('hikaya_hero_v', JSON.stringify({ ch: 'social', v: 'value', t: Date.now() }));
      return social;
    } catch (e) { return false; }
  }
  function consentBannerUp() {
    const b = document.getElementById('hikaya-consent-banner');
    return !!(b && !b.hidden && b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden' && getComputedStyle(b).display !== 'none');
  }
  function isBot() {
    return navigator.webdriver || /bot|crawl|spider|slurp|lighthouse|headless|preview/i.test(navigator.userAgent || '');
  }
  function blockedByState() {
    const s = store.get(K_STATE);
    if (!s) return false;
    if (s.done || s.ordered) return true;
    if (s.dismissed && Date.now() - s.dismissed < SNOOZE_DAYS * 864e5) return true;
    return false;
  }
  function otherDialogOpen() {
    // Only dialogs actually on screen count (the cookie banner itself doesn't; its options panel does).
    const els = document.querySelectorAll('dialog[open], [role="dialog"]:not(#hk-wo):not(#hikaya-consent-banner), .cp-modal.open, .nav-open, body.menu-open, #hikaya-consent-detail');
    return [...els].some(el => !el.hidden && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
  }

  /* ---------- Copy (EN / AR, no full stops in Arabic) ---------- */
  const TX = {
    en: {
      eyebrow: 'A little welcome gift',
      title: '{amt} off your child’s first story',
      sub: 'Join the Hikaya family for new stories and seasonal editions. We’ll keep your code ready at checkout.',
      ph: 'Your email', btn: 'Get my gift', busy: 'One moment…',
      fine: 'No spam, only the occasional story. Unsubscribe anytime.', privacy: 'Privacy',
      no: 'No thanks', close: 'Close',
      err: 'Please enter a valid email address',
      okEyebrow: 'It’s yours ✦', okTitle: 'Your code is saved for checkout',
      okSub: 'It’s added automatically when you order. We’ve emailed it to you too.',
      copy: 'Copy', copied: 'Copied',
      start: 'Start personalising', cover: 'or try their cover free first',
    },
    ar: {
      eyebrow: 'هدية ترحيب صغيرة',
      title: 'خصم {amt} على أول قصة لطفلك',
      sub: 'انضم إلى عائلة حكاية لتصلك القصص الجديدة وإصدارات المواسم، وسنحفظ لك الكود جاهزًا عند الدفع',
      ph: 'بريدك الإلكتروني', btn: 'أرسل هديتي', busy: 'لحظة…',
      fine: 'بدون رسائل مزعجة، فقط قصة من حين لآخر، ويمكنك إلغاء الاشتراك في أي وقت', privacy: 'الخصوصية',
      no: 'لا شكرًا', close: 'إغلاق',
      err: 'يرجى إدخال بريد إلكتروني صحيح',
      okEyebrow: 'الهدية لك ✦', okTitle: 'كودك محفوظ للدفع',
      okSub: 'يُضاف تلقائيًا عند الطلب، وأرسلناه إلى بريدك أيضًا',
      copy: 'نسخ', copied: 'تم النسخ',
      start: 'ابدأ التخصيص', cover: 'أو جرّب غلاف طفلك مجانًا أولًا',
    },
  };
  const lang = () => (document.documentElement.lang === 'ar' ? 'ar' : 'en');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function amountText() {
    try {
      const r = window.hikayaRegion ? window.hikayaRegion() : null;
      const a = window.hikayaCodeAmount ? window.hikayaCodeAmount(AED, r) : AED;
      return window.hikayaFormatPrice ? window.hikayaFormatPrice(a, r) : 'AED ' + a;
    } catch (e) { return 'AED ' + AED; }
  }
  function track(ev, p) { try { window.hikayaTrackEvent && window.hikayaTrackEvent(ev, Object.assign({ placement: 'welcome_popup' }, p || {})); } catch (e) {} }

  /* ---------- Styles ---------- */
  function css() {
    if (document.getElementById('hk-wo-css')) return;
    const st = document.createElement('style'); st.id = 'hk-wo-css';
    st.textContent = `
#hk-wo{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px}
#hk-wo[hidden]{display:none}
#hk-wo .wo-bg{position:absolute;inset:0;background:rgba(38,28,23,.42);opacity:0;transition:opacity .3s}
#hk-wo .wo-card{position:relative;width:100%;max-width:420px;background:var(--white,#FFFCF7);border:1px solid var(--taupe,#D8C5B3);border-radius:20px;box-shadow:0 24px 60px -20px rgba(38,28,23,.5);overflow:hidden;transform:translateY(16px);opacity:0;transition:transform .35s cubic-bezier(.2,.7,.2,1),opacity .3s;font-family:var(--sans,system-ui);color:var(--ink,#261C17)}
#hk-wo.in .wo-bg{opacity:1}#hk-wo.in .wo-card{transform:none;opacity:1}
#hk-wo .wo-img{display:block;width:100%;height:150px;object-fit:cover;object-position:50% 72%}
#hk-wo .wo-body{padding:18px 22px 18px;text-align:center}
#hk-wo .wo-eyebrow{margin:0;font-family:var(--hand,cursive);font-size:1.35rem;color:var(--brand,#8A5638)}
#hk-wo h2{margin:2px 0 8px;font-family:var(--serif,Georgia,serif);font-size:1.7rem;line-height:1.15}
#hk-wo .wo-sub{margin:0 0 14px;font-size:14px;line-height:1.5;color:var(--ink-soft,#5E4A3D)}
#hk-wo form{display:grid;gap:8px}
#hk-wo input[type=email]{width:100%;box-sizing:border-box;min-height:48px;border:1px solid var(--taupe,#D8C5B3);border-radius:12px;padding:0 14px;font:inherit;font-size:16px;background:#fff;color:inherit}
#hk-wo input[type=email]:focus{outline:2px solid var(--gold,#C7A56C);outline-offset:1px}
#hk-wo .wo-btn{min-height:50px;border:0;border-radius:28px;background:var(--brand,#8A5638);color:#fff;font:inherit;font-weight:700;font-size:15.5px;cursor:pointer;width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none}
#hk-wo .wo-btn[disabled]{opacity:.7}
#hk-wo .wo-err{margin:0;font-size:12.5px;color:#a23b2a;min-height:0}
#hk-wo .wo-fine{margin:10px 0 0;font-size:11.5px;color:var(--ink-soft,#5E4A3D);line-height:1.4}
#hk-wo .wo-fine a{color:inherit}
#hk-wo .wo-no{margin-top:6px;background:none;border:0;font:inherit;font-size:13.5px;color:var(--brand-dark,#573624);text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:6px}
#hk-wo .wo-x{position:absolute;top:10px;inset-inline-end:10px;width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,252,247,.92);color:var(--ink,#261C17);font-size:20px;line-height:1;cursor:pointer;display:grid;place-items:center}
#hk-wo .wo-code{display:flex;align-items:center;justify-content:center;gap:10px;margin:4px 0 14px}
#hk-wo .wo-code b{font-size:20px;letter-spacing:.18em;color:var(--brand-dark,#573624);border:1.5px dashed var(--gold,#C7A56C);border-radius:10px;padding:8px 14px;background:var(--ivory,#F7F1E8)}
#hk-wo .wo-copy{border:1px solid var(--taupe,#D8C5B3);background:#fff;border-radius:20px;padding:8px 14px;font:inherit;font-size:13px;cursor:pointer;color:var(--brand-dark,#573624)}
#hk-wo .wo-link{display:inline-block;margin-top:10px;font-size:14px;color:var(--brand-dark,#573624);text-decoration:underline;text-underline-offset:3px}
@media (max-width:560px){
  #hk-wo{align-items:flex-end;padding:0}
  #hk-wo .wo-card{max-width:none;border-radius:20px 20px 0 0;border-bottom:0;padding-bottom:env(safe-area-inset-bottom,0px);transform:translateY(100%)}
  #hk-wo .wo-img{height:120px}
  #hk-wo h2{font-size:1.5rem}
}
@media (prefers-reduced-motion:reduce){#hk-wo .wo-card,#hk-wo .wo-bg{transition:none}}`;
    document.head.appendChild(st);
  }

  /* ---------- Build & behaviour ---------- */
  let root, lastFocus;
  function formHtml(T) {
    return `<button type="button" class="wo-x" data-wo="close" aria-label="${esc(T.close)}">×</button>
      <img class="wo-img" src="images/hom-box-01.webp" width="490" height="490" alt="" />
      <div class="wo-body">
        <p class="wo-eyebrow">${esc(T.eyebrow)}</p>
        <h2 id="wo-t">${esc(T.title).replace('{amt}', `<bdi dir="ltr">${esc(amountText())}</bdi>`)}</h2>
        <p class="wo-sub">${esc(T.sub)}</p>
        <form novalidate>
          <input type="email" name="email" autocomplete="email" inputmode="email" required placeholder="${esc(T.ph)}" aria-label="${esc(T.ph)}" dir="ltr" />
          <p class="wo-err" role="alert" hidden></p>
          <button type="submit" class="wo-btn">${esc(T.btn)}</button>
        </form>
        <p class="wo-fine">${esc(T.fine)} <a href="privacy.html">${esc(T.privacy)}</a></p>
        <button type="button" class="wo-no" data-wo="no">${esc(T.no)}</button>
      </div>`;
  }
  function successHtml(T) {
    const arr = lang() === 'ar' ? '←' : '→';
    return `<button type="button" class="wo-x" data-wo="close" aria-label="${esc(T.close)}">×</button>
      <div class="wo-body" style="padding-top:26px">
        <p class="wo-eyebrow">${esc(T.okEyebrow)}</p>
        <h2 id="wo-t">${esc(T.okTitle)}</h2>
        <div class="wo-code"><b dir="ltr">${CODE}</b><button type="button" class="wo-copy" data-hk-copy="${CODE}" data-copied="${esc(T.copied)}" data-label="${esc(T.copy)}">${esc(T.copy)}</button></div>
        <p class="wo-sub">${esc(T.okSub)}</p>
        <a class="wo-btn" href="personalize.html" data-wo="start">${esc(T.start)} <span aria-hidden="true">${arr}</span></a>
        <a class="wo-link" href="cover-preview.html" data-cp-entry="welcome_popup" data-wo="cover">${esc(T.cover)}</a>
      </div>`;
  }
  function open() {
    if (root || otherDialogOpen()) return;
    css();
    const T = TX[lang()];
    root = document.createElement('div');
    root.id = 'hk-wo'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'wo-t');
    root.dir = lang() === 'ar' ? 'rtl' : 'ltr';
    root.innerHTML = `<div class="wo-bg" data-wo="close"></div><div class="wo-card">${formHtml(T)}</div>`;
    document.body.appendChild(root);
    lastFocus = document.activeElement;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('in')));
    root.addEventListener('click', onClick);
    root.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', onKey);
    store.set(K_STATE, Object.assign({}, store.get(K_STATE), { shown: Date.now() }));
    track('welcome_popup_view');
    setTimeout(() => { const b = root && root.querySelector('.wo-x'); if (b) b.focus({ preventScroll: true }); }, 350);
  }
  function close(why) {
    if (!root) return;
    if (why === 'dismiss') { store.set(K_STATE, Object.assign({}, store.get(K_STATE), { dismissed: Date.now() })); track('welcome_popup_dismiss'); }
    document.removeEventListener('keydown', onKey);
    const r = root; root = null;
    r.classList.remove('in');
    setTimeout(() => r.remove(), 320);
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
  }
  function onKey(e) {
    if (!root) return;
    if (e.key === 'Escape') { close(store.get(K_STATE) && store.get(K_STATE).done ? 'done' : 'dismiss'); return; }
    if (e.key === 'Tab') { // keep focus inside the dialog
      const f = [...root.querySelectorAll('button, a[href], input')].filter(el => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  function onClick(e) {
    const a = e.target.closest('[data-wo]'); if (!a) return;
    const k = a.getAttribute('data-wo');
    const done = !!(store.get(K_STATE) || {}).done;
    if (k === 'close' || k === 'no') close(done ? 'done' : 'dismiss');
    else if (k === 'start' || k === 'cover') track('welcome_popup_cta', { cta: k });
  }
  async function onSubmit(e) {
    e.preventDefault();
    const T = TX[lang()];
    const form = e.target, input = form.querySelector('input'), err = form.querySelector('.wo-err'), btn = form.querySelector('.wo-btn');
    const email = (input.value || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = T.err; err.hidden = false; input.focus(); return; }
    err.hidden = true; btn.disabled = true; btn.textContent = T.busy;
    try {
      await fetch('/.netlify/functions/subscribe-newsletter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lang: lang(), source: 'welcome_popup', amount: amountText(), country: window.hikayaRegionKey ? window.hikayaRegionKey() : '' }),
      });
    } catch (e2) { /* the code is still given: a network blip must not cost the visitor their gift */ }
    store.set(K_STATE, Object.assign({}, store.get(K_STATE), { done: Date.now() }));
    store.set(K_CODE, { code: CODE, t: Date.now() });
    track('generate_lead', { method: 'welcome_popup' });
    const card = root && root.querySelector('.wo-card');
    if (card) { card.innerHTML = successHtml(T); const s = card.querySelector('.wo-btn'); if (s) s.focus({ preventScroll: true }); }
  }

  /* ---------- Timing ---------- */
  function schedule() {
    if (force) { setTimeout(open, 600); return; }
    if (isBot() || blockedByState() || organicThisVisit()) return;
    if (store.get(K_CODE)) return; // already has the code from an earlier sign-up
    let start = 0;
    try { start = Number(sessionStorage.getItem(K_START)) || 0; if (!start) { start = Date.now(); sessionStorage.setItem(K_START, String(start)); } } catch (e) { start = Date.now(); }
    const social = socialVisit();
    const wait = Math.max(1500, (social ? DELAY_SOCIAL : DELAY_OTHER) - (Date.now() - start));
    // Desktop: leaving towards the tab bar after 8 seconds opens it a little earlier.
    if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const onOut = e => { if (!e.relatedTarget && e.clientY <= 0 && Date.now() - start > 8000) { document.removeEventListener('mouseout', onOut); tryOpen(); } };
      document.addEventListener('mouseout', onOut);
    }
    const tryOpen = () => {
      if (root || blockedByState()) return;
      if (document.visibilityState === 'hidden') { document.addEventListener('visibilitychange', tryOpen, { once: true }); return; }
      if (otherDialogOpen()) { setTimeout(tryOpen, 5000); return; }
      // Never on top of the cookie banner: it covered "No thanks", so a tap there accepted cookies instead.
      // Wait until the visitor has answered it, then give them a moment before the pop-up comes in.
      if (consentBannerUp()) { setTimeout(tryOpen, 3000); return; }
      open();
    };
    setTimeout(tryOpen, wait);
  }
  // A placed order means they no longer need the welcome offer (checkout calls this after a paid order).
  window.hikayaWelcomeOrdered = function () { store.set(K_STATE, Object.assign({}, store.get(K_STATE), { ordered: Date.now() })); try { localStorage.removeItem(K_CODE); } catch (e) {} };
  window.hikayaWelcomePopup = open; // for testing from the console

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule); else schedule();
})();
