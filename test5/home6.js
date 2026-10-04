/* Hikaya — homepage shelves. Shared chrome, region, language and carousels live in chrome.js. */
(function () {
  'use strict';
  const H = window.Hikaya;
  async function render() {
    const all = await H.loadCatalog();
    const real = all.filter(s => !s.placeholder);
    const ph = all.filter(s => s.placeholder);
    const featured = real.filter(s => s.featured);
    const rest = real.filter(s => !s.featured);
    // "Their Next Adventure": newest first. "Best Sellers": stories marked Featured in the dashboard.
    const newest = [...rest].reverse().concat(ph.filter(p => p.shelf === 'new'));
    const best = featured.concat(ph.filter(p => p.shelf === 'best'), rest.slice(0, 2));
    document.getElementById('track-new').innerHTML = newest.map(s => H.cardHtml(s)).join('');
    document.getElementById('track-best').innerHTML = best.map(s => H.cardHtml(s)).join('');
    H.initCarousels();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
  document.addEventListener('hikaya:langchange', render);
})();
