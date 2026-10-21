// Send every odd spelling of the shop address to the real one, /hikaya/ (lowercase,
// with the trailing slash), before anything is served.
//
// Why: /hikaya without the slash still served the homepage, but its relative links
// (hikaya.css, images/...) then resolved against the site root and 404'd, so the
// visitor got an unstyled page. Instagram ad clicks were landing there. The inline
// script in test5/index.html already fixes this for browsers that run JavaScript,
// but the browser's preloader and link-preview bots fetch the CSS before it runs.
// /Hikaya (capital H) and /Hikaya/... were plain 404s.
//
// Query strings (fbclid, utm_*) are kept so ad tracking still works.

export default (request) => {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/hikaya(\/.*)?$/i);
  if (!match) return;
  const target = "/hikaya" + (match[1] || "/");
  if (target === url.pathname) return; // already correct: carry on as normal
  return new Response(null, {
    status: 301,
    headers: {
      Location: target + url.search,
      "Cache-Control": "public, max-age=3600",
    },
  });
};

export const config = {
  path: ["/hikaya", "/Hikaya", "/Hikaya/*", "/HIKAYA", "/HIKAYA/*"],
};
