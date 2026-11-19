/* "Hikaya moments" (Nov 2026): the latest Instagram videos on the homepage.
   Loads the list from /.netlify/functions/instagram-reels only when the section is about to scroll
   into view (nothing loads for visitors who never get there). Tiles show the cover picture; a tap opens
   a full-screen player with sound, swipe / arrows for the next video, and a link to the post.
   The section stays hidden if Instagram is not set up or returns nothing. */
(function () {
  'use strict';
  const sec = document.getElementById('hk-reels'); if (!sec) return;
  const row = sec.querySelector('.rl-row');
  const T = (k, f) => (window.Hikaya && window.Hikaya.t ? window.Hikaya.t(k, f) : f);
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let items = [], modal, idx = 0, loaded = false;
  const SRC = window.HK_REELS_SRC || '/.netlify/functions/instagram-reels';

  function render() {
    row.innerHTML = items.map((m, i) => `
      <li><button type="button" class="rl-tile" data-i="${i}" aria-label="${esc(T('reels.play', 'Play video'))}${m.caption ? ': ' + esc(m.caption) : ''}">
        <img src="${esc(m.thumb)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
        <span class="rl-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg></span>
        ${m.caption ? `<span class="rl-cap">${esc(m.caption)}</span>` : ''}
      </button></li>`).join('');
    sec.hidden = false;
    try { window.hikayaTrackEvent && window.hikayaTrackEvent('reels_view', { count: items.length }); } catch (e) {}
  }
  async function load() {
    if (loaded) return; loaded = true;
    try {
      const r = await fetch(SRC, { headers: { Accept: 'application/json' } });
      const d = r.ok ? await r.json() : null;
      items = (d && Array.isArray(d.items)) ? d.items.filter(m => m && m.thumb && (m.video || /^https:\/\/www\.instagram\.com\//.test(m.permalink || ''))).slice(0, 8) : [];
      if (items.length >= 2) render();
    } catch (e) {}
  }

  /* ---------- Player ---------- */
  function build() {
    modal = document.createElement('div');
    modal.className = 'rl-modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', T('reels.title', 'Hikaya moments'));
    modal.innerHTML = `
      <div class="rl-bd" data-x></div>
      <div class="rl-stage">
        <button type="button" class="rl-btn rl-close" data-x aria-label="${esc(T('reels.close', 'Close'))}">×</button>
        <button type="button" class="rl-btn rl-prev" aria-label="${esc(T('reels.prev', 'Previous video'))}"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
        <div class="rl-frame"><video playsinline controls preload="metadata"></video><iframe class="rl-embed" title="Instagram" allow="autoplay; encrypted-media" hidden></iframe>
          <div class="rl-bar"><span class="rl-count"></span><span class="rl-mcap"></span>
          <a class="rl-ig" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></svg>${esc(T('reels.view', 'View on Instagram'))}</a></div>
        </div>
        <button type="button" class="rl-btn rl-next" aria-label="${esc(T('reels.next', 'Next video'))}"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => {
      if (e.target.closest('[data-x]')) close();
      else if (e.target.closest('.rl-prev')) go(-1);
      else if (e.target.closest('.rl-next')) go(1);
    });
    let sx = null;
    modal.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    modal.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) go((dx < 0) === (document.documentElement.dir !== 'rtl') ? 1 : -1); });
    modal.querySelector('video').addEventListener('ended', () => { if (idx < items.length - 1) go(1); });
  }
  function show(i) {
    idx = (i + items.length) % items.length;
    const m = items[idx], v = modal.querySelector('video'), f = modal.querySelector('.rl-embed');
    if (m.video) { // our own player
      f.hidden = true; f.removeAttribute('src'); v.hidden = false; modal.classList.remove('is-embed');
      v.poster = m.thumb; v.src = m.video; v.currentTime = 0;
      const p = v.play(); if (p && p.catch) p.catch(() => {});
    } else { // reels with Instagram library music: Instagram's own player (loads only now, on tap)
      v.pause(); v.removeAttribute('src'); v.hidden = true; modal.classList.add('is-embed');
      f.src = m.permalink.replace(/\/?(\?.*)?$/, '/') + 'embed/'; f.hidden = false;
    }
    modal.querySelector('.rl-count').textContent = `${idx + 1} / ${items.length}`;
    modal.querySelector('.rl-mcap').textContent = m.caption || '';
    const ig = modal.querySelector('.rl-ig'); ig.href = m.permalink || 'https://www.instagram.com/hikaya.mj/';
  }
  function go(d) { show(idx + d); }
  let lastFocus;
  function open(i) {
    if (!modal) build();
    lastFocus = document.activeElement;
    modal.classList.add('open'); document.documentElement.classList.add('rl-lock');
    show(i);
    modal.querySelector('.rl-close').focus({ preventScroll: true });
    document.addEventListener('keydown', onKey);
    try { window.hikayaTrackEvent && window.hikayaTrackEvent('reels_play', { position: i + 1 }); } catch (e) {}
  }
  function close() {
    const v = modal.querySelector('video'); v.pause(); v.removeAttribute('src'); v.load();
    const f = modal.querySelector('.rl-embed'); f.removeAttribute('src');
    modal.classList.remove('open'); document.documentElement.classList.remove('rl-lock');
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(document.documentElement.dir === 'rtl' ? -1 : 1);
    else if (e.key === 'ArrowLeft') go(document.documentElement.dir === 'rtl' ? 1 : -1);
  }
  row.addEventListener('click', e => { const b = e.target.closest('.rl-tile'); if (b) open(+b.dataset.i); });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '800px 0px' });
    io.observe(document.getElementById('hk-reels-anchor') || sec.parentNode);
  } else load();
})();
