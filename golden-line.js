/* Hikaya by Maison Jaber — "Golden Line" background motif.
   A glowing gold thread that winds down the full height of the page with
   organic, non-repeating, continuously-smooth curves (echoing the brand's
   "Find the Golden Line" story theme). Include with:
   <script src="/golden-line.js" defer></script>
*/
(function () {
  // Builds a single continuous path. Each segment's incoming control point
  // continues the previous segment's outgoing tangent, so the curve is
  // smooth (no kinks) all the way down, even though amplitude, direction,
  // and length are randomized.
  function buildPath(totalHeight, centerX, maxAmplitude, vw) {
    let y = 0;
    let x = centerX;
    let d = `M${x.toFixed(1)},0 `;
    const minAmp = maxAmplitude * 0.3;
    const margin = 18;
    const clampX = (v) => Math.max(margin, Math.min(vw - margin, v));

    let outTangentX = 0;

    while (y < totalHeight) {
      const makeLoop = Math.random() < 0.35;
      const segH = makeLoop ? 220 + Math.random() * 200 : 150 + Math.random() * 240;
      const nextY = Math.min(y + segH, totalHeight);
      const dir = Math.random() < 0.5 ? -1 : 1;

      let nextX, cp2x, cp2y;
      const cp1x = clampX(x + outTangentX * segH * 0.33);
      const cp1y = y + segH * 0.33;

      if (makeLoop) {
        const loopAmp = maxAmplitude * (0.7 + Math.random() * 0.5);
        nextX = clampX(x + dir * minAmp * (0.2 + Math.random() * 0.3));
        cp2x = clampX(x + dir * loopAmp);
        cp2y = y + segH * 0.7;
      } else {
        const amp = minAmp + Math.random() * (maxAmplitude - minAmp);
        nextX = clampX(centerX + dir * amp);
        cp2x = clampX(nextX - (nextX - x) * 0.35);
        cp2y = y + segH * 0.7;
      }

      d += `C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${nextX.toFixed(1)},${nextY.toFixed(1)} `;

      const segLen = Math.max(nextY - y, 1);
      outTangentX = (nextX - cp2x) / (segLen * 0.3 || 1);
      outTangentX = Math.max(-2.2, Math.min(2.2, outTangentX));

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

    const d = buildPath(totalHeight, centerX, maxAmplitude, vw);
    const uid = 'gl' + Math.random().toString(36).slice(2, 8);

    const wrap = document.createElement('div');
    wrap.id = 'golden-line-layer';
    wrap.setAttribute('aria-hidden', 'true');
    // No z-index here on purpose: Safari has a known bug where a negative
    // z-index child of <body> can be composited behind the page's own
    // background and become invisible. Instead we rely on document order —
    // this element is inserted as body's FIRST child, so at the default
    // stacking level it paints below every element that comes after it.
    wrap.style.cssText = `position:absolute; top:0; left:0; width:100%; height:${totalHeight}px; pointer-events:none; overflow:hidden;`;

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
        <path d="${d}" fill="none" stroke="url(#${uid}-g)" stroke-width="11" opacity="0.22" filter="url(#${uid}-glow)" stroke-linecap="round"/>
        <path d="${d}" fill="none" stroke="url(#${uid}-g)" stroke-width="3.2" opacity="0.62" stroke-linecap="round"/>
      </svg>
    `;

    document.body.insertBefore(wrap, document.body.firstChild);
  }

  // Mobile Safari fires 'resize' repeatedly while scrolling, as its address
  // bar collapses/expands (a HEIGHT change, not a real layout change). If we
  // regenerate on every resize, the line visibly redraws itself mid-scroll.
  // So we only ever regenerate when the WIDTH actually changes.
  let lastWidth = window.innerWidth;
  let resizeTimer;
  function scheduleRerenderIfWidthChanged() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
        render();
      }
    }, 250);
  }

  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('load', render); // catch late-loading images/content changing page height
  window.addEventListener('resize', scheduleRerenderIfWidthChanged);
})();
