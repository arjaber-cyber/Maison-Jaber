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

const SITE = "https://maison-jaber.com";
const BASE = SITE + "/hikaya/";
const SUPABASE_URL = "https://zxzlarlpoctpnnnvzced.supabase.co";
// Public (anon) key, the same one the storefront already uses; RLS only allows storefront reads.
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E";
const BOOK_PRICE_AED = 169;

const BRAND_EN = "Hikaya by Maison Jaber";
const BRAND_AR = "حكاية من ميزون جابر";

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
    en: { title: "First Day of School Gift: Personalised Storybook | Hikaya", desc: "Help them feel brave for a big first day: a personalised storybook about courage and new beginnings, with your child as the hero. Delivered across the UAE and GCC." },
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
    en: { title: "Preparing Your Child for a New Baby: A Parent's Guide | Hikaya", desc: "Simple, practical ways to help an older child welcome a new baby brother or sister: what to say, how stories help, and small rituals that make them feel special." },
    ar: { title: "تهيئة طفلك لقدوم مولود جديد: دليل لطيف للأهل | حكاية", desc: "طرق بسيطة وعملية لمساعدة الطفل الأكبر على استقبال أخ أو أخت جديدة: ماذا تقول، وكيف تساعد القصص، وعادات صغيرة تشعره بأنه مميز" },
  },
  "guide-first-day-of-school.html": {
    en: { title: "First Day of School: 8 Ways to Help Kids Feel Brave | Hikaya", desc: "Starting nursery or school? Eight gentle, practical ways to help your child feel ready and brave for their first day, from practice runs to stories about courage." },
    ar: { title: "أول يوم في المدرسة: 8 طرق لمساعدة طفلك على الشجاعة | حكاية", desc: "هل يبدأ طفلك الحضانة أو المدرسة؟ ثماني طرق لطيفة وعملية لمساعدته على الاستعداد والشجاعة في يومه الأول، من التجربة المسبقة إلى قصص الشجاعة" },
  },
  "guides.html": {
    en: { title: "Gift Guides & Tips for Parents | Hikaya by Maison Jaber", desc: "Gift ideas for birthdays and Eid, plus gentle tips for big childhood moments like a new sibling or the first day of school, from Hikaya by Maison Jaber." },
    ar: { title: "أدلة الهدايا ونصائح للأهل | حكاية من ميزون جابر", desc: "أفكار هدايا لأعياد الميلاد والعيد، ونصائح لطيفة للحظات الطفولة الكبيرة مثل قدوم مولود جديد أو أول يوم في المدرسة، من حكاية من ميزون جابر" },
  },
  "guide-christmas-gift-ideas.html": {
    en: { title: "Christmas Gift Ideas for Kids: 10 Magical Presents | Hikaya", desc: "Thoughtful Christmas gift ideas for children aged 2 to 8 in the UAE and GCC, from a storybook where they are the hero to new family traditions, plus when to order." },
    ar: { title: "أفكار هدايا الكريسماس للأطفال: 10 هدايا ساحرة | حكاية", desc: "أفكار هدايا كريسماس مميزة للأطفال من 2 إلى 8 سنوات في الإمارات ودول الخليج، من قصة يكون الطفل بطلها إلى عادات عائلية جديدة، مع موعد الطلب المناسب" },
  },
  "guide-gifts-from-grandparents.html": {
    en: { title: "Gifts from Grandparents: Meaningful Ideas | Hikaya", desc: "Meaningful gift ideas from grandparents to grandchildren, from keepsake books and family stories to shared experiences, with tips for gifting from far away." },
    ar: { title: "هدايا من الأجداد: أفكار يعتز بها الأحفاد | حكاية", desc: "أفكار هدايا مميزة من الأجداد إلى الأحفاد، من الكتب التذكارية وقصص العائلة إلى التجارب المشتركة، مع نصائح للإهداء من بعيد" },
  },
  // Country delivery pages (Nov 2026)
  "personalised-books-uae.html": {
    en: { title: "Personalised Children's Books UAE | Dubai & Abu Dhabi | Hikaya", desc: "Personalised storybooks with your child as the hero, in Arabic or English. AED 169 with free UAE delivery in about 5 working days. Gift-boxed; pay by card or Tabby." },
    ar: { title: "قصص أطفال مخصصة باسم طفلك في الإمارات | دبي وأبوظبي | حكاية", desc: "قصص مخصصة يكون طفلك بطلها بالعربية أو الإنجليزية، 169 درهمًا مع توصيل مجاني في جميع الإمارات خلال نحو 5 أيام عمل، في علبة هدية والدفع بالبطاقة أو تابي" },
  },
  "personalised-books-saudi-arabia.html": {
    en: { title: "Personalised Children's Books in Saudi Arabia | Hikaya", desc: "Personalised storybooks with your child as the hero, in Arabic or English. SAR 169, delivered across Saudi Arabia in about 5 working days, gift-boxed." },
    ar: { title: "قصص أطفال مخصصة باسم طفلك في السعودية | حكاية", desc: "قصص مخصصة يكون طفلك بطلها بالعربية أو الإنجليزية، 169 ريالًا مع التوصيل في السعودية، الرياض وجدة والدمام، خلال نحو 5 أيام عمل في علبة هدية" },
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
  // END PAGES (tools/seo/register_pages.py adds new pages above this line)
};


// Crawlable site links in the raw HTML: the visible header and footer are drawn by script, which
// some search engines (Bing, Yandex) don't run. These sit where the footer goes, at the bottom of
// the page, and the real footer replaces them as soon as the page script runs.
const SITE_LINKS = [
  ["index.html", "Home", "الرئيسية"], ["stories.html", "All stories", "جميع القصص"], ["age-groups.html", "Stories by age", "القصص حسب العمر"],
  ["gifts.html", "Personalised gifts", "هدايا مخصصة"], ["gift-birthday.html", "Birthday gifts", "هدايا عيد الميلاد"], ["gift-eid-ramadan.html", "Eid & Ramadan gifts", "هدايا العيد ورمضان"],
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
const plainTitle = (t, l) => String(t || "").replace(/\[NAME\]\s*/g, l === "ar" ? "" : "").replace(/\s{2,}/g, " ").trim();

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
function cardsHtml(list, l) {
  return list.map(s => {
    const t = storyTitle(s, l);
    const cover = (l === "ar" && s.cover_image_url_ar) || s.cover_image_url || "";
    const small = /\/story-assets\/[^/]+\/cover(-ar)?\.jpg$/.test(cover) ? cover.replace(/\.jpg$/, "-600.jpg") : cover;
    const href = `story.html?s=${encodeURIComponent(s.slug)}${l === "ar" ? "&amp;lang=ar" : ""}`;
    const alt = l === "ar" ? `غلاف ${t}` : `Cover of ${t}`;
    const line = firstLine(s, l);
    return `<li class="story-card"><div class="cover">${small ? `<img src="${esc(small)}" alt="${esc(alt)}" loading="lazy" decoding="async" width="560" height="560" />` : ""}</div><div class="body"><h3><a href="${href}">${esc(t)}</a></h3>${line ? `<p class="line">${esc(line)}</p>` : ""}</div></li>`;
  }).join("");
}

function setTag(html, re, replacement, insertBeforeHeadEnd) {
  if (re.test(html)) return html.replace(re, replacement);
  return insertBeforeHeadEnd ? html.replace("</head>", replacement + "\n</head>") : html;
}

export default async (request, context) => {
  if (request.method !== "GET" && request.method !== "HEAD") return;
  const url = new URL(request.url);
  let file = url.pathname.replace(/^\/hikaya\//, "") || "index.html";
  if (file === "") file = "index.html";
  const isStory = file === "story.html";
  if (!isStory && !PAGES[file]) return;

  const res = await context.next();
  const ct = res.headers.get("content-type") || "";
  if (res.status !== 200 || !ct.includes("text/html")) return res;
  let html = await res.text();

  const qLang = url.searchParams.get("lang");
  const lang = qLang === "ar" ? "ar" : "en";
  const pathUrl = file === "index.html" ? BASE : BASE + file;

  let meta, canonEn, image = null, ld = [], noindex = false;

  if (isStory) {
    const slug = url.searchParams.get("s") || url.searchParams.get("story") || "";
    const s = slug ? await loadStory(slug) : undefined;
    if (s === null) noindex = true;
    canonEn = slug ? `${BASE}story.html?s=${encodeURIComponent(slug)}` : BASE + "stories.html";
    if (s) {
      const tEn = plainTitle(s.title, "en");
      const tAr = plainTitle(s.title_ar || tEn, "ar");
      const premEn = localized(s.premise, "en") || s.description || localized(s.card_note, "en") || "";
      const premAr = arNoStops(localized(s.premise, "ar") || s.description_ar || localized(s.card_note, "ar") || "");
      const bands = Array.isArray(s.age_bands) ? s.age_bands : String(s.age_ranges || "").split(",").filter(Boolean);
      const agesEn = bands.length ? ` Ages ${bands.map(b => b.replace("-", "–")).join(", ")}.` : "";
      meta = lang === "ar"
        ? { title: `${tAr} | قصة مخصصة باسم طفلك | حكاية`, desc: clip(`قصة ${tAr} المخصصة: ${premAr}، يكون طفلك بطلها باسمه وصورته، بغلاف مقوّى وفي علبة هدية`, 300) }
        : { title: `${tEn} – Personalised Children's Book | Hikaya`, desc: clip(`${tEn}: a personalised storybook with your child as the hero. ${premEn}${agesEn} Hardcover, gift-boxed, delivered across the UAE and GCC.`, 300) };
      html = html.replace('<h1 id="st-title"></h1>', `<h1 id="st-title">${esc(lang === "ar" ? tAr : tEn)}</h1>`);
      html = html.replace('<p class="premise" id="st-premise"></p>', `<p class="premise" id="st-premise">${esc(lang === "ar" ? premAr : premEn)}</p>`);
      image = (lang === "ar" && s.cover_image_url_ar) || s.cover_image_url || null;
      const pageUrl = lang === "ar" ? canonEn + "&lang=ar" : canonEn;
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
          url: pageUrl,
          price: BOOK_PRICE_AED,
          priceCurrency: "AED",
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: BRAND_EN },
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "AED" },
            shippingDestination: { "@type": "DefinedRegion", addressCountry: "AE" },
            deliveryTime: {
              "@type": "ShippingDeliveryTime",
              handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
              transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
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

  // Arabic pages: the FAQ structured data in the files is English, so it is left out to avoid a mismatch.
  if (lang === "ar") html = html.replace(/<script type="application\/ld\+json">\s*\{\s*"@context":\s*"https:\/\/schema.org",\s*"@type":\s*"FAQPage"[\s\S]*?<\/script>/i, "");

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
  headers.set("Netlify-Vary", "query=s|story|lang|age"); // only what changes the page; ad tracking codes (fbclid, utm_*) share the cached copy
  return new Response(request.method === "HEAD" ? null : html, { status: 200, headers });
};

export const config = {
  cache: "manual",
  path: [
    // PATHS (tools/seo/register_pages.py adds new pages below this line)
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
