# Hikaya — Build Roadmap

Living backlog of what's left to build. Update this file as items get done or new ones come up.

---

## Requested (2026-09-07)

### 1. Discount codes at checkout
- Input field + "Apply" button on checkout, shows discount applied in the price summary
- Needs a small backend: a Supabase table of codes (code, type: %/fixed/free-shipping, usage limit, expiry, region restriction) + a Netlify function to validate a code and return the discount
- Decide: single-use per customer, or unlimited? Stackable with bundle pricing (#4) or not?

### 2. Audit payment linkage end-to-end
- Trace the full path once more for every method (Card, Apple Pay, Google Pay, Tabby, Tamara, Sham Cash, COD) across every region, confirming: order data reaches `process-payment.js` correctly, error states are honest, and nothing silently fails
- Should happen again after any checkout changes, not just once

### 3. "My Dashboard"
- Need to confirm scope: the **admin dashboard** (owner-facing, stats + order pipeline — already built) vs. a **customer-facing** "track my order" dashboard (doesn't exist yet)
- If customer-facing: needs order lookup by email/account, status display reusing the same pipeline stages as admin

### 4. Bundle pricing (buy 2 = cheaper + free shipping, buy 3 = cheaper still)
- **Architectural note:** the site currently only supports ordering ONE book per checkout. Bundle pricing needs a real multi-item cart — this is a bigger change than a pricing tweak, touching Personalize, the order summary, and Checkout
- Worth deciding the exact tiers/logic before building (e.g., 1 book = full price, 2 = X% off + free shipping, 3+ = Y% off + free shipping)

---

## Also worth having (Claude's additions)

**High-value:**
- Order confirmation email to the customer after purchase (currently nothing is sent)
- Abandoned-order recovery — if someone starts Personalize but never finishes, a follow-up email
- Real payment credentials — nothing above works for real money until Telr/PayTabs (+ Tabby/Tamara/Sham Cash separately) merchant accounts exist
- Analytics — Google Analytics / Meta Pixel, so you can see where visitors drop off and measure ad spend

**Medium-value:**
- Referral / "gift a friend" program — natural fit for a gifting product
- Real customer reviews with photos, once you have real orders
- SEO basics: sitemap.xml, robots.txt, meta descriptions, social share previews

**Lower priority, good to know about:**
- Real story illustrations (still placeholder color gradients)
- Legal pages: privacy policy, terms, refund policy
- Supabase `order_status` table still blocked by an old migration approval issue — needed for the admin dashboard to persist pipeline stage changes
