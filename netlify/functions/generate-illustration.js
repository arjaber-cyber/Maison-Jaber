// netlify/functions/generate-illustration.js
//
// Takes a child's photo + story context, sends it to an AI image model,
// and returns a storybook-style illustration of that child.
//
// SETUP (one-time):
//   1. Get an API key from platform.openai.com (or swap the provider below).
//   2. In Netlify: Site settings -> Environment variables -> add
//        OPENAI_API_KEY = sk-xxxxxxxx
//   3. Redeploy the site. That's it — no code changes needed.
//
// This function never exposes your API key to the browser: the key only
// ever lives on Netlify's server, and the browser just calls this function.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Image AI is not set up yet. Add OPENAI_API_KEY in Netlify site settings > Environment variables, then redeploy.'
      })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { photoBase64, childName, storyTitle, storyTheme } = payload;
  if (!photoBase64 || !childName) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing photo or child name' }) };
  }

  try {
    // --- Convert the data URL (e.g. "data:image/png;base64,...") into a Blob ---
    const matches = photoBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Photo format not recognized' }) };
    }
    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const photoBlob = new Blob([buffer], { type: mimeType });

    // --- Build the prompt: keep this consistent across every story/page so ---
    // --- the child looks like the same character throughout the book.      ---
    const prompt = [
      `Repaint this child as the main character of a warm, gentle children's storybook illustration.`,
      `Style: soft watercolor, warm cream and muted pastel palette, hand-illustrated picture-book look, no text.`,
      `Keep the child's likeness (hair, skin tone, general face shape) recognizable but softened into an illustrated style.`,
      `Scene context: this is for the story "${storyTitle}" (theme: ${storyTheme}). Show the child in a scene fitting that theme.`,
      `Do not include any words, letters, or captions in the image.`
    ].join(' ');

    // --- Call the image model (OpenAI gpt-image-1 "edit" endpoint) ---
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('image', photoBlob, 'child-photo.png');
    form.append('prompt', prompt);
    form.append('size', '1024x1024');

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Image API error:', errText);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'The image AI service could not generate the illustration. Please try again.' })
      };
    }

    const data = await response.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return { statusCode: 502, body: JSON.stringify({ error: 'No image was returned. Please try again.' }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ imageBase64: `data:image/png;base64,${b64}` })
    };

  } catch (err) {
    console.error('generate-illustration error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong generating the illustration.' }) };
  }
};
