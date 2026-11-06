/* Hikaya — "Real Hikaya Moments" (Nov 2026)
   A homepage section for ONE real reaction / unboxing video from a Hikaya family, with an optional
   first name + city and a short real quote. It stays completely hidden until it is switched on below
   AND has a moment marked approved. Nothing here is ever invented: only add content a family or
   creator has given written permission to use.

   TO SWITCH IT ON (once permission is confirmed):
     1. Put the vertical video (MP4, about 9:16, under ~8 MB) and a poster image (first frame, JPG)
        in /hikaya/images/moments/
     2. Fill in the moment below, set approved: true, then set ENABLED = true.
     3. Deploy. To hide it again, set ENABLED = false.
*/
window.HIKAYA_MOMENTS = {
  ENABLED: false,
  moments: [
    // {
    //   approved: true,                                   // written permission received (date + who in your records)
    //   video: 'images/moments/family-1.mp4',             // vertical video
    //   poster: 'images/moments/family-1.jpg',            // still shown before it plays
    //   quote: { en: 'Their real words, short.', ar: 'كلماتهم الحقيقية باختصار' },   // optional
    //   name: { en: 'Sara', ar: 'سارة' },                 // optional: first name only
    //   city: { en: 'Dubai', ar: 'دبي' },                 // optional
    // },
  ],
};

(function () {
  var cfg = window.HIKAYA_MOMENTS || {};
  var sec = document.getElementById('real-moments');
  if (!sec) return;
  var m = (cfg.moments || []).filter(function (x) { return x && x.approved === true && x.video; })[0];
  if (!cfg.ENABLED || !m) { sec.hidden = true; return; }

  var T = {
    en: { kicker: 'Real Hikaya moments', h: 'As seen in a Hikaya family home', cta: 'Create Their Story', label: 'A family opening their Hikaya book' },
    ar: { kicker: 'لحظات حقيقية مع حكاية', h: 'من بيت إحدى عائلات حكاية', cta: 'اصنع قصتهم', label: 'عائلة تفتح كتاب حكاية' },
  };
  function lang() { return (window.Hikaya && window.Hikaya.lang && window.Hikaya.lang() === 'ar') || document.documentElement.lang === 'ar' ? 'ar' : 'en'; }
  function pick(v, l) { return !v ? '' : typeof v === 'string' ? v : (v[l] || v.en || ''); }
  function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function render() {
    var l = lang(), t = T[l];
    var who = [pick(m.name, l), pick(m.city, l)].filter(Boolean).join(l === 'ar' ? '، ' : ', ');
    var quote = pick(m.quote, l);
    sec.innerHTML =
      '<div class="wrap"><div class="rm-grid">' +
        '<div class="rm-video"><video src="' + esc(m.video) + '"' + (m.poster ? ' poster="' + esc(m.poster) + '"' : '') +
          ' controls playsinline preload="none" aria-label="' + esc(t.label) + '"></video></div>' +
        '<div class="rm-copy"><p class="kicker">' + esc(t.kicker) + '</p><h2 id="rm-title">' + esc(t.h) + '</h2>' +
          (quote ? '<blockquote class="rm-quote"><p>“' + esc(quote) + '”</p>' + (who ? '<footer>' + esc(who) + '</footer>' : '') + '</blockquote>' : (who ? '<p class="rm-who">' + esc(who) + '</p>' : '')) +
          '<a class="btn btn-primary" href="personalize.html">' + esc(t.cta) + ' <span class="arr" aria-hidden="true">→</span></a>' +
        '</div>' +
      '</div></div>';
    sec.hidden = false;
  }
  render();
  document.addEventListener('hikaya:langchange', render);
})();
