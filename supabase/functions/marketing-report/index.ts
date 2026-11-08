// Hikaya marketing report (Nov 2026): read-only, aggregated, no personal data.
//
//   GET https://zxzlarlpoctpnnnvzced.supabase.co/functions/v1/marketing-report?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
//   Header: X-API-Key: <reporting key>
//
// - GET only (HEAD/OPTIONS answered, everything else 405). JSON only.
// - The key is checked against SHA-256 hashes in public.marketing_api_keys (service role only);
//   the plain key is never stored.
// - Rows come from public.marketing_daily(): counts and AED sums only. No names, emails, phones,
//   addresses, photos, order numbers or order contents ever leave this function.
// - The service-role key exists only inside Supabase's runtime and is never returned.

import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "x-api-key, content-type",
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: HEADERS });

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 400;
const names = new Intl.DisplayNames(["en"], { type: "region" });
const countryName = (code: string) => {
  if (!/^[A-Z]{2}$/.test(code || "")) return "Unknown";
  try { return names.of(code) || code; } catch { return code; }
};
const dubaiToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Small per-instance brake on key guessing.
const fails = new Map<string, { n: number; t: number }>();
function tooMany(ip: string) {
  const f = fails.get(ip);
  return !!f && Date.now() - f.t < 15 * 60_000 && f.n >= 20;
}
function noteFail(ip: string) {
  const f = fails.get(ip);
  if (!f || Date.now() - f.t > 15 * 60_000) fails.set(ip, { n: 1, t: Date.now() });
  else f.n++;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: HEADERS });
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...HEADERS, Allow: "GET, OPTIONS" } });
  }

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (tooMany(ip)) return json(429, { error: "too_many_attempts" });

  const key = req.headers.get("x-api-key") || "";
  if (key.length < 32 || key.length > 200) { noteFail(ip); return json(401, { error: "unauthorized" }); }
  const hash = await sha256(key);
  const { data: k, error: kErr } = await sb.from("marketing_api_keys").select("id").eq("key_hash", hash).eq("active", true).maybeSingle();
  if (kErr) return json(500, { error: "server_error" });
  if (!k) { noteFail(ip); return json(401, { error: "unauthorized" }); }

  const url = new URL(req.url);
  const today = dubaiToday();
  const dateTo = url.searchParams.get("date_to") || today;
  const dateFrom = url.searchParams.get("date_from") || dateTo;
  if (!DATE.test(dateFrom) || !DATE.test(dateTo) || isNaN(Date.parse(dateFrom)) || isNaN(Date.parse(dateTo))) {
    return json(400, { error: "bad_date", message: "date_from and date_to must be YYYY-MM-DD" });
  }
  const days = (Date.parse(dateTo) - Date.parse(dateFrom)) / 86_400_000 + 1;
  if (days < 1) return json(400, { error: "bad_range", message: "date_from must be on or before date_to" });
  if (days > MAX_DAYS) return json(400, { error: "range_too_long", message: `At most ${MAX_DAYS} days per request` });

  const { data, error } = await sb.rpc("marketing_daily", { date_from: dateFrom, date_to: dateTo });
  if (error) { console.error("marketing_daily", error.message); return json(500, { error: "server_error" }); }

  sb.from("marketing_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", k.id).then(() => {});

  const rows = (data || []).map((r: Record<string, unknown>) => ({
    date: r.date,
    country: countryName(String(r.country)),
    country_code: /^[A-Z]{2}$/.test(String(r.country)) ? r.country : null,
    source: r.source,
    medium: r.medium,
    campaign: r.campaign,
    sessions: Number(r.sessions),
    unique_visitors: Number(r.unique_visitors),
    personalize_starts: Number(r.personalize_starts),
    add_to_cart: Number(r.add_to_cart),
    checkouts: Number(r.checkouts),
    paid_purchases: Number(r.paid_purchases),
    free_code_purchases: Number(r.free_code_purchases),
    paid_revenue_aed: Number(r.paid_revenue_aed),
    free_code_revenue_aed: Number(r.free_code_revenue_aed),
  }));

  const sum = (f: string) => rows.reduce((a: number, r: Record<string, number>) => a + (r[f] || 0), 0);
  const totals = {
    sessions: sum("sessions"), unique_visitors: sum("unique_visitors"), personalize_starts: sum("personalize_starts"),
    add_to_cart: sum("add_to_cart"), checkouts: sum("checkouts"), paid_purchases: sum("paid_purchases"),
    free_code_purchases: sum("free_code_purchases"),
    paid_revenue_aed: Math.round(sum("paid_revenue_aed") * 100) / 100,
    free_code_revenue_aed: Math.round(sum("free_code_revenue_aed") * 100) / 100,
  };

  return json(200, {
    date_from: dateFrom,
    date_to: dateTo,
    timezone: "Asia/Dubai",
    currency: "AED",
    attribution: "first_touch",
    generated_at: new Date().toISOString(),
    rows,
    totals,
    notes: [
      "Use paid_revenue_aed and paid_purchases for ROAS / CPA. free_code_* are creator, gift and fully waived orders and must never count as revenue.",
      "Test orders are excluded. Only orders with payment_status 'paid' count as paid purchases (pending, cancelled, failed and refunded orders are excluded).",
      "Attribution is the visitor's first touch: the source saved on their device on first visit (90 days), else the first pageview of that visitor-day.",
      "unique_visitors are anonymous daily visitors (a visitor counts once per day). sessions break after 30 minutes without activity.",
      "personalize_starts = visitors who entered the personalisation steps; add_to_cart and checkouts are event counts.",
      "Ad spend is not included: join Google Ads data on date + campaign (source=google, medium=cpc).",
    ],
  });
});
