/* Hikaya — one shared list of story themes and age groups.
   The admin dashboard turns a story's free-text "collection label" into these
   theme IDs, and the storefront translates the IDs (EN/AR) everywhere a theme
   is shown: cards, filters, Our World, search, the personalise picker.
   Groups match the six site themes in test5/chrome.js (THEMES). */
(function () {
  const GROUPS = [
    { id: 'courage', en: 'Courage', ar: 'الشجاعة' },
    { id: 'kindness', en: 'Kindness & friendship', ar: 'اللطف والصداقة' },
    { id: 'emotions', en: 'Feelings', ar: 'المشاعر' },
    { id: 'imagination', en: 'Imagination', ar: 'الخيال' },
    { id: 'family', en: 'Family', ar: 'العائلة' },
    { id: 'growing', en: 'Growing up', ar: 'النمو' },
  ];
  // id -> labels, site group, and words (EN + AR) that point to it in a collection label.
  const MOMENTS = {
    courage:        { group: 'courage',     en: 'Courage',        ar: 'الشجاعة',       words: ['courage', 'courageous', 'brave', 'bravery', 'fearless', 'شجاع', 'شجاعة', 'جرأة'] },
    confidence:     { group: 'courage',     en: 'Confidence',     ar: 'الثقة',         words: ['confidence', 'confident', 'self-belief', 'believe', 'ثقة', 'واثق'] },
    new:            { group: 'courage',     en: 'New things',     ar: 'تجارب جديدة',   words: ['new', 'first', 'firsts', 'trying', 'first day', 'جديد', 'جديدة', 'أول', 'تجربة'] },
    kindness:       { group: 'kindness',    en: 'Kindness',       ar: 'اللطف',         words: ['kind', 'kindness', 'caring', 'care', 'sharing', 'share', 'helping', 'help', 'empathy', 'لطف', 'لطيف', 'مساعدة', 'مشاركة', 'تعاطف'] },
    friendship:     { group: 'kindness',    en: 'Friendship',     ar: 'الصداقة',       words: ['friend', 'friends', 'friendship', 'together', 'belonging', 'صداقة', 'صديق', 'أصدقاء', 'معًا', 'معا'] },
    emotions:       { group: 'emotions',    en: 'Feelings',       ar: 'المشاعر',       words: ['emotion', 'emotions', 'feeling', 'feelings', 'big feelings', 'calm', 'worry', 'anger', 'مشاعر', 'شعور', 'عواطف', 'قلق', 'غضب'] },
    honesty:        { group: 'emotions',    en: 'Honesty',        ar: 'الصدق',         words: ['honest', 'honesty', 'truth', 'sorry', 'mistake', 'mistakes', 'صدق', 'صادق', 'خطأ', 'اعتذار'] },
    imagination:    { group: 'imagination', en: 'Imagination',    ar: 'الخيال',        words: ['imagination', 'imagine', 'dream', 'dreams', 'magic', 'magical', 'wonder', 'fantasy', 'خيال', 'حلم', 'أحلام', 'سحر', 'عجائب'] },
    adventure:      { group: 'imagination', en: 'Adventure',      ar: 'مغامرة',        words: ['adventure', 'adventures', 'explore', 'explorer', 'exploring', 'journey', 'quest', 'travel', 'space', 'مغامرة', 'مغامرات', 'رحلة', 'استكشاف', 'اكتشاف'] },
    bedtime:        { group: 'imagination', en: 'Bedtime',        ar: 'وقت النوم',     words: ['bedtime', 'sleep', 'sleepy', 'night', 'goodnight', 'lullaby', 'comfort', 'cosy', 'cozy', 'نوم', 'النوم', 'ليل', 'ليلة', 'تهويدة', 'راحة'] },
    family:         { group: 'family',      en: 'Family',         ar: 'العائلة',       words: ['family', 'families', 'home', 'sibling', 'siblings', 'brother', 'sister', 'baby', 'grandma', 'grandpa', 'grandparents', 'mum', 'mom', 'dad', 'parent', 'parents', 'عائلة', 'العائلة', 'أسرة', 'أخ', 'أخت', 'جد', 'جدة', 'أم', 'أب', 'بيت'] },
    change:         { group: 'growing',     en: 'Change',         ar: 'التغيير',       words: ['change', 'changes', 'moving', 'move', 'goodbye', 'تغيير', 'انتقال', 'وداع'] },
    screen:         { group: 'growing',     en: 'Screen time',    ar: 'وقت الشاشة',    words: ['screen', 'screens', 'screen time', 'tablet', 'video', 'videos', 'شاشة', 'الشاشة', 'فيديو'] },
    responsibility: { group: 'growing',     en: 'Responsibility', ar: 'المسؤولية',     words: ['responsibility', 'responsible', 'chores', 'tidy', 'looking after', 'مسؤولية', 'مسؤول', 'ترتيب'] },
    growing:        { group: 'growing',     en: 'Growing up',     ar: 'النمو',         words: ['growing', 'grow', 'growing up', 'milestone', 'milestones', 'school', 'big kid', 'potty', 'نمو', 'يكبر', 'كبير', 'مدرسة', 'إنجاز'] },
  };
  const AGE_GROUPS = ['2-4', '4-6', '6-8'];

  function normAr(s) {
    return String(s || '').toLowerCase()
      .replace(/[\u064B-\u0652\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  // Returns the theme IDs a collection label points to, e.g.
  // "Courage & Confidence" -> ['courage','confidence'], "مغامرة وخيال" -> ['adventure','imagination'].
  function detect(label) {
    const text = normAr(label);
    if (!text.trim()) return [];
    const found = [];
    Object.keys(MOMENTS).forEach(id => {
      let at = -1;
      MOMENTS[id].words.forEach(w => {
        const nw = normAr(w);
        const re = /[a-z]/.test(nw)
          ? new RegExp('(^|[^a-z])' + escRe(nw) + '([^a-z]|$)')                                   // whole English words only
          : new RegExp('(^|[\\s،,&/-])(و|ب|ل|ال|وال|بال)?' + escRe(nw.replace(/^ال/, '')) + '($|[\\s،,&/-])'); // Arabic, with or without ال / و / ب
        const m = re.exec(text);
        if (m && (at < 0 || m.index < at)) at = m.index;
      });
      if (at >= 0) found.push([at, id]);
    });
    // Keep the order the themes appear in the label: the first one is the story's main theme.
    return found.sort((x, y) => x[0] - y[0]).map(x => x[1]);
  }
  // Card colour used before a cover photo is uploaded (the older 3-value "theme" field).
  function cardTheme(moments) {
    const m = moments || [];
    if (m.includes('bedtime')) return 'lullaby';
    if (m.some(x => (MOMENTS[x] || {}).group === 'courage')) return 'courage';
    return m.length ? 'adventure' : 'courage';
  }
  window.HIKAYA_STORY_THEMES = { GROUPS, MOMENTS, AGE_GROUPS, detect, cardTheme };
})();
