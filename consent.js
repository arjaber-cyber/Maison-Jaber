/* Hikaya by Maison Jaber — cookie consent.
   Include with: <script src="/consent.js" defer></script>
   Load this BEFORE analytics.js on every page, so analytics.js can check
   consent before firing GA/Meta Pixel.

   Categories:
   - essential: always on, not a real choice (site can't function without it
     -- things like remembering your language/region/cart)
   - analytics: Google Analytics
   - marketing: Meta Pixel

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
        @media (max-width: 560px) {
          #hikaya-consent-banner { left: 10px; right: 10px; bottom: 10px; max-width: none; padding: 12px 14px; }
          #hikaya-consent-banner p { font-size: 12px; margin-bottom: 8px; }
        }`;
      document.head.appendChild(st);
    }
    const banner = document.createElement('div');
    banner.id = 'hikaya-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie preferences');
    banner.innerHTML = `
        <div id="hikaya-consent-simple">
          <p>We use essential cookies, and, only with your OK, analytics to improve the site. <a href="privacy.html">Privacy Policy</a></p>
          <div class="hc-row">
            <button type="button" id="hikaya-consent-accept" class="hc-primary">Accept All</button>
            <button type="button" id="hikaya-consent-reject">Reject</button>
            <button type="button" id="hikaya-consent-customize" class="hc-link">Customize</button>
          </div>
        </div>
        <div id="hikaya-consent-detail" style="display:none;">
          <p style="font-weight:700;">Choose what you're comfortable with:</p>
          <label style="opacity:0.7;"><input type="checkbox" checked disabled /> Essential (always on: cart, language, region)</label>
          <label><input type="checkbox" id="hikaya-consent-analytics" /> Analytics (Google Analytics)</label>
          <label style="margin-bottom:12px;"><input type="checkbox" id="hikaya-consent-marketing" /> Marketing (Meta Pixel)</label>
          <button type="button" id="hikaya-consent-save" class="hc-primary">Save Preferences</button>
        </div>`;
    document.body.appendChild(banner);

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

  document.addEventListener('DOMContentLoaded', () => {
    // Never on the owner dashboard.
    if (/admin\.html$/.test(location.pathname)) return;
    if (!getConsent()) buildBanner();
  });
})();
