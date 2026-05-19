// Cross-check our in-app cycle math (moon.html) against `sympto` — the
// algorithmic kernel of the drip app, encoding the Sensiplan sympto-thermal
// NFP protocol (peer-reviewed efficacy ~1.8%/year typical-use). sympto is a
// devDependency only; production ships nothing from it.
//
// What this exercises:
//   - Our predicted ovulation day vs sympto's inferred ovulation
//     (from temperature shift + mucus peak)
//   - Our naive fertile window (day 11–17 fixed) vs sympto's
//     periOvulatory phase boundaries (which are derived from the
//     user's actual logged observations)
//
// Run with:  npm run test:cycle
//
// Note: AGPL-3.0 license on sympto means we MUST NOT link or bundle it
// at runtime. This file is dev-time only.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sympto = require('sympto');

// ---------- Fixtures: 4 synthetic cycles, varying real ovulation day ----------
// Each fixture is one cycle's worth of daily observations. Sympto infers the
// fertile window from temperature shifts + mucus peaks; we predict it as
// "day 14 ± 3" regardless of cycle length.
//
// Mucus scale (matches sympto's example):
//   0 = dry, 1 = sticky, 2 = creamy, 3 = watery, 4 = egg-white (peak fertile)
// Bleeding scale: 0 = none, 1 = spotting, 2 = light/medium, 3 = heavy.

function makeCycle(label, periodStart, observations) {
  // observations: array of [dayOffset, temp, mucus, bleeding]
  const start = new Date(periodStart + 'T00:00:00Z');
  return {
    label,
    periodStart,
    cycle: observations.map(([d, temp, mucus, bleeding]) => {
      const day = new Date(start.getTime() + d * 86400000);
      const date = day.toISOString().slice(0, 10);
      const entry = { date, temperature: temp };
      if (mucus !== null) entry.mucus = mucus;
      if (bleeding) entry.bleeding = bleeding;
      return entry;
    })
  };
}

const fixtures = [
  // Classic 28-day cycle, ovulation day 14 (temp shift confirmed days 14→17)
  makeCycle('28-day classic, ovu day 14', '2024-01-01', [
    [0,  36.40, null, 3],
    [1,  36.45, null, 3],
    [2,  36.42, null, 2],
    [3,  36.48, null, 1],
    [4,  36.50, 0,    0],
    [5,  36.45, 1,    0],
    [6,  36.50, 2,    0],
    [7,  36.48, 2,    0],
    [8,  36.50, 3,    0],
    [9,  36.45, 3,    0],
    [10, 36.50, 4,    0],
    [11, 36.48, 4,    0],
    [12, 36.55, 4,    0],
    [13, 36.50, 4,    0],
    [14, 36.85, 3,    0],   // peak mucus day 13, temp shift starts day 14
    [15, 36.90, 2,    0],
    [16, 36.85, 1,    0],
    [17, 36.90, 1,    0],
    [18, 36.95, 1,    0],
    [19, 36.90, 0,    0],
    [20, 36.95, 0,    0],
    [21, 36.85, 0,    0],
    [22, 36.90, 0,    0],
    [23, 36.85, 0,    0],
    [24, 36.85, 0,    0],
    [25, 36.80, 0,    0],
    [26, 36.75, 0,    0],
    [27, 36.55, 0,    0]
  ]),

  // 32-day cycle, late ovulation day 18 (our day-14 prediction will be early)
  makeCycle('32-day cycle, ovu day 18', '2024-02-05', [
    [0,  36.40, null, 3],
    [1,  36.45, null, 3],
    [2,  36.40, null, 2],
    [3,  36.45, null, 1],
    [4,  36.42, 0,    0],
    [5,  36.45, 1,    0],
    [6,  36.40, 1,    0],
    [7,  36.45, 2,    0],
    [8,  36.50, 2,    0],
    [9,  36.45, 3,    0],
    [10, 36.50, 3,    0],
    [11, 36.45, 3,    0],
    [12, 36.50, 4,    0],
    [13, 36.45, 4,    0],
    [14, 36.50, 4,    0],
    [15, 36.50, 4,    0],
    [16, 36.55, 4,    0],
    [17, 36.50, 4,    0],   // peak day 17
    [18, 36.85, 3,    0],   // temp shift day 18
    [19, 36.90, 2,    0],
    [20, 36.95, 1,    0],
    [21, 36.90, 1,    0],
    [22, 36.95, 0,    0],
    [23, 36.90, 0,    0],
    [24, 36.95, 0,    0],
    [25, 36.85, 0,    0],
    [26, 36.85, 0,    0],
    [27, 36.80, 0,    0],
    [28, 36.85, 0,    0],
    [29, 36.80, 0,    0],
    [30, 36.75, 0,    0],
    [31, 36.55, 0,    0]
  ]),

  // 25-day cycle, early ovulation day 11 (our day-14 prediction will be LATE)
  makeCycle('25-day cycle, ovu day 11', '2024-03-08', [
    [0,  36.40, null, 3],
    [1,  36.40, null, 2],
    [2,  36.45, null, 2],
    [3,  36.42, 1,    1],
    [4,  36.45, 2,    0],
    [5,  36.50, 3,    0],
    [6,  36.45, 3,    0],
    [7,  36.50, 4,    0],
    [8,  36.48, 4,    0],
    [9,  36.50, 4,    0],
    [10, 36.45, 4,    0],   // peak day 10
    [11, 36.85, 3,    0],   // temp shift day 11
    [12, 36.90, 2,    0],
    [13, 36.95, 1,    0],
    [14, 36.90, 1,    0],
    [15, 36.95, 0,    0],
    [16, 36.85, 0,    0],
    [17, 36.90, 0,    0],
    [18, 36.85, 0,    0],
    [19, 36.85, 0,    0],
    [20, 36.80, 0,    0],
    [21, 36.85, 0,    0],
    [22, 36.80, 0,    0],
    [23, 36.75, 0,    0],
    [24, 36.55, 0,    0]
  ]),

  // 30-day cycle, ovulation day 16 (only mildly off from day-14)
  makeCycle('30-day cycle, ovu day 16', '2024-04-04', [
    [0,  36.40, null, 3],
    [1,  36.45, null, 3],
    [2,  36.40, null, 2],
    [3,  36.45, null, 1],
    [4,  36.45, 0,    0],
    [5,  36.50, 1,    0],
    [6,  36.45, 2,    0],
    [7,  36.50, 2,    0],
    [8,  36.45, 3,    0],
    [9,  36.50, 3,    0],
    [10, 36.45, 3,    0],
    [11, 36.50, 4,    0],
    [12, 36.45, 4,    0],
    [13, 36.50, 4,    0],
    [14, 36.45, 4,    0],
    [15, 36.50, 4,    0],   // peak day 15
    [16, 36.85, 3,    0],   // temp shift day 16
    [17, 36.90, 2,    0],
    [18, 36.95, 1,    0],
    [19, 36.85, 0,    0],
    [20, 36.90, 0,    0],
    [21, 36.85, 0,    0],
    [22, 36.90, 0,    0],
    [23, 36.85, 0,    0],
    [24, 36.85, 0,    0],
    [25, 36.80, 0,    0],
    [26, 36.85, 0,    0],
    [27, 36.80, 0,    0],
    [28, 36.75, 0,    0],
    [29, 36.55, 0,    0]
  ])
];

// ---------- Adapters ----------
function dayIndexOf(dateStr, periodStart) {
  const a = new Date(dateStr + 'T00:00:00Z');
  const b = new Date(periodStart + 'T00:00:00Z');
  return Math.round((a - b) / 86400000) + 1; // cycle day, 1-indexed
}

function symptoPrediction(fixture) {
  const result = sympto({ cycle: fixture.cycle });
  // Sympto's "ovulation" = first high temp measurement day (post-shift confirmation)
  // The periOvulatory phase = fertile window per Sensiplan
  const ts = result.temperatureShift;
  const ms = result.mucusShift;
  const periOvu = result.phases?.periOvulatory;
  const ovuDate = ts?.firstHighMeasurementDay?.date || ms?.mucusPeak?.date;
  return {
    ovulationDay: ovuDate ? dayIndexOf(ovuDate, fixture.periodStart) : null,
    fertileStart: periOvu ? dayIndexOf(periOvu.start.date, fixture.periodStart) : null,
    fertileEnd:   periOvu ? dayIndexOf(periOvu.end.date,   fixture.periodStart) : null,
    mucusPeakDay: ms?.mucusPeak ? dayIndexOf(ms.mucusPeak.date, fixture.periodStart) : null
  };
}

// Our app's current naive prediction (matches the cal-feed feed at
// pb_hooks/moon-ics.pb.js + moon.html fertileStatusToday)
function appPrediction(fixture) {
  // ovulation = period start + 13 days (i.e. cycle day 14)
  // fertile window = days 11 → 17 (3 days each side)
  return {
    ovulationDay: 14,
    fertileStart: 11,
    fertileEnd: 17
  };
}

// ---------- Run ----------
let allOk = true;
console.log('=== Cycle math cross-check: app naive vs sympto ===\n');

const summary = [];
for (const f of fixtures) {
  const lib = symptoPrediction(f);
  const app = appPrediction(f);
  const ovuDelta = (app.ovulationDay != null && lib.ovulationDay != null)
    ? Math.abs(app.ovulationDay - lib.ovulationDay)
    : null;
  summary.push({ label: f.label, app, lib, ovuDelta });

  console.log('  ' + f.label);
  console.log('    app says:    ovulation day ' + app.ovulationDay + ', fertile days ' + app.fertileStart + '–' + app.fertileEnd);
  console.log('    sympto says: ovulation day ' + (lib.ovulationDay ?? '—') + ', fertile days ' + (lib.fertileStart ?? '—') + '–' + (lib.fertileEnd ?? '—') + '  (mucus peak day ' + (lib.mucusPeakDay ?? '—') + ')');
  if (ovuDelta != null) {
    console.log('    Δ ovulation:  ' + ovuDelta + ' day' + (ovuDelta === 1 ? '' : 's') + (ovuDelta === 0 ? '  ✓ in agreement' : '  ⚠ app prediction off'));
  }
  console.log('');
}

// Summary table
console.log('=== Summary ===');
console.log('  cycle                              | app ovu | sympto ovu | Δ days | meaning');
console.log('  ---------------------------------- | ------- | ---------- | ------ | -------');
for (const r of summary) {
  const meaning = r.ovuDelta === 0 ? 'app correct'
                : r.ovuDelta == null ? 'sympto inconclusive'
                : r.ovuDelta <= 1 ? 'close enough'
                : 'app meaningfully wrong';
  console.log('  ' + r.label.padEnd(34) + ' |    ' +
              String(r.app.ovulationDay).padStart(3) + '  |     ' +
              String(r.lib.ovulationDay ?? '—').padStart(3) + '    |   ' +
              String(r.ovuDelta ?? '—').padStart(3) + '  | ' + meaning);
}

console.log('');
console.log('Interpretation: the app currently predicts ovulation on cycle day 14 for');
console.log('every user. For 28-day cycles that\'s right; for longer or shorter cycles');
console.log('the prediction is off by the deviation from 28. The biologically accurate');
console.log('formula is "ovulation = next-period-start MINUS 14" — the luteal phase');
console.log('is consistent (~14 days), the follicular varies.');
