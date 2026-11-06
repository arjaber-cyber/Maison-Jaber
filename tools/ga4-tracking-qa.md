# GA4 + Google Ads tracking — QA checklist (Nov 2026 repair)

## What was wrong (found 6 Nov 2026)
| Symptom in GA4 | Cause in the code | Fix |
|---|---|---|
| More `begin_checkout` than `add_to_cart` | `begin_checkout` fired on **every checkout page load**, including every return from Tabby / Tamara | Now fires only when the shopper clicks through to checkout with books in the cart (once per cart) |
| 6 `purchase` events, only 1 real paid order | `purchase` fired for AED 0 creator-code orders and for Tabby **sandbox test** payments (≈9 test orders on 23 + 27 Oct) | Server now classifies each confirmed order: sale → `purchase`; AED 0 / creator / gift / replacement → `complimentary_order_complete`; test → nothing |
| Tabby / Tamara as referral sources | Return from the payment page counted as a new referral, and overwrote the order's "came from" | Return pages tell GA the referrer is our own checkout; payment/sign-in hosts ignored for attribution |
| No item / coupon data in GA ecommerce reports | Events sent a custom `story` field, no `items` array | All ecommerce events now use the GA4 `items` shape |

## Event rules
| Event | Fires when | Never fires when |
|---|---|---|
| `view_item` | Story page, once the story is known to exist | Unknown / deleted story slug |
| `add_to_cart` | After the book is saved in the cart (personalize.html) | Upload failed / cart save failed |
| `view_cart` | Cart page with ≥ 1 book | Empty cart |
| `begin_checkout` | Click on any link to checkout.html with ≥ 1 book (once per cart contents per tab) | Checkout page load, payment return, empty cart |
| `purchase` | Server-confirmed **paid** order with order_type `sale` and amount > 0. Once per order number (device memory + GA's own transaction_id de-dupe) | Failed, cancelled, pending, AED 0, creator, gift, replacement, test, cash-on-delivery |
| `complimentary_order_complete` | AED 0 / creator / gift / replacement order placed. Params: `order_id`, `creator_code`, `story_name`, `value: 0` | Paid orders |

`purchase` params: `transaction_id` (HK-XXXXXXXX), `value` (paid amount after discount, local currency), `currency`, `coupon`, `shipping`, `items[]` (`item_id` = story slug, `item_name`, `price`, `quantity: 1`), `payment_method`.

## Automated checks (local browser run, payment endpoints mocked, no real charges) — 18/18 passed 6 Nov 2026
1. Normal paid order → exactly **one** `purchase` with all fields ✅
2. Refresh / revisit of the thank-you URL → no second `purchase` ✅
3. Complimentary (creator) order → **zero** `purchase`, one `complimentary_order_complete` ✅
4. Sandbox test order → nothing sent ✅
5. Cart abandonment / cancelled Tabby payment → no `purchase` ✅
6. Checkout page load alone → no `begin_checkout` ✅
7. Tabby return → `page_referrer` = our checkout; stored source (google / cpc) not overwritten ✅
8. gclid / utm kept when cookies are accepted on a later page than the ad landing page ✅
9. `view_cart` only with books; `begin_checkout` once on click; `view_item` only for real stories ✅

## Manual steps in Google tools (cannot be done from the website code)
1. **GA4 → Admin → Data streams → (web stream) → Configure tag settings → List unwanted referrals** — add, "Referral domain contains":
   `tabby.ai`, `tamara.co`, `ziina.com`, `paytabs.com`, `supabase.co`, `accounts.google.com`
2. **GA4 → Admin → Events**: make sure `complimentary_order_complete` is **not** marked as a key event.
3. **Google Ads → Goals → Conversions**: the only purchase conversion should be the imported GA4 `purchase` (primary). Do not import `complimentary_order_complete`.
4. Live check after deploy: GA4 → Admin → DebugView (or Realtime) while placing one real low-value order, or watch the next real order: one `purchase`, correct value, no Tabby/Tamara session source.
5. Historic data is not rewritten: the test and creator purchases already in GA stay in Oct / early-Nov reports. Compare from the deploy date onward.
