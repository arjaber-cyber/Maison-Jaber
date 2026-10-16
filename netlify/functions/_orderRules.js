// netlify/functions/_orderRules.js
//
// Rules every order must pass on the server (the checkout page checks the same things,
// but the server is the one that cannot be skipped):
//  - the customer confirmed the information they shared is correct
//  - every book has photo permission (use for this book only, deleted within 15 days)
//  - the name printed in the book and the first-page message are in the book's language:
//    an Arabic book is never accepted with an English name or an English message, and vice versa

const AR = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;

function checkOrderRules(o) {
  if (!o || o.infoConfirmed !== true) {
    return { error: 'Please confirm that the information you shared is correct before placing the order.', reason: 'info_not_confirmed' };
  }
  const items = Array.isArray(o.items) ? o.items : [];
  for (const i of items) {
    if (i.photoConsent !== true) {
      return { error: 'Please give permission to use the photo for each book. Remove the book from your cart and add it again.', reason: 'photo_consent' };
    }
    const name = String(i.childName || '');
    const msg = String(i.dedication || '');
    if (i.bookLanguage === 'ar') {
      if (!AR.test(name) || LATIN.test(name)) return { error: 'This book is in Arabic, so the child\'s name must be written in Arabic.', reason: 'name_lang' };
      if (LATIN.test(msg)) return { error: 'This book is in Arabic, so the first-page message must be written in Arabic.', reason: 'msg_lang' };
    } else {
      if (!LATIN.test(name) || AR.test(name)) return { error: 'This book is in English, so the child\'s name must be written in English.', reason: 'name_lang' };
      if (AR.test(msg)) return { error: 'This book is in English, so the first-page message must be written in English.', reason: 'msg_lang' };
    }
  }
  return null;
}

module.exports = { checkOrderRules };
