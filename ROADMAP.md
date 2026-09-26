# Hikaya — Build Roadmap

Living backlog for a full end-to-end ecommerce platform. Organized by what actually
blocks a real launch vs. what's genuinely lower priority. Update as items land.

---

## 🔴 Critical — blocks a real launch

### 1. The AI illustration pipeline isn't connected to the order flow
`generate-illustration.js` exists and works standalone (photo + story context → AI
illustration), but nothing in Personalize, Checkout, or Admin ever calls it. This is
the actual product mechanic, not a nice-to-have. Missing pieces:
- Triggering illustration generation once an order comes in
- A way for admin to review a result and regenerate if it's bad
- A way for the **parent to see and approve** their child's illustrated pages before
  it moves to printing (the "awaiting_approval" pipeline stage exists as a label
  everywhere but has no actual screen behind it)

### 2. Eight Supabase tables don't exist yet
`orders`, `order_status`, `discount_codes`, `abandoned_carts`, `site_photos`,
`pending_paytabs_orders`, `contact_messages`, `newsletter_subscribers`. Everything
built degrades gracefully without them (no crashes), but that means large parts of
the site are currently running in "silently does nothing" mode. Pure setup — exact
table definitions can be handed over to paste into Supabase directly.

### 3. Real merchant accounts
PayTabs (chosen gateway), Tabby, Tamara, Sham Cash — no live credentials yet. No real
order can be paid for until these exist. Also still needed: `ADMIN_PASSWORD`,
`OPENAI_API_KEY` (photo moderation + illustration), `RESEND_API_KEY` (emails).

---

## 🟠 Fulfillment operations

- No shipping/carrier integration (DHL, Aramex, etc.) — no real tracking numbers ever
  reach the customer beyond internal stage labels
- No way to cancel or edit an order from the admin dashboard once placed
- No refund *issuance* from the dashboard — today a refund means going directly into
  PayTabs' own dashboard

## 🟡 Owner dashboard — solid, but incomplete

- No discount code management UI — codes only exist as hardcoded fallbacks or via
  direct Supabase table edits; no "create a new code" button
- No customer messages inbox in admin — Contact Us only emails the owner, doesn't
  surface anywhere in the dashboard itself
- No newsletter subscriber list or export in admin
- No revenue/sales reporting beyond the basic stat cards already on the dashboard
- No illustration review/approval screen (ties directly to Critical #1)

## 🟢 After-sales support — mostly there

- ✅ Done: Contact Us, guest order tracking, printable invoices, order history on account page
- ❌ No self-service refund/replacement *request* flow — only via email/contact form
- ❌ No live chat or WhatsApp option (discussed, never built — WhatsApp may fit this
  business better than a generic chat widget given the UAE/Syria customer base)

---

## Lower priority — real gaps, not launch-blocking

- `analytics.js` still has placeholder GA4/Meta Pixel IDs
- No reviews/ratings system (the system itself could be built, but populating it
  honestly needs real customers first)
- No referral / "gift a friend" program
- Real story cover illustrations (site still uses color-gradient placeholders)
- VAT/tax calculation and display not built (UAE 5%, Germany 19%)
- No error monitoring/alerting if a serverless function fails in production
- `book-added.html` isn't translated (EN only; rest of site is EN/DE/AR)
- Bundle discount % and BNPL minimum-order threshold are still placeholder judgment
  calls, not confirmed business numbers
- Tabby/Tamara currently offered in all 6 GCC regions in the UI, but Tabby only
  covers UAE/Saudi/Kuwait and Tamara adds Bahrain — Qatar/Oman need those options
  hidden or handled once real BNPL credentials go in


---

## QA Report Follow-up (23 Sept 2026) — in progress

Working through a full QA report against the staging site. Status:

**Done and pushed:**
- Story CMS + optional extra-character customization (admin can add stories, mark one with an extra character like "Mother", customer gets a Yes/No + real-photo prompt, fee flows through cart/checkout correctly)
- Removed customer-facing "starter policy, needs a lawyer" disclaimers from legal pages (hidden as dev comments instead) -- still genuinely needs real lawyer review, that has NOT happened
- Fixed stale "preview" text on account page
- Real cookie consent banner (essential/analytics/marketing), GA4/Meta Pixel now gated behind actual consent
- Personalize rebuilt as a real step wizard (Story -> About Them -> Photo -> Extra Character if applicable -> Dedication -> Review), photo-privacy trust copy moved inline, gender question reworded to pronouns
- One shared header (site-header.js) applied identically across all 7 browsing pages (home/stories/about/help/3 story pages) -- fixes the "different nav on every page" finding. Found + fixed 2 real bugs doing this: a dead script crashing on the homepage, and about.html/help.html silently missing region.js/cart.js/search.js entirely.

**Investigated, could not reproduce (reported honestly rather than "fixing" working code):**
- Order tracking "empty heading" -- added a defensive guard anyway
- GCC-shown-next-to-EUR price mismatch -- tested default state, manual region selection, confirmed group headers aren't clickable; never reproduced

**Still open from the QA report:**
- Standardize CTA language site-wide (still some "Create Their Book" vs "Create Their Story" inconsistency to sweep for)
- "Our artists" copy fix (shouldn't imply human illustrators if the pipeline is AI-assisted)
- "How It Works" needs the preview/approval step added
- Story product pages rebuilt as real product pages (gallery + buy box + trust icons)
- Story library cards enriched (emotional tag, premise line, dual CTA)
- Homepage copy sharpened for the first viewport
- Real book/packaging photography, the "See the Magic" demo, About page photos -- all blocked on real assets, not code
