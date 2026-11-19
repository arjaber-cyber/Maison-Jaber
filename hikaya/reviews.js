/* Hikaya — customer reviews on the homepage (Nov 2026)
   Text-only reviews (no customer photos), shown in the language the customer wrote them in.

   Labels are kept honest:
   - verified: true  ONLY for reviews that came through the site's after-delivery feedback form, tied to a
     real order, where the customer agreed their comment may be used (anonymously). Shown as "Verified order".
   - verified: false for real reviews customers sent through other channels (WhatsApp, Instagram, email).
     Shown as "Customer review".
   Never add a review a customer did not actually write. No children's names (comments are used anonymously),
   no full stops in Arabic. The average shown is calculated from the reviews in this list.

   TO ADD / REMOVE: edit the list below (newest or strongest first works best), then deploy.
   To hide the whole section: ENABLED = false. */
window.HIKAYA_REVIEWS = {
  ENABLED: true,
  reviews: [
      {
          "verified": true,
          "country": "UAE",
          "rating": 5.0,
          "text": "Every page has its own little details and such an interesting story to tell. He has become a fan, and now he wants me to read it to him every night before bed! Loved it! 🥹❤️",
          "source": "site feedback form"
      },
      {
          "verified": false,
          "country": "UAE",
          "rating": 5.0,
          "text": "My daughter absolutely loves her book. She keeps pointing at her picture and saying that's me 😂 We've already read it so many times.",
          "source": "shared by customer (other channel)"
      },
      {
          "verified": false,
          "country": "KSA",
          "rating": 4.9,
          "text": "طلبتها لبنتي ووصلتني السعودية، الصراحة طلعت أحلى من اللي توقعت، بنتي مرة انبسطت لما شافت اسمها وصورتها بالقصة",
          "source": "shared by customer (other channel)"
      },
      {
          "verified": false,
          "country": "UAE",
          "rating": 5.0,
          "text": "Got this for my son's birthday and he was so happy with it. The box is really nice too, didn't even need to wrap it.",
          "source": "shared by customer (other channel)"
      },
      {
          "verified": true,
          "country": "UAE",
          "rating": 5.0,
          "text": "اجمل هدية ممكن تقدمها لطفل",
          "source": "site feedback form"
      },
      {
          "verified": false,
          "country": "UAE",
          "rating": 5.0,
          "text": "My son usually gets bored when we read but this time he actually sat through the whole story 😂 Seeing himself in it really made a difference.",
          "source": "shared by customer (other channel)"
      },
      {
          "verified": false,
          "country": "KSA",
          "rating": 4.9,
          "text": "كنت متخوفة شوي من الطلب من برا السعودية بس الحمدلله وصلت وكل شي تمام، الكتاب جودته حلوة والتغليف مرتب، وأكيد مو آخر طلب",
          "source": "shared by customer (other channel)"
      },
      {
          "verified": false,
          "country": "UAE",
          "rating": 4.9,
          "text": "Bought this for my niece because she already has too many toys. She loved seeing her name in the story and her mum was really happy with it too.",
          "source": "shared by customer (other channel)"
      },
      {
          "verified": false,
          "country": "UAE",
          "rating": 5.0,
          "text": "بصراحة ما توقعت تطلع القصة بهالحلاوة، بنتي من شافت صورتها صارت تضحك وتقول هذي أنا 😂 حتى البوكس مرتب وحلو حق الهدايا",
          "source": "shared by customer (other channel)"
      },
      {
          "verified": false,
          "country": "UAE",
          "rating": 4.7,
          "text": "Ordered one for my daughter and really liked the result. Took a few days to arrive but the quality was worth it.",
          "source": "shared by customer (other channel)"
      }
  ],
};

(function () {
  'use strict';
  const cfg = window.HIKAYA_REVIEWS || {};
  const sec = document.getElementById('hk-reviews');
  if (!sec) return;
  const list = (cfg.reviews || []).filter(r => r && r.text && typeof r.rating === 'number');
  if (!cfg.ENABLED || !list.length) { sec.hidden = true; return; }

  const T = {
    en: { kicker: 'From Hikaya families', h: 'What parents are saying', avg: '<b>{avg}</b> out of 5 across {n} reviews',
      verified: 'Verified order', review: 'Customer review', UAE: 'UAE', KSA: 'Saudi Arabia', QAT: 'Qatar', KWT: 'Kuwait', BHR: 'Bahrain', OMN: 'Oman',
      cta: 'Create Their Story', prev: 'Previous reviews', next: 'Next reviews', stars: 'Rated {r} out of 5' },
    ar: { kicker: 'من عائلات حكاية', h: 'ماذا يقول الأهل', avg: 'متوسط التقييم <b dir="ltr">{avg}</b> من 5 في {n} تقييمات',
      verified: 'طلب موثّق', review: 'رأي عميل', UAE: 'الإمارات', KSA: 'السعودية', QAT: 'قطر', KWT: 'الكويت', BHR: 'البحرين', OMN: 'عُمان',
      cta: 'ابدأ قصة طفلك', prev: 'التقييمات السابقة', next: 'التقييمات التالية', stars: 'التقييم {r} من 5' },
  };
  const lang = () => ((window.Hikaya && window.Hikaya.lang && window.Hikaya.lang() === 'ar') || document.documentElement.lang === 'ar' ? 'ar' : 'en');
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isAr = s => /[\u0600-\u06FF]/.test(s);
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>';
  const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.3l3 3 6-6.3"/></svg>';
  const avg = (list.reduce((a, r) => a + r.rating, 0) / list.length).toFixed(1);
  const track = (ev, p) => { try { window.hikayaTrackEvent && window.hikayaTrackEvent(ev, Object.assign({ placement: 'home_reviews' }, p || {})); } catch (e) {} };

  function render() {
    const l = lang(), t = T[l], rtl = l === 'ar';
    const cards = list.map(r => {
      const ar = isAr(r.text);
      return `<li class="rv-card">
        <div class="rv-top" dir="ltr"><span class="rv-stars" role="img" aria-label="${esc(t.stars.replace('{r}', r.rating.toFixed(1)))}">${STAR.repeat(5)}</span><span class="rv-num" aria-hidden="true">${r.rating.toFixed(1)}</span></div>
        <p class="rv-text${ar ? ' rv-ar' : ''}" dir="${ar ? 'rtl' : 'ltr'}" lang="${ar ? 'ar' : 'en'}">${esc(r.text)}</p>
        <div class="rv-foot">${r.verified ? `<span class="rv-ver">${TICK}${esc(t.verified)}</span>` : `<span class="rv-src">${esc(t.review)}</span>`}<span class="rv-ctry">${esc(t[r.country] || r.country || '')}</span></div>
      </li>`;
    }).join('');
    sec.innerHTML = `<div class="wrap rv-head">
        <div><p class="kicker rv-kicker">${esc(t.kicker)}</p><h2 id="rv-title">${esc(t.h)}</h2>
          <p class="rv-avg"><span class="rv-stars" aria-hidden="true" dir="ltr">${STAR.repeat(5)}</span><span>${t.avg.replace('{avg}', avg).replace('{n}', list.length)}</span></p></div>
        <div class="rv-nav"><button type="button" class="rv-btn" data-rv="-1" aria-label="${esc(t.prev)}">${rtl ? '→' : '←'}</button><button type="button" class="rv-btn" data-rv="1" aria-label="${esc(t.next)}">${rtl ? '←' : '→'}</button></div>
      </div>
      <ul class="rv-track" tabindex="0" aria-labelledby="rv-title">${cards}</ul>
      <div class="wrap rv-cta"><a class="btn btn-primary" href="personalize.html" data-rv-cta>${esc(t.cta)} <span class="arr" aria-hidden="true">→</span></a></div>`;
    sec.hidden = false;
    const tr = sec.querySelector('.rv-track');
    sec.querySelectorAll('[data-rv]').forEach(b => b.addEventListener('click', () => {
      const card = tr.querySelector('.rv-card'); const step = card ? card.getBoundingClientRect().width + 20 : 300;
      const dir = Number(b.getAttribute('data-rv')) * (rtl ? -1 : 1);
      tr.scrollBy({ left: dir * step * (window.innerWidth >= 900 ? 3 : 1), behavior: 'smooth' });
      track('reviews_scroll', { dir: Number(b.getAttribute('data-rv')) });
    }));
    const cta = sec.querySelector('[data-rv-cta]'); if (cta) cta.addEventListener('click', () => track('reviews_cta'));
  }
  render();
  // Seen once per visit (for comparing visits that scrolled to the reviews with those that didn't).
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); try { if (!sessionStorage.getItem('hk_rv_seen')) { sessionStorage.setItem('hk_rv_seen', '1'); track('reviews_view'); } } catch (e) {} } }, { threshold: 0.3 });
    io.observe(sec);
  }
  document.addEventListener('hikaya:langchange', render);
})();
