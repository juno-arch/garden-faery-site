/* Garden Faery — shared script.
   1. Inlines botanicals.svg so <use href="#id"> resolves cross-browser.
   2. Generates a wind-blown grass + flower meadow above the page footer.
   3. Adds a little bee that buzzes around and lands on meadow flowers. */

(function gfShared() {
  const ready = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn)
      : fn();

  // --- 1. Botanicals sprite injection ---
  function injectBotanicals() {
    if (document.getElementById('gf-botanicals-sprite')) return;
    fetch('botanicals.svg', { cache: 'force-cache' })
      .then(r => r.ok ? r.text() : null)
      .then(svg => {
        if (!svg) return;
        const div = document.createElement('div');
        div.id = 'gf-botanicals-sprite';
        div.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
        div.setAttribute('aria-hidden', 'true');
        div.innerHTML = svg;
        document.body.insertBefore(div, document.body.firstChild);
        // Rewrite any existing <use href="botanicals.svg#..."> to same-document #...
        document.querySelectorAll('use[href^="botanicals.svg#"]').forEach(u => {
          u.setAttribute('href', u.getAttribute('href').replace('botanicals.svg', ''));
        });
      })
      .catch(() => {});
  }

  // --- 2. Meadow generator ---
  // Drops a wind-blown grass-and-flowers strip just above the footer.
  // Pages that don't have a <footer>, or pages that opt out via
  // <body data-no-meadow>, are skipped.
  function injectMeadow() {
    if (document.body.dataset.noMeadow !== undefined) return;
    if (document.querySelector('.meadow')) return;
    const footer = document.querySelector('footer');
    if (!footer) return;

    const VW = 1200, VH = 200, BASE = VH;

    // Deterministic-ish PRNG so refresh doesn't reshuffle dramatically.
    // Seed with a constant; if you want variety per page, seed with location.pathname.
    let seed = 7;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const greens = [
      'var(--spring-sage)',
      'var(--leaf-green)',
      '#7da95f',
      '#b6cf99',
      '#88a76e'
    ];
    const flowerSchemes = [
      { petal: 'var(--petal-pink)',       center: 'var(--pollen-gold)' },
      { petal: 'var(--pollen-gold)',      center: 'var(--plum)' },
      { petal: '#ffffff',                 center: 'var(--pollen-gold)' },
      { petal: 'var(--petal-pink-light)', center: 'var(--petal-pink)' },
      { petal: '#e9b8d6',                 center: 'var(--plum)' }
    ];

    // --- Grass blades ---
    const NBLADES = 70;
    const blades = [];
    for (let i = 0; i < NBLADES; i++) {
      const x   = rand() * VW;
      const h   = 38 + rand() * 110;          // 38–148 svg units tall
      const w   = 1.6 + rand() * 3;           // base width
      const tip = (rand() - 0.5) * 22;        // top tilt
      const color = greens[Math.floor(rand() * greens.length)];
      const swayN = 1 + Math.floor(rand() * 6);
      const windy = rand() < 0.18 ? ' windy' : '';
      blades.push({ x, h, w, tip, color, swayN, windy });
    }
    // Taller in back, shorter in front for depth
    blades.sort((a, b) => b.h - a.h);

    // --- Flowers (taller stems peeking above grass) ---
    const NFLOWERS = 7;
    const flowers = [];
    for (let i = 0; i < NFLOWERS; i++) {
      const x = (VW / (NFLOWERS + 1)) * (i + 1) + (rand() - 0.5) * 110;
      const stemH = 110 + rand() * 45;        // 110–155
      const scheme = flowerSchemes[Math.floor(rand() * flowerSchemes.length)];
      const swayN = 1 + Math.floor(rand() * 3);
      const petals = 5 + Math.floor(rand() * 3); // 5–7 petals
      flowers.push({ x, stemH, ...scheme, swayN, petals });
    }

    // --- Build SVG markup ---
    const parts = [];

    // Blades
    for (const b of blades) {
      const tipX = b.x + b.tip;
      const top = BASE - b.h;
      const cy  = BASE - b.h * 0.55;
      const d = `M${b.x - b.w} ${BASE} `
              + `Q${b.x - b.w * 0.3} ${cy}, ${tipX} ${top} `
              + `Q${b.x + b.w * 0.3} ${cy}, ${b.x + b.w} ${BASE} Z`;
      parts.push(`<path class="blade sway-${b.swayN}${b.windy}" d="${d}" fill="${b.color}"/>`);
    }

    // Flowers (stem + petals + center).
    // Stem is a single curved bezier so it always stays attached to the
    // head — no visible kink. The whole flower-base group rocks gently
    // from the ground; the flower-head (petals only) nods a little extra
    // in place for a softer, more organic feel.
    for (const f of flowers) {
      const cx = f.x;
      const cy = BASE - f.stemH;
      const bendDir = rand() < 0.5 ? 1 : -1;
      const bendAmt = 8 + rand() * 12;            // horizontal curve offset

      let petalsSvg = '';
      for (let p = 0; p < f.petals; p++) {
        const angle = (p / f.petals) * 360;
        petalsSvg += `<ellipse cx="${cx}" cy="${cy - 7}" rx="3.6" ry="7.4" fill="${f.petal}" transform="rotate(${angle} ${cx} ${cy})"/>`;
      }
      // Leaf on stem, side chosen from rng so it's deterministic
      const leafSide = rand() < 0.5 ? 1 : -1;
      const leafY = cy + f.stemH * 0.55;
      const leaf = `<path d="M${cx} ${leafY} q${10 * leafSide} -4, ${14 * leafSide} 4 q${-6 * leafSide} 2, ${-14 * leafSide} -4 z" fill="var(--spring-sage)" opacity="0.85"/>`;

      // Single curved stem from ground to flower head.
      // Control point offset horizontally gives a natural bend.
      const ctrlX = cx + bendDir * bendAmt;
      const ctrlY = (BASE + cy) / 2;
      const stem =
        `<path d="M${cx} ${BASE} Q${ctrlX} ${ctrlY}, ${cx} ${cy}" `
        + `fill="none" stroke="var(--leaf-green)" stroke-width="2.4" stroke-linecap="round"/>`;

      parts.push(
        `<g class="flower-base sway-${f.swayN}">`
        +   stem
        +   leaf
        +   `<g class="flower-head sway-h${f.swayN}">`
        +     petalsSvg
        +     `<circle cx="${cx}" cy="${cy}" r="3.4" fill="${f.center}"/>`
        +   `</g>`
        + `</g>`
      );
    }

    const div = document.createElement('div');
    div.className = 'meadow';
    div.setAttribute('aria-hidden', 'true');
    div.innerHTML =
      `<svg viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMax slice">`
      + parts.join('')
      + `</svg>`;
    footer.parentNode.insertBefore(div, footer);
    return { meadowEl: div, flowers, VW, VH };
  }

  // --- 3. Bee ---
  // A small bee that buzzes around the viewport and periodically lands on
  // a meadow flower. Uses position:fixed so it drifts in viewport space
  // regardless of scroll. Skipped when prefers-reduced-motion is set.
  function injectBee(meadowInfo) {
    if (document.querySelector('.gf-bee')) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // The meadow was retired in the visual refresh; the bee now cruises
    // around the viewport without landing on flowers, but still does its
    // opening act on any [data-bee-landing] element (e.g. the homepage CTA).
    const meadowEl = meadowInfo && meadowInfo.meadowEl;
    const flowers  = (meadowInfo && meadowInfo.flowers) || [];
    const VW       = (meadowInfo && meadowInfo.VW) || 1200;

    const bee = document.createElement('div');
    bee.className = 'gf-bee';
    bee.setAttribute('role', 'button');
    bee.setAttribute('tabindex', '0');
    bee.setAttribute('aria-label', 'friendly bee');
    bee.innerHTML =
      // wrapper is what gets the facing flip + wiggle-on-click transform,
      // so the outer div's translate (from WAAPI) doesn't get clobbered.
      // Honeybee redrawn with two-segment body (thorax + abdomen), curved
      // stripes, antennae, and a hint of legs — replaces the cartoon round
      // body so the bee reads more like a real Apis mellifera at small size.
      '<div class="gf-bee-wrap">'
      + '<svg viewBox="-12 -10 24 20" xmlns="http://www.w3.org/2000/svg">'
      // wings — translucent, two pairs (front pair smaller, behind back pair)
      + '<g class="wing wing-l">'
      +   '<path d="M-2,-3 Q-9.5,-9.5 -8.5,-4.5 Q-7,-1.5 -2,-2.5 Z"'
      +     ' fill="rgba(255,255,255,0.55)" stroke="rgba(60,40,20,0.45)" stroke-width="0.35"/>'
      +   '<path d="M-1.5,-2.5 Q-6,-7 -6,-3 Q-5,-1.5 -1.5,-2 Z"'
      +     ' fill="rgba(255,255,255,0.4)" stroke="rgba(60,40,20,0.35)" stroke-width="0.3"/>'
      + '</g>'
      + '<g class="wing wing-r">'
      +   '<path d="M2,-3 Q9.5,-9.5 8.5,-4.5 Q7,-1.5 2,-2.5 Z"'
      +     ' fill="rgba(255,255,255,0.55)" stroke="rgba(60,40,20,0.45)" stroke-width="0.35"/>'
      +   '<path d="M1.5,-2.5 Q6,-7 6,-3 Q5,-1.5 1.5,-2 Z"'
      +     ' fill="rgba(255,255,255,0.4)" stroke="rgba(60,40,20,0.35)" stroke-width="0.3"/>'
      + '</g>'
      // legs — thin, behind the body
      + '<g stroke="#2a1810" stroke-width="0.32" stroke-linecap="round" opacity="0.75">'
      +   '<path d="M-2.5,2.5 Q-3,4 -3.8,5.4"/>'
      +   '<path d="M-0.5,3 Q-0.5,4.5 -1.2,6"/>'
      +   '<path d="M2.2,2.8 Q2.7,4.4 3.4,5.6"/>'
      + '</g>'
      // abdomen (rear segment) — warm honey amber
      + '<ellipse cx="-2" cy="0" rx="5.5" ry="3.5" fill="#dba12d"/>'
      // abdomen stripes — curved bands following body
      + '<path d="M-6.6,-1.6 Q-6.4,1.8 -5,2.6 L-4.2,2.5 Q-5.6,1.6 -5.6,-1.8 Z" fill="#2a1810"/>'
      + '<path d="M-3.2,-2.6 Q-3,2.6 -2,3 L-1.3,2.7 Q-2.3,2.4 -2.3,-2.7 Z" fill="#2a1810"/>'
      + '<path d="M0.2,-2.4 Q0.4,2.4 1,2.7 L1.4,2.3 Q0.6,2 0.6,-2.5 Z" fill="#2a1810"/>'
      // thorax (front segment) — fuzzy, browner amber
      + '<ellipse cx="3.5" cy="0" rx="2.6" ry="2.9" fill="#9c6418"/>'
      // thorax fuzz hairs (top edge)
      + '<g stroke="#d99848" stroke-width="0.3" stroke-linecap="round" opacity="0.85">'
      +   '<path d="M2,-2.6 L2.1,-3.4"/>'
      +   '<path d="M3,-2.9 L3,-3.8"/>'
      +   '<path d="M4.1,-2.6 L3.9,-3.4"/>'
      +   '<path d="M5,-1.8 L5.5,-2.5"/>'
      + '</g>'
      // head
      + '<ellipse cx="6.4" cy="0" rx="2.3" ry="2.5" fill="#1a0e08"/>'
      // compound eye
      + '<ellipse cx="6.5" cy="-0.4" rx="1.3" ry="1.6" fill="#3d2818"/>'
      + '<ellipse cx="6.8" cy="-0.7" rx="0.4" ry="0.5" fill="#fff" opacity="0.7"/>'
      // antennae
      + '<path d="M5.9,-2.2 Q6.7,-3.6 7.4,-4.3" stroke="#1a0e08" stroke-width="0.32" fill="none" stroke-linecap="round"/>'
      + '<path d="M5.3,-2.2 Q4.7,-3.6 4.1,-4.5" stroke="#1a0e08" stroke-width="0.32" fill="none" stroke-linecap="round"/>'
      + '<circle cx="7.4" cy="-4.3" r="0.28" fill="#1a0e08"/>'
      + '<circle cx="4.1" cy="-4.5" r="0.28" fill="#1a0e08"/>'
      + '</svg>'
      + '</div>';
    document.body.appendChild(bee);
    const beeWrap = bee.querySelector('.gf-bee-wrap');

    // --- Click interaction: speech bubble + petal puff + happy wiggle ---
    // "tickles!" is Taya's favorite, so it's in the pool a few extra times.
    const beeMessages = [
      'tickles!',
      'bzzzzz!',
      'tickles!',
      'hi there!',
      'tickles!',
      'thanks!',
      'bzz-bzz!',
      'tickles!',
      'hello!',
      'xo',
      'tickles!',
      'pollen time!',
      'tickles!'
    ];
    const petalColors = [
      'var(--petal-pink, #e9b8d6)',
      'var(--petal-pink-light, #f4cfe3)',
      'var(--pollen-gold, #f4c430)',
      '#ffffff'
    ];
    let beeMsgIdx = Math.floor(Math.random() * beeMessages.length);

    function showBeeTip(text) {
      const rect = bee.getBoundingClientRect();
      const tip = document.createElement('div');
      tip.className = 'gf-bee-tip';
      tip.textContent = text;
      tip.style.left = (rect.left + rect.width / 2) + 'px';
      // If the bee is near the top of the viewport, flip the bubble below it
      // so it doesn't get hidden behind the sticky nav.
      const flipBelow = rect.top < 90;
      if (flipBelow) {
        tip.classList.add('below');
        tip.style.top = rect.bottom + 'px';
      } else {
        tip.style.top = rect.top + 'px';
      }
      document.body.appendChild(tip);
      setTimeout(() => tip.remove(), 1800);
    }

    function spawnPetals() {
      const rect = bee.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const n = 7;
      for (let i = 0; i < n; i++) {
        const p = document.createElement('div');
        p.className = 'gf-bee-particle';
        // Spread in a fan, biased upward
        const angle = (-Math.PI / 2) + (i - (n - 1) / 2) * (Math.PI / (n + 1)) * 0.9
                    + (Math.random() - 0.5) * 0.3;
        const dist = 40 + Math.random() * 30;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const rot = (Math.random() * 540 - 270);
        const color = petalColors[Math.floor(Math.random() * petalColors.length)];
        p.style.setProperty('--dx', dx + 'px');
        p.style.setProperty('--dy', dy + 'px');
        p.style.setProperty('--rot', rot + 'deg');
        p.style.left = cx + 'px';
        p.style.top  = cy + 'px';
        p.style.animationDelay = (i * 30) + 'ms';
        p.innerHTML = '<svg viewBox="-10 -10 20 20"><ellipse cx="0" cy="-2" rx="4" ry="7"'
                    + ' fill="' + color + '" stroke="rgba(80,60,30,0.15)" stroke-width="0.5"/></svg>';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1500);
      }
    }

    // ----- Bee-catching mini-game state (localStorage-backed) -----
    // Tap the bee = +1 honey. Milestones earn a badge toast. Anti-spam
    // gate at 400ms so an autoclick can't speed-run the achievements.
    const HONEY_KEY = 'gf_honey_v1';
    const MILESTONES = [
      { at: 10,  label: 'Worker Bee 🐝' },
      { at: 25,  label: 'Pollen Patrol ✨' },
      { at: 50,  label: 'Hive Mind 🍯' },
      { at: 100, label: 'Queen Bee 👑' },
      { at: 250, label: 'Apiarist of Arcata 🌼' },
    ];
    let honey = 0, lastCatch = 0;
    try { honey = parseInt(localStorage.getItem(HONEY_KEY) || '0', 10) || 0; } catch (_) {}

    function honeyJarSvg(level) {
      // level in 0..1 maps to fill height
      const fillH = Math.round(28 * Math.max(0, Math.min(1, level)));
      const y = 40 - fillH;
      return '<svg viewBox="0 0 36 44" width="28" height="34" aria-hidden="true">' +
        // Jar body
        '<rect x="6" y="14" width="24" height="26" rx="3" ry="3" fill="rgba(255,255,255,0.85)" stroke="#5a1230" stroke-width="1.4"/>' +
        // Honey fill
        '<rect x="7" y="' + y + '" width="22" height="' + fillH + '" fill="#d4b86a" opacity="0.92"/>' +
        // Jar rim
        '<rect x="4" y="10" width="28" height="6" rx="1.5" ry="1.5" fill="#5a1230"/>' +
        // Highlight
        '<rect x="9" y="16" width="3" height="20" rx="1" fill="rgba(255,255,255,0.35)"/>' +
        '</svg>';
    }

    function ensureHoneyJar() {
      let jar = document.querySelector('.gf-honey-jar');
      if (jar) return jar;
      jar = document.createElement('button');
      jar.className = 'gf-honey-jar';
      jar.setAttribute('aria-label', 'Honey jar — bee-catching score');
      jar.setAttribute('type', 'button');
      jar.style.cssText = [
        'position:fixed', 'bottom:16px', 'right:16px',
        'background:rgba(255,255,255,0.92)',
        'border:1.5px solid #5a1230', 'border-radius:24px',
        'padding:5px 12px 5px 8px',
        'display:flex', 'align-items:center', 'gap:6px',
        'font-family:inherit', 'font-weight:700',
        'font-size:0.85rem', 'color:#5a1230',
        'cursor:pointer', 'z-index:9998',
        'box-shadow:0 4px 14px rgba(90,18,48,0.16)',
        'transition:transform 0.18s ease',
      ].join(';') + ';';
      jar.innerHTML = '<span class="gf-honey-jar-svg">' + honeyJarSvg(0) + '</span><span class="gf-honey-count">0</span>';
      jar.addEventListener('mouseenter', () => { jar.style.transform = 'scale(1.06)'; });
      jar.addEventListener('mouseleave', () => { jar.style.transform = ''; });
      jar.addEventListener('click', onHoneyJarClick);
      document.body.appendChild(jar);
      return jar;
    }

    function updateHoneyJar() {
      const jar = ensureHoneyJar();
      jar.querySelector('.gf-honey-count').textContent = honey;
      // Fill level cycles every 10 catches; rolling over keeps it satisfying.
      const lvl = (honey % 10) / 10 || (honey > 0 ? 1 : 0);
      jar.querySelector('.gf-honey-jar-svg').innerHTML = honeyJarSvg(lvl);
    }

    function flashHoneyPlusOne(x, y) {
      const flash = document.createElement('div');
      flash.textContent = '+1 🍯';
      flash.style.cssText = [
        'position:fixed', 'left:' + x + 'px', 'top:' + y + 'px',
        'font-weight:700', 'font-size:0.95rem', 'color:#5a1230',
        'pointer-events:none', 'z-index:9999',
        'transition:transform 0.9s ease-out, opacity 0.9s ease-out',
        'text-shadow:0 1px 2px rgba(255,255,255,0.8)',
      ].join(';') + ';';
      document.body.appendChild(flash);
      requestAnimationFrame(() => {
        flash.style.transform = 'translate(-50%, -40px)';
        flash.style.opacity = '0';
      });
      setTimeout(() => flash.remove(), 950);
    }

    function showMilestoneToast(text) {
      const t = document.createElement('div');
      t.textContent = '🏅 ' + text;
      t.style.cssText = [
        'position:fixed', 'left:50%', 'top:80px',
        'transform:translateX(-50%) translateY(-10px)',
        'background:#5a1230', 'color:#fff',
        'padding:12px 22px', 'border-radius:999px',
        'font-weight:700', 'font-size:0.95rem',
        'box-shadow:0 8px 26px rgba(90,18,48,0.35)',
        'pointer-events:none', 'z-index:9999',
        'opacity:0', 'transition:opacity 0.35s ease, transform 0.35s ease',
      ].join(';') + ';';
      document.body.appendChild(t);
      requestAnimationFrame(() => {
        t.style.opacity = '1';
        t.style.transform = 'translateX(-50%) translateY(0)';
      });
      setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(-50%) translateY(-10px)';
      }, 2600);
      setTimeout(() => t.remove(), 3000);
    }

    function onHoneyJarClick() {
      const last = MILESTONES.slice().reverse().find(m => honey >= m.at);
      const next = MILESTONES.find(m => honey < m.at);
      const earned = last ? last.label : 'Just getting started';
      const toGo = next ? (next.at - honey) + ' to ' + next.label : 'all milestones unlocked!';
      const msg = '🍯 Honey: ' + honey + '\n' +
                  'Current rank: ' + earned + '\n' +
                  (next ? toGo : toGo) + '\n\n' +
                  'Reset honey?';
      if (confirm(msg)) {
        honey = 0;
        try { localStorage.setItem(HONEY_KEY, '0'); } catch (_) {}
        updateHoneyJar();
      }
    }

    function bumpHoney(x, y) {
      const now = Date.now();
      if (now - lastCatch < 400) return; // anti-autoclick gate
      lastCatch = now;
      honey++;
      try { localStorage.setItem(HONEY_KEY, String(honey)); } catch (_) {}
      flashHoneyPlusOne(x, y);
      updateHoneyJar();
      // Milestone toast — fire exactly once per threshold crossing.
      const hit = MILESTONES.find(m => m.at === honey);
      if (hit) showMilestoneToast(hit.label);
    }

    // Bee-catching mini-game removed — the honey jar widget is no longer shown.

    function onBeeClick(e) {
      e.preventDefault();
      e.stopPropagation();
      showBeeTip(beeMessages[beeMsgIdx % beeMessages.length]);
      beeMsgIdx++;
      spawnPetals();
      // retrigger the wiggle animation
      beeWrap.classList.remove('wiggling');
      void beeWrap.offsetWidth;
      beeWrap.classList.add('wiggling');
    }
    bee.addEventListener('click', onBeeClick);
    bee.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') onBeeClick(e);
    });
    beeWrap.addEventListener('animationend', () => {
      beeWrap.classList.remove('wiggling');
    });

    // Compute a landing point (page-unit coords in the meadow SVG viewBox,
    // converted to viewport px) for a given flower.
    function flowerViewportPos(f) {
      const rect = meadowEl.getBoundingClientRect();
      // meadow uses preserveAspectRatio="xMidYMax slice" on a viewBox
      // 0 0 VW VH, rendered into rect.width x rect.height.
      const scale = Math.max(rect.width / VW, rect.height / 200);
      const renderedW = VW * scale;
      const renderedH = 200 * scale;
      const offsetX = rect.left + (rect.width - renderedW) / 2;  // xMid
      const offsetY = rect.bottom - renderedH;                   // YMax
      return {
        x: offsetX + f.x * scale,
        y: offsetY + (200 - f.stemH - 4) * scale  // a smidge above petals
      };
    }

    function meadowInViewport() {
      if (!meadowEl) return false;
      const r = meadowEl.getBoundingClientRect();
      return r.top < innerHeight && r.bottom > 0;
    }

    function randomCruisePoint() {
      // Keep the bee comfortably within viewport padding
      const pad = 60;
      return {
        x: pad + Math.random() * (innerWidth - pad * 2),
        y: pad + Math.random() * (Math.min(innerHeight, 500) - pad * 2)
      };
    }

    let pos = { x: innerWidth * 0.5, y: 80 };
    let facing = 1;

    // A page can nominate an element for the bee's opening act by tagging
    // it with [data-bee-landing] (e.g. the homepage "Book with Me" button).
    // The bee will start below the viewport — as if rising from the meadow —
    // and fly up to land on it for a beat before starting normal buzzing.
    function beeLandingTargetEl() {
      const el = document.querySelector('[data-bee-landing]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return null;
      return el;
    }

    function elementLandingPos(el) {
      const r = el.getBoundingClientRect();
      // Land just above the element's top-center so the bee perches on it.
      return { x: r.left + r.width / 2, y: r.top - 4 };
    }

    function pickTarget() {
      // 70% chance to visit a flower if the meadow is on screen
      if (meadowInViewport() && flowers.length && Math.random() < 0.7) {
        const f = flowers[Math.floor(Math.random() * flowers.length)];
        const p = flowerViewportPos(f);
        return { ...p, land: true };
      }
      return { ...randomCruisePoint(), land: false };
    }

    function setFacing(newFacing) {
      if (newFacing === facing) return;
      facing = newFacing;
      beeWrap.style.setProperty('--face', facing);
    }

    async function flyTo(target) {
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      const dist = Math.hypot(dx, dy);
      const duration = Math.max(900, Math.min(2800, dist * 3 + 400));
      // direction for mirroring the bee so the head leads
      if (Math.abs(dx) > 30) setFacing(dx > 0 ? 1 : -1);

      // Wavy waypoints — sine-wave jitter perpendicular to the flight path
      const steps = 26;
      const perpX = -dy / (dist || 1);
      const perpY =  dx / (dist || 1);
      const keyframes = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const baseX = pos.x + dx * t;
        const baseY = pos.y + dy * t;
        const fade  = Math.sin(t * Math.PI);
        const wiggle = Math.sin(t * Math.PI * 3.2) * 18 * fade;
        const bob    = Math.sin(t * Math.PI * 6) * 6 * fade;
        const x = baseX + perpX * wiggle;
        const y = baseY + perpY * wiggle + bob;
        keyframes.push({
          transform: 'translate(' + (x - 18) + 'px, ' + (y - 15) + 'px)'
        });
      }
      bee.classList.add('flying');
      bee.classList.remove('landed');
      const anim = bee.animate(keyframes, {
        duration,
        easing: 'ease-in-out',
        fill: 'forwards'
      });
      await anim.finished.catch(() => {});
      pos = { x: target.x, y: target.y };
    }

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function loop() {
      // Opening act: if the page nominates a [data-bee-landing] element
      // (the homepage "Book with Me" CTA, for example), the bee rises from
      // just below the viewport — as if lifting off the meadow flowers —
      // flies up, and lands on it for a long attention-grabbing beat.
      const landingEl = beeLandingTargetEl();
      if (landingEl) {
        pos = { x: innerWidth * 0.35, y: innerHeight + 30 };
        bee.style.transform =
          'translate(' + (pos.x - 18) + 'px, ' + (pos.y - 15) + 'px)';
        await sleep(500 + Math.random() * 500);
        bee.classList.add('on-cta');
        await flyTo({ ...elementLandingPos(landingEl), land: true });
        bee.classList.remove('flying');
        bee.classList.add('landed');
        await sleep(3200 + Math.random() * 1600);
        bee.classList.remove('on-cta');
      } else {
        // small initial settle
        await sleep(800 + Math.random() * 1200);
      }

      while (true) {
        const target = pickTarget();
        await flyTo(target);
        if (target.land) {
          bee.classList.remove('flying');
          bee.classList.add('landed');
          await sleep(1800 + Math.random() * 3200);
        } else {
          await sleep(300 + Math.random() * 600);
        }
      }
    }
    loop().catch(() => {});

    // If the meadow changes size (resize, font loading) the cached rect
    // is fine because we recompute each flight — nothing to do here.
  }

  ready(() => {
    injectBotanicals();
    // Meadow retired in the 2026 brand refresh — see injectMeadow() above
    // for the implementation, kept for reference. The bee now cruises
    // without a meadow but still uses [data-bee-landing] for its opening
    // act on pages that nominate a CTA.
    injectBee(null);
  });
})();
