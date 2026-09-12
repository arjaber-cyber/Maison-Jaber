// netlify/functions/upload-site-photo.js
//
// Admin-only. Uploads a replacement photo to Supabase Storage and records
// it in the `site_photos` table so every page picks it up via
// site-photos.js. Requires the same admin sign-in as the rest of the
// dashboard (ADMIN_EMAILS).
//
// ONE-TIME SETUP NEEDED IN SUPABASE (separate from the blocked table
// migration -- this is a Storage bucket, a different part of Supabase):
//   1. Storage -> New bucket -> name it "site-photos" -> make it Public.
//   2. Table editor -> create `site_photos` table:
//        filename text primary key, url text, updated_at timestamptz
//   Until both exist, this function returns a clear error explaining
//   exactly what's missing, rather than failing silently.

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';
const BUCKET = 'site-photos';

// The known set of filenames the site actually uses -- prevents uploading
// to an arbitrary path even though the caller is already admin-verified.
const KNOWN_FILENAMES = [
  'hero-bedroom-wide.jpg', 'giftbox-closeup.jpg', 'child-reading-closeup.jpg',
  'book-flatlay.jpg', 'giftbox-open-pair.jpg', 'fantasy-night-scene.jpg',
  'bunny-card-books.jpg', 'giftbag-set.jpg', 'desk-flatlay-globe.jpg',
  'note-card-closeup.jpg', 'bookshelf-scene.jpg', 'logo-hikaya.png',
  'favicon.png', 'favicon-192.png',
];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: 'Not signed in.' }) };
  const token = authHeader.replace('Bearer ', '');

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
  });
  if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: 'Your session has expired. Please sign in again.' }) };
  const user = await userRes.json();

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (!adminEmails.includes((user.email || '').toLowerCase())) {
    return { statusCode: 403, body: JSON.stringify({ error: 'This account is not authorized to manage site photos.' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }
  const { filename, base64Data, mimeType } = payload;
  if (!filename || !base64Data || !mimeType) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing filename, image data, or file type.' }) };
  }
  if (!KNOWN_FILENAMES.includes(filename)) {
    return { statusCode: 400, body: JSON.stringify({ error: `"${filename}" isn't a recognized site photo slot.` }) };
  }

  let fileBuffer;
  try {
    fileBuffer = Buffer.from(base64Data, 'base64');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Could not read the uploaded image data.' }) };
  }

  // Upload to Storage (upsert so re-uploading the same filename just replaces it).
  try {
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': mimeType,
        'x-upsert': 'true',
      },
      body: fileBuffer,
    });
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: `Couldn't upload to Supabase Storage. Make sure a public bucket named "${BUCKET}" exists (Storage → New bucket in your Supabase dashboard). Details: ${errText}`
        })
      };
    }
  } catch (err) {
    console.error('upload-site-photo storage error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Upload to storage failed. Please try again.' }) };
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}?updated=${Date.now()}`;

  // Record the mapping so get-site-photos.js can serve it.
  try {
    const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/site_photos?on_conflict=filename`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ filename, url: publicUrl, updated_at: new Date().toISOString() }),
    });
    if (!saveRes.ok) {
      const errText = await saveRes.text();
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: `Photo uploaded, but couldn't save the record. Make sure the "site_photos" table exists (filename text primary key, url text, updated_at timestamptz). Details: ${errText}`
        })
      };
    }
  } catch (err) {
    console.error('upload-site-photo table error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Photo uploaded, but saving the record failed.' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ success: true, url: publicUrl }) };
};
