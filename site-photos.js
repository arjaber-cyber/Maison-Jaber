/* Hikaya by Maison Jaber — site photo overrides.
   Include with: <script src="/site-photos.js" defer></script>

   Lets the admin dashboard swap out any photo across the whole site without
   touching code. Every page still ships with its normal hardcoded default
   images (images/hero-bedroom-wide.jpg etc.) -- this script just checks
   whether the admin has uploaded a replacement for that exact filename, and
   if so, swaps it in live. If nothing's been uploaded yet, or the backend
   isn't ready, every image quietly stays exactly as it already is.

   Handles both plain <img src="images/x.jpg"> tags and inline
   background-image:url('images/x.jpg') styles (including ones combined with
   a gradient overlay).
*/

(function () {
  function filenameFromPath(path) {
    const match = path.match(/([a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp))/i);
    return match ? match[1] : null;
  }

  function applyOverrides(overrides) {
    if (!overrides || Object.keys(overrides).length === 0) return;

    document.querySelectorAll('img[src*="images/"]').forEach(img => {
      const filename = filenameFromPath(img.getAttribute('src') || '');
      if (filename && overrides[filename]) {
        img.src = overrides[filename];
      }
    });

    document.querySelectorAll('[style*="images/"]').forEach(el => {
      const style = el.getAttribute('style') || '';
      const filename = filenameFromPath(style);
      if (filename && overrides[filename]) {
        const urlPattern = new RegExp(`url\\(['"]?[^'")]*${filename}['"]?\\)`, 'i');
        el.setAttribute('style', style.replace(urlPattern, `url('${overrides[filename]}')`));
      }
    });
  }

  async function loadAndApply() {
    try {
      const res = await fetch('/.netlify/functions/get-site-photos');
      if (!res.ok) return;
      const data = await res.json();
      applyOverrides(data.overrides);
    } catch {
      // No network / function not deployed yet -- defaults stay in place.
    }
  }

  document.addEventListener('DOMContentLoaded', loadAndApply);
})();
