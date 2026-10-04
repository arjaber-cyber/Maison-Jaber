/* Hikaya by Maison Jaber — shared shopping cart.
   Include with: <script src="/cart.js" defer></script>

   Stores multiple book orders (each with its own story/child/photos) so a
   parent can order for more than one child in a single checkout, and
   applies bundle pricing based on how many books are in the cart.

   BUNDLE TIERS (placeholder — adjust to whatever margin makes sense):
     1 book  -> full price, standard delivery fee
     2 books -> 10% off each book + free delivery
     3+ books -> 20% off each book + free delivery
   These percentages are a starting guess, not something the business
   confirmed — treat as a placeholder to tune once real numbers exist.
*/

window.HIKAYA_BUNDLE_TIERS = [
  { minItems: 1, discountPct: 0, freeDelivery: false },
  { minItems: 2, discountPct: 10, freeDelivery: true },
  { minItems: 3, discountPct: 20, freeDelivery: true },
];

(function () {
  const CART_KEY = 'hikaya_cart_v1';

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartBadges();
  }

  // item shape: { id, story, theme, childName, ageEdition, gender, dedication, photos: [{name,type,dataUrl}] }
  function addToCart(item) {
    const items = getCart();
    item.id = item.id || `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    items.push(item);
    saveCart(items);
    return item.id;
  }

  function removeFromCart(id) {
    saveCart(getCart().filter(i => i.id !== id));
  }

  function clearCart() {
    saveCart([]);
  }

  function bundleTierFor(count) {
    let tier = window.HIKAYA_BUNDLE_TIERS[0];
    for (const t of window.HIKAYA_BUNDLE_TIERS) {
      if (count >= t.minItems) tier = t;
    }
    return tier;
  }

  // Computes per-item and total pricing for the current cart, given a
  // region object from region.js (window.hikayaRegion()).
  function computeCartPricing(region) {
    const items = getCart();
    const tier = bundleTierFor(items.length);
    const perBookFull = region.bookNow;
    const perBookDiscounted = perBookFull * (1 - tier.discountPct / 100);
    const booksTotal = perBookDiscounted * items.length;
    const deliveryFee = tier.freeDelivery ? 0 : (region.deliveryFee || 0);
    // Extra-character fees (e.g. a real photo of a story's optional parent
    // character) are a separate customization charge, not part of the base
    // book price -- they're added on top, not discounted by the bundle tier.
    const extraCharacterFeeAed = items.reduce((sum, item) => sum + (item.extraCharacterFeeAed || 0), 0);
    const extraCharacterFee = window.hikayaConvertFromAed ? window.hikayaConvertFromAed(extraCharacterFeeAed, region) : 0;
    const total = booksTotal + deliveryFee + extraCharacterFee;
    return {
      items, tier, perBookFull, perBookDiscounted,
      booksTotal, deliveryFee, extraCharacterFee, total,
      itemCount: items.length,
    };
  }

  function updateCartBadges() {
    const count = getCart().length;
    document.querySelectorAll('.cart-badge').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  /* ---- Story covers for cart / book-added / checkout ----
     Items saved before covers were stored only carry the story title, so we
     look the cover up from the live catalogue by slug, then by title. */
  const LEGACY_SLUGS = { 'The Bravest Little One': 'bravest-little-one', 'The Cloud Ship': 'cloud-ship', "The Star Who Couldn't Sleep": 'star-who-couldnt-sleep' };
  let storiesPromise = null;
  function loadStories() {
    if (!storiesPromise) {
      storiesPromise = fetch('/.netlify/functions/get-stories', { headers: { Accept: 'application/json' } })
        .then(r => r.json()).then(d => (Array.isArray(d) ? d : d.stories) || []).catch(() => []);
    }
    return storiesPromise;
  }
  async function storyFor(item) {
    const all = await loadStories();
    const slug = item.slug || LEGACY_SLUGS[item.story];
    return all.find(s => slug && s.slug === slug) || all.find(s => s.title === item.story) || null;
  }
  async function coverFor(item) {
    if (item.coverUrl) return item.coverUrl;
    const s = await storyFor(item);
    return (s && s.cover_image_url) || null;
  }
  // Puts the real cover inside a placeholder element; the gradient stays if there is no cover.
  function paintCover(el, url) {
    if (!el || !url) return;
    const img = new Image();
    img.alt = '';
    img.decoding = 'async';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit;';
    img.onload = () => { el.textContent = ''; el.appendChild(img); el.classList.add('has-cover'); el.style.background = 'none'; };
    img.src = url;
  }
  function paintCovers(root, selector) {
    const cart = getCart();
    (root || document).querySelectorAll(selector).forEach(el => {
      const item = cart.find(i => i.id === el.dataset.itemId);
      if (item) coverFor(item).then(url => paintCover(el, url));
    });
  }

  window.hikayaCart = {
    getCart, addToCart, removeFromCart, clearCart,
    bundleTierFor, computeCartPricing, updateCartBadges,
    loadStories, storyFor, coverFor, paintCover, paintCovers,
  };

  document.addEventListener('DOMContentLoaded', updateCartBadges);
})();
