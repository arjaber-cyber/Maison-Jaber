// netlify/functions/ig-thumb.js
//
// Cover picture for one Instagram post on the "Hikaya moments" homepage row (Nov 2026).
// Used when the site shows hand-picked posts (no Instagram token set up): reads the post's public
// embed page (the same page Instagram's own "Embed" button uses), takes its cover image and returns it.
// Cached on Netlify's CDN for 7 days, so Instagram is asked once a week per post, not per visitor.
//
// GET /.netlify/functions/ig-thumb?c=<post code>   e.g. c=Dfo0TDTtJ_X

const CODE = /^[A-Za-z0-9_-]{5,40}$/;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const unesc = s => s.replace(/&amp;/g, '&').replace(/&#x2F;/gi, '/').replace(/&#064;/g, '@');
const fail = (why) => ({ statusCode: 404, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=300' }, body: why });

exports.handler = async (event) => {
  const c = (event.queryStringParameters || {}).c || '';
  if (!CODE.test(c)) return fail('bad code');
  try {
    const page = await fetch(`https://www.instagram.com/p/${c}/embed/`, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
    if (!page.ok) return fail('embed ' + page.status);
    const html = await page.text();
    const m = html.match(/class="EmbeddedMediaImage"[^>]*?\ssrc="([^"]+)"/) || html.match(/<img[^>]+src="([^"]+)"[^>]*class="EmbeddedMediaImage"/);
    if (!m) return fail('no image');
    const img = await fetch(unesc(m[1]), { headers: { 'User-Agent': UA, Referer: 'https://www.instagram.com/' } });
    if (!img.ok) return fail('image ' + img.status);
    const buf = Buffer.from(await img.arrayBuffer());
    return {
      statusCode: 200,
      headers: {
        'Content-Type': img.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Netlify-CDN-Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
      },
      body: buf.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.warn('ig-thumb', c, e && e.message);
    return fail('error');
  }
};
