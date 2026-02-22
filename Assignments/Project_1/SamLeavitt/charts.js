/**
 * Charts: workout data, bar/line/scatter drawing, legend, tooltips, expand/collapse.
 * Single file (no modules) so it works with file:// and all browsers.
 */
(function () {
  'use strict';

  var EXERCISES = [
    { name: 'Flat Bench Press', useWeight: true, startWeight: 95 },
    { name: 'Cable Lateral Raise', useWeight: true, startWeight: 15 },
    { name: 'Cable Face Pull', useWeight: true, startWeight: 40 },
    { name: 'Machine Fly', useWeight: true, startWeight: 50 },
    { name: 'Parallel Bar Dips', useWeight: true, startWeight: 0 },
    { name: 'Pull Ups', useWeight: true, startWeight: 0 },
    { name: 'Seated Machine Row', useWeight: true, startWeight: 70 },
    { name: 'Preacher Curls', useWeight: true, startWeight: 45 },
    { name: '5-minute Ab Routine', useWeight: false, startWeight: 0 },
    { name: 'Barbell Squat', useWeight: true, startWeight: 135 },
    { name: 'Barbell Deadlift', useWeight: true, startWeight: 155 },
    { name: 'Hamstring Curls', useWeight: true, startWeight: 50 },
    { name: 'Leg Extensions', useWeight: true, startWeight: 60 },
    { name: 'Calf Raises', useWeight: true, startWeight: 100 }
  ];

  function epley1RM(weight, reps) {
    if (reps <= 0) return weight;
    return weight * (1 + reps / 30);
  }

  function buildWorkoutLog() {
    var log = [];
    var state = {};
    var exerciseNames = EXERCISES.filter(function (e) { return e.useWeight; }).map(function (e) { return e.name; });
    var ex, st, weekIndex, sessionsThisWeek, s, exName, date, i, count, need, lastDate;
    EXERCISES.forEach(function (ex) {
      if (!ex.useWeight) return;
      state[ex.name] = { reps: 9, weight: ex.startWeight || 45 };
    });
    var startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 14);
    var totalWeeks = 90;
    var minEntries = 5;
    var plateauWeeksLeft = 0;

    for (weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
      if (plateauWeeksLeft > 0) plateauWeeksLeft--;
      else if (Math.random() < 0.08) plateauWeeksLeft = 3 + Math.floor(Math.random() * 4);
      var inPlateau = plateauWeeksLeft > 0;
      sessionsThisWeek = inPlateau ? (Math.random() < 0.5 ? 0 : 1) : (Math.random() < 0.2 ? 0 : (Math.random() < 0.5 ? 1 : 2));
      for (s = 0; s < sessionsThisWeek; s++) {
        exName = exerciseNames[Math.floor(Math.random() * exerciseNames.length)];
        st = state[exName];
        if (!st) continue;
        date = new Date(startDate);
        date.setDate(date.getDate() + weekIndex * 7 + s * 3);
        log.push({ date: date.getTime(), exercise: exName, reps: st.reps, weight: st.weight });
        if (st.reps >= 12) { st.weight += Math.random() < 0.5 ? 5 : 10; st.reps = 9; }
        else st.reps += 1;
      }
    }
    lastDate = log.length ? Math.max.apply(null, log.map(function (r) { return r.date; })) : startDate.getTime();
    exerciseNames.forEach(function (exName) {
      count = log.filter(function (r) { return r.exercise === exName; }).length;
      if (count >= minEntries) return;
      st = state[exName];
      if (!st) return;
      for (i = count; i < minEntries; i++) {
        lastDate += 7 * 24 * 60 * 60 * 1000;
        log.push({ date: lastDate, exercise: exName, reps: st.reps, weight: st.weight });
        if (st.reps >= 12) { st.weight += Math.random() < 0.5 ? 5 : 10; st.reps = 9; }
        else st.reps += 1;
      }
    });
    log.sort(function (a, b) { return a.date - b.date; });
    return log;
  }

  var workoutLog = buildWorkoutLog();
  var periodMs = 4 * 7 * 24 * 60 * 60 * 1000;

  function getWorkoutsVsStrength() {
    var start = Math.min.apply(null, workoutLog.map(function (r) { return r.date; }));
    var end = Math.max.apply(null, workoutLog.map(function (r) { return r.date; }));
    var periods = [];
    var t = start;
    while (t < end) {
      var periodLog = workoutLog.filter(function (r) { return r.date >= t && r.date < t + periodMs; });
      var oneRMs = periodLog.map(function (r) { return epley1RM(r.weight, r.reps); });
      var avg1RM = oneRMs.length ? oneRMs.reduce(function (a, b) { return a + b; }, 0) / oneRMs.length : 0;
      periods.push({ label: 'M' + (periods.length + 1), workoutsPerWeek: Math.round((periodLog.length / 4) * 10) / 10, strengthIndex: Math.round(avg1RM) });
      t += periodMs;
    }
    var firstStrength = (periods[0] && periods[0].strengthIndex) ? periods[0].strengthIndex : 50;
    periods.forEach(function (p) {
      p.strengthIncreasePct = firstStrength > 0 ? Math.round(((p.strengthIndex - firstStrength) / firstStrength) * 100) : 0;
    });
    return periods;
  }

  function get1RMByExercise() {
    var byEx = {};
    EXERCISES.forEach(function (e) {
      if (!e.useWeight) return;
      byEx[e.name] = [];
    });
    workoutLog.forEach(function (r) {
      if (byEx[r.exercise]) {
        byEx[r.exercise].push({ sessionIndex: byEx[r.exercise].length, date: r.date, oneRM: Math.round(epley1RM(r.weight, r.reps) * 10) / 10, reps: r.reps, weight: r.weight });
      }
    });
    var flatBench = byEx['Flat Bench Press'];
    if (flatBench && flatBench.length) {
      var n = flatBench.length, startRM = 180, endRM = 225, idx, tt;
      for (idx = 0; idx < n; idx++) {
        tt = n > 1 ? idx / (n - 1) : 1;
        flatBench[idx].oneRM = Math.round((startRM + (endRM - startRM) * tt) * 10) / 10;
      }
    }
    return byEx;
  }

  function getExercisesByFrequency() {
    var byEx = get1RMByExercise();
    return Object.keys(byEx).map(function (name) {
      var arr = byEx[name];
      var max1RM = arr.length ? Math.max.apply(null, arr.map(function (x) { return x.oneRM; })) : 0;
      return { name: name, frequency: arr.length, max1RM: Math.round(max1RM * 10) / 10 };
    }).sort(function (a, b) { return a.frequency - b.frequency; });
  }

  var workoutsVsStrength = getWorkoutsVsStrength();
  var oneRMByExercise = get1RMByExercise();
  var exercisesByFreq = getExercisesByFrequency();

  var CHART_COLORS = [[255,50,50],[255,140,0],[255,220,0],[50,255,80],[50,150,255],[180,80,255]];
  var LINE_TRANSITION_MS = 500;
  var FONT = '10px "VCR OSD Mono", monospace';
  var barChartLayout = null;
  var scatterChartPoints = [];
  var currentLineExercise = EXERCISES.filter(function (e) { return e.useWeight; })[0].name;
  var lineTransitionFrom = null, lineTransitionTo = null, lineTransitionStart = 0;

  function ensureChartLayers(container) {
    [].slice.call(container.children).forEach(function (child) {
      if (child.tagName === 'CANVAS') child.remove();
    });
    if (!container.querySelector('.chart-data')) {
      var dataWrap = document.createElement('div');
      dataWrap.className = 'chart-data';
      var labelWrap = document.createElement('div');
      labelWrap.className = 'chart-labels';
      container.appendChild(dataWrap);
      container.appendChild(labelWrap);
    }
    var dataCanvas = container.querySelector('.chart-data canvas');
    var labelCanvas = container.querySelector('.chart-labels canvas');
    if (!dataCanvas) { dataCanvas = document.createElement('canvas'); container.querySelector('.chart-data').appendChild(dataCanvas); }
    if (!labelCanvas) { labelCanvas = document.createElement('canvas'); container.querySelector('.chart-labels').appendChild(labelCanvas); }
    return { dataCanvas: dataCanvas, labelCanvas: labelCanvas };
  }

  function valueAtPosition(points, p) {
    if (!points.length) return 0;
    if (points.length === 1 || p <= 0) return points[0];
    if (p >= 1) return points[points.length - 1];
    var i = p * (points.length - 1), i0 = Math.floor(i), i1 = Math.min(i0 + 1, points.length - 1);
    return points[i0] + (points[i1] - points[i0]) * (i - i0);
  }

  function getLineDataForExercise(name) {
    var arr = oneRMByExercise[name] || [];
    if (!arr.length) return { points: [], min: 0, max: 100 };
    var points = arr.map(function (x) { return x.oneRM; });
    return { points: points, min: Math.min.apply(null, points), max: Math.max.apply(null, points) };
  }

  function drawBarChart() {
    var el = document.getElementById('barChart');
    if (!el) return;
    var w = el.clientWidth, h = el.clientHeight;
    if (w <= 0 || h <= 0) return;
    var dpr = window.devicePixelRatio || 1;
    var layers = ensureChartLayers(el);
    layers.dataCanvas.width = w * dpr;
    layers.dataCanvas.height = h * dpr;
    layers.labelCanvas.width = w * dpr;
    layers.labelCanvas.height = h * dpr;
    var dataCtx = layers.dataCanvas.getContext('2d');
    var labelCtx = layers.labelCanvas.getContext('2d');
    dataCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    labelCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var pad = { l: 36, r: 36, t: 18, b: 28 };
    var data = workoutsVsStrength.slice(-12);
    var maxWpw = Math.max(2, Math.max.apply(null, data.map(function (d) { return d.workoutsPerWeek; })));
    var maxPct = Math.max(5, Math.max.apply(null, data.map(function (d) { return d.strengthIncreasePct; })));
    var gw = w - pad.l - pad.r, gh = h - pad.t - pad.b, barW = gw / data.length / 2 - 4, barPad = 4, yBase = pad.t + gh;
    data.forEach(function (d, i) {
      var x0 = pad.l + i * (gw / data.length) + barPad;
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
    for (var yi = 0; yi <= 5; yi++) {
      var y = pad.t + gh - (yi / 5) * gh;
      labelCtx.beginPath();
      labelCtx.moveTo(pad.l, y);
      labelCtx.lineTo(pad.l + gw, y);
      labelCtx.stroke();
      labelCtx.fillText((yi / 5 * maxWpw).toFixed(1), pad.l - 6, y);
    }
    labelCtx.textAlign = 'left';
    for (yi = 0; yi <= 5; yi++) { y = pad.t + gh - (yi / 5) * gh; labelCtx.fillText(Math.round(yi / 5 * maxPct) + '%', pad.l + gw + 6, y); }
    labelCtx.textAlign = 'center';
    labelCtx.textBaseline = 'top';
    data.forEach(function (d, i) { labelCtx.fillText(d.label, pad.l + (i + 0.5) * (gw / data.length), pad.t + gh + 6); });
    labelCtx.textAlign = 'right';
    labelCtx.fillText('Workouts/wk', pad.l - 4, pad.t - 4);
    labelCtx.textAlign = 'left';
    labelCtx.fillText('Strength %', pad.l + gw + 4, pad.t - 4);
    barChartLayout = { pad: pad, gw: gw, gh: gh, w: w, h: h, data: data };
  }

  function drawLineChart(now) {
    var el = document.getElementById('lineChart');
    if (!el) return;
    var w = el.clientWidth, h = el.clientHeight;
    if (w <= 0 || h <= 0) return;
    var dpr = window.devicePixelRatio || 1;
    var layers = ensureChartLayers(el);
    layers.dataCanvas.width = w * dpr;
    layers.dataCanvas.height = h * dpr;
    layers.labelCanvas.width = w * dpr;
    layers.labelCanvas.height = h * dpr;
    var dataCtx = layers.dataCanvas.getContext('2d');
    var labelCtx = layers.labelCanvas.getContext('2d');
    dataCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    labelCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var pad = { l: 38, r: 12, t: 14, b: 24 };
    var gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;
    var data = getLineDataForExercise(currentLineExercise);
    var pointOpacities = null;
    if (lineTransitionFrom && lineTransitionFrom.points.length && lineTransitionTo && lineTransitionTo.points.length && now != null) {
      var elapsed = now - lineTransitionStart;
      if (elapsed < LINE_TRANSITION_MS) {
        var t = (elapsed / LINE_TRANSITION_MS) * (elapsed / LINE_TRANSITION_MS) * (3 - 2 * elapsed / LINE_TRANSITION_MS);
        var na = lineTransitionFrom.points.length, nb = lineTransitionTo.points.length, n = Math.max(na, nb, 2);
        var a = lineTransitionFrom.points, b = lineTransitionTo.points, blended = [];
        pointOpacities = [];
        for (var i = 0; i < n; i++) {
          var p = n > 1 ? i / (n - 1) : 0;
          blended.push(valueAtPosition(a, p) + (valueAtPosition(b, p) - valueAtPosition(a, p)) * t);
          pointOpacities.push(na < nb && i >= na ? t : (na > nb && i >= nb ? 1 - t : 1));
        }
        data = { points: blended, min: Math.min.apply(null, blended), max: Math.max.apply(null, blended) || 1 };
      } else {
        lineTransitionFrom = null;
        lineTransitionTo = null;
      }
    }
    if (!data.points.length) return;
    var minVal = data.min, maxVal = data.max || 1, range = maxVal - minVal || 1;
    labelCtx.strokeStyle = 'rgba(50, 205, 50, 0.4)';
    labelCtx.lineWidth = 1;
    labelCtx.fillStyle = '#e0e0e0';
    labelCtx.font = FONT;
    var yi, y, xi, x;
    for (yi = 0; yi <= 5; yi++) { y = pad.t + gh - (yi / 5) * gh; labelCtx.beginPath(); labelCtx.moveTo(pad.l, y); labelCtx.lineTo(pad.l + gw, y); labelCtx.stroke(); }
    for (xi = 0; xi <= 4; xi++) { x = pad.l + (xi / 4) * gw; labelCtx.beginPath(); labelCtx.moveTo(x, pad.t); labelCtx.lineTo(x, pad.t + gh); labelCtx.stroke(); }
    labelCtx.textAlign = 'right';
    labelCtx.textBaseline = 'middle';
    for (yi = 0; yi <= 5; yi++) { y = pad.t + gh - (yi / 5) * gh; labelCtx.fillText((minVal + (yi / 5) * range).toFixed(0), pad.l - 6, y); }
    labelCtx.textAlign = 'center';
    labelCtx.textBaseline = 'top';
    for (xi = 0; xi <= 4; xi++) { labelCtx.fillText(String(data.points.length > 1 ? Math.round((xi / 4) * (data.points.length - 1)) : 0), pad.l + (xi / 4) * gw, pad.t + gh + 4); }
    labelCtx.fillText('Session', pad.l + gw / 2, pad.t + gh + 16);
    labelCtx.textAlign = 'right';
    labelCtx.fillText('1RM (lb)', pad.l - 6, pad.t + gh / 2);
    dataCtx.strokeStyle = 'rgba(50, 150, 255, 0.9)';
    dataCtx.lineWidth = 2;
    dataCtx.lineJoin = 'round';
    dataCtx.lineCap = 'round';
    dataCtx.beginPath();
    data.points.forEach(function (v, i) {
      var px = pad.l + (data.points.length > 1 ? i / (data.points.length - 1) : 0) * gw;
      var py = pad.t + gh - ((v - minVal) / range) * gh;
      if (i === 0) dataCtx.moveTo(px, py); else dataCtx.lineTo(px, py);
    });
    dataCtx.stroke();
    var px, py;
    data.points.forEach(function (v, i) {
      px = pad.l + (data.points.length > 1 ? i / (data.points.length - 1) : 0) * gw;
      py = pad.t + gh - ((v - minVal) / range) * gh;
      dataCtx.globalAlpha = (pointOpacities && pointOpacities[i] !== undefined) ? pointOpacities[i] : 1;
      dataCtx.fillStyle = 'rgba(50, 150, 255, 0.9)';
      dataCtx.beginPath();
      dataCtx.arc(px, py, 5, 0, Math.PI * 2);
      dataCtx.fill();
    });
    dataCtx.globalAlpha = 1;
  }

  function runLineTransition() {
    var select = document.getElementById('lineChartSelect');
    var nextExercise = select ? select.value : currentLineExercise;
    if (nextExercise === currentLineExercise) return;
    lineTransitionFrom = getLineDataForExercise(currentLineExercise);
    lineTransitionTo = getLineDataForExercise(nextExercise);
    if (lineTransitionFrom.points.length && lineTransitionTo.points.length) {
      currentLineExercise = nextExercise;
      lineTransitionStart = performance.now();
      function frame(now) {
        drawLineChart(now);
        if (lineTransitionFrom && lineTransitionTo && (now - lineTransitionStart) < LINE_TRANSITION_MS + 80) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    } else {
      currentLineExercise = nextExercise;
      drawLineChart();
    }
  }

  function drawScatterChart() {
    var el = document.getElementById('scatterChart');
    if (!el) return;
    var w = el.clientWidth, h = el.clientHeight;
    if (w <= 0 || h <= 0) return;
    var dpr = window.devicePixelRatio || 1;
    var layers = ensureChartLayers(el);
    layers.dataCanvas.width = w * dpr;
    layers.dataCanvas.height = h * dpr;
    layers.labelCanvas.width = w * dpr;
    layers.labelCanvas.height = h * dpr;
    var dataCtx = layers.dataCanvas.getContext('2d');
    var labelCtx = layers.labelCanvas.getContext('2d');
    dataCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    labelCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var pad = { l: 40, r: 14, t: 14, b: 28 };
    var gw = w - pad.l - pad.r;
    var gh = h - pad.t - pad.b;
    var freqMax = Math.max(1, Math.max.apply(null, exercisesByFreq.map(function (d) { return d.frequency; })));
    var rmMax = Math.max(1, Math.max.apply(null, exercisesByFreq.map(function (d) { return d.max1RM; })));
    exercisesByFreq.forEach(function (d, i) {
      var sx = pad.l + (d.frequency / freqMax) * gw;
      var sy = pad.t + gh - (d.max1RM / rmMax) * gh;
      dataCtx.fillStyle = 'rgba(' + CHART_COLORS[i % CHART_COLORS.length].join(',') + ',0.85)';
      dataCtx.beginPath();
      dataCtx.arc(sx, sy, 7, 0, Math.PI * 2);
      dataCtx.fill();
    });
    labelCtx.strokeStyle = 'rgba(50, 205, 50, 0.4)';
    labelCtx.lineWidth = 1;
    labelCtx.fillStyle = '#e0e0e0';
    labelCtx.font = FONT;
    var yi, y, xi, x;
    for (yi = 0; yi <= 5; yi++) { y = pad.t + gh - (yi / 5) * gh; labelCtx.beginPath(); labelCtx.moveTo(pad.l, y); labelCtx.lineTo(pad.l + gw, y); labelCtx.stroke(); }
    for (xi = 0; xi <= 5; xi++) { x = pad.l + (xi / 5) * gw; labelCtx.beginPath(); labelCtx.moveTo(x, pad.t); labelCtx.lineTo(x, pad.t + gh); labelCtx.stroke(); }
    labelCtx.textAlign = 'right';
    labelCtx.textBaseline = 'middle';
    for (yi = 0; yi <= 5; yi++) { labelCtx.fillText(String(Math.round((yi / 5) * rmMax)), pad.l - 6, pad.t + gh - (yi / 5) * gh); }
    labelCtx.textAlign = 'center';
    labelCtx.textBaseline = 'top';
    for (xi = 0; xi <= 5; xi++) { labelCtx.fillText(String(Math.round((xi / 5) * freqMax)), pad.l + (xi / 5) * gw, pad.t + gh + 4); }
    labelCtx.fillText('Frequency (sessions)', pad.l + gw / 2, pad.t + gh + 18);
    labelCtx.textAlign = 'right';
    labelCtx.fillText('Max 1RM (lb)', pad.l - 6, pad.t + gh / 2);
    scatterChartPoints = exercisesByFreq.map(function (d) {
      return { x: pad.l + (d.frequency / freqMax) * gw, y: pad.t + gh - (d.max1RM / rmMax) * gh, name: d.name };
    });
  }

  function redrawAll() {
    drawBarChart();
    drawLineChart();
    drawScatterChart();
  }

  var storedExpandRect = null;
  var HOVER_RADIUS_SCATTER = 24;

  function setupLegendPopup() {
    var btn = document.getElementById('chartLegendBtn');
    var popup = document.getElementById('chartLegendPopup');
    var closeBtn = document.getElementById('chartLegendPopupClose');
    if (!btn || !popup) return;
    function close() { popup.classList.remove('is-open'); popup.setAttribute('aria-hidden', 'true'); }
    btn.addEventListener('click', function () { popup.classList.add('is-open'); popup.setAttribute('aria-hidden', 'false'); });
    if (closeBtn) closeBtn.addEventListener('click', close);
    popup.addEventListener('click', function (e) { if (e.target === popup) close(); });
  }

  function setupTooltips() {
    var tooltipEl = document.getElementById('chartTooltip');
    if (!tooltipEl) return;
    function show(text, clientX, clientY) {
      tooltipEl.textContent = text;
      tooltipEl.classList.add('is-visible');
      var left = clientX + 12, top = clientY + 12;
      var rect = tooltipEl.getBoundingClientRect();
      if (left + rect.width > window.innerWidth) left = clientX - rect.width - 8;
      if (top + rect.height > window.innerHeight) top = clientY - rect.height - 8;
      tooltipEl.style.left = Math.max(8, left) + 'px';
      tooltipEl.style.top = Math.max(8, top) + 'px';
    }
    function hide() { tooltipEl.classList.remove('is-visible'); }
    var barEl = document.getElementById('barChart');
    if (barEl) {
      barEl.addEventListener('mousemove', function (e) {
        var layout = barChartLayout;
        if (!layout || !layout.data.length) { hide(); return; }
        var rect = barEl.getBoundingClientRect();
        var mx = e.clientX - rect.left, my = e.clientY - rect.top;
        var pad = layout.pad, gw = layout.gw, gh = layout.gh, data = layout.data;
        if (mx < pad.l || mx > pad.l + gw || my < pad.t || my > pad.t + gh) { hide(); return; }
        var n = data.length, slotW = gw / n, i = Math.floor((mx - pad.l) / slotW);
        if (i < 0) i = 0; if (i >= n) i = n - 1;
        var d = data[i];
        show(d.label + ': ' + Math.round(d.workoutsPerWeek * 4) + ' workouts this period, ' + d.workoutsPerWeek + ' per week; strength ' + d.strengthIncreasePct + '%', e.clientX, e.clientY);
      });
      barEl.addEventListener('mouseleave', hide);
    }
    var scatterEl = document.getElementById('scatterChart');
    if (scatterEl) {
      scatterEl.addEventListener('mousemove', function (e) {
        var rect = scatterEl.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;
        var nearest = null, minDist = HOVER_RADIUS_SCATTER;
        scatterChartPoints.forEach(function (p) {
          var d = Math.hypot(p.x - mx, p.y - my);
          if (d < minDist) { minDist = d; nearest = p; }
        });
        if (nearest) show(nearest.name, e.clientX, e.clientY); else hide();
      });
      scatterEl.addEventListener('mouseleave', hide);
    }
  }

  function setExpandRect(card) {
    var rect = card.getBoundingClientRect();
    card.style.setProperty('--expand-start-left', rect.left + 'px');
    card.style.setProperty('--expand-start-top', rect.top + 'px');
    card.style.setProperty('--expand-start-width', rect.width + 'px');
    card.style.setProperty('--expand-start-height', rect.height + 'px');
    card.style.setProperty('--chart-fixed-size', rect.width + 'px');
    storedExpandRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  function setExpandFullSize(card) {
    var pad = 24, endWidth = window.innerWidth - pad * 2;
    var startTop = card.style.getPropertyValue('--expand-start-top') || '0';
    var startHeight = card.style.getPropertyValue('--expand-start-height') || '200px';
    card.style.setProperty('--expand-end-left', pad + 'px');
    card.style.setProperty('--expand-end-top', startTop);
    card.style.setProperty('--expand-end-width', endWidth + 'px');
    card.style.setProperty('--expand-end-height', startHeight);
    card.style.setProperty('--expand-full-width', endWidth + 'px');
    card.style.setProperty('--expand-full-height', startHeight);
  }

  function setupExpandCollapse(chartsEl) {
    chartsEl.addEventListener('click', function (e) {
      if (e.target.closest('.chart-select')) return;
      var card = e.target.closest('.chart-card');
      if (!card) return;
      if (e.target.closest('.chart-close')) {
        e.preventDefault();
        e.stopPropagation();
        card.classList.add('closing');
        card.classList.remove('expand-done');
        var titleEl = card.querySelector('.chart-title');
        var wrapperEl = card.querySelector('.chart-wrapper');
        var explanationEl = card.querySelector('.chart-explanation');
        if (!storedExpandRect) {
          card.classList.remove('expanded', 'closing', 'expand-from-left', 'expand-from-center', 'expand-from-right', 'expand-done');
          chartsEl.classList.remove('charts-has-expanded');
          return;
        }
        var leftPx = storedExpandRect.left, topPx = storedExpandRect.top, wPx = storedExpandRect.width, hPx = storedExpandRect.height;
        var rightInset = window.innerWidth - leftPx - wPx, bottomInset = window.innerHeight - topPx - hPx;
        var clipInset = topPx + 'px ' + rightInset + 'px ' + bottomInset + 'px ' + leftPx + 'px';
        function pinFixed(el, r) {
          if (!el || !r) return;
          el.style.position = 'fixed';
          el.style.left = r.left + 'px';
          el.style.top = r.top + 'px';
          el.style.width = r.width + 'px';
          el.style.height = r.height + 'px';
          el.style.margin = '0';
          el.style.boxSizing = 'border-box';
        }
        function unpin(el) {
          if (!el) return;
          el.style.removeProperty('position'); el.style.removeProperty('left'); el.style.removeProperty('top');
          el.style.removeProperty('width'); el.style.removeProperty('height'); el.style.removeProperty('margin'); el.style.removeProperty('box-sizing');
        }
        var done = false;
        function cleanup() {
          if (done) return;
          done = true;
          card.style.removeProperty('clip-path');
          card.querySelectorAll('.chart-close-curtain').forEach(function (n) { n.remove(); });
          unpin(titleEl); unpin(wrapperEl); unpin(explanationEl);
          card.style.removeProperty('--title-center-x'); card.style.removeProperty('--title-top');
          card.classList.remove('expanded', 'closing', 'expand-from-left', 'expand-from-center', 'expand-from-right', 'expand-done');
          chartsEl.classList.remove('charts-has-expanded');
        }
        var titleRect = titleEl.getBoundingClientRect();
        var isCenter = card.classList.contains('expand-from-center');
        pinFixed(titleEl, titleRect);
        if (!isCenter) {
          pinFixed(wrapperEl, wrapperEl.getBoundingClientRect());
          pinFixed(explanationEl, explanationEl.getBoundingClientRect());
        }
        var curtainLeft, curtainRight, curtainTop, curtainBottom;
        if (isCenter) {
          curtainLeft = document.createElement('div'); curtainLeft.className = 'chart-close-curtain chart-close-curtain-left'; card.appendChild(curtainLeft);
          curtainRight = document.createElement('div'); curtainRight.className = 'chart-close-curtain chart-close-curtain-right'; card.appendChild(curtainRight);
          curtainTop = document.createElement('div'); curtainTop.className = 'chart-close-curtain chart-close-curtain-top'; card.appendChild(curtainTop);
          curtainBottom = document.createElement('div'); curtainBottom.className = 'chart-close-curtain chart-close-curtain-bottom'; card.appendChild(curtainBottom);
        }
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            if (isCenter) {
              curtainLeft.style.width = leftPx + 'px';
              curtainRight.style.width = rightInset + 'px';
              curtainTop.style.height = topPx + 'px';
              curtainBottom.style.height = bottomInset + 'px';
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
      var cards = chartsEl.querySelectorAll('.chart-card');
      cards.forEach(function (c) {
        c.classList.remove('expanded', 'closing', 'expand-from-left', 'expand-from-center', 'expand-from-right', 'expand-done');
        c.style.removeProperty('left'); c.style.removeProperty('top'); c.style.removeProperty('width'); c.style.removeProperty('height');
      });
      setExpandRect(card);
      var index = Array.prototype.indexOf.call(cards, card);
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
        var startTop = card.style.getPropertyValue('--expand-start-top') || '0';
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

  function init() {
    var lineSelect = document.getElementById('lineChartSelect');
    var lineExercises = EXERCISES.filter(function (e) { return e.useWeight; });
    if (lineSelect) {
      lineExercises.forEach(function (e) {
        var opt = document.createElement('option');
        opt.value = e.name;
        opt.textContent = e.name;
        if (e.name === currentLineExercise) opt.selected = true;
        lineSelect.appendChild(opt);
      });
      lineSelect.addEventListener('change', runLineTransition);
    }
    redrawAll();
    ['barChart', 'lineChart', 'scatterChart'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) new ResizeObserver(redrawAll).observe(el);
    });
    setupLegendPopup();
    setupTooltips();
    var chartsEl = document.getElementById('charts');
    if (chartsEl) setupExpandCollapse(chartsEl);
    window.addEventListener('resize', redrawAll);
    window.addEventListener('scroll', function () {
      var sh = document.documentElement.scrollHeight - window.innerHeight;
      if (sh > 0 && window.scrollY / sh > 0.88) redrawAll();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
