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
    "slug": "christmas-star",
    "title": "The Christmas Star That Went Missing",
    "title_ar": "نجمة الميلاد التي ضاعت",
    "theme": "courage",
    "collection": "Confidence, Kindness, Imagination, Christmas",
    "age_ranges": "4-6,6-8",
    "age_bands": [
      "4-6",
      "6-8"
    ],
    "moments": [
      "confidence",
      "kindness",
      "imagination"
    ],
    "occasions": [
      "christmas",
      "birthday",
      "justbecause"
    ],
    "description": "On Christmas Eve, the little star has fallen from the sky into the snow! A magical winter adventure about helping a friend find their way home and discovering that you shine brightest simply by being you.",
    "premise": {
      "en": "On Christmas Eve, the little star has fallen from the sky into the snow! A magical winter adventure about helping a friend find their way home and discovering that you shine brightest simply by being you.",
      "ar": "في ليلة الميلاد، سقطت النجمة الصغيرة من السماء إلى الثلج! مغامرة شتوية ساحرة عن مساعدة صديق في العودة إلى مكانه، واكتشاف أنك تتألق أكثر حين تكون نفسك"
    },
    "card_note": {
      "en": "A magical Christmas story",
      "ar": "قصة ميلادية ساحرة"
    },
    "cover_gradient": "courage",
    "cover_image_url": "https://maison-jaber.com/story-assets/christmas-star/cover.jpg",
    "back_cover_url": "https://maison-jaber.com/story-assets/christmas-star/back.jpg",
    "cover_image_url_ar": "https://maison-jaber.com/story-assets/christmas-star/cover-ar.jpg",
    "back_cover_url_ar": "https://maison-jaber.com/story-assets/christmas-star/back-ar.jpg",
    "preview_images_ar": ["https://maison-jaber.com/story-assets/christmas-star/l1-ar.jpg", "https://maison-jaber.com/story-assets/christmas-star/l2-ar.jpg", "https://maison-jaber.com/story-assets/christmas-star/l3-ar.jpg", "https://maison-jaber.com/story-assets/christmas-star/l4-ar.jpg"],
    "preview_images": [
      "https://maison-jaber.com/story-assets/christmas-star/l1.jpg",
      "https://maison-jaber.com/story-assets/christmas-star/l2.jpg",
      "https://maison-jaber.com/story-assets/christmas-star/l3.jpg",
      "https://maison-jaber.com/story-assets/christmas-star/l4.jpg"
    ],
    "sort_order": 1,
    "featured": false,
    "active": true,
    "built_in": false,
    "has_extra_character": false,
    "extra_character_name": null,
    "extra_character_fee_aed": 0,
    "detail_url": null
  },
  {
    "slug": "door-of-a-thousand-stars",
    "title": "Door of a Thousand Stars",
    "title_ar": "باب الألف نجمة",
    "theme": "courage",
    "collection": "Courage, New things, Confidence, Adventure",
    "age_ranges": "4-6,6-8",
    "age_bands": [
      "4-6",
      "6-8"
    ],
    "moments": [
      "courage",
      "new",
      "confidence",
      "adventure"
    ],
    "occasions": [
      "school",
      "birthday",
      "eid",
      "justbecause"
    ],
    "description": "A talking star, a magical doorway and an adventure beyond the clouds! Help your child discover the courage to take one more step, even when a new beginning feels scary.",
    "premise": {
      "en": "A talking star, a magical doorway and an adventure beyond the clouds! Help your child discover the courage to take one more step, even when a new beginning feels scary.",
      "ar": "نجمة تتكلّم، وباب سحري، ومغامرة فوق الغيوم! قصة تساعد طفلك على اكتشاف شجاعته ليخطو خطوة أخرى، حتى حين تبدو البداية الجديدة مخيفة"
    },
    "card_note": {
      "en": "Perfect before a new school",
      "ar": "مثالية قبل بداية المدرسة"
    },
    "cover_gradient": "courage",
    "cover_image_url": "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/cover.jpg",
    "back_cover_url": "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/back.jpg",
    "cover_image_url_ar": "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/cover-ar.jpg",
    "back_cover_url_ar": "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/back-ar.jpg",
    "preview_images_ar": ["https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l1-ar.jpg", "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l2-ar.jpg", "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l3-ar.jpg", "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l4-ar.jpg"],
    "preview_images": [
      "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l1.jpg",
      "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l2.jpg",
      "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l3.jpg",
      "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l4.jpg"
    ],
    "sort_order": 2,
    "featured": false,
    "active": true,
    "built_in": false,
    "has_extra_character": false,
    "extra_character_name": null,
    "extra_character_fee_aed": 0,
    "detail_url": null
  },
  {
    "slug": "storm-above-the-city",
    "title": "The Storm Above the City",
    "title_ar": "العاصفة فوق المدينة",
    "theme": "courage",
    "collection": "Adventure, Courage, Imagination, Friendship",
    "age_ranges": "4-6,6-8",
    "age_bands": [
      "4-6",
      "6-8"
    ],
    "moments": [
      "adventure",
      "courage",
      "imagination",
      "friendship"
    ],
    "occasions": [
      "birthday",
      "eid",
      "justbecause"
    ],
    "description": "Rubber ducks are falling from the sky and a strange storm is spinning over the city! A superhero adventure about staying calm, thinking cleverly and learning that even heroes need a helping hand.",
    "premise": {
      "en": "Rubber ducks are falling from the sky and a strange storm is spinning over the city! A superhero adventure about staying calm, thinking cleverly and learning that even heroes need a helping hand.",
      "ar": "بطّات مطاطية تتساقط من السماء، وعاصفة غريبة تدور فوق المدينة! مغامرة بطولية عن الهدوء والتفكير الذكي، وعن أن الأبطال أيضًا يحتاجون إلى يد تساعدهم"
    },
    "card_note": {
      "en": "A superhero adventure",
      "ar": "مغامرة بطولية"
    },
    "cover_gradient": "courage",
    "cover_image_url": "https://maison-jaber.com/story-assets/storm-above-the-city/cover.jpg",
    "back_cover_url": "https://maison-jaber.com/story-assets/storm-above-the-city/back.jpg",
    "cover_image_url_ar": "https://maison-jaber.com/story-assets/storm-above-the-city/cover-ar.jpg",
    "back_cover_url_ar": "https://maison-jaber.com/story-assets/storm-above-the-city/back-ar.jpg",
    "preview_images_ar": ["https://maison-jaber.com/story-assets/storm-above-the-city/l1-ar.jpg", "https://maison-jaber.com/story-assets/storm-above-the-city/l2-ar.jpg", "https://maison-jaber.com/story-assets/storm-above-the-city/l3-ar.jpg", "https://maison-jaber.com/story-assets/storm-above-the-city/l4-ar.jpg"],
    "preview_images": [
      "https://maison-jaber.com/story-assets/storm-above-the-city/l1.jpg",
      "https://maison-jaber.com/story-assets/storm-above-the-city/l2.jpg",
      "https://maison-jaber.com/story-assets/storm-above-the-city/l3.jpg",
      "https://maison-jaber.com/story-assets/storm-above-the-city/l4.jpg"
    ],
    "sort_order": 3,
    "featured": false,
    "active": true,
    "built_in": false,
    "has_extra_character": false,
    "extra_character_name": null,
    "extra_character_fee_aed": 0,
    "detail_url": null
  },
  {
    "slug": "to-the-rescue",
    "title": "To the Rescue!",
    "title_ar": "إلى الإنقاذ!",
    "theme": "courage",
    "collection": "Kindness, Friendship, Confidence",
    "age_ranges": "2-4,4-6",
    "age_bands": [
      "2-4",
      "4-6"
    ],
    "moments": [
      "kindness",
      "friendship",
      "confidence"
    ],
    "occasions": [
      "birthday",
      "eid",
      "justbecause"
    ],
    "description": "A stuck ball, three little ducklings and a runaway kite! A cheerful neighbourhood adventure showing that you don't need a cape to be a hero, and that small hands can make a big difference.",
    "premise": {
      "en": "A stuck ball, three little ducklings and a runaway kite! A cheerful neighbourhood adventure showing that you don't need a cape to be a hero, and that small hands can make a big difference.",
      "ar": "كرة عالقة، وثلاث بطّات صغيرة، وطائرة ورقية هاربة! مغامرة مبهجة في الحيّ تُظهر أنك لا تحتاج إلى عباءة لتكون بطلًا، وأن اليدين الصغيرتين تصنعان فرقًا كبيرًا"
    },
    "card_note": {
      "en": "Small help, big difference",
      "ar": "مساعدة صغيرة وفرق كبير"
    },
    "cover_gradient": "courage",
    "cover_image_url": "https://maison-jaber.com/story-assets/to-the-rescue/cover.jpg",
    "back_cover_url": "https://maison-jaber.com/story-assets/to-the-rescue/back.jpg",
    "cover_image_url_ar": "https://maison-jaber.com/story-assets/to-the-rescue/cover-ar.jpg",
    "back_cover_url_ar": "https://maison-jaber.com/story-assets/to-the-rescue/back-ar.jpg",
    "preview_images_ar": ["https://maison-jaber.com/story-assets/to-the-rescue/l1-ar.jpg", "https://maison-jaber.com/story-assets/to-the-rescue/l2-ar.jpg", "https://maison-jaber.com/story-assets/to-the-rescue/l3-ar.jpg", "https://maison-jaber.com/story-assets/to-the-rescue/l4-ar.jpg"],
    "preview_images": [
      "https://maison-jaber.com/story-assets/to-the-rescue/l1.jpg",
      "https://maison-jaber.com/story-assets/to-the-rescue/l2.jpg",
      "https://maison-jaber.com/story-assets/to-the-rescue/l3.jpg",
      "https://maison-jaber.com/story-assets/to-the-rescue/l4.jpg"
    ],
    "sort_order": 4,
    "featured": false,
    "active": true,
    "built_in": false,
    "has_extra_character": false,
    "extra_character_name": null,
    "extra_character_fee_aed": 0,
    "detail_url": null
  },
  {
    "slug": "why-is-baby-looking-at-me",
    "title": "Why Is Baby Looking at Me?",
    "title_ar": "لماذا ينظر إليّ المولود الصغير؟",
    "theme": "adventure",
    "collection": "Family, Feelings, Growing up",
    "age_ranges": "2-4,4-6",
    "age_bands": [
      "2-4",
      "4-6"
    ],
    "moments": [
      "family",
      "emotions",
      "growing"
    ],
    "occasions": [
      "newbaby",
      "birthday",
      "eid",
      "justbecause"
    ],
    "description": "A new baby brings big changes and lots of questions! A warm, playful story about finding your place, sharing little moments and discovering the joy of being an older sibling.",
    "premise": {
      "en": "A new baby brings big changes and lots of questions! A warm, playful story about finding your place, sharing little moments and discovering the joy of being an older sibling.",
      "ar": "مولود جديد يعني تغييرات كبيرة وأسئلة كثيرة! قصة دافئة ومرحة عن إيجاد مكانك في العائلة، ومشاركة اللحظات الصغيرة، واكتشاف فرحة أن تصبح الأخ الأكبر أو الأخت الكبرى"
    },
    "card_note": {
      "en": "For new big brothers and sisters",
      "ar": "للإخوة الكبار الجدد"
    },
    "cover_gradient": "adventure",
    "cover_image_url": "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/cover.jpg",
    "back_cover_url": "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/back.jpg",
    "cover_image_url_ar": "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/cover-ar.jpg",
    "back_cover_url_ar": "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/back-ar.jpg",
    "preview_images_ar": ["https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l1-ar.jpg", "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l2-ar.jpg", "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l3-ar.jpg", "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l4-ar.jpg"],
    "preview_images": [
      "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l1.jpg",
      "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l2.jpg",
      "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l3.jpg",
      "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l4.jpg"
    ],
    "sort_order": 5,
    "featured": false,
    "active": true,
    "built_in": false,
    "has_extra_character": false,
    "extra_character_name": null,
    "extra_character_fee_aed": 0,
    "detail_url": null
  },
  {
    "slug": "grandpas-wild-safari",
    "title": "Grandpa's Wild Safari",
    "title_ar": "رحلة السفاري البرية مع الجد",
    "theme": "adventure",
    "collection": "Family, Adventure, Growing up",
    "age_ranges": "2-4,4-6",
    "age_bands": [
      "2-4",
      "4-6"
    ],
    "moments": [
      "family",
      "adventure",
      "growing"
    ],
    "occasions": [
      "birthday",
      "eid",
      "justbecause"
    ],
    "description": "Elephants, giraffes, zebras and hidden cheetah cubs! A warm safari adventure with Grandpa about slowing down, looking closely and sharing a day you'll both remember.",
    "premise": {
      "en": "Elephants, giraffes, zebras and hidden cheetah cubs! A warm safari adventure with Grandpa about slowing down, looking closely and sharing a day you'll both remember.",
      "ar": "فيلة وزرافات وحمير وحشية، وأشبال فهد مختبئة! مغامرة سفاري دافئة مع الجد عن التمهّل والنظر بعناية، ومشاركة يوم لن تنسياه أبدًا"
    },
    "card_note": {
      "en": "An adventure with Grandpa",
      "ar": "مغامرة مع الجد"
    },
    "cover_gradient": "adventure",
    "cover_image_url": "https://maison-jaber.com/story-assets/grandpas-wild-safari/cover.jpg",
    "back_cover_url": "https://maison-jaber.com/story-assets/grandpas-wild-safari/back.jpg",
    "cover_image_url_ar": "https://maison-jaber.com/story-assets/grandpas-wild-safari/cover-ar.jpg",
    "back_cover_url_ar": "https://maison-jaber.com/story-assets/grandpas-wild-safari/back-ar.jpg",
    "preview_images_ar": ["https://maison-jaber.com/story-assets/grandpas-wild-safari/l1-ar.jpg", "https://maison-jaber.com/story-assets/grandpas-wild-safari/l2-ar.jpg", "https://maison-jaber.com/story-assets/grandpas-wild-safari/l3-ar.jpg", "https://maison-jaber.com/story-assets/grandpas-wild-safari/l4-ar.jpg"],
    "preview_images": [
      "https://maison-jaber.com/story-assets/grandpas-wild-safari/l1.jpg",
      "https://maison-jaber.com/story-assets/grandpas-wild-safari/l2.jpg",
      "https://maison-jaber.com/story-assets/grandpas-wild-safari/l3.jpg",
      "https://maison-jaber.com/story-assets/grandpas-wild-safari/l4.jpg"
    ],
    "sort_order": 6,
    "featured": false,
    "active": true,
    "built_in": false,
    "has_extra_character": false,
    "extra_character_name": null,
    "extra_character_fee_aed": 0,
    "detail_url": null
  },
  {
    "slug": "silver-wing-mission",
    "title": "The Silver-Wing Mission",
    "title_ar": "مهمة الجناح الفضي",
    "theme": "courage",
    "collection": "Kindness, Friendship, Courage, Honesty",
    "age_ranges": "6-8",
    "age_bands": [
      "6-8"
    ],
    "moments": [
      "kindness",
      "friendship",
      "courage",
      "honesty"
    ],
    "occasions": [
      "school",
      "birthday",
      "eid",
      "justbecause"
    ],
    "description": "A spaceship, a playground mission and one brave choice. An exciting school adventure about standing beside a friend, welcoming others and discovering how kindness can change the day.",
    "premise": {
      "en": "A spaceship, a playground mission and one brave choice. An exciting school adventure about standing beside a friend, welcoming others and discovering how kindness can change the day.",
      "ar": "سفينة فضاء، ومهمة في ساحة اللعب، وقرار شجاع واحد، مغامرة مدرسية مشوّقة عن الوقوف إلى جانب صديق، والترحيب بالآخرين، واكتشاف كيف يغيّر اللطف يومًا كاملًا"
    },
    "card_note": {
      "en": "Kindness at school",
      "ar": "اللطف في المدرسة"
    },
    "cover_gradient": "courage",
    "cover_image_url": "https://maison-jaber.com/story-assets/silver-wing-mission/cover.jpg",
    "back_cover_url": "https://maison-jaber.com/story-assets/silver-wing-mission/back.jpg",
    "cover_image_url_ar": "https://maison-jaber.com/story-assets/silver-wing-mission/cover-ar.jpg",
    "back_cover_url_ar": "https://maison-jaber.com/story-assets/silver-wing-mission/back-ar.jpg",
    "preview_images_ar": ["https://maison-jaber.com/story-assets/silver-wing-mission/l1-ar.jpg", "https://maison-jaber.com/story-assets/silver-wing-mission/l2-ar.jpg", "https://maison-jaber.com/story-assets/silver-wing-mission/l3-ar.jpg", "https://maison-jaber.com/story-assets/silver-wing-mission/l4-ar.jpg"],
    "preview_images": [
      "https://maison-jaber.com/story-assets/silver-wing-mission/l1.jpg",
      "https://maison-jaber.com/story-assets/silver-wing-mission/l2.jpg",
      "https://maison-jaber.com/story-assets/silver-wing-mission/l3.jpg",
      "https://maison-jaber.com/story-assets/silver-wing-mission/l4.jpg"
    ],
    "sort_order": 7,
    "featured": false,
    "active": true,
    "built_in": false,
    "has_extra_character": false,
    "extra_character_name": null,
    "extra_character_fee_aed": 0,
    "detail_url": null
  },
  {
    "slug": "the-last-box",
    "title": "The Last Box",
    "title_ar": "الصندوق الأخير",
    "theme": "adventure",
    "collection": "Change, Family, Feelings",
    "age_ranges": "2-4,4-6",
    "age_bands": [
      "2-4",
      "4-6"
    ],
    "moments": [
      "change",
      "family",
      "emotions"
    ],
    "occasions": [
      "birthday",
      "eid",
      "justbecause"
    ],
    "description": "Boxes in every room and one very important box still open! A gentle, heart-warming story about saying goodbye to an old home, keeping your favourite memories close and helping a new house start to feel like home.",
    "premise": {
      "en": "Boxes in every room and one very important box still open! A gentle, heart-warming story about saying goodbye to an old home, keeping your favourite memories close and helping a new house start to feel like home.",
      "ar": "صناديق في كل غرفة، وصندوق واحد مهم جدًا ما زال مفتوحًا! قصة دافئة ولطيفة عن وداع البيت القديم، والاحتفاظ بأجمل الذكريات، ومساعدة البيت الجديد على أن يصبح بيتًا حقيقيًا"
    },
    "card_note": {
      "en": "For a move to a new home",
      "ar": "لمن ينتقل إلى بيت جديد"
    },
    "cover_gradient": "adventure",
    "cover_image_url": "https://maison-jaber.com/story-assets/the-last-box/cover.jpg",
    "back_cover_url": "https://maison-jaber.com/story-assets/the-last-box/back.jpg",
    "cover_image_url_ar": null,
    "back_cover_url_ar": null,
    "preview_images_ar": [],
    "preview_images": [
      "https://maison-jaber.com/story-assets/the-last-box/l1.jpg",
      "https://maison-jaber.com/story-assets/the-last-box/l2.jpg",
      "https://maison-jaber.com/story-assets/the-last-box/l3.jpg",
      "https://maison-jaber.com/story-assets/the-last-box/l4.jpg"
    ],
    "sort_order": 8,
    "featured": false,
    "active": true,
    "built_in": false,
    "has_extra_character": false,
    "extra_character_name": null,
    "extra_character_fee_aed": 0,
    "detail_url": null
  },
  {
    "slug": "the-cracked-blue-vase",
    "title": "The Cracked Blue Vase",
    "title_ar": "المزهرية الزرقاء المكسورة",
    "theme": "adventure",
    "collection": "Honesty, Feelings, Responsibility",
    "age_ranges": "2-4,4-6",
    "age_bands": [
      "2-4",
      "4-6"
    ],
    "moments": [
      "honesty",
      "emotions",
      "responsibility"
    ],
    "occasions": [
      "birthday",
      "eid",
      "justbecause"
    ],
    "description": "One tiny crack, a mountain of soggy napkins and a very sticky plan! A funny, gentle story about little mistakes, the worry of keeping a secret and how much lighter everything feels once you ask for help.",
    "premise": {
      "en": "One tiny crack, a mountain of soggy napkins and a very sticky plan! A funny, gentle story about little mistakes, the worry of keeping a secret and how much lighter everything feels once you ask for help.",
      "ar": "شرخ صغير، وجبل من المناديل المبلّلة، وخطة لاصقة جدًا! قصة مرحة ولطيفة عن الأخطاء الصغيرة، وثقل القلق حين نخفي سرًّا، وكم يخفّ كل شيء حين نطلب المساعدة"
    },
    "card_note": {
      "en": "Owning up, gently",
      "ar": "عن الصدق بلطف"
    },
    "cover_gradient": "adventure",
    "cover_image_url": "https://maison-jaber.com/story-assets/the-cracked-blue-vase/cover.jpg",
    "back_cover_url": "https://maison-jaber.com/story-assets/the-cracked-blue-vase/back.jpg",
    "cover_image_url_ar": null,
    "back_cover_url_ar": null,
    "preview_images_ar": [],
    "preview_images": [
      "https://maison-jaber.com/story-assets/the-cracked-blue-vase/l1.jpg",
      "https://maison-jaber.com/story-assets/the-cracked-blue-vase/l2.jpg",
      "https://maison-jaber.com/story-assets/the-cracked-blue-vase/l3.jpg",
      "https://maison-jaber.com/story-assets/the-cracked-blue-vase/l4.jpg"
    ],
    "sort_order": 9,
    "featured": false,
    "active": true,
    "built_in": false,
    "has_extra_character": false,
    "extra_character_name": null,
    "extra_character_fee_aed": 0,
    "detail_url": null
  },
  {
    "slug": "the-christmas-list",
    "title": "The Christmas List That Grew and Grew",
    "title_ar": "قائمة الميلاد التي كبرت وكبرت",
    "theme": "adventure",
    "collection": "Kindness, Family, Growing up, Christmas",
    "age_ranges": "4-6,6-8",
    "age_bands": [
      "4-6",
      "6-8"
    ],
    "moments": [
      "kindness",
      "family",
      "growing"
    ],
    "occasions": [
      "christmas",
      "birthday",
      "justbecause"
    ],
    "description": "A Christmas list so long it curls right out of the bedroom door! A warm, funny festive story about wanting, giving and discovering that the best part of Christmas is making someone smile.",
    "premise": {
      "en": "A Christmas list so long it curls right out of the bedroom door! A warm, funny festive story about wanting, giving and discovering that the best part of Christmas is making someone smile.",
      "ar": "قائمة ميلاد طويلة جدًا حتى خرجت من باب غرفة النوم! قصة ميلادية دافئة ومضحكة عن الرغبة والعطاء، واكتشاف أن أجمل ما في الميلاد هو أن ترسم ابتسامة على وجه أحدهم"
    },
    "card_note": {
      "en": "A Christmas story about giving",
      "ar": "قصة ميلادية عن العطاء"
    },
    "cover_gradient": "adventure",
    "cover_image_url": "https://maison-jaber.com/story-assets/the-christmas-list/cover.jpg",
    "back_cover_url": "https://maison-jaber.com/story-assets/the-christmas-list/back.jpg",
    "cover_image_url_ar": null,
    "back_cover_url_ar": null,
    "preview_images_ar": [],
    "preview_images": [
      "https://maison-jaber.com/story-assets/the-christmas-list/l1.jpg",
      "https://maison-jaber.com/story-assets/the-christmas-list/l2.jpg",
      "https://maison-jaber.com/story-assets/the-christmas-list/l3.jpg",
      "https://maison-jaber.com/story-assets/the-christmas-list/l4.jpg"
    ],
    "sort_order": 10,
    "featured": false,
    "active": true,
    "built_in": false,
    "has_extra_character": false,
    "extra_character_name": null,
    "extra_character_fee_aed": 0,
    "detail_url": null
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
