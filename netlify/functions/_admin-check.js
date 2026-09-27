// netlify/functions/_admin-check.js
//
// Shared password check used by every admin-only function. Returns true
// if the request's x-admin-password header matches ADMIN_PASSWORD.

function isAdminRequest(event) {
  const provided = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  const real = process.env.ADMIN_PASSWORD;
  return Boolean(real) && provided === real;
}

module.exports = { isAdminRequest };
