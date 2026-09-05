/* Hikaya by Maison Jaber — "Golden Line" background motif.
   A glowing gold thread that winds down the full height of the page with
   organic, non-repeating curves (echoing the brand's "Find the Golden
   Line" story theme). Include with:
   <script src="/golden-line.js" defer></script>
*/
(function () {
  function buildPath(totalHeight, centerX, maxAmplitude, vw) {
    let y = 0;
    let x = centerX;
    let d = `M${x.toFixed(1)},0 `;
    const minAmp = maxAmplitude * 0.3;
    const margin = 18;
    const clampX = (v) => Math.max(margin, Math.min(vw - margin, v));

    while (y < totalHeight) {
      const makeLoop = Math.random() < 0.35; // some segments curl into a loop, not just sway

      if (makeLoop) {
        // Swing out wide, then curl back — a hand-drawn loop-de-loop, not a simple wave
        const segH = 220 + Math.random() * 200;
        const nextY = Math.min(y + segH, totalHeight);
        const dir = Math.random() < 0.5 ? -1 : 1;
        const loopAmp = maxAmplitude * (0.7 + Math.random() * 0.5);
        const loopX = clampX(x + dir * loopAmp);
        const midY = y + segH * (0.45 + Math.random() * 0.1);

        const cp1x = clampX(x + dir * loopAmp * 0.95);
        const cp1y = y + segH * 0.1;
        const cp2x = clampX(loopX + dir * loopAmp * 0.1);
        const cp2y = y + segH * 0.3;
        d += `C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${loopX.toFixed(1)},${midY.toFixed(1)} `;

        const returnX = clampX(x + dir * minAmp * (0.2 + Math.random() * 0.3));
        const cp3x = clampX(loopX - dir * loopAmp * 0.5);
        const cp3y = y + segH * 0.68;
        const cp4x = clampX(returnX + dir * minAmp * 0.5);
        const cp4y = y + segH * 0.88;
        d += `C${cp3x.toFixed(1)},${cp3y.toFixed(1)} ${cp4x.toFixed(1)},${cp4y.toFixed(1)} ${returnX.toFixed(1)},${nextY.toFixed(1)} `;

        x = returnX;
        y = nextY;
      } else {
        // A freer sweep — amplitude, steepness, and length all vary a lot
        const segH = 130 + Math.random() * 260;
        const nextY = Math.min(y + segH, totalHeight);
        const amp = minAmp + Math.random() * (maxAmplitude - minAmp);
        const dir = Math.random() < 0.5 ? -1 : 1;
        const nextX = clampX(centerX + dir * amp);

        const cp1x = clampX(x + (Math.random() - 0.5) * maxAmplitude * 0.9);
        const cp1y = y + segH * (0.2 + Math.random() * 0.25);
        const cp2x = clampX(nextX + (Math.random() - 0.5) * maxAmplitude * 0.9);
        const cp2y = y + segH * (0.6 + Math.random() * 0.25);

        d += `C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${nextX.toFixed(1)},${nextY.toFixed(1)} `;
        x = nextX;
        y = nextY;
      }
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
