/* Hikaya — country code picker for phone numbers (checkout, Nov 2026).
   Customers pick their country from a list (UAE, KSA …) instead of typing +971.
   Country names come from the browser in the page language (Intl.DisplayNames),
   so the list reads naturally in English and Arabic. GCC countries come first.

   window.HikayaPhone.mount(wrapEl, { selectId, defaultIso })
     wrapEl  = <div class="cc-pick"> holding .cc-flag, .cc-code and a <select>
   window.HikayaPhone.compose(iso, local) -> "+971 501234567"
   window.HikayaPhone.split(full)         -> { iso, local } (best guess)
   window.HikayaPhone.validLocal(local)   -> true when 6–14 digits */
(function () {
  var GCC = ['AE', 'SA', 'QA', 'KW', 'BH', 'OM'];
  var RAW = 'AE971,SA966,QA974,KW965,BH973,OM968,AF93,AL355,DZ213,AD376,AO244,AG1268,AR54,AM374,AU61,AT43,AZ994,BS1242,BD880,BB1246,BY375,BE32,BZ501,BJ229,BT975,BO591,BA387,BW267,BR55,BN673,BG359,BF226,BI257,KH855,CM237,CA1,CV238,CF236,TD235,CL56,CN86,CO57,KM269,CG242,CD243,CR506,CI225,HR385,CU53,CY357,CZ420,DK45,DJ253,DM1767,DO1809,EC593,EG20,SV503,GQ240,ER291,EE372,SZ268,ET251,FJ679,FI358,FR33,GA241,GM220,GE995,DE49,GH233,GR30,GD1473,GT502,GN224,GW245,GY592,HT509,HN504,HK852,HU36,IS354,IN91,ID62,IR98,IQ964,IE353,IT39,JM1876,JP81,JO962,KZ7,KE254,KI686,XK383,KG996,LA856,LV371,LB961,LS266,LR231,LY218,LI423,LT370,LU352,MO853,MG261,MW265,MY60,MV960,ML223,MT356,MH692,MR222,MU230,MX52,FM691,MD373,MC377,MN976,ME382,MA212,MZ258,MM95,NA264,NR674,NP977,NL31,NZ64,NI505,NE227,NG234,KP850,MK389,NO47,PK92,PW680,PS970,PA507,PG675,PY595,PE51,PH63,PL48,PT351,PR1787,RO40,RU7,RW250,KN1869,LC1758,VC1784,WS685,SM378,ST239,SN221,RS381,SC248,SL232,SG65,SK421,SI386,SB677,SO252,ZA27,KR82,SS211,ES34,LK94,SD249,SR597,SE46,CH41,SY963,TW886,TJ992,TZ255,TH66,TL670,TG228,TO676,TT1868,TN216,TR90,TM993,TV688,UG256,UA380,GB44,US1,UY598,UZ998,VU678,VA39,VE58,VN84,YE967,ZM260,ZW263';
  var LIST = RAW.split(',').map(function (s) { return { iso: s.slice(0, 2), dial: s.slice(2) }; });
  var BY_ISO = {}; LIST.forEach(function (c) { BY_ISO[c.iso] = c; });

  function lang() { return document.documentElement.lang === 'ar' ? 'ar' : 'en'; }
  function flag(iso) {
    try { return String.fromCodePoint.apply(null, iso.split('').map(function (ch) { return 0x1F1E6 + ch.charCodeAt(0) - 65; })); }
    catch (e) { return ''; }
  }
  function names(l) {
    var dn = null;
    try { dn = new Intl.DisplayNames([l], { type: 'region' }); } catch (e) {}
    return function (iso) { try { return (dn && dn.of(iso)) || iso; } catch (e) { return iso; } };
  }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function compose(iso, local) {
    var raw = String(local || '').trim();
    if (/^(\+|00)/.test(raw)) return '+' + digits(raw.replace(/^00/, ''));
    var c = BY_ISO[iso] || BY_ISO.AE;
    var d = digits(raw).replace(/^0+/, '');
    return d ? '+' + c.dial + ' ' + d : '';
  }
  function split(full) {
    var d = digits(full);
    if (!/^\+|^00/.test(String(full || '').trim())) return { iso: '', local: d };
    d = d.replace(/^00/, '');
    var best = null;
    LIST.forEach(function (c) { if (d.indexOf(c.dial) === 0 && (!best || c.dial.length > best.dial.length)) best = c; });
    if (best && best.dial === '1') best = BY_ISO.US;
    if (best && best.dial === '7') best = BY_ISO.RU;
    if (best && best.dial === '39') best = BY_ISO.IT;
    return best ? { iso: best.iso, local: d.slice(best.dial.length) } : { iso: '', local: d };
  }
  function validLocal(local) {
    var raw = String(local || '').trim();
    var n = /^(\+|00)/.test(raw) ? digits(raw).length - 3 : digits(raw).replace(/^0+/, '').length;
    return n >= 6 && n <= 14;
  }

  function fill(select, keepIso) {
    var l = lang(), nm = names(l);
    var gcc = GCC.map(function (i) { return BY_ISO[i]; });
    var rest = LIST.filter(function (c) { return GCC.indexOf(c.iso) < 0; })
      .map(function (c) { return { c: c, n: nm(c.iso) }; })
      .sort(function (a, b) { return a.n.localeCompare(b.n, l); });
    var opt = function (c, n) { return '<option value="' + c.iso + '">' + flag(c.iso) + ' ' + n + ' (+' + c.dial + ')</option>'; };
    select.innerHTML =
      '<optgroup label="' + (l === 'ar' ? 'دول الخليج' : 'GCC') + '">' + gcc.map(function (c) { return opt(c, nm(c.iso)); }).join('') + '</optgroup>' +
      '<optgroup label="' + (l === 'ar' ? 'كل الدول' : 'All countries') + '">' + rest.map(function (r) { return opt(r.c, r.n); }).join('') + '</optgroup>';
    if (keepIso && BY_ISO[keepIso]) select.value = keepIso;
  }

  function mount(wrap, opts) {
    opts = opts || {};
    var select = wrap.querySelector('select');
    var flagEl = wrap.querySelector('.cc-flag');
    var codeEl = wrap.querySelector('.cc-code');
    function paint() {
      var c = BY_ISO[select.value] || BY_ISO.AE;
      if (flagEl) flagEl.textContent = flag(c.iso);
      if (codeEl) codeEl.textContent = '+' + c.dial;
    }
    fill(select, opts.defaultIso || 'AE');
    if (!select.value) select.value = 'AE';
    paint();
    select.addEventListener('change', paint);
    document.addEventListener('hikaya:langchange', function () { var v = select.value; fill(select, v); paint(); });
    return {
      select: select,
      get iso() { return select.value; },
      set: function (iso) { if (BY_ISO[iso]) { select.value = iso; paint(); } },
      paint: paint
    };
  }

  window.HikayaPhone = { mount: mount, compose: compose, split: split, validLocal: validLocal, flag: flag, byIso: BY_ISO };
})();
