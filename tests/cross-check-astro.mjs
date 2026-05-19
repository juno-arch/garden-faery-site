// Cross-check our in-app astro math (moon.html) against
// CircularNatalHoroscopeJS — a Moshier-ephemeris-backed library that's
// far more accurate than our simplified Meeus formulas. Library is a
// devDependency only; production ships the vanilla math in moon.html.
//
// Run with:  npm run test:astro
//
// Tolerance: signs must match exactly. Longitudes must agree within 2°
// (our Moon simplified Meeus is good to ~1°, our Asc formula is exact
// given GMST/obliquity precision). Anything outside tolerance fails the
// test and prints the deltas so we know what to investigate.

import fs from 'node:fs';
import path from 'node:path';
import url  from 'node:url';
// CNH-JS's bundled dist expects moment to be loaded into the registry
// before it imports moment-timezone. ESM doesn't side-effect-load that
// the same way, so we force it via createRequire.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('moment');
const cnh = require('circular-natal-horoscope-js');

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// ---------- Load our app's math out of moon.html ----------
function loadAppAstro() {
  const html   = fs.readFileSync(path.join(__dirname, '..', 'moon.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  // We need top-level consts/functions to be reachable. Wrap the script
  // in a tiny suffix that pins the exact symbols we care about onto
  // globalThis, then run via eval so the closure can see them.
  const exportSuffix = `
    ;globalThis.__app = {
      moonLongitude, ascendantLongitude, signFromLongitude, sunLongitude,
      sunSignFromDate, sunSignFromUtc, lookupCity, localToUtc, ZODIAC
    };
  `;
  // Stubs for DOM/browser globals the script touches at import time.
  globalThis.document = {
    getElementById: () => ({ value:'', textContent:'', innerHTML:'', hidden:false, classList:{add(){},remove(){},toggle(){},contains(){return false}}, addEventListener(){}, appendChild(){}, cloneNode(){return this}, childNodes:[], style:{} }),
    querySelectorAll: () => [],
    body: { classList: { toggle(){} } },
    createElement: () => ({ tagName:'', classList:{add(){},remove(){},contains(){return false}}, appendChild(){}, cloneNode(){return this}, childNodes:[], style:{}, value:'' }),
    createDocumentFragment: () => ({ appendChild(){} })
  };
  globalThis.window = { addEventListener(){} };
  globalThis.localStorage = { getItem:() => null, setItem(){}, removeItem(){} };
  globalThis.indexedDB = { open: () => ({}) };
  try { (0, eval)(script + exportSuffix); } catch (e) {
    // The script may try to run init (showApp etc.) and trip on the stubs.
    // That's fine — by the time it threw, our const definitions are loaded.
  }
  if (!globalThis.__app) throw new Error('Failed to extract app astro module from moon.html');
  return globalThis.__app;
}

// ---------- CNH-JS adapter ----------
// CNH-JS takes LOCAL time + lat/lon and auto-derives the timezone via
// tz-lookup. So we just parse the date/time strings as local and hand
// them over — no need to override the internal utcTime moment.
function libChart(date, time, lat, lon) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm]  = time.split(':').map(Number);
  const origin = new cnh.Origin({
    year:   y,
    month:  m - 1,         // CNH-JS uses 0-based months
    date:   d,
    hour:   hh,
    minute: mm,
    latitude:  lat,
    longitude: lon
  });
  const horoscope = new cnh.Horoscope({ origin, houseSystem: 'whole-sign', zodiac: 'tropical' });
  return {
    sun:  horoscope.CelestialBodies.sun.ChartPosition.Ecliptic.DecimalDegrees,
    moon: horoscope.CelestialBodies.moon.ChartPosition.Ecliptic.DecimalDegrees,
    asc:  horoscope.Ascendant.ChartPosition.Ecliptic.DecimalDegrees
  };
}

// ---------- Test battery ----------
// All times are LOCAL to the given lat/lon (matches how a user enters birth
// info in the app). Spans hemispheres, latitudes (19°N tropical → 59°N
// high-latitude), historical timezones, leap years, and Sun-cusp days.
const CASES = [
  { name: 'Pollen — Jan 1 1993 14:14 Gainesville',      date:'1993-01-01', time:'14:14', tz:'America/New_York',     lat: 29.65, lon: -82.34 },
  { name: 'Einstein — Mar 14 1879 11:30 Ulm',           date:'1879-03-14', time:'11:30', tz:'Europe/Berlin',        lat: 48.40, lon:   9.99 },
  { name: 'Frida Kahlo — Jul 6 1907 08:30 CDMX',        date:'1907-07-06', time:'08:30', tz:'America/Mexico_City',  lat: 19.43, lon: -99.13 },
  { name: 'Sydney summer — Dec 25 2010 12:00',          date:'2010-12-25', time:'12:00', tz:'Australia/Sydney',     lat:-33.87, lon: 151.21 },
  { name: 'Stockholm midnight sun — Jun 21 1995 00:00', date:'1995-06-21', time:'00:00', tz:'Europe/Stockholm',     lat: 59.33, lon:  18.07 },
  { name: 'NYC noon Jul 4 1976',                        date:'1976-07-04', time:'12:00', tz:'America/New_York',     lat: 40.71, lon: -74.01 },
  { name: 'Tokyo dawn Mar 11 2011',                     date:'2011-03-11', time:'06:00', tz:'Asia/Tokyo',           lat: 35.68, lon: 139.69 },
  { name: 'London evening leap Feb 29 2000',            date:'2000-02-29', time:'21:30', tz:'Europe/London',        lat: 51.51, lon:  -0.13 },
  { name: 'Buenos Aires winter Aug 15 1982',            date:'1982-08-15', time:'09:30', tz:'America/Argentina/Buenos_Aires', lat:-34.61, lon: -58.40 },
  // Sun-sign boundary stress (just before / just after Aries cusp)
  { name: 'Sun cusp — Mar 20 2024 22:00 NYC (Aries)',   date:'2024-03-20', time:'22:00', tz:'America/New_York',     lat: 40.71, lon: -74.01 },
  { name: 'Sun cusp — Mar 21 2024 00:00 NYC (Aries)',   date:'2024-03-21', time:'00:00', tz:'America/New_York',     lat: 40.71, lon: -74.01 }
];

// ---------- Utilities ----------
const SIGN_NAMES = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const signOf  = (deg) => SIGN_NAMES[Math.floor(((deg % 360) + 360) % 360 / 30)];
const degIn   = (deg) => ((deg % 30) + 30) % 30;
const wrap    = (deg) => ((deg % 360) + 360) % 360;
const angDelta = (a, b) => { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

// ---------- App loader ----------
const app = loadAppAstro();

// ---------- Run the battery ----------
const SIGN_TOL_DEG  = 0.0;   // sign must always match
const MOON_TOL_DEG  = 1.0;   // expanded-Meeus moon now agrees to <0.5° typically
const SUN_TOL_DEG   = 0.5;   // real-ephemeris sun is exact to <0.1°
const ASC_TOL_DEG   = 2.0;   // pre-1900 timezone conventions (LMT vs zone time)
                             // can shift the historical IST/GMST baseline by
                             // a few arcminutes — sign match is what matters

let pass = 0, fail = 0;
const failures = [];

for (const c of CASES) {
  const lib = libChart(c.date, c.time, c.lat, c.lon);
  const utc = app.localToUtc(c.date, c.time, c.tz);

  // The app uses sunSignFromUtc when time is available — match that
  const mySun  = app.sunSignFromUtc(utc);
  const myMoon = app.signFromLongitude(app.moonLongitude(utc));
  const myMoonLon = app.moonLongitude(utc);
  const myAsc  = app.ascendantLongitude(utc, c.lon, c.lat);
  const myAscSign = app.signFromLongitude(myAsc);

  const libSunSign  = signOf(lib.sun);
  const libMoonSign = signOf(lib.moon);
  const libAscSign  = signOf(lib.asc);

  const sunOk    = mySun.name === libSunSign;
  const moonOk   = myMoon.name === libMoonSign && angDelta(myMoonLon, lib.moon) <= MOON_TOL_DEG;
  const ascOk    = myAscSign.name === libAscSign && angDelta(myAsc, lib.asc)  <= ASC_TOL_DEG;
  const allOk    = sunOk && moonOk && ascOk;

  if (allOk) pass++; else fail++;

  console.log((allOk ? '✓ ' : '✗ ') + c.name);
  console.log('    sun  app=' + mySun.name.padEnd(11)        + ' lib=' + libSunSign.padEnd(11)  + ' Δ=—            ' + (sunOk ? 'ok' : 'MISMATCH'));
  console.log('    moon app=' + myMoon.name.padEnd(11)       + ' lib=' + libMoonSign.padEnd(11) + ' Δ=' + angDelta(myMoonLon, lib.moon).toFixed(2).padStart(5) + '°  (lon: app ' + myMoonLon.toFixed(1) + '° / lib ' + lib.moon.toFixed(1) + '°)  ' + (moonOk ? 'ok' : 'MISMATCH'));
  console.log('    asc  app=' + myAscSign.name.padEnd(11)    + ' lib=' + libAscSign.padEnd(11)  + ' Δ=' + angDelta(myAsc,     lib.asc ).toFixed(2).padStart(5) + '°  (lon: app ' + myAsc.toFixed(1)     + '° / lib ' + lib.asc.toFixed(1)  + '°)  ' + (ascOk  ? 'ok' : 'MISMATCH'));
  if (!allOk) failures.push(c.name);
}

console.log('');
console.log('=== Summary ===');
console.log('  pass: ' + pass + ' / ' + CASES.length);
console.log('  fail: ' + fail);
if (fail) {
  console.log('  failing cases:');
  failures.forEach(n => console.log('    - ' + n));
  process.exit(1);
}
