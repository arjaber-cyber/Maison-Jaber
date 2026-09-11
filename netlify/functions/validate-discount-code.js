// netlify/functions/validate-discount-code.js
//
// Validates a discount code at checkout. Checks Supabase's `discount_codes`
// table first; if that table doesn't exist yet (the known blocked-migration
// issue), falls back to a small hardcoded set of starter codes below, so
// this feature actually works today instead of waiting on infrastructure.
//
// SUPABASE TABLE SHAPE (once the migration goes through):
//   discount_codes (
//     code text primary key,          -- stored uppercase, e.g. 'WELCOME10'
//     type text,                      -- 'percent' | 'fixed' | 'free_shipping'
//     value numeric,                  -- 10 for 10%, or a fixed amount in EUR
//     max_uses integer,               -- null = unlimited
//     uses_count integer default 0,
//     expires_at timestamptz,         -- null = never expires
//     active boolean default true
//   )
//
// STACKING RULE: a valid code applies on top of whatever bundle discount
// the cart already qualifies for (calculated on the post-bundle price).
// A free_shipping code zeroes delivery regardless of bundle tier. This is
// a judgment call, not a confirmed business rule -- easy to change below
// if a different policy is wanted.

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';

// Starter codes -- remove these once the real Supabase table is live and
// populated, so codes are managed from the database instead of code.
const FALLBACK_CODES = {
  WELCOME10: { type: 'percent', value: 10, maxUses: null, expiresAt: null },
  FREESHIP: { type: 'free_shipping', value: 0, maxUses: null, expiresAt: null },
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const code = (payload.code || '').trim().toUpperCase();
  if (!code) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please enter a code.' }) };
  }

  // Try Supabase first.
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/discount_codes?code=eq.${encodeURIComponent(code)}&select=*`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows.length > 0) {
        return checkAndRespond(rows[0].type, rows[0].value, rows[0].max_uses, rows[0].uses_count, rows[0].expires_at, rows[0].active);
      }
      // Table exists but code not found there -- still check the fallback
      // list below in case it's a starter code not yet migrated to the DB.
    }
    // If res is not ok, the table likely doesn't exist yet -- fall through.
  } catch {
    // Network issue -- fall through to the fallback list.
  }

  const fallback = FALLBACK_CODES[code];
  if (fallback) {
    return checkAndRespond(fallback.type, fallback.value, fallback.maxUses, 0, fallback.expiresAt, true);
  }

  return { statusCode: 404, body: JSON.stringify({ error: 'That code isn\'t valid.' }) };
};

function checkAndRespond(type, value, maxUses, usesCount, expiresAt, active) {
  if (!active) {
    return { statusCode: 400, body: JSON.stringify({ error: 'That code is no longer active.' }) };
  }
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'That code has expired.' }) };
  }
  if (maxUses !== null && maxUses !== undefined && usesCount >= maxUses) {
    return { statusCode: 400, body: JSON.stringify({ error: 'That code has already been fully redeemed.' }) };
  }
  return { statusCode: 200, body: JSON.stringify({ valid: true, type, value }) };
}
