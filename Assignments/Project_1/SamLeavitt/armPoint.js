(function () {
  const viewBox = { w: 286.03, h: 301.53 };
  const pathEl = document.getElementById('outlinePath');
  const layer = document.getElementById('pointsLayer');
  const hint = document.getElementById('hint');
  const numPoints = 500;

  const totalLength = pathEl.getTotalLength();
  const pathX = [];
  const pathY = [];
  for (let i = 0; i < numPoints; i++) {
    const pt = pathEl.getPointAtLength((i / (numPoints - 1)) * totalLength);
    pathX.push(pt.x);
    pathY.push(pt.y);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  layer.innerHTML = '';
  layer.appendChild(canvas);

  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const size = 2 + Math.random() * 5;
    const largeStart = Math.random() < 0.2;
    const startSize = largeStart ? size * (2.5 + Math.random() * 2.5) : size;
    points.push({
      startX: Math.random(),
      startY: Math.random(),
      size: size,
      startSize: startSize,
      brightness: 0.35 + 0.65 * ((size - 2) / 5),
      appearAt: Math.random() * 0.70,
      delay: Math.random() * 0.12
    });
  }

  const color = [248, 210, 181];

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getScrollProgress() {
    const sh = document.documentElement.scrollHeight - window.innerHeight;
    return sh <= 0 ? 1 : Math.min(1, Math.max(0, window.scrollY / sh));
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function draw() {
    const raw = getScrollProgress();
    const moveRaw = Math.max(0, Math.min(1, (raw - 0.78) / 0.17));
    const p = easeOutCubic(moveRaw);
    const w = window.innerWidth;
    const h = window.innerHeight;

    const scale = Math.min(w / viewBox.w, h / viewBox.h);
    const ox = (w - viewBox.w * scale) / 2;
    const oy = (h - viewBox.h * scale) / 2;

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < numPoints; i++) {
      const pt = points[i];
      const visible = raw >= pt.appearAt ? Math.min(1, (raw - pt.appearAt) / 0.15) : 0;
      if (visible <= 0) continue;

      const q = Math.max(0, Math.min(1, (p - pt.delay) / (1 - pt.delay)));
      const ex = ox + pathX[i] * scale;
      const ey = oy + pathY[i] * scale;
      const x = pt.startX * w + (ex - pt.startX * w) * q;
      const y = pt.startY * h + (ey - pt.startY * h) * q;

      const drawSize = pt.startSize + (pt.size - pt.startSize) * q;
      const alpha = visible * pt.brightness;
      ctx.beginPath();
      ctx.arc(x, y, drawSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(248,210,181,' + alpha + ')';
      ctx.fill();
    }

    hint.classList.toggle('faded', p > 0.85);
  }

  let raf = null;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = null;
      draw();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    resize();
    draw();
  });
  resize();
  draw();
})();
