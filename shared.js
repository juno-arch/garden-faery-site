/* Garden Faery — shared script.
   1. Inlines botanicals.svg so <use href="#id"> resolves cross-browser.
   2. Generates a wind-blown grass + flower meadow above the page footer. */

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

    // Flowers (stem + petals + center, grouped so they sway together)
    for (const f of flowers) {
      const cx = f.x;
      const cy = BASE - f.stemH;
      let petalsSvg = '';
      for (let p = 0; p < f.petals; p++) {
        const angle = (p / f.petals) * 360;
        petalsSvg += `<ellipse cx="${cx}" cy="${cy - 7}" rx="3.6" ry="7.4" fill="${f.petal}" transform="rotate(${angle} ${cx} ${cy})"/>`;
      }
      // Optional small leaf on stem
      const leafSide = (cx % 2 < 1) ? 1 : -1;
      const leafY = cy + f.stemH * 0.55;
      const leaf = `<path d="M${cx} ${leafY} q${10 * leafSide} -4, ${14 * leafSide} 4 q${-6 * leafSide} 2, ${-14 * leafSide} -4 z" fill="var(--spring-sage)" opacity="0.85"/>`;
      parts.push(
        `<g class="flower sway-${f.swayN}">`
        + `<line x1="${cx}" y1="${BASE}" x2="${cx}" y2="${cy}" stroke="var(--leaf-green)" stroke-width="2.4" stroke-linecap="round"/>`
        + leaf
        + petalsSvg
        + `<circle cx="${cx}" cy="${cy}" r="3.4" fill="${f.center}"/>`
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
  }

  ready(() => { injectBotanicals(); injectMeadow(); });
})();
