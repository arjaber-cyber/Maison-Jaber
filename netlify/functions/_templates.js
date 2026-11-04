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
/* Private per-order links (orders.tracking_token): open the order or its invoice with no code needed.
   The token is long and random, so only someone who received the email has it. */
const invoiceUrl = o => o && o.tracking_token ? `${SITE_URL}invoice.html?t=${encodeURIComponent(o.tracking_token)}` : `${SITE_URL}track-order.html`;
const trackUrl = o => `${SITE_URL}track-order.html${o && o.tracking_token ? '?t=' + encodeURIComponent(o.tracking_token) : ''}`;

/* Story titles in Arabic, when the caller has the catalogue (slug -> title_ar). */
function storyTitle(item, lang, arTitles) {
  if (lang === 'ar' && arTitles && item.slug && arTitles[item.slug]) return arTitles[item.slug];
  return item.story || tr(lang, 'Your Hikaya story', 'قصة حكاية');
}

function itemsBlock(items, lang, arTitles, covers) {
  return items.map(i => {
    const meta = [i.childName ? tr(lang, 'For ', 'لـ ') + '<strong>' + esc(i.childName) + '</strong>' : '', ageText(i.ageEdition, lang), bookLangText(i.bookLanguage, lang)].filter(Boolean).join(' &middot; ');
    const cover = (covers && i.slug && ((i.bookLanguage === 'ar' && covers[i.slug + ':ar']) || covers[i.slug])) || i.coverUrl || null;
    const msg = i.dedication ? `<br><span style="font-style:italic;">${tr(lang, 'Your message on the first page', 'رسالتك في الصفحة الأولى')}: “${esc(i.dedication)}”</span>` : '';
    return ui.storyCard(esc(storyTitle(i, lang, arTitles)), meta + msg, cover, lang);
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

  const hero = who || tr(lang, 'your little one', 'طفلك');
  const subject = tr(lang,
    `${who ? names[0] + "'s" : 'Your'} story has begun ✦ Order ${order.order_number || ''}`,
    `بدأت ${who ? 'قصة ' + names[0] : 'قصتكم'} ✦ طلب ${order.order_number || ''}`);
  const preheader = tr(lang,
    `Thank you! We're bringing ${who ? names[0] + "'s" : 'their'} storybook to life. It arrives in about ${days} working days.`,
    `شكرًا لك! بدأنا نصنع كتاب ${who ? names[0] : 'طفلك'}، ويصلك خلال ${days} أيام عمل تقريبًا`);

  const body = [
    ui.eyebrow(tr(lang, '✦ Your story has begun', '✦ بدأت الحكاية'), lang),
    ui.h(tr(lang, `Thank you, ${first}!`, `شكرًا لك${first ? ' يا ' + first : ''}!`), lang),
    ui.p(tr(lang,
      `Your order is confirmed, and a little magic is already happening. Our team is now creating ${who ? `<strong>${who}</strong>'s` : 'their'} very own storybook, with ${who ? `<strong>${who}</strong>` : 'them'} as the hero on every page.`,
      `تم تأكيد طلبك وبدأ السحر بالفعل، ويعمل فريقنا الآن على كتاب خاص بـ${who ? `<strong>${who}</strong>` : 'طفلك'}، ليكون البطل في كل صفحة`), lang),
    itemsBlock(items, lang, arTitles, covers),
    ui.rows([
      [tr(lang, 'Order number', 'رقم الطلب'), `<span dir="ltr">${no}</span>`],
      [tr(lang, waived ? 'Total' : 'Paid', waived ? 'الإجمالي' : 'المبلغ المدفوع'), paid],
      [tr(lang, 'Delivering to', 'عنوان التوصيل'), address],
      [tr(lang, 'Arriving in', 'يصلك خلال'), tr(lang, `About ${days} working days, wrapped in our Hikaya gift box`, `${days} أيام عمل تقريبًا، مغلّفًا في علبة هدايا حكاية`)],
    ], lang),
    '<div style="height:6px"></div>',
    ui.box(ui.p(tr(lang,
      `<strong>One quick check ✦</strong> Please make sure ${who ? `<strong>${who}</strong>'s` : 'the'} name and details above look right. Want to change something? Just reply to this email before we start printing and we'll happily fix it.`,
      `<strong>نظرة سريعة ✦</strong> تأكد من أن اسم ${who ? `<strong>${who}</strong>` : 'طفلك'} وبياناته أعلاه صحيحة، وإذا أردت تعديل أي شيء فردّ على هذا البريد قبل أن نبدأ الطباعة وسنعدّله لك بكل سرور`), lang, true).replace('margin:0 0 8px', 'margin:0')),
    waived
      ? ui.button(trackUrl(order), tr(lang, 'Follow your story &rarr;', 'تابع رحلة الكتاب &larr;'), lang)
      : ui.buttons([trackUrl(order), tr(lang, 'Follow your story &rarr;', 'تابع رحلة الكتاب &larr;')], [invoiceUrl(order), tr(lang, 'View invoice', 'عرض الفاتورة')], lang),
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
      : ui.button(trackUrl(order), tr(lang, 'Track your order &rarr;', 'تتبّع طلبك &larr;'), lang),
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
/* ---------------- Abandoned order: ONE reminder, opt-in only (Nov 2026) ----------------
   cartReminder(cart, { resumeUrl, unsubscribeUrl })
   cart = abandoned_carts row (lang, child_name, story, cart_snapshot[]). The resume link rebuilds the
   cart on any device for 7 days; photos stay in private storage and are never in the email. */
function cartReminder(cart, links) {
  const o = links || {};
  const lang = cart.lang === 'ar' || (!cart.lang && /[\u0600-\u06FF]/.test(String(cart.child_name || ''))) ? 'ar' : 'en';
  const items = Array.isArray(cart.cart_snapshot) && cart.cart_snapshot.length
    ? cart.cart_snapshot
    : [{ childName: cart.child_name, story: cart.story }];
  const names = items.map(i => i && i.childName).filter(Boolean);
  const many = items.length > 1;
  const child = !many && names[0] ? esc(names[0]) : '';
  const link = o.resumeUrl || `${SITE_URL}cart.html`;
  const cards = items.slice(0, 4).map(i => {
    const title = esc(String((i && i.story) || '').replace(/\[NAME\]/g, (i && i.childName) || ''));
    const meta = [i && i.childName ? esc(i.childName) : '', i && i.ageEdition ? tr(lang, `Ages ${esc(i.ageEdition)}`, `للأعمار ${esc(i.ageEdition)}`) : '', i && i.bookLanguage ? (i.bookLanguage === 'ar' ? tr(lang, 'Arabic edition', 'النسخة العربية') : tr(lang, 'English edition', 'النسخة الإنجليزية')) : '']
      .filter(Boolean).join(' &middot; ');
    return title ? ui.storyCard(title, meta, i && i.coverUrl, lang) : '';
  }).join('');
  const heading = many
    ? tr(lang, 'Their stories are saved for you', 'قصصهم محفوظة لك')
    : tr(lang, `${child ? child + "'s" : 'Their'} story is saved for you`, `قصة ${child || 'طفلك'} محفوظة لك`);
  const unsub = o.unsubscribeUrl
    ? tr(lang,
      `You asked us to email you a link to finish this order, so this is the only reminder we'll send. <a href="${esc(o.unsubscribeUrl)}" style="color:#8E7A68;">Unsubscribe</a>`,
      `طلبت منا إرسال رابط لإكمال طلبك، وهذا هو التذكير الوحيد الذي سنرسله <a href="${esc(o.unsubscribeUrl)}" style="color:#8E7A68;">إلغاء الاشتراك</a>`)
    : tr(lang, "This is the only reminder we'll send.", 'هذا هو التذكير الوحيد الذي سنرسله');
  const body = [
    ui.eyebrow(tr(lang, 'Saved for you', 'محفوظة لك'), lang),
    ui.h(heading, lang),
    ui.p(tr(lang,
      "Everything you added is safe: the story, the name, the age and your message. Pick up exactly where you left off, on this device or any other.",
      'كل ما أضفته محفوظ: القصة والاسم والعمر ورسالتك، تابع من حيث توقفت على هذا الجهاز أو أي جهاز آخر'), lang),
    cards,
    ui.button(link, tr(lang, 'Finish my order &rarr;', 'أكمل طلبي &larr;'), lang),
    ui.p(tr(lang,
      'Gift packaging is always included. This private link works for 7 days. Photos stay in our secure storage and are deleted 15 days after upload, as promised.',
      'علبة الهدية مشمولة دائمًا، ويعمل هذا الرابط الخاص لمدة 7 أيام، وتبقى الصور في مساحتنا الآمنة وتُحذف بعد 15 يومًا من رفعها كما وعدناك'), lang, true),
    ui.p(unsub, lang, true),
  ].join('');
  const nm = !many && names[0] ? names[0] : '';
  return {
    subject: tr(lang, nm ? `${nm}'s Hikaya story is saved for you` : 'Your Hikaya story is saved for you', nm ? `قصة ${nm} من حكاية محفوظة لك` : 'قصتك من حكاية محفوظة لك'),
    html: emailShell(body, { lang, preheader: tr(lang, 'Finish in a minute, on any device.', 'أكمل طلبك في دقيقة ومن أي جهاز') }),
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
  const step = (n, t, d) => `<tr><td width="34" style="width:34px; vertical-align:top; padding:2px 0 12px;"><div style="width:26px; height:26px; line-height:26px; border-radius:13px; background:#8A5638; color:#FFFCF7; text-align:center; font-family:Manrope,Arial,sans-serif; font-size:13px; font-weight:700;">${n}</div></td><td style="vertical-align:top; padding:2px 0 12px; font-family:${lang === 'ar' ? 'Cairo,Tahoma,Arial,sans-serif' : 'Manrope,Arial,sans-serif'}; font-size:14px; line-height:1.55; color:#5E4A3D;"><strong style="color:#261C17;">${t}</strong><br>${d}</td></tr>`;
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
    ui.button(trackUrl(order), tr(lang, 'Track your order &rarr;', 'تتبّع طلبك &larr;'), lang),
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

/* ---------------- We need a better photo (sent from the dashboard) ---------------- */
function photoRequest(order, note) {
  const lang = orderLang(order);
  const first = esc(firstName(order.full_name, lang));
  const items = parseItems(order);
  const names = [...new Set(items.map(i => i.childName).filter(Boolean))];
  const who = names.length === 1 ? esc(names[0]) : '';
  const tip = (en, ar) => `<li style="margin:0 0 6px;">${tr(lang, en, ar)}</li>`;
  const body = [
    ui.eyebrow(tr(lang, 'Action needed', 'مطلوب منك'), lang),
    ui.h(tr(lang, `Could you send another photo, ${first}?`, `هل يمكنك إرسال صورة أخرى${first ? ' يا ' + first : ''}؟`), lang),
    ui.p(tr(lang,
      `We've paused order <strong dir="ltr">${esc(order.order_number || '')}</strong> before printing because the photo${who ? ` of <strong>${who}</strong>` : ''} isn't clear enough for us to illustrate them well. We'd rather ask than print a book you're not happy with.`,
      `أوقفنا الطلب رقم <strong dir="ltr">${esc(order.order_number || '')}</strong> قبل الطباعة لأن صورة ${who ? `<strong>${who}</strong>` : 'طفلك'} ليست واضحة بما يكفي لنرسمه بشكل جميل، ونفضّل أن نسألك على أن نطبع كتابًا لا يرضيك`), lang),
    note ? ui.box(ui.p(`<strong>${tr(lang, 'From our team:', 'ملاحظة من فريقنا:')}</strong> ${esc(note)}`, lang).replace('margin:0 0 14px', 'margin:0')) : '',
    ui.p(tr(lang, '<strong>Just reply to this email with a new photo.</strong> The best photos:', '<strong>ردّ على هذا البريد بصورة جديدة فقط</strong>، وأفضل الصور هي التي:'), lang),
    `<ul style="margin:0 0 16px; padding-${lang === 'ar' ? 'right' : 'left'}:20px; font-family:${lang === 'ar' ? 'Cairo,Tahoma,Arial,sans-serif' : 'Manrope,Arial,sans-serif'}; font-size:14px; line-height:1.55; color:#5E4A3D;">
      ${tip('Show their face clearly, looking toward the camera', 'يظهر فيها الوجه بوضوح وينظر نحو الكاميرا')}
      ${tip('Are well-lit, without harsh shadows', 'تكون الإضاءة فيها جيدة بلا ظلال قوية')}
      ${tip('Aren\'t blurry or taken from far away', 'لا تكون ضبابية أو ملتقطة من بعيد')}
      ${tip('Have nothing covering the face, and only your child in them', 'لا يغطي الوجه فيها شيء، ويظهر فيها طفلك وحده')}
    </ul>`,
    ui.p(tr(lang,
      'As soon as we have it we carry on, and we\'ll keep your delivery as close to the original date as we can. You can also send it on WhatsApp.',
      'سنكمل العمل فور وصولها، وسنحرص على أن يبقى موعد التوصيل قريبًا من الموعد الأصلي قدر الإمكان، ويمكنك أيضًا إرسالها عبر واتساب'), lang, true),
    ui.sign(lang),
  ].join('');
  return {
    subject: tr(lang, `Action needed: a clearer photo for your Hikaya book · ${order.order_number || ''}`, `مطلوب: صورة أوضح لكتاب حكاية · ${order.order_number || ''}`),
    html: emailShell(body, { lang, preheader: tr(lang, 'Reply with a new photo and we will carry on.', 'ردّ بصورة جديدة وسنكمل العمل') }),
  };
}

/* ---------------- Running late (sent from the dashboard) ---------------- */
function delayNotice(order, newDate, note) {
  const lang = orderLang(order);
  const first = esc(firstName(order.full_name, lang));
  const when = newDate ? new Date(newDate + 'T12:00:00Z').toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Dubai' }) : '';
  const body = [
    ui.eyebrow(tr(lang, 'Delivery update', 'تحديث التوصيل'), lang),
    ui.h(tr(lang, `A quick update, ${first}`, `تحديث سريع${first ? ' يا ' + first : ''}`), lang),
    ui.p(tr(lang,
      `Order <strong dir="ltr">${esc(order.order_number || '')}</strong> is taking a little longer than we planned, and we're sorry for the wait. We wanted you to hear it from us first.`,
      `يستغرق الطلب رقم <strong dir="ltr">${esc(order.order_number || '')}</strong> وقتًا أطول قليلًا مما خططنا له، ونعتذر عن الانتظار، وأردنا أن تعرف ذلك منّا أولًا`), lang),
    when ? ui.rows([[tr(lang, 'New estimated delivery', 'موعد التوصيل المتوقع الجديد'), esc(when)]], lang) : '',
    note ? ui.box(ui.p(esc(note), lang).replace('margin:0 0 14px', 'margin:0')) : '',
    ui.button(trackUrl(order), tr(lang, 'Track your order &rarr;', 'تتبّع طلبك &larr;'), lang),
    ui.p(tr(lang, 'If the date matters for a birthday or a special day, reply and tell us. We\'ll do everything we can.', 'إذا كان الموعد مهمًا لعيد ميلاد أو مناسبة خاصة فردّ وأخبرنا، وسنبذل كل ما بوسعنا'), lang, true),
    ui.sign(lang),
  ].join('');
  return {
    subject: tr(lang, `Delivery update for your Hikaya book · ${order.order_number || ''}`, `تحديث موعد توصيل كتاب حكاية · ${order.order_number || ''}`),
    html: emailShell(body, { lang, preheader: tr(lang, when ? `New estimated delivery: ${when}.` : 'Running a little late.', when ? `موعد التوصيل الجديد: ${when}` : 'تأخير بسيط') }),
  };
}

/* ---------------- Feedback request (3 days after delivery) ----------------
   Links to feedback.html with the order's private token. 4 ratings + a comment.
   No discount is offered for feedback. */
const feedbackUrl = o => `${SITE_URL}feedback.html?t=${encodeURIComponent((o && o.tracking_token) || '')}`;
function reviewRequest(order, arTitles) {
  const lang = orderLang(order);
  const first = esc(firstName(order.full_name, lang));
  const items = parseItems(order);
  const names = [...new Set(items.map(i => i.childName).filter(Boolean))];
  const titles = [...new Set(items.map(i => storyTitle(i, lang, arTitles)).filter(Boolean))];
  const one = names.length === 1;
  const who = one ? esc(names[0]) : names.length ? esc(names.join(' & ')) : '';
  const title = titles.length === 1 ? esc(titles[0]) : '';
  const story = title
    ? tr(lang, `<em>${title}</em>`, `«${title}»`)
    : tr(lang, 'their Hikaya story', 'قصة حكاية');
  const body = [
    ui.eyebrow(tr(lang, 'How did we do?', 'كيف كانت التجربة؟'), lang),
    ui.h(tr(lang, `Hi ${first},`, first ? `مرحباً ${first}،` : 'مرحباً،'), lang),
    ui.p(tr(lang,
      `We hope ${who || 'your little one'} loved stepping into ${story} and seeing themselves as the hero of every page 💛`,
      `نتمنى أن تكون ${title ? 'قصة ' + story : story} قد أسعدت ${who || 'طفلكم'} وملأت وقت القراءة في بيتكم بالفرح 💛`), lang),
    ui.p(tr(lang,
      'Each Hikaya book is made for one child only, so we\'d really love to know how story time went.',
      'كل كتاب من حكاية يُصنع لطفل واحد فقط، لذلك يهمنا كثيراً أن نعرف كيف كانت التجربة'), lang),
    ui.p(`<strong>${tr(lang, 'It only takes 30 seconds.', 'لن يستغرق الأمر أكثر من 30 ثانية')}</strong>`, lang),
    ui.button(feedbackUrl(order), tr(lang, `Rate ${one ? who + '\'s' : 'your'} story &rarr;`, `قيّموا قصة ${one ? who : 'طفلكم'} &larr;`), lang),
    ui.sign(lang),
    ui.p(tr(lang,
      'Your ratings and comments may be used anonymously in Hikaya promotions. We never share your name, your child\'s name, or anything that identifies you.',
      'قد نستخدم تقييماتكم وتعليقاتكم في عروض حكاية دون ذكر اسمكم أو اسم طفلكم أو أي معلومة تدل عليكم'), lang, true),
  ].join('');
  return {
    subject: tr(lang, `How did ${one ? names[0] : 'your little one'} like their story? 💛`, `كيف كانت قصة ${one ? names[0] : 'طفلكم'}؟ 💛`),
    html: emailShell(body, { lang, preheader: tr(lang, 'Tell us how story time went, it takes 30 seconds.', 'شاركونا رأيكم في القصة خلال 30 ثانية') }),
  };
}

/* ---------------- Feedback thank-you (no discount) ---------------- */
function feedbackThanks({ lang, firstName: first, childName }) {
  lang = lang === 'ar' ? 'ar' : 'en';
  const kid = childName ? esc(childName) : '';
  const body = [
    ui.eyebrow(tr(lang, 'Thank you', 'شكراً لكم'), lang),
    ui.h(tr(lang, `Thank you${first ? ', ' + esc(first) : ''} 💛`, `شكراً ${first ? esc(first) : 'لكم'} 💛`), lang),
    ui.p(tr(lang,
      `Thank you for taking the time to tell us how ${kid ? kid + '\'s' : 'your'} story went. Every comment helps us make the next Hikaya book even more special.`,
      `شكراً على وقتكم ومشاركتنا رأيكم في قصة ${kid || 'طفلكم'}، فكل تعليق يساعدنا على أن نجعل كتاب حكاية القادم أجمل`), lang),
    ui.button(`${SITE_URL}stories.html`, tr(lang, 'Browse stories &rarr;', 'تصفّحوا القصص &larr;'), lang),
    ui.sign(lang),
  ].join('');
  return {
    subject: tr(lang, 'Thank you for your feedback 💛', 'شكراً على تقييمكم 💛'),
    html: emailShell(body, { lang, preheader: tr(lang, 'Thank you for sharing how story time went.', 'شكراً على مشاركتنا رأيكم') }),
  };
}

/* ---------------- Team alert: a feedback with a low score (English) ---------------- */
function feedbackAlert({ order, info, q, comment, adminUrl }) {
  const lbl = { q_recommend: 'Would recommend', q_story: 'Story and likeness', q_print: 'Print and packaging', q_delivery: 'Ordering and delivery' };
  const body = [
    ui.eyebrow('Low feedback score'),
    ui.h(`Order ${esc(order.order_number || '')} needs a personal follow-up`),
    ui.rows([
      ['Customer', esc(order.full_name || '') + (order.email ? `<br><span style="font-weight:400;">${esc(order.email)}</span>` : '')],
      ['Child / story', esc([info.childName, info.story].filter(Boolean).join(' · ') || '-')],
      ...Object.keys(lbl).map(k => [lbl[k], `${'★'.repeat(q[k])}${'☆'.repeat(5 - q[k])} &nbsp;${q[k]}/5${q[k] <= 3 ? ' ⚠️' : ''}`]),
      ['Comment', esc(comment)],
    ]),
    ui.p('A quick personal message usually turns this around.', 'en', true),
    ui.button(adminUrl, 'Open feedback in the dashboard &rarr;'),
  ].join('');
  return { subject: `⚠️ Low feedback score · ${order.order_number || ''}`, html: emailShell(body, { preheader: 'A customer rated part of their order 3 or below.' }) };
}

/* ---------------- Newsletter sign-up confirmation ---------------- */
function newsletterWelcome(lang) {
  lang = lang === 'ar' ? 'ar' : 'en';
  const body = [
    ui.eyebrow(tr(lang, 'You\'re on the list', 'تم تسجيلك'), lang),
    ui.h(tr(lang, 'Thanks for joining us!', 'شكرًا لانضمامك إلينا!'), lang),
    ui.p(tr(lang,
      'You\'ll be the first to hear about new stories, seasonal editions for Eid, Ramadan and the school year, and the occasional family offer. We write rarely and keep it short.',
      'ستكون أول من يعرف بالقصص الجديدة، وإصدارات العيد ورمضان والعام الدراسي، وبعض العروض العائلية من حين لآخر، ونراسلك نادرًا وباختصار'), lang),
    ui.button(`${SITE_URL}stories.html`, tr(lang, 'Browse the stories &rarr;', 'تصفّح القصص &larr;'), lang),
    ui.p(tr(lang,
      'Changed your mind? Reply with "unsubscribe" and we\'ll remove you straight away.',
      'غيّرت رأيك؟ ردّ بكلمة "إلغاء الاشتراك" وسنحذفك فورًا'), lang, true),
    ui.sign(lang),
  ].join('');
  return {
    subject: tr(lang, 'Welcome to the Hikaya family', 'أهلًا بك في عائلة حكاية'),
    html: emailShell(body, { lang, preheader: tr(lang, 'New stories and seasonal editions, straight to your inbox.', 'قصص جديدة وإصدارات المواسم في بريدك') }),
  };
}

/* ---------------- One-time code for guest order tracking ---------------- */
function trackCode(code, lang) {
  lang = lang === 'ar' ? 'ar' : 'en';
  const big = `<p style="margin:2px 0 12px; font-family:Manrope,Arial,sans-serif; font-size:26px; font-weight:700; letter-spacing:.24em; color:#573624;" dir="ltr">${esc(code)}</p>`;
  const body = [
    ui.eyebrow(tr(lang, 'Track your order', 'تتبّع طلبك'), lang),
    ui.h(tr(lang, 'Your tracking code', 'رمز تتبّع طلبك'), lang),
    ui.p(tr(lang, 'Enter this code on the tracking page to see your orders. It works once and expires in 10 minutes.', 'أدخل هذا الرمز في صفحة التتبّع لعرض طلباتك، يُستخدم مرة واحدة وتنتهي صلاحيته خلال 10 دقائق'), lang),
    big,
    ui.p(tr(lang, "Didn't ask for this? You can ignore this email. Nobody can see your orders without this code.", 'لم تطلب هذا الرمز؟ يمكنك تجاهل هذه الرسالة، فلا أحد يستطيع رؤية طلباتك بدون هذا الرمز'), lang, true),
    ui.sign(lang),
  ].join('');
  return {
    subject: tr(lang, `${code} is your Hikaya tracking code`, `${code} رمز تتبّع طلبك من حكاية`),
    html: emailShell(body, { lang, preheader: tr(lang, 'Your one-time code to see your order status.', 'رمزك لمرة واحدة لعرض حالة طلبك') }),
  };
}

/* ---------------- Daily "needs attention" digest for the team (English) ---------------- */
function teamDigest({ late, unpaid, messages, reviewsSent, adminUrl }) {
  const list = (rows) => `<ul style="margin:0 0 16px; padding-left:18px; font-family:Manrope,Arial,sans-serif; font-size:14px; line-height:1.6; color:#5E4A3D;">${rows.join('')}</ul>`;
  const section = (title, rows, empty) => ui.h3(title, 'en') + (rows.length ? list(rows) : ui.p(empty, 'en', true));
  const total = late.length + unpaid.length + messages.length;
  const body = [
    ui.eyebrow('Daily summary'),
    ui.h(total ? `${total} thing${total === 1 ? '' : 's'} need${total === 1 ? 's' : ''} attention` : 'All clear today'),
    section(`Orders running late (${late.length})`, late.map(o => `<li><strong>${esc(o.order_number)}</strong> · ${esc(o.full_name || '')} · ${esc(o.stageLabel)} for ${o.days} day${o.days === 1 ? '' : 's'} (target ${o.sla})</li>`), 'None. Every order is on schedule.'),
    section(`Unpaid orders, last 3 days (${unpaid.length})`, unpaid.map(o => `<li><strong>${esc(o.order_number)}</strong> · ${esc(o.full_name || '')} · ${esc(o.email || '')} · ${esc(o.payment_status)}</li>`), 'None.'),
    section(`New contact messages, last 24 hours (${messages.length})`, messages.map(m => `<li><strong>${esc(m.name || '')}</strong> (${esc(m.email || '')})${m.order_number ? ' · ' + esc(m.order_number) : ''}: ${esc(String(m.message || '').slice(0, 140))}${String(m.message || '').length > 140 ? '…' : ''}</li>`), 'None.'),
    reviewsSent ? ui.p(`Feedback emails sent today: <strong>${reviewsSent}</strong>. Answers show in the dashboard's Feedback tab.`, 'en', true) : '',
    ui.button(adminUrl, 'Open the dashboard &rarr;'),
  ].join('');
  return {
    subject: total ? `Hikaya daily: ${total} need${total === 1 ? 's' : ''} attention` : 'Hikaya daily: all clear',
    html: emailShell(body, { preheader: `${late.length} late · ${unpaid.length} unpaid · ${messages.length} new messages` }),
  };
}

module.exports = { trackCode, photoRequest, delayNotice, reviewRequest, feedbackThanks, feedbackAlert, newsletterWelcome, teamDigest, welcome, paymentNotCompleted, orderPrinting, orderCancelled, orderConfirmed, orderShipped, orderDelivered, cartReminder, contactReceived, orderLang, parseItems, countryName };
