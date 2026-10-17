/* Hikaya — "Look inside" book preview (Oct 2026).
   A "Look inside" button opens a full-screen viewer where the book opens by itself and the
   pages turn with a real page-curl (drag a corner, swipe, arrows or ← → keys).
   Shows: front cover → up to 6 inside pages → back cover. Nothing else.
   Page-turn engine: StPageFlip (vendor/page-flip.browser.js, MIT).
   Usage: HikayaFlipbook.open({ cover, pages: [...], back, title, t, ctaHref }) */
(function () {
  'use strict';
  const MAX_PAGES = 6;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tpl = (s, o) => Object.keys(o).reduce((a, k) => a.split('{' + k + '}').join(o[k]), s);
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  let viewer = null, flip = null, total = 0, lastFocus = null, opts = null, openTimer = null;

  function sizeFor() {
    const portrait = window.innerWidth < 700;
    const w = Math.min(window.innerWidth - 32, 960);
    const h = window.innerHeight - (portrait ? 230 : 250);
    return { pageW: Math.floor(Math.max(200, Math.min(portrait ? w : w / 2, h))), portrait };
  }

  function label(i) {
    const t = opts.t;
    if (i === 0) return t('lx.cover', 'Cover');
    if (i >= total - 1) return t('fb.back', 'Back cover');
    const n = total - 2; // inside pages
    if (flip.getOrientation() === 'portrait') return tpl(t('fb.page_of', 'Page {n} of {total}'), { n: i, total: n });
    return tpl(t('fb.pages_of', 'Pages {a}–{b} of {total}'), { a: i, b: Math.min(i + 1, n), total: n });
  }

  function update(i) {
    if (!viewer || !flip) return;
    viewer.querySelector('.lx-count').textContent = label(i);
    viewer.querySelector('[data-lx="prev"]').disabled = i === 0;
    viewer.querySelector('[data-lx="next"]').disabled = i >= total - 1;
    viewer.querySelector('.lx-end').hidden = i < total - 1;
    // Keep the closed book centred: shift half a page while only the front or back cover shows.
    const mover = viewer.querySelector('.lx-mover');
    if (flip.getOrientation() === 'portrait') { mover.style.transform = 'none'; return; }
    const half = Math.round(sizeFor().pageW / 2);
    mover.style.transform = i === 0 ? `translateX(-${half}px)` : i >= total - 1 ? `translateX(${half}px)` : 'none';
  }

  function build() {
    const { t, title } = opts;
    const pages = [opts.cover].concat(opts.pages.filter(Boolean).slice(0, MAX_PAGES)).concat(opts.back ? [opts.back] : []).filter(Boolean);
    const shelf = viewer.querySelector('.lx-shelf');
    shelf.innerHTML = `<div class="lx-mover"><div class="lx-book">${pages.map((src, i) => {
      const hard = i === 0 || (opts.back && i === pages.length - 1);
      const alt = i === 0 ? tpl(t('lx.cover_alt', 'Cover of {title}'), { title })
        : hard ? tpl(t('fb.back_alt', 'Back cover of {title}'), { title })
        : tpl(t('lx.page_alt', 'Sample page {n} from {title}'), { n: i, title });
      return `<div class="lx-page ${hard ? 'is-hard' : 'is-soft'}"${hard ? ' data-density="hard"' : ''}><img src="${esc(src)}" alt="${esc(alt)}" draggable="false"></div>`;
    }).join('')}</div></div>`;
    const book = shelf.querySelector('.lx-book');
    const { pageW, portrait } = sizeFor();
    flip = new window.St.PageFlip(book, {
      width: pageW, height: pageW, size: 'fixed', showCover: true, usePortrait: portrait,
      maxShadowOpacity: 0.45, flippingTime: reduced() ? 1 : 850, drawShadow: true,
      mobileScrollSupport: false, showPageCorners: true,
    });
    flip.loadFromHTML(book.querySelectorAll('.lx-page'));
    total = flip.getPageCount();
    flip.on('flip', e => update(e.data));
    update(0);
  }

  function destroy() {
    clearTimeout(openTimer);
    if (flip) { try { flip.destroy(); } catch (e) { /* already gone */ } }
    flip = null;
    if (viewer) viewer.querySelector('.lx-shelf').innerHTML = '';
  }

  function ensureViewer() {
    if (viewer) return viewer;
    const t = opts.t;
    viewer = document.createElement('div');
    viewer.className = 'lx-viewer';
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.innerHTML = `
      <button type="button" class="lx-close" data-lx="close" aria-label="${esc(t('fb.close', 'Close preview'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="lx-head"><h2 class="lx-title"></h2><p class="lx-sub"></p></div>
      <div class="lx-shelf" dir="ltr"></div>
      <div class="lx-ctrl" dir="ltr">
        <button type="button" class="lx-btn" data-lx="prev" aria-label="${esc(t('fb.prev', 'Previous page'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
        <span class="lx-count" aria-live="polite"></span>
        <button type="button" class="lx-btn" data-lx="next" aria-label="${esc(t('fb.next', 'Next page'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
      </div>
      <div class="lx-end" hidden><a class="btn btn-primary lx-cta" href="#"></a></div>
      <p class="lx-hint">${esc(t('fb.hint2', 'Use the arrows, swipe, or drag a page corner'))}</p>`;
    document.body.appendChild(viewer);
    viewer.addEventListener('click', e => {
      const b = e.target.closest('[data-lx]');
      if (b) {
        if (b.dataset.lx === 'close') close();
        else if (flip) b.dataset.lx === 'next' ? flip.flipNext() : flip.flipPrev();
        return;
      }
      if (e.target === viewer) close();
    });
    document.addEventListener('keydown', e => {
      if (!viewer.classList.contains('is-on')) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (flip && e.key === 'ArrowRight') flip.flipNext();
      else if (flip && e.key === 'ArrowLeft') flip.flipPrev();
      else if (e.key === 'Tab') { // keep focus inside the dialog
        const f = [...viewer.querySelectorAll('button:not([disabled]), a[href]')].filter(x => !x.closest('[hidden]'));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    let rt;
    window.addEventListener('resize', () => {
      if (!viewer.classList.contains('is-on')) return;
      clearTimeout(rt);
      rt = setTimeout(() => { const at = flip ? flip.getCurrentPageIndex() : 0; destroy(); build(); if (at && flip) { flip.turnToPage(Math.min(at, total - 1)); update(flip.getCurrentPageIndex()); } }, 250);
    });
    return viewer;
  }

  function open(o) {
    if (!window.St || !window.St.PageFlip) return;
    opts = Object.assign({ t: (k, f) => f, pages: [] }, o);
    if (!opts.cover) return;
    ensureViewer();
    const t = opts.t;
    viewer.setAttribute('aria-label', tpl(t('fb.label', 'Look inside {title}'), { title: opts.title || '' }));
    viewer.querySelector('.lx-title').textContent = opts.title || '';
    viewer.querySelector('.lx-sub').textContent = t('fb.sub2', 'A peek inside. Your book is illustrated with your child as the hero.');
    const cta = viewer.querySelector('.lx-cta');
    cta.href = opts.ctaHref || 'personalize.html';
    cta.textContent = t('lx.personalise', 'Personalise this story');
    lastFocus = document.activeElement;
    document.documentElement.classList.add('lx-lock');
    viewer.classList.add('is-on');
    destroy();
    build();
    viewer.querySelector('[data-lx="close"]').focus({ preventScroll: true });
    // Show the closed book for a beat, then open the cover.
    openTimer = setTimeout(() => { if (flip && flip.getCurrentPageIndex() === 0) flip.flipNext(); }, reduced() ? 0 : 700);
  }

  function close() {
    if (!viewer) return;
    const shut = () => {
      viewer.classList.remove('is-on');
      document.documentElement.classList.remove('lx-lock');
      setTimeout(destroy, 350);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    if (flip && flip.getCurrentPageIndex() !== 0 && !reduced()) { flip.flip(0); setTimeout(shut, 900); } else shut();
  }

  window.HikayaFlipbook = { open, close, MAX_PAGES };
})();
