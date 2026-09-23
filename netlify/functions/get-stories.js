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

// The 3 stories the site launched with -- always included first, always
// available even before the admin adds anything or if the table isn't
// set up yet. None of these have an extra character.
const BUILT_IN_STORIES = [
  {
    slug: 'bravest-little-one', title: 'The Bravest Little One', theme: 'courage',
    collection: 'Courage & Confidence', age_ranges: '2-4,5-7,8-10',
    description: 'For the child facing something new, and finding they are braver than they know.',
    cover_gradient: 'courage', has_extra_character: false, extra_character_name: null,
    extra_character_fee_aed: 0, detail_url: 'story-bravest-little-one.html', built_in: true,
  },
  {
    slug: 'cloud-ship', title: 'The Cloud Ship', theme: 'adventure',
    collection: 'Adventure & Wonder', age_ranges: '2-4,5-7,8-10',
    description: 'For the dreamer who wants to sail among the stars on a ship made of soft cloud.',
    cover_gradient: 'adventure', has_extra_character: false, extra_character_name: null,
    extra_character_fee_aed: 0, detail_url: 'story-cloud-ship.html', built_in: true,
  },
  {
    slug: 'star-who-couldnt-sleep', title: "The Star Who Couldn't Sleep", theme: 'lullaby',
    collection: 'Bedtime & Comfort', age_ranges: '2-4,5-7,8-10',
    description: 'A gentle wind-down story for the very end of the day.',
    cover_gradient: 'lullaby', has_extra_character: false, extra_character_name: null,
    extra_character_fee_aed: 0, detail_url: 'story-star-who-couldnt-sleep.html', built_in: true,
  },
];

exports.handler = async () => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/stories?active=eq.true&select=*&order=created_at.asc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) {
      return { statusCode: 200, headers: { 'Cache-Control': 'public, max-age=60' }, body: JSON.stringify({ stories: BUILT_IN_STORIES, tableReady: false }) };
    }
    const rows = await res.json();
    const customStories = rows.map(r => ({ ...r, built_in: false, detail_url: null }));
    return { statusCode: 200, headers: { 'Cache-Control': 'public, max-age=60' }, body: JSON.stringify({ stories: [...BUILT_IN_STORIES, ...customStories], tableReady: true }) };
  } catch (err) {
    console.error('get-stories error:', err);
    return { statusCode: 200, body: JSON.stringify({ stories: BUILT_IN_STORIES, tableReady: false }) };
  }
};
