// Hikaya — "Continue with Facebook".
//
// The button only appears when Facebook is switched on in
// Supabase → Authentication → Providers → Facebook. Until then nothing shows,
// so visitors never see a button that leads to an error.

// Meta keeps a new Facebook app in "development" until it is published.
// Until then only the app's admins can log in, so the button stays hidden
// from customers. Admins can still test it by opening any sign-in page with
// ?fb=1 once (it is remembered on that browser). Set this to true when the
// Meta app is Live. (Live since 5 Nov 2026: App Review approved email + public_profile.)
const FACEBOOK_LIVE = true;

function facebookPreview() {
  try {
    if (new URLSearchParams(location.search).get('fb') === '1') localStorage.setItem('hikaya_fb_preview', '1');
    return localStorage.getItem('hikaya_fb_preview') === '1';
  } catch { return false; }
}

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wzrtwsqnWabsD9wgHmmODw_xVYcmlam';

const FB_ICON = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style="flex:none"><path fill="#1877F2" d="M18 9a9 9 0 1 0-10.4 8.9v-6.3H5.3V9h2.3V7a3.2 3.2 0 0 1 3.4-3.5c1 0 2 .17 2 .17v2.2h-1.1c-1.1 0-1.45.7-1.45 1.4V9h2.47l-.4 2.6h-2.07v6.3A9 9 0 0 0 18 9z"/></svg>';

let enabledPromise = null;
function facebookEnabled() {
  if (!enabledPromise) {
    enabledPromise = fetch(SUPABASE_URL + '/auth/v1/settings', { headers: { apikey: SUPABASE_KEY } })
      .then(r => (r.ok ? r.json() : {}))
      .then(s => !!(s && s.external && s.external.facebook))
      .catch(() => false);
  }
  return enabledPromise;
}

/**
 * Add a "Continue with Facebook" button right after `anchorEl`.
 * @param supabase  the page's Supabase client
 * @param anchorEl  element to place the button after (the Google button)
 * @param opts.redirectTo  where Facebook should send the visitor back to
 * @param opts.className   button class (matches the page's other buttons)
 * @param opts.style       extra inline style
 * @param opts.onError     called with a readable message on failure
 */
export async function mountFacebookSignIn(supabase, anchorEl, opts = {}) {
  if (!anchorEl || !(FACEBOOK_LIVE || facebookPreview())) return;
  if (!(await facebookEnabled())) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'facebook-btn';
  btn.className = opts.className || 'oauth-btn';
  if (opts.style) btn.style.cssText = opts.style;
  btn.innerHTML = FB_ICON + '<span data-i18n="checkout.facebook">Continue with Facebook</span>';
  const ar = (document.documentElement.lang || '') === 'ar';
  if (ar) btn.querySelector('span').textContent = 'المتابعة باستخدام فيسبوك';

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: opts.redirectTo || window.location.href, scopes: 'email' }
    });
    if (error) { btn.disabled = false; opts.onError?.(error.message); }
  });

  // If the visitor comes back with the browser's Back button (or from the
  // Facebook app), the page can be restored as it was left, with the button
  // still greyed out. Switch it back on so they can try again.
  window.addEventListener('pageshow', () => { btn.disabled = false; });

  anchorEl.insertAdjacentElement('afterend', btn);
}
