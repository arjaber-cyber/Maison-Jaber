// Hikaya SEO layer (launch, 1 Nov 2026)
//
// Runs on every public shop page before it is served, so Google (and WhatsApp /
// Instagram link previews) get the right page details in the HTML itself,
// without waiting for JavaScript:
//   - keyword-led <title>, meta description and social tags, in English or Arabic
//   - an indexable Arabic version of every page at ?lang=ar (html lang="ar" dir="rtl")
//   - hreflang links tying the English and Arabic versions together
//   - one canonical URL per page / story / language
//   - story pages: their own title, description, cover image, Product + Breadcrumb data
//   - stories that no longer exist are kept out of Google (noindex) instead of
//     showing up as empty pages
//
// Arabic copy carries no full stops (brand rule).
// To change a page's Google title or description, edit PAGES below.

import { AR_H1, AR_FAQ, AR_TEXT, EN_TEXT } from "../shared/ar-seo-data.js";

const SITE = "https://maison-jaber.com";
const BASE = SITE + "/hikaya/";
const SUPABASE_URL = "https://zxzlarlpoctpnnnvzced.supabase.co";
// Public (anon) key, the same one the storefront already uses; RLS only allows storefront reads.
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E";
const BOOK_PRICE_AED = 169;
// Offer per delivery country for story-page Product data (Nov 2026). Links from the Google Merchant
// Center feed carry ?country=SA etc. so the page, its price and this structured data all match the feed.
// KEEP IN SYNC with netlify/edge-functions/merchant-feed.js COUNTRIES, region.js and _pricing.js.
const OFFERS = {
  AE: { price: 169, cur: "AED", ship: 0, transit: [1, 3] },
  SA: { price: 169, cur: "SAR", ship: 30, transit: [3, 5] },
  QA: { price: 169, cur: "QAR", ship: 30, transit: [3, 5] },
  KW: { price: 14.25, cur: "KWD", ship: 2.5, transit: [3, 5] },
  BH: { price: 17.25, cur: "BHD", ship: 3, transit: [3, 5] },
  OM: { price: 17.75, cur: "OMR", ship: 3, transit: [3, 5] },
};

const BRAND_EN = "Hikaya by Maison Jaber";
// Personalised books can't be returned for change of mind (damaged/faulty ones are replaced or refunded, see refund-policy.html).
const RETURN_POLICY = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: ["AE", "SA", "QA", "KW", "BH", "OM"],
  returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
  merchantReturnLink: "https://maison-jaber.com/hikaya/refund-policy.html",
};
const BRAND_AR = "حكاية من ميزون جابر";

// Page type + breadcrumb name for pages that carry no structured data of their own.
const PAGE_TYPE = {
  "stories.html": { type: "CollectionPage", en: "All stories", ar: "جميع القصص" },
  "age-groups.html": { type: "CollectionPage", en: "Stories by age", ar: "القصص حسب العمر" },
  "our-world.html": { type: "CollectionPage", en: "Our World", ar: "عالمنا" },
  "about.html": { type: "AboutPage", en: "Our Story", ar: "قصتنا" },
  "contact.html": { type: "ContactPage", en: "Contact", ar: "تواصل معنا" },
};

export const PAGES = {
  "index.html": {
    en: {
      title: "Hikaya by Maison Jaber | Personalised Kids' Books & Gifts UAE",
      desc: "Hikaya by Maison Jaber makes personalised storybooks starring your child: their name, age and photo in a hardcover book, gift-boxed across the UAE & GCC.",
    },
    ar: {
      title: "حكاية من ميزون جابر | قصص أطفال مخصصة باسم طفلك وصورته",
      desc: "حكاية من ميزون جابر: كتاب قصة مطبوع بغلاف مقوّى يكون طفلك بطله، باسمه وعمره وصورته، في علبة هدية مع التوصيل في الإمارات ودول الخليج",
    },
  },
  "stories.html": {
    en: {
      title: "Personalised Storybooks for Kids | All Stories | Hikaya",
      desc: "Browse Hikaya personalised storybooks by age, theme and occasion. Your child is the hero, and every hardcover book arrives gift-boxed across the UAE and GCC.",
    },
    ar: {
      title: "قصص أطفال مخصصة | جميع القصص | حكاية",
      desc: "تصفّح قصص حكاية المخصصة حسب العمر والموضوع والمناسبة، طفلك هو البطل وكل كتاب يصل في علبة هدية مع التوصيل في الإمارات ودول الخليج",
    },
  },
  "age-groups.html": {
    en: {
      title: "Personalised Books by Age: 2–4, 4–6 and 6–8 | Hikaya",
      desc: "Personalised storybooks for ages 2–4, 4–6 and 6–8, written around real childhood moments, with your child as the hero. A gift they will keep.",
    },
    ar: {
      title: "قصص مخصصة حسب العمر من 2 إلى 8 سنوات | حكاية",
      desc: "قصص أطفال مخصصة للأعمار من 2 إلى 4 ومن 4 إلى 6 ومن 6 إلى 8 سنوات، مكتوبة حول لحظات الطفولة الحقيقية وطفلك بطلها",
    },
  },
  "our-world.html": {
    en: {
      title: "Personalised Gift Books by Theme & Occasion | Hikaya",
      desc: "Stories about courage, kindness, emotions, imagination and family, plus gift ideas for birthdays, Eid and Christmas, personalised with your child as the hero.",
    },
    ar: {
      title: "هدايا قصص مخصصة حسب الموضوع والمناسبة | حكاية",
      desc: "قصص عن الشجاعة واللطف والمشاعر والخيال والعائلة، وهدايا لأعياد الميلاد والعيد ورمضان، مخصصة ليكون طفلك بطل القصة",
    },
  },
  "about.html": {
    en: {
      title: "About Hikaya by Maison Jaber | Our Story",
      desc: "Why we started Hikaya by Maison Jaber: beautiful personalised books children keep, where they see themselves as the hero. A family business based in the UAE.",
    },
    ar: {
      title: "عن حكاية من ميزون جابر | قصتنا",
      desc: "لماذا بدأنا حكاية من ميزون جابر: كتب جميلة يحتفظ بها الأطفال ويرون أنفسهم أبطالها، مشروع عائلي من الإمارات",
    },
  },
  "help.html": {
    en: {
      title: "FAQs: Personalisation, Delivery & Gifting | Hikaya",
      desc: "How Hikaya personalised books work: photos and privacy, Arabic or English editions, gift packaging, and delivery times and prices across the UAE and GCC.",
    },
    ar: {
      title: "الأسئلة الشائعة: التخصيص والتوصيل والهدايا | حكاية",
      desc: "كيف تعمل قصص حكاية المخصصة: الصور والخصوصية، النسخة العربية أو الإنجليزية، تغليف الهدايا، ومدة وأسعار التوصيل في الإمارات والسعودية ودول الخليج",
    },
  },
  "contact.html": {
    en: {
      title: "Contact Hikaya by Maison Jaber | WhatsApp & Email",
      desc: "Questions about a personalised book, an order, a photo or delivery? Contact Hikaya by Maison Jaber on WhatsApp or email. We reply quickly.",
    },
    ar: {
      title: "تواصل مع حكاية من ميزون جابر | واتساب والبريد",
      desc: "لديك سؤال عن قصة مخصصة أو طلب أو صورة أو التوصيل؟ تواصل مع حكاية من ميزون جابر عبر واتساب أو البريد الإلكتروني",
    },
  },
  // Gift landing pages (phase 2, Nov 2026)
  "gifts.html": {
    en: { title: "Personalised Gifts for Kids UAE | Storybooks | Hikaya", desc: "Personalised gifts for kids in the UAE and GCC: a hardcover storybook with your child as the hero, their name, age and photo. Gift-boxed, in English or Arabic." },
    ar: { title: "هدايا مخصصة للأطفال في الإمارات | قصص باسم طفلك | حكاية", desc: "هدايا مخصصة للأطفال في الإمارات ودول الخليج: كتاب قصة بغلاف مقوّى يكون طفلك بطله باسمه وعمره وصورته، في علبة هدية وبالعربية أو الإنجليزية" },
  },
  "gift-birthday.html": {
    en: { title: "Personalised Birthday Gifts for Kids UAE | Hikaya", desc: "A birthday gift they'll keep: a personalised storybook with your child as the hero and your message on the first page. Gift-boxed across the UAE & GCC." },
    ar: { title: "هدايا عيد ميلاد مخصصة للأطفال | قصة باسم طفلك | حكاية", desc: "هدية عيد ميلاد يحتفظ بها: كتاب قصة مخصص يكون طفلك بطله باسمه وصورته ورسالتك في الصفحة الأولى، في علبة هدية مع التوصيل في الإمارات ودول الخليج" },
  },
  "gift-eid-ramadan.html": {
    en: { title: "Personalised Eid & Ramadan Gifts for Kids | Hikaya", desc: "An Eidiya they'll keep: a personalised storybook in Arabic or English with your child as the hero and your Eid message inside. Gift-boxed across the UAE & GCC." },
    ar: { title: "هدايا العيد ورمضان للأطفال | عيدية مخصصة باسم طفلك | حكاية", desc: "عيدية تبقى معهم سنوات: كتاب قصة مخصص بالعربية أو الإنجليزية يكون طفلك بطله، مع تهنئة العيد في الصفحة الأولى، في علبة هدية مع التوصيل في الإمارات ودول الخليج" },
  },
  "gift-christmas.html": {
    en: { title: "Personalised Christmas Gifts for Kids UAE | Hikaya", desc: "A Christmas story starring your child: personalised with their name and photo, printed in hardcover and gift-boxed. Delivered across the UAE and GCC." },
    ar: { title: "هدايا الكريسماس المخصصة للأطفال | حكاية", desc: "قصة كريسماس يكون طفلك بطلها، مخصصة باسمه وصورته ومطبوعة بغلاف مقوّى في علبة هدية، مع التوصيل في الإمارات ودول الخليج" },
  },
  "gift-new-sibling.html": {
    en: { title: "New Sibling Gift: Personalised Big Sibling Book | Hikaya", desc: "A gift for the older child when a new baby arrives: a personalised storybook where they're the hero. Gift-boxed, in English or Arabic, across the UAE & GCC." },
    ar: { title: "هدية الأخ الأكبر بقدوم مولود جديد | قصة مخصصة | حكاية", desc: "هدية للطفل الأكبر عند قدوم مولود جديد: كتاب قصة مخصص يكون هو بطله، في علبة هدية وبالعربية أو الإنجليزية مع التوصيل في الإمارات ودول الخليج" },
  },
  "gift-first-day-of-school.html": {
    en: { title: "First Day of School Gift: Personalised Storybook | Hikaya", desc: "Help them feel brave for a big first day: a personalised storybook about courage and new beginnings, with your child as the hero. UAE & GCC delivery." },
    ar: { title: "هدية أول يوم مدرسة | قصة مخصصة باسم طفلك | حكاية", desc: "ساعده على الشعور بالشجاعة في يومه الأول: كتاب قصة مخصص عن الشجاعة والبدايات الجديدة يكون طفلك بطله، مع التوصيل في الإمارات ودول الخليج" },
  },
  // Gift guides (phase 3, Nov 2026)
  "guide-eid-gift-ideas.html": {
    en: { title: "Eid Gift Ideas for Kids: 10 Thoughtful Presents | Hikaya", desc: "Beyond cash and toys: 10 Eid gift ideas for children, from a personalised storybook to a handwritten Eidiya note, plus tips on ordering in time." },
    ar: { title: "أفكار هدايا العيد للأطفال: 10 هدايا مميزة لا تُنسى | حكاية", desc: "أكثر من المال والألعاب: 10 أفكار لهدايا العيد للأطفال، من قصة مخصصة باسم الطفل إلى رسالة عيدية بخط اليد، مع نصائح للطلب في الوقت المناسب" },
  },
  "guide-birthday-gift-ideas.html": {
    en: { title: "Birthday gift ideas for kids who have everything | Hikaya", desc: "Out of toy ideas? Thoughtful birthday gifts for children aged 2 to 8, from keepsakes and experiences to a personalised storybook, with tips by age." },
    ar: { title: "أفكار هدايا عيد ميلاد لطفل لديه كل شيء | حكاية", desc: "نفدت أفكار الألعاب؟ هدايا عيد ميلاد مميزة للأطفال من 2 إلى 8 سنوات، من التذكارات والتجارب إلى قصة مخصصة باسم الطفل، مع نصائح حسب العمر" },
  },
  "guide-new-sibling.html": {
    en: { title: "Preparing Your Child for a New Baby: A Parent's Guide | Hikaya", desc: "Simple, practical ways to help an older child welcome a new baby brother or sister: what to say, how stories help, and small rituals that help." },
    ar: { title: "تهيئة طفلك لقدوم مولود جديد: دليل لطيف للأهل | حكاية", desc: "طرق بسيطة وعملية لمساعدة الطفل الأكبر على استقبال أخ أو أخت جديدة: ماذا تقول، وكيف تساعد القصص، وعادات صغيرة تشعره بأنه مميز" },
  },
  "guide-first-day-of-school.html": {
    en: { title: "First Day of School: 8 Ways to Help Kids Feel Brave | Hikaya", desc: "Starting nursery or school? Eight gentle ways to help your child feel ready and brave for their first day, from practice runs to stories about courage." },
    ar: { title: "أول يوم في المدرسة: 8 طرق لمساعدة طفلك على الشجاعة | حكاية", desc: "هل يبدأ طفلك الحضانة أو المدرسة؟ ثماني طرق لطيفة وعملية لمساعدته على الاستعداد والشجاعة في يومه الأول، من التجربة المسبقة إلى قصص الشجاعة" },
  },
  "guides.html": {
    en: { title: "Gift Guides & Tips for Parents | Hikaya by Maison Jaber", desc: "Gift ideas for birthdays and Eid, plus gentle tips for big childhood moments like a new sibling or the first day of school, from Hikaya by Maison Jaber." },
    ar: { title: "أدلة الهدايا ونصائح للأهل | حكاية من ميزون جابر", desc: "أفكار هدايا لأعياد الميلاد والعيد، ونصائح لطيفة للحظات الطفولة الكبيرة مثل قدوم مولود جديد أو أول يوم في المدرسة، من حكاية من ميزون جابر" },
  },
  "guide-christmas-gift-ideas.html": {
    en: { title: "Christmas Gift Ideas for Kids: 10 Magical Presents | Hikaya", desc: "Thoughtful Christmas gift ideas for children aged 2 to 8 in the UAE and GCC, from a storybook where they're the hero to new traditions, plus when to order." },
    ar: { title: "أفكار هدايا الكريسماس للأطفال: 10 هدايا ساحرة | حكاية", desc: "أفكار هدايا كريسماس مميزة للأطفال من 2 إلى 8 سنوات في الإمارات ودول الخليج، من قصة يكون الطفل بطلها إلى عادات عائلية جديدة، مع موعد الطلب المناسب" },
  },
  "guide-gifts-from-grandparents.html": {
    en: { title: "Gifts from Grandparents: Meaningful Ideas | Hikaya", desc: "Meaningful gift ideas from grandparents to grandchildren, from keepsake books and family stories to shared experiences, with tips for gifting from far away." },
    ar: { title: "هدايا من الأجداد: أفكار يعتز بها الأحفاد | حكاية", desc: "أفكار هدايا مميزة من الأجداد إلى الأحفاد، من الكتب التذكارية وقصص العائلة إلى التجارب المشتركة، مع نصائح للإهداء من بعيد" },
  },
  // Country delivery pages (Nov 2026)
  "personalised-books-uae.html": {
    en: { title: "Personalised Children's Books UAE | Dubai & Abu Dhabi | Hikaya", desc: "Personalised storybooks starring your child, in Arabic or English. AED 169, free UAE delivery in about 5 working days, gift-boxed. Pay by card, Tabby or Tamara." },
    ar: { title: "قصص أطفال مخصصة باسم طفلك في الإمارات | دبي وأبوظبي | حكاية", desc: "قصص مخصصة يكون طفلك بطلها بالعربية أو الإنجليزية، 169 درهمًا مع توصيل مجاني في جميع الإمارات خلال نحو 5 أيام عمل، في علبة هدية والدفع بالبطاقة أو تابي أو تمارا" },
  },
  "personalised-books-saudi-arabia.html": {
    en: { title: "Personalised Children's Books in Saudi Arabia | Hikaya", desc: "Personalised storybooks with your child as the hero, in Arabic or English. SAR 169, delivered across Saudi Arabia in about 7 working days, gift-boxed." },
    ar: { title: "قصص أطفال مخصصة باسم طفلك في السعودية | حكاية", desc: "قصص مخصصة يكون طفلك بطلها بالعربية أو الإنجليزية، 169 ريالًا مع التوصيل في السعودية، الرياض وجدة والدمام، خلال نحو 7 أيام عمل في علبة هدية" },
  },
  "personalised-books-qatar.html": {
    en: { title: "Personalised Kids' Books in Qatar | Doha Delivery | Hikaya", desc: "Personalised storybooks with your child as the hero, in Arabic or English. QAR 169, delivered to Doha and across Qatar in about 7 working days. Gift-boxed." },
    ar: { title: "قصص أطفال مخصصة باسم طفلك في قطر | التوصيل للدوحة | حكاية", desc: "قصص مخصصة يكون طفلك بطلها بالعربية أو الإنجليزية، 169 ريالًا قطريًا مع التوصيل إلى الدوحة وجميع أنحاء قطر خلال نحو 7 أيام عمل في علبة هدية" },
  },
  "personalised-books-kuwait.html": {
    en: { title: "Personalised Children's Books in Kuwait | Hikaya", desc: "Personalised storybooks with your child as the hero, in Arabic or English. KWD 14.25, delivered across Kuwait in about 7 working days. Gift-boxed." },
    ar: { title: "قصص أطفال مخصصة باسم طفلك في الكويت | حكاية", desc: "قصص مخصصة يكون طفلك بطلها بالعربية أو الإنجليزية، 14.25 دينار كويتي مع التوصيل في جميع أنحاء الكويت خلال نحو 7 أيام عمل في علبة هدية" },
  },
  "personalised-books-bahrain.html": {
    en: { title: "Personalised Children's Books in Bahrain | Hikaya", desc: "Personalised storybooks with your child as the hero, in Arabic or English. BHD 17.25, delivered across Bahrain in about 7 working days. Gift-boxed." },
    ar: { title: "قصص أطفال مخصصة باسم طفلك في البحرين | حكاية", desc: "قصص مخصصة يكون طفلك بطلها بالعربية أو الإنجليزية، 17.25 دينار بحريني مع التوصيل في جميع أنحاء البحرين خلال نحو 7 أيام عمل في علبة هدية" },
  },
  "personalised-books-oman.html": {
    en: { title: "Personalised Kids' Books in Oman | Muscat Delivery | Hikaya", desc: "Personalised storybooks with your child as the hero, in Arabic or English. OMR 17.75, delivered to Muscat and across Oman in about 7 working days. Gift-boxed." },
    ar: { title: "قصص أطفال مخصصة باسم طفلك في عُمان | التوصيل لمسقط | حكاية", desc: "قصص مخصصة يكون طفلك بطلها بالعربية أو الإنجليزية، 17.75 ريال عماني مع التوصيل إلى مسقط وجميع أنحاء عُمان خلال نحو 7 أيام عمل في علبة هدية" },
  },
  "guide-uae-national-day-gift-ideas.html": {
    en: { title: "UAE National Day Gift Ideas for Kids | Hikaya", desc: "Gift and activity ideas for children for UAE National Day (Eid Al Etihad) on 2 December, from a personalised storybook to heritage visits, plus ordering tips." },
    ar: { title: "أفكار هدايا عيد الاتحاد للأطفال | حكاية", desc: "أفكار هدايا وأنشطة للأطفال في عيد الاتحاد الإماراتي في 2 ديسمبر، من قصة مخصصة باسم الطفل إلى زيارة الأماكن التراثية، مع نصائح للطلب في الوقت المناسب" },
  },
  "free-cover-preview.html": {
    en: { title: "Free Personalised Book Cover Preview UAE | Hikaya", desc: "See your child as the hero of a personalised Hikaya storybook. Create a free book-cover preview in minutes—no payment needed. UAE and GCC delivery." },
    ar: { title: "معاينة غلاف قصة مخصصة لطفلك مجاناً | حكاية", desc: "شاهد طفلك بطلًا لقصة مخصصة من حكاية، أنشئ معاينة مجانية لغلاف الكتاب خلال دقائق ودون أي دفع، مع التوصيل في الإمارات ودول الخليج" },
  },
  // END PAGES (tools/seo/register_pages.py adds new pages above this line)
};


// Crawlable site links in the raw HTML: the visible header and footer are drawn by script, which
// some search engines (Bing, Yandex) don't run. These sit where the footer goes, at the bottom of
// the page, and the real footer replaces them as soon as the page script runs.
const SITE_LINKS = [
  ["index.html", "Home", "الرئيسية"], ["stories.html", "All stories", "جميع القصص"], ["age-groups.html", "Stories by age", "القصص حسب العمر"],
  ["gifts.html", "Personalised gifts", "هدايا مخصصة"], ["free-cover-preview.html", "Free cover preview", "معاينة الغلاف المجانية"], ["gift-birthday.html", "Birthday gifts", "هدايا عيد الميلاد"], ["gift-eid-ramadan.html", "Eid & Ramadan gifts", "هدايا العيد ورمضان"],
  ["gift-christmas.html", "Christmas gifts", "هدايا الكريسماس"], ["gift-new-sibling.html", "New sibling gifts", "هدايا المولود الجديد"], ["gift-first-day-of-school.html", "First day of school", "أول يوم في المدرسة"],
  ["guides.html", "Gift guides", "أدلة الهدايا"], ["personalised-books-uae.html", "UAE", "الإمارات"], ["personalised-books-saudi-arabia.html", "Saudi Arabia", "السعودية"],
  ["personalised-books-qatar.html", "Qatar", "قطر"], ["personalised-books-kuwait.html", "Kuwait", "الكويت"], ["personalised-books-bahrain.html", "Bahrain", "البحرين"],
  ["personalised-books-oman.html", "Oman", "عُمان"], ["our-world.html", "Our World", "عالمنا"], ["about.html", "Our Story", "قصتنا"], ["help.html", "FAQs", "الأسئلة الشائعة"], ["contact.html", "Contact", "تواصل معنا"],
];
function siteLinksHtml(l) {
  const q = l === "ar" ? "?lang=ar" : "";
  return `<nav class="ssr-links" aria-label="${l === "ar" ? "روابط الموقع" : "Site links"}"><ul>${SITE_LINKS.map(([f, en, ar]) => `<li><a href="${f}${q}">${esc(l === "ar" ? ar : en)}</a></li>`).join("")}</ul></nav>`;
}

const AGE_BANDS = ["2-4", "4-6", "6-8"];
const AGE_PAGE = {
  en: b => ({
    title: `Personalised Books for Ages ${b.replace("-", "–")} | Hikaya`,
    desc: `Personalised storybooks for children aged ${b.replace("-", "–")}, with your child as the hero. Hardcover, gift-boxed and delivered across the UAE and GCC.`,
  }),
  ar: b => {
    const [a, c] = b.split("-");
    return {
      title: `قصص مخصصة للأطفال من ${a} إلى ${c} سنوات | حكاية`,
      desc: `قصص أطفال مخصصة للأعمار من ${a} إلى ${c} سنوات يكون طفلك بطلها، بغلاف مقوّى وفي علبة هدية مع التوصيل في الإمارات ودول الخليج`,
    };
  },
};

const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const arNoStops = s => String(s || "").replace(/\.(\s|$)/g, "$1").replace(/\.$/, "").trim();
const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…"; };
const localized = (v, l) => (!v ? "" : typeof v === "string" ? v : v[l] || v.en || "");
// The child's name goes where [NAME] is in the real book; in Google it reads "Your Child to the Rescue!".
const plainTitle = (t, l) => String(t || "").replace(/\[NAME\]/g, l === "ar" ? "طفلك" : "Your Child").replace(/\s{2,}/g, " ").trim();

// All active stories, cached in memory for 5 minutes per edge instance, and never allowed to
// hold a page up: if the database is slow (>1.5 s) the page is served without story details.
let STORIES = null, STORIES_AT = 0;
async function loadStories() {
  if (STORIES && Date.now() - STORIES_AT < 5 * 60 * 1000) return STORIES;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 1500);
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/stories?active=eq.true&select=*&order=sort_order.asc,created_at.asc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      signal: ctl.signal,
    });
    if (!r.ok) return STORIES; // keep the last good copy, if any
    const rows = await r.json();
    if (Array.isArray(rows)) { STORIES = rows; STORIES_AT = Date.now(); }
    return STORIES;
  } catch (_) {
    return STORIES;
  } finally {
    clearTimeout(timer);
  }
}
async function loadStory(slug) {
  const all = await loadStories();
  if (!all) return undefined; // unknown: leave the page as it is
  return all.find(s => s.slug === slug) || null; // null: no such live story
}

// Occasion matching, same rules as the shop (chrome.js inOccasion).
const OCC = { birthday: {}, eid: {}, christmas: {}, newbaby: { slugs: ["why-is-baby-looking-at-me"] }, school: { moments: ["new", "courage", "confidence", "friendship"] } };
const GIFT_OCC = { "gift-birthday.html": "birthday", "gift-eid-ramadan.html": "eid", "gift-christmas.html": "christmas", "gift-new-sibling.html": "newbaby", "gift-first-day-of-school.html": "school" };
function inOccasion(s, k) {
  const o = OCC[k]; if (!o) return true;
  if (Array.isArray(s.occasions) && s.occasions.length) return s.occasions.includes(k);
  if (o.slugs) return o.slugs.includes(s.slug);
  return !o.moments || (s.moments || []).some(m => o.moments.includes(m));
}
const storyTitle = (s, l) => plainTitle(l === "ar" ? s.title_ar || s.title : s.title, l);
const storyPremise = (s, l) => (l === "ar" ? arNoStops(localized(s.premise, "ar") || s.description_ar || localized(s.card_note, "ar") || "") : localized(s.premise, "en") || s.description || localized(s.card_note, "en") || "");
const firstLine = (s, l) => { const p = storyPremise(s, l); const m = p.match(/^.+?[.!?؟](?=\s|$)/); return (m ? m[0] : p).trim(); };
// Server-rendered story cards: the same look as the shop's cards, so search engines that don't run
// JavaScript still see every story, its cover and a link. The page script replaces them on load.
// Same cover sizes as the shop (chrome.js coverHtml): 600px JPG, 900px WebP, 1200px JPG.
const coverSrcset = (cover, sizes) => ` srcset="${esc(cover.replace(/\.jpg$/, "-600.jpg"))} 600w, ${esc(cover.replace(/\.jpg$/, "-900.webp"))} 900w, ${esc(cover)} 1200w" sizes="${sizes}" onerror="this.onerror=null;this.removeAttribute('srcset')"`;
function cardsHtml(list, l) {
  return list.map(s => {
    const t = storyTitle(s, l);
    const cover = (l === "ar" && s.cover_image_url_ar) || s.cover_image_url || "";
    const shop = /\/story-assets\/[^/]+\/cover(-ar)?\.jpg$/.test(cover);
    const small = shop ? cover.replace(/\.jpg$/, "-600.jpg") : cover;
    const set = shop ? coverSrcset(cover, "(max-width: 767px) 62vw, (max-width: 1023px) 34vw, 300px") : "";
    const href = `story.html?s=${encodeURIComponent(s.slug)}${l === "ar" ? "&amp;lang=ar" : ""}`;
    const alt = l === "ar" ? `غلاف ${t}` : `Cover of ${t}`;
    const line = firstLine(s, l);
    return `<li class="story-card"><div class="cover">${small ? `<img src="${esc(small)}"${set} alt="${esc(alt)}" loading="lazy" decoding="async" width="560" height="560" />` : ""}</div><div class="body"><h3><a href="${href}">${esc(t)}</a></h3>${line ? `<p class="line">${esc(line)}</p>` : ""}</div></li>`;
  }).join("");
}

// ---------------------------------------------------------------------------------------------
// Full Arabic HTML (SEO, Nov 2026). Google, Bing and link previews read the HTML before any script
// runs, so ?lang=ar pages are served with ALL their copy in Arabic, not just the title and H1:
// every data-i18n / data-i18n-html element, aria-labels, image alt text and placeholders, the
// header and footer links, price/delivery lines, story details, and internal links that keep
// ?lang=ar. The text comes from the site's own approved translations (AR_TEXT, generated from the
// same i18n files the browser uses by tools/seo/gen_ar_seo.js), so the page looks exactly as it
// does once the browser has translated it. English pages are not touched.
// ---------------------------------------------------------------------------------------------
const tAr = key => (Object.prototype.hasOwnProperty.call(AR_TEXT, key) ? AR_TEXT[key] : null);
// English pages (Nov 2026): the same story details, shelves, age-page content and header links are now
// also served in English before any script runs (SEO report: English pages relied on JavaScript).
const tEnK = key => (Object.prototype.hasOwnProperty.call(EN_TEXT, key) ? EN_TEXT[key] : null);
const tx = (l, key) => (l === "ar" ? tAr(key) : tEnK(key));
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

// Inline <script>/<style> blocks are set aside while the body is rewritten, then put back unchanged.
function shieldScripts(s) {
  const kept = [];
  const out = s.replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, m => `\u0000${kept.push(m) - 1}\u0000`);
  return { out, restore: x => x.replace(/\u0000(\d+)\u0000/g, (m, i) => kept[+i]) };
}
// Index just past the closing tag that matches an element opened before `from` (nesting-aware).
function closeOf(s, tag, from) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  re.lastIndex = from;
  let depth = 1, m;
  while ((m = re.exec(s))) {
    if (!m[1] && /\/>$/.test(m[0])) continue;
    depth += m[1] ? -1 : 1;
    if (!depth) return [m.index, re.lastIndex];
  }
  return null;
}
function setAttr(tag, name, value) {
  const re = new RegExp(`(\\s${name}=")[^"]*(")`);
  if (re.test(tag)) return tag.replace(re, (m, a, b) => a + esc(value) + b);
  return tag.replace(/\s*\/?>$/, end => ` ${name}="${esc(value)}"${end}`);
}
// Replace the inner HTML of every element whose opening tag matches `openRe` (must be global).
// fn(openTag) returns the new inner HTML, or null to leave the element as it is.
function fillElements(s, openRe, fn) {
  let res = "", pos = 0, m;
  openRe.lastIndex = 0;
  while ((m = openRe.exec(s))) {
    const name = m[1].toLowerCase();
    const inner = VOID_TAGS.has(name) ? null : fn(m[0]);
    const end = inner == null ? null : closeOf(s, name, openRe.lastIndex);
    if (!end) continue;
    res += s.slice(pos, m.index) + m[0] + inner + s.slice(end[0], end[1]);
    pos = end[1];
    openRe.lastIndex = end[1];
  }
  return res + s.slice(pos);
}

// Same as i18n.js applyTranslations() + chrome.js renderLang(), on the server.
function translateBodyAr(body) {
  // Attributes first: aria-label, alt, placeholder.
  body = body.replace(/<[a-zA-Z][a-zA-Z0-9-]*\b[^>]*\sdata-i18n-(?:aria|alt|ph|placeholder)="[^"]+"[^>]*>/g, tag => {
    for (const [, kind, key] of tag.matchAll(/\sdata-i18n-(aria|alt|ph|placeholder)="([^"]+)"/g)) {
      const v = tAr(key);
      if (v == null) continue;
      tag = setAttr(tag, kind === "aria" ? "aria-label" : kind === "alt" ? "alt" : "placeholder", v);
    }
    return tag;
  });
  // Then text: data-i18n-html is inserted as markup (like innerHTML), data-i18n as plain text (like textContent).
  return fillElements(body, /<([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*\sdata-i18n(?:-html)?="[^"]+"[^>]*>/g, tag => {
    const h = tag.match(/\sdata-i18n-html="([^"]+)"/), p = tag.match(/\sdata-i18n="([^"]+)"/);
    if (h && tAr(h[1]) != null) return tAr(h[1]);
    if (p && tAr(p[1]) != null) return esc(tAr(p[1]));
    return null;
  });
}

// Internal links on Arabic pages keep ?lang=ar (story, age and other parameters are kept as they are).
// Private and transactional pages (cart, checkout, account…) are left alone: they are not indexed
// and already open in the visitor's chosen language.
const PRIVATE_PAGES = /^(admin|account|login|checkout|personalize|cart|book-added|invoice|track-order|search|feedback|ziina-result)\.html$/;
function arHref(href, pageUrl) {
  const raw = href.replace(/&amp;/g, "&");
  if (!raw || /^(#|mailto:|tel:|javascript:|data:|sms:|whatsapp:)/i.test(raw)) return null;
  let u;
  try { u = new URL(raw, pageUrl); } catch (_) { return null; }
  if (u.origin !== SITE || !/^\/hikaya\//.test(u.pathname)) return null;
  const page = u.pathname.slice("/hikaya/".length);
  if (page && (!/^[a-z0-9-]+\.html$/i.test(page) || PRIVATE_PAGES.test(page))) return null;
  if (u.searchParams.get("lang") === "ar") return null;
  u.searchParams.set("lang", "ar");
  // Keep the link in the same form it was written (relative stays relative).
  const cut = raw.search(/[?#]/);
  const base = cut < 0 ? raw : raw.slice(0, cut);
  return (base + "?" + u.searchParams.toString() + u.hash).replace(/&/g, "&amp;");
}
function arLinks(body, pageUrl) {
  return body.replace(/(<a\b[^>]*?\shref=")([^"]*)(")/gi, (m, a, href, b) => {
    const n = arHref(href, pageUrl);
    return n ? a + n + b : m;
  });
}

// Price and delivery lines that region.js/chrome.js fill in the browser (default country: UAE, as in the English HTML).
const UAE = { was: "AED 199", now: "AED 169", eta: 5 };
function priceHtmlAr() {
  return `<s class="hk-was"><span class="sr-only">${esc(tAr("lx.was"))} </span><bdi>${UAE.was}</bdi></s> <span class="hk-now"><span class="sr-only">${esc(tAr("lx.now"))} </span><bdi>${UAE.now}</bdi></span>`;
}
function regionFillsAr(body) {
  const uae = tAr("home6_regions.UAE");
  const eta = String(tAr("lx.eta")).replace("{country}", uae).replace("{n}", UAE.eta);
  body = fillElements(body, /<([a-z0-9]+)\b[^>]*\sdata-hk-price-line\b[^>]*>/gi, () => String(tAr("lx.price_line")).split("{price}").map(esc).join(priceHtmlAr()));
  body = fillElements(body, /<([a-z0-9]+)\b[^>]*\sdata-hk-price-now\b[^>]*>/gi, () => priceHtmlAr());
  body = fillElements(body, /<([a-z0-9]+)\b[^>]*\sdata-hk-eta-short\b[^>]*>/gi, () => esc(String(tAr("lx.eta_short")).replace("{n}", UAE.eta)));
  body = fillElements(body, /<([a-z0-9]+)\b[^>]*\sdata-hk-eta(?=[\s>])[^>]*>/gi, () => esc(eta));
  body = fillElements(body, /<([a-z0-9]+)\b[^>]*\sdata-hk-delivery(?![-\w])[^>]*>/gi, () => esc(tAr("home6.del_uae")));
  body = fillElements(body, /<([a-z0-9]+)\b[^>]*\sdata-hk-delivery-short\b[^>]*>/gi, () => esc(tAr("home6.del_uae_short")));
  body = fillElements(body, /<([a-z0-9]+)\b[^>]*\sdata-hk-offer="([^"]*)"[^>]*>/gi, tag => {
    const want = ((tag.match(/data-hk-offer="([^"]*)"/) || [])[1] || "price box delivery eta privacy").split(/\s+/);
    const parts = {
      price: `<li class="o-price">${priceHtmlAr()}</li>`,
      box: `<li>${esc(tAr("lx.tr_box"))}</li>`,
      delivery: `<li>${esc(tAr("home6.del_uae_short"))}</li>`,
      eta: `<li>${esc(String(tAr("lx.offer_eta")).replace("{n}", UAE.eta))}</li>`,
      privacy: `<li><a href="privacy.html" data-photo-privacy>${esc(tAr("lx.tr_private"))}</a></li>`,
    };
    return want.map(w => parts[w] || "").join("");
  });
  // Country pages (countries-i18n.js) and guides (guides-i18n.js) fill these from data attributes.
  const CTRY_AR = { uae: "الإمارات", saudi: "السعودية", qatar: "قطر", kuwait: "الكويت", bahrain: "البحرين", oman: "عُمان" };
  body = fillElements(body, /<([a-z0-9]+)\b[^>]*\sdata-ctry-days="(\d+)"[^>]*>/gi, tag => esc(String(tAr("ctry.f_days")).replace("{n}", tag.match(/data-ctry-days="(\d+)"/)[1])));
  body = fillElements(body, /<([a-z0-9]+)\b[^>]*\sdata-ctry-faq="([a-z]+)"[^>]*>/gi, tag => { const c = CTRY_AR[tag.match(/data-ctry-faq="([a-z]+)"/)[1]]; return c ? esc(String(tAr("ctry.faq")).replace("{country}", c)) : null; });
  body = fillElements(body, /<([a-z0-9]+)\b[^>]*\sdata-gdg-mins="(\d+)"[^>]*>/gi, tag => esc(String(tAr("gdg.mins")).replace("{n}", tag.match(/data-gdg-mins="(\d+)"/)[1])));
  return body;
}

// Age page (browse.js ages()): subtitle, theme tiles, popular stories, quote and button for the chosen band.
const bandWordsAr = b => bandWords(b, "ar");
const bandWords = (b, l) => { const [a, z] = String(b).split("-"); return String(tx(l, "a11y.band_words") || "{a}–{b}").replace("{a}", a).replace("{b}", z); };
function agePageAr(html, band, all) { return agePageFill(html, band, all, "ar"); }
function agePageFill(html, band, all, l) {
  const tAr = key => tx(l, key);
  const key = band.replace("-", "_"), lbl = bandWords(band, l);
  const [lo, hi] = band.split("-").map(Number);
  const inBand = s => ((s.age_bands && s.age_bands.length) ? s.age_bands : ["2-8"]).some(b => { const [a, z] = String(b).split("-").map(Number); return a < hi && z > lo; });
  html = html.replace(/<h1 id="age-title">[^<]*<\/h1>/, `<h1 id="age-title">${esc(String(tAr("pg.age_title")).replace("{band}", lbl))}</h1>`);
  html = html.replace(/<p class="lede" id="age-sub">[^<]*<\/p>/, `<p class="lede" id="age-sub">${esc(tAr("pg.age_sub_" + key) || "")}</p>`);
  html = html.replace('<ul class="tiles" id="tiles"></ul>', `<ul class="tiles" id="tiles">${Object.keys(THEME_GROUPS).map(g => `<li><a class="tile" href="stories.html?age=${band}&amp;theme=${g}"><span>${esc(tAr("pg.w_" + g))}</span><small>${esc(tAr("pg.w_" + g + "_d") || "")}</small></a></li>`).join("")}</ul>`);
  if (all && all.length) html = html.replace('<ul class="sgrid" id="popular"></ul>', `<ul class="sgrid" id="popular">${cardsHtml(all.filter(inBand).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.sort_order || 0) - (b.sort_order || 0)).slice(0, 8), l)}</ul>`);
  html = html.replace('<blockquote id="age-quote"></blockquote>', `<blockquote id="age-quote">${esc(tAr("pg.age_quote_" + key) || "")}</blockquote>`);
  html = html.replace(/(<a class="btn btn-primary" id="age-cta" href=")stories\.html\?age=[0-9-]+("><span>)[^<]*(<\/span>)/, (m, a, b, c) => `${a}stories.html?age=${band}${b}${esc(String(tAr("pg.age_browse")).replace("{band}", lbl))}${c}`);
  return html;
}

// Header navigation in the raw HTML (the real header is drawn by chrome.js and replaces this).
// It sits inside #hk-top, whose height is already reserved, so nothing moves when the header loads.
const TOP_LINKS = [["index.html", "home6.nav_home"], ["stories.html", "home6.nav_stories"], ["age-groups.html", "home6.nav_ages"], ["our-world.html", "home6.nav_world"], ["gifts.html", "home6.nav_gifts"], ["about.html", "home6.nav_about"], ["help.html", "home6.nav_faq"]];
function topLinksHtmlAr() { return topLinksHtml("ar"); }
function topLinksHtml(l) {
  const q = l === "ar" ? "?lang=ar" : "";
  return `<nav class="ssr-links ssr-top" aria-label="${esc(tx(l, "a11y.main_nav") || (l === "ar" ? "القائمة الرئيسية" : "Main"))}"><ul>${TOP_LINKS.map(([f, k]) => `<li><a href="${f}${q}">${esc(tx(l, k))}</a></li>`).join("")}<li><a href="personalize.html">${esc(tx(l, "home6.cta_create"))}</a></li></ul></nav>`;
}

// Story details the story page fills in the browser (browse.js), served in Arabic.
const THEME_GROUPS = { courage: ["confidence", "courage", "new"], kindness: ["kindness", "friendship"], emotions: ["emotions", "honesty"], imagination: ["adventure", "bedtime", "imagination"], family: ["family"], growing: ["growing", "change", "screen", "responsibility"] };
const groupOf = m => Object.keys(THEME_GROUPS).find(g => THEME_GROUPS[g].includes(m)) || null;
function ageTextL(bands, l) {
  if (l === "ar") return ageTextAr(bands);
  const list = (bands || []).map(b => String(b).split("-").map(Number)).filter(p => p.length === 2 && !isNaN(p[0]) && !isNaN(p[1])).sort((x, y) => x[0] - y[0]);
  if (!list.length) return "";
  if (list.length === 1) return String(tEnK("a11y.age_range") || "Ages {a}–{b}").replace("{a}", list[0][0]).replace("{b}", list[0][1]);
  return "Ages " + list.map(p => `${p[0]}–${p[1]}`).join(" · ");
}
function ageTextAr(bands) {
  const list = (bands || []).map(b => String(b).split("-").map(Number)).filter(p => p.length === 2 && !isNaN(p[0]) && !isNaN(p[1])).sort((x, y) => x[0] - y[0]);
  if (!list.length) return "";
  if (list.length === 1) return String(tAr("a11y.age_range")).replace("{a}", list[0][0]).replace("{b}", list[0][1]);
  return "من " + list.map(p => `${p[0]} إلى ${p[1]}`).join(" ومن ") + " سنوات";
}
const arPunct = v => String(v || "").replace(/([؀-ۿ)»])\.\s+(?=[؀-ۿ«])/g, "$1، ").replace(/\.\s*$/, "");
function storyPageAr(html, s, all) { return storyPageFill(html, s, all, "ar"); }
function storyPageFill(html, s, all, l) {
  const tAr = key => tx(l, key);
  const ar = l === "ar";
  const title = storyTitle(s, l);
  const bands = Array.isArray(s.age_bands) ? s.age_bands : String(s.age_ranges || "").split(",").filter(Boolean);
  const cover = (ar && s.cover_image_url_ar) || s.cover_image_url || "";
  const ages = [ageTextL(bands, l), s.page_count ? String(tAr("pg.pages")).replace("{n}", s.page_count) : ""].filter(Boolean).join(" · ");
  const chips = [...new Set((s.moments || []).map(m => tAr("home6.th_" + m) || tAr("pg.w_" + (groupOf(m) || "courage"))).filter(Boolean))];
  const learns = [...new Set((s.moments || []).map(m => groupOf(m) || "courage"))].slice(0, 4).map(g => tAr("pg.w_" + g)).filter(Boolean);
  const happens = ar ? arPunct(localized(s.synopsis, "ar") || s.description_ar || storyPremise(s, "ar"))
    : (localized(s.synopsis, "en") || (s.description && s.description !== storyPremise(s, "en") ? s.description : storyPremise(s, "en")));
  const band = bands[0];
  const inBand = x => { if (!band) return true; const [lo, hi] = band.split("-").map(Number); const bs = (x.age_bands && x.age_bands.length) ? x.age_bands : ["2-8"]; return bs.some(b => { const [a, z] = String(b).split("-").map(Number); return a < hi && z > lo; }); };
  const more = (all || []).filter(x => x.slug !== s.slug && inBand(x)).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.sort_order || 0) - (b.sort_order || 0)).slice(0, 10);
  html = html.replace('<li aria-current="page" id="crumb-title"></li>', `<li aria-current="page" id="crumb-title">${esc(title)}</li>`);
  html = html.replace('<p class="ages" id="st-ages"></p>', `<p class="ages" id="st-ages">${esc(ages)}</p>`);
  if (chips.length) html = html.replace('<ul class="chips" id="st-chips"></ul>', `<ul class="chips" id="st-chips">${chips.map(c => `<li>${esc(c)}</li>`).join("")}</ul>`);
  if (cover) html = html.replace('<div class="main" id="st-main"></div>', `<div class="main" id="st-main"><div class="cover"><img src="${esc(cover)}"${/\/story-assets\/[^/]+\/cover(-ar)?\.jpg$/.test(cover) ? coverSrcset(cover, "(max-width: 767px) 100vw, 46vw") : ""} alt="${esc(String(tAr("lx.cover_alt")).replace("{title}", title))}" fetchpriority="high" decoding="async" width="560" height="560" /></div></div>`);
  html = html.replace('<div class="pdp-price" id="st-price"></div>', `<div class="pdp-price" id="st-price"><span class="now">${UAE.now}</span><span class="was"><span class="sr-only">${esc(tAr("lx.was"))} </span>${UAE.was}</span></div>`);
  html = html.replace('<a class="btn btn-primary" id="st-cta" href="personalize.html"', `<a class="btn btn-primary" id="st-cta" href="personalize.html?story=${encodeURIComponent(s.slug)}"`);
  if (happens) html = html.replace('<p class="prose" id="st-happens"></p>', `<p class="prose" id="st-happens">${esc(happens)}</p>`);
  if (learns.length) html = html.replace('<ul class="learn" id="st-learns"></ul>', `<ul class="learn" id="st-learns">${learns.map(l => `<li><span>${esc(l)}</span></li>`).join("")}</ul>`);
  if (more.length) html = html.replace('<ul class="track" id="track-more" tabindex="0" aria-labelledby="more-title"></ul>', `<ul class="track" id="track-more" tabindex="0" aria-labelledby="more-title">${cardsHtml(more, l)}</ul>`);
  return html;
}

// Homepage: "Their Next Adventure" shelf (newest first, like home6.js) and the shop-by-occasion tiles.
const OCC_TILES = [["birthday", "gift-birthday.html"], ["eid", "gift-eid-ramadan.html"], ["christmas", "gift-christmas.html"], ["newbaby", "gift-new-sibling.html"], ["school", "gift-first-day-of-school.html"], ["justbecause", "stories.html?occasion=justbecause"]];
function homeAr(html, all) { return homeFill(html, all, "ar"); }
function homeFill(html, all, l) {
  const tAr = key => tx(l, key);
  if (all && all.length) {
    const newest = [...all].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")) || (b.sort_order || 0) - (a.sort_order || 0)).slice(0, 6);
    html = html.replace('<ul class="track" id="track-new" tabindex="0" aria-labelledby="new-title"></ul>', `<ul class="track" id="track-new" tabindex="0" aria-labelledby="new-title">${cardsHtml(newest, l)}</ul>`);
  }
  html = html.replace('<ul class="occ-grid" id="occ-grid"></ul>', `<ul class="occ-grid" id="occ-grid">${OCC_TILES.map(([k, href]) => `<li><a class="occ-tile" href="${href}"><span class="occ-t">${esc(tAr("occ." + k) || k)}</span><small>${esc(tAr("occ." + k + "_d") || "")}</small></a></li>`).join("")}</ul>`);
  return html;
}

// Structured data written in English inside the page files (guides, country pages, breadcrumbs):
// on ?lang=ar the names, headline and description switch to the page's approved Arabic copy and the
// URLs to the Arabic addresses. Organization/WebSite data (already bilingual) is left as it is.
const LINK_AR = Object.fromEntries(SITE_LINKS.map(([f, , ar]) => [f, ar]));
const stripHtml = s => String(s || "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
function localizeLdAr(html, file, meta, canonAr) {
  const pageName = stripHtml((AR_H1[file] || {}).ar) || String(meta && meta.title || "").split(" | ")[0];
  const arUrl = u => {
    if (typeof u !== "string" || !u.startsWith(BASE)) return u;
    return u.includes("lang=ar") ? u : u + (u.includes("?") ? "&" : "?") + "lang=ar";
  };
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi, (m, json) => {
    let d;
    try { d = JSON.parse(json); } catch (_) { return m; }
    const t = d && d["@type"];
    if (t === "Article") {
      if (pageName) d.headline = pageName;
      if (meta && meta.desc) d.description = meta.desc;
      d.inLanguage = "ar";
      d.mainEntityOfPage = canonAr;
    } else if (t === "BreadcrumbList" && Array.isArray(d.itemListElement)) {
      d.itemListElement.forEach(it => {
        const f = typeof it.item === "string" && it.item.startsWith(BASE) ? (it.item.slice(BASE.length).split("?")[0] || "index.html") : null;
        if (f === "index.html") it.name = "حكاية";
        else if (f === file) it.name = pageName || it.name;
        else if (f && LINK_AR[f]) it.name = LINK_AR[f];
        it.item = arUrl(it.item);
      });
    } else if (t === "Product" && file.startsWith("personalised-books-")) {
      if (pageName) d.name = pageName;
      if (meta && meta.desc) d.description = meta.desc;
      if (d.offers && d.offers.url) d.offers.url = canonAr;
    } else return m;
    return `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, "\\u003c")}</script>`;
  });
}

function setTag(html, re, replacement, insertBeforeHeadEnd) {
  if (re.test(html)) return html.replace(re, replacement);
  return insertBeforeHeadEnd ? html.replace("</head>", replacement + "\n</head>") : html;
}

// Fail safe (Nov 2026): if anything in the SEO layer goes wrong, serve the normal page
// instead of an error. Shoppers never see a broken page because of SEO.
export default async (request, context) => {
  const state = {};
  try {
    return await seoPage(request, context, state);
  } catch (e) {
    console.error("hikaya-seo failed, serving the page unchanged:", e && e.message);
    return state.original || undefined;
  }
};

async function seoPage(request, context, state) {
  if (request.method !== "GET" && request.method !== "HEAD") return;
  const url = new URL(request.url);
  let file = url.pathname.replace(/^\/hikaya\//, "") || "index.html";
  if (file === "") file = "index.html";
  const isStory = file === "story.html";
  if (!isStory && !PAGES[file]) return;

  const res = await context.next();
  const ct = res.headers.get("content-type") || "";
  if (res.status !== 200 || !ct.includes("text/html")) return res;
  state.original = res.clone();
  let html = await res.text();

  const qLang = url.searchParams.get("lang");
  const lang = qLang === "ar" ? "ar" : "en";
  const pathUrl = file === "index.html" ? BASE : BASE + file;

  let meta, canonEn, image = null, ld = [], noindex = false, storyRow = null;

  if (isStory) {
    const slug = url.searchParams.get("s") || url.searchParams.get("story") || "";
    const s = slug ? await loadStory(slug) : undefined;
    if (s === null) noindex = true;
    canonEn = slug ? `${BASE}story.html?s=${encodeURIComponent(slug)}` : BASE + "stories.html";
    if (s) {
      storyRow = s;
      const tEn = plainTitle(s.title, "en");
      const tAr = plainTitle(s.title_ar || tEn, "ar");
      const premEn = localized(s.premise, "en") || s.description || localized(s.card_note, "en") || "";
      const premAr = arNoStops(localized(s.premise, "ar") || s.description_ar || localized(s.card_note, "ar") || "");
      const bands = Array.isArray(s.age_bands) ? s.age_bands : String(s.age_ranges || "").split(",").filter(Boolean);
      const agesEn = bands.length ? ` Ages ${bands.map(b => b.replace("-", "–")).join(", ")}.` : "";
      // Google shows about 155 characters: the essentials (personalised, ages, hardcover, gift box, delivery) come
      // first, and the story's first line is added only when it fits whole (SEO report, Nov 2026).
      const fitDesc = (head, lines, max) => { for (const line of lines) { if (line && `${head} ${line}`.length <= max) return `${head} ${line}`; } return clip(head, max); };
      const noteEn = localized(s.card_note, "en"), noteAr = arNoStops(localized(s.card_note, "ar"));
      const lineEn = (premEn.match(/^.+?[.!?](?=\s|$)/) || [premEn])[0].trim();
      const lineAr = arNoStops((premAr.match(/^.+?[.!?؟](?=\s|$)/) || [premAr])[0].trim());
      meta = lang === "ar"
        ? { title: `${tAr} | قصة مخصصة باسم طفلك | حكاية`, desc: fitDesc(`${tAr}: قصة مخصصة يكون طفلك بطلها باسمه وصورته، بغلاف مقوّى في علبة هدية مع التوصيل في الإمارات والخليج`, [lineAr && `- ${lineAr}`, noteAr && `- ${noteAr}`], 160) }
        : { title: `${tEn} – Personalised Children's Book | Hikaya`, desc: fitDesc(`${tEn}: a personalised storybook starring your child.${agesEn} Hardcover, gift-boxed, UAE & GCC delivery.`, [lineEn, noteEn && noteEn.replace(/[.!]?$/, ".")], 160) };
      html = html.replace('<h1 id="st-title"></h1>', `<h1 id="st-title">${esc(lang === "ar" ? tAr : tEn)}</h1>`);
      html = html.replace('<p class="premise" id="st-premise"></p>', `<p class="premise" id="st-premise">${esc(lang === "ar" ? premAr : premEn)}</p>`);
      image = (lang === "ar" && s.cover_image_url_ar) || s.cover_image_url || null;
      const pageUrl = lang === "ar" ? canonEn + "&lang=ar" : canonEn;
      const qCc = String(url.searchParams.get("country") || "AE").toUpperCase();
      const cc = OFFERS[qCc] ? qCc : "AE";
      const off = OFFERS[cc];
      const offerUrl = cc === "AE" ? pageUrl : pageUrl + "&country=" + cc;
      ld.push({
        "@context": "https://schema.org",
        "@type": "Product",
        name: lang === "ar" ? tAr : tEn,
        description: lang === "ar" ? premAr : premEn,
        image: image || undefined,
        sku: "HIKAYA-" + slug,
        category: "Personalised children's books",
        brand: { "@type": "Brand", name: BRAND_EN },
        audience: { "@type": "PeopleAudience", suggestedMinAge: bands.length ? Number(bands[0].split("-")[0]) : 2, suggestedMaxAge: bands.length ? Number(bands[bands.length - 1].split("-")[1]) : 8 },
        offers: {
          "@type": "Offer",
          url: offerUrl,
          price: off.price,
          priceCurrency: off.cur,
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: BRAND_EN },
          hasMerchantReturnPolicy: RETURN_POLICY,
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: { "@type": "MonetaryAmount", value: off.ship, currency: off.cur },
            shippingDestination: { "@type": "DefinedRegion", addressCountry: cc },
            deliveryTime: {
              "@type": "ShippingDeliveryTime",
              handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
              transitTime: { "@type": "QuantitativeValue", minValue: off.transit[0], maxValue: off.transit[1], unitCode: "DAY" },
            },
          },
        },
      });
      ld.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: lang === "ar" ? "حكاية" : "Hikaya", item: lang === "ar" ? BASE + "?lang=ar" : BASE },
          { "@type": "ListItem", position: 2, name: lang === "ar" ? "القصص" : "Stories", item: BASE + "stories.html" + (lang === "ar" ? "?lang=ar" : "") },
          { "@type": "ListItem", position: 3, name: lang === "ar" ? tAr : tEn, item: pageUrl },
        ],
      });
    }
  } else if (file === "age-groups.html") {
    const band = AGE_BANDS.includes(url.searchParams.get("age")) ? url.searchParams.get("age") : null;
    meta = band ? AGE_PAGE[lang](band) : PAGES[file][lang];
    canonEn = band ? `${BASE}age-groups.html?age=${band}` : pathUrl;
    // The heading in the file says "4–6"; give each age page its own heading in the HTML itself.
    const shown = (band || "4-6").replace("-", "–");
    html = html.replace(/<h1 id="age-title">[^<]*<\/h1>/, `<h1 id="age-title">${lang === "ar" ? `قصص للأعمار ${shown}` : `Stories for ages ${shown}`}</h1>`);
  } else {
    meta = PAGES[file][lang];
    canonEn = pathUrl;
  }

  const isCountry = file.startsWith("personalised-books-");
  if (file === "stories.html" || file === "gifts.html" || GIFT_OCC[file] || isCountry) {
    const all = await loadStories();
    if (all && all.length) {
      if (file === "stories.html") {
        html = html.replace(/(<ul class="sgrid" id="grid" aria-busy="true">)[\s\S]*?(<\/ul>)/, (m, a, b) => a + cardsHtml(all, lang) + b);
      } else {
        const occ = GIFT_OCC[file];
        let list = occ ? all.filter(s => inOccasion(s, occ)) : all.slice();
        if (!list.length) list = all.slice();
        html = html.replace('<ul class="sgrid" id="gift-shelf" aria-busy="true"></ul>', `<ul class="sgrid" id="gift-shelf" aria-busy="true">${cardsHtml(list.slice(0, occ || isCountry ? 8 : 24), lang)}</ul>`);
      }
    }
  }

  html = html.replace('<div id="hk-foot"></div>', `<div id="hk-foot">${siteLinksHtml(lang)}</div>`);

  const sep = canonEn.includes("?") ? "&" : "?";
  const canonAr = canonEn + sep + "lang=ar";
  const canon = lang === "ar" ? canonAr : canonEn;

  // Language: an explicit ?lang= wins and is remembered (set before the page's own language script runs).
  if (qLang === "ar" || qLang === "en") {
    html = html.replace(/<head>/i, `<head>\n<script>try{localStorage.setItem("hikaya_lang","${lang}")}catch(e){}</script>`);
  }
  if (lang === "ar") html = html.replace(/<html lang="en"( dir="ltr")?/i, '<html lang="ar" dir="rtl"');

  if (meta) {
    html = setTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${esc(meta.title)}</title>`, true);
    html = setTag(html, /<meta name="description"[^>]*>/i, `<meta name="description" content="${esc(meta.desc)}" />`, true);
    html = setTag(html, /<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${esc(meta.title)}" />`, true);
    html = setTag(html, /<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${esc(meta.desc)}" />`, true);
  }
  if (image) html = setTag(html, /<meta property="og:image" [^>]*>/i, `<meta property="og:image" content="${esc(image)}" />`, true);
  html = setTag(html, /<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${esc(canon)}" />`, true);
  html = setTag(html, /<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${esc(canon)}" />`, true);

  // Arabic pages: Google reads the HTML before the page translates itself, so serve the
  // Arabic main heading and Arabic FAQ data directly (generated by tools/seo/gen_ar_seo.js).
  if (lang === "ar") {
    const h = AR_H1[file];
    if (h) {
      const attr = h.key.replace(/\./g, "\\.");
      html = html.replace(new RegExp(`(<h1\\b[^>]*data-i18n(?:-html)?="${attr}"[^>]*>)[\\s\\S]*?(<\\/h1>)`), (m, a, b) => a + h.ar + b);
    }
    const faqRe = /<script type="application\/ld\+json">\s*\{\s*"@context":\s*"https:\/\/schema.org",\s*"@type":\s*"FAQPage"[\s\S]*?<\/script>/i;
    const items = AR_FAQ[file];
    const arFaq = items && items.length
      ? `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", inLanguage: "ar", mainEntity: items.map(i => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })) }).replace(/</g, "\\u003c")}</script>`
      : "";
    html = html.replace(faqRe, arFaq);
    // Everything else on the page, in Arabic, before any script runs (Nov 2026). See translateBodyAr().
    html = localizeLdAr(html, file, meta, canonAr);
    const all = await loadStories();
    if (isStory && storyRow) html = storyPageAr(html, storyRow, all);
    if (file === "index.html") html = homeAr(html, all);
    if (file === "age-groups.html") html = agePageAr(html, AGE_BANDS.includes(url.searchParams.get("age")) ? url.searchParams.get("age") : "4-6", all);
    html = html.replace('<div id="hk-top"></div>', `<div id="hk-top">${topLinksHtmlAr()}</div>`);
    const bi = html.search(/<body\b/i);
    if (bi >= 0) {
      const sh = shieldScripts(html.slice(bi));
      let body = translateBodyAr(sh.out);
      // Images with an Arabic version (e.g. Arabic sample covers): <img src="…" data-src-ar="…">
      body = body.replace(/<img\b[^>]*\sdata-src-ar="([^"]+)"[^>]*>/gi, (tag, ar) => tag.replace(/\ssrc="[^"]*"/, ` src="${ar}"`));
      body = regionFillsAr(body);
      body = arLinks(body, BASE + file);
      html = html.slice(0, bi) + sh.restore(body);
    }
  } else {
    // English pages: story details, homepage shelf and occasion tiles, age-page content and the header
    // links in the HTML itself (same fills as Arabic, in English). The page scripts redraw them on load.
    const all = (isStory || file === "index.html" || file === "age-groups.html") ? await loadStories() : null;
    if (isStory && storyRow) html = storyPageFill(html, storyRow, all, "en");
    if (file === "index.html") html = homeFill(html, all, "en");
    if (file === "age-groups.html") html = agePageFill(html, AGE_BANDS.includes(url.searchParams.get("age")) ? url.searchParams.get("age") : "4-6", all, "en");
    html = html.replace('<div id="hk-top"></div>', `<div id="hk-top">${topLinksHtml("en")}</div>`);
  }

  // Pages without their own structured data get a page type and breadcrumb trail.
  if (PAGE_TYPE[file] && !noindex) {
    const t = PAGE_TYPE[file];
    const name = lang === "ar" ? t.ar : t.en;
    ld.push({ "@context": "https://schema.org", "@type": t.type, name, url: canon, inLanguage: lang, isPartOf: { "@type": "WebSite", name: lang === "ar" ? BRAND_AR : BRAND_EN, url: BASE } });
    ld.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: lang === "ar" ? "حكاية" : "Hikaya", item: lang === "ar" ? BASE + "?lang=ar" : BASE },
        { "@type": "ListItem", position: 2, name, item: canon },
      ],
    });
  }

  const extra = [
    `<meta name="hk-seo-lang" content="${lang}" />`,
    `<meta property="og:locale" content="${lang === "ar" ? "ar_AE" : "en_AE"}" />`,
    `<meta property="og:locale:alternate" content="${lang === "ar" ? "en_AE" : "ar_AE"}" />`,
    `<meta property="og:site_name" content="${lang === "ar" ? BRAND_AR : BRAND_EN}" />`,
  ];
  if (!/twitter:card/i.test(html)) extra.push('<meta name="twitter:card" content="summary_large_image" />');
  if (!noindex) {
    extra.push(`<link rel="alternate" hreflang="en" href="${esc(canonEn)}" />`);
    extra.push(`<link rel="alternate" hreflang="ar" href="${esc(canonAr)}" />`);
    extra.push(`<link rel="alternate" hreflang="x-default" href="${esc(canonEn)}" />`);
  } else {
    extra.push('<meta name="robots" content="noindex, follow" />');
  }
  ld.forEach(o => extra.push(`<script type="application/ld+json" id="${o["@type"] === "Product" ? "ld-product" : "ld-" + o["@type"].toLowerCase()}">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`));
  html = html.replace("</head>", extra.join("\n") + "\n</head>");

  const headers = new Headers(res.headers);
  headers.delete("content-length");
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("Vary", "Accept-Encoding");
  // Speed: Netlify's CDN keeps this page for 5 minutes per address (story, language and age count, so each
  // story and each ?lang=ar page is its own copy) and serves a stale copy while refreshing for up
  // to a day. Every deploy clears it. Browsers always re-check.
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  headers.set("Netlify-CDN-Cache-Control", "public, durable, s-maxage=300, stale-while-revalidate=86400");
  headers.set("Netlify-Vary", "query=s|story|lang|age|country"); // only what changes the page; ad tracking codes (fbclid, utm_*) share the cached copy
  return new Response(request.method === "HEAD" ? null : html, { status: 200, headers });
}

export const config = {
  cache: "manual",
  path: [
    // PATHS (tools/seo/register_pages.py adds new pages below this line)
    "/hikaya/free-cover-preview.html",
    "/hikaya/guide-uae-national-day-gift-ideas.html",
    "/hikaya/",
    "/hikaya/index.html",
    "/hikaya/stories.html",
    "/hikaya/story.html",
    "/hikaya/age-groups.html",
    "/hikaya/our-world.html",
    "/hikaya/about.html",
    "/hikaya/help.html",
    "/hikaya/contact.html",
    "/hikaya/gifts.html",
    "/hikaya/gift-birthday.html",
    "/hikaya/gift-eid-ramadan.html",
    "/hikaya/gift-christmas.html",
    "/hikaya/gift-new-sibling.html",
    "/hikaya/gift-first-day-of-school.html",
    "/hikaya/guide-eid-gift-ideas.html",
    "/hikaya/guide-birthday-gift-ideas.html",
    "/hikaya/guide-new-sibling.html",
    "/hikaya/guide-first-day-of-school.html",
    "/hikaya/guides.html",
    "/hikaya/personalised-books-uae.html",
    "/hikaya/personalised-books-saudi-arabia.html",
    "/hikaya/personalised-books-qatar.html",
    "/hikaya/personalised-books-kuwait.html",
    "/hikaya/personalised-books-bahrain.html",
    "/hikaya/personalised-books-oman.html",
    "/hikaya/guide-christmas-gift-ideas.html",
    "/hikaya/guide-gifts-from-grandparents.html",
  ],
};
