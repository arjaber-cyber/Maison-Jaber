# Hikaya — Build Roadmap

Living backlog of what's left to build. Update this file as items get done or new ones come up.

---

## ✅ Done

- Order confirmation emails (Resend), abandoned-order recovery (scheduled reminders), analytics (GA4 + Meta Pixel event tracking)
- Shopping cart with bundle pricing (1 book full price, 2 = -10% + free delivery, 3+ = -20% + free delivery — placeholder %, confirm real numbers)
- Discount codes at checkout (stacks on top of bundle price; works today via starter codes even before the Supabase table exists)
- Admin dashboard reconnected to real Supabase orders (multi-item orders, bundle/promo tags, gift messages) — also fixed a pre-existing crash bug (`accessToken` was never declared) that likely broke the whole dashboard before today
- Payment audit across all 7 methods × all regions — added missing card-field validation that was silently absent
- SEO basics: robots.txt, sitemap.xml, Open Graph/Twitter Card tags on all public pages
- Legal pages: Privacy, Terms, Refund Policy (drafted to match how the site actually works — needs real lawyer review before launch)
- Fixed: region/currency silently resetting to Germany/EUR at checkout (race condition), missing cart icon, "Added to cart" moved to its own page, checkout delivery form was fillable without ever choosing sign-in/guest, admin login redirecting to the wrong place afterward
- Mobile audit: fixed a real horizontal-overflow bug on checkout (sign-in buttons wouldn't wrap), confirmed zero overflow across all 13 pages at phone width
- Site Photos dashboard: admin can now upload a replacement for any of the 13 site photos and it updates everywhere that photo is used, no code changes needed
- Simplified admin login: replaced Google sign-in with a single dashboard password (`ADMIN_PASSWORD` env var) — no Google account or OAuth chain needed to get in

## Still open

### 1. Real merchant credentials
Nothing charges real money yet — Telr/PayTabs (cards + wallets), Tabby, Tamara, and Sham Cash each need their own separate account + API keys in Netlify env vars. This blocks real payments regardless of anything else.

### 2. Real tracking IDs
`analytics.js` has placeholder GA4/Meta Pixel IDs — swap in the real ones whenever you have them.

### 3. book-added.html isn't translated yet
Everything else on the site is EN/DE/AR — this one page (the cart confirmation) is English-only.

### 4. "My Dashboard" scope for customers
Admin dashboard (owner) is done. A separate customer-facing "track my order" page doesn't exist yet — worth deciding if that's wanted.

### 5. Old Supabase migration block — now also blocks Site Photos
The `order_status`/`orders`/`discount_codes`/`abandoned_carts` tables are still blocked by an old migration approval issue. Also now blocks Site Photos: needs a public Storage bucket named `site-photos` and a `site_photos` table (filename, url, updated_at) — separate from the blocked migration, just needs creating in the Supabase dashboard. Everything that depends on these is built to degrade gracefully without them, but real data/photos won't show up until they exist.

### 6. Set ADMIN_PASSWORD
The new simplified admin login needs `ADMIN_PASSWORD` set in Netlify env vars — pick a real password, not something guessable, since this dashboard shows real customer names, addresses, phone numbers, and emails.

---

## Lower priority / needs your input, not just code

- Real story illustrations (still placeholder color gradients)
- Referral / "gift a friend" program
- Real customer reviews with photos, once real orders exist
- Bundle discount % and BNPL minimum-order threshold — both are my placeholder judgment calls, not confirmed business numbers
