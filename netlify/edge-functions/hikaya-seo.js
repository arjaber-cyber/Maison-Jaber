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
      title: "Hikaya by Maison Jaber | Personalised Children's Books & Gifts UAE",
      desc: "Hikaya by Maison Jaber makes personalised storybooks with your child as the hero: their name, age and photo in a hardcover book, gift-boxed and delivered across the UAE and GCC.",
    },
    ar: {
      title: "حكاية من ميزون جابر | قصص أطفال مخصصة باسم طفلك وصورته",
      desc: "حكاية من ميزون جابر: كتاب قصة مطبوع بغلاف مقوّى يكون طفلك بطله، باسمه وعمره وصورته، في علبة هدية مع التوصيل في الإمارات ودول الخليج",
    },
  },
  "stories.html": {
    en: {
      title: "Personalised Storybooks for Kids | All Stories | Hikaya",
      desc: "Browse every Hikaya personalised storybook by age, theme and occasion. Your child becomes the hero, and every hardcover book arrives gift-boxed. Delivered across the UAE and GCC.",
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
      desc: "Stories for courage, kindness, emotions, imagination, family and growing up, plus gift ideas for birthdays, Eid, Ramadan and Christmas. Personalised with your child as the hero.",
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
      desc: "How Hikaya personalised books work: photos and privacy, Arabic or English editions, gift packaging, delivery times and prices across the UAE, Saudi Arabia and the GCC.",
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
};

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

async function loadStory(slug) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/stories?active=eq.true&slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!r.ok) return undefined; // unknown: leave the page as it is
    const rows = await r.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null; // null: no such live story
  } catch (_) {
    return undefined;
  }
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

  // Arabic pages: the FAQ structured data in the file is English, so it is left out to avoid a mismatch.
  if (lang === "ar" && file === "help.html") html = html.replace(/<script type="application\/ld\+json">\s*\{\s*"@context":\s*"https:\/\/schema.org",\s*"@type":\s*"FAQPage"[\s\S]*?<\/script>/i, "");

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
  return new Response(request.method === "HEAD" ? null : html, { status: 200, headers });
};

export const config = {
  path: [
    "/hikaya/",
    "/hikaya/index.html",
    "/hikaya/stories.html",
    "/hikaya/story.html",
    "/hikaya/age-groups.html",
    "/hikaya/our-world.html",
    "/hikaya/about.html",
    "/hikaya/help.html",
    "/hikaya/contact.html",
  ],
};
