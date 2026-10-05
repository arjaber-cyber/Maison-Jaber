// netlify/functions/purge-child-photos.js
//
// Scheduled daily (see netlify.toml). Deletes every child photo in the private
// "order-photos" bucket whose date folder is more than 15 days old, which is
// what the site promises parents ("uploaded photos are deleted within 15 days").
// Photos live under YYYY-MM-DD/ folders written by upload-child-photo.js.
// Env: SUPABASE_SERVICE_ROLE_KEY.
const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const BUCKET = 'order-photos';
const KEEP_DAYS = 15;

async function list(key, prefix) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
  });
  if (!res.ok) throw new Error(`list ${prefix || '/'} ${res.status}`);
  return res.json();
}

exports.handler = async () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) { console.error('purge-child-photos: SUPABASE_SERVICE_ROLE_KEY is not set'); return { statusCode: 503 }; }
  const cutoff = new Date(Date.now() - KEEP_DAYS * 24 * 3600 * 1000).toISOString().slice(0, 10);
  let removed = 0;
  try {
    const folders = (await list(key, '')).map(f => f.name).filter(n => /^\d{4}-\d{2}-\d{2}$/.test(n) && n < cutoff);
    for (const folder of folders) {
      for (;;) {
        const files = (await list(key, folder + '/')).map(f => `${folder}/${f.name}`).filter(p => !p.endsWith('/'));
        if (!files.length) break;
        const del = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
          method: 'DELETE',
          headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefixes: files }),
        });
        if (!del.ok) throw new Error(`delete ${folder} ${del.status}`);
        removed += files.length;
        if (files.length < 1000) break;
      }
    }
    console.log(`purge-child-photos: removed ${removed} photo(s) from folders before ${cutoff}`);
    return { statusCode: 200, body: JSON.stringify({ removed }) };
  } catch (err) {
    console.error('purge-child-photos error:', err);
    return { statusCode: 500 };
  }
};
