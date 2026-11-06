/* Hikaya — "Not sure which story they'll love?" (Nov 2026)
   A two-question helper above the story grid on personalize.html (child's age band + occasion).
   Recommends up to 3 EXISTING stories, using only each story's own catalogue data
   (age_bands, occasions, moments, card_note). No invented reasons or reviews.
   "Choose this story" picks the story in the existing grid and continues the normal personalisation
   steps, exactly as if the parent had picked it there. Load after chrome.js (defer). */
(function () {
  var root = document.getElementById('story-finder');
  if (!root || !window.Hikaya) return;
  var H = window.Hikaya;

  var TXT = {
    en: {
      h: 'Not sure which story they’ll love?',
      sub: 'Choose their age and the moment you’re celebrating — we’ll help you find their perfect adventure.',
      age: '1. Child’s age', occ: '2. What is the occasion?',
      ages: { '2-4': '2–4', '4-6': '4–6', '6-8': '6–8' },
      occs: { birthday: 'Birthday', christmas: 'Christmas', newsibling: 'New sibling', feelings: 'Big feelings / growing up', justbecause: 'Just because' },
      choose: 'Choose this story', browse: 'Browse all stories',
      closest: 'We don’t have a story for this moment written for ages {band} yet, so here are the closest ones.',
      none: 'No story matches yet. Browse all stories below.',
      picks: 'Our suggestions',
    },
    ar: {
      h: 'لست متأكدًا أي قصة ستعجبه؟',
      sub: 'اختر عمر الطفل والمناسبة التي تحتفل بها، وسنساعدك في إيجاد مغامرته المثالية',
      age: 'عمر الطفل', occ: 'ما المناسبة؟',
      ages: { '2-4': '2–4', '4-6': '4–6', '6-8': '6–8' },
      occs: { birthday: 'عيد ميلاد', christmas: 'عيد الميلاد المجيد', newsibling: 'مولود جديد في العائلة', feelings: 'مشاعر كبيرة ونمو', justbecause: 'بلا مناسبة' },
      choose: 'اختر هذه القصة', browse: 'تصفّح كل القصص',
      closest: 'لا توجد بعد قصة لهذه المناسبة لعمر {band} سنوات، وهذه أقرب القصص إليها',
      none: 'لا توجد قصة مطابقة بعد، تصفّح كل القصص بالأسفل',
      picks: 'اقتراحاتنا',
    },
  };
  function L() { return TXT[H.lang && H.lang() === 'ar' ? 'ar' : 'en']; }

  var state = { age: null, occ: null };
  var catalog = [];
  var FEELINGS = ['emotions', 'honesty', 'growing', 'change', 'screen', 'responsibility']; // site themes "Feelings" + "Growing up"

  // Does this story fit the occasion? Uses the story's own occasions / moments only.
  function fits(s, occ) {
    var o = s.occasions || [], m = s.moments || [];
    if (occ === 'birthday') return o.indexOf('birthday') !== -1;
    if (occ === 'christmas') return o.indexOf('christmas') !== -1;
    if (occ === 'newsibling') return o.indexOf('newbaby') !== -1;
    if (occ === 'justbecause') return o.indexOf('justbecause') !== -1;
    if (occ === 'feelings') return m.some(function (x) { return FEELINGS.indexOf(x) !== -1; });
    return false;
  }
  // Ranking: for "feelings", a story whose MAIN theme is a feelings theme comes first; for birthday /
  // just because, the Christmas-only stories go last. Then the shop's own order.
  function score(s, occ) {
    var m = s.moments || [], o = s.occasions || [], sc = 0;
    if (occ === 'feelings') { var i = m.findIndex(function (x) { return FEELINGS.indexOf(x) !== -1; }); sc += i < 0 ? 9 : i; }
    if ((occ === 'birthday' || occ === 'justbecause') && o.indexOf('christmas') !== -1) sc += 20;
    return sc * 100 + (Number(s.sort_order) || 50);
  }
  function recommend() {
    var occ = state.occ, band = state.age;
    var byOcc = catalog.filter(function (s) { return fits(s, occ); }).sort(function (a, b) { return score(a, occ) - score(b, occ); });
    var exact = byOcc.filter(function (s) { return (s.age_bands || []).indexOf(band) !== -1; });
    if (exact.length) return { list: exact.slice(0, 3), closest: false };
    // Nothing written for that age for this moment: show the nearest ages, and say so.
    var mid = function (s) { var n = (s.age_bands || []).map(function (b) { var p = b.split('-').map(Number); return (p[0] + p[1]) / 2; }); return n.length ? Math.min.apply(null, n.map(function (x) { var t = band.split('-').map(Number); return Math.abs(x - (t[0] + t[1]) / 2); })) : 99; };
    return { list: byOcc.slice().sort(function (a, b) { return mid(a) - mid(b) || score(a, occ) - score(b, occ); }).slice(0, 3), closest: byOcc.length > 0 };
  }

  function esc(v) { return H.esc ? H.esc(v) : String(v); }
  function chips(name, opts, cur) {
    return Object.keys(opts).map(function (k) {
      return '<button type="button" class="sf-chip" data-' + name + '="' + k + '" aria-pressed="' + (cur === k) + '">' + esc(opts[k]) + '</button>';
    }).join('');
  }
  function render() {
    var t = L();
    var html = '<h3 class="sf-h" id="sf-h">' + esc(t.h) + '</h3><p class="sf-sub">' + esc(t.sub) + '</p>' +
      '<div class="sf-q"><span class="sf-ql" id="sf-age-l">' + esc(t.age) + '</span><div class="sf-chips" role="group" aria-labelledby="sf-age-l">' + chips('age', t.ages, state.age) + '</div></div>' +
      '<div class="sf-q"><span class="sf-ql" id="sf-occ-l">' + esc(t.occ) + '</span><div class="sf-chips" role="group" aria-labelledby="sf-occ-l">' + chips('occ', t.occs, state.occ) + '</div></div>';
    if (state.age && state.occ && catalog.length) {
      var r = recommend();
      html += '<div class="sf-results" aria-live="polite">';
      if (!r.list.length) html += '<p class="sf-note">' + esc(t.none) + '</p>';
      else {
        if (r.closest) html += '<p class="sf-note">' + esc(t.closest.replace('{band}', t.ages[state.age])) + '</p>';
        html += '<ul class="sf-list">' + r.list.map(function (s) {
          var reason = H.localized ? H.localized(s.card_note) : '';
          if (H.arPunct) reason = H.arPunct(reason);
          var cover = s.cover ? s.cover.replace(/\/cover(-ar)?\.jpg$/, '/cover$1-600.jpg') : '';
          return '<li class="sf-card">' +
            (cover ? '<img class="sf-cover" src="' + esc(cover) + '" onerror="this.onerror=null;this.src=\'' + esc(s.cover) + '\'" alt="" width="300" height="300" loading="lazy" decoding="async">' : '<div class="sf-cover"></div>') +
            '<div class="sf-body"><h4>' + esc(H.titlePlain(s)) + '</h4>' +
            '<p class="sf-age">' + esc(H.ageText(s.age_bands)) + '</p>' +
            (reason ? '<p class="sf-why">' + esc(reason) + '</p>' : '') +
            '<button type="button" class="btn-primary sf-choose" data-title="' + esc(s.title) + '" data-slug="' + esc(s.slug) + '">' + esc(t.choose) + '</button></div></li>';
        }).join('') + '</ul>';
      }
      html += '</div>';
    }
    html += '<a href="#story-grid" class="sf-browse">' + esc(t.browse) + ' ↓</a>';
    root.innerHTML = html;
  }

  // Pick the story in the existing grid (same code path as a parent tapping its card), then Continue.
  function choose(title, tries) {
    var radio = Array.prototype.find.call(document.querySelectorAll('#story-grid .pick-radio'), function (r) { return r.value === title; });
    if (!radio) { if ((tries || 0) < 20) setTimeout(function () { choose(title, (tries || 0) + 1); }, 150); return; }
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    var next = document.getElementById('story-next-btn');
    if (next && !next.disabled) next.click();
    var form = document.querySelector('.order-form-col');
    if (form) { var top = form.getBoundingClientRect().top + window.scrollY - 90; window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }); }
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button, a'); if (!b) return;
    if (b.dataset.age) { state.age = b.dataset.age; render(); track(); }
    else if (b.dataset.occ) { state.occ = b.dataset.occ; render(); track(); }
    else if (b.classList.contains('sf-choose')) {
      try { window.hikayaTrackEvent && window.hikayaTrackEvent('story_finder_choose', { story: b.dataset.slug, age_band: state.age, occasion: state.occ }); } catch (_) {}
      choose(b.dataset.title);
    } else if (b.classList.contains('sf-browse')) {
      e.preventDefault();
      var g = document.getElementById('story-grid'); if (g) { g.style.display = 'grid'; g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
  });
  function track() {
    if (state.age && state.occ) try { window.hikayaTrackEvent && window.hikayaTrackEvent('story_finder_use', { age_band: state.age, occasion: state.occ }); } catch (_) {}
  }

  render();
  H.loadCatalog().then(function (rows) { catalog = (rows || []).filter(function (s) { return s.slug && s.title; }); render(); }).catch(function () {});
  document.addEventListener('hikaya:langchange', render);
})();
