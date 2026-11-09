/* Hikaya by Maison Jaber — cookie consent.
   Include with: <script src="/consent.js" defer></script>
   Load this BEFORE analytics.js on every page, so analytics.js can check
   consent before firing GA/Meta Pixel.

   Categories:
   - essential: always on, not a real choice (site can't function without it
     -- things like remembering your language/region/cart)
   - analytics: Google Analytics + Microsoft Clarity (heatmaps, recordings)
   - marketing: Google Ads cookies (Consent Mode ad_storage / ad_user_data / ad_personalization) + Meta Pixel

   Nothing analytics/marketing-related fires until the visitor actually
   chooses. Reopening later (e.g. a "Cookie Settings" footer link) is
   supported via window.hikayaOpenConsentSettings().
*/

(function () {
  const STORAGE_KEY = 'hikaya_consent_v1';

  function getConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function saveConsent(consent) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(consent)); } catch {}
    document.dispatchEvent(new CustomEvent('hikaya:consentchange', { detail: consent }));
  }

  function hasConsent(category) {
    if (category === 'essential') return true;
    const consent = getConsent();
    return !!(consent && consent[category]);
  }

  function buildBanner() {
    // Compact floating card (not a full-width bar): small on phones, a corner
    // card on desktop, and above any third-party badge so the buttons are
    // always clickable.
    if (!document.getElementById('hikaya-consent-style')) {
      const st = document.createElement('style');
      st.id = 'hikaya-consent-style';
      st.textContent = `
        #hikaya-consent-banner { position: fixed; z-index: 2147483647; left: 16px; bottom: 16px; max-width: 380px; box-sizing: border-box;
          background: #2E2018; color: #e8ddd0; padding: 14px 16px; border-radius: 14px; font-family: "Inter", sans-serif;
          box-shadow: 0 10px 30px rgba(0,0,0,0.25); }
        #hikaya-consent-banner p { margin: 0 0 10px; font-size: 12.5px; line-height: 1.45; }
        #hikaya-consent-banner a { color: #e8ddd0; text-decoration: underline; }
        #hikaya-consent-banner .hc-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        #hikaya-consent-banner button { padding: 7px 14px; border-radius: 999px; font: 700 12px "Inter", sans-serif; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.3); background: none; color: #e8ddd0; }
        #hikaya-consent-banner button.hc-primary { border: none; background: #A67443; color: #fff; }
        #hikaya-consent-banner button.hc-link { border: none; padding: 7px 4px; text-decoration: underline; font-weight: 600; }
        #hikaya-consent-banner label { display: flex; align-items: center; gap: 8px; font-size: 12.5px; margin-bottom: 7px; }
        #hikaya-consent-banner .hc-short { display: none; }
        #hikaya-consent-banner[dir="rtl"] { font-family: "Cairo", "Inter", sans-serif; }
        #hikaya-consent-banner .hc-m { display: none; }
        .hk-consent-spacer { display: none; }
        @media (max-width: 560px) {
          /* Phones (Nov 2026): ONE thin row (~50px) — short text + 3 small buttons side by side —
             so it never hides the hero buttons. It also only appears after the first scroll (see below). */
          #hikaya-consent-banner { left: 6px; right: 6px; bottom: calc(6px + env(safe-area-inset-bottom, 0px)); max-width: none; padding: 7px 8px 7px 12px; border-radius: 12px; }
          #hikaya-consent-banner[dir="rtl"] { padding: 7px 12px 7px 8px; }
          #hikaya-consent-simple { display: flex; align-items: center; gap: 8px; }
          #hikaya-consent-simple p { flex: 1 1 auto; min-width: 0; margin: 0; font-size: 12px; line-height: 1.3; }
          #hikaya-consent-banner .hc-long, #hikaya-consent-banner .hc-d { display: none; }
          #hikaya-consent-banner .hc-m { display: inline; }
          #hikaya-consent-banner .hc-row { flex: 0 0 auto; flex-wrap: nowrap; gap: 5px; }
          #hikaya-consent-banner button { min-height: 34px; padding: 5px 11px; font-size: 12px; }
          #hikaya-consent-banner button.hc-link { padding: 5px 2px; }
          #hikaya-consent-detail label { font-size: 12px; }
          .hk-consent-spacer { display: block; height: var(--hk-consent-h, 60px); }
        }`;
      document.head.appendChild(st);
    }
    const banner = document.createElement('div');
    banner.id = 'hikaya-consent-banner';
    banner.setAttribute('role', 'dialog');
    /* English or Arabic, following the site language (no full stops in Arabic copy). */
    const ar = document.documentElement.lang === 'ar';
    const L = ar ? {
      aria: 'تفضيلات ملفات تعريف الارتباط',
      long: 'نستخدم ملفات تعريف الارتباط الأساسية (السلة واللغة وكيف وصلت إلينا)، وبموافقتك فقط ملفات التحليلات (Google Analytics و Microsoft Clarity) والتسويق (Google Ads و Meta) لتحسين الموقع وإعلاناتنا',
      short: 'ملفات التحليلات والتسويق بموافقتك فقط',
      policy: 'سياسة الخصوصية', accept: 'قبول الكل', reject: 'رفض', customize: 'تخصيص',
      mText: 'ملفات تعريف الارتباط؟', mAccept: 'قبول', mReject: 'رفض', mCustomize: 'خيارات',
      choose: 'اختر ما يناسبك', essential: 'أساسية (مفعّلة دائمًا: السلة، اللغة، المنطقة، كيف وصلت إلينا)',
      analytics: 'التحليلات (Google Analytics و Microsoft Clarity)', marketing: 'التسويق (Google Ads و Meta: لقياس إعلاناتنا)', save: 'حفظ التفضيلات',
    } : {
      aria: 'Cookie preferences',
      long: 'We use essential cookies (cart, language, how you found us) and, only with your OK, analytics (Google Analytics, Microsoft Clarity) and marketing (Google Ads, Meta) cookies to improve the site and our ads.',
      short: 'Analytics and marketing cookies, only with your OK.',
      policy: 'Privacy Policy', accept: 'Accept All', reject: 'Reject', customize: 'Customize',
      mText: 'Cookies OK?', mAccept: 'Accept', mReject: 'Reject', mCustomize: 'Options',
      choose: "Choose what you're comfortable with:", essential: 'Essential (always on: cart, language, region, how you found us)',
      analytics: 'Analytics (Google Analytics, Microsoft Clarity)', marketing: 'Marketing (Google Ads and Meta, to measure our ads)', save: 'Save Preferences',
    };
    banner.setAttribute('aria-label', L.aria);
    if (ar) banner.setAttribute('dir', 'rtl');
    banner.innerHTML = `
        <div id="hikaya-consent-simple">
          <p><span class="hc-long">${L.long} <a href="privacy.html">${L.policy}</a></span><a class="hc-m" href="privacy.html">${L.mText}</a></p>
          <div class="hc-row">
            <button type="button" id="hikaya-consent-accept" class="hc-primary"><span class="hc-d">${L.accept}</span><span class="hc-m">${L.mAccept}</span></button>
            <button type="button" id="hikaya-consent-reject"><span class="hc-d">${L.reject}</span><span class="hc-m">${L.mReject}</span></button>
            <button type="button" id="hikaya-consent-customize" class="hc-link"><span class="hc-d">${L.customize}</span><span class="hc-m">${L.mCustomize}</span></button>
          </div>
        </div>
        <div id="hikaya-consent-detail" style="display:none;">
          <p style="font-weight:700;">${L.choose} <a href="privacy.html" style="font-weight:400;">${L.policy}</a></p>
          <label style="opacity:0.7;"><input type="checkbox" checked disabled /> ${L.essential}</label>
          <label><input type="checkbox" id="hikaya-consent-analytics" /> ${L.analytics}</label>
          <label style="margin-bottom:12px;"><input type="checkbox" id="hikaya-consent-marketing" /> ${L.marketing}</label>
          <button type="button" id="hikaya-consent-save" class="hc-primary">${L.save}</button>
        </div>`;
    document.body.appendChild(banner);
    /* Spacer at the very end of the page (phones only, via CSS) so the banner never sits on top of the footer. */
    const spacer = document.createElement('div');
    spacer.className = 'hk-consent-spacer'; spacer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(spacer);
    new MutationObserver((_, mo) => { if (!document.body.contains(banner)) { spacer.remove(); mo.disconnect(); } }).observe(document.body, { childList: true });
    /* Mobile UX (Nov 2026): while the banner is open, the WhatsApp button and the phone sticky
       "Create Their Story" bar move up above it, so the banner never hides a key button. */
    const root = document.documentElement;
    const syncH = () => { if (document.body.contains(banner)) root.style.setProperty('--hk-consent-h', Math.ceil(banner.getBoundingClientRect().height + 16) + 'px'); };
    root.classList.add('hk-consent-open'); syncH();
    if ('ResizeObserver' in window) new ResizeObserver(syncH).observe(banner);
    new MutationObserver((_, mo) => { if (!document.body.contains(banner)) { root.classList.remove('hk-consent-open'); root.style.removeProperty('--hk-consent-h'); mo.disconnect(); } }).observe(document.body, { childList: true });

    document.getElementById('hikaya-consent-accept').addEventListener('click', () => {
      saveConsent({ essential: true, analytics: true, marketing: true, ts: Date.now() });
      banner.remove();
    });
    document.getElementById('hikaya-consent-reject').addEventListener('click', () => {
      saveConsent({ essential: true, analytics: false, marketing: false, ts: Date.now() });
      banner.remove();
    });
    document.getElementById('hikaya-consent-customize').addEventListener('click', () => {
      document.getElementById('hikaya-consent-simple').style.display = 'none';
      document.getElementById('hikaya-consent-detail').style.display = 'block';
    });
    document.getElementById('hikaya-consent-save').addEventListener('click', () => {
      saveConsent({
        essential: true,
        analytics: document.getElementById('hikaya-consent-analytics').checked,
        marketing: document.getElementById('hikaya-consent-marketing').checked,
        ts: Date.now(),
      });
      banner.remove();
    });
  }

  function openSettings() {
    const existing = document.getElementById('hikaya-consent-banner');
    if (existing) existing.remove();
    buildBanner();
    const current = getConsent();
    if (current) {
      document.getElementById('hikaya-consent-simple').style.display = 'none';
      document.getElementById('hikaya-consent-detail').style.display = 'block';
      document.getElementById('hikaya-consent-analytics').checked = !!current.analytics;
      document.getElementById('hikaya-consent-marketing').checked = !!current.marketing;
    }
  }

  window.hikayaConsent = getConsent;
  window.hikayaHasConsent = hasConsent;
  window.hikayaOpenConsentSettings = openSettings;
  // Footer "Cookie settings" link on every page.
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-cookie-settings]');
    if (a) { e.preventDefault(); openSettings(); }
  });

  document.addEventListener('DOMContentLoaded', () => {
    // Never on the owner dashboard.
    if (/admin\.html$/.test(location.pathname)) return;
    if (getConsent()) return;
    /* Phones: keep the first screen (headline, price, Create / Preview buttons) clear. The banner
       appears once the visitor scrolls a little, or after 15 seconds. Nothing analytics/marketing
       fires before a choice, so waiting is safe. Desktop shows it straight away as before. */
    if (!window.matchMedia || !matchMedia('(max-width: 560px)').matches) { buildBanner(); return; }
    let shown = false;
    const show = () => {
      if (shown) return; shown = true;
      window.removeEventListener('scroll', onScroll); clearTimeout(timer);
      if (!getConsent() && !document.getElementById('hikaya-consent-banner')) buildBanner();
    };
    const onScroll = () => { if (window.scrollY > 120) show(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    const timer = setTimeout(show, 15000);
    onScroll();
  });
})();
