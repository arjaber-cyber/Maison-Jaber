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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
  document.addEventListener('hikaya:langchange', render);
})();
