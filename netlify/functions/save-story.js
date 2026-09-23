// netlify/functions/save-story.js
//
// Admin-only (single shared password, see admin-auth.js / _admin-check.js).
// Creates or updates one story in the catalog, including whether it has an
// optional extra character (e.g. a mother/father figure) that customers
// can choose to personalize with a real photo for an extra fee.

const { isAdminRequest } = require('./_admin-check');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';

const THEMES = ['courage', 'adventure', 'lullaby'];

function slugify(title) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  if (!isAdminRequest(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authorized.' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  const { title, theme, collection, ageRanges, description, coverGradient,
    hasExtraCharacter, extraCharacterName, extraCharacterFeeAed, active, slug: existingSlug } = payload;

  if (!title || !THEMES.includes(theme)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please provide a title and a valid theme (courage, adventure, or lullaby).' }) };
  }
  if (hasExtraCharacter && !extraCharacterName) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please name the extra character (e.g. "Mother").' }) };
  }

  const slug = existingSlug || slugify(title);
  const row = {
    slug, title, theme,
    collection: collection || '', age_ranges: ageRanges || '2-4,5-7,8-10',
    description: description || '', cover_gradient: coverGradient || theme,
    has_extra_character: !!hasExtraCharacter,
    extra_character_name: hasExtraCharacter ? extraCharacterName : null,
    extra_character_fee_aed: hasExtraCharacter ? Number(extraCharacterFeeAed) || 50 : 0,
    active: active !== false,
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/stories?on_conflict=slug`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({ ...row, created_at: new Date().toISOString() }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: `Couldn't save the story. Make sure the "stories" table exists in Supabase. Details: ${errText}`
        })
      };
    }
    return { statusCode: 200, body: JSON.stringify({ success: true, slug }) };
  } catch (err) {
    console.error('save-story error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong saving the story. Please try again.' }) };
  }
};
