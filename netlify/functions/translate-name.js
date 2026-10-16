// netlify/functions/translate-name.js
//
// Suggests how a child's first name is written in the book's language
// (e.g. "Adam" -> "آدم" for an Arabic book, "سارة" -> "Sara" for an English one).
// The parent always sees the suggestion and confirms or edits it before it is used,
// so this only needs to be a good first guess.
//
// POST { name, to: 'ar' | 'en' }  ->  { name: '<suggestion>' }  (empty string if unsure)
// Uses OPENAI_API_KEY (already set for photo checks).

const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const AR = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  let p;
  try { p = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }
  const name = String(p.name || '').trim().slice(0, 40);
  const to = p.to === 'ar' ? 'ar' : 'en';
  if (!name || !/^[\p{L}\p{M}' \-]+$/u.test(name)) return json(400, { error: 'Invalid name.' });
  if (!process.env.OPENAI_API_KEY) return json(200, { name: '' });

  const target = to === 'ar' ? 'Arabic script' : 'English (Latin letters)';
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 20,
        messages: [
          { role: 'system', content: `You write children's first names in ${target}. Reply with the name only: no quotes, no punctuation, no explanation. Use the most common spelling used in the Gulf (UAE/Saudi) for that name. If the input is not a name, reply with nothing.` },
          { role: 'user', content: name },
        ],
      }),
    });
    if (!res.ok) return json(200, { name: '' });
    const d = await res.json();
    let out = String((d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '').trim().replace(/[".،.]/g, '').slice(0, 40);
    // Only accept an answer that is actually in the requested script.
    if (to === 'ar' && (!AR.test(out) || LATIN.test(out))) out = '';
    if (to === 'en' && (!LATIN.test(out) || AR.test(out))) out = '';
    if (to === 'en') out = out.replace(/\b\p{L}/gu, c => c.toUpperCase());
    return json(200, { name: out });
  } catch (e) {
    console.warn('translate-name failed', e);
    return json(200, { name: '' });
  }
};
