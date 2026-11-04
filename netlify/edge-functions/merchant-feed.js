// Google Merchant Center product feed (Google Shopping free listings), Nov 2026.
//
//   https://maison-jaber.com/merchant-feed.xml                 UAE, English, AED
//   https://maison-jaber.com/merchant-feed.xml?country=SA      Saudi Arabia, SAR   (QA, KW, BH, OM the same way)
//   add &lang=ar for the Arabic edition (Arabic titles, descriptions, covers and links)
//
// One product per ACTIVE story, read live from Supabase, so new stories appear by themselves.
// Prices and delivery MUST match region.js / netlify/functions/_pricing.js — update COUNTRIES below
// whenever the shop's prices or delivery fees change, or Google will flag a price mismatch.

const SUPABASE_URL = "https://zxzlarlpoctpnnnvzced.supabase.co";
// Public (anon) key, the storefront's own; RLS only allows storefront reads.
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E";
const BASE = "https://maison-jaber.com/hikaya/";

// price = one book; ship = delivery for a single book (2+ books ship free, not expressible per item);
// days = delivery estimate in working days (handling 1-3 is the make-to-order time).
const COUNTRIES = {
  AE: { cur: "AED", price: "169.00", ship: "0.00", days: [3, 5] },
  SA: { cur: "SAR", price: "169.00", ship: "30.00", days: [3, 5] },
  QA: { cur: "QAR", price: "169.00", ship: "30.00", days: [5, 7] },
  KW: { cur: "KWD", price: "14.25", ship: "2.50", days: [5, 7] },
  BH: { cur: "BHD", price: "17.25", ship: "3.00", days: [5, 7] },
  OM: { cur: "OMR", price: "17.75", ship: "3.00", days: [5, 7] },
};

const x = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const localized = (v, l) => (!v ? "" : typeof v === "string" ? v : v[l] || v.en || "");
const clean = (t, ar) => String(t || "").replace(/\[NAME\]/g, ar ? "طفلك" : "Your Child").replace(/\s{2,}/g, " ").trim(); // the child's name goes here in the real book
const noStops = s => String(s || "").replace(/\.(\s|$)/g, "$1").replace(/\.$/, "").trim(); // Arabic brand rule

export default async (request) => {
  const url = new URL(request.url);
  const cc = (url.searchParams.get("country") || "AE").toUpperCase();
  const c = COUNTRIES[cc];
  if (!c) return new Response("Unknown country. Use one of: " + Object.keys(COUNTRIES).join(", "), { status: 400 });
  const ar = url.searchParams.get("lang") === "ar";

  let stories;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/stories?active=eq.true&select=*&order=sort_order.asc,created_at.asc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!r.ok) throw new Error("stories " + r.status);
    stories = await r.json();
  } catch (e) {
    return new Response("Feed temporarily unavailable", { status: 503, headers: { "retry-after": "600" } });
  }

  const items = stories.filter(s => s && s.slug && (ar ? (s.cover_image_url_ar || s.cover_image_url) : s.cover_image_url)).map(s => {
    const name = clean(ar ? (s.title_ar || s.title) : s.title, ar);
    const premise = ar
      ? noStops(localized(s.premise, "ar") || s.description_ar || "")
      : (localized(s.premise, "en") || s.description || "");
    const bands = (Array.isArray(s.age_bands) ? s.age_bands : String(s.age_ranges || "").split(",")).filter(Boolean);
    const ages = bands.map(b => b.replace("-", "–")).join(", ");
    const title = ar
      ? `${name} | قصة أطفال مخصصة باسم طفلك وصورته`
      : `${name} – Personalised Children's Storybook with Your Child as the Hero`;
    const desc = ar
      ? `${premise}، كتاب قصة مخصص يكون طفلك بطله باسمه وملامحه المرسومة في كل صفحة، بغلاف مقوّى مربع 21×21 سم، النسخة العربية تُقرأ من اليمين إلى اليسار، مع رسالتك في الصفحة الأولى، ويصل في علبة هدية${ages ? `، مناسب للأعمار ${ages} سنوات` : ""}`
      : `${premise} A personalised hardcover storybook (21×21 cm) with your child as the hero: their first name and illustrated likeness on every page, your own message on the first page, in English or Arabic, delivered gift-boxed.${ages ? ` For ages ${ages}.` : ""}`;
    // ?country= opens the page in this feed's currency (region.js) so the landing-page price matches the feed.
    const link = `${BASE}story.html?s=${encodeURIComponent(s.slug)}${ar ? "&lang=ar" : ""}${cc === "AE" ? "" : "&country=" + cc}`;
    const img = ar ? (s.cover_image_url_ar || s.cover_image_url) : s.cover_image_url;
    const extra = [ar ? s.back_cover_url_ar : s.back_cover_url].concat(ar ? (s.preview_images_ar || []) : (s.preview_images || [])).filter(Boolean).slice(0, 5);
    return `    <item>
      <g:id>HIKAYA-${x(s.slug)}${ar ? "-AR" : ""}</g:id>
      <g:item_group_id>HIKAYA-${x(s.slug)}</g:item_group_id>
      <title>${x(title.slice(0, 150))}</title>
      <description>${x(desc.slice(0, 5000))}</description>
      <link>${x(link)}</link>
      <g:image_link>${x(img)}</g:image_link>
${extra.map(u => `      <g:additional_image_link>${x(u)}</g:additional_image_link>`).join("\n")}
      <g:availability>in_stock</g:availability>
      <g:price>${c.price} ${c.cur}</g:price>
      <g:condition>new</g:condition>
      <g:brand>Hikaya by Maison Jaber</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
      <g:google_product_category>Media &gt; Books &gt; Print Books</g:google_product_category>
      <g:product_type>Books &gt; Personalised Children's Books</g:product_type>
      <g:age_group>kids</g:age_group>
      <g:custom_label_0>${x(bands.join(" "))}</g:custom_label_0>
      <g:shipping>
        <g:country>${cc}</g:country>
        <g:service>Standard</g:service>
        <g:price>${c.ship} ${c.cur}</g:price>
        <g:min_handling_time>1</g:min_handling_time>
        <g:max_handling_time>3</g:max_handling_time>
        <g:min_transit_time>${c.days[0] - 2}</g:min_transit_time>
        <g:max_transit_time>${c.days[1] - 2}</g:max_transit_time>
      </g:shipping>
    </item>`.replace(/\n\n/g, "\n");
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Hikaya by Maison Jaber – ${cc}${ar ? " (Arabic)" : ""}</title>
    <link>${BASE}</link>
    <description>Personalised children's storybooks, gift-boxed and delivered across the UAE and GCC.</description>
${items.join("\n")}
  </channel>
</rss>
`;
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "netlify-cdn-cache-control": "public, durable, s-maxage=3600, stale-while-revalidate=86400",
      "netlify-vary": "query=country|lang",
      "x-robots-tag": "noindex",
    },
  });
};

export const config = { path: "/merchant-feed.xml", cache: "manual" };
