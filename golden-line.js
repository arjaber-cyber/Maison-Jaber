/* Hikaya by Maison Jaber — "Golden Line" background motif.
   A glowing gold thread that winds down the full height of the page with
   organic, non-repeating curves (echoing the brand's "Find the Golden
   Line" story theme). Include with:
   <script src="/golden-line.js" defer></script>
*/
(function () {
  function buildPath(totalHeight, centerX, maxAmplitude) {
    let y = 0;
    let x = centerX;
    let d = `M${x.toFixed(1)},0 `;
    const minAmp = maxAmplitude * 0.25;

    while (y < totalHeight) {
      const segH = 160 + Math.random() * 200; // organic, varying segment length
      const nextY = Math.min(y + segH, totalHeight);
      const amp = minAmp + Math.random() * (maxAmplitude - minAmp);
      const dir = Math.random() < 0.5 ? -1 : 1;
      // occasionally keep drifting the same direction for a longer sweep,
      // occasionally reverse — avoids a too-regular left/right/left/right feel
      const nextX = centerX + dir * amp;

      const cp1x = x + (Math.random() - 0.5) * maxAmplitude * 0.7;
      const cp1y = y + segH * (0.3 + Math.random() * 0.15);
      const cp2x = nextX + (Math.random() - 0.5) * maxAmplitude * 0.7;
      const cp2y = y + segH * (0.65 + Math.random() * 0.15);

      d += `C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${nextX.toFixed(1)},${nextY.toFixed(1)} `;
      x = nextX;
      y = nextY;
    }
    return d;
  }

  function render() {
    const existing = document.getElementById('golden-line-layer');
    if (existing) existing.remove();

    const totalHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    const vw = window.innerWidth;
    const centerX = vw / 2;
    const maxAmplitude = Math.min(vw * 0.32, 380);

    const d = buildPath(totalHeight, centerX, maxAmplitude);
    const uid = 'gl' + Math.random().toString(36).slice(2, 8);

    const wrap = document.createElement('div');
    wrap.id = 'golden-line-layer';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = `position:absolute; top:0; left:0; width:100%; height:${totalHeight}px; z-index:-1; pointer-events:none; overflow:hidden;`;

    wrap.innerHTML = `
      <svg width="100%" height="${totalHeight}" viewBox="0 0 ${vw} ${totalHeight}" preserveAspectRatio="none" style="display:block;">
        <defs>
          <linearGradient id="${uid}-g" x1="0" y1="0" x2="${vw}" y2="${totalHeight}" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#f7e2ab"/>
            <stop offset="0.5" stop-color="#c99a3f"/>
            <stop offset="1" stop-color="#f7e2ab"/>
          </linearGradient>
          <filter id="${uid}-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="9" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <path d="${d}" fill="none" stroke="url(#${uid}-g)" stroke-width="11" opacity="0.22" filter="url(#${uid}-glow)"/>
        <path d="${d}" fill="none" stroke="url(#${uid}-g)" stroke-width="3.2" opacity="0.62"/>
      </svg>
    `;

    document.body.insertBefore(wrap, document.body.firstChild);
  }

  let resizeTimer;
  function scheduleRerender() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 250);
  }

  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('load', render); // catch late-loading images/content changing page height
  window.addEventListener('resize', scheduleRerender);
})();
