/* Hikaya by Maison Jaber — shared site search.
   Include with: <script src="/search.js" defer></script>
   Bind to any trigger element with class="search-trigger".

   Lightweight client-side search — no backend needed. Searches story
   titles/themes and key site pages, shows results in a small overlay.
*/

window.HIKAYA_SEARCH_INDEX = [
  { title: 'The Bravest Little One', type: 'Story · Courage', url: 'story-bravest-little-one.html', keywords: 'brave courage fear first day scared new nervous' },
  { title: 'The Cloud Ship', type: 'Story · Adventure', url: 'story-cloud-ship.html', keywords: 'adventure dream sky stars sail ship cloud' },
  { title: "The Star Who Couldn't Sleep", type: 'Story · Bedtime', url: 'story-star-who-couldnt-sleep.html', keywords: 'bedtime sleep night star wind down calm' },
  { title: 'All Stories', type: 'Page', url: 'stories.html', keywords: 'browse library collection shop' },
  { title: 'How It Works', type: 'Page', url: 'index.html#how-it-works', keywords: 'personalize process steps' },
  { title: 'About Us', type: 'Page', url: 'about.html', keywords: 'about company story team' },
  { title: 'Help & FAQ', type: 'Page', url: 'help.html', keywords: 'help faq questions support delivery shipping' },
  { title: 'Your Cart', type: 'Page', url: 'cart.html', keywords: 'cart basket order review' },
  { title: 'Privacy Policy', type: 'Page', url: 'privacy.html', keywords: 'privacy data policy' },
  { title: 'Terms of Service', type: 'Page', url: 'terms.html', keywords: 'terms conditions legal' },
  { title: 'Refund Policy', type: 'Page', url: 'refund-policy.html', keywords: 'refund return cancel' },
];

(function () {
  let overlay, input, resultsEl;

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'hikaya-search-overlay';
    overlay.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(46,32,24,0.55); z-index:1000; padding:14vh 20px 20px;';
    overlay.innerHTML = `
      <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="display:flex; align-items:center; gap:10px; padding:16px 18px; border-bottom:1px solid #ece1d1;">
          <svg viewBox="0 0 24 24" stroke-width="1.8" fill="none" style="width:18px; height:18px; stroke:#7d6a5a; flex-shrink:0;"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input id="hikaya-search-input" type="text" placeholder="Search stories, help, pages..." style="flex:1; border:none; outline:none; font-size:15px; font-family:'Inter',sans-serif; color:#2E2018;" />
          <button id="hikaya-search-close" type="button" style="background:none; border:none; cursor:pointer; font-size:13px; font-weight:700; color:#7d6a5a;">Esc</button>
        </div>
        <div id="hikaya-search-results" style="max-height:50vh; overflow-y:auto; padding:8px;"></div>
      </div>`;
    document.body.appendChild(overlay);
    input = overlay.querySelector('#hikaya-search-input');
    resultsEl = overlay.querySelector('#hikaya-search-results');

    input.addEventListener('input', () => renderResults(input.value));
    overlay.querySelector('#hikaya-search-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.style.display !== 'none') close();
    });
  }

  function renderResults(query) {
    const q = query.trim().toLowerCase();
    const items = !q ? window.HIKAYA_SEARCH_INDEX : window.HIKAYA_SEARCH_INDEX.filter(item =>
      item.title.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q) || item.type.toLowerCase().includes(q)
    );
    if (items.length === 0) {
      resultsEl.innerHTML = `<div style="padding:24px; text-align:center; color:#7d6a5a; font-size:13.5px; font-weight:600;">No results for "${query}"</div>`;
      return;
    }
    resultsEl.innerHTML = items.map(item => `
      <a href="${item.url}" style="display:block; padding:12px 14px; border-radius:10px; text-decoration:none; color:inherit;" class="hikaya-search-result">
        <div style="font-weight:700; font-size:14px; color:#2E2018;">${item.title}</div>
        <div style="font-size:12px; color:#A67443; font-weight:600; margin-top:2px;">${item.type}</div>
      </a>
    `).join('');
    resultsEl.querySelectorAll('.hikaya-search-result').forEach(el => {
      el.addEventListener('mouseenter', () => el.style.background = '#F3E8D8');
      el.addEventListener('mouseleave', () => el.style.background = 'transparent');
    });
  }

  function open() {
    if (!overlay) buildOverlay();
    overlay.style.display = 'block';
    input.value = '';
    renderResults('');
    setTimeout(() => input.focus(), 30);
  }
  function close() {
    if (overlay) overlay.style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.search-trigger').forEach(el => {
      el.addEventListener('click', (e) => { e.preventDefault(); open(); });
    });
  });
})();
