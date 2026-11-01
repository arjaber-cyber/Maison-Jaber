// netlify/functions/deploy-succeeded.js
//
// Runs automatically after every successful production deploy (Netlify event
// function, matched by its file name). It tells Bing, Yandex and the other
// IndexNow search engines which Hikaya pages exist, so new stories and changes
// are picked up within hours instead of weeks. Google does not use IndexNow; it
// reads the live sitemap (https://maison-jaber.com/sitemap.xml) instead.
//
// The key file proving we own the domain is /87490158fb8074cc89ca8e6873011794.txt in the site root.

const HOST = 'maison-jaber.com';
const KEY = '87490158fb8074cc89ca8e6873011794';

exports.handler = async (event) => {
  try {
    const body = JSON.parse((event && event.body) || '{}');
    const ctx = body && body.payload && body.payload.context;
    if (ctx && ctx !== 'production') return { statusCode: 200, body: 'skipped: ' + ctx };
    const xml = await fetch('https://' + HOST + '/sitemap.xml').then(r => r.text());
    const urlList = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1].replace(/&amp;/g, '&')).slice(0, 10000);
    if (!urlList.length) return { statusCode: 200, body: 'no urls' };
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: 'https://' + HOST + '/' + KEY + '.txt', urlList }),
    });
    console.log('IndexNow', r.status, urlList.length, 'urls');
    return { statusCode: 200, body: 'indexnow ' + r.status };
  } catch (err) {
    console.error('deploy-succeeded IndexNow error:', err);
    return { statusCode: 200, body: 'error' };
  }
};
