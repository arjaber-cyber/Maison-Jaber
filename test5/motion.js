/* Hikaya — gentle page motion (Oct 2026).
   Loaded by chrome.js on every customer page. Self-contained: delete this
   file (or the one line in chrome.js) to switch all motion off.

   What it does, kept deliberately small:
   - Scroll reveal: blocks fade + rise + settle in as they enter the screen,
     with a short stagger between siblings. They softly "pop" back out when
     they leave the bottom of the screen, so scrolling back down replays it.
   - Hover lift on cards/tiles, and a soft press on buttons.
   - A slow float on the hero copy's handwritten line and the cart gift icon.
   - Respects "reduce motion" in the visitor's OS settings (no motion at all).
*/
(function () {
  if (window.__hkMotion) return; window.__hkMotion = true;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var css = `
  /* hover + press (always on unless reduced motion) */
  .story-card:hover, .tile:hover, .world-grid a:hover, .step:hover, .sib-list a:hover, .cart-item:hover { transform: translateY(-4px); box-shadow: 0 2px 4px rgba(38,28,23,.06), 0 18px 34px -16px rgba(38,28,23,.28); }
  .sib-list a, .cart-item, .tile { transition: transform .28s var(--ease, ease), box-shadow .28s var(--ease, ease), border-color .2s; }
  .btn, .pill, .hk-btn { transition: transform .18s var(--ease, ease), background .2s, color .2s, border-color .2s, box-shadow .2s; }
  .btn:hover, .hk-btn:hover { transform: translateY(-1px); }
  .btn:active, .pill:active, .hk-btn:active, .arrow-btn:active { transform: scale(.97); }

  /* scroll reveal */
  html.hk-motion .hk-rv { opacity: 0; transform: translateY(22px) scale(.985); transition: opacity .7s var(--ease, ease), transform .8s cubic-bezier(.2,.8,.2,1.05); transition-delay: var(--hk-d, 0ms); will-change: opacity, transform; }
  html.hk-motion .hk-rv.hk-in { opacity: 1; transform: none; }

  /* slow float */
  @keyframes hk-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
  .hero .hand, .hk-float { display: inline-block; animation: hk-float 5.5s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    html.hk-motion .hk-rv { opacity: 1 !important; transform: none !important; }
    .hero .hand, .hk-float { animation: none; }
    .story-card:hover, .tile:hover, .world-grid a:hover, .step:hover, .sib-list a:hover, .cart-item:hover, .btn:hover { transform: none; }
  }`;
  var st = document.createElement('style'); st.id = 'hk-motion-css'; st.textContent = css; document.head.appendChild(st);
  if (reduce || !('IntersectionObserver' in window)) return;

  /* What reveals. Forms, inputs and the sticky header are never touched. */
  var SEL = [
    'main h1', 'main h2', '.lede', '.hero-ctas', '.hero-assure',
    '.step', '.story-card', '.tile', '.world-grid a', '.sib-list li', '.scard',
    '.why li', '.trust-quiet li', '.final .wrap > *', '.page-hero > *',
    '.faq-a', 'details', '.cart-item', '.summary-box', '.hk-progress', '.hk-trust > *', '.hk-add-more',
    '.magic-copy > *', '.magic-box', '.occ-list li',
  ].join(',');
  var SKIP = 'header, footer, form, .sticky-cta, .zone-menu, .summary-bar, [data-no-motion]';

  document.documentElement.classList.add('hk-motion');

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var el = e.target;
      if (e.isIntersecting) { el.classList.add('hk-in'); }
      /* Pop back out only when it leaves past the bottom edge, so content above you never vanishes. */
      else if (e.boundingClientRect.top > (window.innerHeight || 0)) { el.classList.remove('hk-in'); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  function arm(root) {
    var els = (root || document).querySelectorAll(SEL);
    var groups = new Map();
    els.forEach(function (el) {
      if (el.dataset.hkRv || el.closest(SKIP)) return;
      el.dataset.hkRv = '1';
      el.classList.add('hk-rv');
      var p = el.parentElement, i = groups.get(p) || 0; groups.set(p, i + 1);
      el.style.setProperty('--hk-d', Math.min(i, 6) * 70 + 'ms');
      io.observe(el);
    });
  }

  function start() {
    arm();
    /* Stories, cart items etc. are drawn by JS after load — pick them up too. */
    var pending = false;
    new MutationObserver(function () {
      if (pending) return; pending = true;
      requestAnimationFrame(function () { pending = false; arm(); });
    }).observe(document.body, { childList: true, subtree: true });
    /* Safety net: if anything is still hidden after 4s above the fold, show it. */
    setTimeout(function () {
      document.querySelectorAll('.hk-rv:not(.hk-in)').forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('hk-in');
      });
    }, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
