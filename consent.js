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
    const banner = document.createElement('div');
    banner.id = 'hikaya-consent-banner';
    banner.style.cssText = 'position:fixed; left:0; right:0; bottom:0; z-index:2000; background:#2E2018; color:#e8ddd0; padding:18px 20px; font-family:"Inter",sans-serif; box-shadow:0 -6px 24px rgba(0,0,0,0.2);';
    banner.innerHTML = `
      <div style="max-width:900px; margin:0 auto;">
        <div id="hikaya-consent-simple">
          <p style="margin:0 0 12px; font-size:13.5px; line-height:1.5;">
            We use cookies for essential site features, and — only with your permission — to understand site usage and improve how we reach families like yours.
            <a href="privacy.html" style="color:#e8ddd0; text-decoration:underline;">Privacy Policy</a>
          </p>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button type="button" id="hikaya-consent-reject" style="padding:9px 18px; border-radius:999px; border:1px solid rgba(255,255,255,0.3); background:none; color:#e8ddd0; font-size:12.5px; font-weight:700; cursor:pointer;">Reject Non-Essential</button>
            <button type="button" id="hikaya-consent-customize" style="padding:9px 18px; border-radius:999px; border:1px solid rgba(255,255,255,0.3); background:none; color:#e8ddd0; font-size:12.5px; font-weight:700; cursor:pointer;">Customize</button>
            <button type="button" id="hikaya-consent-accept" style="padding:9px 18px; border-radius:999px; border:none; background:#A67443; color:#fff; font-size:12.5px; font-weight:700; cursor:pointer;">Accept All</button>
          </div>
        </div>
        <div id="hikaya-consent-detail" style="display:none;">
          <p style="margin:0 0 12px; font-size:13.5px; font-weight:700;">Choose what you're comfortable with:</p>
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:8px; opacity:0.7;">
            <input type="checkbox" checked disabled /> Essential (always on — cart, language, region)
          </label>
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:8px;">
            <input type="checkbox" id="hikaya-consent-analytics" /> Analytics (Google Analytics)
          </label>
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:14px;">
            <input type="checkbox" id="hikaya-consent-marketing" /> Marketing (Meta Pixel)
          </label>
          <button type="button" id="hikaya-consent-save" style="padding:9px 18px; border-radius:999px; border:none; background:#A67443; color:#fff; font-size:12.5px; font-weight:700; cursor:pointer;">Save Preferences</button>
        </div>
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
    if (!getConsent()) buildBanner();
  });
})();
