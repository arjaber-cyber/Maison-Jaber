// netlify/functions/get-stories.js
//
// Public, read-only. Returns the story catalog from Supabase's `stories`
// table. Falls back to the 3 original stories if the table doesn't exist
// yet, so the site keeps working exactly as it does today until the admin
// starts adding stories through the dashboard.
//
// SETUP: create a `stories` table in Supabase:
//   slug text primary key, title text, theme text (courage|adventure|lullaby),
//   collection text, age_ranges text, description text, cover_gradient text,
//   has_extra_character boolean default false, extra_character_name text,
//   extra_character_fee_aed numeric default 50, active boolean default true,
//   created_at timestamptz

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
// Server-side key (set SUPABASE_SERVICE_ROLE_KEY in Netlify env). The tables are locked with RLS,
// so the public anon key alone can only read public storefront data.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

// The 3 stories the site launched with -- always included first, always
// available even before the admin adds anything or if the table isn't
// set up yet. None of these have an extra character.
const BUILT_IN_STORIES = [
  {
    slug: 'bravest-little-one', title: 'The Bravest Little One', theme: 'courage',
    collection: 'Courage & Confidence', age_ranges: '2-4,4-6,6-8',
    description: 'For the child facing something new, and finding they are braver than they know.',
    cover_gradient: 'courage', has_extra_character: false, extra_character_name: null,
    extra_character_fee_aed: 0, detail_url: 'story-bravest-little-one.html', built_in: true,
  },
  {
    slug: 'cloud-ship', title: 'The Cloud Ship', theme: 'adventure',
    collection: 'Adventure & Wonder', age_ranges: '2-4,4-6,6-8',
    description: 'For the dreamer who wants to sail among the stars on a ship made of soft cloud.',
    cover_gradient: 'adventure', has_extra_character: false, extra_character_name: null,
    extra_character_fee_aed: 0, detail_url: 'story-cloud-ship.html', built_in: true,
  },
  {
    slug: 'star-who-couldnt-sleep', title: "The Star Who Couldn't Sleep", theme: 'lullaby',
    collection: 'Bedtime & Comfort', age_ranges: '2-4,4-6,6-8',
    description: 'A gentle wind-down story for the very end of the day.',
    cover_gradient: 'lullaby', has_extra_character: false, extra_character_name: null,
    extra_character_fee_aed: 0, detail_url: 'story-star-who-couldnt-sleep.html', built_in: true,
  },
];

const { isAdminRequest } = require('./_admin-check');

// Stories now live entirely in the `stories` table (the 3 launch stories are
// seeded there with built_in = true). The hardcoded list above is only a
// fallback for when the database can't be reached.
// ?all=1 with the admin password also returns hidden (inactive) stories.
exports.handler = async (event) => {
  const wantAll = event && event.queryStringParameters && event.queryStringParameters.all === '1' && isAdminRequest(event);
  try {
    const filter = wantAll ? '' : 'active=eq.true&';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/stories?${filter}select=*&order=sort_order.asc,created_at.asc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) {
      return { statusCode: 200, headers: { 'Cache-Control': 'no-store' }, body: JSON.stringify({ stories: BUILT_IN_STORIES, tableReady: false }) };
    }
    const rows = await res.json();
    // Table not seeded yet -> keep showing the launch stories rather than an empty shelf.
    if (!wantAll && rows.length === 0) {
      const any = await fetch(`${SUPABASE_URL}/rest/v1/stories?select=slug&limit=1`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }).then(r => r.json()).catch(() => [1]);
      if (Array.isArray(any) && any.length === 0) return { statusCode: 200, body: JSON.stringify({ stories: BUILT_IN_STORIES, tableReady: false }) };
    }
    const stories = rows.map(r => ({ ...r, built_in: !!r.built_in, detail_url: r.detail_url || null }));
    return { statusCode: 200, headers: { 'Cache-Control': wantAll ? 'no-store' : 'public, max-age=30' }, body: JSON.stringify({ stories, tableReady: true }) };
  } catch (err) {
    console.error('get-stories error:', err);
    return { statusCode: 200, body: JSON.stringify({ stories: BUILT_IN_STORIES, tableReady: false }) };
  }
};
