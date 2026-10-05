// netlify/functions/get-orders.js
//
// Returns real completed orders from Supabase's `orders` table -- this is
// where the actual multi-book cart, bundle discount, and promo code data
// lands once checkout succeeds (see process-payment.js). This is separate
// from get-submissions.js, which only shows Netlify Forms data (one entry
// per book added to a cart, not the full completed order) -- the admin
// dashboard should treat THIS as the source of truth for what customers
// actually bought.
//
// Admin-gated via a single shared password (see admin-auth.js / ADMIN_PASSWORD).

const { isAdminRequest } = require('./_admin-check');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
// Server-side key (set SUPABASE_SERVICE_ROLE_KEY in Netlify env). The tables are locked with RLS,
// so the public anon key alone can only read public storefront data.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

exports.handler = async (event) => {
  if (!isAdminRequest(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authorized.' }) };
  }

  // ?id=<uuid> returns ONE order with its full photos; otherwise the list is
  // returned with photo data stripped (keeps the response small).
  const one = event.queryStringParameters && event.queryStringParameters.id;
  if (one && !/^[0-9a-f-]{36}$/i.test(one)) return { statusCode: 400, body: JSON.stringify({ error: 'Invalid id.' }) };
  try {
    const url = one
      ? `${SUPABASE_URL}/rest/v1/orders?id=eq.${one}&select=*`
      : `${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc&limit=1000`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) {
      console.error('get-orders: orders query failed', res.status, await res.text());
      return { statusCode: 200, body: JSON.stringify({ orders: [], tableReady: false }) };
    }
    const rows = await res.json();
    // Child photos live in the private "order-photos" bucket: for a single order, hand the
    // dashboard short-lived signed links (1 hour) in the same shape it already displays.
    async function signed(paths) {
      if (!paths.length || !process.env.SUPABASE_SERVICE_ROLE_KEY) return {};
      try {
        const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/order-photos`, {
          method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiresIn: 3600, paths }),
        });
        if (!r.ok) { console.error('get-orders: sign failed', r.status); return {}; }
        const out = {}; (await r.json()).forEach(x => { if (x.signedURL) out[x.path] = `${SUPABASE_URL}/storage/v1${x.signedURL}`; });
        return out;
      } catch (e) { console.error('get-orders: sign error', e); return {}; }
    }
    const strip = (list) => (list || []).map(p => ({ name: p.name, type: p.type }));
    const orders = rows.map(row => {
      let items = [];
      try { items = typeof row.items === 'string' ? JSON.parse(row.items || '[]') : (row.items || []); } catch { items = []; }
      if (!one) items = items.map(it => ({ ...it, photos: strip(it.photos), extraCharacterPhotos: strip(it.extraCharacterPhotos) }));
      return { ...row, items };
    });
    if (one) {
      for (const o of orders) {
        const all = o.items.flatMap(it => [...(it.photoPaths || []), ...(it.extraCharacterPhotoPaths || [])]);
        const urls = await signed(all);
        o.items = o.items.map(it => ({
          ...it,
          photos: [...(it.photos || []), ...(it.photoPaths || []).filter(p => urls[p]).map((p, k) => ({ name: `photo-${k + 1}`, type: 'image/jpeg', dataUrl: urls[p] }))],
          extraCharacterPhotos: [...(it.extraCharacterPhotos || []), ...(it.extraCharacterPhotoPaths || []).filter(p => urls[p]).map((p, k) => ({ name: `extra-${k + 1}`, type: 'image/jpeg', dataUrl: urls[p] }))],
        }));
      }
    }
    return { statusCode: 200, body: JSON.stringify({ orders, tableReady: true }) };
  } catch (err) {
    console.error('get-orders error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong loading orders.' }) };
  }
};
