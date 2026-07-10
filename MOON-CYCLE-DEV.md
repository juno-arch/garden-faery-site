# Moon Cycle — developer onboarding

Living doc for anyone (👋 Poppy) picking up work on the Moon Cycle period
app. This file lives at the repo root, but the app is really just three
paths here (see [Files](#files)). Everything else in the repo is other
gardenfaery.love pages.

- **Deployed at:** <https://gardenfaery.love/moon.html>
- **Repo:** <https://github.com/juno-arch/garden-faery-site>
- **Deploy path:** push to `main` → GitHub Pages rebuilds in ~60–90 s
- **Design owner:** Pollen (Taya). When something is a taste call, ask
  her before shipping — the palette + voice are load-bearing brand.

---

## What this app is

An integrative period tracker. Three strands woven into one view:

1. **Cycle** — logged periods, day logs, fertile window, hormone snapshot.
2. **Ayurveda** — vata / pitta / kapha framing on symptoms, moods, phase
   guidance, herb chips. Sourced from Usha Anandi's *Womben Wellness*
   framework + NaturaVita for wellness plan.
3. **Astrology** — moon phase, moon-in-sign, cycle × sky pairings,
   Big 3 (Sun / Moon / Rising) with birth-info form. Chani Nicholas
   framing (astrology as reflection, not prediction).

The thesis Pollen calls out repeatedly: *we are not separate from our
environment.* If you're adding a feature, ask how it touches all three
strands. Astro-only or Ayurveda-only additions tend to feel wrong.

---

## Setup

Node ≥ 18 + a static file server. No build step — `moon.html` is served
directly.

```bash
git clone git@github.com:juno-arch/garden-faery-site.git
cd garden-faery-site
npm install                          # devDeps only, no runtime deps
python3 -m http.server 8765          # or `npx serve .`, whatever you like
open http://localhost:8765/moon.html
```

Tests:

```bash
npm run test:astro    # cross-check Sun/Moon/Ascendant vs CircularNatalHoroscopeJS
npm run test:cycle    # cross-check fertile window vs sympto (Sensiplan NFP)
```

Both tests are dev-time only; the production `moon.html` ships zero
external dependencies.

---

## Files

### The moon-cycle app

| Path | Role |
|---|---|
| `moon.html` | The entire app. ~3600 lines, single file, vanilla JS + CSS + HTML. Structure inside: palette vars → CSS → login shell → app markup → giant `<script>` block with all logic. |
| `data/ayurveda/herbs.json` | 704 herbs from the Amidha database (CC-BY-4.0). Not currently wired into `moon.html` — staged for a future expansion of `PHASE_HERBS`. Attribution in `data/ayurveda/README.md`. |
| `tests/cross-check-astro.mjs` | Dev-time cross-check for astro math. Uses CircularNatalHoroscopeJS. |
| `tests/cross-check-cycle.mjs` | Dev-time cross-check for cycle math. Uses `sympto`. |
| `package.json` | devDeps for the tests. Ship nothing from here at runtime. |

### Related but SEPARATE — don't touch without asking

- `garden-faery-hub/pocketbase/pb_hooks/moon-ics.pb.js` — this is
  **outside this repo** (lives at `~/Documents/Garden-Faery/garden-faery-hub`).
  It's the PocketBase hook that serves
  `https://bookings.gardenfaery.love/moon-days.ics`, the subscribable
  calendar feed of moon + fertile days. Deployed via SSH to the Oracle
  VPS with `deploy-update.sh`. Ask Pollen before deploying it.
- The rest of `garden-faery-site/*.html` — booking system, garden
  planner, admin pages, etc. Not part of the moon app.

---

## Design conventions

These aren't taste; they're decisions Pollen has explicitly made in
session. Follow them by default.

- **No emojis, ever.** Anywhere. All iconography is inline SVG via the
  `ICON` table in `moon.html`. Zodiac glyphs (`♈`–`♓`) are the only
  unicode symbols allowed — they're astro characters, not pictographs.
- **Palette lives in `:root { --moon-* }` at the top of `<style>`.**
  Wine + terra + cream for body strand cards (`--moon-bg`, `--moon-card`,
  `--moon-pink`, `--moon-red`, `--moon-gold`). Cosmic indigo for the sky
  strand (`--moon-bg2`). Mint teal for mood / water (`--moon-teal`).
  Phase-tinted accent (`--phase-accent`) is set by JS in `render()`
  based on the user's current inner season.
- **`theme-color` meta must match the top of the gradient** (currently
  `#1d1639`). If you change the gradient, update the meta. Otherwise
  iOS Safari's chrome shows a color seam.
- **Touch targets ≥ 44 × 44** per Apple HIG. Any new interactive
  element gets `min-height: 44px` or explicit width/height.
- **No military time in user-facing copy.** Use 12-hour AM/PM. The
  storage uses 24-hour ISO but display converts.
- **Voice for astro content: Chani Nicholas–flavored.** Second person,
  present tense, body-aware, non-essentialist, journal-prompt endings.
  Never her *actual* phrases ("rhythm to be rocked," "reaper of seeds
  sown," etc. stay hers). See `SUN_READS` / `MOON_READS` / `RISING_READS`
  in `moon.html` for examples.
- **Voice for Ayurveda content: Usha Anandi–inspired.** Cyclical
  framing, dosha-aware, plain not woo. See `LEARN_CONTENT` in
  `moon.html`.
- **Non-essentialist about the cycle/moon link.** Menstruation ≠ new
  moon by default. Some people sync, most don't, and they're not
  broken. We treat it as archetypal resonance, not biology.
- **Inline styles are cleanup targets, not the pattern.** Anything
  ≥ ~80 chars of `style=""` should be a class in the CSS block.

---

## Tab structure inside `moon.html`

Six tabs, bottom-nav, each with `data-section="..."` on its cards. CSS
hides everything except the active tab.

1. **Today** — dominant view. Moon glyph, cycle day + season, hormone
   snapshot, inner-season guide (accordion), integrative daily-teach
   line ("Day 20 · Inner autumn · Moon in Gemini ♊").
2. **Calendar** — month grid with logged / projected / fertile days.
3. **Sky** — astro layer. Moon phase, moon-in-sign, cycle × sky
   alignment card, Big 3 birth chart reads.
4. **Trends** — hormone curve chart with phase-tinted bands, checkpoint
   reader, patterns.
5. **Learn** — Chani + Usha content, cyclical living, yoni steam.
6. **Settings** — subscribe URL, export (PDF / CSV / JSON backup),
   about, clear data.

`setTab(name)` toggles `body.view-{name}`. New sections should tag
`data-section="{name}"`.

---

## Testing

The cross-check harnesses in `tests/` were built because two real bugs
made it into production before we caught them (a 180° ascendant flip,
and a moon longitude off by up to 5°). Both suites now pass, but *run
them before shipping astro or cycle math changes*. They're the
regression suite.

- **`test:astro`** — 11 known charts (Pollen, Einstein, Frida Kahlo,
  Sydney, Stockholm, etc.). Sign match strict, longitude tolerance
  0.5°–2° depending on placement.
- **`test:cycle`** — 4 synthetic cycles at varying lengths (25, 28, 30,
  32 days). Confirms our fertile-window prediction against Sensiplan
  NFP output. **Currently fails for non-28-day cycles by design** —
  the app's `day 14 ± 3` rule is naive; see [Known bugs](#known-bugs).

---

## Known bugs / deferred fixes

- **Ovulation prediction is fixed at cycle day 14** in both
  `moon.html`'s `fertileStatusToday()` and the ICS hook's
  `pb_hooks/moon-ics.pb.js`. Correct for 28-day cycles only. The
  biologically-accurate formula is
  `ovulation = next_period_start − 14` (luteal phase is consistently
  ~14 days; follicular varies). Pollen has seen the data, deferred the
  fix. Ask before applying.
- **Cycle math has no adjustment for irregular cycles** — projections
  are a simple average of past gaps. Fine for most, wrong for POI /
  PCOS / peri. Would need Bayesian smoothing to do properly.
- **Moon + Rising need a lat/lon-mapped city.** Currently ~120 cities
  hardcoded in `CITIES`. If a user's birth place isn't in there, the
  Rising sign silently doesn't compute. Ideally we'd add a manual
  lat/lon fallback.

---

## Off-limits

- **`sympto`** (dev dep) is **AGPL-3.0-or-later**. Fine to use for
  cross-check tests. If any of its code makes it into `moon.html` at
  runtime, our app becomes AGPL too. Keep it in `tests/`.
- **`circular-natal-horoscope-js`** is Unlicense (fine anywhere), but
  we chose not to ship it because the app has no build step and the
  bundle would double the file size. Keep it in `tests/`.
- **Amidha herb data** is CC-BY-4.0. If you ship it in-app,
  `data/ayurveda/README.md`'s attribution block must go somewhere
  visible (Settings → About is fine).

---

## Related backends

- **PocketBase** at `bookings.gardenfaery.love` — serves the ICS
  calendar feed (`/moon-days.ics`) and other Garden Faery booking
  stuff. Source in the separate `garden-faery-hub` folder. Deploy is
  SSH-based. If you want to change the calendar feed contents, that's
  where. See `garden-faery-hub/pocketbase/DEPLOY.md`.

---

## Contact

- **Pollen** for taste calls, voice, design decisions, and anything
  ambiguous.
- **Poppy** — welcome. Push directly to `main`; there's no PR flow
  yet. Small commits with descriptive messages, one behavior per
  commit. Match the existing commit-message style (`moon: what
  changed — why`).
