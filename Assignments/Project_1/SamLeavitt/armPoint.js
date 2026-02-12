(function () {
  const viewBox = { w: 286.03, h: 301.53 };
  const pathEl = document.getElementById('outlinePath');
  const layer = document.getElementById('pointsLayer');
  const hint = document.getElementById('hint');
  const stageInner = document.querySelector('.stage-inner');

  const totalLength = pathEl.getTotalLength();
  const numPoints = 1200;
  const pathPoints = [];
  for (let i = 0; i < numPoints; i++) {
    const t = (i / (numPoints - 1)) * totalLength;
    const pt = pathEl.getPointAtLength(t);
    pathPoints.push({ x: pt.x, y: pt.y });
  }

  const stageWidth = () => stageInner.offsetWidth;
  const stageHeight = () => stageInner.offsetHeight;

  function svgToStage(x, y) {
    const w = stageWidth();
    const h = stageHeight();
    const scale = Math.min(w / viewBox.w, h / viewBox.h);
    const ox = (w - viewBox.w * scale) / 2;
    const oy = (h - viewBox.h * scale) / 2;
    return {
      x: ox + x * scale,
      y: oy + y * scale
    };
  }

  const points = [];
  for (let i = 0; i < pathPoints.length; i++) {
    const target = pathPoints[i];
    const start = svgToStage(
      Math.random() * viewBox.w,
      Math.random() * viewBox.h
    );
    const end = svgToStage(target.x, target.y);
    const el = document.createElement('div');
    el.className = 'point';
    layer.appendChild(el);
    const delay = Math.random() * 0.25;
    points.push({ el, start, end, delay });
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function getScrollProgress() {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return 1;
    return Math.min(1, Math.max(0, scrollTop / scrollHeight));
  }

  function updatePositions() {
    const raw = getScrollProgress();
    const p = easeOutCubic(raw);
    const w = stageWidth();
    const h = stageHeight();
    points.forEach(({ el, start, end, delay }) => {
      const q = Math.max(0, Math.min(1, (p - delay) / (1 - delay)));
      const x = start.x + (end.x - start.x) * q;
      const y = start.y + (end.y - start.y) * q;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    });
    if (p > 0.85) hint.classList.add('faded');
    else hint.classList.remove('faded');
  }

  window.addEventListener('scroll', updatePositions, { passive: true });
  window.addEventListener('resize', updatePositions);
  updatePositions();
})();
