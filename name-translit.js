/* name-translit.js — instant spelling of a child's first name in the book language.
   window.hkNameSuggest(name, 'ar' | 'en') -> { name, sure }
     sure = true  : found in the name list below (common Gulf spelling)
     sure = false : letter-by-letter guess (the AI suggestion is preferred when available)
   The parent always sees the result in the confirm pop-up and can edit it before it is used. */
(function () {
  // Arabic spelling : English spellings (first one is the preferred English spelling)
  var DATA = [
    // Boys — Arabic / Gulf
    'محمد:Mohammed,Muhammad,Mohamed,Mohammad,Mohamad,Muhamed,Muhammed,Mohd',
    'أحمد:Ahmed,Ahmad,Ahamed', 'محمود:Mahmoud,Mahmood,Mahmud', 'حمد:Hamad', 'حمدان:Hamdan', 'حامد:Hamed,Hamid',
    'خالد:Khalid,Khaled', 'سعود:Saud,Saoud', 'سعد:Saad,Sad', 'سعيد:Saeed,Said,Saed', 'سلطان:Sultan,Soltan',
    'منصور:Mansour,Mansoor,Mansur', 'راشد:Rashed,Rashid', 'زايد:Zayed,Zaid,Zayid', 'زيد:Zaid,Zayd,Zeid',
    'ماجد:Majed,Majid', 'فيصل:Faisal,Faysal,Feisal', 'فهد:Fahad,Fahd', 'ناصر:Nasser,Naser,Nasir', 'نواف:Nawaf',
    'تركي:Turki,Torki', 'بندر:Bandar,Bander', 'عبدالله:Abdullah,Abdallah,Abdulla,Abdalla', 'عبدالرحمن:Abdulrahman,Abdelrahman,Abdurrahman,Abdalrahman',
    'عبدالعزيز:Abdulaziz,Abdelaziz', 'عبدالرزاق:Abdulrazak,Abdulrazzaq,Abdulrazaq,Abdelrazak', 'عبدالكريم:Abdulkarim,Abdelkarim,Abdulkareem',
    'عبدالملك:Abdulmalik,Abdelmalek', 'عبدالرحيم:Abdulrahim,Abdulraheem', 'عبدالمجيد:Abdulmajeed,Abdulmajid',
    'عمر:Omar,Umar', 'عمرو:Amr,Amro', 'علي:Ali', 'حسن:Hassan,Hasan', 'حسين:Hussein,Hussain,Husain,Hossein',
    'يوسف:Yousef,Youssef,Yusuf,Yousif,Joseph', 'إبراهيم:Ibrahim,Ebrahim,Abraham', 'إسماعيل:Ismail,Ismael',
    'آدم:Adam,Aadam', 'نوح:Noah,Nuh,Nooh', 'موسى:Musa,Mousa,Moussa,Moses', 'عيسى:Eisa,Isa,Issa', 'يحيى:Yahya,Yehia',
    'زكريا:Zakaria,Zakariya,Zakariyya', 'سليمان:Suliman,Sulaiman,Soliman,Sulayman,Suleiman', 'داود:Dawood,Dawud,Daoud,David',
    'هادي:Hadi,Haadi', 'مهدي:Mahdi,Mehdi', 'كريم:Karim,Kareem', 'رامي:Rami', 'سامي:Sami,Samy', 'هاني:Hani',
    'جاد:Jad', 'جود:Joud,Jood', 'تميم:Tamim,Tameem', 'ريان:Rayan,Rayyan,Ryan', 'إياد:Iyad,Eyad', 'زياد:Ziad,Ziyad',
    'مازن:Mazen,Mazin', 'باسل:Basel,Basil', 'بسام:Bassam', 'وليد:Waleed,Walid', 'خليفة:Khalifa,Khalifah',
    'مبارك:Mubarak', 'جاسم:Jassim,Jasim,Jassem', 'جابر:Jaber,Jabir', 'جمال:Jamal', 'كمال:Kamal', 'طارق:Tariq,Tarek,Tarik',
    'ياسر:Yasser,Yaser,Yasir', 'ياسين:Yassin,Yasin,Yaseen', 'أنس:Anas', 'معاذ:Muath,Moaz,Muadh,Moaaz', 'مالك:Malik,Malek',
    'سيف:Saif,Seif,Sayf', 'غيث:Ghaith,Ghayth', 'ليث:Laith,Layth,Leith', 'فارس:Fares,Faris', 'حمزة:Hamza,Hamzah',
    'صالح:Saleh,Salih', 'سالم:Salem,Salim', 'سلمان:Salman', 'عثمان:Othman,Osman,Uthman', 'بلال:Bilal,Belal',
    'عادل:Adel,Adil', 'هشام:Hisham,Hesham', 'عمار:Ammar', 'مصطفى:Mustafa,Mostafa', 'مراد:Murad,Mourad',
    'نزار:Nizar', 'وائل:Wael,Wail', 'أمير:Amir,Ameer', 'إلياس:Elias,Ilyas,Elyas', 'جبريل:Jibril,Gabriel',
    'راكان:Rakan', 'ريان:Riyan', 'عزام:Azzam', 'مشعل:Mishal,Meshal', 'ذياب:Thiyab,Dhiyab,Diab', 'شهاب:Shihab,Shehab',
    'نايف:Naif,Nayef', 'حارث:Harith,Hareth', 'قاسم:Qasim,Kassem,Qassim', 'أيمن:Ayman', 'أسامة:Osama,Usama',
    'عمران:Imran,Omran', 'نبيل:Nabil,Nabeel', 'رائد:Raed', 'ماهر:Maher', 'مروان:Marwan', 'حازم:Hazem',
    // Girls — Arabic / Gulf
    'فاطمة:Fatima,Fatma,Fatimah', 'مريم:Maryam,Mariam,Miriam,Mariem', 'عائشة:Aisha,Ayesha,Aysha,Aischa,Aicha',
    'نور:Noor,Nour,Nur', 'سارة:Sara,Sarah', 'ليلى:Layla,Leila,Laila,Lila', 'لين:Leen,Lin,Lean', 'لانا:Lana',
    'ليان:Layan,Lian,Liyan', 'جنى:Jana,Janah', 'جنا:Janna', 'رهف:Rahaf', 'شهد:Shahad', 'حلا:Hala', 'هلا:Halla',
    'دانة:Dana,Danah', 'ديما:Dima,Deema', 'ريم:Reem,Rim', 'رنا:Rana', 'رغد:Raghad', 'رزان:Razan', 'روان:Rawan',
    'ريتاج:Ritaj', 'تالين:Taleen,Talin', 'تالا:Tala', 'تيا:Tia,Tiya', 'ميرا:Mira,Meera', 'ميار:Mayar', 'مايا:Maya,Maia',
    'ميس:Mais,Mays', 'نوف:Nouf,Nuf', 'العنود:Alanoud,Anoud', 'شما:Shamma', 'حصة:Hessa,Hissa,Hussa',
    'موزة:Moza,Mozah', 'ميثاء:Maitha,Meitha', 'اليازية:Alyazia,Yazia,Alyazya', 'سلامة:Salama,Salamah', 'شيخة:Sheikha,Shaikha',
    'خديجة:Khadija,Khadijah', 'زينب:Zainab,Zaynab,Zeinab', 'رقية:Ruqayya,Ruqaya,Roqaya', 'أسماء:Asma,Asmaa',
    'هند:Hind', 'سلمى:Salma', 'جميلة:Jamila,Jameela', 'أمل:Amal', 'هبة:Heba,Hiba', 'آمنة:Amna,Amina,Aminah,Ameena',
    'حنان:Hanan', 'ياسمين:Yasmin,Yasmine,Jasmine,Yasmeen', 'جود:Jude', 'لجين:Lujain,Lujayn', 'لمى:Lama', 'لما:Lamma',
    'غلا:Ghala', 'غادة:Ghada', 'بشرى:Bushra', 'هيا:Haya', 'دلال:Dalal', 'وعد:Waad', 'وجد:Wajd', 'ملك:Malak',
    'جوري:Jori,Jouri,Joury', 'ريما:Rima,Reema', 'سما:Sama', 'سلين:Selin,Seleen', 'سيلين:Celine,Seline', 'سوار:Siwar,Sewar',
    'إيلين:Eileen,Ilin,Aileen', 'لارا:Lara', 'لميس:Lamees,Lamis', 'نادين:Nadine,Nadeen', 'رتاج:Retaj', 'ألما:Alma',
    'نورة:Noura,Nora,Norah', 'منى:Mona,Muna', 'سعاد:Souad,Suad', 'عبير:Abeer,Abir', 'إسراء:Israa,Esraa', 'آلاء:Alaa',
    'رحمة:Rahma,Rahmah', 'سجى:Saja', 'تسنيم:Tasneem,Tasnim', 'جمانة:Jumana,Joumana', 'بتول:Batoul,Batool',
    'زهرة:Zahra,Zahraa', 'فرح:Farah', 'ندى:Nada', 'لؤلؤة:Lulwa,Loulwa', 'مها:Maha', 'هديل:Hadeel,Hadil', 'وفاء:Wafa',
    'أميرة:Amira,Ameera', 'إيمان:Iman,Eman', 'دعاء:Doaa,Duaa,Dua', 'جيهان:Jihan', 'ياسمينة:Yasmina',
    // International names often chosen in the Gulf
    'ليو:Leo', 'ليام:Liam', 'لوكاس:Lucas,Lukas', 'إيثان:Ethan', 'دانيال:Daniel', 'سامر:Samer', 'أليكس:Alex',
    'أليكساندر:Alexander', 'ماكس:Max', 'جاك:Jack', 'هاري:Harry', 'ثيو:Theo', 'أوليفر:Oliver', 'نيكولاس:Nicholas,Nicolas',
    'ميخائيل:Michael', 'جورج:George', 'بيتر:Peter', 'مارك:Mark,Marc', 'كريستيان:Christian', 'لويس:Louis,Luis',
    'إيما:Emma', 'ميا:Mia', 'صوفيا:Sofia,Sophia', 'أوليفيا:Olivia', 'إيلا:Ella', 'آفا:Ava', 'إيفا:Eva', 'آنا:Anna,Ana',
    'كلوي:Chloe', 'غريس:Grace', 'ليلي:Lily,Lilly', 'زوي:Zoe,Zoey', 'إيزابيلا:Isabella', 'روز:Rose', 'نينا:Nina',
    'هانا:Hannah,Hana', 'ميلا:Mila', 'إيميلي:Emily', 'كارلا:Carla', 'جوليا:Julia', 'ماريا:Maria', 'إليانا:Eliana',
  ];

  var AR_RE = /[؀-ۿ]/, LATIN_RE = /[A-Za-z]/;
  function keyLatin(s) {
    return String(s).toLowerCase().replace(/[^a-z]/g, '')
      .replace(/^(al|el)(?=[a-z]{3})/, function (m) { return m; }) // keep "al" prefixes (Alyazia)
      .replace(/ph/g, 'f').replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/ou/g, 'u')
      .replace(/([a-z])\1+/g, '$1').replace(/([aeiou])h$/, '$1');
  }
  function keyArabic(s) {
    return String(s).replace(/[ً-ْـ\s]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة$/, 'ه').replace(/ى$/, 'ي');
  }
  var toAr = {}, toEn = {};
  DATA.forEach(function (row) {
    var i = row.indexOf(':'), ar = row.slice(0, i), en = row.slice(i + 1).split(',');
    en.forEach(function (e) { var k = keyLatin(e); if (k && !toAr[k]) toAr[k] = ar; });
    var ka = keyArabic(ar); if (!toEn[ka]) toEn[ka] = en[0];
  });

  /* ---- letter-by-letter fallback, Latin -> Arabic ---- */
  var DI = [['kh', 'خ'], ['sh', 'ش'], ['gh', 'غ'], ['th', 'ث'], ['dh', 'ذ'], ['ch', 'تش'], ['ph', 'ف'], ['ck', 'ك'], ['qu', 'كو'],
    ['aa', 'ا'], ['ee', 'ي'], ['ii', 'ي'], ['oo', 'و'], ['ou', 'و'], ['uu', 'و'], ['ai', 'اي'], ['ay', 'اي'], ['ei', 'ي'], ['ey', 'ي'], ['au', 'او'], ['aw', 'او'], ['ie', 'ي']];
  var CONS = { b: 'ب', c: 'ك', d: 'د', f: 'ف', g: 'غ', h: 'ه', j: 'ج', k: 'ك', l: 'ل', m: 'م', n: 'ن', p: 'ب', q: 'ق', r: 'ر', s: 'س', t: 'ت', v: 'ف', w: 'و', x: 'كس', y: 'ي', z: 'ز' };
  var VOW = { a: 'ا', e: 'ي', i: 'ي', o: 'و', u: 'و' };
  var INIT = { a: 'أ', e: 'إي', i: 'إي', o: 'أو', u: 'أو' };
  function latinWordToAr(w) {
    w = w.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return '';
    // silent final e (Grace, Rose, Jude) when it follows a consonant
    if (w.length > 3 && /[^aeiou]e$/.test(w)) w = w.slice(0, -1);
    var out = '', i = 0;
    while (i < w.length) {
      var two = w.substr(i, 2), hit = null;
      for (var d = 0; d < DI.length; d++) if (DI[d][0] === two) { hit = DI[d][1]; break; }
      if (hit) {
        if (i === 0 && /^[aeiou]/.test(two)) hit = (two[0] === 'a' ? 'أ' : 'إ') + hit.replace(/^ا/, '');
        out += hit; i += 2; continue;
      }
      var c = w[i], next = w[i + 1] || '';
      if (VOW[c]) {
        if (i === 0) out += INIT[c];
        else if (c === 'a' && i === w.length - 1) out += 'ا';
        else if (c === 'a' && !/[aeiou]/.test(next) && i < w.length - 1 && !/ا$/.test(out)) out += 'ا';
        else if (!/[اوي]$/.test(out) || c !== w[i - 1]) out += VOW[c];
      } else if (c === 'h' && i === w.length - 1 && /[aeiou]/.test(w[i - 1] || '')) {
        // final "ah"/"eh": no letter
      } else if (c === 'c') {
        out += /[eiy]/.test(next) ? 'س' : 'ك';
      } else if (c !== w[i - 1]) {
        out += CONS[c] || '';
      }
      i++;
    }
    return out.replace(/(.)\1+/g, '$1');
  }

  /* ---- letter-by-letter fallback, Arabic -> Latin ---- */
  var AMAP = { 'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'aa', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
    'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
    'ه': 'h', 'ة': 'a', 'ى': 'a', 'ء': '', 'ئ': 'e', 'ؤ': 'o' };
  function arabicWordToLatin(w) {
    w = w.replace(/[ً-ْـ]/g, ''); var out = '';
    for (var i = 0; i < w.length; i++) {
      var c = w[i], prev = out.slice(-1);
      if (c === 'و') out += i === 0 ? 'w' : (/[aeiou]/.test(prev) ? 'w' : 'o');
      else if (c === 'ي') out += i === 0 ? 'y' : (i === w.length - 1 ? 'i' : (/[aeiou]/.test(prev) ? 'y' : 'i'));
      else {
        var m = AMAP[c]; if (m === undefined) continue;
        // add a short "a" between two consonants so the result is readable (Hmd -> Hamad)
        if (m && !/^[aeiou]/.test(m) && prev && !/[aeiouy]/.test(prev)) out += 'a';
        out += m;
      }
    }
    return out.charAt(0).toUpperCase() + out.slice(1);
  }

  function lookup(name, to) {
    if (to === 'ar') {
      var whole = toAr[keyLatin(name)]; if (whole) return whole;
      var parts = name.split(/[\s\-]+/).filter(Boolean);
      if (parts.length > 1 && parts.every(function (p) { return toAr[keyLatin(p)]; })) return parts.map(function (p) { return toAr[keyLatin(p)]; }).join(' ');
      // "Abdul Rahman" / "Abd-Elaziz" written apart
      var joined = toAr[keyLatin(name.replace(/^(abd)[\s\-]?(ul|el|al)?[\s\-]?/i, 'abdul'))]; if (joined) return joined;
      return '';
    }
    var a = toEn[keyArabic(name)]; if (a) return a;
    var ps = name.split(/\s+/).filter(Boolean);
    if (ps.length > 1 && ps.every(function (p) { return toEn[keyArabic(p)]; })) return ps.map(function (p) { return toEn[keyArabic(p)]; }).join(' ');
    return '';
  }

  window.hkNameSuggest = function (name, to) {
    name = String(name || '').trim(); to = to === 'ar' ? 'ar' : 'en';
    if (!name) return { name: '', sure: false };
    if (to === 'ar' && AR_RE.test(name) && !LATIN_RE.test(name)) return { name: name, sure: true };
    if (to === 'en' && LATIN_RE.test(name) && !AR_RE.test(name)) return { name: name, sure: true };
    var hit = lookup(name, to); if (hit) return { name: hit, sure: true };
    var words = name.split(/[\s\-]+/).filter(Boolean);
    var guess = words.map(to === 'ar' ? latinWordToAr : arabicWordToLatin).filter(Boolean).join(' ');
    return { name: guess.slice(0, 20), sure: false };
  };
})();
