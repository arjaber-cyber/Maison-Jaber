// netlify/functions/_bookLangs.js
//
// Server copy of the book-language rules in /book-langs.js (keep the two in step).
// A book can be printed in English, Arabic, German, Mandarin Chinese or Russian.
// The child's name and the first-page message must be written in the book's own letters.

const AR = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const LATIN = /[A-Za-zÀ-ɏḀ-ỿ]/;
const CYR = /[Ѐ-ӿԀ-ԯ]/;
const HAN = /[㐀-䶿一-鿿豈-﫿]/;
const SCRIPTS = { latin: LATIN, arabic: AR, cyrillic: CYR, han: HAN };

const LANGS = {
  en: { script: 'latin', en: 'English', ar: 'الإنجليزية' },
  ar: { script: 'arabic', en: 'Arabic', ar: 'العربية' },
  de: { script: 'latin', en: 'German', ar: 'الألمانية' },
  zh: { script: 'han', en: 'Mandarin Chinese', ar: 'الصينية (الماندرين)' },
  ru: { script: 'cyrillic', en: 'Russian', ar: 'الروسية' },
};
const CODES = Object.keys(LANGS);

// Anything unknown is treated as English (old carts and orders only ever had 'en' / 'ar').
const normBookLang = l => (LANGS[l] ? l : 'en');
const bookLangName = (l, ui) => LANGS[normBookLang(l)][ui === 'ar' ? 'ar' : 'en'];
const bookLangText = (l, ui) => (ui === 'ar' ? 'كتاب ب' + bookLangName(l, 'ar') : bookLangName(l, 'en') + ' book');

function scriptsIn(s) {
  s = String(s || '');
  return Object.keys(SCRIPTS).filter(k => SCRIPTS[k].test(s));
}
function nameInBookLang(l, name) {
  const sc = scriptsIn(name);
  return sc.length === 1 && sc[0] === LANGS[normBookLang(l)].script;
}
function msgInBookLang(l, msg) {
  const own = LANGS[normBookLang(l)].script;
  return scriptsIn(msg).every(s => s === own);
}

module.exports = { CODES, LANGS, normBookLang, bookLangName, bookLangText, nameInBookLang, msgInBookLang, scriptsIn };
