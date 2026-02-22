/**
 * Workout dataset: exercise list, log builder, and derived chart data.
 * Each weight-bearing exercise is guaranteed at least 5 log entries.
 */

export const EXERCISES = [
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

export function epley1RM(weight, reps) {
  if (reps <= 0) return weight;
  return weight * (1 + reps / 30);
}

const MIN_ENTRIES_PER_EXERCISE = 5;
const PERIOD_WEEKS = 4;
const TOTAL_WEEKS = 90;

function buildWorkoutLog() {
  const log = [];
  const state = {};
  const exerciseNames = EXERCISES.filter(e => e.useWeight).map(e => e.name);

  EXERCISES.forEach(ex => {
    if (!ex.useWeight) return;
    state[ex.name] = { reps: 9, weight: ex.startWeight || 45 };
  });

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 14);
  let plateauWeeksLeft = 0;

  for (let weekIndex = 0; weekIndex < TOTAL_WEEKS; weekIndex++) {
    if (plateauWeeksLeft > 0) {
      plateauWeeksLeft--;
    } else if (Math.random() < 0.08) {
      plateauWeeksLeft = 3 + Math.floor(Math.random() * 4);
    }
    const inPlateau = plateauWeeksLeft > 0;
    const sessionsThisWeek = inPlateau
      ? (Math.random() < 0.5 ? 0 : 1)
      : (Math.random() < 0.2 ? 0 : (Math.random() < 0.5 ? 1 : 2));

    for (let s = 0; s < sessionsThisWeek; s++) {
      const exName = exerciseNames[Math.floor(Math.random() * exerciseNames.length)];
      const st = state[exName];
      if (!st) continue;
      const date = new Date(startDate);
      date.setDate(date.getDate() + weekIndex * 7 + s * 3);
      log.push({ date: date.getTime(), exercise: exName, reps: st.reps, weight: st.weight });
      if (st.reps >= 12) {
        st.weight += Math.random() < 0.5 ? 5 : 10;
        st.reps = 9;
      } else {
        st.reps += 1;
      }
    }
  }

  let lastDate = log.length ? Math.max(...log.map(r => r.date)) : startDate.getTime();
  exerciseNames.forEach(exName => {
    const count = log.filter(r => r.exercise === exName).length;
    if (count >= MIN_ENTRIES_PER_EXERCISE) return;
    const st = state[exName];
    if (!st) return;
    for (let i = count; i < MIN_ENTRIES_PER_EXERCISE; i++) {
      lastDate += 7 * 24 * 60 * 60 * 1000;
      log.push({ date: lastDate, exercise: exName, reps: st.reps, weight: st.weight });
      if (st.reps >= 12) {
        st.weight += Math.random() < 0.5 ? 5 : 10;
        st.reps = 9;
      } else {
        st.reps += 1;
      }
    }
  });

  log.sort((a, b) => a.date - b.date);
  return log;
}

const workoutLog = buildWorkoutLog();

const periodMs = PERIOD_WEEKS * 7 * 24 * 60 * 60 * 1000;

export function getWorkoutsVsStrength() {
  const start = Math.min(...workoutLog.map(r => r.date));
  const end = Math.max(...workoutLog.map(r => r.date));
  const periods = [];
  let t = start;

  while (t < end) {
    const periodLog = workoutLog.filter(r => r.date >= t && r.date < t + periodMs);
    const sessions = periodLog.length;
    const workoutsPerWeek = sessions / PERIOD_WEEKS;
    const oneRMs = periodLog.map(r => epley1RM(r.weight, r.reps));
    const avg1RM = oneRMs.length ? oneRMs.reduce((a, b) => a + b, 0) / oneRMs.length : 0;
    periods.push({
      label: 'M' + (periods.length + 1),
      workoutsPerWeek: Math.round(workoutsPerWeek * 10) / 10,
      strengthIndex: Math.round(avg1RM)
    });
    t += periodMs;
  }

  const firstStrength = periods[0]?.strengthIndex || 50;
  periods.forEach(p => {
    p.strengthIncreasePct = firstStrength > 0
      ? Math.round(((p.strengthIndex - firstStrength) / firstStrength) * 100)
      : 0;
  });
  return periods;
}

export function get1RMByExercise() {
  const byEx = {};
  EXERCISES.forEach(e => {
    if (!e.useWeight) return;
    byEx[e.name] = [];
  });
  workoutLog.forEach(r => {
    if (byEx[r.exercise]) {
      byEx[r.exercise].push({
        sessionIndex: byEx[r.exercise].length,
        date: r.date,
        oneRM: Math.round(epley1RM(r.weight, r.reps) * 10) / 10,
        reps: r.reps,
        weight: r.weight
      });
    }
  });
  const flatBench = byEx['Flat Bench Press'];
  if (flatBench?.length) {
    const n = flatBench.length;
    const startRM = 180;
    const endRM = 225;
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 1;
      flatBench[i].oneRM = Math.round((startRM + (endRM - startRM) * t) * 10) / 10;
    }
  }
  return byEx;
}

export function getExercisesByFrequency() {
  const byEx = get1RMByExercise();
  return Object.keys(byEx)
    .map(name => {
      const arr = byEx[name];
      const max1RM = arr.length ? Math.max(...arr.map(x => x.oneRM)) : 0;
      return { name, frequency: arr.length, max1RM: Math.round(max1RM * 10) / 10 };
    })
    .sort((a, b) => a.frequency - b.frequency);
}

export const workoutsVsStrength = getWorkoutsVsStrength();
export const oneRMByExercise = get1RMByExercise();
export const exercisesByFreq = getExercisesByFrequency();
