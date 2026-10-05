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

// Mirrors the active stories in the dashboard (Oct 2026); only used if the database cannot be reached.
const BUILT_IN_STORIES = [
  {
    "slug": "bravest-little-one",
    "title": "Door of a Thousand Stars",
    "title_ar": "باب الألف نجمة",
    "theme": "courage",
    "age_bands": [
      "2-4",
      "4-6",
      "6-8"
    ],
    "moments": [
      "courage",
      "confidence",
      "growing",
      "imagination",
      "adventure"
    ],
    "premise": {
      "ar": "نجمة تتكلّم، وباب سحري، ومغامرة فوق الغيوم! قصة تساعد طفلك على اكتشاف شجاعته ليخطو خطوة أخرى، حتى حين تبدو البداية الجديدة مخيفة.",
      "en": "A talking star, a magical doorway and an adventure beyond the clouds! Help your child discover the courage to take one more step—even when a new beginning feels scary."
    },
    "description": "A talking star, a magical doorway and an adventure beyond the clouds! Help your child discover the courage to take one more step—even when a new beginning feels scary.",
    "cover_image_url": "https://zxzlarlpoctpnnnvzced.supabase.co/storage/v1/object/public/site-photos/stories/bravest-little-one-1791128047538.jpg",
    "sort_order": 1,
    "featured": false,
    "has_extra_character": false,
    "age_ranges": "2-4,4-6,6-8",
    "active": true,
    "built_in": true,
    "extra_character_name": null,
    "extra_character_fee_aed": 0,
    "preview_images": []
  },
  {
    "slug": "cloud-ship",
    "title": "Why Is Baby Looking At Me",
    "title_ar": "لماذا ينظر إليّ المولود الصغير؟",
    "theme": "adventure",
    "age_bands": [
      "2-4",
      "4-6",
      "6-8"
    ],
    "moments": [
      "family",
      "emotions",
      "kindness",
      "growing"
    ],
    "premise": {
      "ar": "مولود جديد يعني تغييرات كبيرة وأسئلة كثيرة! قصة دافئة ومرحة عن إيجاد مكانك في العائلة، ومشاركة اللحظات الصغيرة، واكتشاف فرحة أن تصبح الأخ الأكبر أو الأخت الكبرى.",
      "en": "A new baby brings big changes—and lots of questions! A warm, playful story about finding your place, sharing little moments and discovering the joy of being an older sibling."
    },
    "description": "A new baby brings big changes—and lots of questions! A warm, playful story about finding your place, sharing little moments and discovering the joy of being an older sibling.",
    "cover_image_url": "https://zxzlarlpoctpnnnvzced.supabase.co/storage/v1/object/public/site-photos/stories/cloud-ship-1791128246472.jpg",
    "sort_order": 2,
    "featured": false,
    "has_extra_character": false,
    "age_ranges": "2-4,4-6,6-8",
    "active": true,
    "built_in": true,
    "extra_character_name": null,
    "extra_character_fee_aed": 0,
    "preview_images": []
  },
  {
    "slug": "star-who-couldnt-sleep",
    "title": "To The Rescue",
    "title_ar": "إلى الإنقاذ!",
    "theme": "courage",
    "age_bands": [
      "2-4",
      "4-6",
      "6-8"
    ],
    "moments": [
      "kindness",
      "courage",
      "family"
    ],
    "premise": {
      "ar": "كرة ضائعة، وطائرة ورقية عالقة، وفرص صغيرة للمساعدة! مغامرة مبهجة تُري طفلك كيف يصنع العقل الفضولي والقلب الطيب واليدان الصغيرتان فرقًا كبيرًا.",
      "en": "A missing ball, a stuck kite and little chances to help! A cheerful adventure showing your child how curious minds, kind hearts and small hands can make a big difference."
    },
    "description": "A missing ball, a stuck kite and little chances to help! A cheerful adventure showing your child how curious minds, kind hearts and small hands can make a big difference.",
    "cover_image_url": "https://zxzlarlpoctpnnnvzced.supabase.co/storage/v1/object/public/site-photos/stories/star-who-couldnt-sleep-1791128371859.jpg",
    "sort_order": 3,
    "featured": false,
    "has_extra_character": false,
    "age_ranges": "2-4,4-6,6-8",
    "active": true,
    "built_in": true,
    "extra_character_name": null,
    "extra_character_fee_aed": 0,
    "preview_images": []
  },
  {
    "slug": "the-silver-wingmission",
    "title": "The Silver WingMission",
    "title_ar": "مهمة الجناح الفضي",
    "theme": "courage",
    "age_bands": [
      "2-4",
      "4-6",
      "6-8"
    ],
    "moments": [
      "kindness",
      "courage",
      "emotions",
      "imagination",
      "growing"
    ],
    "premise": {
      "ar": "سفينة فضاء، ومهمة في ساحة اللعب، وقرار شجاع واحد. مغامرة مدرسية مشوّقة عن الوقوف إلى جانب صديق، والترحيب بالآخرين، واكتشاف كيف يغيّر اللطف يومًا كاملًا.",
      "en": "A spaceship, a playground mission and one brave choice. An exciting school adventure about standing beside a friend, welcoming others and discovering how kindness can change the day."
    },
    "description": "A spaceship, a playground mission and one brave choice. An exciting school adventure about standing beside a friend, welcoming others and discovering how kindness can change the day.",
    "cover_image_url": "https://zxzlarlpoctpnnnvzced.supabase.co/storage/v1/object/public/site-photos/stories/the-silver-wingmission-1791128461892.jpg",
    "sort_order": 100,
    "featured": false,
    "has_extra_character": false,
    "age_ranges": "2-4,4-6,6-8",
    "active": true,
    "built_in": true,
    "extra_character_name": null,
    "extra_character_fee_aed": 0,
    "preview_images": []
  }
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
