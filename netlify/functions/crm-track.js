// netlify/functions/crm-track.js
//
// Public. Opens and clicks for CRM campaign emails.
//   ?s=<send id>&o=1    -> counts an open, returns a 1x1 transparent GIF
//   ?s=<send id>&l=<n>  -> counts a click, redirects to link n of that campaign
// Links are looked up by index from the campaign itself, so this can never be used
// to redirect people to an arbitrary site. Tracking problems never block the visitor.

const { sb, rpc } = require('./_crm');
const { SITE_URL } = require('./_email');

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const pixel = () => ({ statusCode: 200, headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, max-age=0' }, body: GIF.toString('base64'), isBase64Encoded: true });
const go = url => ({ statusCode: 302, headers: { Location: url, 'Cache-Control': 'no-store' }, body: '' });

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const id = String(q.s || '');
  const valid = /^[0-9a-f-]{36}$/i.test(id);

  if (q.o) {
    if (valid) await rpc('crm_track_event', { p_send: id, p_kind: 'open' }).catch(e => console.warn('open track', e.message));
    return pixel();
  }

  const n = parseInt(q.l, 10);
  if (!valid || !(n >= 0)) return go(SITE_URL);
  try {
    const campaignId = await rpc('crm_track_event', { p_send: id, p_kind: 'click' });
    if (campaignId) {
      const [c] = await sb(`crm_campaigns?id=eq.${campaignId}&select=links`);
      const url = c && Array.isArray(c.links) ? c.links[n] : null;
      if (url && /^(https?:|mailto:)/i.test(url)) return go(url);
    }
  } catch (e) { console.warn('click track', e.message); }
  return go(SITE_URL);
};
