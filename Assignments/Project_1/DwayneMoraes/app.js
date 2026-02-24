/**
 * Caffeine Tracker — Interactive Single-Page App
 * Vanilla JS: counters, charts, scroll reveals, mouse-reactive background
 */

// ============================================
// Data
// ============================================
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAILY_DATA = [
    // Week 1
    420, 380, 510, 460, 550, 390, 340,
    // Week 2
    470, 430, 520, 480, 560, 410, 360
];
const SOURCE_DATA = [
    { name: 'Coffee', mg: 1120, source: 'coffee' },
    { name: 'Energy Drinks', mg: 280, source: 'energy' }
];

const CAFFEINE_PER_CUP = 95; // mg per cup of coffee (approx)
const RECOMMENDED_DAILY_MG = 400;

const CAFFEINE_FACTS = [
    'Peak blood levels hit 30–60 min after consumption.',
    'Half-life is ~5 hours; 6–8 hours to clear most of it.',
    '400 mg/day is the FDA’s safe upper limit for adults.',
    'Coffee has ~95 mg per cup; energy drinks vary widely.',
    'Caffeine can improve focus and alertness temporarily.',
    'Too much can cause jitters, anxiety, and sleep issues.',
    'Decaf still has 2–15 mg per cup.',
    'Chocolate has caffeine: dark more than milk.',
    'Caffeine tolerance builds with regular use.',
    'Avoid caffeine 6+ hours before bed for better sleep.',
    'Green tea has less caffeine than black tea or coffee.',
    'Soda typically has 30–40 mg per 12 oz can.',
];

/** Derive source totals for a week from daily data using source ratios */
function getSourceDataForWeek(weekIndex) {
    const weekData = DAILY_DATA.slice(weekIndex * 7, (weekIndex + 1) * 7);
    const weekTotal = weekData.reduce((a, b) => a + b, 0);
    const totalSource = SOURCE_DATA.reduce((sum, s) => sum + s.mg, 0);
    const ratios = totalSource > 0 ? SOURCE_DATA.map(s => s.mg / totalSource) : SOURCE_DATA.map(() => 1 / SOURCE_DATA.length);
    return SOURCE_DATA.map((s, i) => ({
        name: s.name,
        mg: Math.round(weekTotal * ratios[i]),
        source: s.source || s.name.toLowerCase().replace(/\s+/g, '')
    }));
}

// ============================================
// Animated Counter
// ============================================
function animateCounter(el, target, suffix = '', duration = 1500) {
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const value = Math.floor(start + (target - start) * eased);
        el.textContent = value;
        if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}

function animateNumber(from, to, duration, onUpdate) {
    const startTime = performance.now();
    onUpdate(from);
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = from + (to - from) * eased;
        onUpdate(Math.round(value));
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ============================================
// Scroll Reveal (Intersection Observer)
// ============================================
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                if (entry.target.id === 'stats') triggerStatCounters();
                if (entry.target.id === 'daily-chart') renderBarChart();
                if (entry.target.id === 'sources') renderSourcesChart();
                if (entry.target.classList.contains('insight')) animateCupsEquivalent();
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    reveals.forEach(el => observer.observe(el));
}

// ============================================
// Stat Counters
// ============================================
function triggerStatCounters() {
    const statsSection = document.getElementById('stats');
    if (statsSection?.dataset.countersRun) return;
    if (statsSection) statsSection.dataset.countersRun = '1';
    const cards = document.querySelectorAll('.stat-card__value');
    cards.forEach(card => {
        const target = parseInt(card.dataset.target, 10);
        const suffix = card.dataset.suffix || '';
        animateCounter(card, target, suffix);
    });
}

// ============================================
// Daily Bar Chart (Week toggle, single week view)
// ============================================
let activeWeekIndex = 0;
let barChartState = null;

function renderBarChart() {
    const container = document.getElementById('bar-chart');
    const gridContainer = document.getElementById('bar-chart-grid');
    const yAxisContainer = document.getElementById('bar-chart-y-axis');
    const toggleContainer = document.getElementById('week-toggle');
    if (!container || container.children.length > 0) return;

    const max = Math.max(...DAILY_DATA);
    const week1Data = DAILY_DATA.slice(0, 7);
    const week2Data = DAILY_DATA.slice(7, 14);
    const peakW1 = Math.max(...week1Data);
    const peakW2 = Math.max(...week2Data);
    const weeklyAvg = DAILY_DATA.reduce((a, b) => a + b, 0) / DAILY_DATA.length;

    barChartState = { max, week1Data, week2Data, peakW1, peakW2, weeklyAvg };

    const steps = [0, 200, 400, Math.ceil(max / 100) * 100];
    const uniqueSteps = [...new Set(steps)].sort((a, b) => a - b);

    // Y-axis labels in dedicated column
    if (yAxisContainer) {
        uniqueSteps.forEach((mg) => {
            const label = document.createElement('div');
            label.className = 'bar-chart__y-axis-label';
            const pct = max > 0 ? Math.min((mg / max) * 100, 100) : 0;
            label.style.bottom = `${pct}%`;
            label.textContent = `${mg} mg`;
            yAxisContainer.appendChild(label);
        });
    }

    // Grid lines (bar area only, no labels)
    if (gridContainer) {
        uniqueSteps.forEach((mg) => {
            const line = document.createElement('div');
            line.className = 'bar-chart__grid-line';
            const pct = max > 0 ? Math.min((mg / max) * 100, 100) : 0;
            line.style.bottom = `${pct}%`;
            gridContainer.appendChild(line);
        });
    }

    const chartWrapper = container.closest('.chart-container');
    const chartContainer = chartWrapper?.closest('.chart-container--daily');

    function switchToWeek(weekIndex) {
        if (weekIndex === activeWeekIndex) return;
        activeWeekIndex = weekIndex;

        if (barChartState) {
        const { max, week1Data, week2Data, peakW1, peakW2, weeklyAvg } = barChartState;
        const data = weekIndex === 0 ? week1Data : week2Data;
        const peakValue = weekIndex === 0 ? peakW1 : peakW2;

        if (chartContainer) chartContainer.classList.add('chart-transitioning');

        const bars = container.querySelectorAll('.bar-chart__bar');
        bars.forEach((bar, i) => {
            const value = data[i];
            const height = max > 0 ? (value / max) * 100 : 0;
            const fill = bar.querySelector('.bar-chart__bar-fill');
            const tooltip = bar.querySelector('.bar-chart__bar-tooltip');

            bar.dataset.mg = value;
            bar.classList.toggle('bar-chart__bar--peak', value === peakValue);
            if (fill) fill.style.height = `${height}%`;
            if (tooltip) tooltip.innerHTML = buildBarTooltip(value, weeklyAvg);
        });

        if (toggleContainer) {
            toggleContainer.querySelectorAll('.bar-chart__toggle-btn').forEach((btn, i) => {
                const active = i === weekIndex;
                btn.classList.toggle('active', active);
                btn.setAttribute('aria-selected', active);
            });
        }
        document.querySelectorAll('.hero-panel__week-btn').forEach((btn) => {
            const active = parseInt(btn.dataset.week, 10) === weekIndex;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active);
        });

        setTimeout(() => {
            if (chartContainer) chartContainer.classList.remove('chart-transitioning');
        }, 400);
        }

        updateSourcesChart(weekIndex);
        updateCupsEquivalent(weekIndex);
        updateOverdoMeter();
        updateHeroPanels();
    }

    // Create 7 bars with both week values
    const barsContainer = document.createElement('div');
    barsContainer.className = 'bar-chart';

    week1Data.forEach((value, i) => {
        const bar = document.createElement('div');
        bar.className = 'bar-chart__bar';
        bar.dataset.mg = value;
        if (value === peakW1) bar.classList.add('bar-chart__bar--peak');
        const height = max > 0 ? (value / max) * 100 : 0;
        const label = DAY_LABELS[i];

        bar.innerHTML = `
            <span class="bar-chart__bar-tooltip">${buildBarTooltip(value, weeklyAvg)}</span>
            <div class="bar-chart__bar-inner">
                <div class="bar-chart__bar-spacer"></div>
                <div class="bar-chart__bar-fill" style="height: 0">
                    <span class="bar-chart__bar-shine"></span>
                </div>
            </div>
            <span class="bar-chart__bar-label">${label}</span>
        `;

        const fill = bar.querySelector('.bar-chart__bar-fill');
        barsContainer.appendChild(bar);

        bar.addEventListener('mouseenter', () => {
            if (chartWrapper) chartWrapper.classList.add('bar-hover-active');
            bar.classList.add('bar-chart__bar--hovered');
        });
        bar.addEventListener('mouseleave', () => {
            if (chartWrapper) chartWrapper.classList.remove('bar-hover-active');
            bar.classList.remove('bar-chart__bar--hovered');
        });

        setTimeout(() => {
            fill.style.height = `${height}%`;
        }, 150 + i * 60);
    });

    container.appendChild(barsContainer);

    // Week toggle handlers
    if (toggleContainer) {
        toggleContainer.querySelectorAll('.bar-chart__toggle-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const week = parseInt(btn.dataset.week, 10);
                switchToWeek(week);
            });
        });
    }
}

// ============================================
// Source Comparison Chart
// ============================================
let sourcesChartRendered = false;

function renderSourcesChart() {
    const container = document.getElementById('sources-chart');
    const totalEl = document.getElementById('sources-total');
    if (!container || container.children.length > 0) return;

    const sourceData = getSourceDataForWeek(activeWeekIndex);
    const total = sourceData.reduce((sum, s) => sum + s.mg, 0);
    const totalFormatted = total.toLocaleString();

    if (totalEl) totalEl.textContent = `Total: ${totalFormatted} mg`;

    const chartWrapper = container.closest('.sources-chart-wrapper');

    sourceData.forEach((source, i) => {
        const pct = total > 0 ? (source.mg / total) * 100 : 0;
        const pctRounded = Math.round(pct);
        const row = document.createElement('div');
        row.className = 'source-row';
        row.dataset.source = source.source;
        row.dataset.index = String(i);
        row.style.opacity = '0';
        row.style.transform = 'translateX(-20px)';

        row.innerHTML = `
            <span class="source-row__label">${source.name}</span>
            <div class="source-row__bar-wrap">
                <div class="source-row__bar-track"></div>
                <div class="source-row__bar" style="width: 0; transition: width 0.5s ease">
                    <span class="source-row__bar-shimmer"></span>
                    <span class="source-row__bar-data">
                        <span class="source-row__bar-mg">${source.mg} mg</span>
                        <span class="source-row__bar-pct">${pctRounded}%</span>
                    </span>
                </div>
                <span class="source-row__tooltip">
                    <strong>${source.name}</strong>
                    <span>${source.mg.toLocaleString()} mg</span>
                    <span>${pctRounded}% of total</span>
                </span>
            </div>
        `;

        container.appendChild(row);

        row.addEventListener('mouseenter', () => {
            if (chartWrapper) chartWrapper.classList.add('source-hover-active');
            row.classList.add('source-row--hovered');
        });
        row.addEventListener('mouseleave', () => {
            if (chartWrapper) chartWrapper.classList.remove('source-hover-active');
            row.classList.remove('source-row--hovered');
        });

        const bar = row.querySelector('.source-row__bar');
        setTimeout(() => {
            row.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            row.style.opacity = '1';
            row.style.transform = 'translateX(0)';
            bar.style.width = `${pct}%`;
        }, 200 + i * 120);
    });

    sourcesChartRendered = true;
}

function updateSourcesChart(weekIndex) {
    const container = document.getElementById('sources-chart');
    const totalEl = document.getElementById('sources-total');
    if (!container || !totalEl || !sourcesChartRendered) return;

    const sourceData = getSourceDataForWeek(weekIndex);
    const total = sourceData.reduce((sum, s) => sum + s.mg, 0);
    const rows = container.querySelectorAll('.source-row');
    const duration = 500;

    const prevTotalText = totalEl.textContent;
    const prevTotalMatch = prevTotalText.match(/[\d,]+/);
    const prevTotal = prevTotalMatch ? parseInt(prevTotalMatch[0].replace(/,/g, ''), 10) : 0;

    animateNumber(prevTotal, total, duration, (value) => {
        totalEl.textContent = `Total: ${value.toLocaleString()} mg`;
    });

    sourceData.forEach((source, i) => {
        const row = rows[i];
        if (!row) return;

        const pct = total > 0 ? (source.mg / total) * 100 : 0;
        const pctRounded = Math.round(pct);
        const bar = row.querySelector('.source-row__bar');
        const mgEl = row.querySelector('.source-row__bar-mg');
        const pctEl = row.querySelector('.source-row__bar-pct');
        const tooltip = row.querySelector('.source-row__tooltip');

        if (bar) bar.style.width = `${pct}%`;

        const prevMg = parseInt(mgEl?.textContent?.replace(/[^0-9]/g, '') || '0', 10);
        const prevPct = parseInt(pctEl?.textContent?.replace(/%/g, '') || '0', 10);

        if (mgEl) animateNumber(prevMg, source.mg, duration, (v) => { mgEl.textContent = `${v} mg`; });
        if (pctEl) animateNumber(prevPct, pctRounded, duration, (v) => { pctEl.textContent = `${v}%`; });
        if (tooltip) {
            tooltip.innerHTML = `
                <strong>${source.name}</strong>
                <span>${source.mg.toLocaleString()} mg</span>
                <span>${pctRounded}% of total</span>
            `;
        }
    });
}

// ============================================
// Cups Equivalent (95 mg = 1 cup, per selected week)
// ============================================
let cupsAnimated = false;

function getCupsForWeek(weekIndex) {
    const weekData = DAILY_DATA.slice(weekIndex * 7, (weekIndex + 1) * 7);
    const weekTotal = weekData.reduce((a, b) => a + b, 0);
    return Math.round(weekTotal / CAFFEINE_PER_CUP);
}

function updateCupsEquivalent(weekIndex) {
    const cups = getCupsForWeek(weekIndex);
    const el = document.getElementById('cups-equivalent');
    const labelEl = document.getElementById('cups-week-label');
    if (el) {
        const prev = parseInt(el.textContent, 10) || 0;
        if (cupsAnimated && prev !== cups) {
            animateNumber(prev, cups, 500, (v) => { el.textContent = v; });
        } else {
            el.textContent = cups;
        }
    }
    if (labelEl) labelEl.textContent = `(Week ${weekIndex + 1})`;
}

function animateCupsEquivalent() {
    if (cupsAnimated) return;
    cupsAnimated = true;

    const cups = getCupsForWeek(activeWeekIndex);
    const el = document.getElementById('cups-equivalent');
    const labelEl = document.getElementById('cups-week-label');
    if (el) animateCounter(el, cups, '', 1200);
    if (labelEl) labelEl.textContent = `(Week ${activeWeekIndex + 1})`;
}

// ============================================
// Hero Widgets
// ============================================
function initHeroWidgets() {
    initFactRotator();
    initOverdoMeter();
    initHeroPanels();
}

function initFactRotator() {
    const factEl = document.getElementById('hero-fact');
    const textEl = document.getElementById('hero-fact-text');
    if (!factEl || !textEl) return;

    let index = 0;
    let rotateTimer = null;
    const ROTATE_INTERVAL = 7000 + Math.random() * 3000;

    function showFact(i) {
        index = ((i % CAFFEINE_FACTS.length) + CAFFEINE_FACTS.length) % CAFFEINE_FACTS.length;
        textEl.style.opacity = '0';
        textEl.style.transform = 'translateY(6px)';
        requestAnimationFrame(() => {
            textEl.textContent = CAFFEINE_FACTS[index];
            textEl.style.opacity = '1';
            textEl.style.transform = 'translateY(0)';
        });
    }

    function nextFact() {
        showFact(index + 1);
        resetTimer();
    }

    function resetTimer() {
        clearInterval(rotateTimer);
        rotateTimer = setInterval(nextFact, ROTATE_INTERVAL);
    }

    showFact(0);
    rotateTimer = setInterval(nextFact, ROTATE_INTERVAL);

    factEl.addEventListener('click', () => {
        factEl.classList.add('hero-widget--pulse');
        setTimeout(() => factEl.classList.remove('hero-widget--pulse'), 200);
        nextFact();
    });
    factEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            factEl.click();
        }
    });
}

function getWeeklyAvgMg(weekIndex) {
    const weekData = DAILY_DATA.slice(weekIndex * 7, (weekIndex + 1) * 7);
    const total = weekData.reduce((a, b) => a + b, 0);
    return total / 7;
}

function updateOverdoMeter() {
    const barEl = document.getElementById('hero-overdo-bar');
    const labelEl = document.getElementById('hero-overdo-label');
    if (!barEl || !labelEl) return;

    const avg = getWeeklyAvgMg(activeWeekIndex);
    const pct = Math.min(100, (avg / RECOMMENDED_DAILY_MG) * 100);
    barEl.style.width = `${pct}%`;

    labelEl.className = 'hero-widget__meter-label';
    if (avg < 320) {
        barEl.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
        labelEl.classList.add('hero-widget__meter-label--below');
        labelEl.textContent = `Below recommended (~${Math.round(avg)} mg/day)`;
    } else if (avg <= 480) {
        barEl.style.background = 'linear-gradient(90deg, #fbbf24, var(--accent-amber))';
        labelEl.classList.add('hero-widget__meter-label--near');
        labelEl.textContent = `Near recommended (~${Math.round(avg)} mg/day)`;
    } else {
        barEl.style.background = 'linear-gradient(90deg, #f87171, #ef4444)';
        labelEl.classList.add('hero-widget__meter-label--over');
        labelEl.textContent = `Over recommended (~${Math.round(avg)} mg/day)`;
    }
}

function initOverdoMeter() {
    updateOverdoMeter();
}

// ============================================
// Hero Side Panels
// ============================================
function initHeroPanels() {
    updateHeroPanels();
    initHeroPanelParallax();
    initSleepSlider();
    initHeroWeekToggle();
}

function buildBarTooltip(value, weeklyAvg) {
    const pctVsAvg = weeklyAvg > 0 ? Math.round((value / weeklyAvg - 1) * 100) : 0;
    const pctText = pctVsAvg >= 0 ? `+${pctVsAvg}%` : `${pctVsAvg}%`;
    const pctLabel = pctVsAvg === 0 ? 'avg' : (pctVsAvg > 0 ? 'above' : 'below') + ' avg';
    return `<strong>${value} mg</strong><span class="bar-chart__bar-tooltip-pct">${pctText} ${pctLabel}</span>`;
}

function setWeekFromHero(weekIndex) {
    if (weekIndex === activeWeekIndex) return;
    activeWeekIndex = weekIndex;
    updateSourcesChart(weekIndex);
    updateCupsEquivalent(weekIndex);
    updateOverdoMeter();
    updateHeroPanels();
    const toggleBtns = document.querySelectorAll('.bar-chart__toggle-btn');
    toggleBtns.forEach((btn) => {
        const active = parseInt(btn.dataset.week, 10) === weekIndex;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active);
    });
    if (barChartState) {
        const container = document.getElementById('bar-chart');
        if (container) {
            const { max, week1Data, week2Data, peakW1, peakW2, weeklyAvg } = barChartState;
            const data = weekIndex === 0 ? week1Data : week2Data;
            const peakValue = weekIndex === 0 ? peakW1 : peakW2;
            const bars = container.querySelectorAll('.bar-chart__bar');
            bars.forEach((bar, i) => {
                const value = data[i];
                const height = max > 0 ? (value / max) * 100 : 0;
                const fill = bar.querySelector('.bar-chart__bar-fill');
                const tooltip = bar.querySelector('.bar-chart__bar-tooltip');
                if (fill) fill.style.height = `${height}%`;
                if (tooltip) tooltip.innerHTML = buildBarTooltip(value, weeklyAvg);
                bar.classList.toggle('bar-chart__bar--peak', value === peakValue);
            });
        }
    }
}

function initHeroWeekToggle() {
    const btns = document.querySelectorAll('.hero-panel__week-btn');
    btns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const week = parseInt(btn.dataset.week, 10);
            setWeekFromHero(week);
            btns.forEach((b) => {
                const active = parseInt(b.dataset.week, 10) === week;
                b.classList.toggle('active', active);
                b.setAttribute('aria-pressed', active);
            });
        });
    });
}

function updateHeroPanels() {
    updateLeftPanel();
    updateRightPanel();
}

function updateLeftPanel() {
    const weekData = DAILY_DATA.slice(activeWeekIndex * 7, (activeWeekIndex + 1) * 7);
    const total = weekData.reduce((a, b) => a + b, 0);
    const avg = total / 7;
    const peak = Math.max(...weekData);
    const peakDayIndex = weekData.indexOf(peak);

    const totalEl = document.getElementById('panel-total-mg');
    const avgEl = document.getElementById('panel-avg-mg');
    const peakEl = document.getElementById('panel-peak-mg');
    const peakDayEl = document.getElementById('panel-peak-day');
    if (totalEl) totalEl.textContent = total.toLocaleString();
    if (avgEl) avgEl.textContent = Math.round(avg);
    if (peakEl) peakEl.textContent = peak;
    if (peakDayEl) peakDayEl.textContent = DAY_LABELS[peakDayIndex];

    drawSparkline(weekData);
}

function drawSparkline(weekData) {
    const canvas = document.getElementById('panel-sparkline');
    if (!canvas || !weekData.length) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const max = Math.max(...weekData);
    const min = Math.min(...weekData);
    const range = max - min || 1;
    const pad = 2;

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    const stepX = (w - pad * 2) / (weekData.length - 1);
    weekData.forEach((v, i) => {
        const x = pad + i * stepX;
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

function updateRightPanel() {
    const sourceData = getSourceDataForWeek(activeWeekIndex);
    const total = sourceData.reduce((s, x) => s + x.mg, 0);
    const coffee = sourceData.find(s => s.source === 'coffee');
    const energy = sourceData.find(s => s.source === 'energy');
    const coffeePct = total > 0 ? (coffee?.mg || 0) / total : 0.5;
    const energyPct = total > 0 ? (energy?.mg || 0) / total : 0.5;

    const coffeeFill = document.getElementById('panel-coffee-fill');
    const energyFill = document.getElementById('panel-energy-fill');
    const coffeeLabel = document.getElementById('panel-coffee-label');
    const energyLabel = document.getElementById('panel-energy-label');

    if (coffeeFill) coffeeFill.style.width = `${coffeePct * 100}%`;
    if (energyFill) energyFill.style.width = `${energyPct * 100}%`;
    if (coffeeLabel) coffeeLabel.textContent = `Coffee ${Math.round(coffeePct * 100)}%`;
    if (energyLabel) energyLabel.textContent = `Energy ${Math.round(energyPct * 100)}%`;

    const avg = getWeeklyAvgMg(activeWeekIndex);
    const riskPct = Math.min(100, (avg / RECOMMENDED_DAILY_MG) * 100);
    const fillEl = document.getElementById('panel-risk-fill');
    const textEl = document.getElementById('panel-risk-text');

    if (fillEl) {
        const circumference = 2 * Math.PI * 20;
        const offset = circumference - (riskPct / 100) * circumference;
        fillEl.style.strokeDashoffset = offset;
        fillEl.className = 'hero-panel__risk-fill';
        if (avg < 320) fillEl.classList.add('hero-panel__risk-fill--below');
        else if (avg <= 480) fillEl.classList.add('hero-panel__risk-fill--near');
        else fillEl.classList.add('hero-panel__risk-fill--over');
    }
    if (textEl) {
        if (avg < 320) textEl.textContent = 'Low';
        else if (avg <= 480) textEl.textContent = 'Near';
        else textEl.textContent = 'High';
    }

    updateSleepText();
}

function initSleepSlider() {
    const slider = document.getElementById('panel-sleep-slider');
    const targetEl = document.getElementById('panel-sleep-target');
    if (!slider || !targetEl) return;

    function formatHour(h) {
        const h24 = h >= 24 ? h - 24 : h;
        if (h24 === 0) return '12 AM';
        if (h24 === 12) return '12 PM';
        return h24 < 12 ? `${h24} PM` : `${h24 - 12} PM`;
    }

    function update() {
        const h = parseInt(slider.value, 10);
        targetEl.textContent = formatHour(h);
        updateSleepText();
    }

    slider.addEventListener('input', update);
    update();
}

function updateSleepText() {
    const slider = document.getElementById('panel-sleep-slider');
    const textEl = document.getElementById('panel-sleep-text');
    if (!slider || !textEl) return;

    const bedtime = parseInt(slider.value, 10);
    let cutoff = bedtime - 6;
    if (cutoff < 0) cutoff += 24;
    if (cutoff >= 24) cutoff -= 24;
    const cutoffStr = cutoff === 0 ? '12 AM' : cutoff === 12 ? '12 PM' : cutoff < 12 ? `${cutoff} AM` : `${cutoff - 12} PM`;
    const bedtimeH = bedtime >= 24 ? bedtime - 24 : bedtime;
    const bedtimeStr = bedtimeH === 0 ? '12 AM' : bedtimeH === 12 ? '12 PM' : bedtimeH < 12 ? `${bedtimeH} PM` : `${bedtimeH - 12} PM`;
    textEl.textContent = `Avoid caffeine after ${cutoffStr} for ${bedtimeStr} sleep`;
}

function initHeroPanelParallax() {
    const leftPanel = document.getElementById('hero-panel-left');
    const rightPanel = document.getElementById('hero-panel-right');
    if (!leftPanel || !rightPanel) return;

    let targetLeftX = 0;
    let targetRightX = 0;
    let leftX = 0;
    let rightX = 0;
    const strength = 6;
    let started = false;

    document.addEventListener('mousemove', (e) => {
        const normX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetLeftX = -normX * strength;
        targetRightX = normX * strength;
    }, { passive: true });

    setTimeout(() => {
        started = true;
    }, 800);

    function animate() {
        if (started) {
            leftX += (targetLeftX - leftX) * 0.06;
            rightX += (targetRightX - rightX) * 0.06;
            leftPanel.style.transform = `translateX(${leftX}px)`;
            rightPanel.style.transform = `translateX(${rightX}px)`;
        }
        requestAnimationFrame(animate);
    }
    animate();
}

// ============================================
// Mouse-Reactive Cursor Glow
// ============================================
function initCursorGlow() {
    const glow = document.getElementById('cursor-glow');
    if (!glow) return;

    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animate() {
        glowX += (mouseX - glowX) * 0.08;
        glowY += (mouseY - glowY) * 0.08;
        glow.style.left = `${glowX}px`;
        glow.style.top = `${glowY}px`;
        requestAnimationFrame(animate);
    }
    animate();
}

// ============================================
// Ambient Grid Mouse Parallax (subtle)
// ============================================
function initGridParallax() {
    const grid = document.getElementById('ambient-grid');
    if (!grid) return;

    document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 8;
        const y = (e.clientY / window.innerHeight - 0.5) * 8;
        grid.style.transform = `translate(${x}px, ${y}px)`;
    });
}

// ============================================
// Intro Sequence
// ============================================
let introComplete = false;

function completeIntroSequence() {
    if (introComplete) return;
    introComplete = true;
    document.body.classList.remove('intro-loading');
    document.body.classList.add('intro-done');

    const sections = document.querySelectorAll('.intro-section');
    sections.forEach((el, i) => {
        setTimeout(() => {
            el.classList.add('intro-revealed', 'visible');
            if (el.id === 'stats') triggerStatCounters();
            if (el.id === 'daily-chart') renderBarChart();
            if (el.id === 'sources') renderSourcesChart();
            if (el.classList.contains('insight')) animateCupsEquivalent();
        }, 100 + i * 120);
    });
}

// ============================================
// Full-Page Coffee — Fuel → Collection → Data → Analysis
// ============================================
function initPageCoffeeBg() {
    const canvas = document.getElementById('page-coffee-canvas');
    const chartSection = document.getElementById('daily-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const PARTICLE_SIZE = 4;
    const BASE_SPEED = 1.8;
    const MAX_PARTICLES = 100;
    const BASE_PARTICLES = 45;
    const CURSOR_ZONE = 160;
    const CUP_WIDTH = 140;
    const CUP_HEIGHT = 120;
    const CUP_FILL_HEIGHT = 90;
    const CUP_INNER_PAD = 12;
    const DROPLET_VALUE = 0.28;
    const CUP_CENTER_Y = 0;

    const weekData = DAILY_DATA.slice(0, 7);
    const maxData = Math.max(...weekData);

    let w = 800, h = 600;
    let particles = [];
    let streamCenterX = 0;
    let targetStreamX = 0;
    let mouseX = 0;
    let mouseY = 0;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let mouseVelX = 0;
    let mouseVelY = 0;
    let activityLevel = 0;
    let cupOffsetX = 0;
    let cupOffsetY = 0;
    let targetCupX = 0;
    let targetCupY = 0;
    let collectedCount = 0;
    let liquidLevel = 0;
    let ripples = [];
    let splashPhase = 0;
    let lastCupHover = false;
    let morphProgress = 0;
    let cupBarHeights = [0, 0, 0, 0, 0, 0, 0];
    let splashes = [];

    function resize() {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        streamCenterX = w / 2;
        targetStreamX = w / 2;
        mouseX = w / 2;
        mouseY = h / 2;
        lastMouseX = w / 2;
        lastMouseY = h / 2;
    }

    document.addEventListener('mousemove', (e) => {
        mouseVelX = e.clientX - lastMouseX;
        mouseVelY = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        mouseX = e.clientX;
        mouseY = e.clientY;
        const velMag = Math.sqrt(mouseVelX * mouseVelX + mouseVelY * mouseVelY);
        const activityBoost = introComplete ? 0.3 : 1;
        activityLevel = Math.min(1, activityLevel + (0.05 + velMag * 0.002) * activityBoost);

        const normX = e.clientX / w - 0.5;
        const normY = e.clientY / h - 0.5;
        const interactMult = introComplete ? 0.35 : 1;
        targetCupX = normX * 18 * interactMult;
        targetCupY = normY * 12 * interactMult;
        if (!introComplete) targetStreamX = e.clientX;
    }, { passive: true });

    function getMorphProgress() {
        if (!chartSection) return 0;
        const rect = chartSection.getBoundingClientRect();
        const trigger = h * 0.7;
        const complete = h * 0.3;
        if (rect.top > trigger) return 0;
        if (rect.top < complete) return 1;
        return 1 - (rect.top - complete) / (trigger - complete);
    }

    function getChartBarPositions() {
        if (!chartSection) return [];
        const chartContainer = chartSection.querySelector('.chart-container--daily, .chart-container');
        if (!chartContainer) return [];
        const chartRect = chartContainer.getBoundingClientRect();
        const barChart = chartSection.querySelector('.bar-chart');
        const barCount = 7;
        const chartHeight = 180;
        const barAreaWidth = barChart ? barChart.getBoundingClientRect().width : chartRect.width - 80;
        const barWidth = Math.max(12, (barAreaWidth / barCount) * 0.65);
        const barAreaLeft = barChart
            ? barChart.getBoundingClientRect().left
            : chartRect.left + 60;
        const barBottom = chartRect.top + chartRect.height - 24;
        const positions = [];
        for (let i = 0; i < barCount; i++) {
            const centerX = barAreaLeft + barAreaWidth * (i + 0.5) / barCount;
            positions.push({
                x: centerX - barWidth / 2,
                width: barWidth,
                bottom: barBottom,
                height: (weekData[i] / maxData) * chartHeight,
            });
        }
        return positions;
    }

    function createParticle() {
        const funnelWidth = introComplete ? 60 + (100 - activityLevel * 40) : 24;
        const spawnX = introComplete ? w / 2 : streamCenterX;
        return {
            x: spawnX + (Math.random() - 0.5) * funnelWidth,
            y: -PARTICLE_SIZE - Math.random() * 60,
            size: PARTICLE_SIZE + (Math.random() > 0.7 ? 2 : 0),
            speed: BASE_SPEED + Math.random() * 1.0,
            drift: (Math.random() - 0.5) * (introComplete ? 0.4 : 0.15),
            baseOpacity: 0.55 + Math.random() * 0.3,
        };
    }

    function getCupBounds() {
        const cupX = w / 2 - CUP_WIDTH / 2 + cupOffsetX;
        const cupY = h - CUP_HEIGHT - 40 + cupOffsetY;
        return { x: cupX, y: cupY, w: CUP_WIDTH, h: CUP_HEIGHT };
    }

    function isMouseOverCup() {
        const b = getCupBounds();
        return mouseX >= b.x - 20 && mouseX <= b.x + b.w + 36 &&
               mouseY >= b.y - 10 && mouseY <= b.y + b.h + 10;
    }

    function isMouseNearCup() {
        const b = getCupBounds();
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        return Math.sqrt((mouseX - cx) ** 2 + (mouseY - cy) ** 2) < 100;
    }

    function addRipple(localX, strength) {
        ripples.push({ x: localX, phase: 0, strength: Math.min(1, strength), width: 0 });
    }

    function addSplash(screenX, screenY) {
        splashes.push({ x: screenX, y: screenY, vx: 0, vy: 0, life: 1, size: 8, isImpact: true });
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 1.5 + Math.random() * 2;
            splashes.push({
                x: screenX,
                y: screenY,
                vx: Math.cos(angle) * speed,
                vy: -Math.abs(Math.sin(angle)) * speed - 0.5,
                life: 1,
                size: 2 + Math.random() * 2,
                isImpact: false,
            });
        }
    }

    function drawCup(time) {
        const cupX = w / 2 - CUP_WIDTH / 2 + cupOffsetX;
        const cupY = h - CUP_HEIGHT - 40 + cupOffsetY;
        const px = 6;
        const cupLeft = Math.floor(cupX / px) * px;
        const cupTop = Math.floor(cupY / px) * px;

        const cupHover = isMouseOverCup();
        const cupNear = isMouseNearCup();
        if (cupHover && !lastCupHover) splashPhase = 1;
        lastCupHover = cupHover;

        const surfaceWave = Math.sin(time * 0.0015) * 1.2 + (cupNear ? Math.sin(time * 0.0028) * 2 : 0);
        const splashOffset = splashPhase > 0 ? (1 - splashPhase) * 6 : 0;
        splashPhase *= 0.92;

        ripples = ripples.filter(r => r.phase < 1);
        ripples.forEach(r => { r.phase += 0.035; r.width += 2.5; });

        const chartBarHeights = weekData.map(v => (v / maxData) * 75);
        const barReveal = Math.min(1, liquidLevel / 15);
        for (let i = 0; i < 7; i++) {
            const threshold = 10 + i * 11;
            const barProgress = liquidLevel > threshold ? Math.min(1, (liquidLevel - threshold) / 8) : 0;
            const cupTargetH = (liquidLevel / CUP_FILL_HEIGHT) * (barReveal * 0.5 + 0.5) * 42;
            const chartTargetH = chartBarHeights[i];
            const blendedTarget = cupTargetH * barProgress * (1 - morphProgress) + chartTargetH * morphProgress;
            cupBarHeights[i] += (blendedTarget - cupBarHeights[i]) * 0.06;
        }

        const glowIntensity = 0.12 + (liquidLevel / CUP_FILL_HEIGHT) * 0.3;

        ctx.save();

        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(w / 2 + cupOffsetX, h - 22, CUP_WIDTH / 2 + 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.shadowColor = `rgba(245, 158, 11, ${glowIntensity})`;
        ctx.shadowBlur = 10 + (liquidLevel / CUP_FILL_HEIGHT) * 6;

        ctx.fillStyle = '#3d2a1f';
        ctx.fillRect(cupLeft, cupTop, CUP_WIDTH, CUP_HEIGHT);

        ctx.fillStyle = '#5a4030';
        ctx.fillRect(cupLeft + 4, cupTop + 4, 4, CUP_HEIGHT - 8);
        ctx.fillRect(cupLeft + CUP_WIDTH - 8, cupTop + 4, 4, CUP_HEIGHT - 8);

        ctx.fillStyle = '#2d1f18';
        ctx.fillRect(cupLeft + 8, cupTop + 8, CUP_WIDTH - 16, CUP_HEIGHT - 16);

        if (liquidLevel > 4) {
            const fillTop = cupTop + CUP_HEIGHT - 20 - liquidLevel - surfaceWave - splashOffset;
            const innerW = CUP_WIDTH - CUP_INNER_PAD * 2;

            ctx.fillStyle = 'rgba(100, 70, 25, 0.35)';
            ctx.fillRect(cupLeft + CUP_INNER_PAD + 2, fillTop, innerW - 4, 3);

            ctx.fillStyle = 'rgba(180, 120, 35, 0.88)';
            ctx.beginPath();
            ctx.moveTo(cupLeft + CUP_INNER_PAD, cupTop + CUP_HEIGHT - 20);
            ctx.lineTo(cupLeft + CUP_INNER_PAD, fillTop);
            for (let x = px; x < innerW; x += px) {
                let y = fillTop;
                y += Math.sin((x / innerW) * Math.PI * 2 + time * 0.0018) * 1.5;
                y += surfaceWave;
                y += splashOffset * (1 - Math.abs(x - innerW / 2) / (innerW / 2));
                ripples.forEach(r => {
                    const dx = x - r.x;
                    const ripple = Math.exp(-(dx * dx) / (r.width * r.width + 1)) * Math.sin(r.phase * Math.PI) * r.strength * 4;
                    y += ripple;
                });
                ctx.lineTo(cupLeft + CUP_INNER_PAD + x, Math.floor(y / px) * px);
            }
            ctx.lineTo(cupLeft + CUP_INNER_PAD + innerW, cupTop + CUP_HEIGHT - 20);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(220, 180, 80, 0.2)';
            ctx.fillRect(cupLeft + CUP_INNER_PAD + 4, fillTop + 2, innerW / 3, 2);

            if (morphProgress < 0.95 && liquidLevel > 12) {
                const barW = (innerW - 24) / 7;
                const barBottom = cupTop + CUP_HEIGHT - 20;
                for (let i = 0; i < 7; i++) {
                    if (cupBarHeights[i] < 2) continue;
                    const bx = cupLeft + CUP_INNER_PAD + 4 + i * (barW + 2);
                    const by = barBottom - cupBarHeights[i];
                    ctx.fillStyle = 'rgba(180, 120, 35, 0.95)';
                    ctx.fillRect(Math.floor(bx / px) * px, Math.floor(by / px) * px, Math.floor(barW / px) * px, Math.ceil(cupBarHeights[i] / px) * px);
                }
            }
        }

        ctx.fillStyle = '#6f4e37';
        ctx.fillRect(cupLeft, cupTop - 5, CUP_WIDTH, 6);

        ctx.fillStyle = '#8b6914';
        ctx.fillRect(cupLeft + 6, cupTop - 2, CUP_WIDTH - 12, 3);

        ctx.shadowColor = `rgba(245, 158, 11, ${0.25 + (liquidLevel / CUP_FILL_HEIGHT) * 0.15})`;
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#a67c3a';
        ctx.fillRect(cupLeft + 6, cupTop - 2, (CUP_WIDTH - 12) / 2, 2);

        const handleX = cupLeft + CUP_WIDTH + 4;
        ctx.fillStyle = '#4a3728';
        ctx.fillRect(handleX, cupTop + 28, 12, 50);
        ctx.fillStyle = '#3d2a1f';
        ctx.fillRect(handleX + 2, cupTop + 32, 3, 42);

        ctx.restore();

        if (cupNear && Math.random() < 0.006) {
            addRipple(Math.random() * (CUP_WIDTH - CUP_INNER_PAD * 2), 0.25);
        }
    }

    function drawSplashes() {
        splashes = splashes.filter(s => s.life > 0);
        splashes.forEach((s) => {
            s.x += s.vx;
            s.y += s.vy;
            if (!s.isImpact) s.vy += 0.15;
            s.life -= s.isImpact ? 0.2 : 0.06;
            const alpha = s.life;
            if (alpha <= 0) return;
            ctx.save();
            ctx.globalAlpha = alpha;
            const px = 4;
            if (s.isImpact) {
                const r = s.size * (1 - s.life);
                ctx.fillStyle = 'rgba(255, 220, 150, 0.6)';
                ctx.fillRect(Math.floor((s.x - r / 2) / px) * px, Math.floor((s.y - r / 2) / px) * px, r, r);
            } else {
                ctx.fillStyle = 'rgba(190, 130, 35, 0.9)';
                ctx.fillRect(Math.floor(s.x / px) * px, Math.floor(s.y / px) * px, s.size, s.size);
            }
            ctx.restore();
        });
    }

    function drawFillProgress() {
        if (introComplete) return;
        const cupX = w / 2 - CUP_WIDTH / 2 + cupOffsetX;
        const cupY = h - CUP_HEIGHT - 40 + cupOffsetY;
        const barWidth = 80;
        const barHeight = 6;
        const x = cupX + CUP_WIDTH / 2 - barWidth / 2;
        const y = cupY - 24;
        const pct = Math.min(1, liquidLevel / CUP_FILL_HEIGHT);
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.fillRect(x, y, barWidth * pct, barHeight);
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(`Fill ${Math.round(pct * 100)}%`, cupX + CUP_WIDTH / 2, y - 4);
        ctx.restore();
    }

    function drawMorphBars() {
        const chartPos = getChartBarPositions();
        if (!chartPos || morphProgress < 0.02) return;

        const cupX = w / 2 - CUP_WIDTH / 2 + cupOffsetX;
        const cupY = h - CUP_HEIGHT - 40 + cupOffsetY;
        const innerW = CUP_WIDTH - CUP_INNER_PAD * 2;
        const barW = (innerW - 24) / 7;
        const cupBarBottom = cupY + CUP_HEIGHT - 20;
        const px = 6;

        const eased = 1 - Math.pow(1 - morphProgress, 1.5);

        for (let i = 0; i < 7; i++) {
            const cupBarX = cupX + CUP_INNER_PAD + 4 + i * (barW + 2);
            const cupBarTop = cupBarBottom - cupBarHeights[i];
            const cupBarH = cupBarHeights[i];

            const target = chartPos[i];
            const targetX = target.x;
            const targetBottom = target.bottom;
            const targetTop = targetBottom - target.height;
            const targetH = target.height;

            const x = cupBarX + (targetX - cupBarX) * eased;
            const bottom = cupBarBottom + (targetBottom - cupBarBottom) * eased;
            const top = cupBarTop + (targetTop - cupBarTop) * eased;
            const barH = bottom - top;
            const width = barW + (target.width - barW) * eased;

            if (barH < 2) continue;

            ctx.save();
            ctx.globalAlpha = Math.min(1, morphProgress * 1.2);
            ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
            ctx.shadowBlur = 4;
            ctx.fillStyle = `rgba(190, 130, 35, ${0.85 + eased * 0.1})`;
            const rx = Math.floor(x / px) * px;
            const ry = Math.floor(top / px) * px;
            const rw = Math.max(px, Math.floor(width / px) * px);
            const rh = Math.ceil(barH / px) * px;
            ctx.fillRect(rx, ry, rw, rh);
            ctx.restore();
        }
    }

    function draw() {
        activityLevel *= 0.99;
        mouseVelX *= 0.9;
        mouseVelY *= 0.9;

        morphProgress += (getMorphProgress() - morphProgress) * 0.04;

        const streamLerp = introComplete ? 0.012 : 0.08;
        targetStreamX += (mouseX - targetStreamX) * streamLerp;
        streamCenterX += (targetStreamX - streamCenterX) * (introComplete ? 0.02 : 0.12);
        cupOffsetX += (targetCupX - cupOffsetX) * 0.07;
        cupOffsetY += (targetCupY - cupOffsetY) * 0.07;

        liquidLevel = Math.min(CUP_FILL_HEIGHT, collectedCount * DROPLET_VALUE);
        if (!introComplete && liquidLevel >= CUP_FILL_HEIGHT * 0.99) {
            liquidLevel = CUP_FILL_HEIGHT;
            completeIntroSequence();
        }

        const particleMult = introComplete ? 0.5 : 1;
        const particleCount = Math.floor((BASE_PARTICLES + activityLevel * (MAX_PARTICLES - BASE_PARTICLES)) * particleMult);
        const turbulence = Math.min(1, Math.sqrt(mouseVelX * mouseVelX + mouseVelY * mouseVelY) / 10);
        if (particles.length < particleCount && Math.random() < 0.5 + turbulence * 0.2) {
            particles.push(createParticle());
        }

        ctx.clearRect(0, 0, w, h);

        const time = performance.now();
        drawCup(time);
        drawSplashes();
        drawFillProgress();

        const cupBounds = getCupBounds();
        const cupCenterX = cupBounds.x + cupBounds.w / 2;
        const interactScale = introComplete ? 0.4 : 1;
        const funnelTargetX = introComplete ? cupCenterX : streamCenterX;
        const funnelStrength = (0.02 + activityLevel * 0.015) * interactScale;
        const speedMult = 0.85 + activityLevel * (introComplete ? 0.15 : 0.45);
        const bendStrength = (0.015 + activityLevel * 0.01) * interactScale;
        const turbulenceDrift = turbulence * (introComplete ? 0.8 : 2);

        particles.forEach((p) => {
            p.y += p.speed * speedMult;
            p.drift += (Math.random() - 0.5) * turbulenceDrift * 0.06;
            p.drift *= 0.98;

            const toTarget = funnelTargetX - p.x;
            const pull = funnelStrength * (1 - p.y / h * 0.3);
            p.x += p.drift + toTarget * pull * (introComplete ? 0.02 : 0.008);

            const dx = mouseX - p.x;
            const dy = mouseY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const cursorZone = introComplete ? CURSOR_ZONE * 0.5 : CURSOR_ZONE;
            if (dist < cursorZone && activityLevel > 0.03) {
                const influence = (1 - dist / cursorZone) * (introComplete ? 0.4 : 1);
                const perpX = -dy / dist;
                const perpY = dx / dist;
                const swirl = influence * 0.1 * (activityLevel + turbulence);
                p.x += (dx / dist) * influence * 0.025 + perpX * swirl;
                p.y += (dy / dist) * influence * 0.015 + perpY * swirl;
            }

            p.x += (streamCenterX - p.x) * bendStrength * 0.5;

            const baseAlpha = Math.min(p.baseOpacity, 1 - (p.y - h * 0.35) / (h * 0.65)) * 0.6;
            const alpha = introComplete ? baseAlpha * 0.4 : baseAlpha;

            const surfaceY = cupBounds.y + CUP_HEIGHT - 20 - liquidLevel;
            const inCupX = p.x >= cupBounds.x + CUP_INNER_PAD && p.x <= cupBounds.x + cupBounds.w - CUP_INNER_PAD;
            if (inCupX && p.y >= surfaceY - 10 && p.y <= surfaceY + 14) {
                collectedCount++;
                const localX = p.x - (cupBounds.x + CUP_INNER_PAD);
                addRipple(localX, 0.6);
                addSplash(p.x, surfaceY);
                p.y = -PARTICLE_SIZE - Math.random() * 50;
                p.x = introComplete ? w / 2 + (Math.random() - 0.5) * 80 : streamCenterX + (Math.random() - 0.5) * 20;
                p.drift = (Math.random() - 0.5) * (introComplete ? 0.4 : 0.15);
            } else if (p.y > h + PARTICLE_SIZE) {
                p.y = -PARTICLE_SIZE - Math.random() * 60;
                p.x = introComplete ? w / 2 + (Math.random() - 0.5) * 70 : streamCenterX + (Math.random() - 0.5) * 24;
                p.drift = (Math.random() - 0.5) * (introComplete ? 0.35 + turbulence : 0.15);
            }

            const px = Math.floor(p.x / PARTICLE_SIZE) * PARTICLE_SIZE;
            const py = Math.floor(p.y / PARTICLE_SIZE) * PARTICLE_SIZE;

            ctx.shadowColor = 'rgba(245, 158, 11, 0.2)';
            ctx.shadowBlur = 3;
            ctx.fillStyle = `rgba(190, 130, 35, ${alpha})`;
            ctx.fillRect(px, py, p.size, p.size);
            ctx.shadowBlur = 0;
        });

        if (particles.length > MAX_PARTICLES) particles = particles.slice(-MAX_PARTICLES);

        drawMorphBars();

        requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < BASE_PARTICLES; i++) {
        particles.push({
            ...createParticle(),
            y: Math.random() * h,
        });
    }

    draw();
}

// ============================================
// Init
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initHeroWidgets();
    initScrollReveal();
    initCursorGlow();
    initGridParallax();
    initPageCoffeeBg();
});
