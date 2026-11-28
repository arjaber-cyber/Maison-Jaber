/* Hikaya book languages (Nov 2026)
   One place for every language a book can be ordered in. The site itself stays English / Arabic;
   this is only about the language the BOOK is printed in.

   Rule: the child's name and the first-page message are printed in the book's language, so both
   must be written in that language's letters (an Arabic book never carries an English name, a
   Russian book never carries a Latin-letter message, and so on).

   The server mirrors the same rules in netlify/functions/_bookLangs.js. Keep the two in step. */
(function () {
  var AR = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
  var LATIN = /[A-Za-zÀ-ɏḀ-ỿ]/;
  var CYR = /[Ѐ-ӿԀ-ԯ]/;
  var HAN = /[㐀-䶿一-鿿豈-﫿]/;
  var SCRIPTS = { latin: LATIN, arabic: AR, cyrillic: CYR, han: HAN };

  // Order = order shown in the picker.
  var LANGS = {
    en: { script: 'latin', dir: 'ltr', native: 'English', en: 'English', ar: 'الإنجليزية', short: 'EN' },
    ar: { script: 'arabic', dir: 'rtl', native: 'العربية', en: 'Arabic', ar: 'العربية', short: 'AR' },
    de: { script: 'latin', dir: 'ltr', native: 'Deutsch', en: 'German', ar: 'الألمانية', short: 'DE' },
    zh: { script: 'han', dir: 'ltr', native: '中文', en: 'Mandarin Chinese', ar: 'الصينية (الماندرين)', short: 'ZH' },
    ru: { script: 'cyrillic', dir: 'ltr', native: 'Русский', en: 'Russian', ar: 'الروسية', short: 'RU' },
  };
  var CODES = Object.keys(LANGS);

  function norm(code) { return LANGS[code] ? code : 'en'; }
  function siteLang() { return document.documentElement.lang === 'ar' ? 'ar' : 'en'; }
  function label(code, ui) { var l = LANGS[norm(code)]; return l[ui || siteLang()] || l.en; }
  // Picker text: "German · Deutsch" (English and Arabic just show their own name).
  function optionLabel(code, ui) {
    var l = LANGS[norm(code)], name = label(code, ui);
    return (code === 'en' || code === 'ar' || name === l.native) ? name : name + ' · ' + l.native;
  }
  function bookLabel(code, ui) {
    ui = ui || siteLang();
    return ui === 'ar' ? 'كتاب ب' + label(code, 'ar') : label(code, 'en') + ' book';
  }
  function scriptsIn(s) {
    s = String(s || ''); var out = [];
    for (var k in SCRIPTS) if (SCRIPTS[k].test(s)) out.push(k);
    return out;
  }
  // Which book language a typed name naturally belongs to ('' if mixed / unknown).
  // Latin letters count as English (German uses the same letters, so a Latin name is fine for both).
  function langOfText(s) {
    var sc = scriptsIn(s); if (sc.length !== 1) return '';
    return { latin: 'en', arabic: 'ar', cyrillic: 'ru', han: 'zh' }[sc[0]];
  }
  // Name: must contain the book's letters and no letters of any other script.
  function nameOk(code, name) {
    var sc = scriptsIn(name); return sc.length === 1 && sc[0] === LANGS[norm(code)].script;
  }
  // Message: may be empty; must not contain letters of any other script.
  function msgScriptOk(code, text) {
    var own = LANGS[norm(code)].script, sc = scriptsIn(text);
    for (var i = 0; i < sc.length; i++) if (sc[i] !== own) return false;
    return true;
  }
  /* English and German share letters, so a script check can't tell them apart.
     A light word check catches the obvious case (a whole English message on a German book, or
     the other way round). It only blocks when the other language clearly wins. */
  var EN_W = ['the', 'and', 'you', 'your', 'with', 'our', 'are', 'is', 'to', 'of', 'my', 'we', 'love', 'dear', 'always', 'be', 'little', 'happy', 'for', 'this', 'from'];
  var DE_W = ['und', 'der', 'die', 'das', 'du', 'dein', 'deine', 'dich', 'dir', 'mit', 'wir', 'ist', 'ich', 'liebe', 'lieber', 'für', 'von', 'zu', 'unser', 'unsere', 'unseren', 'immer', 'sei', 'kleiner', 'kleine', 'diese', 'mama', 'papa'];
  function wordHits(text, list) {
    var words = String(text || '').toLowerCase().match(/[a-zäöüß]+/g) || [], seen = {}, n = 0;
    for (var i = 0; i < words.length; i++) if (list.indexOf(words[i]) >= 0 && !seen[words[i]]) { seen[words[i]] = 1; n++; }
    return n;
  }
  function msgOk(code, text) {
    code = norm(code);
    if (!msgScriptOk(code, text)) return false;
    if (code === 'de') { var e = wordHits(text, EN_W), d = wordHits(text, DE_W); if (e >= 3 && e > d * 2) return false; }
    if (code === 'en') { var d2 = wordHits(text, DE_W.filter(function (w) { return w !== 'mama' && w !== 'papa'; })), e2 = wordHits(text, EN_W); if (d2 >= 3 && d2 > e2 * 2) return false; }
    return true;
  }

  // "Inspire me" ideas, written in each book language. {name} is the name printed in the book.
  var IDEAS = {
    en: ['To our brave {name}, may every page remind you how loved you are. Love, Mama and Baba', 'Dear {name}, this story is yours, just like our hearts. Keep shining, little star.', 'For {name}: dream big, be kind, and never stop asking questions. We are so proud of you.', 'Happy reading, {name}! Wherever your adventures take you, home is always here.'],
    ar: ['إلى {name} الشجاع، لتذكّرك كل صفحة بكم نحبك، مع حب ماما وبابا', 'عزيزنا {name}، هذه القصة لك، تمامًا مثل قلوبنا، ابقَ نجمًا لامعًا', 'إلى {name}: احلم كثيرًا، وكن لطيفًا، ولا تتوقف عن السؤال، نحن فخورون بك', 'قراءة ممتعة يا {name}! أينما أخذتك مغامراتك، يبقى البيت هنا دائمًا'],
    ar_girl: ['إلى {name} الشجاعة، لتذكّرك كل صفحة بكم نحبك، مع حب ماما وبابا', 'عزيزتنا {name}، هذه القصة لكِ، تمامًا مثل قلوبنا، ابقي نجمة لامعة', 'إلى {name}: احلمي كثيرًا، وكوني لطيفة، ولا تتوقفي عن السؤال، نحن فخورون بكِ', 'قراءة ممتعة يا {name}! أينما أخذتكِ مغامراتك، يبقى البيت هنا دائمًا'],
    de: ['Für unseren mutigen {name}: Jede Seite soll dich daran erinnern, wie sehr wir dich lieben. In Liebe, Mama und Papa', 'Lieber {name}, diese Geschichte gehört dir, genau wie unsere Herzen. Strahle weiter, kleiner Stern.', 'Für {name}: Träume groß, sei freundlich und hör nie auf, Fragen zu stellen. Wir sind so stolz auf dich.', 'Viel Spaß beim Lesen, {name}! Wohin dich deine Abenteuer auch führen, hier ist immer dein Zuhause.'],
    de_girl: ['Für unsere mutige {name}: Jede Seite soll dich daran erinnern, wie sehr wir dich lieben. In Liebe, Mama und Papa', 'Liebe {name}, diese Geschichte gehört dir, genau wie unsere Herzen. Strahle weiter, kleiner Stern.', 'Für {name}: Träume groß, sei freundlich und hör nie auf, Fragen zu stellen. Wir sind so stolz auf dich.', 'Viel Spaß beim Lesen, {name}! Wohin dich deine Abenteuer auch führen, hier ist immer dein Zuhause.'],
    zh: ['致勇敢的{name}：愿每一页都提醒你，我们有多么爱你。爱你的妈妈和爸爸', '亲爱的{name}，这个故事属于你，就像我们的心一样。继续闪耀吧，小星星。', '给{name}：勇敢做梦，善良待人，永远不要停止提问。我们为你感到骄傲。', '{name}，阅读愉快！无论你的冒险带你去哪里，家永远在这里。'],
    ru: ['{name}, наш смелый герой! Пусть каждая страница напоминает тебе, как сильно мы тебя любим. С любовью, мама и папа', 'Дорогой {name}, эта история твоя, как и наши сердца. Сияй и дальше, маленькая звёздочка.', '{name}, мечтай смело, будь добрым и никогда не переставай задавать вопросы. Мы так гордимся тобой!', 'Приятного чтения, {name}! Куда бы ни привели тебя приключения, дом всегда здесь.'],
    ru_girl: ['{name}, наша смелая героиня! Пусть каждая страница напоминает тебе, как сильно мы тебя любим. С любовью, мама и папа', 'Дорогая {name}, эта история твоя, как и наши сердца. Сияй и дальше, маленькая звёздочка.', '{name}, мечтай смело, будь доброй и никогда не переставай задавать вопросы. Мы так гордимся тобой!', 'Приятного чтения, {name}! Куда бы ни привели тебя приключения, дом всегда здесь.'],
  };
  var HERO = { en: 'our little hero', ar: 'بطلنا', ar_girl: 'بطلتنا', de: 'unser kleiner Held', de_girl: 'unsere kleine Heldin', zh: '我们的小英雄', ru: 'наш маленький герой', ru_girl: 'наша маленькая героиня' };
  function ideas(code, gender) { code = norm(code); return (gender === 'girl' && IDEAS[code + '_girl']) || IDEAS[code]; }
  function hero(code, gender) { code = norm(code); return (gender === 'girl' && HERO[code + '_girl']) || HERO[code]; }
  // Example shown inside the empty message box, in the book's language.
  function placeholder(code, name, gender) {
    var first = ideas(code, gender)[0].replace('{name}', name || hero(code, gender));
    return (siteLang() === 'ar' ? 'مثال: ' : 'e.g. ') + first;
  }
  // "The book is in German, so please write the message in German." in the site's language.
  function msgRule(code, ui) {
    ui = ui || siteLang(); var n = label(code, ui);
    return ui === 'ar' ? 'الكتاب باللغة ' + n + '، لذا اكتبوا الرسالة باللغة ' + n + ' فقط' : 'This book is in ' + n + ', so please write the message in ' + n + ' only.';
  }
  function msgError(code, ui, short) {
    ui = ui || siteLang(); var n = label(code, ui);
    if (short) return ui === 'ar' ? 'هذا الكتاب باللغة ' + n + '، لذا يجب أن تكون الرسالة باللغة ' + n + ' أيضًا' : 'This book is in ' + n + ', so the message must be written in ' + n + ' too.';
    return ui === 'ar'
      ? 'الكتاب باللغة ' + n + '، لذلك يجب أن تكون رسالة الصفحة الأولى باللغة ' + n + ' أيضًا، يرجى إعادة كتابتها أو استخدام "ألهمني"'
      : 'The book is in ' + n + ', so the first-page message must be written in ' + n + ' too. Please rewrite it in ' + n + ', or use "Inspire me".';
  }
  function nameError(code, ui) {
    ui = ui || siteLang(); var n = label(code, ui);
    return ui === 'ar' ? 'الكتاب باللغة ' + n + '، لذا يجب كتابة اسم الطفل باللغة ' + n : 'This book is in ' + n + ', so the child\'s name must be written in ' + n + '.';
  }
  // Fill a <select> with every book language (keeps the current value when it is still valid).
  function fillSelect(sel, ui) {
    if (!sel) return;
    var cur = sel.value;
    sel.innerHTML = CODES.map(function (c) { return '<option value="' + c + '" lang="' + c + '">' + optionLabel(c, ui).replace(/</g, '&lt;') + '</option>'; }).join('');
    sel.value = LANGS[cur] ? cur : 'en';
  }

  window.HikayaBookLangs = {
    CODES: CODES, LANGS: LANGS, norm: norm, label: label, optionLabel: optionLabel, bookLabel: bookLabel,
    dir: function (c) { return LANGS[norm(c)].dir; }, script: function (c) { return LANGS[norm(c)].script; },
    scriptsIn: scriptsIn, langOfText: langOfText, nameOk: nameOk, msgOk: msgOk, msgScriptOk: msgScriptOk,
    ideas: ideas, hero: hero, placeholder: placeholder, msgRule: msgRule, msgError: msgError, nameError: nameError, fillSelect: fillSelect,
  };
})();
