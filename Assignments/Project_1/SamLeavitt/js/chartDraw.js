/**
 * Chart drawing: bar, line, and scatter. Uses data layer + labels layer for pixelation.
 */

import {
  EXERCISES,
  workoutsVsStrength,
  oneRMByExercise,
  exercisesByFreq
} from './workoutData.js';

const CHART_COLORS = [
  [255, 50, 50],
  [255, 140, 0],
  [255, 220, 0],
  [50, 255, 80],
  [50, 150, 255],
  [180, 80, 255]
];

const LINE_TRANSITION_MS = 500;
const FONT = '10px "VCR OSD Mono", monospace';

let barChartLayout = null;
let scatterChartPoints = [];
let currentLineExercise = EXERCISES.filter(e => e.useWeight)[0].name;
let lineTransitionFrom = null;
let lineTransitionTo = null;
let lineTransitionStart = 0;

export function getBarChartLayout() {
  return barChartLayout;
}

export function getScatterChartPoints() {
  return scatterChartPoints;
}

export function getCurrentLineExercise() {
  return currentLineExercise;
}

export function setCurrentLineExercise(name) {
  currentLineExercise = name;
}

export function ensureChartLayers(container) {
  [].slice.call(container.children).forEach(child => {
    if (child.tagName === 'CANVAS') child.remove();
  });
  if (!container.querySelector('.chart-data')) {
    const dataWrap = document.createElement('div');
    dataWrap.className = 'chart-data';
    const labelWrap = document.createElement('div');
    labelWrap.className = 'chart-labels';
    container.appendChild(dataWrap);
    container.appendChild(labelWrap);
  }
  let dataCanvas = container.querySelector('.chart-data canvas');
  let labelCanvas = container.querySelector('.chart-labels canvas');
  if (!dataCanvas) {
    dataCanvas = document.createElement('canvas');
    container.querySelector('.chart-data').appendChild(dataCanvas);
  }
  if (!labelCanvas) {
    labelCanvas = document.createElement('canvas');
    container.querySelector('.chart-labels').appendChild(labelCanvas);
  }
  return { dataCanvas, labelCanvas };
}

function setupCanvas(ctx, dpr) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function valueAtPosition(points, p) {
  if (!points.length) return 0;
  if (points.length === 1 || p <= 0) return points[0];
  if (p >= 1) return points[points.length - 1];
  const i = p * (points.length - 1);
  const i0 = Math.floor(i);
  const i1 = Math.min(i0 + 1, points.length - 1);
  return points[i0] + (points[i1] - points[i0]) * (i - i0);
}

function getLineDataForExercise(name) {
  const arr = oneRMByExercise[name] || [];
  if (!arr.length) return { points: [], min: 0, max: 100 };
  const points = arr.map(x => x.oneRM);
  return {
    points,
    min: Math.min(...points),
    max: Math.max(...points)
  };
}

export function drawBarChart() {
  const el = document.getElementById('barChart');
  if (!el) return;
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (w <= 0 || h <= 0) return;
  const dpr = window.devicePixelRatio || 1;
  const { dataCanvas, labelCanvas } = ensureChartLayers(el);
  dataCanvas.width = w * dpr;
  dataCanvas.height = h * dpr;
  labelCanvas.width = w * dpr;
  labelCanvas.height = h * dpr;
  const dataCtx = dataCanvas.getContext('2d');
  const labelCtx = labelCanvas.getContext('2d');
  setupCanvas(dataCtx, dpr);
  setupCanvas(labelCtx, dpr);

  const pad = { l: 36, r: 36, t: 18, b: 28 };
  const data = workoutsVsStrength.slice(-12);
  const maxWpw = Math.max(2, ...data.map(d => d.workoutsPerWeek));
  const maxPct = Math.max(5, ...data.map(d => d.strengthIncreasePct));
  const gw = w - pad.l - pad.r;
  const gh = h - pad.t - pad.b;
  const barW = gw / data.length / 2 - 4;
  const barPad = 4;
  const yBase = pad.t + gh;

  data.forEach((d, i) => {
    const x0 = pad.l + i * (gw / data.length) + barPad;
    dataCtx.fillStyle = 'rgba(50, 150, 255, 0.85)';
    dataCtx.fillRect(x0, yBase - (d.workoutsPerWeek / maxWpw) * gh, barW, (d.workoutsPerWeek / maxWpw) * gh);
    dataCtx.fillStyle = 'rgba(50, 255, 80, 0.85)';
    dataCtx.fillRect(x0 + barW + barPad, yBase - (Math.max(0, d.strengthIncreasePct) / maxPct) * gh, barW, (Math.max(0, d.strengthIncreasePct) / maxPct) * gh);
  });

  labelCtx.strokeStyle = 'rgba(50, 205, 50, 0.5)';
  labelCtx.fillStyle = '#e0e0e0';
  labelCtx.font = FONT;
  labelCtx.textAlign = 'right';
  labelCtx.textBaseline = 'middle';
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + gh - (i / 5) * gh;
    labelCtx.beginPath();
    labelCtx.moveTo(pad.l, y);
    labelCtx.lineTo(pad.l + gw, y);
    labelCtx.stroke();
    labelCtx.fillText((i / 5 * maxWpw).toFixed(1), pad.l - 6, y);
  }
  labelCtx.textAlign = 'left';
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + gh - (i / 5) * gh;
    labelCtx.fillText(Math.round(i / 5 * maxPct) + '%', pad.l + gw + 6, y);
  }
  labelCtx.textAlign = 'center';
  labelCtx.textBaseline = 'top';
  data.forEach((d, i) => {
    labelCtx.fillText(d.label, pad.l + (i + 0.5) * (gw / data.length), pad.t + gh + 6);
  });
  labelCtx.textAlign = 'right';
  labelCtx.fillText('Workouts/wk', pad.l - 4, pad.t - 4);
  labelCtx.textAlign = 'left';
  labelCtx.fillText('Strength %', pad.l + gw + 4, pad.t - 4);

  barChartLayout = { pad, gw, gh, w, h, data };
}

export function drawLineChart(now) {
  const el = document.getElementById('lineChart');
  if (!el) return;
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (w <= 0 || h <= 0) return;
  const dpr = window.devicePixelRatio || 1;
  const { dataCanvas, labelCanvas } = ensureChartLayers(el);
  dataCanvas.width = w * dpr;
  dataCanvas.height = h * dpr;
  labelCanvas.width = w * dpr;
  labelCanvas.height = h * dpr;
  const dataCtx = dataCanvas.getContext('2d');
  const labelCtx = labelCanvas.getContext('2d');
  setupCanvas(dataCtx, dpr);
  setupCanvas(labelCtx, dpr);

  const pad = { l: 38, r: 12, t: 14, b: 24 };
  const gw = w - pad.l - pad.r;
  const gh = h - pad.t - pad.b;

  let data = getLineDataForExercise(currentLineExercise);
  let pointOpacities = null;

  if (lineTransitionFrom?.points.length && lineTransitionTo?.points.length && now != null) {
    const elapsed = now - lineTransitionStart;
    if (elapsed < LINE_TRANSITION_MS) {
      const t = (elapsed / LINE_TRANSITION_MS) ** 2 * (3 - 2 * elapsed / LINE_TRANSITION_MS);
      const na = lineTransitionFrom.points.length;
      const nb = lineTransitionTo.points.length;
      const n = Math.max(na, nb, 2);
      const a = lineTransitionFrom.points;
      const b = lineTransitionTo.points;
      const blended = [];
      pointOpacities = [];
      for (let i = 0; i < n; i++) {
        const p = n > 1 ? i / (n - 1) : 0;
        blended.push(valueAtPosition(a, p) + (valueAtPosition(b, p) - valueAtPosition(a, p)) * t);
        pointOpacities.push(na < nb && i >= na ? t : na > nb && i >= nb ? 1 - t : 1);
      }
      data = {
        points: blended,
        min: Math.min(...blended),
        max: Math.max(...blended) || 1
      };
    } else {
      lineTransitionFrom = null;
      lineTransitionTo = null;
    }
  }

  if (!data.points.length) return;
  const minVal = data.min;
  const maxVal = data.max || 1;
  const range = maxVal - minVal || 1;

  labelCtx.strokeStyle = 'rgba(50, 205, 50, 0.4)';
  labelCtx.lineWidth = 1;
  labelCtx.fillStyle = '#e0e0e0';
  labelCtx.font = FONT;
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + gh - (i / 5) * gh;
    labelCtx.beginPath();
    labelCtx.moveTo(pad.l, y);
    labelCtx.lineTo(pad.l + gw, y);
    labelCtx.stroke();
  }
  for (let i = 0; i <= 4; i++) {
    const x = pad.l + (i / 4) * gw;
    labelCtx.beginPath();
    labelCtx.moveTo(x, pad.t);
    labelCtx.lineTo(x, pad.t + gh);
    labelCtx.stroke();
  }
  labelCtx.textAlign = 'right';
  labelCtx.textBaseline = 'middle';
  for (let i = 0; i <= 5; i++) {
    const v = minVal + (i / 5) * range;
    const y = pad.t + gh - (i / 5) * gh;
    labelCtx.fillText(v.toFixed(0), pad.l - 6, y);
  }
  labelCtx.textAlign = 'center';
  labelCtx.textBaseline = 'top';
  for (let i = 0; i <= 4; i++) {
    const session = data.points.length > 1 ? Math.round((i / 4) * (data.points.length - 1)) : 0;
    labelCtx.fillText(String(session), pad.l + (i / 4) * gw, pad.t + gh + 4);
  }
  labelCtx.fillText('Session', pad.l + gw / 2, pad.t + gh + 16);
  labelCtx.textAlign = 'right';
  labelCtx.fillText('1RM (lb)', pad.l - 6, pad.t + gh / 2);

  dataCtx.strokeStyle = 'rgba(50, 150, 255, 0.9)';
  dataCtx.lineWidth = 2;
  dataCtx.lineJoin = 'round';
  dataCtx.lineCap = 'round';
  dataCtx.beginPath();
  data.points.forEach((v, i) => {
    const x = pad.l + (data.points.length > 1 ? i / (data.points.length - 1) : 0) * gw;
    const y = pad.t + gh - ((v - minVal) / range) * gh;
    if (i === 0) dataCtx.moveTo(x, y);
    else dataCtx.lineTo(x, y);
  });
  dataCtx.stroke();
  data.points.forEach((v, i) => {
    const x = pad.l + (data.points.length > 1 ? i / (data.points.length - 1) : 0) * gw;
    const y = pad.t + gh - ((v - minVal) / range) * gh;
    dataCtx.globalAlpha = pointOpacities?.[i] ?? 1;
    dataCtx.fillStyle = 'rgba(50, 150, 255, 0.9)';
    dataCtx.beginPath();
    dataCtx.arc(x, y, 5, 0, Math.PI * 2);
    dataCtx.fill();
  });
  dataCtx.globalAlpha = 1;
}

export function runLineTransition() {
  const select = document.getElementById('lineChartSelect');
  const nextExercise = select?.value ?? currentLineExercise;
  if (nextExercise === currentLineExercise) return;
  lineTransitionFrom = getLineDataForExercise(currentLineExercise);
  lineTransitionTo = getLineDataForExercise(nextExercise);
  if (lineTransitionFrom.points.length && lineTransitionTo.points.length) {
    currentLineExercise = nextExercise;
    lineTransitionStart = performance.now();
    function frame(now) {
      drawLineChart(now);
      if (lineTransitionFrom && lineTransitionTo && (now - lineTransitionStart) < LINE_TRANSITION_MS + 80) {
        requestAnimationFrame(frame);
      }
    }
    requestAnimationFrame(frame);
  } else {
    currentLineExercise = nextExercise;
    drawLineChart();
  }
}

export function drawScatterChart() {
  const el = document.getElementById('scatterChart');
  if (!el) return;
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (w <= 0 || h <= 0) return;
  const dpr = window.devicePixelRatio || 1;
  const { dataCanvas, labelCanvas } = ensureChartLayers(el);
  dataCanvas.width = w * dpr;
  dataCanvas.height = h * dpr;
  labelCanvas.width = w * dpr;
  labelCanvas.height = h * dpr;
  const dataCtx = dataCanvas.getContext('2d');
  const labelCtx = labelCanvas.getContext('2d');
  setupCanvas(dataCtx, dpr);
  setupCanvas(labelCtx, dpr);

  const pad = { l: 40, r: 14, t: 14, b: 28 };
  const gw = w - pad.l - pad.r;
  const gh = h - pad.t - pad.b;
  const freqMax = Math.max(1, ...exercisesByFreq.map(d => d.frequency));
  const rmMax = Math.max(1, ...exercisesByFreq.map(d => d.max1RM));

  exercisesByFreq.forEach((d, i) => {
    const x = pad.l + (d.frequency / freqMax) * gw;
    const y = pad.t + gh - (d.max1RM / rmMax) * gh;
    dataCtx.fillStyle = 'rgba(' + CHART_COLORS[i % CHART_COLORS.length].join(',') + ',0.85)';
    dataCtx.beginPath();
    dataCtx.arc(x, y, 7, 0, Math.PI * 2);
    dataCtx.fill();
  });

  labelCtx.strokeStyle = 'rgba(50, 205, 50, 0.4)';
  labelCtx.lineWidth = 1;
  labelCtx.fillStyle = '#e0e0e0';
  labelCtx.font = FONT;
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + gh - (i / 5) * gh;
    labelCtx.beginPath();
    labelCtx.moveTo(pad.l, y);
    labelCtx.lineTo(pad.l + gw, y);
    labelCtx.stroke();
  }
  for (let i = 0; i <= 5; i++) {
    const x = pad.l + (i / 5) * gw;
    labelCtx.beginPath();
    labelCtx.moveTo(x, pad.t);
    labelCtx.lineTo(x, pad.t + gh);
    labelCtx.stroke();
  }
  labelCtx.textAlign = 'right';
  labelCtx.textBaseline = 'middle';
  for (let i = 0; i <= 5; i++) {
    labelCtx.fillText(String(Math.round((i / 5) * rmMax)), pad.l - 6, pad.t + gh - (i / 5) * gh);
  }
  labelCtx.textAlign = 'center';
  labelCtx.textBaseline = 'top';
  for (let i = 0; i <= 5; i++) {
    labelCtx.fillText(String(Math.round((i / 5) * freqMax)), pad.l + (i / 5) * gw, pad.t + gh + 4);
  }
  labelCtx.fillText('Frequency (sessions)', pad.l + gw / 2, pad.t + gh + 18);
  labelCtx.textAlign = 'right';
  labelCtx.fillText('Max 1RM (lb)', pad.l - 6, pad.t + gh / 2);

  scatterChartPoints = exercisesByFreq.map(d => ({
    x: pad.l + (d.frequency / freqMax) * gw,
    y: pad.t + gh - (d.max1RM / rmMax) * gh,
    name: d.name
  }));
}

export function redrawAll() {
  drawBarChart();
  drawLineChart();
  drawScatterChart();
}
