// Builds netlify/shared/ar-seo-data.js from the site's translation files (SEO, Nov 2026).
//
// The Arabic version of each public page (?lang=ar) is translated in the browser. Google reads the
// HTML first, so the SEO layer swaps in the Arabic main heading (H1) and the Arabic FAQ structured
// data on the server. This script pulls both from the same EN/AR copy the pages already use.
//
// Run from the repo root after changing page copy:  node tools/seo/gen_ar_seo.js
// (tools/seo/check.py fails if this file is out of date.)

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "../..");
const I18N_FILES = ["i18n.js", "home6-i18n.js", "pages-i18n.js", "gifts-i18n.js", "guides-i18n.js", "countries-i18n.js", "cover-preview-i18n.js", "fcp-i18n.js"];
const OUT = path.join(ROOT, "netlify/shared/ar-seo-data.js");

// Load every translation file the way the browser does.
// A forgiving stand-in for the browser: any DOM call returns another stand-in.
const stub = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => "" : k === "length" ? 0 : stub()), apply: () => stub(), construct: () => stub() });
const sandbox = { window: {}, document: stub(), localStorage: { getItem: () => null, setItem() {} }, navigator: { language: "en" }, location: { search: "", pathname: "/hikaya/", href: "" }, console, setTimeout() {}, MutationObserver: function () { return { observe() {} }; } };
Object.assign(sandbox.window, { document: sandbox.document, localStorage: sandbox.localStorage, navigator: sandbox.navigator, location: sandbox.location, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) });
vm.createContext(sandbox);
for (const f of I18N_FILES) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f }); }
  catch (e) { throw new Error(`Could not load ${f}: ${e.message}`); }
}
const T = sandbox.window.HIKAYA_TRANSLATIONS || {};
function ar(key) {
  const [ns, k] = key.split(".");
  const v = T[ns] && T[ns][k];
  return v && typeof v === "object" ? v.ar : null;
}
const decode = s => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'");
const stripTags = s => decode(String(s).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const noStops = s => s.replace(/\.(?=\s|$)/g, "").replace(/\s+/g, " ").trim();

// Public pages served through the SEO layer.
const seoSrc = fs.readFileSync(path.join(ROOT, "netlify/edge-functions/hikaya-seo.js"), "utf8");
const pages = [...seoSrc.matchAll(/"\/hikaya\/([a-z0-9-]+\.html)"/g)].map(m => m[1]).filter(f => f !== "story.html" && f !== "index.html");
pages.push("index.html");

const h1 = {}, faq = {}, problems = [];
for (const file of [...new Set(pages)]) {
  const html = fs.readFileSync(path.join(ROOT, "hikaya", file), "utf8");

  // Main heading
  const m = html.match(/<h1\b[^>]*\bdata-i18n(?:-html)?="([^"]+)"[^>]*>/);
  if (m) {
    const v = ar(m[1]);
    if (v) h1[file] = { key: m[1], ar: v.replace(/<br\s*\/?>/gi, "<br>") };
    else problems.push(`${file}: no Arabic text for H1 key ${m[1]}`);
  }

  // FAQ structured data: match each English question to its on-page Q/A keys
  const ldm = html.match(/<script type="application\/ld\+json">\s*(\{\s*"@context":\s*"https:\/\/schema.org",\s*"@type":\s*"FAQPage"[\s\S]*?)<\/script>/);
  if (!ldm) continue;
  const data = JSON.parse(ldm[1]);
  const pairs = [...html.matchAll(/<summary>\s*<span data-i18n="([^"]+)">([\s\S]*?)<\/span>\s*<\/summary>\s*<div class="faq-a">\s*<p data-i18n(?:-html)?="([^"]+)">/g)]
    .map(p => ({ qKey: p[1], qEn: stripTags(p[2]), aKey: p[3] }));
  const items = [];
  for (const q of data.mainEntity || []) {
    const pair = pairs.find(p => p.qEn === stripTags(q.name));
    const qa = pair && ar(pair.qKey), aa = pair && ar(pair.aKey);
    if (qa && aa) items.push({ q: noStops(stripTags(qa)), a: noStops(stripTags(aa)) });
    else problems.push(`${file}: no Arabic match for FAQ "${q.name}"`);
  }
  if (items.length) faq[file] = items;
}

// Full Arabic copy for the server (SEO, Nov 2026): every key a public page, the shared header/footer
// (chrome.js) or the server-filled price/delivery lines use, so ?lang=ar pages arrive fully in Arabic
// before any JavaScript runs. Lookup mirrors i18n.js t(): "ns.key", falling back to common.key.
function arLookup(key) {
  const [ns, k] = key.split(".");
  const e = (T[ns] || {})[k] || (T.common || {})[k];
  return e && typeof e === "object" && typeof e.ar === "string" ? e.ar : null;
}
const keys = new Set();
const KEY_ATTR = /data-i18n(?:-html|-aria|-alt|-ph|-placeholder)?="([^"]+)"/g;
for (const file of [...new Set(pages), "story.html"]) {
  const html = fs.readFileSync(path.join(ROOT, "hikaya", file), "utf8");
  for (const m of html.matchAll(KEY_ATTR)) keys.add(m[1]);
}
const chromeSrc = fs.readFileSync(path.join(ROOT, "hikaya/chrome.js"), "utf8");
for (const m of chromeSrc.matchAll(KEY_ATTR)) keys.add(m[1]);
// Keys the SEO layer itself uses for the price/delivery lines, story details and occasion tiles.
const SERVER_KEYS = [
  "lx.price_line", "lx.tr_box", "lx.tr_private", "lx.offer_eta", "lx.eta", "lx.eta_short", "lx.was", "lx.now", "lx.cover_alt",
  "lx.personalise", "lx.see_inside", "home6.del_uae", "home6.del_uae_short", "home6_regions.UAE", "a11y.age_range", "pg.pages",
  "occ.birthday", "occ.eid", "occ.christmas", "occ.newbaby", "occ.school", "occ.justbecause",
  "occ.birthday_d", "occ.eid_d", "occ.christmas_d", "occ.newbaby_d", "occ.school_d", "occ.justbecause_d",
  "pg.w_courage", "pg.w_kindness", "pg.w_emotions", "pg.w_imagination", "pg.w_family", "pg.w_growing",
  "ctry.f_days", "ctry.faq", "gdg.mins", "pg.age_title", "pg.age_browse", "a11y.band_words",
  "pg.age_sub_2_4", "pg.age_sub_4_6", "pg.age_sub_6_8", "pg.age_quote_2_4", "pg.age_quote_4_6", "pg.age_quote_6_8",
  "pg.w_courage_d", "pg.w_kindness_d", "pg.w_emotions_d", "pg.w_imagination_d", "pg.w_family_d", "pg.w_growing_d",
  "home6.nav_home", "home6.nav_stories", "home6.nav_ages", "home6.nav_world", "home6.nav_gifts", "home6.nav_about", "home6.nav_faq", "home6.cta_create",
];
SERVER_KEYS.forEach(k => keys.add(k));
// Optional: theme chip labels on story pages (a missing one falls back to the theme group label, like the shop).
["confidence", "courage", "new", "kindness", "friendship", "emotions", "honesty", "adventure", "bedtime", "imagination", "family", "growing", "change", "screen", "responsibility"].forEach(m => keys.add("home6.th_" + m));
const text = {};
for (const k of [...keys].sort()) { const v = arLookup(k); if (v != null) text[k] = v; }
for (const k of SERVER_KEYS) if (!(k in text)) problems.push(`no Arabic text for server key ${k}`);

const out = `// GENERATED by tools/seo/gen_ar_seo.js from the site's EN/AR copy. Do not edit by hand.
// Arabic main headings and FAQ structured data for the ?lang=ar version of each public page.
export const AR_H1 = ${JSON.stringify(h1, null, 1)};
export const AR_FAQ = ${JSON.stringify(faq, null, 1)};
// Arabic text for every translation key used on the public pages (key -> Arabic).
export const AR_TEXT = ${JSON.stringify(text)};
`;
fs.writeFileSync(OUT, out);
console.log(`ar-seo-data.js: ${Object.keys(text).length} Arabic strings, ${Object.keys(h1).length} Arabic headings, ${Object.keys(faq).length} Arabic FAQ pages (${Object.values(faq).reduce((n, a) => n + a.length, 0)} questions)`);
if (problems.length) { console.log("Problems:\n  " + problems.join("\n  ")); process.exitCode = 1; }
