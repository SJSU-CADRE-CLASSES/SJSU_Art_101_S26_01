/**
 * Chart UI: legend popup, hover tooltips, card expand/collapse, and init.
 */

import { EXERCISES } from './workoutData.js';
import {
  redrawAll,
  runLineTransition,
  getBarChartLayout,
  getScatterChartPoints,
  getCurrentLineExercise,
  setCurrentLineExercise
} from './chartDraw.js';

const HOVER_RADIUS_SCATTER = 24;
let storedExpandRect = null;

function setupLegendPopup() {
  const btn = document.getElementById('chartLegendBtn');
  const popup = document.getElementById('chartLegendPopup');
  const closeBtn = document.getElementById('chartLegendPopupClose');
  if (!btn || !popup) return;
  const close = () => {
    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');
  };
  btn.addEventListener('click', () => {
    popup.classList.add('is-open');
    popup.setAttribute('aria-hidden', 'false');
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  popup.addEventListener('click', e => { if (e.target === popup) close(); });
}

function setupTooltips() {
  const tooltipEl = document.getElementById('chartTooltip');
  if (!tooltipEl) return;

  function show(text, clientX, clientY) {
    tooltipEl.textContent = text;
    tooltipEl.classList.add('is-visible');
    let left = clientX + 12;
    let top = clientY + 12;
    const rect = tooltipEl.getBoundingClientRect();
    if (left + rect.width > window.innerWidth) left = clientX - rect.width - 8;
    if (top + rect.height > window.innerHeight) top = clientY - rect.height - 8;
    tooltipEl.style.left = Math.max(8, left) + 'px';
    tooltipEl.style.top = Math.max(8, top) + 'px';
  }
  function hide() {
    tooltipEl.classList.remove('is-visible');
  }

  const barEl = document.getElementById('barChart');
  if (barEl) {
    barEl.addEventListener('mousemove', e => {
      const layout = getBarChartLayout();
      if (!layout?.data?.length) { hide(); return; }
      const rect = barEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const { pad, gw, gh, data } = layout;
      if (x < pad.l || x > pad.l + gw || y < pad.t || y > pad.t + gh) { hide(); return; }
      const n = data.length;
      const i = Math.max(0, Math.min(n - 1, Math.floor((x - pad.l) / (gw / n))));
      const d = data[i];
      show(d.label + ': ' + Math.round(d.workoutsPerWeek * 4) + ' workouts this period, ' + d.workoutsPerWeek + ' per week; strength ' + d.strengthIncreasePct + '%', e.clientX, e.clientY);
    });
    barEl.addEventListener('mouseleave', hide);
  }

  const scatterEl = document.getElementById('scatterChart');
  if (scatterEl) {
    scatterEl.addEventListener('mousemove', e => {
      const rect = scatterEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const points = getScatterChartPoints();
      let nearest = null;
      let minDist = HOVER_RADIUS_SCATTER;
      points.forEach(p => {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < minDist) { minDist = d; nearest = p; }
      });
      nearest ? show(nearest.name, e.clientX, e.clientY) : hide();
    });
    scatterEl.addEventListener('mouseleave', hide);
  }
}

function setExpandRect(card) {
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--expand-start-left', rect.left + 'px');
  card.style.setProperty('--expand-start-top', rect.top + 'px');
  card.style.setProperty('--expand-start-width', rect.width + 'px');
  card.style.setProperty('--expand-start-height', rect.height + 'px');
  card.style.setProperty('--chart-fixed-size', rect.width + 'px');
  storedExpandRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function setExpandFullSize(card) {
  const pad = 24;
  const endWidth = window.innerWidth - pad * 2;
  const startTop = card.style.getPropertyValue('--expand-start-top') || '0';
  const startHeight = card.style.getPropertyValue('--expand-start-height') || '200px';
  card.style.setProperty('--expand-end-left', pad + 'px');
  card.style.setProperty('--expand-end-top', startTop);
  card.style.setProperty('--expand-end-width', endWidth + 'px');
  card.style.setProperty('--expand-end-height', startHeight);
  card.style.setProperty('--expand-full-width', endWidth + 'px');
  card.style.setProperty('--expand-full-height', startHeight);
}

function setupExpandCollapse(chartsEl) {
  chartsEl.addEventListener('click', e => {
    if (e.target.closest('.chart-select')) return;
    const card = e.target.closest('.chart-card');
    if (!card) return;

    if (e.target.closest('.chart-close')) {
      e.preventDefault();
      e.stopPropagation();
      card.classList.add('closing');
      card.classList.remove('expand-done');
      const titleEl = card.querySelector('.chart-title');
      const wrapperEl = card.querySelector('.chart-wrapper');
      const explanationEl = card.querySelector('.chart-explanation');
      const { left: leftPx, top: topPx, width: wPx, height: hPx } = storedExpandRect || {};
      if (!storedExpandRect) {
        card.classList.remove('expanded', 'closing', 'expand-from-left', 'expand-from-center', 'expand-from-right', 'expand-done');
        chartsEl.classList.remove('charts-has-expanded');
        return;
      }
      const rightInset = window.innerWidth - leftPx - wPx;
      const bottomInset = window.innerHeight - topPx - hPx;
      const clipInset = topPx + 'px ' + rightInset + 'px ' + bottomInset + 'px ' + leftPx + 'px';

      const pinFixed = (el, rect) => {
        if (!el || !rect) return;
        el.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;margin:0;box-sizing:border-box';
      };
      const unpin = el => {
        if (!el) return;
        ['position', 'left', 'top', 'width', 'height', 'margin', 'box-sizing'].forEach(prop => el.style.removeProperty(prop));
      };
      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        card.style.removeProperty('clip-path');
        card.querySelectorAll('.chart-close-curtain').forEach(n => n.remove());
        unpin(titleEl);
        unpin(wrapperEl);
        unpin(explanationEl);
        card.style.removeProperty('--title-center-x');
        card.style.removeProperty('--title-top');
        card.classList.remove('expanded', 'closing', 'expand-from-left', 'expand-from-center', 'expand-from-right', 'expand-done');
        chartsEl.classList.remove('charts-has-expanded');
      };

      const titleRect = titleEl.getBoundingClientRect();
      const isCenter = card.classList.contains('expand-from-center');
      pinFixed(titleEl, titleRect);
      if (!isCenter) {
        pinFixed(wrapperEl, wrapperEl.getBoundingClientRect());
        pinFixed(explanationEl, explanationEl.getBoundingClientRect());
      }
      const curtainLeft = isCenter ? (() => { const d = document.createElement('div'); d.className = 'chart-close-curtain chart-close-curtain-left'; card.appendChild(d); return d; })() : null;
      const curtainRight = isCenter ? (() => { const d = document.createElement('div'); d.className = 'chart-close-curtain chart-close-curtain-right'; card.appendChild(d); return d; })() : null;
      const curtainTop = isCenter ? (() => { const d = document.createElement('div'); d.className = 'chart-close-curtain chart-close-curtain-top'; card.appendChild(d); return d; })() : null;
      const curtainBottom = isCenter ? (() => { const d = document.createElement('div'); d.className = 'chart-close-curtain chart-close-curtain-bottom'; card.appendChild(d); return d; })() : null;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isCenter) {
            if (curtainLeft) curtainLeft.style.width = leftPx + 'px';
            if (curtainRight) curtainRight.style.width = rightInset + 'px';
            if (curtainTop) curtainTop.style.height = topPx + 'px';
            if (curtainBottom) curtainBottom.style.height = bottomInset + 'px';
          } else {
            card.style.clipPath = 'inset(' + clipInset + ')';
            titleEl.style.left = (leftPx + (wPx - titleRect.width) / 2) + 'px';
            titleEl.style.top = (topPx + 12) + 'px';
          }
          setTimeout(cleanup, 460);
        });
      });
      return;
    }

    if (card.classList.contains('expanded')) return;
    const cards = chartsEl.querySelectorAll('.chart-card');
    cards.forEach(c => {
      c.classList.remove('expanded', 'closing', 'expand-from-left', 'expand-from-center', 'expand-from-right', 'expand-done');
      c.style.removeProperty('left');
      c.style.removeProperty('top');
      c.style.removeProperty('width');
      c.style.removeProperty('height');
    });

    setExpandRect(card);
    const index = Array.prototype.indexOf.call(cards, card);
    card.classList.add('expanded');
    if (index === 0) card.classList.add('expand-from-left');
    else if (index === 1) {
      card.classList.add('expand-from-center');
      card.style.setProperty('--title-center-x', (chartsEl.getBoundingClientRect().left + chartsEl.getBoundingClientRect().width / 2) + 'px');
      card.style.setProperty('--title-top', (chartsEl.getBoundingClientRect().top + 8) + 'px');
    } else card.classList.add('expand-from-right');

    chartsEl.classList.add('charts-has-expanded');
    chartsEl.offsetHeight;
    setExpandFullSize(card);
    if (index === 1) {
      const startTop = card.style.getPropertyValue('--expand-start-top') || '0';
      card.style.setProperty('--title-center-x', (window.innerWidth / 2) + 'px');
      card.style.setProperty('--title-top', 'calc(' + startTop + ' + 8px)');
    }
    card.addEventListener('animationend', function onDone(ev) {
      if (ev.target !== card || ev.animationName !== 'chart-panel-expand') return;
      card.removeEventListener('animationend', onDone);
      card.classList.add('expand-done');
    });
    setTimeout(redrawAll, 50);
  });
}

export function init() {
  const lineSelect = document.getElementById('lineChartSelect');
  const lineExercises = EXERCISES.filter(e => e.useWeight);
  if (lineSelect) {
    lineExercises.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.name;
      opt.textContent = e.name;
      if (e.name === getCurrentLineExercise()) opt.selected = true;
      lineSelect.appendChild(opt);
    });
    lineSelect.addEventListener('change', runLineTransition);
  }

  redrawAll();
  ['barChart', 'lineChart', 'scatterChart'].forEach(id => {
    const el = document.getElementById(id);
    if (el) new ResizeObserver(redrawAll).observe(el);
  });

  setupLegendPopup();
  setupTooltips();

  const chartsEl = document.getElementById('charts');
  if (chartsEl) setupExpandCollapse(chartsEl);

  window.addEventListener('resize', redrawAll);
  window.addEventListener('scroll', () => {
    const sh = document.documentElement.scrollHeight - window.innerHeight;
    if (sh > 0 && window.scrollY / sh > 0.88) redrawAll();
  }, { passive: true });
}
