// Hikaya — "Continue with Facebook".
//
// Sends the visitor through Supabase's Facebook OAuth flow and back to the
// page they came from. Before showing the button it asks Supabase whether the
// Facebook provider is switched on; if it isn't (or the check fails), the
// button stays hidden so nobody lands on a raw "provider is not enabled" page.
//
// When Facebook sends someone back with an error (they cancelled, or declined
// to share their email), the message is passed to opts.onError and the error
// is cleaned out of the address bar.

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';

let enabledPromise = null;
function facebookEnabled(anonKey) {
  if (!enabledPromise) {
    enabledPromise = fetch(SUPABASE_URL + '/auth/v1/settings', { headers: { apikey: anonKey } })
      .then(r => (r.ok ? r.json() : null))
      .then(s => !!(s && s.external && s.external.facebook))
      .catch(() => false);
  }
  return enabledPromise;
}

function lang() {
  try { return localStorage.getItem('hikaya_lang') || document.documentElement.lang || 'en'; }
  catch { return document.documentElement.lang || 'en'; }
}

const MSG = {
  cancelled: {
    en: 'Facebook sign-in was cancelled. You can try again or use another option.',
    ar: 'تم إلغاء تسجيل الدخول عبر فيسبوك، يمكنك المحاولة مجددًا أو اختيار طريقة أخرى'
  },
  email: {
    en: 'We need the email address on your Facebook account to create your Hikaya account. Please allow email access, or sign in with Google or email instead.',
    ar: 'نحتاج إلى البريد الإلكتروني المرتبط بحساب فيسبوك لإنشاء حسابك في حكاية، يرجى السماح بمشاركة البريد أو تسجيل الدخول عبر Google أو البريد الإلكتروني'
  },
  generic: {
    en: 'Facebook sign-in didn’t work. Please try again or use another option.',
    ar: 'لم ينجح تسجيل الدخول عبر فيسبوك، يرجى المحاولة مجددًا أو اختيار طريقة أخرى'
  }
};
function msg(key) { return (MSG[key] || MSG.generic)[lang() === 'ar' ? 'ar' : 'en']; }

// Supabase returns OAuth errors in the query string or hash, e.g.
// ?error=access_denied&error_description=... — turn them into a readable
// message and strip them from the URL.
function readReturnError() {
  const q = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const err = q.get('error') || h.get('error');
  if (!err) return null;
  const desc = (q.get('error_description') || h.get('error_description') || '').toLowerCase();

  ['error', 'error_code', 'error_description'].forEach(k => q.delete(k));
  const qs = q.toString();
  try { history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '')); } catch {}

  if (err === 'access_denied' || desc.includes('denied') || desc.includes('cancel')) return msg('cancelled');
  if (desc.includes('email')) return msg('email');
  return msg('generic');
}

/**
 * Wire up a page's "Continue with Facebook" button.
 * @param supabase  the page's Supabase client
 * @param btn       the button element
 * @param opts.anonKey    the Supabase anon key (used for the settings check)
 * @param opts.redirectTo where Facebook should return the visitor
 * @param opts.onError    called with a readable message on failure
 */
export function mountFacebookSignIn(supabase, btn, opts = {}) {
  if (!btn) return;

  const returnErr = readReturnError();
  if (returnErr) setTimeout(() => opts.onError?.(returnErr), 0);

  // Hidden until we know the provider is on.
  btn.style.display = 'none';
  facebookEnabled(opts.anonKey).then(on => { if (on) btn.style.display = ''; });

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: opts.redirectTo || window.location.href,
        scopes: 'email public_profile'
      }
    });
    if (error) {
      btn.disabled = false;
      opts.onError?.(msg('generic'));
      console.warn('[hikaya] Facebook sign-in failed:', error);
    }
  });
}
