// QA 15 Nov 2026: the visitor's country from Netlify's own edge location data, so the shop can suggest the right
// GCC currency on a first visit without calling a third-party IP service from the browser (ipapi.co was
// rate-limited and blocked by some ad blockers). Returns only a two-letter country code; nothing is stored.
export default (request, context) => {
  const code = (context && context.geo && context.geo.country && context.geo.country.code) || "";
  return new Response(JSON.stringify({ country_code: String(code).toUpperCase().slice(0, 2) }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
};

export const config = { path: "/api/geo" };
