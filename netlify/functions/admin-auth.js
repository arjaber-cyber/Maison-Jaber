// netlify/functions/admin-auth.js
//
// Simple password check for the admin dashboard -- replaces the Google
// sign-in requirement with a single password you set yourself.
//
// SETUP: In Netlify, Site configuration -> Environment variables, add:
//   ADMIN_PASSWORD = <a real password only you know>
// Do NOT use anything guessable like "admin" or "password" -- this
// dashboard shows real customer names, addresses, phone numbers, and
// emails. Pick something you'd be comfortable finding on a stranger's
// screen if it leaked.
//
// This only checks the password; it doesn't issue a login token. The
// other admin functions (get-orders, get-submissions, upload-site-photo,
// update-order-status) each independently check the same password on
// every request via the x-admin-password header, so there's no separate
// session to steal or expire awkwardly.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'No ADMIN_PASSWORD is set yet. Add one in Netlify → Site configuration → Environment variables, then redeploy.' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  if (payload.password === adminPassword) {
    return { statusCode: 200, body: JSON.stringify({ valid: true }) };
  }
  return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect password.' }) };
};
