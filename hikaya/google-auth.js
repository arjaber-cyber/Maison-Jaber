// Hikaya — "Continue with Google" on our own domain.
//
// Uses Google's own sign-in button (Google Identity Services) and hands the
// resulting ID token to Supabase with signInWithIdToken. Because the popup is
// opened from maison-jaber.com, Google's screen says "continue to
// maison-jaber.com" instead of the raw Supabase project address.
//
// If the Client ID isn't set or Google's script can't load, the page's
// existing button keeps working with the old redirect flow, so nothing breaks.

// Paste the Google OAuth Web Client ID here (the same one already saved in
// Supabase → Authentication → Providers → Google). It is public, not a secret.
export const GOOGLE_CLIENT_ID = '275939911694-j62uh4s5pp0igiha2nkjp5sp74mqijlg.apps.googleusercontent.com';

let gisPromise = null;
function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Google sign-in script failed to load'));
      document.head.appendChild(s);
    });
  }
  return gisPromise;
}

async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { raw, hashed };
}

function siteLang() {
  try { return localStorage.getItem('hikaya_lang') || document.documentElement.lang || 'en'; }
  catch { return document.documentElement.lang || 'en'; }
}

/**
 * Swap a page's "Continue with Google" button for Google's own button.
 * @param supabase   the page's Supabase client
 * @param fallbackBtn the existing button (kept as the fallback)
 * @param opts.redirectTo where the old redirect flow should return to
 * @param opts.onSignedIn called after a successful sign-in
 * @param opts.onError    called with a readable message on failure
 * @param opts.size       'large' (default) or 'medium'
 */
export function mountGoogleSignIn(supabase, fallbackBtn, opts = {}) {
  const fallback = () => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: opts.redirectTo || window.location.href }
  });
  fallbackBtn.addEventListener('click', fallback);

  if (!GOOGLE_CLIENT_ID) return;

  (async () => {
    try {
      await loadGis();
      const nonce = await makeNonce();

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: nonce.hashed,
        use_fedcm_for_prompt: true,
        callback: async (resp) => {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: resp.credential,
            nonce: nonce.raw
          });
          if (error) { opts.onError?.(error.message); return; }
          opts.onSignedIn?.();
        }
      });

      const holder = document.createElement('div');
      holder.className = 'hk-google-btn';
      holder.style.cssText = opts.size === 'medium' ? 'display:inline-flex;align-items:center;' : 'display:flex;justify-content:center;margin-bottom:12px;min-height:40px;';
      fallbackBtn.parentNode.insertBefore(holder, fallbackBtn);

      const width = Math.min(400, Math.max(200, Math.round(fallbackBtn.getBoundingClientRect().width || 320)));
      window.google.accounts.id.renderButton(holder, {
        type: 'standard',
        theme: 'outline',
        size: opts.size || 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'center',
        width,
        locale: siteLang() === 'ar' ? 'ar' : 'en'
      });

      fallbackBtn.style.display = 'none';
    } catch (e) {
      // Keep the old button visible — it still works.
      console.warn('[hikaya] Google button unavailable, using redirect sign-in:', e);
    }
  })();
}
