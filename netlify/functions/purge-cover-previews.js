// netlify/functions/purge-cover-previews.js
//
// Scheduled hourly (see netlify.toml). Keeps the promise made on the free AI
// cover preview page: the child's photo, the illustration and the watermarked
// preview are deleted within 48 hours. Runs on rows from the website only
// (source = 'site'); the lab test images are not touched.
// For every site preview older than 46 hours that has not been purged yet:
//   - deletes site/photos/<id>.jpg (and <id>-adult.jpg, the optional parent photo), site/results/<id>.jpg, site/results/<id>-2.jpg, site/previews/<id>.jpg
//   - deletes the cached written description of the photo (cover_photo_analysis)
//   - clears the file paths on the row and sets purged_at (the short record stays for limits and abuse checks)
// Env: SUPABASE_SERVICE_ROLE_KEY.
const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const BUCKET = 'cover-previews';
const KEEP_HOURS = 46;

function h(key, extra) {
  return Object.assign({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, extra || {});
}

exports.handler = async () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) { console.error('purge-cover-previews: SUPABASE_SERVICE_ROLE_KEY is not set'); return { statusCode: 503 }; }
  const cutoff = new Date(Date.now() - KEEP_HOURS * 3600 * 1000).toISOString();
  let rows = 0, files = 0;
  try {
    for (let round = 0; round < 20; round++) {
      const q = `${SUPABASE_URL}/rest/v1/cover_previews?select=id,photo_path&source=eq.site&purged_at=is.null&created_at=lt.${encodeURIComponent(cutoff)}&order=created_at.asc&limit=200`;
      const res = await fetch(q, { headers: h(key) });
      if (!res.ok) throw new Error(`select ${res.status}`);
      const list = await res.json();
      if (!list.length) break;
      const ids = list.map(r => r.id);
      const paths = [];
      for (const id of ids) paths.push(`site/photos/${id}.jpg`, `site/photos/${id}-adult.jpg`, `site/results/${id}.jpg`, `site/results/${id}-2.jpg`, `site/previews/${id}.jpg`);
      const del = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: h(key), body: JSON.stringify({ prefixes: paths }) });
      if (!del.ok) throw new Error(`delete files ${del.status}`);
      try { const gone = await del.json(); files += Array.isArray(gone) ? gone.length : 0; } catch (_) {}
      const photoPaths = list.map(r => r.photo_path).filter(Boolean);
      if (photoPaths.length) {
        const inList = photoPaths.map(p => `"${p.replace(/"/g, '')}"`).join(',');
        const a = await fetch(`${SUPABASE_URL}/rest/v1/cover_photo_analysis?photo_path=in.(${encodeURIComponent(inList)})`, { method: 'DELETE', headers: h(key) });
        if (!a.ok) throw new Error(`delete analysis ${a.status}`);
      }
      const upd = await fetch(`${SUPABASE_URL}/rest/v1/cover_previews?id=in.(${ids.join(',')})`, {
        method: 'PATCH', headers: h(key, { Prefer: 'return=minimal' }),
        body: JSON.stringify({ purged_at: new Date().toISOString(), photo_path: null, adult_photo_path: null, result_path: null, preview_path: null }),
      });
      if (!upd.ok) throw new Error(`update rows ${upd.status}`);
      rows += ids.length;
      if (list.length < 200) break;
    }
    console.log(`purge-cover-previews: purged ${rows} preview(s), ${files} file(s), older than ${cutoff}`);
    return { statusCode: 200, body: JSON.stringify({ rows, files }) };
  } catch (err) {
    console.error('purge-cover-previews error:', err);
    return { statusCode: 500 };
  }
};
