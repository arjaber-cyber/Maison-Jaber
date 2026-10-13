// netlify/functions/_admin-check.js
//
// Shared password check used by every admin-only function. Returns true
// if the request's x-admin-password header matches ADMIN_PASSWORD.
//
// Uses a constant-time comparison so the password can't be guessed one
// character at a time by measuring response times.

const crypto = require('crypto');

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  // Hash both sides first so the lengths always match (timingSafeEqual needs that).
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function isAdminRequest(event) {
  const h = event.headers || {};
  const provided = h['x-admin-password'] || h['X-Admin-Password'];
  const real = process.env.ADMIN_PASSWORD;
  return Boolean(real) && safeEqual(provided, real);
}

module.exports = { isAdminRequest, safeEqual };
