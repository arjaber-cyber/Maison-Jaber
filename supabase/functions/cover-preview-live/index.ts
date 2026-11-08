// Supabase Edge Function: cover-preview-live
// Customer-facing "See your child on the cover" free preview (Hikaya).
//   POST { action:"start", request_id, story_slug, lang, child_name, child_age, child_gender, photo_b64, device_id, consent:true, consent_version }
//   POST { action:"status", id } or { action:"status", request_id }
//   POST { action:"quota" }
// Every call needs a signed-in customer (Supabase user JWT in Authorization).
// Settings live in app_flags: cover_preview_mode (off|test|live), cover_preview_testers (comma emails),
// cover_preview_per_day (default 5), cover_preview_daily_cap_aed (default 100).
// The clean cover never leaves the server: customers only ever get a 560px watermarked copy via a short signed URL.
// Nov 2026 (v2):
//  - request_id: one id per submission, made by the browser before sending. A retry with the same id (for example
//    after the first response was lost) returns the original preview and never starts or charges a second one.
//  - The server counts the people in the photo before anything is saved or charged: group photos are rejected
//    even when the browser's own face check could not run.
//  - status returns the child's details for the owner, so the browser keeps only ids for recovery.
import { createClient } from "npm:@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const OPENAI = Deno.env.get("OPENAI_API_KEY") ?? "";
const BUCKET = "cover-previews";
const SITE = "https://maison-jaber.com";
const PRICE = { textIn: 5, imgIn: 8, imgOut: 30 };
const USD_AED = 3.6725;
const CONSENT_VERSION = "cp-2026-11-07";
const WATERMARK_URLS = [
  `${SITE}/hikaya/images/cp-watermark.png`,
  "https://raw.githubusercontent.com/arjaber-cyber/maison-jaber/main/hikaya/images/cp-watermark.png",
  "https://raw.githubusercontent.com/arjaber-cyber/maison-jaber/cover-preview/hikaya/images/cp-watermark.png",
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

function cost(u: any) {
  if (!u) return null;
  const d = u.input_tokens_details ?? {};
  const img = d.image_tokens ?? 0;
  const txt = d.text_tokens ?? Math.max(0, (u.input_tokens ?? 0) - img);
  const out = u.output_tokens_details?.image_tokens ?? u.output_tokens ?? 0;
  return (txt * PRICE.textIn + img * PRICE.imgIn + out * PRICE.imgOut) / 1e6;
}
function b64ToBytes(b64: string) { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
async function upload(path: string, bytes: Uint8Array) {
  const { error } = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error("storage: " + error.message);
}
async function download(path: string) {
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error) throw new Error("storage: " + error.message);
  return new Uint8Array(await data.arrayBuffer());
}
async function openai(path: string, init: RequestInit) {
  const t0 = performance.now();
  const r = await fetch("https://api.openai.com/v1/" + path, { ...init, headers: { Authorization: `Bearer ${OPENAI}`, ...(init.headers ?? {}) } });
  const ms = Math.round(performance.now() - t0);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e: any = new Error(j?.error?.message ?? `HTTP ${r.status}`); e.status = r.status; e.code = j?.error?.code; e.ms = ms; throw e; }
  return { j, ms };
}

// ---------- per-cover facts (who to replace, old name, who must stay) ----------
const COVERS: Record<string, { en: string; ar: string; who: string; keep?: string; titleEn: string; titleAr: string }> = {
  "christmas-star": { en: "Leen", ar: "لين", who: "the child kneeling in the snow holding the glowing star", titleEn: "{N} and the Christmas Star That Went Missing", titleAr: "{N} و نجمة الميلاد التي ضاعت" },
  "christmas-tree-door": { en: "Diana", ar: "ديانا", who: "the child in red pyjamas standing at the round door", keep: "the small white dragon and the little elf in the green coat", titleEn: "{N} and the Christmas Tree Door", titleAr: "{N} وباب شجرة عيد الميلاد" },
  "door-of-a-thousand-stars": { en: "Hadi", ar: "هادي", who: "the child in the starry blue cape sitting on the rock", keep: "the smiling yellow star character", titleEn: "{N} and the Door of a Thousand Stars", titleAr: "{N} وباب الألف نجمة" },
  "grandpas-wild-safari": { en: "Lala", ar: "لالا", who: "the child on the left pointing forward", keep: "the grandfather with binoculars, unchanged", titleEn: "{N} and Grandpa's Wild Safari", titleAr: "{N} ورحلة السفاري البرية مع الجد" },
  "house-of-missing-things": { en: "Adam", ar: "ادم", who: "the child lying on the rug writing in a notebook", keep: "the teddy bear", titleEn: "{N} and the House of Missing Things", titleAr: "{N} و منزل الاشياء الضائعة" },
  "just-one-more": { en: "Laila", ar: "ليلى", who: "the child lying on the cushions with chin on hands", titleEn: "{N} and Just One More", titleAr: "{N} وفيديو واحد فقط" },
  "silver-wing-mission": { en: "Lisa", ar: "ليزا", who: "the child at the desk with chin on hand", titleEn: "{N} and the Silver-Wing Mission", titleAr: "{N} و مهمة الجناح الفضي" },
  "storm-above-the-city": { en: "Ralph", ar: "رالف", who: "the flying child superhero in the dark suit", keep: "the small cloud character", titleEn: "Captain {N} and the Storm Above the City", titleAr: "كابتن {N} والعاصفة فوق المدينة" },
  "teddys-night-adventure": { en: "Tom", ar: "توم", who: "the child hugging the teddy bear", keep: "the teddy bear", titleEn: "{N} and Teddy's Night Adventure", titleAr: "مغامرة {N} وتيدي الليلية" },
  "the-christmas-list": { en: "Noah", ar: "نوح", who: "the child sitting cross-legged holding the long list", titleEn: "{N} and the Christmas List That Grew and Grew", titleAr: "{N} و قائمة الميلاد التي كبرت وكبرت" },
  "the-cracked-blue-vase": { en: "Leo", ar: "ليو", who: "the child at the table with chin on hand", titleEn: "{N} and the Cracked Blue Vase", titleAr: "{N} و المزهرية الزرقاء المكسورة" },
  "the-last-box": { en: "Salma", ar: "سلمى", who: "the child standing by the cardboard box", titleEn: "{N} and the Last Box", titleAr: "{N} و الصندوق الأخير" },
  "to-the-rescue": { en: "Kabir", ar: "كبير", who: "the boy running in the centre in the green jacket", keep: "the girl in overalls, the grandfather in the hat, the woman, and all the animals, unchanged", titleEn: "{N} to the Rescue!", titleAr: "{N} إلى الإنقاذ!" },
  "why-is-baby-looking-at-me": { en: "Eva", ar: "ايفا", who: "the older child lying on the rug in the red top", keep: "the baby, unchanged", titleEn: "{N} Why Is Baby Looking at Me?", titleAr: "{N} لماذا ينظر إليّ المولود الصغير؟" },
};

// Original character's gender, and a boy's outfit for covers whose original character is a girl.
const ORIG: Record<string, { g: "girl" | "boy"; boyOutfit?: string }> = {
  "christmas-star": { g: "girl", boyOutfit: "the same brown winter coat, cream knitted scarf and mittens, with dark brown trousers (nothing pink)" },
  "christmas-tree-door": { g: "girl", boyOutfit: "the same deep-red pyjamas cut as boy's pyjamas: a plain button-up pyjama shirt and straight trousers, no bows or frills" },
  "door-of-a-thousand-stars": { g: "boy" },
  "grandpas-wild-safari": { g: "girl", boyOutfit: "the same khaki safari shirt, plain, boy's cut" },
  "house-of-missing-things": { g: "boy" },
  "just-one-more": { g: "girl", boyOutfit: "the same blue sweatshirt and trousers, plain, boy's cut" },
  "silver-wing-mission": { g: "girl", boyOutfit: "a plain white crew-neck T-shirt (no ruffles, no frills, no puffed sleeves) under the same denim overalls" },
  "storm-above-the-city": { g: "boy" },
  "teddys-night-adventure": { g: "boy" },
  "the-christmas-list": { g: "boy" },
  "the-cracked-blue-vase": { g: "boy" },
  "the-last-box": { g: "girl", boyOutfit: "the same striped knitted cardigan over a plain white T-shirt, with jeans, boy's cut" },
  "to-the-rescue": { g: "boy" },
  "why-is-baby-looking-at-me": { g: "girl", boyOutfit: "a plain red crew-neck T-shirt in the same red (no ruffles, no dress), with trousers where visible" },
};

// Prompt to turn a girl cover into a boy version (generic boy, outfit adapted). Text stays exactly the same.
function promptBase(job: any) {
  const c = COVERS[job.story_slug]; const o = ORIG[job.story_slug];
  return `Image 1 is the finished cover of a children's storybook. Make a version of this exact cover where the main character (${c?.who ?? "the main child"}) is a BOY of the same age instead of a girl.

Change only that character:
- A boy with a short, neat boy's haircut and a boy's face; natural, friendly expression.
- Outfit: ${o?.boyOutfit ?? "the same outfit adapted to a boy's version"}. Keep the same colours and the same overall look so the scene feels identical, but nothing girly: no dress, skirt, ruffles, frills, lace, bows, hair clips, puffed sleeves or pink.
- Keep exactly the same pose, body position, head angle, gaze, hand positions, size and place in the picture.
${c?.keep ? `Keep ${c.keep}.` : ""}
Everything else stays pixel-for-pixel the same: background, objects, colours, lighting, painterly illustration style, and ALL text and logos exactly as they are (do not change the name or any word).

Square image.`;
}

function outfitRule(job: any) {
  const o = ORIG[job.story_slug];
  const boy = !/girl|female/i.test(job.child_gender ?? "");
  const usingBoyBase = !!job.base_path;
  if (boy && o?.g === "girl" && !usingBoyBase)
    return `CLOTHING: the original character is a girl, so convert the outfit to a boy's version: ${o.boyOutfit}. Same colours and overall look, but no dress, skirt, ruffles, frills, lace, bows, hair clips, puffed sleeves or pink.`;
  return `CLOTHING: keep the outfit from image 1 exactly (same garments, colours and patterns). Do not use any clothing from the photo.${boy ? " The outfit must look like a boy's outfit: no dress, skirt, ruffles, frills, lace, bows or hair clips." : ""}`;
}

// ---------- cover generation ----------
function promptV3(job: any) {
  const c = COVERS[job.story_slug];
  const ar = job.lang === "ar";
  const girl = /girl|female/i.test(job.child_gender ?? "");
  const oldName = c ? (ar ? c.ar : c.en) : "";
  const title = c ? (ar ? c.titleAr : c.titleEn).replace("{N}", job.child_name) : "";
  const headRule = girl
    ? `If the girl in image 2 wears a hijab, paint a simple, neat hijab in a soft colour that suits the cover. Remove every other kind of headwear (caps, hats, hoods, headbands, hair clips that hide the hair, sunglasses on the head) and show her natural hair as in the photo.`
    : `Remove everything the boy wears on his head in image 2 (cap, hat, ghutra, agal, kufi, hood, headband, sunglasses on the head). Show his natural hair: where the photo hides it, paint short, neat hair matching his visible hair colour, eyebrows and skin tone.`;
  return `TASK: personalise a children's storybook cover. Image 1 = the finished cover. Image 2 = a real photo of the customer's child, a ${job.child_age}-year-old ${job.child_gender}. Image 2 is ONLY a reference for this child's identity (face, skin tone, hair).

WHO TO CHANGE: only ${c ? c.who : "the main child character"}. ${c?.keep ? `Keep ${c.keep}.` : ""} Everything else in image 1 stays exactly the same: composition, framing, background, objects, colours, lighting, the Hikaya logo and the painterly illustration style.

MAKE IT LOOK HAND-PAINTED, NOT PASTED:
- Repaint the whole character (head, hair, neck, hands) in the cover's illustration style. Never paste or blend the photo face.
- Keep the original character's exact pose, body position, head angle, head tilt, gaze direction and hand positions from image 1. Ignore the head angle, framing and camera angle of the photo.
- Head size and neck in natural proportion to the body for a ${job.child_age}-year-old; the head sits naturally on the shoulders, with no visible seam, outline, halo or change in sharpness around it.
- Same light direction, shadows, colour temperature, softness and brush texture on the face and hair as everywhere else in the painting. No photographic skin texture.
- A warm, natural expression that fits the moment in the scene.
- Make sure the face stays clearly visible and recognisable; if the original pose hides the face, turn the head only slightly toward the viewer.

LIKENESS (most important): a parent must instantly recognise their child. Match face shape, eye shape and colour, eyebrows, nose, mouth, ears, skin tone, freckles or marks, hair colour, hair texture, hair length and hairstyle, and glasses if worn. Age the character to look ${job.child_age} years old.

${outfitRule(job)}

HEAD: ${headRule}

TITLE TEXT: The title currently contains the name "${oldName}". Erase "${oldName}" completely and write "${job.child_name}" in its place, in exactly the same lettering style, colour, size, effect and position. ${ar ? `Arabic letters, right-to-left, spelled exactly: ${job.child_name} (letter by letter: ${[...job.child_name].join(" ")}).` : `Spelled exactly: ${job.child_name}, in plain letters with no accents, dots, umlauts, stars or decorative marks on or above any letter.`} After the change the full title must read: "${title}". The name "${oldName}" must not appear anywhere. Do not change, move or misspell any other word, the Hikaya logo or any small text.

OUTPUT: one square image, same as image 1 except the child and the name.`;
}

// ---------- v4: read the photo first, then paint with an exact description ----------
async function analyzePhoto(photoPath: string, photo: Uint8Array) {
  const { data } = await sb.from("cover_photo_analysis").select("analysis").eq("photo_path", photoPath).maybeSingle();
  if (data?.analysis) return data.analysis;
  const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${OPENAI}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: QA_MODEL, text: { format: { type: "json_object" } }, input: [{ role: "user", content: [
      { type: "input_text", text: `Describe the child in this photo for an illustrator who must paint a recognisable likeness. Describe appearance only. JSON only:
{"skin_tone_fitzpatrick": <1-6>, "skin_tone_words": "<precise colour words, e.g. 'deep brown with warm golden undertone'>",
 "undertone": "<warm|cool|neutral|olive>",
 "hair": "<colour, texture (straight/wavy/curly/coily), length and style, e.g. 'black tight coils, short, natural afro'>",
 "eyes": "<colour and shape>", "eyebrows": "<shape/thickness>", "face_shape": "<round/oval/heart/square>",
 "nose": "<short description>", "mouth": "<short description>", "freckles_or_marks": "<none or details>", "glasses": "<none or description>",
 "headwear": "<none, cap, hat, ghutra, hijab, hood, other>", "apparent_gender": "<boy|girl|unclear>", "apparent_age": <years>,
 "photo_quality_issues": ["<e.g. blurry, dark, face partly hidden, sunglasses>"]}` },
      { type: "input_image", image_url: toDataUrl(photo), detail: "high" },
    ] }] }) });
  const j = await r.json();
  if (!r.ok) throw new Error("analysis: " + (j?.error?.message ?? r.status));
  const out = j.output_text ?? (j.output ?? []).flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? "").join("");
  const a = JSON.parse(out);
  const u = j.usage ?? {};
  await sb.from("cover_photo_analysis").upsert({ photo_path: photoPath, analysis: a, cost_usd: ((u.input_tokens ?? 0) * 2 + (u.output_tokens ?? 0) * 8) / 1e6 });
  return a;
}

function promptV4(job: any) {
  const a = job.analysis ?? {};
  const girl = /girl|female/i.test(job.child_gender ?? "");
  const id = `EXACT DESCRIPTION OF THIS CHILD (from the photo; follow it precisely):
- Skin: ${a.skin_tone_words ?? "as in the photo"} (Fitzpatrick type ${a.skin_tone_fitzpatrick ?? "?"}, ${a.undertone ?? ""} undertone). Paint exactly this skin colour on face, neck, ears and hands. Do NOT lighten, whiten, darken, redden or change the undertone, even under the scene's coloured light; adjust only shading.
- Hair: ${a.hair ?? "as in the photo"}${!girl && a.headwear && a.headwear !== "none" ? " (hidden parts under the headwear: continue the same colour and texture, short and neat)" : ""}.
- Eyes: ${a.eyes ?? ""}; eyebrows: ${a.eyebrows ?? ""}; face shape: ${a.face_shape ?? ""}; nose: ${a.nose ?? ""}; mouth: ${a.mouth ?? ""}.
- Freckles/marks: ${a.freckles_or_marks ?? "none"}. Glasses: ${a.glasses ?? "none"}.`;
  const look = girl
    ? `GIRL LOOK: she must read clearly and naturally as a girl of ${job.child_age}: soft, girlish facial features and expression, her own hairstyle from the photo (if her hair is short, keep it short but clearly a girl's cut). Never give her a boyish face, jaw or build.`
    : `BOY LOOK: he must read clearly and naturally as a boy of ${job.child_age}: boyish face, jaw and build, no long eyelashes emphasis, no lip colour or makeup look, no hair accessories, nothing girly in pose details. Keep his own hairstyle from the photo (if his hair is long, keep it, but styled as a boy's).`;
  return promptV3(job).replace("LIKENESS (most important):", `${id}\n\n${look}\n\nLIKENESS (most important):`);
}

function prompt(job: any) {
  if (job.variant === "v4" || job.variant === "v4r") return promptV4(job);
  if (job.variant === "v3" || job.variant === "v3r") return promptV3(job);
  const ar = job.lang === "ar";
  const name = job.child_name;
  const nameLine = job.variant === "keep-text"
    ? `Keep all text exactly as it is.`
    : `The cover shows the previous character's first name as part of the title. Replace ONLY that first name with "${name}"${ar ? " (Arabic script, spelled exactly: " + name + ")" : ""}, in the same lettering style, colour, size and position. Keep every other word of the title, the Hikaya logo and any small text exactly as they are.`;
  if (job.variant === "swap+name") return `Image 1 is the finished cover of a personalised children's storybook. Image 2 is a real photo of a child, about ${job.child_age} years old (${job.child_gender}).

Recreate image 1 exactly: same composition, camera angle, pose, outfit, background, colours, lighting, painterly illustration style and texture.

Change the main child character so it is clearly the child from image 2: same face shape, eyes, eyebrows, nose, mouth, skin tone, hair colour, hair texture and hairstyle (and glasses or head covering if present), at age ${job.child_age}. Paint them in the cover's style, not as a pasted photo. Keep any other characters, animals and objects unchanged.

${nameLine}

Square image.`;
  // v2: natural head integration, cover outfit, headwear rules
  const girl = /girl|female/i.test(job.child_gender ?? "");
  const headRule = girl
    ? `If the child in image 2 wears a hijab, keep a simple hijab in a colour that suits the cover. Remove any other headwear (caps, hats, hoods, headbands, sunglasses on the head) and show natural hair matching the photo.`
    : `Remove anything the child wears on the head in image 2 (cap, hat, ghutra, agal, kufi, hood, headband, sunglasses on the head). Show the boy's natural hair instead: if the hair is hidden in the photo, paint short, neat hair that matches his visible hair colour, eyebrows and skin tone.`;
  return `Image 1 is the finished cover of a personalised children's storybook. Image 2 is a real photo of a ${job.child_gender}, about ${job.child_age} years old. Use image 2 ONLY as a reference for the child's identity (face and hair).

Repaint the main character of image 1 as this child. Keep everything else in image 1 exactly as it is: composition, background, other characters, animals, objects, colours, lighting and the painterly illustration style.

The character must look naturally painted into the scene, never like a pasted face:
- Keep the original character's pose, body position, head angle, head tilt and gaze direction from image 1. Do not copy the head angle, expression framing or camera angle of the photo.
- Head size, neck and shoulders in correct, natural proportion to the body for a ${job.child_age}-year-old.
- Same light direction, shadows, colour temperature and brush texture on the face and hair as on the rest of the illustration; no photo-like skin, no hard edges or halo around the head.
- A gentle, natural expression that fits the scene.

Likeness: keep the child's face shape, eyes, eyebrows, nose, mouth, skin tone, hair colour, hair texture and hairstyle, and glasses if worn, so a parent instantly recognises them.

Clothing: keep the original character's outfit from image 1 exactly. Do not use the clothes from the photo.

Head: ${headRule}

${nameLine}

Square image.`;
}

async function siteCover(slug: string, lang: string) {
  const cr = await fetch(`${SITE}/story-assets/${slug}/${lang === "ar" ? "cover-ar" : "cover"}.jpg`);
  if (!cr.ok) throw new Error("cover fetch " + cr.status);
  return new Uint8Array(await cr.arrayBuffer());
}
// The starting cover for a child: the approved gender version if there is one, else the original.
async function startCover(job: any) {
  const gender = /girl|female/i.test(job.child_gender ?? "") ? "girl" : "boy";
  const { data } = await sb.from("cover_bases").select("path").eq("story_slug", job.story_slug).eq("lang", job.lang).eq("gender", gender).eq("approved", true).maybeSingle();
  if (data?.path) return { bytes: await download(data.path), base_path: data.path };
  return { bytes: await siteCover(job.story_slug, job.lang), base_path: null };
}

// ---------- automatic quality check (vision) ----------
const QA_MODEL = Deno.env.get("COVER_QA_MODEL") ?? "gpt-4.1";
const PEOPLE_MODEL = Deno.env.get("COVER_PEOPLE_MODEL") ?? "gpt-4.1-mini";
const toDataUrl = (b: Uint8Array) => { let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return "data:image/jpeg;base64," + btoa(s); };
async function qaJob(job: any, coverBytes?: Uint8Array) {
  try {
    const c = COVERS[job.story_slug]; const ar = job.lang === "ar";
    const oldName = c ? (ar ? c.ar : c.en) : "";
    const expected = c ? (ar ? c.titleAr : c.titleEn).replace("{N}", job.child_name) : "";
    const cover = coverBytes ?? (job.base_path ? await download(job.base_path) : await siteCover(job.story_slug, job.lang));
    const photo = await download(job.photo_path);
    const result = await download(job.result_path);
    const boy = !/girl|female/i.test(job.child_gender ?? "");
    const text = `You are a strict quality checker for a personalised children's storybook cover. Image A = the original cover template. Image B = a photo of the customer's child (${job.child_age}-year-old ${job.child_gender}). Image C = the generated personalised cover.
Check image C and reply with JSON only:
{"title_read": "<transcribe the big main title of C exactly as it is painted, letter by letter, in its original script. Copy mistakes exactly; do NOT correct spelling, do NOT add words that are not there. Leave out the small subtitle/tagline and the Hikaya logo>",
 "name_correct": <true if the child's name in C is exactly "${job.child_name}" with correct spelling>,
 "old_name_visible": <true if the old name "${oldName}" still appears anywhere in C>,
 "title_ok": <true if the whole title of C reads exactly "${expected}" (ignore line breaks and spacing around "و"), with no extra, missing, moved or misspelled words>,
 "likeness": <1-5, would a parent instantly recognise the child in B as the character in C: face shape, eyes, nose, mouth, skin tone, hair>,
 "head_natural": <1-5, does the head look hand-painted and naturally attached, with correct size, angle and lighting; 1 = looks pasted on>,
 "pose_kept": <true if the character's pose and head angle follow image A>,
 "headwear_ok": <true if ${boy ? "the boy wears nothing on his head (no cap, hat, ghutra, hood)" : "the girl wears no headwear except possibly a hijab"}>,
 "outfit_ok": <true if the outfit matches image A's outfit and ${boy ? "looks like a boy's outfit (no dress, ruffles, bows, frills, pink girly details)" : "is appropriate"}>,
 "others_ok": <true if every other person, baby, animal and object looks the same as in image A; false if any of them took the child's face, hair, glasses or features, or changed>,
 "gender_ok": <true if the personalised character clearly reads as a ${boy ? "boy" : "girl"} (hair, face, clothes)>,
 "gender_look": <1-5, how clearly and naturally the character reads as a ${boy ? "boy (5 = clearly boyish face, build and styling; 1 = looks girly)" : "girl (5 = clearly girlish face and styling; 1 = looks boyish)"}>,
 "skin_tone_photo": <1-6 Fitzpatrick type of the child's face in B>,
 "skin_tone_cover": <1-6 Fitzpatrick type of the character's face in C, judged under neutral light>,
 "hair_match": <true if hair colour and texture in C match B (headwear removal allowed)>,
 "age_ok": <true if the character looks roughly the same age as the child in B>,
 "artifacts": <true if there are visible defects: extra fingers, distorted face, smeared text, broken logo>,
 "issues": ["<short notes on every problem>"]}`;
    const t0 = performance.now();
    const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${OPENAI}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: QA_MODEL, text: { format: { type: "json_object" } }, input: [{ role: "user", content: [
        { type: "input_text", text },
        { type: "input_image", image_url: toDataUrl(cover), detail: "low" },
        { type: "input_image", image_url: toDataUrl(photo), detail: "low" },
        { type: "input_image", image_url: toDataUrl(result), detail: "high" },
      ] }] }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message ?? `HTTP ${r.status}`);
    const out = j.output_text ?? (j.output ?? []).flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? "").join("");
    const q = JSON.parse(out);
    // Deterministic title check: compare letters only (ignore spaces, line breaks, diacritics, punctuation).
    const norm = (s: string) => (s ?? "").normalize("NFKC").replace(/[ً-ْٰـ]/g, "").replace(/[إأآٱ]/g, "ا").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
    q.title_match = norm(q.title_read).includes(norm(expected));
    q.old_name_in_title = oldName ? norm(q.title_read).replace(norm(job.child_name), "").includes(norm(oldName)) : false;
    // The name must stand as its own word (e.g. "يوسف و" not "يوسفو").
    const raw = (q.title_read ?? "").normalize("NFKC").replace(/[ً-ْٰـ]/g, "");
    const nm = String(job.child_name ?? "").normalize("NFKC");
    q.name_separate = new RegExp(`(^|[\\s\\n])${nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s\\n!?,.:؟]|$)`, "u").test(raw);
    q.tone_diff = (q.skin_tone_photo != null && q.skin_tone_cover != null) ? Math.abs(q.skin_tone_photo - q.skin_tone_cover) : null;
    q.pass = !!(q.title_match && q.name_separate && !q.old_name_in_title && !q.old_name_visible && q.likeness >= 4 && q.head_natural >= 4 && q.headwear_ok && q.outfit_ok && q.others_ok && q.gender_ok !== false && !q.artifacts
      && (q.gender_look == null || q.gender_look >= 4) && (q.tone_diff == null || q.tone_diff <= 1) && q.hair_match !== false && q.age_ok !== false);
    q.ms = Math.round(performance.now() - t0);
    const u = j.usage ?? {};
    const qcost = ((u.input_tokens ?? 0) * 2 + (u.output_tokens ?? 0) * 8) / 1e6;
    await sb.from("cover_previews").update({ qa: q, qa_status: q.pass ? "pass" : "fail", qa_cost_usd: qcost }).eq("id", job.id);
  } catch (e: any) {
    await sb.from("cover_previews").update({ qa_status: "error", qa: { error: String(e.message ?? e).slice(0, 400) } }).eq("id", job.id);
  }
}


// ======================= live flow =======================
async function flags() {
  const { data } = await sb.from("app_flags").select("key,value").like("key", "cover_preview_%");
  const m: Record<string, string> = {};
  (data ?? []).forEach((r: any) => { m[r.key] = String(r.value ?? ""); });
  return {
    mode: (m.cover_preview_mode || "off") as "off" | "test" | "live",
    testers: (m.cover_preview_testers || "").toLowerCase().split(/[,\s]+/).filter(Boolean),
    perDay: Math.max(1, Number(m.cover_preview_per_day || 5)),
    capAed: Math.max(0, Number(m.cover_preview_daily_cap_aed || 100)),
  };
}

async function userFrom(req: Request) {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await sb.auth.getUser(jwt);
  if (error || !data?.user) return null;
  return data.user;
}

async function sha256(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function usage(userId: string, deviceId: string, ipHash: string) {
  const { data } = await sb.rpc("cover_preview_usage", { p_user: userId, p_device: deviceId, p_ip: ipHash });
  return data as { user_today: number; device_today: number; ip_today: number; spend_today_usd: number; inflight: number };
}

function allowed(f: any, email: string) {
  if (f.mode === "live") return true;
  if (f.mode === "test") return f.testers.includes((email || "").toLowerCase());
  return false;
}

const AR_RE = /^[ء-ي٠-٩ٰ-ۓ\s\-']+$/;
const EN_RE = /^[A-Za-z\s\-']+$/;
const RID_RE = /^[A-Za-z0-9-]{8,64}$/;

async function moderate(photo: Uint8Array) {
  try {
    const r = await fetch("https://api.openai.com/v1/moderations", { method: "POST", headers: { Authorization: `Bearer ${OPENAI}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input: [{ type: "image_url", image_url: { url: toDataUrl(photo) } }] }) });
    if (!r.ok) return true;
    const j = await r.json();
    return !(j?.results?.[0]?.flagged);
  } catch { return true; }
}

// Counts the people in the photo before anything is saved or charged, so a group photo is refused even when the
// browser's own face check could not run. Returns null if the check itself could not run (the photo is then allowed,
// as before, so one outage does not block every family).
async function countPeople(photo: Uint8Array): Promise<{ people: number; faces: number } | null> {
  try {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 15000);
    const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", signal: ctl.signal, headers: { Authorization: `Bearer ${OPENAI}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: PEOPLE_MODEL, text: { format: { type: "json_object" } }, input: [{ role: "user", content: [
        { type: "input_text", text: `Count the people in this photo. Include anyone partly visible, babies, and people in the background if their face can be seen. Do not count people in pictures, posters, toys or screens. JSON only: {"people": <number of real people>, "faces": <number of real human faces visible>}` },
        { type: "input_image", image_url: toDataUrl(photo), detail: "low" },
      ] }] }) });
    clearTimeout(to);
    const j = await r.json();
    if (!r.ok) return null;
    const out = j.output_text ?? (j.output ?? []).flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? "").join("");
    const p = JSON.parse(out);
    const people = Number(p.people), faces = Number(p.faces);
    if (!Number.isFinite(people) && !Number.isFinite(faces)) return null;
    return { people: Number.isFinite(people) ? people : faces, faces: Number.isFinite(faces) ? faces : people };
  } catch { return null; }
}

let WM: Image | null = null;
async function watermark(bytes: Uint8Array) {
  if (!WM) {
    for (const u of WATERMARK_URLS) {
      try { const r = await fetch(u); if (r.ok) { WM = await Image.decode(new Uint8Array(await r.arrayBuffer())) as Image; break; } } catch { /* next */ }
    }
    if (!WM) throw new Error("watermark image unavailable");
  }
  const img = await Image.decode(bytes) as Image;
  img.resize(560, 560);
  const wm = WM.width === 560 ? WM : WM.clone().resize(560, 560);
  img.composite(wm, 0, 0);
  return await img.encodeJPEG(72);
}

async function genOnce(job: any, cover: Uint8Array, photo: Uint8Array) {
  const fd = new FormData();
  fd.append("model", "gpt-image-2");
  fd.append("prompt", prompt(job));
  fd.append("image[]", new Blob([cover], { type: "image/jpeg" }), "cover.jpg");
  fd.append("image[]", new Blob([photo], { type: "image/jpeg" }), "child.jpg");
  fd.append("size", "1024x1024"); fd.append("quality", "medium"); fd.append("n", "1");
  fd.append("output_format", "jpeg"); fd.append("output_compression", "88");
  const { j, ms } = await openai("images/edits", { method: "POST", body: fd });
  return { bytes: b64ToBytes(j.data[0].b64_json), ms, cost: cost(j.usage) ?? 0 };
}

const titleOk = (q: any) => !!(q && q.title_match && q.name_separate && !q.old_name_in_title && !q.old_name_visible);
const score = (q: any) => (q?.pass ? 100 : 0) + (titleOk(q) ? 50 : 0) + (q?.likeness ?? 0) + (q?.head_natural ?? 0) + (q?.gender_look ?? 0);

async function readQa(id: string) {
  const { data } = await sb.from("cover_previews").select("qa,qa_status,qa_cost_usd").eq("id", id).single();
  return data;
}

async function processPreview(row: any) {
  const t0 = Date.now();
  let spend = 0, qaSpend = 0;
  try {
    await sb.from("cover_previews").update({ status: "running", started_at: new Date().toISOString(), attempts: 1 }).eq("id", row.id);
    const photo = await download(row.photo_path);
    const job: any = { ...row, variant: "v4r", model: "gpt-image-2", quality: "medium" };
    try { job.analysis = await analyzePhoto(row.photo_path, photo); } catch { /* paint without the description */ }
    const start = await startCover(job);
    job.base_path = start.base_path;

    // attempt 1
    const g1 = await genOnce(job, start.bytes, photo);
    spend += g1.cost;
    const p1 = `site/results/${row.id}.jpg`;
    await upload(p1, g1.bytes);
    await qaJob({ ...job, result_path: p1 }, start.bytes);
    const r1 = await readQa(row.id); qaSpend += Number(r1?.qa_cost_usd ?? 0);
    let best = { bytes: g1.bytes, path: p1, qa: r1?.qa, status: r1?.qa_status };

    // one automatic retry if the check failed
    let retried = false;
    if (r1?.qa_status === "fail") {
      retried = true;
      const g2 = await genOnce(job, start.bytes, photo);
      spend += g2.cost;
      const p2 = `site/results/${row.id}-2.jpg`;
      await upload(p2, g2.bytes);
      await qaJob({ ...job, result_path: p2 }, start.bytes);
      const r2 = await readQa(row.id); qaSpend += Number(r2?.qa_cost_usd ?? 0);
      if (score(r2?.qa) >= score(r1?.qa)) best = { bytes: g2.bytes, path: p2, qa: r2?.qa, status: r2?.qa_status };
    }

    const common = { ms: Date.now() - t0, cost_usd: spend, qa_cost_usd: qaSpend, finished_at: new Date().toISOString(), base_path: job.base_path,
      result_path: best.path, qa: best.qa, qa_status: best.status, review_notes: retried ? "retried once" : null };

    // Never show a cover with a wrong name: that try does not count against the customer's limit.
    if (best.status !== "error" && !titleOk(best.qa)) {
      await sb.from("cover_previews").update({ ...common, status: "failed", error: "name_check_failed" }).eq("id", row.id);
      return;
    }
    const wm = await watermark(best.bytes);
    const prevPath = `site/previews/${row.id}.jpg`;
    await upload(prevPath, wm);
    await sb.from("cover_previews").update({ ...common, status: "ok", preview_path: prevPath, error: null }).eq("id", row.id);
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 500);
    const blocked = e?.code === "moderation_blocked" || /safety|moderation|policy/i.test(msg);
    await sb.from("cover_previews").update({ status: blocked ? "blocked" : "error", error: msg, ms: Date.now() - t0, cost_usd: spend, qa_cost_usd: qaSpend, finished_at: new Date().toISOString() }).eq("id", row.id);
  }
}

const ROW_COLS = "id,user_id,status,preview_path,error,story_slug,lang,child_name,child_age,child_gender,created_at,request_id";
const childOf = (row: any) => ({ story: row.story_slug, lang: row.lang, name: row.child_name, age: row.child_age, gender: row.child_gender });
const remainingOf = (f: any, u: any, deviceId: string) => Math.max(0, f.perDay - Math.max(u?.user_today ?? 0, deviceId ? (u?.device_today ?? 0) : 0));
async function rowByRequest(userId: string, rid: string) {
  const { data } = await sb.from("cover_previews").select(ROW_COLS).eq("user_id", userId).eq("request_id", rid).maybeSingle();
  return data;
}
// The answer to a "start" whose request was already accepted (or refused) earlier: same outcome, nothing new started.
function replayStart(row: any, remaining: number) {
  if (row.status === "rejected" || row.status === "blocked") {
    return json(422, { code: row.error === "photo_group" ? "photo_group" : row.error === "photo_noface" ? "photo_noface" : "photo_rejected", replay: true });
  }
  return json(200, { id: row.id, remaining, replay: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "POST only" });
  const body = await req.json().catch(() => ({}));
  const f = await flags();
  const user = await userFrom(req);
  if (!user) return json(401, { code: "signin" });
  const email = user.email ?? "";
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ipHash = ip ? await sha256("cp|" + ip) : "";
  const deviceId = String(body.device_id || "").slice(0, 64);

  if (body.action === "quota") {
    const ok = allowed(f, email);
    const u = await usage(user.id, deviceId, ipHash);
    return json(200, { enabled: ok, mode: f.mode, per_day: f.perDay, remaining: ok ? remainingOf(f, u, deviceId) : 0 });
  }

  if (body.action === "status") {
    // By preview id, or by the submission's request id when the browser never received the preview id.
    let row: any = null;
    if (body.id) { const { data } = await sb.from("cover_previews").select(ROW_COLS).eq("id", String(body.id)).maybeSingle(); row = data; }
    else if (body.request_id && RID_RE.test(String(body.request_id))) row = await rowByRequest(user.id, String(body.request_id));
    if (!row || row.user_id !== user.id) return json(404, { code: "not_found" });
    const u = await usage(user.id, deviceId, ipHash);
    const remaining = remainingOf(f, u, deviceId);
    const base = { id: row.id, child: childOf(row), remaining };
    if (row.status === "ok" && row.preview_path) {
      const { data: s } = await sb.storage.from(BUCKET).createSignedUrl(row.preview_path, 600);
      return json(200, { ...base, status: "ok", preview_url: s?.signedUrl });
    }
    if (row.status === "failed" || row.status === "error") return json(200, { ...base, status: "failed", reason: row.error === "name_check_failed" ? "name" : "error" });
    if (row.status === "blocked" || row.status === "rejected") return json(200, { ...base, status: "rejected", reason: row.error === "photo_group" ? "group" : row.error === "photo_noface" ? "noface" : "photo" });
    // A job still "working" 10 minutes after it started has died; it no longer counts against the free previews.
    if ((row.status === "queued" || row.status === "running") && Date.now() - new Date(row.created_at).getTime() > 10 * 60 * 1000) {
      await sb.from("cover_previews").update({ status: "error", error: "stalled", finished_at: new Date().toISOString() }).eq("id", row.id).in("status", ["queued", "running"]);
      return json(200, { ...base, status: "failed", reason: "error" });
    }
    return json(200, { ...base, status: "working" });
  }

  if (body.action === "start") {
    if (!allowed(f, email)) return json(403, { code: f.mode === "off" ? "off" : "not_open" });
    if (!OPENAI) return json(503, { code: "busy" });
    if (body.consent !== true) return json(400, { code: "consent" });
    const rid = body.request_id == null || body.request_id === "" ? "" : String(body.request_id);
    if (rid && !RID_RE.test(rid)) return json(400, { code: "request" });
    // Same submission sent again (the first answer was lost): return what happened the first time.
    if (rid) {
      const prev = await rowByRequest(user.id, rid);
      if (prev) { const u0 = await usage(user.id, deviceId, ipHash); return replayStart(prev, remainingOf(f, u0, deviceId)); }
    }
    const slug = String(body.story_slug || "");
    const lang = body.lang === "ar" ? "ar" : "en";
    const name = String(body.child_name || "").trim().replace(/\s+/g, " ");
    const age = Math.round(Number(body.child_age));
    const gender = body.child_gender === "girl" ? "girl" : body.child_gender === "boy" ? "boy" : "";
    if (!COVERS[slug]) return json(400, { code: "story" });
    if (!name || name.length > 20 || !(lang === "ar" ? AR_RE : EN_RE).test(name)) return json(400, { code: "name" });
    if (!(age >= 1 && age <= 12)) return json(400, { code: "age" });
    if (!gender) return json(400, { code: "gender" });
    const b64 = String(body.photo_b64 || "").replace(/^data:image\/\w+;base64,/, "");
    if (!b64 || b64.length > 3_500_000) return json(400, { code: "photo" });

    const u = await usage(user.id, deviceId, ipHash);
    if ((u?.user_today ?? 0) >= f.perDay || (deviceId && (u?.device_today ?? 0) >= f.perDay) || (ipHash && (u?.ip_today ?? 0) >= f.perDay * 3)) return json(429, { code: "limit", remaining: 0 });
    const projected = ((u?.spend_today_usd ?? 0) + (u?.inflight ?? 0) * 0.1) * USD_AED;
    if (projected >= f.capAed) return json(503, { code: "busy" });

    let photo: Uint8Array;
    try { photo = b64ToBytes(b64); } catch { return json(400, { code: "photo" }); }
    const id = crypto.randomUUID();
    const photoPath = `site/photos/${id}.jpg`;
    // Safety check and people count run together, before the photo is stored or a free preview is used.
    const [ok, people] = await Promise.all([moderate(photo), countPeople(photo)]);
    const base = { id, source: "site", user_id: user.id, email, device_id: deviceId || null, ip_hash: ipHash || null, request_id: rid || null,
      story_slug: slug, lang, child_name: name, child_age: age, child_gender: gender, model: "gpt-image-2", quality: "medium", variant: "v4r",
      consent_version: CONSENT_VERSION, consent_at: new Date().toISOString(), batch: "site-" + f.mode };
    const refuse = async (error: string, code: string) => {
      const { error: insErr } = await sb.from("cover_previews").insert({ ...base, status: "rejected", error, review_notes: people ? `people check: ${people.people} people, ${people.faces} faces` : null });
      if (insErr && rid) { const prev = await rowByRequest(user.id, rid); if (prev) return replayStart(prev, remainingOf(f, await usage(user.id, deviceId, ipHash), deviceId)); }
      return json(422, { code });
    };
    if (!ok) return await refuse("photo_moderation", "photo_rejected");
    if (people && Math.max(people.people, people.faces) > 1) return await refuse("photo_group", "photo_group");
    if (people && Math.max(people.people, people.faces) === 0) return await refuse("photo_noface", "photo_noface");
    await upload(photoPath, photo);
    const { error } = await sb.from("cover_previews").insert({ ...base, status: "queued", photo_path: photoPath });
    if (error) {
      // Two copies of the same submission arrived together: the first one won, answer with it.
      if (rid) {
        const prev = await rowByRequest(user.id, rid);
        if (prev) { await sb.storage.from(BUCKET).remove([photoPath]).catch(() => {}); return replayStart(prev, remainingOf(f, await usage(user.id, deviceId, ipHash), deviceId)); }
      }
      return json(500, { code: "error" });
    }
    EdgeRuntime.waitUntil(processPreview({ ...base, photo_path: photoPath }));
    return json(200, { id, remaining: Math.max(0, f.perDay - ((u?.user_today ?? 0) + 1)) });
  }

  return json(400, { code: "action" });
});
