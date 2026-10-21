/* Hikaya v2 — homepage behaviour + copy. Loads after v2.js. */
(function () {
  'use strict';
  const V2 = window.HIKAYA_V2;

  V2.addStrings({
    h_eyebrow: { en: "Personalised children's books", ar: 'كتب أطفال مخصّصة', de: 'Personalisierte Kinderbücher' },
    h_l1: { en: 'Their name.', ar: 'اسمه.', de: 'Ihr Name.' },
    h_l2: { en: 'Their face.', ar: 'ملامحه.', de: 'Ihr Gesicht.' },
    h_l3: { en: 'Their adventure.', ar: 'مغامرته.', de: 'Ihr Abenteuer.' },
    h_copy: { en: 'Beautiful hardcover stories that turn your child into the hero — created from their photo and made especially for them.', ar: 'قصص جميلة بغلاف مقوّى تجعل طفلك بطل الحكاية — تُرسم من صورته وتُصنع خصيصًا له.', de: 'Wunderschöne Hardcover-Geschichten, in denen Ihr Kind die Hauptrolle spielt — nach seinem Foto gestaltet und eigens für es gemacht.' },
    h_img_alt: { en: 'A child reading a Hikaya book in which she is the hero', ar: 'طفلة تقرأ كتاب حكاية وهي بطلته', de: 'Ein Kind liest ein Hikaya-Buch, in dem es selbst die Heldin ist' },

    mo_title: { en: 'What are they growing through?', ar: 'بماذا يمرّ طفلك الآن؟', de: 'Was erlebt Ihr Kind gerade?' },
    mo_sub: { en: 'Start with the moment, and we’ll show you the stories written for it.', ar: 'ابدأ باللحظة، وسنريك القصص التي كُتبت لها.', de: 'Beginnen Sie mit dem Moment — wir zeigen Ihnen die passenden Geschichten.' },

    st_title: { en: 'Find their next adventure', ar: 'اعثر على مغامرته القادمة', de: 'Finden Sie ihr nächstes Abenteuer' },
    st_all: { en: 'All stories', ar: 'كل القصص', de: 'Alle Geschichten' },
    st_ages: { en: 'Ages', ar: 'الأعمار', de: 'Alter' },
    st_filter_label: { en: 'Filter by age', ar: 'حسب العمر', de: 'Nach Alter filtern' },
    st_showing: { en: 'Showing stories for', ar: 'قصص لـ', de: 'Geschichten für' },
    st_clear: { en: 'Clear', ar: 'مسح', de: 'Zurücksetzen' },

    hw_title: { en: 'From their photo to their favourite story', ar: 'من صورته إلى قصته المفضّلة', de: 'Vom Foto zur Lieblingsgeschichte' },
    hw_1: { en: 'Choose their story', ar: 'اختر قصته', de: 'Geschichte wählen' },
    hw_1c: { en: 'Pick a story written for their age and the moment they’re in.', ar: 'اختر قصة كُتبت لعمره وللمرحلة التي يعيشها.', de: 'Wählen Sie eine Geschichte für ihr Alter und ihren Moment.' },
    hw_2: { en: 'Make it theirs', ar: 'اجعلها له', de: 'Machen Sie sie persönlich' },
    hw_2c: { en: 'Add their name, one clear photo and a note from you. It takes a few minutes.', ar: 'أضف اسمه وصورة واضحة ورسالة منك. يستغرق الأمر دقائق.', de: 'Name, ein klares Foto und eine Widmung von Ihnen. Das dauert nur wenige Minuten.' },
    hw_3: { en: 'We create & deliver', ar: 'نصنعها ونوصلها', de: 'Wir gestalten & liefern' },
    hw_3c: { en: 'We illustrate, print and gift-wrap their book, and it arrives within about a week.', ar: 'نرسم كتابه ونطبعه ونغلّفه كهدية، ويصلك خلال أسبوع تقريبًا.', de: 'Wir illustrieren, drucken und verpacken das Buch als Geschenk — es kommt in etwa einer Woche an.' },

    li_title: { en: 'Take a little look inside', ar: 'ألقِ نظرة إلى الداخل', de: 'Ein kleiner Blick hinein' },
    li_copy: { en: 'Every scene is illustrated and personalised with your child at the heart of the story.', ar: 'كل مشهد مرسوم ومخصّص، وطفلك في قلب الحكاية.', de: 'Jede Szene ist illustriert und personalisiert — mit Ihrem Kind im Mittelpunkt.' },
    li_dev: { en: 'Replace with a real story spread', ar: 'Replace with a real story spread', de: 'Replace with a real story spread' },

    pe_title: { en: 'Made entirely for them', ar: 'مصنوع له بالكامل', de: 'Ganz für sie gemacht' },
    pe_copy: { en: 'This isn’t a name dropped into a template. Your child becomes the character on the page.', ar: 'ليس مجرد اسم في قالب جاهز. طفلك يصبح الشخصية على الصفحة.', de: 'Kein Name in einer Vorlage: Ihr Kind wird zur Figur auf der Seite.' },
    pe_name: { en: 'Their name, woven through the story', ar: 'اسمه منسوج في الحكاية', de: 'Ihr Name, verwoben in die Geschichte' },
    pe_face: { en: 'Their likeness, drawn from their photo', ar: 'ملامحه، مرسومة من صورته', de: 'Ihr Aussehen, nach ihrem Foto gezeichnet' },
    pe_pron: { en: 'Their pronouns, where the story uses them', ar: 'صيغة المخاطبة المناسبة له', de: 'Die passenden Pronomen im Text' },
    pe_welcome: { en: 'A welcome page with their name', ar: 'صفحة ترحيب باسمه', de: 'Eine Willkommensseite mit ihrem Namen' },
    pe_note: { en: 'Your personal message at the front', ar: 'رسالتك الخاصة في أول الكتاب', de: 'Ihre persönliche Widmung vorne im Buch' },
    pe_spec_size: { en: '21 × 21 cm', ar: '21 × 21 سم', de: '21 × 21 cm' },
    pe_spec_cover: { en: 'Hardcover', ar: 'غلاف مقوّى', de: 'Hardcover' },
    pe_spec_colour: { en: 'Full colour throughout', ar: 'ألوان كاملة', de: 'Durchgehend farbig' },
    pe_img_alt: { en: "A personalised Hikaya cover showing the child's name and illustrated likeness", ar: 'غلاف حكاية مخصّص يحمل اسم الطفلة وملامحها المرسومة', de: 'Ein personalisiertes Hikaya-Cover mit Namen und gezeichnetem Porträt des Kindes' },

    kp_title: { en: 'Made to be kept', ar: 'صُنع ليبقى', de: 'Gemacht, um zu bleiben' },
    kp_copy: { en: 'Created for bedtime today. Kept for years.', ar: 'لوقت النوم اليوم، وللذكرى لسنوات.', de: 'Heute zum Vorlesen. Für Jahre zum Aufbewahren.' },
    kp_alt1: { en: 'Hikaya hardcover books on a shelf', ar: 'كتب حكاية بغلاف مقوّى على رف', de: 'Hikaya-Hardcover im Regal' },
    kp_alt2: { en: 'Hikaya books on a child’s desk', ar: 'كتب حكاية على مكتب طفل', de: 'Hikaya-Bücher auf einem Kinderschreibtisch' },
    kp_alt3: { en: 'A stack of Hikaya books beside a toy bunny', ar: 'مجموعة كتب حكاية بجانب دمية أرنب', de: 'Hikaya-Bücher neben einem Stoffhasen' },

    gf_title1: { en: 'Not just a book.', ar: 'ليس مجرد كتاب.', de: 'Nicht nur ein Buch.' },
    gf_title2: { en: 'The whole gift.', ar: 'بل هدية كاملة.', de: 'Das ganze Geschenk.' },
    gf_copy: { en: 'Gift packaging is included with every Hikaya book.', ar: 'التغليف كهدية مشمول مع كل كتاب من حكاية.', de: 'Die Geschenkverpackung ist bei jedem Hikaya-Buch inklusive.' },
    gf_box: { en: 'Our signature box', ar: 'علبتنا المميّزة', de: 'Unsere Signature-Box' },
    gf_ribbon: { en: 'Satin ribbon and tag', ar: 'شريط ساتان وبطاقة', de: 'Satinband und Anhänger' },
    gf_tissue: { en: 'Gold-star tissue and seal', ar: 'ورق مطبوع بالنجوم الذهبية وختم', de: 'Seidenpapier mit Goldsternen und Siegel' },
    gf_card: { en: 'A card with your message', ar: 'بطاقة برسالتك', de: 'Eine Karte mit Ihrer Nachricht' },
    gf_direct: { en: 'Sending it to someone else? We can ship it straight to them.', ar: 'تهديه لشخص آخر؟ يمكننا شحنه إليه مباشرة.', de: 'Ein Geschenk für jemand anderen? Wir liefern direkt an die Empfänger.' },
    gf_img_alt: { en: 'An open Hikaya gift box with gold-star tissue, ribbon and a message card', ar: 'علبة هدية حكاية مفتوحة مع ورق النجوم الذهبية والشريط وبطاقة الرسالة', de: 'Eine geöffnete Hikaya-Geschenkbox mit Goldstern-Seidenpapier, Band und Karte' },

    dl_title: { en: 'Ordering for a special day?', ar: 'تطلبه لمناسبة خاصة؟', de: 'Für einen besonderen Tag?' },
    dl_copy: { en: 'Every book is made to order. Plan for about a week from order to door.', ar: 'كل كتاب يُصنع حسب الطلب. احسب أسبوعًا تقريبًا من الطلب حتى الباب.', de: 'Jedes Buch wird auf Bestellung gefertigt. Rechnen Sie mit etwa einer Woche bis zur Haustür.' },
    dl_1: { en: 'Made especially for them', ar: 'يُصنع خصيصًا له', de: 'Eigens angefertigt' },
    dl_1c: { en: 'We illustrate, print and finish each book after you order.', ar: 'نرسم كل كتاب ونطبعه ونجهّزه بعد طلبك.', de: 'Jedes Buch wird nach Ihrer Bestellung illustriert, gedruckt und veredelt.' },
    dl_2: { en: 'Delivered within about a week', ar: 'يصل خلال أسبوع تقريبًا', de: 'Lieferung in etwa einer Woche' },
    dl_2c: { en: 'Shipping cost is shown in your cart before you pay.', ar: 'تظهر تكلفة الشحن في السلة قبل الدفع.', de: 'Die Versandkosten sehen Sie im Warenkorb vor dem Bezahlen.' },
    dl_3: { en: 'Straight to them, as a gift', ar: 'مباشرة إليه، كهدية', de: 'Direkt als Geschenk' },
    dl_3c: { en: 'Add their address and your message at checkout.', ar: 'أضف عنوانه ورسالتك عند إتمام الطلب.', de: 'Adresse und Nachricht beim Bezahlen angeben.' },

    rv_title: { en: 'What parents say', ar: 'ماذا يقول الأهل', de: 'Was Eltern sagen' },
    rv_dev: { en: 'Placeholder — hidden on the live site until real reviews exist', ar: 'Placeholder — hidden on the live site until real reviews exist', de: 'Placeholder — hidden on the live site until real reviews exist' },

    fn_l1: { en: 'One day they’ll outgrow the story.', ar: 'سيكبرون يومًا على الحكاية.', de: 'Eines Tages wachsen sie aus der Geschichte heraus.' },
    fn_l2: { en: 'They won’t outgrow the memory.', ar: 'لكنهم لن يكبروا على الذكرى.', de: 'Aus der Erinnerung nie.' },
    fn_img_alt: { en: 'A child in a cosy bedroom holding her personalised Hikaya book beside its gift box', ar: 'طفلة في غرفة دافئة تحمل كتاب حكاية المخصّص لها بجانب علبة الهدية', de: 'Ein Kind in einem gemütlichen Zimmer mit seinem personalisierten Hikaya-Buch und der Geschenkbox' },
  });

  /* ---------- story finder: moments + age chips + cards ---------- */
  const state = { age: 'all', moment: null };
  let stories = [];

  function renderMoments() {
    const box = document.getElementById('moments');
    if (!box) return;
    // Only offer moments that lead to at least one story.
    const usable = V2.moments.filter(m => stories.some(s => s.moments.includes(m.id))).slice(0, 6);
    const section = document.getElementById('moments-section');
    if (usable.length < 2) { section.hidden = true; return; }
    box.style.gridTemplateColumns = window.matchMedia('(min-width: 961px)').matches ? `repeat(${usable.length}, minmax(0,1fr))` : '';
    box.innerHTML = usable.map(m => `
      <button class="moment" type="button" data-moment="${m.id}" aria-pressed="${state.moment === m.id}">
        <span class="moment__name">${V2.t(m.name)}</span>
        <span class="moment__hint">${V2.t(m.hint)}</span>
      </button>`).join('');
  }

  function renderAgeChips() {
    const box = document.getElementById('age-chips');
    if (!box) return;
    const opts = [['all', V2.t('st_all')]].concat(V2.ageBands.map(a => [a, `${V2.t('st_ages')} ${a.replace('-', '–')}`]));
    box.innerHTML = opts.map(([v, label]) => `<button class="chip" type="button" data-age="${v}" aria-pressed="${state.age === v}">${label}</button>`).join('');
  }

  function renderStories() {
    const grid = document.getElementById('story-grid');
    const status = document.getElementById('story-status');
    if (!grid) return;
    let list = stories.filter(s => (state.age === 'all' || s.ages.includes(state.age)) && (!state.moment || s.moments.includes(state.moment)));
    let empty = false;
    if (!list.length) { empty = true; list = stories.filter(s => state.age === 'all' || s.ages.includes(state.age)); if (!list.length) list = stories; }
    const shown = list.slice(0, 3);
    grid.innerHTML = (empty ? `<div class="notice" style="grid-column:1/-1"><div><strong>${V2.t('st_no_match_title')}.</strong> ${V2.t('st_no_match_copy')}</div></div>` : '') + shown.map(V2.storyCardHtml).join('');
    if (status) {
      const m = state.moment ? V2.moments.find(x => x.id === state.moment) : null;
      status.innerHTML = m ? `${V2.t('st_showing')} <strong>${V2.t(m.name)}</strong> · <button class="link" type="button" data-clear-moment style="background:none;border:0;padding:0;cursor:pointer">${V2.t('st_clear')}</button>` : '';
    }
  }

  function renderAll() { renderMoments(); renderAgeChips(); renderStories(); }

  document.addEventListener('click', (e) => {
    const mBtn = e.target.closest('[data-moment]');
    if (mBtn) {
      const id = mBtn.dataset.moment;
      state.moment = state.moment === id ? null : id;
      V2.track('story_filter_selected', { type: 'moment', value: state.moment || 'none' });
      renderMoments(); renderStories();
      if (state.moment) document.getElementById('stories').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    const aBtn = e.target.closest('[data-age]');
    if (aBtn) { state.age = aBtn.dataset.age; V2.track('story_filter_selected', { type: 'age', value: state.age }); renderAgeChips(); renderStories(); return; }
    if (e.target.closest('[data-clear-moment]')) { state.moment = null; renderMoments(); renderStories(); }
  });

  V2.getStories().then(list => { stories = list; renderAll(); });
  V2.onLang(renderAll);

  /* ---------- look inside: real spreads from the catalogue, if any ---------- */
  V2.getStories().then(list => {
    const spreads = [];
    list.forEach(s => (s.previews || []).forEach(p => spreads.push({ url: typeof p === 'string' ? p : p.url, story: s })));
    const rail = document.getElementById('inside-rail');
    if (!rail || !spreads.length) return; // keep the placeholder rail until real spreads exist
    rail.innerHTML = spreads.slice(0, 5).map(sp => `
      <figure class="spread"><div class="spread__img"><img src="${V2.esc(sp.url)}" alt="${V2.esc(sp.story.titleText())} — inside pages" loading="lazy" decoding="async"></div>
      <figcaption>${V2.esc(sp.story.titleText())}</figcaption></figure>`).join('');
  });

  /* ---------- reviews: shown only when there are real ones ---------- */
  const rv = document.getElementById('reviews');
  if (rv) rv.hidden = !(V2.config.showTestimonials || V2.config.preview);

  V2.track('homepage_viewed');
})();


/* Hero slideshow — crossfades the photos every few seconds */
(function () {
  const box = document.querySelector('[data-hero-slides]');
  if (!box) return;
  const slides = [...box.querySelectorAll('.hero__slide')];
  if (slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let i = 0, timer = null;
  const next = () => {
    slides[i].classList.remove('is-active');
    i = (i + 1) % slides.length;
    const img = slides[i];
    if (img.loading === 'lazy') img.loading = 'eager';
    img.classList.add('is-active');
  };
  const start = () => { if (!timer) timer = setInterval(next, 5000); };
  const stop = () => { clearInterval(timer); timer = null; };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  slides.slice(1).forEach(s => { s.loading = 'eager'; });
  start();
})();
