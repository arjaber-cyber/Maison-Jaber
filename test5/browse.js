/* Hikaya — Stories collection, Age Groups and Story Detail pages.
   Uses window.Hikaya (chrome.js) for the catalog, cards, prices and carousels. */
(function () {
  'use strict';
  const H = window.Hikaya; const t = H.t; const esc = H.esc;
  const page = document.body.dataset.page;
  const qs = H.qs();
  const BANDS = ['2-4', '4-6', '6-8'];
  /* QA010: ranges read youngest-to-oldest in Arabic ("من 2 إلى 4 سنوات"), unchanged in English. */
  const bandLabel = b => { const [a, z] = String(b).split('-'); return t('a11y.band_words', '{a}–{b}').replace('{a}', a).replace('{b}', z); };
  const tpl = (s, o) => Object.keys(o).reduce((a, k) => a.replace('{' + k + '}', o[k]), s);

  const THEME_GROUPS = H.THEMES;
  const SVG = {
    emotions: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    friendship: '<svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3 19c.8-3 2.8-4.6 5-4.6s4.2 1.6 5 4.6M13.5 18.5c.6-2.3 1.9-3.5 3.5-3.5s3 1.2 3.5 3.5"/></svg>',
    courage: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.5 6 .8-4.4 4.1 1.1 6L12 16.6 6.7 19.4l1.1-6L3.4 9.3l6-.8z"/></svg>',
    kindness: '<svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3 19c.8-3 2.8-4.6 5-4.6s4.2 1.6 5 4.6M13.5 18.5c.6-2.3 1.9-3.5 3.5-3.5s3 1.2 3.5 3.5"/></svg>',
    family: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></svg>',
    growing: '<svg viewBox="0 0 24 24"><path d="M12 21V11"/><path d="M12 11c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/></svg>',
    confidence: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.5 6 .8-4.4 4.1 1.1 6L12 16.6 6.7 19.4l1.1-6L3.4 9.3l6-.8z"/></svg>',
    imagination: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
    everyday: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
    name: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    photo: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8.5 6l1.5-2h4l1.5 2"/></svg>',
    pronouns: '<svg viewBox="0 0 24 24"><path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/></svg>',
    dedication: '<svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/></svg>',
    extra: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.9-3.2 3-5 5.5-5s4.6 1.8 5.5 5"/><path d="M18 8v6M15 11h6"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/></svg>',
    print: '<svg viewBox="0 0 24 24"><path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/></svg>',
    box: '<svg viewBox="0 0 24 24"><rect x="3.5" y="9" width="17" height="11" rx="1"/><path d="M3 9h18M12 9v11M12 9c-1.5-3.5-5.5-4-5.5-1.5S10 9 12 9zm0 0c1.5-3.5 5.5-4 5.5-1.5S14 9 12 9z"/></svg>',
    tissue: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 8.5l1.1 2.3 2.5.3-1.8 1.7.5 2.5L12 14.1l-2.3 1.2.5-2.5-1.8-1.7 2.5-.3z"/></svg>',
    ribbon: '<svg viewBox="0 0 24 24"><path d="M12 12c-3-4-7-4-7-1.5S9 13 12 12zm0 0c3-4 7-4 7-1.5S15 13 12 12zm0 0l-3 8m3-8l3 8"/></svg>',
    truck: '<svg viewBox="0 0 24 24"><path d="M2 6h11v10H2zM13 9h4.5L21 12.5V16h-8"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
  };
  const ico = k => `<span class="ico" aria-hidden="true">${SVG[k] || SVG.confidence}</span>`;
  const groupOf = H.groupOf;
  const inGroup = (s, g) => !g || (s.moments || []).some(m => THEME_GROUPS[g].includes(m));
  const sortFeatured = list => [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.sort_order || 0) - (b.sort_order || 0));

  /* ================= Stories collection ================= */
  async function stories() {
    const gridEl = document.getElementById('grid');
    gridEl.setAttribute('aria-busy', 'true');
    if (!gridEl.children.length) gridEl.innerHTML = H.skeletonHtml(4);
    const all = await H.loadCatalog();
    gridEl.removeAttribute('aria-busy');
    const ageSel = document.getElementById('f-age'), themeSel = document.getElementById('f-theme'), sortSel = document.getElementById('f-sort');
    const grid = document.getElementById('grid'), count = document.getElementById('count'), empty = document.getElementById('empty');
    function options() {
      const a = ageSel.value || qs.get('age') || '', th = themeSel.value || qs.get('theme') || '', so = sortSel.value || qs.get('sort') || 'featured';
      ageSel.innerHTML = `<option value="">${esc(t('pg.f_all_ages', 'All ages'))}</option>` + BANDS.map(b => `<option value="${b}">${esc(H.rangeText(...b.split('-')))}</option>`).join('');
      themeSel.innerHTML = `<option value="">${esc(t('pg.f_all_themes', 'All themes'))}</option>` + Object.keys(THEME_GROUPS).map(g => `<option value="${g}">${esc(H.groupLabel(g))}</option>`).join('');
      sortSel.innerHTML = [['featured', 's_featured'], ['newest', 's_newest'], ['az', 's_az']].map(([v, k]) => `<option value="${v}">${esc(t('pg.' + k, v))}</option>`).join('');
      ageSel.value = BANDS.includes(a) ? a : ''; themeSel.value = THEME_GROUPS[th] ? th : ''; sortSel.value = so;
    }
    function render() {
      const a = ageSel.value, th = themeSel.value, so = sortSel.value;
      let list = all.filter(s => H.inBand(s, a) && inGroup(s, th));
      if (so === 'featured') list = sortFeatured(list);
      if (so === 'newest') list = [...list].sort((x, y) => String(y.created_at || '').localeCompare(String(x.created_at || '')) || (y.sort_order || 0) - (x.sort_order || 0));
      if (so === 'az') list = [...list].sort((x, y) => H.titlePlain(x).localeCompare(H.titlePlain(y), H.lang()));
      grid.innerHTML = list.map(s => H.cardHtml(s)).join('');
      count.textContent = list.length === 1 ? t('pg.count_one', '1 story') : tpl(t('pg.count', '{n} stories'), { n: list.length });
      /* The empty state only appears when the visitor has chosen filters that match nothing. */
      empty.hidden = list.length > 0 || !(a || th);
      if (!list.length && !(a || th)) grid.innerHTML = `<li class="catalog-note">${esc(t('lx.catalog_wait', 'New stories are on their way. Please check back soon.'))}</li>`;
      document.getElementById('reset').hidden = !(a || th);
      const p = new URLSearchParams(); if (a) p.set('age', a); if (th) p.set('theme', th); if (so !== 'featured') p.set('sort', so);
      H.setQS(p.toString() ? '?' + p : '');
    }
    [ageSel, themeSel, sortSel].forEach(el => el.addEventListener('change', render));
    document.getElementById('reset').addEventListener('click', () => { ageSel.value = ''; themeSel.value = ''; render(); });
    document.querySelectorAll('[data-reset]').forEach(b => b.addEventListener('click', () => { ageSel.value = ''; themeSel.value = ''; render(); }));
    options(); render();
    document.addEventListener('hikaya:langchange', () => { options(); render(); });
  }

  /* ================= Age group ================= */
  async function ages() {
    let band = BANDS.includes(qs.get('age')) ? qs.get('age') : '4-6';
    const all = await H.loadCatalog();
    function render() {
      const key = band.replace('-', '_'); const lbl = bandLabel(band);
      document.getElementById('age-title').textContent = tpl(t('pg.age_title', 'Stories for ages {band}'), { band: lbl });
      document.getElementById('age-sub').textContent = t('pg.age_sub_' + key, '');
      const img = document.getElementById('age-img');
      const file = { '2-4': 'age-hero-01.webp', '4-6': 'age-hero-02.webp', '6-8': 'age-hero-03.webp' }[band];
      img.src = window.PREVIEW_IMAGES ? window.PREVIEW_IMAGES[file] : 'images/' + file;
      if (!window.PREVIEW_IMAGES && window.innerWidth < 768) img.src = 'images/' + file.replace('.webp', '-900.webp');
      document.querySelectorAll('[data-band]').forEach(p => p.setAttribute('aria-current', p.dataset.band === band ? 'page' : 'false'));
      document.getElementById('tiles').innerHTML = Object.keys(THEME_GROUPS).map(g => `<li><a class="tile" href="stories.html?age=${band}&theme=${g}">${ico(g)}<span>${esc(H.groupLabel(g))}</span><small>${esc(t('pg.w_' + g + '_d', ''))}</small></a></li>`).join('');
      const list = sortFeatured(all.filter(s => H.inBand(s, band))).slice(0, 8);
      document.getElementById('popular').innerHTML = list.map(s => H.cardHtml(s)).join('');
      document.getElementById('age-quote').textContent = t('pg.age_quote_' + key, '');
      const cta = document.getElementById('age-cta');
      cta.href = 'stories.html?age=' + band;
      cta.querySelector('span').textContent = tpl(t('pg.age_browse', 'Browse all ages {band}'), { band: lbl });
      document.title = `${tpl(t('pg.age_title', 'Stories for ages {band}'), { band: lbl })} | Hikaya`;
      H.initCarousels();
    }
    document.querySelectorAll('[data-band]').forEach(p => p.addEventListener('click', e => {
      e.preventDefault(); band = p.dataset.band; H.setQS('?age=' + band); render();
    }));
    render();
    document.addEventListener('hikaya:langchange', render);
  }

  /* ================= Story detail ================= */
  async function story() {
    const all = await H.loadCatalog();
    const slug = qs.get('s') || qs.get('story');
    const s = all.find(x => x.slug === slug) || (slug ? null : all[0]);
    const root = document.getElementById('pdp-root');
    if (!s) { document.getElementById('not-found').hidden = false; root.hidden = true; return; }
    let current = 0;
    function images() {
      const pv = Array.isArray(s.preview_images) ? s.preview_images.filter(Boolean) : [];
      return pv;
    }
    function render() {
      const plain = H.titlePlain(s);
      document.title = `${plain} | ${H.lang() === 'ar' ? 'حكاية' : 'Hikaya'}`;
      const md = document.querySelector('meta[name="description"]'); if (md) md.content = H.premise(s) || md.content;
      document.getElementById('crumb-title').textContent = plain;
      document.getElementById('st-title').innerHTML = H.titleHtml(s);
      document.getElementById('st-ages').textContent = [H.ageText(s.age_bands), s.page_count ? tpl(t('pg.pages', '{n} pages'), { n: s.page_count }) : ''].filter(Boolean).join(' · ');
      document.getElementById('st-chips').innerHTML = [...new Set((s.moments || []).map(m => t('home6.th_' + m, '') || H.themeLabel(m)))].map(l => `<li>${esc(l)}</li>`).join('');
      document.getElementById('st-premise').textContent = H.oneLiner(s) || H.premise(s);
      renderPrice();
      document.getElementById('st-cta').href = H.personaliseHref(s);
      document.querySelectorAll('[data-st-cta]').forEach(a => { a.href = H.personaliseHref(s); });
      // gallery
      const pv = images();
      const main = document.getElementById('st-main');
      const shots = [null].concat(pv);
      main.innerHTML = current === 0 || !pv[current - 1] ? H.coverHtml(s, '', { alt: true, eager: true }) : `<div class="cover"><img src="${esc(pv[current - 1])}" alt="${esc(tpl(t('lx.page_alt', 'Sample page {n} from {title}'), { n: current, title: plain }))}" style="object-fit:contain;background:var(--white)"></div>`;
      const th = document.getElementById('st-thumbs');
      th.hidden = shots.length < 2;
      th.innerHTML = shots.slice(0, 5).map((u, i) => `<li><button type="button" aria-pressed="${i === current}" aria-label="${esc(i === 0 ? t('lx.cover', 'Cover') : tpl(t('lx.sample_n', 'Sample page {n}'), { n: i }))}" data-i="${i}"><img src="${esc(u || s.cover || '')}" alt=""></button></li>`).join('');
      // what happens
      /* QA005: the admin "description" is English-only, so Arabic shows the Arabic synopsis instead of mixing languages. */
      const arMode = H.lang() === 'ar';
      document.getElementById('st-happens').textContent = arMode
        ? H.arPunct(H.localized(s.synopsis) || s.description_ar || H.premise(s))
        : (H.localized(s.synopsis) || (s.description && s.description !== H.premise(s) ? s.description : H.premise(s)));
      // learns
      document.getElementById('st-learns').innerHTML = [...new Set((s.moments || []).map(m => H.groupOf(m) || 'courage'))].slice(0, 4).map(g => `<li>${ico(g)}<span>${esc(H.groupLabel(g))}</span></li>`).join('');
      document.getElementById('learns-sec').hidden = !(s.moments || []).length;
      // personalised (matches the real personalisation steps)
      const rows = [['name', 'p_name'], ['photo', 'p_photo'], ['pronouns', 'p_pronouns'], ['dedication', 'p_dedication']];
      let html = rows.map(([i, k]) => `<li>${ico(i)}<div><b>${esc(t('pg.' + k))}</b><span>${esc(t('pg.' + k + '_d'))}</span></div></li>`).join('');
      if (s.has_extra_character && s.extra_character_name) html += `<li>${ico('extra')}<div><b>${esc(t('pg.p_extra'))}</b><span>${esc(tpl(t('pg.p_extra_d'), { who: s.extra_character_name }))}</span></div></li>`;
      document.getElementById('st-personal').innerHTML = html;
      // inside the book
      const inside = document.getElementById('st-inside');
      if (pv.length) {
        inside.innerHTML = `<div class="pv-grid">${pv.slice(0, 4).map((u, i) => `<button type="button" data-lb="${i}" aria-label="${esc(tpl(t('lx.open_sample', 'Open sample page {n}'), { n: i + 1 }))}"><img src="${esc(u)}" alt="${esc(tpl(t('lx.page_alt', 'Sample page {n} from {title}'), { n: i + 1, title: plain }))}" loading="lazy"></button>`).join('')}</div><p class="note">${esc(t('pg.inside_note'))}</p>`;
      } else {
        /* No approved sample pages for this story yet: show a Hikaya spread, honestly labelled as an example. */
        const src = window.PREVIEW_IMAGES ? window.PREVIEW_IMAGES['sty-inside-01.webp'] : 'images/sty-inside-01.webp';
        inside.innerHTML = `<img src="${src}" srcset="images/sty-inside-01-900.webp 900w, images/sty-inside-01.webp 1800w" sizes="(max-width: 899px) 100vw, 50vw" alt="${esc(t('lx.example_alt', 'An open Hikaya book showing an illustrated spread'))}" loading="lazy"><p class="note">${esc(t('lx.inside_example', 'An example of a Hikaya spread. Your book is illustrated with your child as the hero.'))}</p>`;
      }
      // structured data (Product) for this story
      try {
        const r = (window.HIKAYA_REGIONS || {})[H.regionKey()] || { currency: 'AED', bookNow: 149 };
        let ld = document.getElementById('ld-product'); if (!ld) { ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.id = 'ld-product'; document.head.appendChild(ld); }
        ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: plain, description: H.premise(s), image: s.cover || undefined, brand: { '@type': 'Brand', name: 'Hikaya by Maison Jaber' },
          offers: { '@type': 'Offer', price: r.bookNow, priceCurrency: r.currency, availability: 'https://schema.org/InStock', url: location.origin + location.pathname + '?s=' + encodeURIComponent(s.slug) } });
      } catch (_) {}
      // they may also love
      const band = (s.age_bands || [])[0];
      const more = sortFeatured(all.filter(x => x.slug !== s.slug && (!band || H.inBand(x, band)))).slice(0, 10);
      document.getElementById('track-more').innerHTML = more.map(x => H.cardHtml(x)).join('');
      H.initCarousels();
    }
    function renderPrice() {
      const was = H.priceWas();
      document.getElementById('st-price').innerHTML = `<span class="now">${esc(H.priceNow())}</span>${was ? `<span class="was"><span class="sr-only">${esc(t('lx.was', 'Was'))} </span>${esc(was)}</span>` : ''}`;
      document.querySelectorAll('[data-st-price]').forEach(el => { el.textContent = H.priceNow(); });
    }
    document.getElementById('st-thumbs').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; current = Number(b.dataset.i); render(); });
    document.getElementById('st-inside').addEventListener('click', e => {
      const b = e.target.closest('[data-lb]'); if (!b) return;
      const pv = images(); let i = Number(b.dataset.lb);
      const lb = document.createElement('div'); lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
      lb.innerHTML = `<img alt=""><button class="x" aria-label="Close">×</button>`;
      const show = () => { lb.querySelector('img').src = pv[i]; };
      const close = () => { lb.remove(); document.removeEventListener('keydown', key); b.focus(); };
      const key = ev => { if (ev.key === 'Escape') close(); if (ev.key === 'ArrowRight') { i = (i + 1) % pv.length; show(); } if (ev.key === 'ArrowLeft') { i = (i - 1 + pv.length) % pv.length; show(); } };
      lb.addEventListener('click', ev => { if (ev.target === lb || ev.target.classList.contains('x')) close(); });
      document.addEventListener('keydown', key); document.body.appendChild(lb); show(); lb.querySelector('.x').focus();
    });
    render();
    document.addEventListener('hikaya:langchange', render);
    document.addEventListener('hikaya:regionchange', renderPrice);
  }

  function boot() { ({ stories, ages, story }[page] || (() => {}))(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
