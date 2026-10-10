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
    [['track-new', newest], ['track-best', best]].forEach(([id, list]) => {
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
    grid.innerHTML = H.OCCASIONS.map(o => `<li><a class="occ-tile" href="stories.html?occasion=${o.key}">${H.occIcon(o)}<span class="occ-t">${H.esc(H.occasionLabel(o.key))}</span><small>${H.esc(H.t('occ.' + o.key + '_d', ''))}</small></a></li>`).join('');
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

  function boot() { render(); renderOccasions(); initReveal(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('hikaya:langchange', () => { render(); renderOccasions(); });
})();
