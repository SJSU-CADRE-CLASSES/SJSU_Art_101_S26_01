(function () {
  const colors = [
    [255, 50, 50],
    [255, 140, 0],
    [255, 220, 0],
    [50, 255, 80],
    [50, 150, 255],
    [180, 80, 255]
  ];

  // Bar chart: exercise type vs weekly frequency (made-up data)
  const barData = [4.2, 3.8, 2.1, 3.5, 5.0, 2.8];
  const barLabels = ['Strength', 'Cardio', 'Flex', 'Balance', 'Endurance', 'Recovery'];

  function drawBarChart() {
    const el = document.getElementById('barChart');
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    el.innerHTML = '';
    el.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const max = Math.max(...barData);
    const barW = (w - 40) / barData.length - 8;
    const pad = 4;

    barData.forEach((v, i) => {
      const x = 20 + i * (barW + pad + 8) + pad;
      const barH = (v / max) * (h - 20);
      const y = h - 10 - barH;
      ctx.fillStyle = 'rgba(' + colors[i].join(',') + ',0.85)';
      ctx.fillRect(x, y, barW, barH);
    });
  }

  // Line chart: progress over 12 weeks (made-up data)
  const lineData = [20, 35, 45, 55, 60, 72, 78, 85, 88, 92, 95, 100];

  function drawLineChart() {
    const el = document.getElementById('lineChart');
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    el.innerHTML = '';
    el.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { l: 10, r: 10, t: 10, b: 10 };
    const gw = w - pad.l - pad.r;
    const gh = h - pad.t - pad.b;
    const max = Math.max(...lineData);
    const min = Math.min(...lineData);

    ctx.strokeStyle = 'rgba(50, 150, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    lineData.forEach((v, i) => {
      const x = pad.l + (i / (lineData.length - 1)) * gw;
      const y = pad.t + gh - ((v - min) / (max - min)) * gh;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    lineData.forEach((v, i) => {
      const x = pad.l + (i / (lineData.length - 1)) * gw;
      const y = pad.t + gh - ((v - min) / (max - min)) * gh;
      ctx.fillStyle = 'rgba(50, 150, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Scatter: intensity vs duration (made-up data)
  const scatterData = [
    [0.2, 45], [0.3, 38], [0.4, 52], [0.5, 35], [0.6, 28], [0.7, 22], [0.8, 18],
    [0.3, 55], [0.5, 48], [0.6, 42], [0.7, 35], [0.8, 30], [0.9, 15],
    [0.4, 40], [0.6, 32], [0.7, 25], [0.8, 20], [0.85, 12]
  ];

  function drawScatterChart() {
    const el = document.getElementById('scatterChart');
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    el.innerHTML = '';
    el.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { l: 15, r: 10, t: 10, b: 15 };
    const gw = w - pad.l - pad.r;
    const gh = h - pad.t - pad.b;

    const intMin = 0.2, intMax = 0.95;
    const durMin = 10, durMax = 60;

    scatterData.forEach(([intensity, duration], i) => {
      const x = pad.l + ((intensity - intMin) / (intMax - intMin)) * gw;
      const y = pad.t + gh - ((duration - durMin) / (durMax - durMin)) * gh;
      const ci = i % colors.length;
      ctx.fillStyle = 'rgba(' + colors[ci].join(',') + ',0.8)';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function init() {
    drawBarChart();
    drawLineChart();
    drawScatterChart();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('resize', function () {
    drawBarChart();
    drawLineChart();
    drawScatterChart();
  });
})();
