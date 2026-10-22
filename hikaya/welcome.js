/* Hikaya: ask the server to send the one-time welcome email after a customer's first sign-in.
   Safe to call on every page load: the server sends it once per account and ignores older accounts. */
export function maybeSendWelcome(session) {
  try {
    if (!session || !session.access_token) return;
    const key = 'hikaya_welcome_' + (session.user && session.user.id);
    if (localStorage.getItem(key)) return; // already handled on this device
    const lang = (window.hikayaLang && window.hikayaLang() === 'ar') || localStorage.getItem('hikaya_lang') === 'ar' ? 'ar' : 'en';
    fetch('/.netlify/functions/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
      body: JSON.stringify({ lang }),
    }).then(r => { if (r.ok) localStorage.setItem(key, '1'); }).catch(() => {});
  } catch (_) { /* never block the page */ }
}
