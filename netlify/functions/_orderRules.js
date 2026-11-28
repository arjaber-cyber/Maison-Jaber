// netlify/functions/_orderRules.js
//
// Rules every order must pass on the server (the checkout page checks the same things,
// but the server is the one that cannot be skipped):
//  - the customer confirmed the information they shared is correct
//  - every book has photo permission (use for this book only, deleted within 15 days), unless the
//    parent chose to add the photo after ordering (photoLater): permission is then asked on upload
//  - the name printed in the book and the first-page message are in the book's language:
//    an Arabic book is never accepted with an English name or an English message, and vice versa.
//    Since Nov 2026 the same goes for German, Mandarin Chinese and Russian books (see _bookLangs.js).

const { normBookLang, bookLangName, nameInBookLang, msgInBookLang } = require('./_bookLangs');

function checkOrderRules(o) {
  if (!o || o.infoConfirmed !== true) {
    return { error: 'Please confirm that the information you shared is correct before placing the order.', reason: 'info_not_confirmed' };
  }
  const items = Array.isArray(o.items) ? o.items : [];
  for (const i of items) {
    if (i.photoConsent !== true && i.photoLater !== true) {
      return { error: 'Please give permission to use the photo for each book. Remove the book from your cart and add it again.', reason: 'photo_consent' };
    }
    // Completely Customised Story: the story brief and the first-page welcome note are both required.
    if (i.slug === 'completely-customised-story') {
      if (String(i.storyBrief || '').trim().length < 20) return { error: 'Please write a short brief of the story you would like (a few sentences).', reason: 'brief_missing' };
      if (!String(i.dedication || '').trim()) return { error: 'Please write the welcome note for the first page of the customised story.', reason: 'note_missing' };
    }
    const name = String(i.childName || '');
    const msg = String(i.dedication || '');
    const lang = normBookLang(i.bookLanguage), ln = bookLangName(lang, 'en');
    if (!nameInBookLang(lang, name)) return { error: `This book is in ${ln}, so the child's name must be written in ${ln}.`, reason: 'name_lang' };
    if (!msgInBookLang(lang, msg)) return { error: `This book is in ${ln}, so the first-page message must be written in ${ln}.`, reason: 'msg_lang' };
  }
  return null;
}

module.exports = { checkOrderRules };
