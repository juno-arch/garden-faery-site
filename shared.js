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
      const stemH = 130 + rand() * 55;        // 130–185
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
    // Nested groups so the head can sway independently of the stem base —
    // the outer group rocks gently from the ground, the inner group (head +
    // upper stem + leaf) rocks more dramatically from higher up, giving an
    // organic "bending in the wind" feel instead of a rigid lollipop swing.
    for (const f of flowers) {
      const cx = f.x;
      const cy = BASE - f.stemH;
      const bendDir = rand() < 0.5 ? 1 : -1;
      const bendAmt = 10 + rand() * 14;           // horizontal curve offset
      // Pivot for the head's extra sway — a little below the head so the
      // upper third of the stem bends with it.
      const pivotY = cy + f.stemH * 0.30;

      let petalsSvg = '';
      for (let p = 0; p < f.petals; p++) {
        const angle = (p / f.petals) * 360;
        petalsSvg += `<ellipse cx="${cx}" cy="${cy - 7}" rx="3.6" ry="7.4" fill="${f.petal}" transform="rotate(${angle} ${cx} ${cy})"/>`;
      }
      // Leaf on stem, side chosen from rng so it's deterministic
      const leafSide = rand() < 0.5 ? 1 : -1;
      const leafY = cy + f.stemH * 0.55;
      const leaf = `<path d="M${cx} ${leafY} q${10 * leafSide} -4, ${14 * leafSide} 4 q${-6 * leafSide} 2, ${-14 * leafSide} -4 z" fill="var(--spring-sage)" opacity="0.85"/>`;

      // Lower stem: base to pivot, curves slightly (half the bend).
      const lowerCtrlX = cx + bendDir * bendAmt * 0.25;
      const lowerCtrlY = (BASE + pivotY) / 2;
      const lowerStem =
        `<path d="M${cx} ${BASE} Q${lowerCtrlX} ${lowerCtrlY}, ${cx + bendDir * bendAmt * 0.35} ${pivotY}" `
        + `fill="none" stroke="var(--leaf-green)" stroke-width="2.4" stroke-linecap="round"/>`;

      // Upper stem: pivot to flower head, curves more.
      const upperBaseX = cx + bendDir * bendAmt * 0.35;
      const upperCtrlX = cx + bendDir * bendAmt;
      const upperCtrlY = (pivotY + cy) / 2;
      const upperStem =
        `<path d="M${upperBaseX} ${pivotY} Q${upperCtrlX} ${upperCtrlY}, ${cx} ${cy}" `
        + `fill="none" stroke="var(--leaf-green)" stroke-width="2.2" stroke-linecap="round"/>`;

      parts.push(
        `<g class="flower-base sway-${f.swayN}">`
        +   lowerStem
        +   leaf
        +   `<g class="flower-head sway-h${f.swayN}">`
        +     upperStem
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
    if (!meadowInfo) return;
    if (document.querySelector('.gf-bee')) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const { meadowEl, flowers, VW } = meadowInfo;

    const bee = document.createElement('div');
    bee.className = 'gf-bee';
    bee.setAttribute('role', 'button');
    bee.setAttribute('tabindex', '0');
    bee.setAttribute('aria-label', 'friendly bee');
    bee.innerHTML =
      // wrapper is what gets the facing flip + wiggle-on-click transform,
      // so the outer div's translate (from WAAPI) doesn't get clobbered
      '<div class="gf-bee-wrap">'
      + '<svg viewBox="-12 -10 24 20" xmlns="http://www.w3.org/2000/svg">'
      // wings (drawn first so they sit behind the body)
      + '<ellipse class="wing wing-l" cx="-3" cy="-7" rx="6" ry="3.5"'
      +   ' fill="rgba(255,255,255,0.65)" stroke="rgba(80,60,30,0.45)" stroke-width="0.5"/>'
      + '<ellipse class="wing wing-r" cx="3" cy="-7" rx="6" ry="3.5"'
      +   ' fill="rgba(255,255,255,0.65)" stroke="rgba(80,60,30,0.45)" stroke-width="0.5"/>'
      // fuzzy body
      + '<ellipse cx="0" cy="0" rx="7.5" ry="4.5" fill="#f4c430"/>'
      // stripes
      + '<rect x="-6" y="-4.5" width="2" height="9" fill="#2c1810" rx="0.8"/>'
      + '<rect x="-1.5" y="-4.5" width="2" height="9" fill="#2c1810" rx="0.8"/>'
      + '<rect x="3" y="-4.5" width="2" height="9" fill="#2c1810" rx="0.8"/>'
      // head
      + '<circle cx="6.5" cy="0" r="2.8" fill="#2c1810"/>'
      + '<circle cx="7.3" cy="-1" r="0.7" fill="#fff"/>'
      + '</svg>'
      + '</div>';
    document.body.appendChild(bee);
    const beeWrap = bee.querySelector('.gf-bee-wrap');

    // --- Click interaction: speech bubble + petal puff + happy wiggle ---
    const beeMessages = [
      'bzzzzz!',
      'hi there!',
      'thanks!',
      'bzz-bzz!',
      'tickles!',
      'hello!',
      'xo',
      'pollen time!'
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
      tip.style.top  = rect.top + 'px';
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
          transform: 'translate(' + (x - 16) + 'px, ' + (y - 10) + 'px)'
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
          'translate(' + (pos.x - 16) + 'px, ' + (pos.y - 10) + 'px)';
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
    const meadowInfo = injectMeadow();
    injectBee(meadowInfo);
  });
})();
