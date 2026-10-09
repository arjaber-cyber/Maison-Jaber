/* Hikaya — homepage extras + WhatsApp help (Oct 2026). Loaded by chrome.js.
   1. "Photo -> story" reveal: [data-magic] on the homepage. Desktop: the line
      follows the cursor. Phone: drag it; it also sweeps once on its own when
      it scrolls into view. Images are admin-replaceable site photos:
      hom-magic-photo.webp and hom-magic-art.webp (Admin > Site photos).
   2. Occasion tiles: [data-occasions] lists, linking to stories.html?occasion=…
   3. Floating WhatsApp "Need help?" button on every customer page.
*/
(function () {
  if (window.__hkExtras) return; window.__hkExtras = true;

  /* >>> Put the business WhatsApp number here, digits only with country code
     (e.g. '971501234567'). While it's empty the button stays hidden. <<< */
  const WHATSAPP_NUMBER = '';

  const H = () => window.Hikaya || {};
  const t = (k, f) => (H().t ? H().t(k, f) : f);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Photo -> story reveal ---------- */
  function initMagic(box) {
    if (box.dataset.bound) return; box.dataset.bound = '1';
    const handle = box.querySelector('.magic-handle');
    let dragging = false, touched = false;
    const set = pct => {
      pct = Math.max(0, Math.min(100, pct));
      box.style.setProperty('--pos', pct + '%');
      if (handle) handle.setAttribute('aria-valuenow', Math.round(pct));
    };
    const pctFromEvent = e => {
      const r = box.getBoundingClientRect();
      let p = ((e.clientX - r.left) / r.width) * 100;
      return getComputedStyle(box).direction === 'rtl' ? 100 - p : p;
    };
    set(50);
    box.addEventListener('pointermove', e => {
      if (e.pointerType === 'mouse' || dragging) { touched = true; set(pctFromEvent(e)); }
    });
    box.addEventListener('pointerdown', e => { dragging = true; touched = true; box.setPointerCapture(e.pointerId); set(pctFromEvent(e)); });
    ['pointerup', 'pointercancel'].forEach(ev => box.addEventListener(ev, () => { dragging = false; }));
    box.addEventListener('mouseleave', () => { if (!dragging) { box.classList.add('easing'); set(50); setTimeout(() => box.classList.remove('easing'), 600); } });
    if (handle) handle.addEventListener('keydown', e => {
      const cur = parseFloat(box.style.getPropertyValue('--pos')) || 50;
      const rtl = getComputedStyle(box).direction === 'rtl';
      if (e.key === 'ArrowLeft') { e.preventDefault(); set(cur + (rtl ? 5 : -5)); }
      if (e.key === 'ArrowRight') { e.preventDefault(); set(cur + (rtl ? -5 : 5)); }
    });
    /* One gentle sweep when it first comes into view, so phone users see what it does. */
    if (!reduce && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return; io.disconnect();
        if (touched) return;
        box.classList.add('easing');
        const seq = [[0, 82], [900, 18], [1800, 50]];
        seq.forEach(([ms, p]) => setTimeout(() => { if (!touched) set(p); }, 400 + ms));
        setTimeout(() => box.classList.remove('easing'), 400 + 2600);
      }, { threshold: 0.5 });
      io.observe(box);
    }
  }

  /* ---------- 2. Occasion tiles ---------- */
  const OCC_ICONS = {
    birthday: '<path d="M5 21h14v-7H5zM5 17c2 0 2-1.5 3.5-1.5S10 17 12 17s2-1.5 3.5-1.5S17 17 19 17M12 14V10M12 7.5c-.9 0-1.5-.7-1.5-1.5 0-1.2 1.5-3 1.5-3s1.5 1.8 1.5 3c0 .8-.6 1.5-1.5 1.5zM7 14v-2.5h10V14"/>',
    eid: '<path d="M12 2.5v2M9.5 4.5h5l1 2.5h-7zM8 7h8l1.5 3v8L16 20.5H8L6.5 18v-8zM6.5 10h11M6.5 18h11"/><path d="M12 12c-1 1.2-1.5 2-1.5 2.8a1.5 1.5 0 0 0 3 0c0-.8-.5-1.6-1.5-2.8z"/>',
    christmas: '<path d="M12 2.5l.8 1.7 1.8.2-1.3 1.2.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.2 1.8-.2zM12 7.5l-4 5h2.2L7 17h10l-3.2-4.5H16zM12 17v3.5M9.5 20.5h5"/>',
    sibling: '<circle cx="8.5" cy="7" r="3"/><circle cx="16.5" cy="10" r="2.2"/><path d="M3 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6M12.8 20c.3-2.6 1.8-4.6 3.7-4.6 2.1 0 3.5 2 3.5 4.6"/>',
    school: '<path d="M4 6.5C6.5 5 9.5 5 12 6.5 14.5 5 17.5 5 20 6.5V19c-2.5-1.5-5.5-1.5-8 0-2.5-1.5-5.5-1.5-8 0zM12 6.5V19"/>',
    bedtime: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/><path d="M16 3.5l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z"/>',
    grandparents: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M9.5 10.5h5M12 8v5"/>',
  };
  function renderOccasions() {
    const occ = H().OCCASIONS; if (!occ) return;
    document.querySelectorAll('[data-occasions]').forEach(list => {
      list.innerHTML = Object.keys(occ).map(k => `<li><a class="occ-tile" href="stories.html?occasion=${k}">
        <span class="occ-ic" aria-hidden="true"><svg viewBox="0 0 24 24">${OCC_ICONS[k] || ''}</svg></span>
        <span class="occ-name">${esc(H().occasionLabel(k))}</span></a></li>`).join('');
    });
  }

  /* ---------- 3. WhatsApp help ---------- */
  function whatsapp() {
    if (!WHATSAPP_NUMBER || document.getElementById('hk-wa')) return;
    if (document.body.dataset.flow === 'checkout') return; /* keep payment screens calm */
    const a = document.createElement('a');
    a.id = 'hk-wa'; a.className = 'hk-wa'; a.target = '_blank'; a.rel = 'noopener';
    const update = () => {
      const msg = t('ex.wa_msg', 'Hi Hikaya! I have a question about a personalised book.');
      a.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
      a.setAttribute('aria-label', t('ex.wa_label', 'Need help? Chat with us on WhatsApp'));
      a.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z"/><path d="M8.8 8.2c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .6.5l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.3 0 .5.3.6 1.4 2 2.9 2.6.2.1.4 0 .5-.1l.6-.8c.2-.2.4-.2.6-.1l1.6.8c.2.1.4.2.4.4 0 .5-.2 1.4-1.2 1.9-.9.4-2.2.4-4.4-.9-2.6-1.6-3.6-3.9-3.8-4.6-.2-.8 0-1.6.2-1.9z" fill="currentColor" stroke="none"/></svg><span>${esc(t('ex.wa_cta', 'Need help?'))}</span>`;
    };
    update();
    document.addEventListener('hikaya:langchange', update);
    document.body.appendChild(a);
  }

  function start() {
    document.querySelectorAll('[data-magic]').forEach(initMagic);
    renderOccasions();
    whatsapp();
    document.addEventListener('hikaya:langchange', renderOccasions);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
