// netlify/functions/_gsc.js
//
// Google Search Console (Oct 2026): which Google searches showed the site and
// which ones people clicked, for the Customers tab. Read-only.
//
// One-time setup (free):
//   1. Google Cloud console > new project > enable "Google Search Console API".
//   2. Create a service account, then a JSON key for it.
//   3. Search Console > Settings > Users and permissions > Add user: the
//      service account's email, permission "Restricted".
//   4. Netlify env vars: GSC_CLIENT_EMAIL (client_email from the key) and
//      GSC_PRIVATE_KEY (private_key from the key, as is).
//      Optional GSC_SITE_URL (default "sc-domain:maison-jaber.com"; use
//      "https://maison-jaber.com/" if the property is a URL-prefix one).
// Google shows search words in totals only, never per person.

const crypto = require('crypto');

const configured = () => Boolean(process.env.GSC_CLIENT_EMAIL && process.env.GSC_PRIVATE_KEY);
const b64url = buf => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: process.env.GSC_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const key = String(process.env.GSC_PRIVATE_KEY).replace(/\\n/g, '\n');
  const sig = b64url(crypto.createSign('RSA-SHA256').update(`${header}.${claim}`).sign(key));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claim}.${sig}` }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error(`Google sign-in failed (${d.error_description || d.error || r.status})`);
  return d.access_token;
}

const day = d => d.toISOString().slice(0, 10);

// { configured, queries:[{query, clicks, impressions, ctr, position}], pages:[...], totals }
async function searchSummary(days = 28) {
  if (!configured()) return { configured: false };
  const site = process.env.GSC_SITE_URL || 'sc-domain:maison-jaber.com';
  // Search Console data runs ~2 days behind.
  const end = new Date(Date.now() - 2 * 864e5);
  const start = new Date(end.getTime() - (days - 1) * 864e5);
  try {
    const token = await accessToken();
    const q = async (dimensions, rowLimit) => {
      const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: day(start), endDate: day(end), dimensions, rowLimit }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d.error && d.error.message) || `Search Console ${r.status}`);
      return d.rows || [];
    };
    const [queries, pages, totals] = await Promise.all([q(['query'], 25), q(['page'], 10), q([], 1)]);
    const row = r => ({ name: r.keys ? r.keys[0] : null, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position });
    return { configured: true, site, from: day(start), to: day(end), queries: queries.map(row), pages: pages.map(row), totals: totals[0] ? row(totals[0]) : { clicks: 0, impressions: 0 } };
  } catch (e) {
    return { configured: true, site, error: e.message };
  }
}

module.exports = { searchSummary, configured };
