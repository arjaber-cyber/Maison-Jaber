// netlify/functions/moderate-photo.js
//
// Runs an uploaded photo through OpenAI's free Moderation API before it's
// allowed into an order. This is a content-policy check only -- it flags
// clearly inappropriate content. It does NOT attempt to verify age or
// identity; the parent already tells us the child's age directly in the
// form, and age-estimation from a photo is unreliable technology that
// isn't needed here.
//
// Paired with a separate, free, client-side face-presence check (see
// personalize.html) that confirms a clear face is visible before this
// function is even called -- so this endpoint is only hit once already
// likely to be a real, usable photo, keeping API usage minimal.
//
// SETUP: requires OPENAI_API_KEY in Netlify environment variables.
// Cost: OpenAI's moderation endpoint (omni-moderation-latest) is free.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Photo checking isn\'t set up yet -- add OPENAI_API_KEY in Netlify environment variables, then redeploy.' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  const { base64Data, mimeType } = payload;
  if (!base64Data || !mimeType) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing image data.' }) };
  }

  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: [{ type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('OpenAI moderation error:', errText);
      return { statusCode: 502, body: JSON.stringify({ error: 'Could not check this photo right now. Please try again.' }) };
    }

    const data = await res.json();
    const result = data.results && data.results[0];
    const flagged = result ? result.flagged : false;

    return {
      statusCode: 200,
      body: JSON.stringify({ approved: !flagged })
    };
  } catch (err) {
    console.error('moderate-photo error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong checking this photo. Please try again.' }) };
  }
};
