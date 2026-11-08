/* Hikaya: private hand-off of the child's details between the free cover preview and the order form (Nov 2026).
   The child's name, age, gender and book language never go in the URL, so a parent can copy or share the page
   link without sharing their child's details, and they are never written to persistent browser storage:
   - Kept in sessionStorage only: this tab's session, gone when it is closed.
   - The order form opens the preview in a new tab with window.open (not "noopener"), which gives the new tab a copy
     of this tab's sessionStorage, so nothing needs to be left in localStorage for it.
   - Old links that still carry ?cp_name=… are read once, then cleaned from the address bar.
   - The earlier version's localStorage hand-off slot (hk_cp_handoff) is deleted wherever this script loads. */
(function () {
  var SKEY = 'hk_cp_child', OLD_LKEY = 'hk_cp_handoff';
  var LEGACY = ['cp_name', 'cp_age', 'cp_gender', 'cp_lang'];
  try { localStorage.removeItem(OLD_LKEY); } catch (e) {}

  function clean(c) {
    if (!c || typeof c !== 'object') return null;
    var o = {};
    if (c.name) o.name = String(c.name).trim().slice(0, 20);
    var a = Number(c.age); if (a >= 1 && a <= 12) o.age = Math.round(a);
    if (c.gender === 'boy' || c.gender === 'girl') o.gender = c.gender;
    if (c.lang === 'en' || c.lang === 'ar') o.lang = c.lang;
    if (c.story && /^[a-z0-9-]{1,80}$/.test(String(c.story))) o.story = String(c.story);
    return (o.name || o.gender || o.age || o.lang) ? o : null;
  }

  function save(child, from) {
    var c = clean(child); if (!c) return;
    c.from = from || ''; c.t = Date.now();
    try { sessionStorage.setItem(SKEY, JSON.stringify(c)); } catch (e) {}
  }

  function read() {
    var c = null;
    try { c = JSON.parse(sessionStorage.getItem(SKEY) || 'null'); } catch (e) {}
    if (!c) return null;
    var out = clean(c); if (out) { out.from = c.from || ''; out.t = c.t || 0; }
    return out;
  }

  // Old-style link with the details in the query string: keep them for this session, then remove them from the URL.
  function fromLegacyUrl() {
    var q; try { q = new URLSearchParams(location.search); } catch (e) { return null; }
    if (!LEGACY.some(function (k) { return q.has(k); })) return null;
    var c = clean({ name: q.get('cp_name'), age: q.get('cp_age'), gender: q.get('cp_gender'), lang: q.get('cp_lang'), story: q.get('story') || q.get('s') });
    LEGACY.forEach(function (k) { q.delete(k); });
    try { history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash); } catch (e) {}
    if (c) { save(c, 'legacy-url'); c.from = 'legacy-url'; }
    return c;
  }

  function clear() { try { sessionStorage.removeItem(SKEY); } catch (e) {} }

  // Open a page in a new tab that starts with a copy of this tab's session (falls back to this tab if blocked).
  function openWithSession(url) {
    var w = null; try { w = window.open(url, '_blank'); } catch (e) {}
    if (!w) location.href = url;
    return w;
  }

  window.hikayaCpHandoff = { save: save, read: read, fromLegacyUrl: fromLegacyUrl, clear: clear, openWithSession: openWithSession };
})();
