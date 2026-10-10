// netlify/functions/_templates.js
//
// Every customer-facing email in one place, in English and Arabic.
// Each builder returns { subject, html } ready for sendEmail().
//
// Language: order emails follow the language the customer used on the site
// at checkout (items[].siteLang); older orders fall back to the book language.
// Arabic copy is written without full stops, matching the website.

const { emailShell, ui, esc, etaDays, SITE_URL } = require('./_email');

const COUNTRY = {
  UAE: { en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة' },
  Saudi: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' },
  Qatar: { en: 'Qatar', ar: 'قطر' },
  Kuwait: { en: 'Kuwait', ar: 'الكويت' },
  Bahrain: { en: 'Bahrain', ar: 'البحرين' },
  Oman: { en: 'Oman', ar: 'عُمان' },
};
const countryName = (k, lang) => (COUNTRY[k] ? COUNTRY[k][lang] : (k || ''));
const tr = (lang, en, ar) => (lang === 'ar' ? ar : en);
const firstName = (full, lang) => String(full || '').trim().split(/\s+/)[0] || tr(lang, 'there', '');
const parseItems = order => { try { return Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]'); } catch { return []; } };

/** Which language to write an order's emails in. */
function orderLang(order) {
  const items = parseItems(order);
  const site = items.find(i => i && i.siteLang);
  if (site) return site.siteLang === 'ar' ? 'ar' : 'en';
  return items.length && items.every(i => i && i.bookLanguage === 'ar') ? 'ar' : 'en';
}

function ageText(band, lang) {
  if (!band) return '';
  const [a, b] = String(band).split('-');
  return lang === 'ar' ? `من ${a} إلى ${b || a} سنوات` : `Ages ${a}–${b || a}`;
}
const bookLangText = (l, lang) => (l === 'ar' ? tr(lang, 'Arabic book', 'كتاب بالعربية') : tr(lang, 'English book', 'كتاب بالإنجليزية'));
const trackUrl = no => `${SITE_URL}track-order.html${no ? '?order=' + encodeURIComponent(no) : ''}`;

/* Story titles in Arabic, when the caller has the catalogue (slug -> title_ar). */
function storyTitle(item, lang, arTitles) {
  if (lang === 'ar' && arTitles && item.slug && arTitles[item.slug]) return arTitles[item.slug];
  return item.story || tr(lang, 'Your Hikaya story', 'قصة حكاية');
}

function itemsBlock(items, lang, arTitles, covers) {
  return items.map(i => {
    const meta = [i.childName ? tr(lang, 'For ', 'لـ ') + '<strong>' + esc(i.childName) + '</strong>' : '', ageText(i.ageEdition, lang), bookLangText(i.bookLanguage, lang)].filter(Boolean).join(' &middot; ');
    const cover = (covers && i.slug && covers[i.slug]) || i.coverUrl || null;
    return ui.storyCard(esc(storyTitle(i, lang, arTitles)), meta, cover, lang);
  }).join('');
}

/* ---------------- Order confirmed (after payment, or a free order via code) ---------------- */
function orderConfirmed(order, arTitles, covers) {
  const lang = orderLang(order);
  const items = parseItems(order);
  const first = esc(firstName(order.full_name, lang));
  const no = esc(order.order_number || '');
  const waived = order.payment_status === 'waived';
  const names = [...new Set(items.map(i => i.childName).filter(Boolean))];
  const who = names.length === 1 ? esc(names[0]) : '';
  const days = etaDays(order.country);
  const aed = `AED ${Number(order.charged_aed || 0).toFixed(2)}`;
  const local = !waived && order.currency && order.currency !== 'AED'
    ? `<br><span style="font-weight:normal; color:#7d6a5a;">${tr(lang, 'about', 'حوالي')} <span dir="ltr">${esc(order.currency)} ${esc(order.amount)}</span></span>` : '';
  const paid = waived
    ? tr(lang, `Nothing to pay${order.promo_code ? ` (code ${esc(order.promo_code)})` : ''}`, `لا يوجد مبلغ للدفع${order.promo_code ? ` (الرمز <span dir="ltr">${esc(order.promo_code)}</span>)` : ''}`)
    : `<span dir="ltr">${aed}</span>${local}`;
  // dir="auto" keeps an English address readable inside an Arabic email (and the reverse).
  const address = [order.address, order.city].filter(Boolean).map(x => `<span dir="auto">${esc(x)}</span>`).join('<br>') + (order.country ? `<br>${esc(countryName(order.country, lang))}` : '');

  const subject = tr(lang,
    `Order confirmed${who ? `: ${names[0]}'s Hikaya book` : ''} · ${order.order_number || ''}`,
    `تم تأكيد طلبك${who ? `: كتاب حكاية لـ ${names[0]}` : ''} · ${order.order_number || ''}`);
  const preheader = tr(lang,
    `We're starting on ${who ? names[0] + "'s" : 'their'} book now. Delivery in about ${days} working days.`,
    `بدأنا العمل على كتاب ${who ? names[0] : 'طفلك'} الآن، والتوصيل خلال ${days} أيام عمل تقريبًا`);

  const body = [
    ui.eyebrow(tr(lang, 'Order confirmed', 'تم تأكيد الطلب'), lang),
    ui.h(tr(lang, `Thank you, ${first}!`, `شكرًا لك${first ? ' يا ' + first : ''}!`), lang),
    ui.p(tr(lang,
      `${waived ? 'Your order is confirmed' : 'Your payment went through'} and we're starting on ${who ? `<strong>${who}</strong>'s` : 'their'} storybook now.`,
      `${waived ? 'تم تأكيد طلبك' : 'تمّ الدفع بنجاح'}، وبدأنا العمل على كتاب ${who ? `<strong>${who}</strong>` : 'طفلك'} الآن`), lang),
    itemsBlock(items, lang, arTitles, covers),
    ui.rows([
      [tr(lang, 'Order number', 'رقم الطلب'), `<span dir="ltr">${no}</span>`],
      [tr(lang, waived ? 'Total' : 'Paid', waived ? 'الإجمالي' : 'المبلغ المدفوع'), paid],
      [tr(lang, 'Delivering to', 'عنوان التوصيل'), address],
      [tr(lang, 'Estimated delivery', 'موعد التوصيل المتوقع'), tr(lang, `About ${days} working days, gift-boxed`, `خلال ${days} أيام عمل تقريبًا، في علبة هدية`)],
    ], lang),
    '<div style="height:16px"></div>',
    ui.box(ui.p(tr(lang,
      '<strong>Spotted a mistake?</strong> We print exactly the name, age and photo you sent, and there is no preview step. If anything needs changing, reply to this email as soon as you can. We can update it as long as production hasn\'t started.',
      '<strong>هل لاحظت خطأ؟</strong> نطبع الاسم والعمر والصورة كما أرسلتها تمامًا، ولا توجد مرحلة معاينة، وإذا احتجت إلى أي تعديل فردّ على هذا البريد بأسرع وقت، ويمكننا التعديل ما دام الإنتاج لم يبدأ'), lang, true).replace('margin:0 0 14px', 'margin:0')),
    ui.button(trackUrl(order.order_number), tr(lang, 'Track your order &rarr;', 'تتبّع طلبك &larr;'), lang),
    ui.sign(lang),
  ].join('');
  return { subject, html: emailShell(body, { lang, preheader }), lang };
}

/* ---------------- Handed to the courier ---------------- */
function orderShipped(order) {
  const lang = orderLang(order);
  const first = esc(firstName(order.full_name, lang));
  const no = esc(order.order_number || '');
  const courier = order.courier ? esc(order.courier) : tr(lang, 'our delivery partner', 'شريك التوصيل');
  const trackBits = [];
  if (order.tracking_number) trackBits.push([tr(lang, 'Tracking number', 'رقم التتبع'), `<span dir="ltr">${esc(order.tracking_number)}</span>`]);
  if (order.courier) trackBits.push([tr(lang, 'Courier', 'شركة التوصيل'), courier]);
  const body = [
    ui.eyebrow(tr(lang, 'On its way', 'في الطريق إليك'), lang),
    ui.h(tr(lang, `It's on its way, ${first}!`, `كتابك في الطريق${first ? ' يا ' + first : ''}!`), lang),
    ui.p(tr(lang,
      `Your personalised Hikaya book (order <strong dir="ltr">${no}</strong>) is gift-boxed and now with ${courier}. It should reach you within a few working days.`,
      `كتاب حكاية المخصّص لك (طلب رقم <strong dir="ltr">${no}</strong>) في علبة الهدية الآن ومع ${courier}، ومن المتوقع أن يصلك خلال أيام عمل قليلة`), lang),
    trackBits.length ? ui.rows(trackBits, lang) + '<div style="height:12px"></div>' : '',
    order.tracking_url
      ? ui.button(order.tracking_url, tr(lang, 'Track the delivery &rarr;', 'تتبّع الشحنة &larr;'), lang)
      : ui.button(trackUrl(order.order_number), tr(lang, 'Track your order &rarr;', 'تتبّع طلبك &larr;'), lang),
    ui.sign(lang),
  ].join('');
  return {
    subject: tr(lang, `Your Hikaya book is on its way · ${order.order_number || ''}`, `كتاب حكاية في الطريق إليك · ${order.order_number || ''}`),
    html: emailShell(body, { lang, preheader: tr(lang, 'Gift-boxed and with the courier now.', 'في علبة الهدية ومع شركة التوصيل الآن') }),
  };
}

/* ---------------- Delivered ---------------- */
function orderDelivered(order) {
  const lang = orderLang(order);
  const first = esc(firstName(order.full_name, lang));
  const no = esc(order.order_number || '');
  const body = [
    ui.eyebrow(tr(lang, 'Delivered', 'تم التوصيل'), lang),
    ui.h(tr(lang, `Delivered, ${first}!`, `تم التوصيل${first ? ' يا ' + first : ''}!`), lang),
    ui.p(tr(lang,
      `Your Hikaya book (order <strong dir="ltr">${no}</strong>) has been delivered. We hope it becomes a bedtime favourite.`,
      `تم توصيل كتاب حكاية (طلب رقم <strong dir="ltr">${no}</strong>)، ونتمنى أن يصبح قصة ما قبل النوم المفضّلة`), lang),
    ui.p(tr(lang,
      'If anything isn\'t perfect, reply to this email and a real person will put it right.',
      'إذا لم يكن أي شيء كما توقعت، فردّ على هذا البريد وسيساعدك شخص من فريقنا'), lang),
    ui.p(tr(lang,
      'Loved it? A photo of the moment they saw their name, or a few words about it, would mean the world to us.',
      'هل أحببتموه؟ صورة للحظة رؤيتهم لاسمهم، أو بضع كلمات عن التجربة، تعني لنا الكثير'), lang, true),
    ui.sign(lang),
  ].join('');
  return {
    subject: tr(lang, `Delivered: your Hikaya book · ${order.order_number || ''}`, `تم التوصيل: كتاب حكاية · ${order.order_number || ''}`),
    html: emailShell(body, { lang, preheader: tr(lang, 'Their story has arrived.', 'وصلت قصتهم') }),
  };
}

/* ---------------- Abandoned checkout reminder ---------------- */
function cartReminder(cart) {
  // No language is stored for abandoned carts, so an Arabic child name means an Arabic email.
  const lang = cart.lang === 'ar' || (!cart.lang && /[\u0600-\u06FF]/.test(String(cart.child_name || ''))) ? 'ar' : 'en';
  const child = cart.child_name ? esc(cart.child_name) : '';
  const story = cart.story ? esc(cart.story) : '';
  const link = `${SITE_URL}cart.html`;
  const body = [
    ui.eyebrow(tr(lang, 'Saved for you', 'محفوظة لك'), lang),
    ui.h(tr(lang, `${child ? child + "'s" : 'Their'} story is still waiting`, `قصة ${child || 'طفلك'} ما زالت بانتظارك`), lang),
    ui.p(tr(lang,
      `You started a personalised storybook${story ? ` (<strong>${story}</strong>)` : ''}${child ? ` for <strong>${child}</strong>` : ''}. If it's still in your cart on the same device, you can pick up right where you left off.`,
      `بدأت بإنشاء كتاب قصص مخصّص${story ? ` (<strong>${story}</strong>)` : ''}${child ? ` لـ <strong>${child}</strong>` : ''}، وإذا كان ما زال في سلّتك على الجهاز نفسه فيمكنك المتابعة من حيث توقفت`), lang),
    ui.button(link, tr(lang, 'Finish their story &rarr;', 'أكمل قصتهم &larr;'), lang),
    ui.p(tr(lang,
      'Gift packaging is always included. Questions about photos or delivery? Just reply.',
      'علبة الهدية مشمولة دائمًا، ولأي سؤال عن الصور أو التوصيل ردّ على هذا البريد'), lang, true),
    ui.p(tr(lang,
      'Changed your mind? No problem, you can ignore this email and we won\'t send another.',
      'غيّرت رأيك؟ لا مشكلة، تجاهل هذا البريد ولن نرسل غيره'), lang, true),
  ].join('');
  return {
    subject: tr(lang, `${cart.child_name ? cart.child_name + "'s" : 'Your'} Hikaya story is waiting`, `قصة حكاية ${cart.child_name ? 'لـ ' + cart.child_name : ''} بانتظارك`.replace('  ', ' ')),
    html: emailShell(body, { lang, preheader: tr(lang, 'It only takes a minute to finish.', 'لن يستغرق إكمالها أكثر من دقيقة') }),
  };
}

/* ---------------- Contact form: auto-reply to the customer ---------------- */
function contactReceived({ name, message, orderNumber, lang }) {
  lang = lang === 'ar' ? 'ar' : 'en';
  const first = esc(firstName(name, lang));
  const body = [
    ui.eyebrow(tr(lang, 'Message received', 'وصلتنا رسالتك'), lang),
    ui.h(tr(lang, `Thanks, ${first}!`, `شكرًا لك${first ? ' يا ' + first : ''}!`), lang),
    ui.p(tr(lang,
      'We\'ve got your message and a real person will reply, usually within one working day.',
      'وصلتنا رسالتك، وسيردّ عليك شخص من فريقنا عادةً خلال يوم عمل واحد'), lang),
    ui.box(`${orderNumber ? ui.p(`${tr(lang, 'Order', 'الطلب')}: <strong dir="ltr">${esc(orderNumber)}</strong>`, lang, true) : ''}<div style="font-family:Arial,sans-serif; font-size:13.5px; line-height:1.6; color:#5b4a3d; white-space:pre-wrap;">${esc(message)}</div>`),
    ui.p(tr(lang, 'Need something quickly? WhatsApp is the fastest way to reach us.', 'تحتاج ردًا سريعًا؟ واتساب هو أسرع طريقة للتواصل معنا'), lang, true),
    ui.sign(lang),
  ].join('');
  return {
    subject: tr(lang, 'We got your message · Hikaya by Maison Jaber', 'وصلتنا رسالتك · حكاية من ميزون جابر'),
    html: emailShell(body, { lang, preheader: tr(lang, 'We usually reply within one working day.', 'نردّ عادةً خلال يوم عمل واحد') }),
  };
}


/* ---------------- Welcome (first sign-in) ---------------- */
function welcome({ name, lang }) {
  lang = lang === 'ar' ? 'ar' : 'en';
  const first = esc(firstName(name, lang));
  const step = (n, t, d) => `<tr><td width="34" style="width:34px; vertical-align:top; padding:2px 0 12px;"><div style="width:26px; height:26px; line-height:26px; border-radius:13px; background:#8A5638; color:#FFFCF7; text-align:center; font-family:Manrope,Arial,sans-serif; font-size:13px; font-weight:700;">${n}</div></td><td style="vertical-align:top; padding:2px 0 12px; font-family:${lang === 'ar' ? 'Cairo,Tahoma,Arial,sans-serif' : 'Manrope,Arial,sans-serif'}; font-size:14.5px; line-height:1.55; color:#5E4A3D;"><strong style="color:#261C17;">${t}</strong><br>${d}</td></tr>`;
  const body = [
    ui.eyebrow(tr(lang, 'Welcome to Hikaya', 'أهلًا بك في حكاية'), lang),
    ui.h(tr(lang, first ? `Welcome, ${first}!` : 'Welcome!', first ? `أهلًا بك يا ${first}!` : 'أهلًا بك!'), lang),
    ui.p(tr(lang,
      'Your Hikaya account is ready. It keeps your orders and delivery details in one place, so you can track every book and reorder in a few taps.',
      'حسابك في حكاية جاهز، ويحفظ طلباتك وبيانات التوصيل في مكان واحد، لتتابع كل كتاب وتطلب من جديد بخطوات قليلة'), lang),
    ui.box(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${step(1, tr(lang, 'Choose their story', 'اختر قصتهم'), tr(lang, 'Pick the adventure that feels right for your child.', 'اختر المغامرة المناسبة لطفلك'))}
      ${step(2, tr(lang, 'Make it theirs', 'اجعلها قصتهم'), tr(lang, 'Add their name, age and one clear photo.', 'أضف الاسم والعمر وصورة واحدة واضحة'))}
      ${step(3, tr(lang, 'We create, print and gift-box it', 'نصنعه ونطبعه ونغلّفه'), tr(lang, 'A keepsake hardcover, delivered across the UAE and GCC.', 'كتاب بغلاف مقوّى للذكرى، يصل إلى الإمارات ودول الخليج'))}
    </table>`),
    ui.p(tr(lang,
      'Ordering for siblings? Two books get 10% off each and free delivery, three or more get 15% off.',
      'تطلب للإخوة؟ كتابان بخصم 10% لكل كتاب وتوصيل مجاني، و3 كتب أو أكثر بخصم 15%'), lang, true),
    ui.button(`${SITE_URL}stories.html`, tr(lang, 'Explore the stories &rarr;', 'تصفّح القصص &larr;'), lang),
    ui.sign(lang),
  ].join('');
  return {
    subject: tr(lang, 'Welcome to Hikaya', 'أهلًا بك في حكاية'),
    html: emailShell(body, { lang, preheader: tr(lang, 'Your account is ready. Here is how it works.', 'حسابك جاهز، وهذه طريقة عمل حكاية') }),
  };
}

/* ---------------- Payment did not go through ---------------- */
function paymentNotCompleted(order) {
  const lang = orderLang(order);
  const first = esc(firstName(order.full_name, lang));
  const items = parseItems(order);
  const names = [...new Set(items.map(i => i.childName).filter(Boolean))];
  const who = names.length === 1 ? esc(names[0]) : '';
  const body = [
    ui.eyebrow(tr(lang, 'Payment not completed', 'لم يكتمل الدفع'), lang),
    ui.h(tr(lang, `Your book is saved, ${first}`, `كتابك محفوظ${first ? ' يا ' + first : ''}`), lang),
    ui.p(tr(lang,
      `Your payment for order <strong dir="ltr">${esc(order.order_number || '')}</strong> didn't go through, so you have not been charged and nothing has been printed${who ? ` for <strong>${who}</strong>` : ''}.`,
      `لم يكتمل الدفع للطلب رقم <strong dir="ltr">${esc(order.order_number || '')}</strong>، لذلك لم نخصم أي مبلغ ولم نبدأ الطباعة${who ? ` لكتاب <strong>${who}</strong>` : ''}`), lang),
    ui.p(tr(lang,
      'If the book is still in your cart on the same device, you can try again in a minute. Card, Apple Pay and Google Pay all work.',
      'إذا كان الكتاب ما زال في سلّتك على الجهاز نفسه فيمكنك المحاولة مجددًا خلال دقيقة، ويمكنك الدفع بالبطاقة أو Apple Pay أو Google Pay'), lang),
    ui.button(`${SITE_URL}cart.html`, tr(lang, 'Try again &rarr;', 'حاول مرة أخرى &larr;'), lang),
    ui.p(tr(lang,
      'Having trouble paying? Reply to this email or message us on WhatsApp and we will sort it out with you.',
      'تواجه مشكلة في الدفع؟ ردّ على هذا البريد أو راسلنا على واتساب وسنساعدك'), lang, true),
    ui.sign(lang),
  ].join('');
  return {
    subject: tr(lang, `Your payment didn't go through · ${order.order_number || ''}`, `لم يكتمل الدفع · ${order.order_number || ''}`),
    html: emailShell(body, { lang, preheader: tr(lang, 'You have not been charged. Your book details are saved.', 'لم نخصم أي مبلغ، وتفاصيل كتابك محفوظة') }),
  };
}

/* ---------------- In production (sent to printing) ---------------- */
function orderPrinting(order) {
  const lang = orderLang(order);
  const first = esc(firstName(order.full_name, lang));
  const body = [
    ui.eyebrow(tr(lang, 'Now printing', 'قيد الطباعة'), lang),
    ui.h(tr(lang, `Their book is at the printer, ${first}`, `كتابهم في المطبعة الآن${first ? ' يا ' + first : ''}`), lang),
    ui.p(tr(lang,
      `The illustrations for order <strong dir="ltr">${esc(order.order_number || '')}</strong> are finished and the hardcover is being printed. Next we check every page, gift-box it and hand it to the courier.`,
      `انتهينا من رسومات الطلب رقم <strong dir="ltr">${esc(order.order_number || '')}</strong>، والكتاب قيد الطباعة الآن، وبعدها نراجع كل صفحة ونغلّفه في علبة الهدية ونسلّمه لشركة التوصيل`), lang),
    ui.button(trackUrl(order.order_number), tr(lang, 'Track your order &rarr;', 'تتبّع طلبك &larr;'), lang),
    ui.sign(lang),
  ].join('');
  return {
    subject: tr(lang, `Now printing: your Hikaya book · ${order.order_number || ''}`, `قيد الطباعة: كتاب حكاية · ${order.order_number || ''}`),
    html: emailShell(body, { lang, preheader: tr(lang, 'The illustrations are done. Gift-boxing comes next.', 'انتهت الرسومات، والتغليف هو الخطوة التالية') }),
  };
}

/* ---------------- Cancelled / refunded ---------------- */
function orderCancelled(order, refunded) {
  const lang = orderLang(order);
  const first = esc(firstName(order.full_name, lang));
  const no = esc(order.order_number || '');
  const body = [
    ui.eyebrow(tr(lang, refunded ? 'Refund issued' : 'Order cancelled', refunded ? 'تم استرداد المبلغ' : 'تم إلغاء الطلب'), lang),
    ui.h(tr(lang, `Hi ${first},`, first ? `مرحبًا ${first}،` : 'مرحبًا،'), lang),
    ui.p(refunded
      ? tr(lang,
        `We've refunded <strong dir="ltr">AED ${Number(order.charged_aed || 0).toFixed(2)}</strong> for order <strong dir="ltr">${no}</strong> to your original payment method. Depending on your bank it usually appears within 5–10 business days.`,
        `أعدنا مبلغ <strong dir="ltr">AED ${Number(order.charged_aed || 0).toFixed(2)}</strong> للطلب رقم <strong dir="ltr">${no}</strong> إلى وسيلة الدفع الأصلية، ويظهر عادةً خلال 5 إلى 10 أيام عمل حسب البنك`)
      : tr(lang,
        `Your order <strong dir="ltr">${no}</strong> has been cancelled. If you paid for it, we will let you know as soon as the refund is on its way.`,
        `تم إلغاء طلبك رقم <strong dir="ltr">${no}</strong>، وإذا كنت قد دفعت ثمنه فسنخبرك فور إرسال المبلغ المسترد`), lang),
    ui.p(tr(lang,
      'If this wasn\'t what you expected, reply to this email and we\'ll look into it straight away.',
      'إذا لم يكن هذا ما توقعته فردّ على هذا البريد وسنتابع الأمر فورًا'), lang),
    ui.sign(lang),
  ].join('');
  return {
    subject: tr(lang, `${refunded ? 'Refund issued' : 'Order cancelled'} · ${order.order_number || ''}`, `${refunded ? 'تم استرداد المبلغ' : 'تم إلغاء الطلب'} · ${order.order_number || ''}`),
    html: emailShell(body, { lang, preheader: tr(lang, refunded ? 'Your refund is on its way.' : 'Your order has been cancelled.', refunded ? 'المبلغ المسترد في الطريق إليك' : 'تم إلغاء طلبك') }),
  };
}

module.exports = { welcome, paymentNotCompleted, orderPrinting, orderCancelled, orderConfirmed, orderShipped, orderDelivered, cartReminder, contactReceived, orderLang, parseItems, countryName };
