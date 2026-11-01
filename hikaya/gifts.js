/* Hikaya — gift landing pages (gifts.html, gift-*.html).
   Fills the story shelf for the page's occasion (body[data-occasion]); the hub shows every story.
   If an occasion has no tagged stories yet, the whole collection is shown so the shelf is never empty. */
(function () {
  'use strict';
  const H = window.Hikaya;
  if (!H) return;
  const occ = document.body.dataset.occasion || '';
  const shelf = document.getElementById('gift-shelf');
  let all = null;
  function render() {
    if (!shelf || !all) return;
    let list = occ ? all.filter(s => H.inOccasion(s, occ)) : all.slice();
    if (!list.length) list = all.slice();
    shelf.innerHTML = list.slice(0, occ ? 8 : 24).map(s => H.cardHtml(s)).join('');
    shelf.removeAttribute('aria-busy');
  }
  H.loadCatalog().then(list => { all = Array.isArray(list) ? list : []; render(); }).catch(() => { if (shelf) shelf.removeAttribute('aria-busy'); });
  document.addEventListener('hikaya:langchange', render);
  document.addEventListener('hikaya:regionchange', render);
})();
