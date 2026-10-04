// netlify/functions/save-story.js
//
// Admin-only (single shared password, see admin-auth.js / _admin-check.js).
// Creates or updates one story in the catalog, including whether it has an
// optional extra character (e.g. a mother/father figure) that customers
// can choose to personalize with a real photo for an extra fee.

const { isAdminRequest } = require('./_admin-check');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
// Server-side key (set SUPABASE_SERVICE_ROLE_KEY in Netlify env). The tables are locked with RLS,
// so the public anon key alone can only read public storefront data.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

const THEMES = ['courage', 'adventure', 'lullaby'];
// Must match /story-themes.js (MOMENTS keys and AGE_GROUPS).
const MOMENT_IDS = ['courage', 'confidence', 'new', 'kindness', 'friendship', 'emotions', 'honesty', 'imagination', 'adventure', 'bedtime', 'family', 'change', 'screen', 'responsibility', 'growing'];
const AGE_GROUPS = ['2-4', '4-6', '6-8'];
// Themes keep the order chosen in the dashboard (the first is the main theme); age groups go youngest first.
const cleanList = (v, allowed) => Array.isArray(v) ? [...new Set(v)].filter(x => allowed.includes(x)) : null;
const cleanAges = (v) => Array.isArray(v) ? AGE_GROUPS.filter(x => v.includes(x)) : null;
function cardThemeFor(moments) {
  if (moments.includes('bedtime')) return 'lullaby';
  if (moments.some(m => ['courage', 'confidence', 'new'].includes(m))) return 'courage';
  return 'adventure';
}

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

  const { title, titleAr, moments: rawMoments, ageBands: rawAgeBands, theme: rawTheme, collection, ageRanges, description, descriptionAr, coverGradient,
    hasExtraCharacter, extraCharacterName, extraCharacterFeeAed, active, slug: existingSlug } = payload;

  const moments = cleanList(rawMoments, MOMENT_IDS);
  const ageBands = cleanAges(rawAgeBands);
  // New dashboard sends themes; the card colour is derived from them. Older clients still send a theme.
  const theme = moments && moments.length ? cardThemeFor(moments) : rawTheme;
  if (moments && !moments.length) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please tick at least one theme.' }) };
  }
  if (ageBands && !ageBands.length) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please tick at least one age group.' }) };
  }
  if (!title || !THEMES.includes(theme)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please provide a title and a valid theme (courage, adventure, or lullaby).' }) };
  }
  if (hasExtraCharacter && !extraCharacterName) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please name the extra character (e.g. "Mother").' }) };
  }

  const slug = existingSlug || slugify(title);
  const row = {
    slug, title, theme,
    // Only sent by the updated admin form; older clients leave the stored Arabic title alone.
    ...(typeof titleAr === 'string' ? { title_ar: titleAr.trim() || null } : {}),
    ...(moments ? { moments } : {}),
    ...(ageBands ? { age_bands: ageBands } : {}),
    collection: collection || '', age_ranges: (ageBands && ageBands.length) ? ageBands.join(',') : (ageRanges || '2-4,4-6,6-8'),
    description: description || '', cover_gradient: coverGradient || theme,
    // The storefront shows "premise" on cards and story pages; keep it in step with what the dashboard edits.
    ...(typeof descriptionAr === 'string' ? { premise: { en: description || '', ar: descriptionAr.trim() } } : {}),
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
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({ ...row, updated_at: new Date().toISOString() }),
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
