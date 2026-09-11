# Hikaya — Build Roadmap

Living backlog of what's left to build. Update this file as items get done or new ones come up.

---

## ✅ Done (2026-09-11)

- **Order confirmation emails** — `_email.js` (Resend), fires on successful COD orders, lists every book in the order
- **Abandoned-order recovery** — `track-abandoned-cart.js` + scheduled `send-abandoned-reminders.js` (runs every 6h), tracks from Checkout's email field
- **Analytics** — GA4 + Meta Pixel (`analytics.js`) on all 12 pages; `add_to_cart`, `begin_checkout`, `purchase` events wired up. **Still needs your real GA Measurement ID and Pixel ID swapped into the placeholders in analytics.js**
- **Shopping cart + bundle pricing** — Personalize adds books to a cart (`cart.js`); Checkout shows every item with remove buttons and auto-applies the bundle discount (1 book = full price, 2 = 10% off + free delivery, 3+ = 20% off + free delivery — **placeholder percentages, confirm real numbers**)

## Still open

### 1. Discount codes at checkout
- Input field + "Apply" button, needs a Supabase table of codes (type, usage limit, expiry, region) + a validation function
- Decide: stackable with bundle pricing, or does a promo code override the bundle discount?

### 2. Payment linkage audit
- Re-verify each method (Card, Apple Pay, Google Pay, Tabby, Tamara, Sham Cash, COD) across every region now that the cart sends `items[]` instead of one book — process-payment.js was updated for this but deserves a full re-check once real gateway credentials exist

### 3. "My Dashboard" — scope still unconfirmed
- Admin dashboard (owner) already exists, but now reads Netlify Forms submissions that only capture the *last* book added to a cart, not the full multi-item order — needs reconnecting to read from Supabase `orders` (where the real cart/items data now lands) instead
- Customer-facing "track my order" dashboard doesn't exist at all yet

### 4. Real payment + BNPL merchant credentials
- Nothing charges real money yet: Telr/PayTabs (cards + wallets), Tabby, Tamara, and Sham Cash each need their own separate merchant account + API keys in Netlify env vars

---

## Also worth having

**High-value:**
- SEO basics: sitemap.xml, robots.txt, meta descriptions, social share previews

**Medium-value:**
- Referral / "gift a friend" program
- Real customer reviews with photos, once real orders exist

**Lower priority, good to know about:**
- Real story illustrations (still placeholder color gradients)
- Legal pages: privacy policy, terms, refund policy
- Supabase `order_status` table still blocked by an old migration approval issue — needed for admin dashboard pipeline persistence
