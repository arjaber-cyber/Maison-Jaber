// Live sitemap for Google and Bing (launch, 1 Nov 2026).
// Lists every public Hikaya page and every ACTIVE story, each in English and
// Arabic (?lang=ar) with hreflang links, so new stories are picked up without
// editing anything. If the story list can't be loaded, the static
// /sitemap.xml file in the repo is served instead.

const SUPABASE_URL = "https://zxzlarlpoctpnnnvzced.supabase.co";
// Public (anon) key, the storefront's own; RLS only allows storefront reads.
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E";

const SITE = "https://maison-jaber.com";
const BASE = SITE + "/hikaya/";
const STATIC_PAGES = [
  ["", "1.0", "daily"],
  ["stories.html", "0.9", "daily"],
  ["age-groups.html?age=2-4", "0.7", "weekly"],
  ["age-groups.html?age=4-6", "0.7", "weekly"],
  ["age-groups.html?age=6-8", "0.7", "weekly"],
  ["our-world.html", "0.7", "weekly"],
  ["about.html", "0.6", "monthly"],
  ["help.html", "0.6", "monthly"],
  ["contact.html", "0.5", "monthly"],
  ["gifts.html", "0.9", "weekly"],
  ["gift-birthday.html", "0.8", "weekly"],
  ["gift-eid-ramadan.html", "0.8", "weekly"],
  ["gift-christmas.html", "0.8", "weekly"],
  ["gift-new-sibling.html", "0.8", "weekly"],
  ["gift-first-day-of-school.html", "0.8", "weekly"],
  ["guide-eid-gift-ideas.html", "0.7", "monthly"],
  ["guide-birthday-gift-ideas.html", "0.7", "monthly"],
  ["guide-new-sibling.html", "0.7", "monthly"],
  ["guide-first-day-of-school.html", "0.7", "monthly"],
  ["guides.html", "0.7", "monthly"],
];

const x = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function entry(en, priority, freq, lastmod, image) {
  const ar = en + (en.includes("?") ? "&" : "?") + "lang=ar";
  const alts = `<xhtml:link rel="alternate" hreflang="en" href="${x(en)}"/><xhtml:link rel="alternate" hreflang="ar" href="${x(ar)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${x(en)}"/>`;
  const img = image ? `<image:image><image:loc>${x(image)}</image:loc></image:image>` : "";
  const lm = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
  return [en, ar].map(loc => `  <url><loc>${x(loc)}</loc>${lm}<changefreq>${freq}</changefreq><priority>${priority}</priority>${alts}${img}</url>`).join("\n");
}

export default async (request, context) => {
  let stories;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/stories?active=eq.true&select=slug,cover_image_url,created_at,updated_at&order=sort_order.asc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!r.ok) throw new Error("stories " + r.status);
    stories = await r.json();
    if (!Array.isArray(stories) || !stories.length) throw new Error("no stories");
  } catch (_) {
    return context.next(); // static sitemap.xml
  }
  const today = new Date().toISOString().slice(0, 10);
  const day = v => (v ? String(v).slice(0, 10) : today);
  const rows = [`  <url><loc>${SITE}/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`];
  STATIC_PAGES.forEach(([p, pr, f]) => rows.push(entry(BASE + p, pr, f, today)));
  stories.forEach(s => rows.push(entry(`${BASE}story.html?s=${encodeURIComponent(s.slug)}`, "0.8", "weekly", day(s.updated_at || s.created_at), s.cover_image_url)));
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${rows.join("\n")}
</urlset>
`;
  return new Response(body, { status: 200, headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
};

export const config = { path: "/sitemap.xml" };
