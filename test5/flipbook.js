/* Hikaya — "Look inside" page-turning book preview.
   Shows the front cover, up to 6 inside pages and the back cover, turning like a real book.
   Wide screens: two-page spreads. Narrow screens: one page at a time.
   Usage: HikayaFlipbook.mount(el, { cover, pages: [...], back, title, t }) */
(function () {
  'use strict';
  const MAX_PAGES = 6;
  const END = '__end__'; // plain endpaper (inside of the covers)
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tpl = (s, o) => Object.keys(o).reduce((a, k) => a.split('{' + k + '}').join(o[k]), s);

  function mount(root, opts) {
    if (!root) return null;
    const t = opts.t || ((k, f) => f);
    const pages = (opts.pages || []).filter(Boolean).slice(0, MAX_PAGES);
    const cover = opts.cover || null, back = opts.back || null;
    const title = opts.title || '';
    if (!cover && !pages.length) { root.innerHTML = ''; return null; }

    root.innerHTML = `
      <div class="fb" dir="ltr" tabindex="0" role="region" aria-roledescription="${esc(t('fb.role', 'book preview'))}" aria-label="${esc(tpl(t('fb.label', 'Look inside {title}'), { title }))}">
        <div class="fb-stage"><div class="fb-book"></div></div>
        <div class="fb-ctrl">
          <button type="button" class="fb-btn" data-fb="prev" aria-label="${esc(t('fb.prev', 'Previous page'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
          <span class="fb-count" aria-live="polite"></span>
          <button type="button" class="fb-btn" data-fb="next" aria-label="${esc(t('fb.next', 'Next page'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
        </div>
        <p class="fb-hint">${esc(t('fb.hint', 'Tap or swipe to turn the page'))}</p>
      </div>`;
    const fb = root.querySelector('.fb'), stage = fb.querySelector('.fb-stage'), book = fb.querySelector('.fb-book');
    const prevBtn = fb.querySelector('[data-fb="prev"]'), nextBtn = fb.querySelector('[data-fb="next"]'), count = fb.querySelector('.fb-count');

    let mode = null, leaves = [], state = 0, labels = [];

    function face(src, side, alt) {
      if (!src || src === END) return `<div class="fb-face fb-${side} fb-paper"></div>`;
      return `<div class="fb-face fb-${side}"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" draggable="false"></div>`;
    }
    function altFor(src) {
      if (src === cover) return tpl(t('lx.cover_alt', 'Cover of {title}'), { title });
      if (src === back) return tpl(t('fb.back_alt', 'Back cover of {title}'), { title });
      const i = pages.indexOf(src);
      return tpl(t('lx.page_alt', 'Sample page {n} from {title}'), { n: i + 1, title });
    }

    function build(newMode) {
      // Keep roughly the same place in the book when switching layouts.
      const pos = mode ? progress() : 0;
      mode = newMode;
      fb.classList.toggle('fb-single', mode === 'single');
      fb.classList.toggle('fb-spread', mode === 'spread');
      let pairs = [];
      if (mode === 'spread') {
        // Each leaf: [front (right-hand page), back (left-hand page once turned)].
        const seq = [cover || END, END].concat(pages);
        if (seq.length % 2 === 0) seq.push(END);
        seq.push(back || END);
        for (let i = 0; i < seq.length; i += 2) pairs.push([seq[i], seq[i + 1]]);
        labels = [];
        for (let s = 0; s <= pairs.length; s++) {
          if (s === 0) labels.push(t('lx.cover', 'Cover'));
          else if (s === pairs.length) labels.push(back ? t('fb.back', 'Back cover') : t('fb.end', 'The end'));
          else {
            const l = pairs[s - 1][1], r = pairs[s] ? pairs[s][0] : END;
            const nums = [l, r].map(x => pages.indexOf(x) + 1).filter(n => n > 0);
            labels.push(nums.length === 2 ? tpl(t('fb.pages', 'Pages {a}–{b}'), { a: nums[0], b: nums[1] }) : nums.length ? tpl(t('fb.page', 'Page {n}'), { n: nums[0] }) : '');
          }
        }
      } else {
        const seq = [cover].concat(pages, [back]).filter(Boolean);
        pairs = seq.map(s => [s, END]);
        labels = seq.map(s => s === cover ? t('lx.cover', 'Cover') : s === back ? t('fb.back', 'Back cover') : tpl(t('fb.page', 'Page {n}'), { n: pages.indexOf(s) + 1 }));
      }
      book.innerHTML = pairs.map(([f, b], i) => `<div class="fb-leaf" data-i="${i}">${face(f, 'front', altFor(f))}${face(b, 'back', altFor(b))}</div>`).join('');
      leaves = [...book.querySelectorAll('.fb-leaf')];
      const max = maxState();
      state = Math.max(0, Math.min(max, Math.round(pos * max)));
      paint(false);
    }
    function maxState() { return mode === 'spread' ? leaves.length : leaves.length - 1; }
    function progress() { const m = maxState(); return m ? state / m : 0; }

    function paint(animate) {
      book.classList.toggle('fb-still', !animate);
      leaves.forEach((leaf, i) => {
        const turned = i < state;
        leaf.classList.toggle('is-turned', turned);
        if (!leaf.classList.contains('is-moving')) leaf.style.zIndex = turned ? String(i + 1) : String(leaves.length - i + 1);
      });
      if (mode === 'spread') {
        book.classList.toggle('is-closed-front', state === 0);
        book.classList.toggle('is-closed-back', state === leaves.length);
      } else {
        book.classList.remove('is-closed-front', 'is-closed-back');
      }
      count.textContent = labels[state] || '';
      prevBtn.disabled = state === 0;
      nextBtn.disabled = state === maxState();
      if (!animate) requestAnimationFrame(() => book.classList.remove('fb-still'));
    }

    function go(dir) {
      const next = state + dir;
      if (next < 0 || next > maxState()) return;
      const leaf = leaves[dir > 0 ? state : next];
      if (leaf) {
        leaf.classList.add('is-moving'); leaf.style.zIndex = '200';
        const done = () => { leaf.classList.remove('is-moving'); leaf.removeEventListener('transitionend', done); paint(false); };
        leaf.addEventListener('transitionend', done);
        setTimeout(done, 1100); // in case transitionend never fires (reduced motion, hidden tab)
      }
      state = next;
      paint(true);
    }

    prevBtn.addEventListener('click', () => go(-1));
    nextBtn.addEventListener('click', () => go(1));
    stage.addEventListener('click', e => {
      if (swiped) { swiped = false; return; }
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      if (mode === 'spread') { if (state === 0) go(1); else if (state === maxState()) go(-1); else go(x < 0.5 ? -1 : 1); }
      else go(x < 0.3 ? -1 : 1);
    });
    fb.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      if (e.key === 'Home') { e.preventDefault(); state = 0; paint(false); }
      if (e.key === 'End') { e.preventDefault(); state = maxState(); paint(false); }
    });
    let sx = null, sy = null, swiped = false;
    stage.addEventListener('touchstart', e => { const p = e.touches[0]; sx = p.clientX; sy = p.clientY; }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (sx == null) return;
      const p = e.changedTouches[0], dx = p.clientX - sx, dy = p.clientY - sy; sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped = true; go(dx < 0 ? 1 : -1); setTimeout(() => { swiped = false; }, 400); }
    }, { passive: true });

    const pick = () => (fb.clientWidth >= 620 ? 'spread' : 'single');
    build(pick());
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => { const m = pick(); if (m !== mode) build(m); }).observe(fb);
    } else {
      window.addEventListener('resize', () => { const m = pick(); if (m !== mode) build(m); });
    }
    return { go };
  }

  window.HikayaFlipbook = { mount, MAX_PAGES };
})();
