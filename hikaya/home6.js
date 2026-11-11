/* Hikaya — homepage shelves. Shared chrome, region, language and carousels live in chrome.js.
   Both shelves show active stories from the dashboard. A shelf with nothing to show is hidden, never left empty. */
(function () {
  'use strict';
  const H = window.Hikaya;
  const tracks = ['track-new', 'track-best'].map(id => document.getElementById(id)).filter(Boolean);
  tracks.forEach(tr => { if (!tr.children.length) { tr.innerHTML = H.skeletonHtml(4); tr.setAttribute('aria-busy', 'true'); } });
  async function render() {
    const all = await H.loadCatalog();
    const byOrder = (a, b) => (a.sort_order || 0) - (b.sort_order || 0);
    // "Their Next Adventure": newest stories first.
    const newest = [...all].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')) || byOrder(b, a));
    // "Best Sellers": stories marked Featured in the dashboard first, then the dashboard order.
    const best = [...all].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || byOrder(a, b));
    // The homepage shows a short shelf (6) with "View all"; the full collection lives on stories.html.
    [['track-new', newest.slice(0, 6)], ['track-best', best]].forEach(([id, list]) => {
      const tr = document.getElementById(id); if (!tr) return;
      tr.removeAttribute('aria-busy');
      tr.innerHTML = list.map(s => H.cardHtml(s)).join('');
      const sec = tr.closest('section'); if (sec) sec.hidden = !list.length;
    });
    H.initCarousels();
  }
  /* Shop by occasion tiles → stories.html?occasion=… */
  function renderOccasions() {
    const grid = document.getElementById('occ-grid'); if (!grid) return;
    grid.innerHTML = H.OCCASIONS.map(o => `<li><a class="occ-tile" href="${({ birthday: 'gift-birthday.html', eid: 'gift-eid-ramadan.html', christmas: 'gift-christmas.html', newbaby: 'gift-new-sibling.html', school: 'gift-first-day-of-school.html' })[o.key] || 'stories.html?occasion=' + o.key}">${H.occIcon(o)}<span class="occ-t">${H.esc(H.occasionLabel(o.key))}</span><small>${H.esc(H.t('occ.' + o.key + '_d', ''))}</small></a></li>`).join('');
  }

  /* Photo → illustration reveal: a native range input drives the split (keyboard + touch friendly). */
  function initReveal() {
    const stage = document.getElementById('rvl'); if (!stage) return;
    const range = stage.querySelector('.rvl-range');
    const set = v => stage.style.setProperty('--pos', v + '%');
    range.addEventListener('input', () => { set(range.value); stage.classList.add('touched'); });
    /* A gentle one-time sweep when it first scrolls into view, so visitors see it moves. */
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const frames = [50, 22, 78, 50]; let i = 0, from = 50, t0 = null;
      const step = ts => {
        if (stage.classList.contains('touched')) return;
        if (t0 == null) t0 = ts; const p = Math.min(1, (ts - t0) / 700);
        const v = from + (frames[i + 1] - from) * (1 - Math.pow(1 - p, 3));
        set(v.toFixed(1)); range.value = Math.round(v);
        if (p < 1) return requestAnimationFrame(step);
        i++; from = frames[i]; t0 = null; if (i < frames.length - 1) requestAnimationFrame(step);
      };
      setTimeout(() => requestAnimationFrame(step), 400);
    }, { threshold: 0.6 });
    io.observe(stage);
  }

  /* Siblings section: bundle totals in the visitor's own currency, from the cart's own pricing
     (window.hikayaCart.bundleTotalFor), plus two real story covers fanned like a pair of gifts. */
  async function renderSiblings() {
    const sec = document.getElementById('siblings'); if (!sec || !window.hikayaCart || !window.hikayaRegion) return;
    const region = window.hikayaRegion();
    const fmt = n => (window.hikayaFormatPrice ? window.hikayaFormatPrice(n, region) : region.symbol + ' ' + n);
    const tr = (k, f) => (window.hikayaT && window.hikayaT(k)) || f;
    [2, 3].forEach(n => {
      const b = window.hikayaCart.bundleTotalFor(n, region);
      const tot = sec.querySelector(`[data-sib-total="${n}"]`); if (tot) tot.innerHTML = `<bdi>${fmt(b.total)}</bdi>`;
      const sv = sec.querySelector(`[data-sib-save="${n}"]`); if (sv) sv.innerHTML = b.saving > 0 ? tr('sib.save', 'You save {amount}').replace('{amount}', `<bdi>${fmt(b.saving)}</bdi>`) : '';
    });
    try {
      const ar = (window.hikayaLang && window.hikayaLang()) === 'ar';
      const covers = (await H.loadCatalog()).map(s => (ar && s.cover_image_url_ar) || s.cover_image_url).filter(Boolean);
      sec.querySelectorAll('.sib-cover').forEach((el, i) => { const u = covers[i % Math.max(1, covers.length)]; if (u) el.style.backgroundImage = `url("${String(u).replace(/"/g, '%22')}")`; });
    } catch (e) { /* gradient placeholders stay */ }
  }

  /* Phone hero fit (Nov 2026): tell the CSS how tall the bars above the hero are (--hx-top) and how much
     content sits under the photo (--hx-below); the photo takes the rest of Safari's visible height (100svh).
     The delivery/gift-box facts line counts too when the photo can still be at least 300px tall; on small
     phones (iPhone SE) it moves just below the fold so the price, installments and buttons stay in view. */
  function fitHero() {
    const hero = document.querySelector('.hero.hx'); if (!hero) return;
    const mq = window.matchMedia('(max-width: 767px)');
    const probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    let raf = 0;
    const run = () => {
      raf = 0;
      if (!mq.matches) { hero.style.removeProperty('--hx-top'); hero.style.removeProperty('--hx-below'); return; }
      const copy = hero.querySelector('.hero-copy'), ctas = hero.querySelector('.hx-ctas'), facts = hero.querySelector('.hx-facts');
      if (!copy || !ctas) return;
      const top = Math.round(hero.getBoundingClientRect().top + window.scrollY);
      const c = copy.getBoundingClientRect(), padB = parseFloat(getComputedStyle(copy).paddingBottom) || 0;
      const withCtas = Math.ceil(ctas.getBoundingClientRect().bottom - c.top + 6);
      const withFacts = facts ? Math.ceil(facts.getBoundingClientRect().bottom - c.top + padB) : withCtas;
      const svh = probe.getBoundingClientRect().height || window.innerHeight;
      const imgMax = hero.getBoundingClientRect().width * 1.25;
      const below = Math.min(imgMax, svh - top - withFacts) >= 300 ? withFacts : withCtas;
      hero.style.setProperty('--hx-top', top + 'px');
      hero.style.setProperty('--hx-below', below + 'px');
    };
    const later = () => { if (!raf) raf = requestAnimationFrame(run); };
    run();
    window.addEventListener('resize', later);
    if (mq.addEventListener) mq.addEventListener('change', later);
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(later);
      ro.observe(hero.querySelector('.hero-copy'));
      document.querySelectorAll('.hk-welcome-bar, .utility, .site-header').forEach(el => ro.observe(el));
    }
    document.addEventListener('hikaya:langchange', later);
    document.addEventListener('hikaya:regionchange', later);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  }

  function boot() { fitHero(); render(); renderOccasions(); initReveal(); renderSiblings(); }
  document.addEventListener('hikaya:regionchange', renderSiblings);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('hikaya:langchange', () => { render(); renderOccasions(); renderSiblings(); });
})();
