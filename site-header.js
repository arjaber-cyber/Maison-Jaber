/* Hikaya by Maison Jaber — shared site header.
   Include with: <script src="/site-header.js" defer></script>
   And add a placeholder in the body where the header should appear:
   <div id="site-header-root"></div>

   This is the ONE place the site's navigation is defined. Every browsing
   page (home, stories, story details, about, help) uses this exact same
   header -- fixing the "every page has different navigation" inconsistency
   flagged in the QA report. Pages with their own purpose-built minimal
   header (checkout, personalize, cart, account, admin, login) don't
   include this and are unaffected.

   "How It Works" and "Gifts" are homepage sections -- on any other page
   they correctly link to index.html#how-it-works / index.html#gifts
   instead of a same-page anchor that wouldn't exist there.
*/

(function () {
  const isHome = /(^|\/)index\.html$/.test(window.location.pathname) || /\/test5\/?$/.test(window.location.pathname);
  const howItWorksHref = isHome ? '#how-it-works' : 'index.html#how-it-works';
  const giftsHref = isHome ? '#gifts' : 'index.html#gifts';

  const CSS = `
    header.site { position: sticky; top: 0; z-index: 20; padding: 18px 0; background: var(--ivory, #F8F2E8); border-bottom: 1px solid var(--beige, #DFC9AE); }
    header.site .inner { max-width: 1180px; margin: 0 auto; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
    header.site .wordmark img { height: 100px; width: auto; }
    header.site nav.main { display: flex; align-items: center; gap: 34px; }
    header.site nav.main a { font-size: 13.5px; font-weight: 600; color: var(--brown, #563622); text-decoration: none; }
    header.site nav.main a:hover { color: var(--caramel, #A67443); }
    header.site .header-actions { display: flex; align-items: center; gap: 18px; }
    header.site .header-actions .icon-btn svg { width: 19px; height: 19px; stroke: var(--brown, #563622); fill: none; }
    header.site .icon-btn { position: relative; display: inline-flex; }
    header.site .cart-badge {
      display: none; position: absolute; top: -7px; right: -8px; background: var(--coral, #A67443); color: #fff;
      font-size: 10px; font-weight: 800; min-width: 16px; height: 16px; border-radius: 50%;
      align-items: center; justify-content: center; padding: 0 3px; font-family: 'Inter', sans-serif;
    }
    header.site .lang-pill { font-size: 12.5px; font-weight: 700; padding: 9px 12px; border-radius: 100px; border: 1px solid var(--beige, #DFC9AE); background: transparent; color: var(--brown, #563622); cursor: pointer; text-decoration: none; }
    header.site .lang-pill:hover { background: var(--cream, #F3E8D8); }
    header.site .zone-pill { font-size: 12.5px; font-weight: 700; padding: 9px 12px; border-radius: 100px; border: 1px solid var(--beige, #DFC9AE); background: transparent; color: var(--coral-deep, #563622); cursor: pointer; text-decoration: none; }
    header.site .zone-pill:hover { background: var(--cream, #F3E8D8); }
    header.site .hamburger, header.site .mobile-cta-icon { display: none; background: none; border: none; cursor: pointer; padding: 6px; }
    header.site .hamburger svg, header.site .mobile-cta-icon svg { width: 22px; height: 22px; stroke: var(--brown, #563622); fill: none; }
    header.site .mobile-nav-panel { display: none; flex-direction: column; gap: 4px; background: var(--ivory, #F8F2E8); padding: 6px 28px 24px; }
    header.site .mobile-nav-panel.open { display: flex; }
    header.site .mobile-nav-panel a.nav-link { font-size: 15.5px; font-weight: 600; color: var(--brown, #563622); padding: 10px 0; border-bottom: 1px solid var(--beige, #DFC9AE); text-decoration: none; }
    header.site .mobile-nav-panel .btn-primary { margin-top: 16px; justify-content: center; }
    @media (max-width: 900px) {
      header.site .inner { display: grid; grid-template-columns: 40px 1fr 40px; align-items: center; }
      header.site .wordmark { grid-column: 2; justify-self: center; }
      header.site .wordmark img { height: 62px; }
      header.site nav.main, header.site .header-actions { display: none; }
      header.site .hamburger { grid-column: 1; display: flex; justify-self: start; }
      header.site .mobile-cta-icon { grid-column: 3; display: flex; justify-self: end; }
    }
  `;

  const HTML = `
    <header class="site">
      <div class="inner">
        <button class="hamburger" id="hamburger-btn" aria-label="Menu">
          <svg viewBox="0 0 24 24" stroke-width="1.6"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
        <a href="index.html" class="wordmark"><img src="images/logo-hikaya.png" alt="Hikaya by Maison Jaber"></a>
        <nav class="main">
          <a href="stories.html" data-i18n="common.nav_stories">Our Stories</a>
          <a href="${howItWorksHref}" data-i18n="home5.nav_how">How It Works</a>
          <a href="about.html" data-i18n="common.nav_about">About</a>
          <a href="${giftsHref}" data-i18n="home5.nav_gifts">Gifts</a>
        </nav>
        <div class="header-actions">
          <a class="icon-btn search-trigger" href="stories.html" aria-label="Search"><svg viewBox="0 0 24 24" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></a>
          <a class="icon-btn" href="cart.html" aria-label="Cart">
            <svg viewBox="0 0 24 24" stroke-width="1.6"><path d="M3 4h2l2.2 11a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 2-1.6L21 8H6.5"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>
            <span class="cart-badge">0</span>
          </a>
          <a class="icon-btn" href="login.html" aria-label="Account"><svg viewBox="0 0 24 24" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5"/></svg></a>
          <a class="lang-pill" href="#" data-i18n-skip style="margin-right:6px;">EN</a>
          <a class="zone-pill" href="#" style="margin-right:6px;">Europe</a>
          <a class="btn-primary" href="personalize.html" style="padding:12px 22px; font-size:13px;" data-i18n="common.btn_create_story">Create Their Story</a>
        </div>
        <a class="mobile-cta-icon" href="personalize.html" aria-label="Create Their Story">
          <svg viewBox="0 0 24 24" stroke-width="1.6"><path d="M12 5v14M5 12h14"/></svg>
        </a>
      </div>
      <div class="mobile-nav-panel" id="mobile-nav-panel">
        <a class="nav-link" href="stories.html" data-i18n="common.nav_stories">Our Stories</a>
        <a class="nav-link" href="cart.html" data-i18n-skip>Cart <span class="cart-badge" style="position:static; margin-left:4px;">0</span></a>
        <a class="nav-link" href="${howItWorksHref}" data-i18n="home5.nav_how">How It Works</a>
        <a class="nav-link" href="about.html" data-i18n="common.nav_about">About</a>
        <a class="nav-link" href="${giftsHref}" data-i18n="home5.nav_gifts">Gifts</a>
        <a class="lang-pill" href="#" data-i18n-skip style="align-self:center; margin-bottom:8px;">EN</a>
        <a class="zone-pill" href="#" style="align-self:center; margin-bottom:8px;">Europe</a>
        <a class="btn-primary" href="personalize.html" data-i18n="home5.create_story_arrow">Create Their Story &rarr;</a>
      </div>
    </header>
  `;

  function inject() {
    const root = document.getElementById('site-header-root');
    if (!root) return;

    const styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    root.outerHTML = HTML;

    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobilePanel = document.getElementById('mobile-nav-panel');
    if (hamburgerBtn && mobilePanel) {
      hamburgerBtn.addEventListener('click', () => mobilePanel.classList.toggle('open'));
    }

    // Let the rest of the page's own scripts (i18n, region, cart, search)
    // pick up the newly-injected elements exactly as if they were static.
    document.dispatchEvent(new CustomEvent('hikaya:headerready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
