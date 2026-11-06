// netlify/functions/_gaSummary.js
//
// GA4 / Google Ads purchase data for one order (Nov 2026 tracking repair).
// The order-status endpoints add this to their reply ONLY once the order is
// confirmed paid, so the browser fires `purchase` from what the server knows
// (real paid amount, coupon, stories), never from the URL or the cart.
//
// kind:
//   'purchase'      -> a real paid sale (order_type 'sale', amount > 0)
//   'complimentary' -> AED 0 / creator gift / replacement order (no purchase event)
//   'none'          -> test / sandbox orders: nothing at all is sent to GA
// No names, emails, phones, addresses or child details are included.

const { REGIONS } = require('./_pricing');

function parseItems(raw) {
  try { const v = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(v) ? v : []; } catch { return []; }
}

function gaSummary(order) {
  if (!order) return null;
  const type = String(order.order_type || 'sale');
  const value = Math.round((Number(order.amount) || 0) * 100) / 100;
  const items = parseItems(order.items);
  const region = REGIONS[order.country] || null;
  const kind = type === 'test' ? 'none'
    : (type !== 'sale' || value <= 0 || order.payment_status === 'waived') ? 'complimentary'
    : 'purchase';
  // Delivery isn't stored on the order: same rule as _pricing.js (free in the UAE and for 2+ books).
  // The browser's own figure from checkout (which also knows delivery-waiving codes) is preferred.
  const shipping = kind !== 'purchase' || !region || items.length >= 2 ? 0 : Math.min(region.deliveryFee || 0, value);
  // Each book's share of the paid amount (after discounts, before delivery), so item revenue adds up to the order.
  const n = items.length || 1;
  const each = kind === 'purchase' ? Math.round(((value - shipping) / n) * 100) / 100 : 0;
  return {
    confirmed: true, // built by our server from the stored order: the only source allowed to send a GA purchase
    kind,
    transaction_id: order.order_number,
    value: kind === 'purchase' ? value : 0,
    currency: order.currency || (region && region.currency) || 'AED',
    coupon: order.promo_code || null,
    shipping,
    items: items.map(i => ({ item_id: i.slug || i.story || 'story', item_name: i.story || i.slug || 'Story', price: each, quantity: 1, book_language: i.bookLanguage || null, age_edition: i.ageEdition || null })),
  };
}

module.exports = { gaSummary };
