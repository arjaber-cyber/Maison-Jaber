/* Hikaya — story page extras (cover photo + "A glimpse inside" previews).
   Include on story pages with: <script src="/story-extras.js" defer data-story-slug="cloud-ship"></script>
   or, on the generic page story.html, without a slug (it reads ?s=<slug>).

   Pulls the story from the catalog (managed in the admin dashboard) and:
   - shows the uploaded cover photo in the big cover (hiding the text title),
   - replaces the placeholder sample spread with a gallery of preview images
     (tap to open full-size, arrows / swipe / keyboard to move),
   - hides the "Seen from every angle" placeholder frames once real previews exist,
   - on story.html (data-story-generic on <body>) fills in the whole page. */
(function () {
  const script = document.currentScript;
  const slugAttr = script && script.dataset.storySlug;

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function injectCss() {
    if (document.getElementById('story-extras-css')) return;
    const st = document.createElement('style');
    st.id = 'story-extras-css';
    st.textContent = `
      .cover-large.has-photo { background-size: cover !important; background-position: center; padding: 0 !important; }
      .cover-large.has-photo > * { display: none !important; }
      .preview-strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; max-width: 1000px; margin: 0 auto; }
      .preview-strip button { all: unset; cursor: zoom-in; display: block; border-radius: 10px; overflow: hidden; background: #fff;
        box-shadow: 0 12px 30px rgba(23,23,25,0.10); aspect-ratio: 4/3; }
      .preview-strip button:focus-visible { outline: 3px solid #A67443; outline-offset: 3px; }
      .preview-strip img { width: 100%; height: 100%; object-fit: contain; background: #fbf7f1; display: block; transition: transform .3s ease; }
      .preview-strip button:hover img { transform: scale(1.03); }
      .preview-note { text-align: center; font-size: 12.5px; color: var(--ink-soft, #7d6a5a); margin-top: 14px; }
      .pv-lightbox { position: fixed; inset: 0; z-index: 2147483000; background: rgba(20,14,10,0.92); display: flex; align-items: center; justify-content: center; }
      .pv-lightbox img { max-width: 92vw; max-height: 84vh; object-fit: contain; border-radius: 6px; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
      .pv-lightbox button { position: absolute; background: rgba(255,255,255,.12); color: #fff; border: 0; width: 46px; height: 46px; border-radius: 50%;
        font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
      .pv-lightbox button:hover { background: rgba(255,255,255,.25); }
      .pv-lightbox .pv-close { top: 16px; right: 16px; }
      .pv-lightbox .pv-prev { left: 16px; top: 50%; transform: translateY(-50%); }
      .pv-lightbox .pv-next { right: 16px; top: 50%; transform: translateY(-50%); }
      .pv-lightbox .pv-count { position: absolute; bottom: 22px; left: 0; right: 0; text-align: center; color: #e8ddd0; font: 600 13px Inter, sans-serif; pointer-events: none; }
      @media (max-width: 560px) { .preview-strip { grid-template-columns: 1fr 1fr; gap: 10px; } .pv-lightbox .pv-prev, .pv-lightbox .pv-next { top: auto; bottom: 10px; transform: none; } }
    `;
    document.head.appendChild(st);
  }

  function openLightbox(urls, start, title) {
    let i = start;
    const box = document.createElement('div');
    box.className = 'pv-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', `${title} preview`);
    box.innerHTML = `<img alt=""><button class="pv-close" aria-label="Close">&times;</button>
      ${urls.length > 1 ? '<button class="pv-prev" aria-label="Previous">&#8592;</button><button class="pv-next" aria-label="Next">&#8594;</button>' : ''}
      <div class="pv-count"></div>`;
    const img = box.querySelector('img');
    const count = box.querySelector('.pv-count');
    const show = () => { img.src = urls[i]; img.alt = `${title}: preview ${i + 1} of ${urls.length}`; count.textContent = urls.length > 1 ? `${i + 1} / ${urls.length}` : ''; };
    const go = (d) => { i = (i + d + urls.length) % urls.length; show(); };
    const close = () => { box.remove(); document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
    const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    box.querySelector('.pv-close').onclick = close;
    if (urls.length > 1) { box.querySelector('.pv-prev').onclick = () => go(-1); box.querySelector('.pv-next').onclick = () => go(1); }
    let x0 = null;
    box.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); x0 = null; });
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    document.body.appendChild(box);
    show();
    box.querySelector('.pv-close').focus();
  }

  function renderPreviews(story) {
    const urls = (Array.isArray(story.preview_images) ? story.preview_images : []).filter(Boolean);
    const frame = document.querySelector('.spread-frame');
    const section = frame ? frame.closest('section') : null;
    if (!urls.length) {
      if (document.body.dataset.storyGeneric !== undefined && section) section.style.display = 'none';
      return;
    }
    const strip = document.createElement('div');
    strip.className = 'preview-strip';
    strip.innerHTML = urls.map((u, n) => `<button type="button" aria-label="Open preview ${n + 1}"><img src="${esc(u)}" alt="${esc(story.title)}: preview ${n + 1}" loading="lazy"></button>`).join('');
    strip.querySelectorAll('button').forEach((b, n) => b.addEventListener('click', () => openLightbox(urls, n, story.title)));
    const note = document.createElement('p');
    note.className = 'preview-note';
    note.textContent = (window.hikayaT && window.hikayaT('story_common.preview_note')) || 'Sample pages. Your copy is illustrated with your child as the hero.';
    if (frame) { frame.replaceWith(strip); strip.after(note); }
    // The empty "Seen from every angle" frames are placeholders; hide them once real previews exist.
    const angles = document.querySelector('.angles-grid');
    if (angles) { const sec = angles.closest('section'); if (sec) sec.style.display = 'none'; }
  }

  function renderCover(story) {
    const cover = document.querySelector('.cover-large');
    if (!cover || !story.cover_image_url) return;
    cover.style.backgroundImage = `url('${story.cover_image_url.replace(/'/g, '%27')}')`;
    cover.classList.add('has-photo');
    cover.setAttribute('role', 'img');
    cover.setAttribute('aria-label', `${story.title} cover`);
  }

  function renderGeneric(story) {
    const set = (sel, text) => document.querySelectorAll(sel).forEach(el => { el.textContent = text; });
    document.title = `${story.title} — Hikaya by Maison Jaber`;
    set('[data-story-title]', story.title);
    set('[data-story-collection]', story.collection || '');
    const syn = document.querySelector('[data-story-synopsis]');
    if (syn) { if (story.description) syn.textContent = story.description; else syn.style.display = 'none'; }
    const ages = document.querySelector('[data-story-ages]');
    if (ages) ages.innerHTML = (story.age_ranges || '').split(',').map(a => a.trim()).filter(Boolean)
      .map(a => `<span>Ages ${esc(a).replace('-', '&ndash;')}</span>`).join('') + '<span>Personalized throughout</span>';
    const href = `personalize.html?story=${encodeURIComponent(story.title)}`;
    document.querySelectorAll('[data-story-cta]').forEach(a => { a.href = href; });
    const coverTitle = document.querySelector('.cover-large .cover-title');
    if (coverTitle) coverTitle.textContent = story.title;
    const cover = document.querySelector('.cover-large');
    const grads = { courage: 'linear-gradient(165deg, #D98868 0%, #B5563B 100%)', adventure: 'linear-gradient(165deg, #DEB06B 0%, #C08A3E 100%)', lullaby: 'linear-gradient(165deg, #a9829a 0%, #7d5a6b 100%)' };
    if (cover && grads[story.theme]) cover.style.background = grads[story.theme];
    document.body.classList.add('story-loaded');
  }

  async function run() {
    injectCss();
    const generic = document.body.dataset.storyGeneric !== undefined;
    const slug = slugAttr || new URLSearchParams(location.search).get('s');
    if (!slug) { if (generic) location.replace('stories.html'); return; }
    let story;
    try {
      const data = await (await fetch('/.netlify/functions/get-stories')).json();
      story = (data.stories || []).find(s => s.slug === slug);
      // Old detail pages for a built-in story that was deleted from the catalog: send people to the library.
      if (!story && data.tableReady && !generic) return;
    } catch { return; }
    if (!story) {
      if (generic) {
        const main = document.querySelector('[data-story-main]');
        if (main) main.innerHTML = '<div style="text-align:center; padding:80px 20px;"><h1 style="font-size:26px;">This story isn\'t available any more.</h1><p style="margin-top:12px;"><a href="stories.html" style="text-decoration:underline;">See all stories</a></p></div>';
        document.body.classList.add('story-loaded');
      }
      return;
    }
    if (generic) renderGeneric(story);
    renderCover(story);
    renderPreviews(story);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
