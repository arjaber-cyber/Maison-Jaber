// netlify/functions/_member.js
//
// Who is signed in, and have they verified their WhatsApp number?
// Discount codes are members-only: a signed-in account with a verified
// number. One verified number can belong to one account only, so a second
// account can't reuse a code with the same phone.

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const H = (extra) => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', ...(extra || {}) });

const authHeaderOf = event => (event && event.headers && (event.headers.authorization || event.headers.Authorization)) || '';

// -> { id, email } or null
async function currentUser(auth) {
  if (!auth || !/^Bearer\s+\S+/.test(auth)) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? { id: u.id, email: String(u.email || '').toLowerCase() } : null;
  } catch { return null; }
}

async function phoneRow(userId) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/customer_phones?user_id=eq.${encodeURIComponent(userId)}&select=*`, { headers: H() });
  if (!r.ok) throw new Error(`customer_phones ${r.status}`);
  const rows = await r.json();
  return rows[0] || null;
}

// -> { user, phone } when signed in AND verified; otherwise { reason: 'need_account' | 'need_phone' }
async function verifiedMember(auth) {
  const user = await currentUser(auth);
  if (!user) return { reason: 'need_account' };
  let row = null;
  try { row = await phoneRow(user.id); } catch (e) { console.error('verifiedMember', e.message); return { reason: 'unavailable' }; }
  if (!row || !row.verified_at || !row.phone) return { reason: 'need_phone', user };
  return { user, phone: row.phone };
}

module.exports = { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_KEY, H, authHeaderOf, currentUser, phoneRow, verifiedMember };
