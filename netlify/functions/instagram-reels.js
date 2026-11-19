// netlify/functions/instagram-reels.js
//
// "Hikaya moments" on the homepage (Nov 2026): the latest videos (reels) from the Hikaya Instagram
// account, read straight from Instagram so new posts appear on the site by themselves.
//
// WHICH VIDEOS: Instagram's API does not say which posts are pinned, so the site follows a caption tag
// instead: any video whose caption contains #hikayamoments is shown (newest first), and editing the
// caption on Instagram adds or removes it from the site within ~3 hours. If no video carries the tag,
// the latest videos are shown. The tag is hidden from the caption shown on the site.
//
// MUSIC: Instagram does not hand out the video file for reels that use music from its audio library
// (or are flagged for copyright). Those still appear (cover picture); on the site they play through
// Instagram's own player inside our pop-up, so the music works.
//
// Returns: { items: [{ id, thumb, video|null, caption, permalink, ts }] }  (empty list when not set up,
// so the homepage simply keeps the section hidden).
//
// SETUP (Netlify environment variables):
//   IG_USER_ID       the Instagram business account id (from Meta Business Suite / Graph API Explorer)
//   IG_ACCESS_TOKEN  a long-lived token for that account with instagram_basic (Facebook Page token,
//                    which does not expire), or an Instagram-login token (starts with "IG", 60 days;
//                    refreshed automatically below when it is older than 30 days is not possible
//                    without storage, so prefer the Page token).
//
// Instagram's video links expire after a while, so the answer is cached on Netlify's CDN for
// 3 hours only (one Instagram call per 3 hours, not one per visitor).

const LIMIT = 8;

// HAND-PICKED VIDEOS (Nov 2026): shown while no Instagram token is set (IG_ACCESS_TOKEN), or if
// Instagram fails. Order = order on the site. To change them, edit this list (post or reel links,
// any account). Cover pictures come from ig-thumb.js; tapping plays them in Instagram's own player.
const PICKED = [
  'https://www.instagram.com/p/Dfo0TDTtJ_X/',
  'https://www.instagram.com/reel/Df61tbegf_r/',
  'https://www.instagram.com/p/Df4kShkKiKP/',
  'https://www.instagram.com/p/Df2J5kmOusE/',
  'https://www.instagram.com/p/DfeD87zIAQg/',
  'https://www.instagram.com/p/DfkRTkJstnX/',
];
function picked(reason) {
  const items = PICKED.map(u => (u.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/) || [])[1]).filter(Boolean)
    .map(c => ({ id: c, thumb: `/.netlify/functions/ig-thumb?c=${c}`, video: null, caption: '', permalink: `https://www.instagram.com/p/${c}/`, ts: null }));
  return json(200, { items, source: 'picked', reason }, true);
}
const TAG = /#hikayamoments\b/i;
const json = (code, body, cache) => ({
  statusCode: code,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300',
    ...(cache ? { 'Netlify-CDN-Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=3600' } : {}),
  },
  body: JSON.stringify(body),
});

function cleanCaption(c) {
  if (!c) return '';
  let line = String(c).split('\n').map(s => s.trim()).find(s => s && !/^[#@]/.test(s)) || '';
  line = line.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s{2,}/g, ' ').trim();
  return line.length > 60 ? line.slice(0, 57).replace(/\s+\S*$/, '') + '…' : line;
}

exports.handler = async () => {
  const id = process.env.IG_USER_ID, token = process.env.IG_ACCESS_TOKEN;
  if (!id || !token) return picked('not_configured');
  const host = /^IG/.test(token) ? 'https://graph.instagram.com' : 'https://graph.facebook.com/v21.0';
  const fields = 'id,media_type,media_product_type,media_url,thumbnail_url,permalink,caption,timestamp';
  try {
    const res = await fetch(`${host}/${encodeURIComponent(id)}/media?fields=${fields}&limit=30&access_token=${encodeURIComponent(token)}`);
    if (!res.ok) { console.warn('instagram-reels: Instagram said', res.status, (await res.text()).slice(0, 300)); return picked('instagram_error'); }
    const data = (await res.json()).data || [];
    const videos = data.filter(m => m.media_type === 'VIDEO' && m.thumbnail_url && m.permalink);
    const tagged = videos.filter(m => TAG.test(m.caption || ''));
    const items = (tagged.length ? tagged : videos)
      .slice(0, LIMIT)
      .map(m => ({ id: m.id, thumb: m.thumbnail_url, video: m.media_url || null, caption: cleanCaption(m.caption), permalink: m.permalink, ts: m.timestamp }));
    return json(200, { items }, true);
  } catch (e) {
    console.warn('instagram-reels failed', e);
    return picked('error');
  }
};
