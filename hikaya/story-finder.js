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
      partial: 'Some of these are written for younger or older ages, so check the age on each story.',
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
      partial: 'بعض هذه القصص مكتوبة لأعمار أخرى، تحقّق من العمر المذكور على كل قصة',
      none: 'لا توجد قصة مطابقة بعد، تصفّح كل القصص بالأسفل',
      picks: 'اقتراحاتنا',
    },
  };
  function L() { return TXT[H.lang && H.lang() === 'ar' ? 'ar' : 'en']; }

  var state = { age: null, occ: null };
  var catalog = [];

  /* Recommendations per occasion (Nov 2026, commercial review): an ordered shortlist of EXISTING stories,
     each with a reason written for THAT occasion (based on the story's own premise). The finder takes the
     first 3 that suit the chosen age. Only if fewer fit that age does it add the closest ages, and say so.
     Stories not listed here are never auto-recommended: add a new story to the occasions it truly suits. */
  function R(slug, en, ar) { return { slug: slug, en: en, ar: ar }; }
  var PICKS = {
    birthday: [ // a magical "this is your day" gift: the child as the hero of a big adventure
      R('storm-above-the-city', 'They become the superhero who saves the day, perfect for their big day', 'يصبح بطلًا خارقًا ينقذ المدينة، هدية مثالية ليومه الكبير'),
      R('door-of-a-thousand-stars', 'A magical, star-filled adventure starring the birthday child', 'مغامرة سحرية بين النجوم بطلها صاحب عيد الميلاد'),
      R('to-the-rescue', 'Their name, their hero moment, a joyful birthday surprise', 'اسمه ولحظة بطولته، مفاجأة مبهجة لعيد ميلاده'),
      R('grandpas-wild-safari', 'A wild safari adventure with Grandpa, a birthday gift to read again and again', 'مغامرة سفاري مع الجد، هدية عيد ميلاد يقرؤها مرة بعد مرة'),
      R('silver-wing-mission', 'A spaceship adventure with them as the hero', 'مغامرة في سفينة فضاء وهو البطل'),
      R('teddys-night-adventure', 'A cosy, magical adventure to treasure long after the party', 'مغامرة دافئة وساحرة يحتفظ بها بعد انتهاء الحفلة'),
    ],
    christmas: [ // Christmas stories first, then cosy gifts to unwrap
      R('christmas-star', 'A magical Christmas Eve adventure', 'مغامرة ساحرة في ليلة الميلاد'),
      R('the-christmas-list', 'A funny festive story about the joy of giving', 'قصة ميلادية مضحكة عن فرحة العطاء'),
      R('christmas-tree-door', 'A cosy Christmas adventure for little ones', 'مغامرة ميلادية دافئة للصغار'),
      R('door-of-a-thousand-stars', 'A starry, magical adventure to unwrap at Christmas', 'مغامرة سحرية بين النجوم تفتحها هدية في الميلاد'),
      R('teddys-night-adventure', 'A cosy bedtime adventure for Christmas Eve', 'مغامرة دافئة قبل النوم لليلة الميلاد'),
      R('to-the-rescue', 'A cheerful hero story to unwrap at Christmas', 'قصة بطل مبهجة تفتحها هدية في الميلاد'),
    ],
    newsibling: [ // family / big brother / big sister first
      R('why-is-baby-looking-at-me', 'Made for new big brothers and big sisters', 'مصممة للإخوة الكبار الجدد'),
      R('the-last-box', 'Gentle reassurance when life at home is changing', 'طمأنينة لطيفة حين تتغير الحياة في البيت'),
      R('to-the-rescue', 'For a proud new little helper at home', 'لمساعد صغير فخور في البيت'),
      R('silver-wing-mission', 'About welcoming others and making room for someone new', 'عن الترحيب بالآخرين وإفساح مكان لشخص جديد'),
    ],
    feelings: [ // emotions, confidence, screen time, friendship, transitions
      R('door-of-a-thousand-stars', 'Courage for big new beginnings', 'شجاعة لمواجهة البدايات الجديدة'),
      R('the-last-box', 'For big changes, like moving to a new home', 'للتغييرات الكبيرة مثل الانتقال إلى بيت جديد'),
      R('just-one-more', 'Gentle help with screen time', 'مساعدة لطيفة في وقت الشاشة'),
      R('silver-wing-mission', 'Friendship, kindness and one brave choice', 'عن الصداقة واللطف وقرار شجاع'),
      R('storm-above-the-city', 'Staying calm and asking for help when things feel stormy', 'عن الهدوء وطلب المساعدة حين تشتد الأمور'),
      R('the-cracked-blue-vase', 'Owning up to little mistakes, gently', 'عن الاعتراف بالأخطاء الصغيرة بلطف'),
      R('teddys-night-adventure', 'For little ones afraid of the dark', 'للصغار الذين يخافون الظلام'),
      R('house-of-missing-things', 'Growing responsibility, with a smile', 'تعلّم المسؤولية بابتسامة'),
    ],
    justbecause: [ // broadly joyful, imaginative, evergreen
      R('storm-above-the-city', 'A big, funny superhero adventure', 'مغامرة بطولية كبيرة ومضحكة'),
      R('to-the-rescue', 'A cheerful everyday-hero story', 'قصة مبهجة عن بطل في الحياة اليومية'),
      R('grandpas-wild-safari', 'A warm safari adventure with Grandpa', 'مغامرة سفاري دافئة مع الجد'),
      R('door-of-a-thousand-stars', 'A magical adventure beyond the clouds', 'مغامرة سحرية فوق الغيوم'),
      R('silver-wing-mission', 'An exciting spaceship adventure', 'مغامرة مشوّقة في سفينة فضاء'),
      R('teddys-night-adventure', 'A cosy, funny bedtime adventure', 'مغامرة مرحة ودافئة قبل النوم'),
    ],
  };

  function recommend() {
    var band = state.age, bySlug = {};
    catalog.forEach(function (s) { bySlug[s.slug] = s; });
    var picks = (PICKS[state.occ] || []).filter(function (p) { return bySlug[p.slug]; }) // only stories still in the shop
      .map(function (p) { return { story: bySlug[p.slug], reason: p }; });
    var fits = function (x) { return (x.story.age_bands || []).indexOf(band) !== -1; };
    var list = picks.filter(fits).slice(0, 3);
    var closest = false;
    if (list.length < 2) { // nothing (or one) written for this age for this moment: add the nearest ages, and say so
      var extra = picks.filter(function (x) { return !fits(x); }).slice(0, 3 - list.length);
      closest = extra.length ? (list.length ? 'partial' : 'closest') : false; list = list.concat(extra);
    }
    return { list: list, closest: closest };
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
    if (state.age && state.occ && !catalog.length) {
      // Catalogue still loading: lightweight placeholder cards, same size as the real ones.
      html += '<div class="sf-results" aria-busy="true"><ul class="sf-list">' + [0, 1, 2].map(function () {
        return '<li class="sf-card sf-sk" aria-hidden="true"><div class="sf-cover"></div><div class="sf-body"><span class="sk-l sk-t"></span><span class="sk-l sk-s"></span><span class="sk-l sk-s"></span></div></li>';
      }).join('') + '</ul></div>';
    }
    if (state.age && state.occ && catalog.length) {
      var r = recommend();
      html += '<div class="sf-results" aria-live="polite">';
      if (!r.list.length) html += '<p class="sf-note">' + esc(t.none) + '</p>';
      else {
        if (r.closest) html += '<p class="sf-note">' + esc(r.closest === 'partial' ? t.partial : t.closest.replace('{band}', t.ages[state.age])) + '</p>';
        html += '<ul class="sf-list">' + r.list.map(function (x) {
          var s = x.story, reason = x.reason[H.lang && H.lang() === 'ar' ? 'ar' : 'en'];
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
