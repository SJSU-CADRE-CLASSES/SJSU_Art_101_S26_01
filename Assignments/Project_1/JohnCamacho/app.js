/* The Radius of My Life – SPA (no frameworks) */

const COLORS = {
  you: '#B9162A',
  dad: '#1EA178',
  bro: '#BDBDBD',
};

const DISPLAY_LABELS = {
  you: 'Me',
  dad: 'Father',
  bro: 'Brother',
};

const PERSON_ORDER = ['you', 'dad', 'bro'];

const state = {
  view: 'intro', // intro | you | compare | insights
  groupBy: 'day', // day | week
  selectedPeople: ['you'],
  focusedKey: null,
  data: null,
  daysByPerson: {},
  weeksByPerson: {},
  dateKeys: [],
  weekKeys: [],
  sidebarCollapsed: false,
  chart: null,
  detailSelection: null,
  showStatement: false,
};

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <div class="app-shell">
      <div class="app-header">
        <div class="app-header-title">
          <h1>The Radius of My Life</h1>
        </div>
        <div class="app-header-nav">
          <button class="btn btn-ghost" data-nav="intro">Intro</button>
          <button class="btn btn-ghost" data-nav="you">Me</button>
          <button class="btn btn-ghost" data-nav="compare">Compare</button>
          <button class="btn btn-ghost" data-nav="insights">Insights</button>
        </div>
      </div>
      <div class="app-main">
        <div class="sidebar-toggle"><button type="button" data-toggle-sidebar>☰ Panel</button></div>
        <aside class="sidebar collapsed" id="sidebar"></aside>
        <main class="view-container" id="view-container"></main>
      </div>
      <footer class="app-footer">
        <span>Data: Life360 summaries (generalized)</span>
        <span><a data-open-statement>Project Statement</a></span>
      </footer>
    </div>
  `;

  try {
    const res = await fetch('data/daily_minutes.json');
    const json = await res.json();
    state.data = json;
    preprocessData(json);
  } catch (e) {
    console.error('Failed to load data', e);
    state.data = null;
  }

  attachGlobalEvents();
  render();
}

/* ---------- Data preprocessing ---------- */

function preprocessData(payload) {
  const people = payload.people || [];

  let start = payload.meta?.dateRange?.[0];
  let end = payload.meta?.dateRange?.[1];
  if (!start || !end) {
    let allDates = [];
    people.forEach((p) => {
      (p.days || []).forEach((d) => allDates.push(d.date));
    });
    if (allDates.length) {
      allDates.sort();
      start = allDates[0];
      end = allDates[allDates.length - 1];
    }
  }
  const dateKeys = buildDateRange(start, end);
  state.dateKeys = dateKeys;

  const daysByPerson = {};
  people.forEach((p) => {
    daysByPerson[p.id] = normalizeDaysForPerson(p, dateKeys);
  });
  state.daysByPerson = daysByPerson;

  const weeksInfo = aggregateWeeks(daysByPerson);
  state.weeksByPerson = weeksInfo.weeksByPerson;
  state.weekKeys = weeksInfo.weekKeys;
}

function buildDateRange(startStr, endStr) {
  const dates = [];
  if (!startStr || !endStr) return dates;
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function normalizeDaysForPerson(person, dateKeys) {
  const byDate = {};
  (person.days || []).forEach((d) => {
    byDate[d.date] = {
      dateKey: d.date,
      minutes: Number(d.minutes) || 0,
      trips: Number(d.trips) || 0,
      missing: false,
    };
  });

  return dateKeys.map((dk) => {
    const existing = byDate[dk];
    const dateObj = new Date(dk + 'T00:00:00');
    if (existing) return { ...existing, dateObj };
    return { dateKey: dk, minutes: 0, trips: 0, missing: true, dateObj };
  });
}

function aggregateWeeks(daysByPerson) {
  const weeksByPerson = {};
  const allWeeksSet = new Set();

  for (const [id, days] of Object.entries(daysByPerson)) {
    const byWeekKey = {};
    days.forEach((d) => {
      const { year, week } = isoWeek(d.dateObj);
      const wkKey = `${year}-W${String(week).padStart(2, '0')}`;
      allWeeksSet.add(wkKey);
      if (!byWeekKey[wkKey]) {
        byWeekKey[wkKey] = {
          weekKey: wkKey,
          year,
          week,
          minutes: 0,
          trips: 0,
          days: [],
          missing: true,
        };
      }
      const bucket = byWeekKey[wkKey];
      bucket.minutes += d.minutes;
      bucket.trips += d.trips;
      bucket.days.push(d);
      if (!d.missing && d.minutes > 0) bucket.missing = false;
    });
    weeksByPerson[id] = Object.values(byWeekKey).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
  }

  return {
    weeksByPerson,
    weekKeys: Array.from(allWeeksSet).sort(),
  };
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

/* ---------- Stats & insights ---------- */

function computeStatsForPeople(ids, mode) {
  const result = {};
  ids.forEach((id) => {
    const segments = mode === 'day' ? state.daysByPerson[id] || [] : state.weeksByPerson[id] || [];
    if (!segments.length) {
      result[id] = {
        totalMinutes: 0,
        totalTrips: 0,
        avgMinutes: 0,
        maxMinutes: 0,
        maxKey: null,
      };
      return;
    }
    let totalMinutes = 0;
    let totalTrips = 0;
    let maxMinutes = 0;
    let maxKey = null;

    segments.forEach((seg) => {
      totalMinutes += seg.minutes;
      totalTrips += seg.trips;
      if (seg.minutes > maxMinutes) {
        maxMinutes = seg.minutes;
        maxKey = mode === 'day' ? seg.dateKey : seg.weekKey;
      }
    });

    const count = segments.length;
    result[id] = {
      totalMinutes,
      totalTrips,
      avgMinutes: count ? totalMinutes / count : 0,
      maxMinutes,
      maxKey,
    };
  });
  return result;
}

function generateInsights() {
  const ids = PERSON_ORDER;
  const statsDay = computeStatsForPeople(ids, 'day');
  const totalMinutes = {};
  ids.forEach((id) => (totalMinutes[id] = statsDay[id].totalMinutes || 0));
  const totalAll = ids.reduce((acc, id) => acc + totalMinutes[id], 0) || 1;

  const meTotal = totalMinutes.you;
  const fatherTotal = totalMinutes.dad;
  const brotherTotal = totalMinutes.bro;

  const mePct = Math.round((meTotal / totalAll) * 100);
  const fatherPct = Math.round((fatherTotal / totalAll) * 100);
  const brotherPct = Math.round((brotherTotal / totalAll) * 100);

  const lines = [];

  lines.push(
    `Over this two‑week slice, **Me** accounts for about **${mePct}%** of all household driving minutes, compared to **Father** at **${fatherPct}%** and **Brother** at **${brotherPct}%**.`,
  );

  if (statsDay.you.maxKey) {
    lines.push(
      `My heaviest driving day in this window was **${statsDay.you.maxKey}**, where I spent **${statsDay.you.maxMinutes} minutes** in the car.`,
    );
  }

  if (statsDay.dad.maxKey) {
    lines.push(
      `Father’s heaviest day on record here is **${statsDay.dad.maxKey}** with **${statsDay.dad.maxMinutes} minutes**, a clear spike that rises well above my own bar on that date.`,
    );
  }

  if (statsDay.bro.maxKey) {
    lines.push(
      `Brother peaks on **${statsDay.bro.maxKey}** at **${statsDay.bro.maxMinutes} minutes** — fewer total minutes than Father, but often packed into intense clusters of trips.`,
    );
  }

  const avgDay = {};
  ids.forEach((id) => (avgDay[id] = Math.round(statsDay[id].avgMinutes || 0)));

  lines.push(
    `On an average day across this window, I drive about **${avgDay.you} minutes**, while Father averages **${avgDay.dad} minutes** and Brother averages **${avgDay.bro} minutes**.`,
  );

  if (meTotal > fatherTotal) {
    lines.push(
      `Even though Father often drives farther in single bursts, my cumulative minutes slightly **outweigh his**, suggesting my driving load is built from many smaller or more frequent outings.`,
    );
  } else {
    lines.push(
      `Father’s total minutes comfortably exceed mine, which means his pattern on the chart consistently rises above mine — my days feel more tightly centered, with only occasional spikes on my busiest dates.`,
    );
  }

  lines.push(
    `Taken together, this portrait shows how three people share overlapping geography but experience very different scales of motion: one steady commuter (Father), one burst‑driven explorer (Brother), and Me, oscillating between quiet weeks and sudden bursts on the chart.`,
  );

  return lines;
}

function generateSelectionInsights(focusKey, mode, selectedIds) {
  const rows =
    mode === 'day'
      ? selectedIds.map((id) => {
          const arr = state.daysByPerson[id] || [];
          const match = arr.find((d) => d.dateKey === focusKey);
          return { id, minutes: match ? match.minutes : 0, trips: match ? match.trips : 0 };
        })
      : selectedIds.map((id) => {
          const arr = state.weeksByPerson[id] || [];
          const match = arr.find((w) => w.weekKey === focusKey);
          return { id, minutes: match ? match.minutes : 0, trips: match ? match.trips : 0 };
        });

  rows.sort((a, b) => b.minutes - a.minutes);
  const top = rows[0];

  const lines = [];
  if (!top) return lines;

  const label = personLabel(top.id);
  const unit = mode === 'day' ? 'day' : 'week';

  lines.push(
    `${focusKey} is a strong **${unit}** for ${label}, with **${top.minutes} minutes** and **${top.trips} trips**, the highest among the selected drivers.`,
  );

  const spread = rows.map((r) => r.minutes);
  const min = Math.min(...spread);
  const max = Math.max(...spread);
  if (max - min > 60) {
    lines.push(
      `The spread between the heaviest and lightest driver on this ${unit} is over an hour, indicating very different driving experiences on the same calendar ${unit}.`,
    );
  } else if (max - min < 15) {
    lines.push(
      `All selected drivers are relatively close in minutes on this ${unit}, suggesting a more shared pattern of motion.`,
    );
  }

  return lines;
}

function personLabel(id) {
  return DISPLAY_LABELS[id] || id;
}

/* ---------- Router / rendering ---------- */

function attachGlobalEvents() {
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) {
      e.preventDefault();
      const v = nav.getAttribute('data-nav');
      if (!v) return;
      state.view = v;

      if (v === 'you') state.selectedPeople = ['you'];
      if (v === 'compare' && (!state.selectedPeople || !state.selectedPeople.length)) {
        state.selectedPeople = ['you'];
      }

      state.detailSelection = null;

      render();
      return;
    }

    const toggleBtn = e.target.closest('[data-toggle-sidebar]');
    if (toggleBtn) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
      }
      return;
    }

    if (e.target.matches('[data-open-statement]')) {
      e.preventDefault();
      state.showStatement = true;
      render();
    }
  });
}

function render() {
  const container = document.getElementById('view-container');
  const sidebar = document.getElementById('sidebar');
  container.innerHTML = '';
  sidebar.innerHTML = '';

  if (state.view === 'intro') {
    sidebar.classList.add('collapsed');
  } else if (state.view === 'you' || state.view === 'compare') {
    sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
    sidebar.innerHTML = getSidebarHtml();
  } else {
    sidebar.classList.add('collapsed');
  }

  let viewHtml = '';
  if (state.view === 'intro') viewHtml = renderIntroView();
  else if (state.view === 'you') viewHtml = renderYouView();
  else if (state.view === 'compare') viewHtml = renderCompareView();
  else if (state.view === 'insights') viewHtml = renderInsightsView();

  container.innerHTML = viewHtml;
  const active = container.querySelector('.view');
  if (active) active.classList.add('active');

  bindViewEvents();

  if (state.showStatement) showProjectStatementModal();
  else removeProjectStatementModal();
}

function getSidebarHtml() {
  const ids = state.view === 'you' ? ['you'] : PERSON_ORDER;
  const stats = computeStatsForPeople(ids, state.groupBy);
  const maxTotal = Math.max(...ids.map((id) => stats[id].totalMinutes || 0), 1);
  const modeLabel = state.groupBy === 'day' ? 'per Day' : 'per Week';

  return `
    <section class="sidebar-section">
      <h3>Drivers</h3>
      <div class="person-toggle-list">
        ${ids
          .map((id) => {
            const checked = state.selectedPeople.includes(id) ? 'checked' : '';
            const disabled = state.view === 'you' && id !== 'you' ? 'disabled' : '';
            return `
            <label class="person-toggle">
              <span class="person-dot ${id}"></span>
              <input type="checkbox" data-person-toggle="${id}" ${checked} ${disabled} />
              <span>${personLabel(id)}</span>
            </label>`;
          })
          .join('')}
      </div>
    </section>
    <section class="sidebar-section">
      <h3>View Mode</h3>
      <div class="toggle-row">
        <button type="button" class="toggle-chip ${state.groupBy === 'day' ? 'active' : ''}" data-group-by="day">Day</button>
        <button type="button" class="toggle-chip ${state.groupBy === 'week' ? 'active' : ''}" data-group-by="week">Week</button>
      </div>
    </section>
    <section class="sidebar-section">
      <h3>Quick Stats (${modeLabel})</h3>
      <div class="stats-list">
        ${ids
          .map((id) => {
            const s = stats[id];
            const pct = Math.round((s.totalMinutes / maxTotal) * 100);
            return `
            <div class="stat-item">
              <div class="stat-label-row">
                <span class="stat-label">${personLabel(id)}</span>
                <span class="stat-value">${Math.round(s.totalMinutes)} min</span>
              </div>
              <div class="stat-bar">
                <div class="stat-bar-fill" style="width:${pct}%"></div>
              </div>
            </div>`;
          })
          .join('')}
      </div>
    </section>
  `;
}

/* ---------- Views ---------- */

function renderIntroView() {
  return `
    <section class="view view-intro">
      <div>
        <div class="intro-title">The Radius of My Life</div>
        <p class="intro-subtitle">
          A two‑week chart of how far my world actually spreads, and how my driving pattern stacks up against Father and Brother.
        </p>
        <div style="margin-top:1.5rem;display:flex;justify-content:center;gap:0.75rem;">
          <button class="btn btn-primary" data-nav="you">Enter</button>
        </div>
        <div class="intro-footer">
          Data source: Life360 summaries (generalized locations)
        </div>
      </div>
    </section>
  `;
}

function renderYouView() {
  return `
    <section class="view view-you">
      <article class="narrative-panel">
        <h2>My driving pattern</h2>
        <p>
          This view isolates my own driving minutes. The bars in the chart show how much time I spend in the car each
          day or week, revealing quiet stretches versus sudden spikes of activity.
        </p>
      </article>
      <section class="chart-panel">
        <header class="chart-header">
          <span class="chart-header-title">Daily minutes in the car (${state.groupBy === 'day' ? 'Day view' : 'Week view'})</span>
          <div class="chart-legend">
            <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:999px;background:${COLORS.you};"></span> Me</span>
          </div>
        </header>
        <canvas id="timeChart"></canvas>
        <small style="color:var(--muted);font-size:0.7rem;">Click a bar to focus that day/week and see detailed stats.</small>
      </section>
      <div style="grid-column:1 / -1;display:flex;justify-content:space-between;gap:0.5rem;margin-top:0.2rem;">
        <button class="btn btn-ghost" data-nav="intro">Back to Intro</button>
        <button class="btn btn-primary" data-nav="compare">Next: Compare</button>
      </div>
    </section>
  `;
}

function renderCompareView() {
  return `
    <section class="view view-compare">
      <article class="narrative-panel">
        <h2>Comparing our patterns</h2>
        <p>
          Here the bars for Me, Father, and Brother overlap in a single chart. On some days, Father’s commuting load
          dominates; on others, my own shorter trips stack up. Toggle drivers and switch between Day/Week to see whose
          minutes spike, who stays steady, and how our patterns line up.
        </p>
      </article>
      <section class="chart-panel">
        <header class="chart-header">
          <span class="chart-header-title">
            ${state.groupBy === 'day' ? 'Daily minutes' : 'Weekly minutes'} for selected drivers
          </span>
          <div class="chart-legend">
            ${PERSON_ORDER.map(
              (id) =>
                `<span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:999px;background:${COLORS[id]};"></span> ${personLabel(
                  id,
                )}</span>`,
            ).join(' ')}
          </div>
        </header>
        <canvas id="timeChart"></canvas>
        <small style="color:var(--muted);font-size:0.7rem;">Click a bar to focus a day/week and see how each person’s minutes compare.</small>
      </section>
      <div style="grid-column:1 / -1;display:flex;justify-content:space-between;gap:0.5rem;margin-top:0.2rem;">
        <button class="btn btn-ghost" data-nav="you">Back</button>
        <button class="btn btn-primary" data-nav="insights">Next: Insights</button>
      </div>
    </section>
  `;
}

function renderInsightsView() {
  const ids = PERSON_ORDER;
  const statsDay = computeStatsForPeople(ids, 'day');
  const insights = generateInsights();

  const metricsRows = ids
    .map((id) => {
      const s = statsDay[id];
      return `<tr><td>${personLabel(id)}</td><td>${s.totalMinutes}</td><td>${s.totalTrips}</td><td>${s.maxKey || '—'}</td><td>${Math.round(
        s.avgMinutes,
      )}</td></tr>`;
    })
    .join('');

  return `
    <section class="view view-insights">
      <div class="insights-columns">
        <article class="card">
          <h3>Story beats from the data</h3>
          <ol style="padding-left:1.2rem;font-size:0.85rem;color:var(--muted);">
            ${insights.map((l) => `<li style="margin-bottom:0.35rem;">${l}</li>`).join('')}
          </ol>
        </article>
        <article class="card">
          <h3>Key metrics summary</h3>
          <table class="table">
            <thead>
              <tr>
                <th>Person</th><th>Total min</th><th>Total trips</th><th>Peak day</th><th>Avg min/day</th>
              </tr>
            </thead>
            <tbody>
              ${metricsRows}
            </tbody>
          </table>
        </article>
      </div>
      <div style="display:flex;justify-content:space-between;gap:0.5rem;margin-top:0.5rem;">
        <button class="btn btn-ghost" data-nav="compare">Back</button>
        <button class="btn btn-primary" data-nav="intro">Restart</button>
      </div>
    </section>
  `;
}

/* ---------- Project statement modal ---------- */

function showProjectStatementModal() {
  removeProjectStatementModal();
  const div = document.createElement('div');
  div.className = 'modal-backdrop';
  div.innerHTML = `
    <div class="modal">
      <header>
        <h2>Project Statement: The Radius of My Life</h2>
        <button type="button" data-close-statement>✕</button>
      </header>
      <p>
        This project takes a small, two‑week slice of driving data and turns it into a chart‑based portrait of how my world
        expands and contracts. The dataset comes from Life360 driving summaries that record approximate minutes spent
        driving and trip counts each day. Exact locations and identifying details have been softened or removed on purpose;
        the goal is to reveal patterns of motion, not to expose specific routes.
      </p>
      <p>
        I chose two weeks because it is long enough to capture a meaningful rhythm—weekdays versus weekends, commutes,
        errands, visits home—but short enough that I can still remember what those days felt like. Within that window I
        compare three people: Me, Father, and Brother. We share the same broad geography but occupy different roles in how
        the car gets used: the steady commuter, the errand runner, the person who is sometimes passenger and sometimes
        chauffeur.
      </p>
      <p>
        The metaphor of “radius” is a way to think about how far your world actually reaches on an average day. A day with
        only a few minutes of driving barely lifts the bars off the baseline. A day full of trips stacks those bars higher
        and higher, like tracing a busier orbit across time. By plotting our minutes into daily and weekly bars, the
        visualization makes it easy to see whose life tends to be more spread out and whose remains closer to home.
      </p>
      <p>
        Interactions in the interface are meant to support reflection rather than raw analytics. Toggling drivers on and
        off, switching between day and week, and clicking bars to focus specific dates all reveal how our driving patterns
        align or drift apart. Small details, like missing days being marked as uncaptured rather than zero, are reminders
        that any dataset is partial: sometimes we simply forgot to record, or the app mis‑logged a drive.
      </p>
      <p>
        For me, this tool is a way to notice how responsibility and independence show up in ordinary numbers. When Father’s
        totals tower over mine, it reflects how much of the household’s movement still depends on him. When my own weeks
        suddenly spike, it hints at transitions—school, work, or new routines that push me further out. Brother’s minutes
        often show up as bursts, suggesting dense pockets of activity rather than a single steady commute. Together these
        traces turn the invisible infrastructure of our lives—a shared car, shared roads, shared time—into something you
        can read at a glance.
      </p>
      <p>
        Privacy is treated seriously: there are no full names, no precise addresses, and no route‑level diagrams. The
        portrait is less about surveillance and more about understanding scale: how far we go, how often, and how those
        distances quietly define the shape of our days when plotted as simple lines and bars.
      </p>
    </div>
  `;
  document.body.appendChild(div);

  div.addEventListener('click', (e) => {
    if (e.target.matches('[data-close-statement]') || e.target === div) {
      state.showStatement = false;
      removeProjectStatementModal();
    }
  });
}

function removeProjectStatementModal() {
  const existing = document.querySelector('.modal-backdrop');
  if (existing) existing.remove();
}

/* ---------- View events ---------- */

// --- REPLACED bindViewEvents WITH DEFENSIVE VERSION ---
function bindViewEvents() {
  const el = (id) => document.getElementById(id);

  // Sidebar toggles (people + day/week) if sidebar exists
  const sidebar = document.getElementById('sidebar');
  if (sidebar && (state.view === 'you' || state.view === 'compare')) {
    const personToggles = sidebar.querySelectorAll('[data-person-toggle]');
    personToggles.forEach((input) => {
      input.onclick = null;
      input.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-person-toggle');
        if (!id) return;
        if (e.target.checked) {
          if (!state.selectedPeople.includes(id)) state.selectedPeople.push(id);
        } else {
          state.selectedPeople = state.selectedPeople.filter((x) => x !== id);
          if (state.view === 'you' && !state.selectedPeople.includes('you')) {
            state.selectedPeople = ['you'];
          }
          if (state.view === 'compare' && state.selectedPeople.length === 0) {
            state.selectedPeople = ['you'];
          }
        }
        state.detailSelection = null;
        render();
      });
    });

    const groupButtons = sidebar.querySelectorAll('[data-group-by]');
    groupButtons.forEach((btn) => {
      btn.onclick = null;
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-group-by');
        if (!mode || mode === state.groupBy) return;
        state.groupBy = mode;
        state.focusedKey = null;
        state.detailSelection = null;
        render();
      });
    });
  }

  // Optional explicit Enter / Back / Restart buttons by ID (if you add them later)
  const enterBtn = el('enterBtn');
  if (enterBtn) {
    enterBtn.onclick = () => {
      state.view = 'you';
      state.selectedPeople = ['you'];
      state.detailSelection = null;
      render();
    };
  }

  const backBtns = document.querySelectorAll('.btn-back');
  if (backBtns && backBtns.length) {
    backBtns.forEach((b) => {
      b.onclick = () => {
        state.view = 'intro';
        state.detailSelection = null;
        render();
      };
    });
  }

  const restartBtn = el('restartBtn');
  if (restartBtn) {
    restartBtn.onclick = () => {
      state.view = 'intro';
      state.selectedPeople = ['you'];
      state.focusedKey = null;
      state.detailSelection = null;
      render();
    };
  }

  // Chart click handling — only if canvas & chart exist
  const canvas = el('timeChart');
  if (canvas && state.chart) {
    canvas.onclick = null;
    canvas.addEventListener('click', (evt) => {
      try {
        const chart = state.chart;
        if (!chart || !chart.getElementsAtEventForMode) return;
        const points = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
        if (!points || !points.length) return;
        const idx = points[0].index;
        const label = chart.data.labels[idx];
        state.focusedKey = label;
        state.detailSelection = { key: label, mode: state.groupBy };
        renderDetailPopup();
      } catch (err) {
        console.warn('chart click handler error', err);
      }
    });
  }

  // Optional dedicated project statement button
  const stmtBtn = el('projectStatementBtn');
  if (stmtBtn) stmtBtn.onclick = () => {
    state.showStatement = true;
    render();
  };

  // Optional generic view-switch links
  const viewLinks = document.querySelectorAll('[data-view]');
  if (viewLinks && viewLinks.length) {
    viewLinks.forEach((link) => {
      link.onclick = (e) => {
        const v = link.dataset.view;
        if (v) {
          e.preventDefault();
          state.view = v;
          state.detailSelection = null;
          render();
        }
      };
    });
  }

  // Ensure chart is initialized for the current view
  if (state.view === 'you' || state.view === 'compare') {
    setupChart();
  }
}

/* ---------- Chart ---------- */

function setupChart() {
  const canvas = document.getElementById('timeChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const mode = state.groupBy;

  const labels = mode === 'day' ? state.dateKeys : state.weekKeys;
  const datasets = [];

  const ids = state.view === 'you' ? ['you'] : state.selectedPeople.slice();
  const segmentsByPerson = mode === 'day' ? state.daysByPerson : state.weeksByPerson;

  ids.forEach((id) => {
    const arr = segmentsByPerson[id] || [];
    const data =
      mode === 'day'
        ? labels.map((dk) => {
            const seg = arr.find((d) => d.dateKey === dk);
            return seg ? seg.minutes : 0;
          })
        : labels.map((wk) => {
            const seg = arr.find((w) => w.weekKey === wk);
            return seg ? seg.minutes : 0;
          });
    datasets.push({
      label: personLabel(id),
      data,
      backgroundColor: hexToRgba(COLORS[id], 0.7),
      borderColor: COLORS[id],
      borderWidth: 1,
      maxBarThickness: 22,
    });
  });

  if (state.chart) state.chart.destroy();

  state.chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: 'rgba(245,245,247,0.8)', maxRotation: 0, autoSkip: true },
          grid: { display: false },
        },
        y: {
          ticks: { color: 'rgba(245,245,247,0.6)' },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              return `${ctx.dataset.label}: ${ctx.parsed.y} min`;
            },
          },
        },
      },
    },
  });
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ---------- Detail popup ---------- */

function renderDetailPopup() {
  const existing = document.querySelector('.detail-popup');
  if (existing) existing.remove();
  if (!state.detailSelection) return;

  const { key, mode } = state.detailSelection;
  const ids = state.view === 'you' ? ['you'] : state.selectedPeople.slice();
  const segmentsByPerson = mode === 'day' ? state.daysByPerson : state.weeksByPerson;

  const rows = ids.map((id) => {
    const arr = segmentsByPerson[id] || [];
    const seg =
      mode === 'day'
        ? arr.find((d) => d.dateKey === key)
        : arr.find((w) => w.weekKey === key);
    return {
      id,
      label: personLabel(id),
      minutes: seg ? seg.minutes : 0,
      trips: seg ? seg.trips : 0,
      missing: seg ? !!seg.missing : true,
    };
  });

  rows.sort((a, b) => b.minutes - a.minutes);
  const insights = generateSelectionInsights(key, mode, ids);

  const div = document.createElement('div');
  div.className = 'detail-popup';
  div.innerHTML = `
    <button type="button" class="detail-popup-close">✕</button>
    <h3>${mode === 'day' ? 'Day' : 'Week'} focus: ${key}</h3>
    <table class="table" style="font-size:0.8rem;margin-bottom:0.4rem;">
      <thead>
        <tr><th>Person</th><th>Minutes</th><th>Trips</th><th></th></tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r) =>
              `<tr>
                 <td>${r.label}</td>
                 <td>${r.minutes}</td>
                 <td>${r.trips}</td>
                 <td>${r.missing ? '<span title="No data captured; treated as 0">*</span>' : ''}</td>
               </tr>`,
          )
          .join('')}
      </tbody>
    </table>
    <ul style="padding-left:1rem;margin:0;font-size:0.8rem;color:var(--muted);">
      ${insights.map((l) => `<li style="margin-bottom:0.25rem;">${l}</li>`).join('')}
    </ul>
  `;
  document.body.appendChild(div);

  div.querySelector('.detail-popup-close').addEventListener('click', () => {
    state.detailSelection = null;
    div.remove();
  });
}

