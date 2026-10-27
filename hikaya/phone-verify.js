/* Hikaya: "Add your WhatsApp number" sheet (Oct 2026).
   A 6-digit code arrives from the Hikaya WhatsApp number; once confirmed the
   number is saved to the account for good. Needed to use discount codes.

   import { openPhoneVerify, maybePromptPhone } from './phone-verify.js';
   openPhoneVerify(session, { reason: 'discount', onVerified })  -> Promise<boolean>
   maybePromptPhone(session)   gentle, skippable prompt shown once after sign-up
*/

const API = '/.netlify/functions/phone-verify';

const TXT = {
  en: {
    title: 'Add your WhatsApp number',
    titleDiscount: 'Verify your number to use this code',
    sub: "We'll send a 6-digit code to your WhatsApp. It takes about 20 seconds, and you only do it once.",
    subDiscount: 'Discount codes are for verified Hikaya members. We\'ll send a 6-digit code to your WhatsApp, and you only do it once.',
    perks: ['Unlock member discount codes', 'Order updates on WhatsApp', 'We never share your number'],
    country: 'Country code', number: 'WhatsApp number', numberPh: '50 123 4567',
    optin: 'Send me offers, discounts and new stories by WhatsApp and email. I can unsubscribe anytime.',
    send: 'Send code on WhatsApp', sending: 'Sending…', later: 'Maybe later',
    codeTitle: 'Check your WhatsApp',
    codeSub: 'Enter the 6-digit code we sent to',
    codeLabel: '6-digit code', verify: 'Verify', verifying: 'Checking…',
    resendIn: s => `Send a new code in ${s}s`, resend: 'Send a new code', change: 'Change number',
    noMsg: "Didn't get it? Make sure WhatsApp is installed on this number.",
    doneTitle: "You're verified", doneSub: 'Your number is saved to your account.',
    close: 'Close', err: 'Something went wrong. Please try again.',
    unavailable: 'WhatsApp verification is switching on very soon. Please try again later.',
  },
  ar: {
    title: 'أضف رقم واتساب الخاص بك',
    titleDiscount: 'وثّق رقمك لاستخدام هذا الكود',
    sub: 'سنرسل رمزاً من 6 أرقام إلى واتساب، الأمر يستغرق نحو 20 ثانية ومرة واحدة فقط',
    subDiscount: 'أكواد الخصم متاحة لأعضاء حكاية الموثّقين، سنرسل رمزاً من 6 أرقام إلى واتساب ومرة واحدة فقط',
    perks: ['استخدم أكواد الخصم للأعضاء', 'تحديثات طلبك على واتساب', 'لن نشارك رقمك مع أي جهة'],
    country: 'رمز الدولة', number: 'رقم واتساب', numberPh: '50 123 4567',
    optin: 'أرسلوا لي العروض والخصومات والقصص الجديدة عبر واتساب والبريد الإلكتروني ويمكنني إلغاء الاشتراك في أي وقت',
    send: 'أرسل الرمز على واتساب', sending: 'جارٍ الإرسال…', later: 'لاحقاً',
    codeTitle: 'تحقّق من واتساب',
    codeSub: 'أدخل الرمز المكوّن من 6 أرقام المرسل إلى',
    codeLabel: 'الرمز المكوّن من 6 أرقام', verify: 'تحقّق', verifying: 'جارٍ التحقق…',
    resendIn: s => `إرسال رمز جديد بعد ${s} ث`, resend: 'أرسل رمزاً جديداً', change: 'تغيير الرقم',
    noMsg: 'لم يصلك الرمز؟ تأكد أن واتساب مفعّل على هذا الرقم',
    doneTitle: 'تم توثيق رقمك', doneSub: 'تم حفظ رقمك في حسابك',
    close: 'إغلاق', err: 'حدث خطأ ما، يرجى المحاولة مرة أخرى',
    unavailable: 'توثيق واتساب سيتوفر قريباً جداً، يرجى المحاولة لاحقاً',
  },
};

// Arabic error messages for the server's reasons (English comes from the server).
const AR_ERR = {
  bad_phone: 'يرجى التأكد من الرقم مع رمز الدولة',
  taken: 'هذا الرقم مرتبط بحساب آخر في حكاية، سجّل الدخول بذلك الحساب أو استخدم رقماً آخر',
  cooldown: 'يرجى الانتظار قليلاً قبل طلب رمز جديد',
  too_many: 'طلبات كثيرة، يرجى المحاولة بعد ساعة',
  not_on_whatsapp: 'تعذّر الوصول إلى هذا الرقم على واتساب، تأكد منه أو استخدم رقماً عليه واتساب',
  send_failed: 'تعذّر إرسال الرمز الآن، يرجى المحاولة مرة أخرى',
  bad_code: 'الرمز غير صحيح، حاول مرة أخرى',
  expired: 'انتهت صلاحية الرمز، اضغط على أرسل رمزاً جديداً',
  locked: 'محاولات خاطئة كثيرة، اضغط على أرسل رمزاً جديداً',
  unavailable: TXT.ar.unavailable,
};

const COUNTRIES = [
  ['UAE', '+971', '🇦🇪'], ['Saudi', '+966', '🇸🇦'], ['Qatar', '+974', '🇶🇦'],
  ['Kuwait', '+965', '🇰🇼'], ['Bahrain', '+973', '🇧🇭'], ['Oman', '+968', '🇴🇲'],
];

const lang = () => (document.documentElement.lang === 'ar' ? 'ar' : 'en');
const L = () => TXT[lang()];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function call(session, body) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
    body: JSON.stringify({ lang: lang(), ...body }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}
const errText = d => (lang() === 'ar' ? AR_ERR[d.reason] : d.error) || L().err;

export async function phoneStatus(session) {
  if (!session) return null;
  try { const { ok, data } = await call(session, { action: 'status' }); return ok ? data : null; } catch { return null; }
}

function injectStyles() {
  if (document.getElementById('hkpv-css')) return;
  const css = document.createElement('style');
  css.id = 'hkpv-css';
  css.textContent = `
  .hkpv-back{position:fixed;inset:0;z-index:1000;background:rgba(38,28,23,.42);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .22s ease}
  .hkpv-back.on{opacity:1}
  .hkpv{width:100%;max-width:440px;background:var(--white,#FFFCF7);color:var(--ink,#261C17);border-radius:20px 20px 0 0;padding:26px 22px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(38,28,23,.18);transform:translateY(24px);transition:transform .28s cubic-bezier(.2,.7,.2,1);font-family:var(--sans,system-ui,sans-serif);max-height:92vh;overflow:auto}
  .hkpv-back.on .hkpv{transform:none}
  @media (min-width:640px){.hkpv-back{align-items:center}.hkpv{border-radius:20px}}
  .hkpv-x{position:absolute;top:12px;inset-inline-end:14px;background:none;border:0;font-size:22px;line-height:1;color:var(--ink-soft,#5E4A3D);cursor:pointer;padding:6px}
  .hkpv-icon{width:46px;height:46px;border-radius:50%;background:#E7F6EC;display:grid;place-items:center;margin-bottom:12px}
  .hkpv-icon svg{width:26px;height:26px}
  .hkpv h2{font-family:var(--serif,Georgia,serif);font-size:24px;line-height:1.2;margin:0 0 6px;font-weight:600}
  .hkpv p.hkpv-sub{margin:0 0 14px;color:var(--ink-soft,#5E4A3D);font-size:14px;line-height:1.5}
  .hkpv ul{list-style:none;margin:0 0 16px;padding:0;display:grid;gap:6px;font-size:13.5px}
  .hkpv li{display:flex;gap:8px;align-items:center}
  .hkpv li::before{content:'';width:16px;height:16px;flex:none;border-radius:50%;background:#E7F6EC url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 8.2l2.6 2.5L12 5.4' fill='none' stroke='%231F8A4C' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/16px no-repeat}
  .hkpv-row{display:flex;gap:8px;margin-bottom:12px}
  .hkpv label.hkpv-l{display:block;font-size:12px;font-weight:600;margin:0 0 5px;color:var(--ink-soft,#5E4A3D)}
  .hkpv select,.hkpv input[type=tel],.hkpv input.hkpv-code{font:inherit;font-size:16px;border:1.5px solid var(--taupe,#D8C5B3);border-radius:12px;padding:12px;background:#fff;color:inherit;width:100%;box-sizing:border-box}
  .hkpv select{width:auto;min-width:108px}
  .hkpv select:focus,.hkpv input:focus{outline:none;border-color:var(--gold,#C7A56C)}
  .hkpv input.hkpv-code{text-align:center;font-size:26px;letter-spacing:.5em;padding-inline-start:calc(12px + .5em);font-variant-numeric:tabular-nums}
  .hkpv-opt{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.45;color:var(--ink-soft,#5E4A3D);margin:4px 0 16px;cursor:pointer}
  .hkpv-opt input{width:18px;height:18px;margin:1px 0 0;flex:none;accent-color:var(--brand,#8A5638)}
  .hkpv-btn{display:block;width:100%;border:0;border-radius:28px;padding:14px 18px;font:inherit;font-weight:700;font-size:15px;background:var(--brand,#8A5638);color:#fff;cursor:pointer}
  .hkpv-btn:disabled{opacity:.6;cursor:default}
  .hkpv-link{display:block;margin:12px auto 0;background:none;border:0;font:inherit;font-size:13.5px;color:var(--ink-soft,#5E4A3D);text-decoration:underline;cursor:pointer}
  .hkpv-link:disabled{text-decoration:none;opacity:.7;cursor:default}
  .hkpv-err{color:#9b2f1f;font-size:13px;font-weight:600;min-height:18px;margin:-4px 0 10px}
  .hkpv-note{font-size:12px;color:var(--ink-soft,#5E4A3D);text-align:center;margin:12px 0 0}
  .hkpv-done{text-align:center;padding:10px 0 4px}
  .hkpv-done .hkpv-icon{margin:0 auto 12px;width:58px;height:58px}
  `;
  document.head.appendChild(css);
}

const WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1F8A4C" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4L19 7" fill="none" stroke="#1F8A4C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* Opens the sheet. Resolves true once the number is verified, false if closed. */
export function openPhoneVerify(session, opts = {}) {
  if (!session) return Promise.resolve(false);
  injectStyles();
  const discount = opts.reason === 'discount';
  const skippable = !discount;

  return new Promise(resolve => {
    const back = document.createElement('div');
    back.className = 'hkpv-back';
    back.innerHTML = `<div class="hkpv" role="dialog" aria-modal="true" aria-labelledby="hkpv-t" style="position:relative" dir="${lang() === 'ar' ? 'rtl' : 'ltr'}"><button type="button" class="hkpv-x" aria-label="${esc(L().close)}">×</button><div class="hkpv-body"></div></div>`;
    document.body.appendChild(back);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => back.classList.add('on'));
    const body = back.querySelector('.hkpv-body');
    let phone = '', timer = null, done = false;

    const finish = (ok) => {
      if (timer) clearInterval(timer);
      back.classList.remove('on');
      setTimeout(() => { back.remove(); document.body.style.overflow = prevOverflow; }, 230);
      document.removeEventListener('keydown', onKey);
      resolve(ok);
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    const close = () => {
      if (done) return finish(true);
      if (skippable && opts.markSkipped) call(session, { action: 'skip' }).catch(() => {});
      finish(false);
    };
    back.querySelector('.hkpv-x').addEventListener('click', close);
    back.addEventListener('click', e => { if (e.target === back) close(); });
    document.addEventListener('keydown', onKey);

    function stepNumber(prefill) {
      const t = L();
      const regionKey = (window.hikayaRegionKey && window.hikayaRegionKey()) || 'UAE';
      const dial = (prefill && prefill.dial) || (COUNTRIES.find(c => c[0] === regionKey) || COUNTRIES[0])[1];
      body.innerHTML = `
        <div class="hkpv-icon">${WA_ICON}</div>
        <h2 id="hkpv-t">${esc(discount ? t.titleDiscount : t.title)}</h2>
        <p class="hkpv-sub">${esc(discount ? t.subDiscount : t.sub)}</p>
        <ul>${t.perks.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        <form novalidate>
          <div class="hkpv-row" dir="ltr">
            <div><label class="hkpv-l" for="hkpv-cc">${esc(t.country)}</label>
              <select id="hkpv-cc">${COUNTRIES.map(c => `<option value="${c[1]}" ${c[1] === dial ? 'selected' : ''}>${c[2]} ${c[1]}</option>`).join('')}<option value="other">🌍 +…</option></select></div>
            <div style="flex:1"><label class="hkpv-l" for="hkpv-num">${esc(t.number)}</label>
              <input type="tel" id="hkpv-num" inputmode="tel" autocomplete="tel-national" placeholder="${esc(t.numberPh)}" value="${esc((prefill && prefill.num) || '')}" required></div>
          </div>
          <label class="hkpv-opt"><input type="checkbox" id="hkpv-optin" ${prefill && prefill.optin ? 'checked' : ''}><span>${esc(t.optin)}</span></label>
          <div class="hkpv-err" role="alert"></div>
          <button type="submit" class="hkpv-btn">${esc(t.send)}</button>
          ${skippable ? `<button type="button" class="hkpv-link" data-later>${esc(t.later)}</button>` : ''}
        </form>`;
      const form = body.querySelector('form');
      const cc = body.querySelector('#hkpv-cc');
      const num = body.querySelector('#hkpv-num');
      const err = body.querySelector('.hkpv-err');
      const btn = body.querySelector('.hkpv-btn');
      cc.addEventListener('change', () => { if (cc.value === 'other') { num.placeholder = '+44 7700 900123'; num.focus(); } else num.placeholder = t.numberPh; });
      const later = body.querySelector('[data-later]');
      if (later) later.addEventListener('click', close);
      setTimeout(() => num.focus(), 250);
      form.addEventListener('submit', async e => {
        e.preventDefault();
        err.textContent = '';
        const raw = num.value.trim();
        if (raw.replace(/\D/g, '').length < 6) { err.textContent = lang() === 'ar' ? AR_ERR.bad_phone : 'Please enter your WhatsApp number.'; num.focus(); return; }
        const full = cc.value === 'other' || raw.startsWith('+') || raw.startsWith('00') ? raw : cc.value + raw.replace(/^0+/, '');
        btn.disabled = true; btn.textContent = t.sending;
        try {
          const { ok, data } = await call(session, { action: 'send', phone: full });
          if (!ok) { err.textContent = errText(data); btn.disabled = false; btn.textContent = t.send; return; }
          phone = data.phone;
          stepCode({ dial: cc.value, num: raw, optin: body.querySelector('#hkpv-optin').checked }, data.resendIn || 60);
        } catch { err.textContent = t.err; btn.disabled = false; btn.textContent = t.send; }
      });
    }

    function stepCode(prev, resendIn) {
      const t = L();
      body.innerHTML = `
        <div class="hkpv-icon">${WA_ICON}</div>
        <h2 id="hkpv-t">${esc(t.codeTitle)}</h2>
        <p class="hkpv-sub">${esc(t.codeSub)} <b dir="ltr">${esc(phone)}</b></p>
        <form novalidate>
          <label class="hkpv-l" for="hkpv-code">${esc(t.codeLabel)}</label>
          <input class="hkpv-code" id="hkpv-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" dir="ltr">
          <div class="hkpv-err" role="alert" style="margin-top:8px"></div>
          <button type="submit" class="hkpv-btn">${esc(t.verify)}</button>
          <button type="button" class="hkpv-link" data-resend disabled></button>
          <button type="button" class="hkpv-link" data-change style="margin-top:4px">${esc(t.change)}</button>
          <p class="hkpv-note">${esc(t.noMsg)}</p>
        </form>`;
      const form = body.querySelector('form');
      const input = body.querySelector('#hkpv-code');
      const err = body.querySelector('.hkpv-err');
      const btn = body.querySelector('.hkpv-btn');
      const resend = body.querySelector('[data-resend]');
      setTimeout(() => input.focus(), 250);

      let left = resendIn;
      const tick = () => {
        if (left > 0) { resend.disabled = true; resend.textContent = t.resendIn(left); left--; }
        else { resend.disabled = false; resend.textContent = t.resend; clearInterval(timer); timer = null; }
      };
      if (timer) clearInterval(timer);
      tick(); timer = setInterval(tick, 1000);

      resend.addEventListener('click', async () => {
        err.textContent = ''; resend.disabled = true;
        const { ok, data } = await call(session, { action: 'send', phone }).catch(() => ({ ok: false, data: {} }));
        if (!ok) { err.textContent = errText(data); left = data.resendIn || 0; }
        else left = data.resendIn || 60;
        if (!timer) { tick(); timer = setInterval(tick, 1000); }
      });
      body.querySelector('[data-change]').addEventListener('click', () => { if (timer) clearInterval(timer); timer = null; stepNumber(prev); });

      const submit = async () => {
        const code = input.value.replace(/\D/g, '');
        if (code.length !== 6) { err.textContent = lang() === 'ar' ? 'يرجى إدخال الرمز المكوّن من 6 أرقام' : 'Please enter the 6-digit code.'; return; }
        err.textContent = ''; btn.disabled = true; btn.textContent = t.verifying;
        try {
          const { ok, data } = await call(session, { action: 'confirm', phone, code, marketingOptin: prev.optin, optinText: prev.optin ? t.optin : undefined });
          if (!ok) { err.textContent = errText(data); btn.disabled = false; btn.textContent = t.verify; input.select(); return; }
          stepDone();
        } catch { err.textContent = t.err; btn.disabled = false; btn.textContent = t.verify; }
      };
      input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 6); if (input.value.length === 6) submit(); });
      form.addEventListener('submit', e => { e.preventDefault(); submit(); });
    }

    function stepDone() {
      const t = L();
      done = true;
      if (timer) clearInterval(timer);
      body.innerHTML = `<div class="hkpv-done"><div class="hkpv-icon">${CHECK_ICON}</div><h2 id="hkpv-t">${esc(t.doneTitle)}</h2><p class="hkpv-sub">${esc(t.doneSub)}</p></div>`;
      try { if (opts.onVerified) opts.onVerified(phone); } catch {}
      setTimeout(() => finish(true), 1400);
    }

    stepNumber();
  });
}

/* Gentle prompt after sign-up: once per account, only if verification is live,
   the number isn't verified yet and the customer hasn't said "maybe later". */
export async function maybePromptPhone(session) {
  try {
    if (!session) return;
    const key = 'hikaya_phone_prompt_' + session.user.id;
    if (localStorage.getItem(key)) return;
    const s = await phoneStatus(session);
    if (!s || !s.available || s.verified || s.skipped) { if (s && (s.verified || s.skipped)) localStorage.setItem(key, '1'); return; }
    localStorage.setItem(key, '1');
    setTimeout(() => openPhoneVerify(session, { markSkipped: true }), 900);
  } catch { /* never block the page */ }
}
