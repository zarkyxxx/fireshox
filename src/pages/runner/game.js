// Shox Runner — le jeu hors ligne de Fire Shox (façon dinosaure de Chrome), avec Le Y et ses Shox à ressorts.
// Script PARTAGÉ (classique, sans module) : chargé par fireshox://runner/ ET par la page d'erreur hors ligne
// (fireshox://error/?code=-106…) et par la bibliothèque Jeux, avec  <script src="fireshox://runner/game.js"></script>
//
//   const jeu = ShoxRunner.mount(élément, { compact: false, onEnd(résultat) {}, onState(état) {} })
//       → { start(), pause(), resume(), destroy(), focus(), state, debug }
//   ShoxRunner.drawCover(canvas, 'cover' | 'banner')  → Promise (jaquette / bannière de la bibliothèque Jeux)
//   ShoxRunner.drawIcon(canvas, 'plot' | 'poubelle' | 'pile' | 'cones' | 'dalgona' | 'jack' | 'shox' | 'y') → Promise
//
// Commandes : Espace / flèche haut / clic = sauter (maintenir = saut plus haut), flèche bas = s'accroupir
// (en l'air : plonger). Pas de temps fixe (1/120 s) + interpolation, rendu à chaque requestAnimationFrame.
// Stockage : jeux.runner.best (meilleur score), jeux.runner.parties (nombre de parties),
//            opening.coins (+1 ShoxCoin par 100 points, ajouté à la fin de chaque partie).
(function () {
  'use strict';
  if (window.ShoxRunner) return;

  // ================================================================== réglages
  const CFG = {
    minW: 600, minH: 200, step: 1 / 120,
    gravity: 2500, jumpV: 700, hopV: 300, minJump: 30, fastFall: 3.2,
    speed0: 360, accel: 4.5, speedMax: 860,
    scoreK: 0.025, bonus: 25, coinPer: 100,
    jackV: 170, dalV: 55,
  };
  const KEY_BEST = 'jeux.runner.best';
  const KEY_GAMES = 'jeux.runner.parties';

  const fx = () => (typeof window.FX === 'object' && window.FX) || null;
  const snd = (n) => { try { const f = fx(); if (f) f.sound(n); } catch {} };
  const store = {
    get(k, d) { try { const f = fx(); return f ? f.store.get(k, d) : d; } catch { return d; } },
    set(k, v) { try { const f = fx(); if (f) f.store.set(k, v); } catch {} },
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  const pad = (n) => String(Math.max(0, Math.floor(n))).padStart(5, '0');
  const FONT_D = 'Bungee, "Outfit", system-ui, sans-serif';
  const FONT_T = '"Outfit", "Segoe UI", system-ui, sans-serif';
  const FONT_M = '"JetBrains Mono", Consolas, monospace';

  function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

  // ================================================================== images (tête de Le Y, biscuit, Jack Shi)
  const SPR = { ready: null };
  function loadImg(src) {
    return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  }
  function circleSprite(img, sx, sy, sr, size) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d');
    x.beginPath(); x.arc(size / 2, size / 2, size / 2, 0, TAU); x.clip();
    x.drawImage(img, sx - sr, sy - sr, sr * 2, sr * 2, 0, 0, size, size);
    return c;
  }
  function prepare() {
    if (SPR.ready) return SPR.ready;
    const fonts = (document.fonts && document.fonts.load)
      ? Promise.all(['16px Bungee', '700 12px "JetBrains Mono"', '700 12px Outfit', '500 12px Outfit'].map((f) => document.fonts.load(f).catch(() => null)))
      : Promise.resolve();
    SPR.ready = Promise.all([
      loadImg('/assets/logo-256.png'), loadImg('/assets/memes/dalgona-shox.webp'), loadImg('/assets/memes/jack-shi.webp'), fonts,
    ]).then(([logo, dal, jack]) => {
      // Tête de Le Y : le centre du logo (son visage dans l'anneau de feu).
      if (logo) SPR.head = circleSprite(logo, 130, 113, 68, 128);
      if (dal) SPR.dalgona = circleSprite(dal, 361, 347, 290, 112);
      if (jack) SPR.jack = circleSprite(jack, 703, 338, 114, 96);
    });
    return SPR.ready;
  }

  // ================================================================== décor (généré une fois, identique partout)
  const DAY = { top: [40, 12, 38], mid: [150, 44, 34], hor: [255, 138, 58], far2: [150, 52, 50], far: [96, 26, 38], mid2: [44, 14, 22], ground: [44, 22, 24], ground2: [22, 12, 16], edge: [255, 176, 96], cloud: [255, 184, 132], win: [255, 214, 140] };
  const NIGHT = { top: [4, 3, 12], mid: [14, 10, 32], hor: [46, 26, 70], far2: [30, 22, 54], far: [17, 12, 32], mid2: [10, 8, 20], ground: [20, 15, 30], ground2: [9, 7, 15], edge: [168, 120, 230], cloud: [54, 44, 86], win: [255, 206, 102] };
  const col = (k, n, a = 1) => {
    const d = DAY[k], m = NIGHT[k];
    return `rgba(${Math.round(lerp(d[0], m[0], n))},${Math.round(lerp(d[1], m[1], n))},${Math.round(lerp(d[2], m[2], n))},${a})`;
  };

  function skyline(seed, period, minH, maxH, special) {
    const r = rng(seed); const out = []; let x = 0; let lycee = !special, tour = !special;
    while (x < period - 30) {
      if (!lycee && x > period * 0.32) { out.push({ x, w: 128, h: 42, kind: 'lycee' }); x += 136; lycee = true; continue; }
      if (!tour && x > period * 0.74) { out.push({ x, w: 26, h: 98, kind: 'tour' }); x += 34; tour = true; continue; }
      const w = 22 + r() * 44, h = minH + r() * (maxH - minH);
      const win = [];
      for (let wy = 6; wy < h - 5; wy += 7) for (let wx = 4; wx < w - 5; wx += 6.5) if (r() < 0.36) win.push([wx, wy, r()]);
      out.push({ x, w, h, kind: r() < 0.22 ? 'antenne' : r() < 0.35 ? 'toit' : 'plat', win });
      x += w + 2 + r() * 12;
    }
    return { period, list: out };
  }
  const FAR2 = skyline(7, 1300, 40, 92, false);
  const FAR = skyline(42, 1150, 18, 66, true);
  const STARS = (() => { const r = rng(99); return Array.from({ length: 70 }, () => [r() * 1400, r(), 0.4 + r() * 1.1, r() * TAU]); })();
  const CLOUDS = (() => { const r = rng(5); return Array.from({ length: 7 }, (_, i) => [i * 230 + r() * 120, 0.12 + r() * 0.3, 18 + r() * 26]); })();
  const PEBBLES = (() => { const r = rng(3); return Array.from({ length: 46 }, () => [r() * 640, 3 + r() * 26, 1 + r() * 3.5, r()]); })();

  // ================================================================== monde
  const groundOf = (H) => 168 + (H - 200) * 0.55;
  const playerX = (W) => 64 + Math.max(0, W - 600) * 0.08;

  function makeWorld(W, H) {
    return {
      W, H, gy: groundOf(H), t: 0, dist: 0, pdist: 0, speed: CFG.speed0, score: 0, bonus: 0, shox: 0,
      night: 0, clock: 0, shake: 0, blink: 0,
      p: { x: playerX(W), y: 0, py: 0, vy: 0, ground: true, duck: false, fast: false, cut: false, phase: 0, land: 0, dead: false, emit: 0 },
      obs: [], picks: [], parts: [], floats: [],
    };
  }

  // ================================================================== dessin : petits outils
  function shoe(c, hx, by, sh, o = {}) {
    // Une Shox de profil, tournée vers la droite. hx : talon ; by : bas des ressorts ; sh : hauteur des ressorts.
    const top = by - sh;
    const grad = c.createLinearGradient(0, top, 0, by);
    grad.addColorStop(0, o.hot ? '#ffd27a' : '#eef0f4'); grad.addColorStop(1, o.hot ? '#ff6a1a' : '#8d93a1');
    for (let i = 0; i < 4; i++) {
      const cx = hx + 1.3 + i * 2.55;
      c.fillStyle = grad; c.fillRect(cx, top, 1.95, sh);
      c.fillStyle = 'rgba(20,14,20,.42)';
      for (let y = top + 0.8; y < by - 0.25; y += 1.2) c.fillRect(cx, y, 1.95, 0.42);
    }
    c.fillStyle = '#ebe5da';
    c.beginPath(); c.moveTo(hx - 0.3, top + 0.2); c.lineTo(hx + 15.4, top + 0.2); c.quadraticCurveTo(hx + 16.9, top, hx + 16.6, top - 1.6); c.lineTo(hx - 0.2, top - 1.8); c.closePath(); c.fill();
    c.fillStyle = o.upper || '#15131a';
    c.beginPath();
    c.moveTo(hx - 0.2, top - 1.6);
    c.lineTo(hx + 0.2, top - 6.6);
    c.quadraticCurveTo(hx + 2.4, top - 5.7, hx + 4.6, top - 6.0);
    c.lineTo(hx + 8.8, top - 7.1);
    c.quadraticCurveTo(hx + 12.4, top - 5.3, hx + 15.5, top - 3.6);
    c.quadraticCurveTo(hx + 17.2, top - 2.6, hx + 16.6, top - 1.6);
    c.closePath(); c.fill();
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 0.55;
    c.beginPath(); c.moveTo(hx + 2.6, top - 2.6); c.quadraticCurveTo(hx + 8, top - 5, hx + 13.8, top - 3.3); c.stroke();
    c.strokeStyle = o.accent || '#ff6a1a'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(hx + 0.9, top - 3.9); c.lineTo(hx + 4.2, top - 3.4); c.stroke();
  }

  function flameTongue(c, x, y, h, w, t, seed) {
    // langue de flamme ondulante : contour en S + cœur plus clair
    const sway = Math.sin(t * 11 + seed) * w * 0.7, s2 = Math.sin(t * 17 + seed * 1.7) * w * 0.35;
    const tongue = (hh, ww, a0, a1, a2) => {
      const g = c.createLinearGradient(x, y, x, y - hh);
      g.addColorStop(0, a0); g.addColorStop(0.45, a1); g.addColorStop(1, a2);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x - ww, y);
      c.bezierCurveTo(x - ww * 1.15, y - hh * 0.35, x - ww * 0.3 + s2, y - hh * 0.62, x + sway, y - hh);
      c.bezierCurveTo(x + ww * 0.45 + s2, y - hh * 0.58, x + ww * 1.1, y - hh * 0.32, x + ww, y);
      c.quadraticCurveTo(x, y + ww * 0.5, x - ww, y);
      c.fill();
    };
    tongue(h, w, 'rgba(255,60,0,.9)', 'rgba(255,110,10,.75)', 'rgba(255,60,0,0)');
    tongue(h * 0.62, w * 0.55, 'rgba(255,200,60,.95)', 'rgba(255,170,40,.7)', 'rgba(255,230,150,0)');
  }

  const HEAD_FLAMES = [[-200, 0.55, 0.30], [-176, 0.85, 0.34], [-152, 1.05, 0.36], [-128, 0.95, 0.33], [-104, 0.78, 0.3], [-82, 0.5, 0.26]];
  function headDisc(c, cx, cy, r, t) {
    // Halo de feu + flammes qui s'échappent vers le haut et l'arrière (Le Y court vers la droite)
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(cx, cy, r * 0.75, cx, cy, r * 1.7);
    g.addColorStop(0, 'rgba(255,110,20,.5)'); g.addColorStop(1, 'rgba(255,60,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r * 1.7, 0, TAU); c.fill();
    HEAD_FLAMES.forEach(([deg, len, wid], i) => {
      const a = (deg * Math.PI) / 180;
      const fl = 0.75 + 0.25 * Math.sin(t * 12 + i * 1.9) + 0.12 * Math.sin(t * 23 + i);
      const dir = lerp(a, -Math.PI * 0.62, 0.45); // les flammes montent et partent vers l'arrière
      const x0 = cx + Math.cos(a) * r * 0.8, y0 = cy + Math.sin(a) * r * 0.8;
      c.save(); c.translate(x0, y0); c.rotate(dir + Math.PI / 2);
      flameTongue(c, 0, 0, r * len * fl * 1.6, r * wid, t, i * 2.3);
      c.restore();
    });
    c.restore();
    if (SPR.head) {
      c.drawImage(SPR.head, cx - r, cy - r, r * 2, r * 2);
    } else {
      const hg = c.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
      hg.addColorStop(0, '#ffb347'); hg.addColorStop(1, '#a32a00');
      c.fillStyle = hg; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
      c.fillStyle = '#3a2016'; c.beginPath(); c.arc(cx - r * 0.1, cy + r * 0.05, r * 0.55, 0, TAU); c.fill();
    }
    c.lineWidth = Math.max(0.6, r * 0.07); c.strokeStyle = 'rgba(255,170,60,.85)';
    c.beginPath(); c.arc(cx, cy, r - c.lineWidth / 2, 0, TAU); c.stroke();
  }

  // ================================================================== dessin : Le Y
  // P : { mode: 'idle' | 'run' | 'air' | 'duck' | 'dead', phase, vy, land, time }
  function drawLeY(c, x, fy, P) {
    const mode = P.mode, ph = P.phase || 0, tt = P.time || 0;
    let shA = 5, shB = 5, liftA = 0, liftB = 0, swA = 0, swB = 0, bob = 0;
    if (mode === 'run') {
      const s = Math.sin(ph), co = Math.cos(ph);
      liftA = Math.max(0, s) * 5; liftB = Math.max(0, -s) * 5;
      shA = 5 - Math.max(0, -s) * 2.4; shB = 5 - Math.max(0, s) * 2.4;
      swA = co * 5.5; swB = -co * 5.5;
      bob = Math.abs(s) * 1.2;
    } else if (mode === 'air') {
      const up = (P.vy || 0) > 0;
      shA = shB = up ? 8 : 6.2; liftA = 0.5; liftB = 3; swA = 4; swB = -3;
    } else if (mode === 'duck') {
      shA = shB = 2.4; swA = 6; swB = -5;
    } else if (mode === 'idle') {
      const b = (Math.sin(tt * 5.2) + 1) / 2; shA = shB = 3.2 + b * 2.6;
    } else if (mode === 'dead') {
      shA = 2.2; shB = 7.5; swA = -2; swB = 6;
    }
    if (P.land > 0 && mode !== 'dead') { const k = P.land / 0.14; shA = lerp(shA, 2.1, k); shB = lerp(shB, 2.1, k); }

    // pieds : [0] = pied arrière (plus sombre), [1] = pied avant
    const feet = [
      { hx: x - 11 + swB, by: fy - liftB, sh: shB },
      { hx: x - 6 + swA, by: fy - liftA, sh: shA },
    ];
    const tops = feet.map((f) => f.by - f.sh - 6);
    const duck = mode === 'duck';
    const H = duck ? fy - 13 : Math.max(tops[0], tops[1]) - 7.5 - bob; // hanches
    const N = duck ? H - 15 : H - 22;                                   // cou

    // lueur des ressorts
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const f of feet) {
      const g = c.createRadialGradient(f.hx + 5, f.by - 1, 0, f.hx + 5, f.by - 1, 9);
      g.addColorStop(0, 'rgba(255,140,30,.45)'); g.addColorStop(1, 'rgba(255,60,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(f.hx + 5, f.by - 1, 9, 0, TAU); c.fill();
    }
    c.restore();

    c.lineCap = 'round'; c.lineJoin = 'round';
    const leg = (f, back) => {
      const hx = duck ? x + (back ? -6 : 1) : x + (back ? -4 : 2);
      c.strokeStyle = '#0c0a0e'; c.lineWidth = 7.4;
      c.beginPath(); c.moveTo(hx, H - 1); c.lineTo(f.hx + 5.5, f.by - f.sh - 5.4); c.stroke();
      c.strokeStyle = back ? '#2a2630' : '#3b3644'; c.lineWidth = 5.8;
      c.beginPath(); c.moveTo(hx, H - 1); c.lineTo(f.hx + 5.5, f.by - f.sh - 5.4); c.stroke();
    };
    // bras (2 segments, coude plié) — a > 0 : vers l'avant
    const arm = (sx, sy, a, back) => {
      const ex = sx + Math.sin(a) * 6.4, ey = sy + Math.cos(a) * 6.4;
      const hx = ex + Math.cos(a) * 5.6, hy = ey - Math.sin(a) * 5.6 + 0.6;
      c.strokeStyle = '#0c0a0e'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke();
      c.strokeStyle = back ? '#1f1c24' : '#34303b'; c.lineWidth = 4.4;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke();
      c.fillStyle = back ? '#9c6544' : '#c98a5e'; c.beginPath(); c.arc(hx, hy, 2.2, 0, TAU); c.fill();
    };
    const swing = mode === 'run' ? Math.cos(ph) * 0.95 : mode === 'air' ? 0.9 : mode === 'duck' ? 1.1 : mode === 'dead' ? -0.4 : 0.15 + 0.1 * Math.sin(tt * 5.2);
    const shoulder = duck ? [x + 6, N + 4] : [x + 2.5, N + 5];

    // arrière-plan du personnage : jambe, chaussure et bras arrière
    leg(feet[0], true);
    shoe(c, feet[0].hx, feet[0].by, feet[0].sh, { upper: '#0f0d12', hot: true });
    arm(shoulder[0] - 3, shoulder[1], mode === 'air' ? -0.7 : -swing, true);
    leg(feet[1], false);
    shoe(c, feet[1].hx, feet[1].by, feet[1].sh, { hot: true });

    // corps : sweat à capuche noir, Le Y bien enrobé (gros ventre vers l'avant)
    c.beginPath();
    if (duck) {
      c.moveTo(x - 11, H - 1);
      c.quadraticCurveTo(x - 13, H - 12, x - 4, N + 1);
      c.quadraticCurveTo(x + 4, N - 2, x + 10, N + 1);
      c.bezierCurveTo(x + 19, N + 4, x + 21, H - 1, x + 12, H + 1.5);
      c.quadraticCurveTo(x, H + 3, x - 11, H - 1);
    } else {
      c.moveTo(x - 4, N + 1);
      c.quadraticCurveTo(x - 12, N + 5, x - 11, H - 3);
      c.quadraticCurveTo(x - 9, H + 3, x + 2, H + 2.6);
      c.quadraticCurveTo(x + 10, H + 2.4, x + 12, H - 1);
      c.bezierCurveTo(x + 19, H - 7, x + 17, N + 8, x + 8, N + 2.5);
      c.quadraticCurveTo(x + 2, N - 1.5, x - 4, N + 1);
    }
    c.closePath();
    const bg = c.createLinearGradient(x - 12, 0, x + 18, 0);
    bg.addColorStop(0, '#1b1820'); bg.addColorStop(0.55, '#2c2832'); bg.addColorStop(1, '#3d3540');
    c.fillStyle = bg; c.fill();
    c.strokeStyle = '#0c0a0e'; c.lineWidth = 0.9; c.stroke();
    // reflet du feu sur le ventre
    c.save(); c.clip();
    c.strokeStyle = 'rgba(255,140,50,.55)'; c.lineWidth = 2.2;
    c.beginPath();
    if (duck) c.arc(x + 4, H - 6, 14, -1.0, 0.6);
    else c.arc(x + 2, H - 9, 15.5, -1.1, 0.75);
    c.stroke();
    // bande blanche sur l'épaule (comme sur le logo) + poche kangourou
    c.strokeStyle = 'rgba(235,232,228,.55)'; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(x - 8, N + 9); c.lineTo(x - 1, N + 3); c.stroke();
    c.fillStyle = 'rgba(0,0,0,.28)';
    c.beginPath(); c.roundRect(duck ? x + 3 : x + 2, duck ? H - 6 : H - 9, 10, 5.5, 2.2); c.fill();
    c.restore();
    // capuche dans le dos
    c.fillStyle = '#15131a';
    c.beginPath(); c.ellipse(duck ? x - 2 : x - 3.5, N + 2.5, 6.5, 4.2, -0.35, 0, TAU); c.fill();

    // tête : le visage du logo dans son anneau de feu
    const hr = duck ? 11.5 : 13.2;
    const hcx = duck ? x + 17 : x + 5.5, hcy = duck ? fy - 25 : N - 9.5;
    headDisc(c, hcx, hcy, hr, tt);
    // fil des écouteurs
    c.strokeStyle = 'rgba(250,250,250,.9)'; c.lineWidth = 0.55;
    c.beginPath(); c.moveTo(hcx + hr * 0.3, hcy + hr * 0.82); c.quadraticCurveTo(hcx + hr * 0.55, hcy + hr * 1.5, x + 8, duck ? H - 4 : H - 7); c.stroke();
    // bras avant
    arm(shoulder[0] + 1, shoulder[1] + 0.5, mode === 'air' ? 1.2 : swing, false);

    if (mode === 'dead') {
      // ressort qui a sauté + étoiles qui tournent
      c.strokeStyle = '#d8dbe3'; c.lineWidth = 0.8;
      c.beginPath();
      const sx = feet[1].hx + 15, sy = feet[1].by - 3;
      for (let i = 0; i <= 12; i++) { const a = i * 1.2; c.lineTo(sx + i * 0.9 + Math.cos(a) * 1.2, sy - i * 0.8 + Math.sin(a) * 1.6); }
      c.stroke();
      for (let i = 0; i < 3; i++) {
        const a = tt * 4 + (i * TAU) / 3;
        star(c, hcx + Math.cos(a) * 13, hcy - hr - 4 + Math.sin(a) * 3.5, 2.6, '#ffd84a');
      }
    }
  }

  function star(c, x, y, r, color) {
    c.fillStyle = color; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }

  // ================================================================== dessin : obstacles et bonus
  function drawPlot(c, x, gy, n, night, t) {
    for (let i = 0; i < n; i++) {
      const px = x + i * 20;
      c.fillStyle = '#1b1416';
      c.beginPath(); c.roundRect(px, gy - 4, 18, 4, 1.2); c.fill();
      const g = c.createLinearGradient(px + 3, 0, px + 15, 0);
      g.addColorStop(0, '#ff8a2a'); g.addColorStop(0.55, '#ff6200'); g.addColorStop(1, '#c53d00');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(px + 3, gy - 4); c.lineTo(px + 7.2, gy - 28); c.lineTo(px + 10.8, gy - 28); c.lineTo(px + 15, gy - 4); c.closePath(); c.fill();
      c.save(); c.clip();
      c.fillStyle = '#f6f1e8'; c.fillRect(px, gy - 13, 18, 3.4); c.fillRect(px, gy - 21, 18, 3);
      c.restore();
      c.fillStyle = '#ffb066'; c.fillRect(px + 7.2, gy - 28.6, 3.6, 1.2);
      if (night > 0.2 && (i + Math.floor(t * 3)) % 2 === 0) {
        c.save(); c.globalCompositeOperation = 'lighter';
        const lg = c.createRadialGradient(px + 9, gy - 30, 0, px + 9, gy - 30, 8);
        lg.addColorStop(0, `rgba(255,200,60,${0.9 * night})`); lg.addColorStop(1, 'rgba(255,120,0,0)');
        c.fillStyle = lg; c.beginPath(); c.arc(px + 9, gy - 30, 8, 0, TAU); c.fill(); c.restore();
      }
    }
  }

  function bin(c, x, gy, color, lid, tag, tilt = 0) {
    c.save(); c.translate(x + 12, gy); c.rotate(tilt); c.translate(-12, 0);
    c.fillStyle = '#121014';
    c.beginPath(); c.arc(5, -3, 3, 0, TAU); c.arc(19, -3, 3, 0, TAU); c.fill();
    const g = c.createLinearGradient(1, 0, 23, 0);
    g.addColorStop(0, color[0]); g.addColorStop(0.6, color[1]); g.addColorStop(1, color[2]);
    c.fillStyle = g;
    c.beginPath(); c.moveTo(2.6, -4); c.lineTo(1.2, -30); c.lineTo(22.8, -30); c.lineTo(21.4, -4); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 0.8;
    for (const xx of [7, 12, 17]) { c.beginPath(); c.moveTo(xx, -27); c.lineTo(xx, -7); c.stroke(); }
    c.fillStyle = lid;
    c.beginPath(); c.roundRect(0, -34.5, 24, 5, 1.6); c.fill();
    c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(1.5, -34, 21, 1);
    if (tag) {
      c.save(); c.translate(12, -17); c.rotate(-0.12);
      c.font = `900 5.6px ${FONT_T}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#f6f1e8'; c.fillText(tag, 0, 0);
      c.restore();
    }
    c.restore();
  }

  function drawPoubelle(c, x, gy, v) {
    const colors = [
      [['#3d8a55', '#2f6d45', '#1f4a30'], '#24563a'],
      [['#6c737e', '#555b66', '#383c45'], '#ffcf3a'],
    ];
    const [cl, lid] = colors[v % 2];
    bin(c, x, gy, cl, lid, 'BLOCUS');
  }

  function drawPile(c, x, gy) {
    // deux poubelles + pancarte « ON VEUT DES SHOX »
    c.strokeStyle = '#6b4a2a'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x + 25, gy - 30); c.lineTo(x + 25, gy - 42); c.stroke();
    bin(c, x, gy, ['#3d8a55', '#2f6d45', '#1f4a30'], '#24563a', '');
    bin(c, x + 26, gy, ['#6c737e', '#555b66', '#383c45'], '#ffcf3a', '');
    c.save(); c.translate(x + 25, gy - 46); c.rotate(-0.06);
    c.fillStyle = '#efe4cc'; c.beginPath(); c.roundRect(-14, -6, 28, 12, 1); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 0.5; c.stroke();
    c.fillStyle = '#c4161c'; c.font = `900 4.4px ${FONT_T}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('ON VEUT', 0, -2.3); c.fillText('DES SHOX', 0, 2.6);
    c.restore();
  }

  function drawCones(c, x, gy, syms, night) {
    syms.forEach((s, i) => {
      const cx = x + i * 16;
      c.fillStyle = '#16121a'; c.beginPath(); c.roundRect(cx, gy - 3, 14, 3, 1); c.fill();
      const g = c.createLinearGradient(cx + 2, 0, cx + 12, 0);
      g.addColorStop(0, '#ff5c98'); g.addColorStop(0.6, '#ff2d75'); g.addColorStop(1, '#b8124c');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(cx + 2, gy - 3); c.lineTo(cx + 5.6, gy - 23); c.lineTo(cx + 8.4, gy - 23); c.lineTo(cx + 12, gy - 3); c.closePath(); c.fill();
      c.save(); c.clip(); c.fillStyle = '#141018'; c.fillRect(cx, gy - 15.5, 14, 8); c.restore();
      c.save();
      if (night > 0.2) { c.shadowColor = '#ff2d75'; c.shadowBlur = 6 * night; }
      c.strokeStyle = '#ffffff'; c.lineWidth = 0.9; c.lineJoin = 'round';
      const sx = cx + 7, sy = gy - 11.5;
      c.beginPath();
      if (s === 0) c.arc(sx, sy, 2.3, 0, TAU);
      else if (s === 1) { c.moveTo(sx, sy - 2.5); c.lineTo(sx + 2.6, sy + 2); c.lineTo(sx - 2.6, sy + 2); c.closePath(); }
      else c.rect(sx - 2.2, sy - 2.2, 4.4, 4.4);
      c.stroke(); c.restore();
    });
  }

  function drawDalgona(c, cx, cy, r, rot, speedLines) {
    if (speedLines) {
      c.strokeStyle = 'rgba(255,220,160,.35)'; c.lineWidth = 0.8; c.lineCap = 'round';
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(cx + r + 3, cy + i * 4.5); c.lineTo(cx + r + 10 + Math.abs(i) * -3, cy + i * 4.5); c.stroke(); }
    }
    c.save();
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(cx + 1, cy + r * 0.25 + 1.5, r, r * 0.9, 0, 0, TAU); c.fill();
    c.translate(cx, cy); c.rotate(rot);
    if (SPR.dalgona) c.drawImage(SPR.dalgona, -r, -r, r * 2, r * 2);
    else {
      const g = c.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
      g.addColorStop(0, '#f0b44a'); g.addColorStop(1, '#b36a12');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(90,40,0,.6)'; c.lineWidth = 0.8; c.beginPath(); c.ellipse(0, 0, r * 0.6, r * 0.28, 0, 0, TAU); c.stroke();
    }
    c.strokeStyle = 'rgba(120,60,0,.55)'; c.lineWidth = 0.7; c.beginPath(); c.arc(0, 0, r - 0.35, 0, TAU); c.stroke();
    c.restore();
  }

  function limb(c, ax, ay, bx, by, L1, L2, sign) {
    const dx = bx - ax, dy = by - ay; const d = Math.min(L1 + L2 - 0.01, Math.hypot(dx, dy));
    const a = Math.atan2(dy, dx); const b = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const kx = ax + Math.cos(a + b * sign) * L1, ky = ay + Math.sin(a + b * sign) * L1;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(kx, ky); c.lineTo(bx, by); c.stroke();
  }

  function drawJack(c, x, gy, t) {
    // Jack Shi sur son vélo (52 vitesses), qui arrive EN FACE (tourné vers la gauche).
    const r = 9.2, wy = gy - r;
    const F = [x + 9.5, wy], B = [x + 35.5, wy], C = [x + 23, wy - 1], S = [x + 28.5, wy - 18], Hd = [x + 14, wy - 16.5];
    const spin = t * 18;
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [wx, wyy] of [F, B]) {
      c.strokeStyle = '#0d0c10'; c.lineWidth = 2.4; c.beginPath(); c.arc(wx, wyy, r - 1.2, 0, TAU); c.stroke();
      c.strokeStyle = '#d7dde8'; c.lineWidth = 0.6; c.beginPath(); c.arc(wx, wyy, r - 2.8, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(220,226,236,.7)'; c.lineWidth = 0.35;
      for (let i = 0; i < 6; i++) { const a = -spin + (i * Math.PI) / 3; c.beginPath(); c.moveTo(wx, wyy); c.lineTo(wx + Math.cos(a) * (r - 2.8), wyy + Math.sin(a) * (r - 2.8)); c.stroke(); }
      c.fillStyle = '#9aa2b0'; c.beginPath(); c.arc(wx, wyy, 0.9, 0, TAU); c.fill();
    }
    const pa = -spin * 0.55;
    const P1 = [C[0] + Math.cos(pa) * 3.8, C[1] + Math.sin(pa) * 3.8], P2 = [C[0] - Math.cos(pa) * 3.8, C[1] - Math.sin(pa) * 3.8];
    const hip = [S[0] - 1, S[1] - 2.2];
    const sh = [x + 16, wy - 29.5];
    const grip = [Hd[0] - 4.2, Hd[1] - 2.2];
    const legDraw = (P, far) => {
      // cuisse (cuissard noir) puis mollet (peau) : genou vers l'avant
      const dx = P[0] - hip[0], dy = P[1] - hip[1], L1 = 9.6, L2 = 9.4;
      const d = Math.min(L1 + L2 - 0.01, Math.hypot(dx, dy));
      const a = Math.atan2(dy, dx), b = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      const k = [hip[0] + Math.cos(a + b) * L1, hip[1] + Math.sin(a + b) * L1];
      c.strokeStyle = far ? '#a8704f' : '#cf946c'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(k[0], k[1]); c.lineTo(P[0], P[1]); c.stroke();
      c.strokeStyle = far ? '#101015' : '#1b1b22'; c.lineWidth = 3.8;
      c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(k[0], k[1]); c.stroke();
      c.fillStyle = far ? '#bfc4cc' : '#f2f3f6'; c.beginPath(); c.ellipse(P[0] - 1.2, P[1], 2.4, 1.2, 0, 0, TAU); c.fill();
    };
    legDraw(P2, true);
    // cadre blanc + touches bleu-blanc-rouge
    c.strokeStyle = '#f2f4f8'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(B[0], B[1]); c.lineTo(C[0], C[1]); c.lineTo(S[0], S[1]); c.closePath();
    c.moveTo(S[0], S[1]); c.lineTo(Hd[0], Hd[1]); c.lineTo(C[0], C[1]); c.moveTo(Hd[0], Hd[1]); c.lineTo(F[0], F[1]); c.stroke();
    c.strokeStyle = '#2f5bd8'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(Hd[0] + 1.2, Hd[1] + 3); c.lineTo(C[0] - 2.6, C[1] - 2.6); c.stroke();
    c.strokeStyle = '#e8273a'; c.beginPath(); c.moveTo(S[0] - 0.5, S[1] + 3); c.lineTo(C[0] + 1.6, C[1] - 2.6); c.stroke();
    c.strokeStyle = '#111'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(Hd[0], Hd[1]); c.lineTo(Hd[0] - 2.4, Hd[1] - 2.4); c.quadraticCurveTo(Hd[0] - 6.4, Hd[1] - 2.6, Hd[0] - 5.4, Hd[1] + 1.8); c.stroke();
    c.beginPath(); c.moveTo(S[0] - 2.8, S[1] - 1.2); c.lineTo(S[0] + 3, S[1] - 1.2); c.stroke();
    c.fillStyle = '#d7dde8'; c.beginPath(); c.arc(C[0], C[1], 2.2, 0, TAU); c.fill();
    // buste penché (maillot noir « JACK SHI »)
    c.beginPath();
    c.moveTo(hip[0] + 3.4, hip[1] + 1.5); c.lineTo(hip[0] - 3.2, hip[1] + 1.8);
    c.quadraticCurveTo(sh[0] - 3, sh[1] + 9, sh[0] - 3.2, sh[1] + 2.8);
    c.quadraticCurveTo(sh[0] + 1, sh[1] - 3.6, sh[0] + 4.6, sh[1] - 0.8);
    c.quadraticCurveTo(hip[0] + 4, hip[1] - 9, hip[0] + 3.4, hip[1] + 1.5);
    c.closePath();
    c.fillStyle = '#1d1d24'; c.fill();
    c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(hip[0] + 2.6, hip[1] - 2); c.quadraticCurveTo(sh[0] + 6, sh[1] + 5, sh[0] + 2.6, sh[1] + 0.4); c.stroke();
    c.save(); c.translate((hip[0] + sh[0]) / 2 + 0.6, (hip[1] + sh[1]) / 2 + 0.6); c.rotate(-0.95);
    c.fillStyle = 'rgba(240,240,245,.85)'; c.font = `900 2.6px ${FONT_T}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('JACK SHI', 0, 0); c.restore();
    legDraw(P1, false);
    // bras : manche noire + avant-bras
    const el = [sh[0] - 4.6, sh[1] + 5.2];
    c.strokeStyle = '#1d1d24'; c.lineWidth = 3.2; c.beginPath(); c.moveTo(sh[0], sh[1]); c.lineTo(el[0], el[1]); c.stroke();
    c.strokeStyle = '#cf946c'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(el[0], el[1]); c.lineTo(grip[0], grip[1]); c.stroke();
    c.fillStyle = '#2f5bd8'; c.fillRect(sh[0] - 3.2, sh[1] + 2.2, 1.1, 1.5); c.fillStyle = '#fff'; c.fillRect(sh[0] - 2.1, sh[1] + 2.2, 1.1, 1.5); c.fillStyle = '#e8273a'; c.fillRect(sh[0] - 1, sh[1] + 2.2, 1.1, 1.5);
    // tête (photo de Jack Shi : casque, lunettes, barbe blanche)
    const hc = [x + 11.8, wy - 37.4], hr = 8.6;
    c.fillStyle = '#cf946c'; c.beginPath(); c.moveTo(sh[0] - 2, sh[1]); c.lineTo(hc[0] + 1, hc[1] + hr - 1); c.lineTo(hc[0] + 4, hc[1] + hr - 2); c.closePath(); c.fill();
    if (SPR.jack) c.drawImage(SPR.jack, hc[0] - hr, hc[1] - hr, hr * 2, hr * 2);
    else { c.fillStyle = '#e9b38f'; c.beginPath(); c.arc(hc[0], hc[1], hr, 0, TAU); c.fill(); c.fillStyle = '#f4f4f4'; c.beginPath(); c.arc(hc[0], hc[1] + 3, hr * 0.7, 0, Math.PI); c.fill(); }
    c.strokeStyle = 'rgba(160,190,255,.85)'; c.lineWidth = 0.7; c.beginPath(); c.arc(hc[0], hc[1], hr - 0.3, 0, TAU); c.stroke();
  }

  function drawPickup(c, cx, cy, t, s = 1) {
    c.save();
    c.translate(cx, cy); c.scale(s, s);
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 17);
    g.addColorStop(0, 'rgba(255,170,40,.55)'); g.addColorStop(1, 'rgba(255,60,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 17, 0, TAU); c.fill();
    for (let i = 0; i < 4; i++) flameTongue(c, -6 + i * 4, -2, 9 + 3 * Math.sin(t * 9 + i * 2), 2.6, t, i * 1.9);
    c.globalCompositeOperation = 'source-over';
    c.rotate(-0.12);
    shoe(c, -8.3, 6, 4.2, { hot: true, upper: '#1a1218', accent: '#ffd84a' });
    c.restore();
  }

  // ================================================================== dessin : décor
  let MOON = null;
  function moonSprite() {
    if (MOON) return MOON;
    MOON = document.createElement('canvas'); MOON.width = MOON.height = 96;
    const m = MOON.getContext('2d');
    const g = m.createRadialGradient(40, 40, 4, 48, 48, 44);
    g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#f3d9a8');
    m.fillStyle = g; m.beginPath(); m.arc(48, 48, 44, 0, TAU); m.fill();
    m.globalCompositeOperation = 'destination-out';
    m.beginPath(); m.arc(68, 36, 38, 0, TAU); m.fill();
    return MOON;
  }
  function drawSky(c, S) {
    const n = S.night, W = S.W, gy = S.gy;
    const g = c.createLinearGradient(0, 0, 0, gy);
    g.addColorStop(0, col('top', n)); g.addColorStop(0.55, col('mid', n)); g.addColorStop(1, col('hor', n));
    c.fillStyle = g; c.fillRect(-20, -20, W + 40, gy + 22);
    if (n > 0.01) {
      for (const [sx, sy, sr, sp] of STARS) {
        const x = ((sx - S.dist * 0.01) % 1400 + 1400) % 1400;
        if (x > W + 4) continue;
        const a = n * (0.45 + 0.55 * Math.sin(S.clock * 2.2 + sp)) * (1 - sy * 0.6);
        c.fillStyle = `rgba(255,244,220,${a})`;
        c.fillRect(x, sy * (gy - 40), sr * 0.7, sr * 0.7);
      }
      const mx = W * 0.2, my = Math.min(42, gy * 0.24);
      c.save(); c.globalAlpha = n;
      const mg = c.createRadialGradient(mx, my, 4, mx, my, 34);
      mg.addColorStop(0, 'rgba(255,236,200,.35)'); mg.addColorStop(1, 'rgba(255,236,200,0)');
      c.fillStyle = mg; c.beginPath(); c.arc(mx, my, 34, 0, TAU); c.fill();
      c.drawImage(moonSprite(), mx - 12, my - 12, 24, 24);
      c.restore();
    }
    if (n < 0.99) {
      const sx = W * 0.74, sy = gy - 30, sr = 30;
      c.save(); c.globalAlpha = 1 - n;
      const sg = c.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 3);
      sg.addColorStop(0, 'rgba(255,200,90,.5)'); sg.addColorStop(1, 'rgba(255,120,40,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, sr * 3, 0, TAU); c.fill();
      const dg = c.createLinearGradient(0, sy - sr, 0, sy + sr);
      dg.addColorStop(0, '#fff0a8'); dg.addColorStop(0.5, '#ffb43c'); dg.addColorStop(1, '#ff5a1f');
      c.fillStyle = dg; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
      c.fillStyle = col('hor', n);
      for (let i = 0; i < 5; i++) { const yy = sy + 4 + i * 5.2; c.fillRect(sx - sr, yy, sr * 2, 1 + i * 0.55); }
      c.restore();
    }
    // nuages / fumée
    for (const [cx0, cyk, cw] of CLOUDS) {
      const x = ((cx0 - S.dist * 0.06 - S.clock * 4) % 1600 + 1600) % 1600 - 80;
      if (x > W + 60) continue;
      const y = cyk * gy;
      c.fillStyle = col('cloud', n, 0.16 + 0.1 * (1 - n));
      c.beginPath(); c.ellipse(x, y, cw, cw * 0.28, 0, 0, TAU); c.ellipse(x + cw * 0.45, y - cw * 0.14, cw * 0.55, cw * 0.26, 0, 0, TAU); c.ellipse(x - cw * 0.5, y + 1, cw * 0.5, cw * 0.2, 0, 0, TAU); c.fill();
    }
  }

  function drawSkyline(c, S, L, par, color, wins) {
    const off = (S.dist * par) % L.period;
    const n = S.night;
    for (let rep = 0; rep * L.period - off < S.W + 10; rep++) {
      const base = rep * L.period - off;
      for (const b of L.list) {
        const x = base + b.x;
        if (x > S.W + 2 || x + b.w < -40) continue;
        const top = S.gy - b.h;
        c.fillStyle = color;
        if (b.kind === 'lycee') { lycee(c, x, S.gy, b, color, n, S.clock); continue; }
        if (b.kind === 'tour') { tour(c, x, S.gy, b, color, n, S.clock); continue; }
        c.fillRect(x, top, b.w, b.h + 1);
        if (b.kind === 'toit') { c.beginPath(); c.moveTo(x - 1, top); c.lineTo(x + b.w / 2, top - 8); c.lineTo(x + b.w + 1, top); c.fill(); }
        if (b.kind === 'antenne') { c.fillRect(x + b.w * 0.6, top - 12, 1.2, 12); if (n > 0.3 && Math.sin(S.clock * 3 + b.x) > 0.6) { c.fillStyle = `rgba(255,60,60,${n})`; c.fillRect(x + b.w * 0.6 - 0.6, top - 13.5, 2.4, 2.4); } }
        if (wins && n > 0.02) {
          for (const [wx, wy, k] of b.win) {
            if (k > 0.75) continue;
            c.fillStyle = col('win', n, n * (0.35 + k * 0.6));
            c.fillRect(x + wx, top + wy, 2.6, 3.2);
          }
        }
      }
    }
  }

  function lycee(c, x, gy, b, color, n, t) {
    const top = gy - b.h;
    c.fillStyle = color;
    c.fillRect(x, top, b.w, b.h + 1);
    c.beginPath(); c.moveTo(x + b.w / 2 - 22, top); c.lineTo(x + b.w / 2, top - 11); c.lineTo(x + b.w / 2 + 22, top); c.fill();
    c.fillRect(x + b.w / 2 - 0.6, top - 26, 1.2, 16);
    c.fillStyle = '#2f5bd8'; c.fillRect(x + b.w / 2 + 0.6, top - 26, 4, 5);
    c.fillStyle = '#f2f2f2'; c.fillRect(x + b.w / 2 + 4.6, top - 26, 4, 5);
    c.fillStyle = '#e8273a'; c.fillRect(x + b.w / 2 + 8.6, top - 26, 4, 5);
    // banderole
    c.fillStyle = 'rgba(240,232,214,.92)';
    c.beginPath(); c.moveTo(x + 14, top + 7); c.quadraticCurveTo(x + b.w / 2, top + 12, x + b.w - 14, top + 7); c.lineTo(x + b.w - 14, top + 16); c.quadraticCurveTo(x + b.w / 2, top + 21, x + 14, top + 16); c.closePath(); c.fill();
    c.fillStyle = '#c4161c'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `900 6.4px ${FONT_T}`;
    const bt = 'BLOCUS · ON VEUT DES SHOX', bw = c.measureText(bt).width, room = b.w - 36;
    if (bw > room) c.font = `900 ${(6.4 * room / bw).toFixed(2)}px ${FONT_T}`;
    c.fillText(bt, x + b.w / 2, top + 14);
    c.fillStyle = col('win', n, 0.15 + n * 0.7);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) if ((i * 7 + j * 3) % 5 !== 0) c.fillRect(x + 8 + i * 13, top + 24 + j * 8, 6, 4.5);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + b.w / 2 - 7, gy - 10, 14, 10);
  }

  function tour(c, x, gy, b, color, n, t) {
    const top = gy - b.h;
    c.fillStyle = color;
    c.beginPath(); c.moveTo(x, gy + 1); c.lineTo(x + 3, top); c.lineTo(x + b.w - 3, top); c.lineTo(x + b.w, gy + 1); c.fill();
    c.fillStyle = col('win', n, 0.12 + n * 0.6);
    for (let i = 0; i < 12; i++) c.fillRect(x + 7, top + 6 + i * 7.4, b.w - 14, 2.4);
    // enseigne géante en forme de Shox (silhouette au néon)
    c.save(); c.translate(x + b.w / 2 - 14, top - 2); c.scale(1.7, 1.7);
    c.fillStyle = color; c.fillRect(1.3, -3, 10, 3);
    c.beginPath(); c.moveTo(-0.3, -3); c.lineTo(0.2, -9.6); c.quadraticCurveTo(2.4, -8.7, 4.6, -9); c.lineTo(8.8, -10.1); c.quadraticCurveTo(12.4, -8.3, 15.5, -6.6); c.quadraticCurveTo(17.2, -5.6, 16.6, -3); c.closePath(); c.fill();
    c.strokeStyle = `rgba(255,140,40,${0.35 + 0.5 * n})`; c.lineWidth = 0.45; c.stroke();
    c.restore();
    if (Math.sin(t * 2.4) > 0) { c.fillStyle = 'rgba(255,70,50,.95)'; c.beginPath(); c.arc(x + b.w / 2, top - 18, 1.5, 0, TAU); c.fill(); }
  }

  function drawStreet(c, S) {
    const n = S.night, W = S.W, gy = S.gy;
    const par = 0.45, per = 260;
    const off = (S.dist * par) % per;
    for (let x = -off; x < W + 30; x += per) {
      // lampadaire
      c.fillStyle = col('mid2', n);
      c.fillRect(x, gy - 62, 2, 62);
      c.beginPath(); c.moveTo(x + 1, gy - 62); c.quadraticCurveTo(x + 2, gy - 68, x + 12, gy - 66); c.lineTo(x + 12, gy - 64); c.quadraticCurveTo(x + 4, gy - 65, x + 2, gy - 60); c.fill();
      c.fillRect(x + 9, gy - 66, 7, 2.4);
      if (n > 0.05) {
        c.save(); c.globalCompositeOperation = 'lighter';
        const lg = c.createRadialGradient(x + 12.5, gy - 63, 0, x + 12.5, gy - 63, 22);
        lg.addColorStop(0, `rgba(255,190,90,${0.55 * n})`); lg.addColorStop(1, 'rgba(255,140,40,0)');
        c.fillStyle = lg; c.beginPath(); c.arc(x + 12.5, gy - 63, 22, 0, TAU); c.fill();
        c.fillStyle = `rgba(255,170,80,${0.07 * n})`;
        c.beginPath(); c.moveTo(x + 9, gy - 63); c.lineTo(x - 8, gy); c.lineTo(x + 34, gy); c.lineTo(x + 16, gy - 63); c.fill();
        c.restore();
      }
    }
    // panneau publicitaire Fire Shox
    const bper = 1300, boff = (S.dist * par + 520) % bper;
    const bx = bper - boff - 200;
    for (const xx of [bx, bx + bper]) {
      if (xx > W + 10 || xx < -90) continue;
      c.fillStyle = col('mid2', n);
      c.fillRect(xx + 12, gy - 30, 2.4, 30); c.fillRect(xx + 62, gy - 30, 2.4, 30);
      c.fillStyle = n > 0.5 ? '#1a0f14' : '#24151a';
      c.beginPath(); c.roundRect(xx, gy - 58, 78, 30, 2); c.fill();
      c.strokeStyle = `rgba(255,140,40,${0.35 + 0.5 * n})`; c.lineWidth = 0.8; c.stroke();
      c.save();
      if (n > 0.3) { c.shadowColor = '#ff7a00'; c.shadowBlur = 8 * n; }
      const tg = c.createLinearGradient(xx + 6, 0, xx + 72, 0); tg.addColorStop(0, '#ff4a00'); tg.addColorStop(1, '#ffc21a');
      c.fillStyle = tg; c.font = `11px ${FONT_D}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('FIRE SHOX', xx + 39, gy - 47);
      c.restore();
      c.fillStyle = 'rgba(255,230,200,.75)'; c.font = `700 4.6px ${FONT_T}`; c.textAlign = 'center';
      c.fillText('100% INCANDESCENT', xx + 39, gy - 36);
    }
  }

  function drawGround(c, S) {
    const n = S.night, W = S.W, gy = S.gy, H = S.H;
    const g = c.createLinearGradient(0, gy, 0, H);
    g.addColorStop(0, col('ground', n)); g.addColorStop(1, col('ground2', n));
    c.fillStyle = g; c.fillRect(-20, gy, W + 40, H - gy + 20);
    c.fillStyle = col('edge', n, 0.9); c.fillRect(-20, gy - 0.4, W + 40, 1.3);
    c.fillStyle = col('edge', n, 0.12); c.fillRect(-20, gy + 1, W + 40, 3);
    const off = S.dist % 640;
    for (const [px, dy, w, k] of PEBBLES) {
      if (gy + dy > H - 2) continue;
      for (const base of [0, 640]) {
        const x = px + base - off;
        if (x < -6 || x > W + 6) continue;
        c.fillStyle = col('edge', n, 0.12 + k * 0.22);
        c.fillRect(x, gy + dy, w, 0.9);
      }
    }
    if (H - gy > 44) {
      const ry = gy + (H - gy) * 0.55;
      const doff = S.dist % 60;
      c.fillStyle = col('edge', n, 0.22);
      for (let x = -doff; x < W + 40; x += 60) c.fillRect(x, ry, 28, 1.6);
    }
  }

  // ================================================================== rendu complet du monde
  function renderWorld(c, S, a, opts = {}) {
    const p = S.p;
    const d = lerp(S.pdist, S.dist, a);
    const view = Object.create(S); view.dist = d;
    drawSky(c, view);
    drawSkyline(c, view, FAR2, 0.05, col('far2', S.night, 0.85), false);
    drawSkyline(c, view, FAR, 0.13, col('far', S.night), true);
    drawStreet(c, view);
    drawGround(c, view);

    for (const k of S.picks) {
      const x = lerp(k.px, k.x, a);
      drawPickup(c, x, k.cy + Math.sin(S.clock * 4 + k.seed) * 2.2, S.clock + k.seed);
    }
    for (const o of S.obs) {
      const x = lerp(o.px, o.x, a);
      if (x > S.W + 80 || x + o.w < -60) continue;
      if (o.type === 'plot') drawPlot(c, x, S.gy, o.n, S.night, S.clock);
      else if (o.type === 'poubelle') drawPoubelle(c, x, S.gy, o.v);
      else if (o.type === 'pile') drawPile(c, x, S.gy);
      else if (o.type === 'cones') drawCones(c, x, S.gy, o.syms, S.night);
      else if (o.type === 'dalgona') drawDalgona(c, x + o.r, o.cy + Math.sin(S.clock * 5 + o.seed) * 1.5, o.r, -S.clock * 7, true);
      else if (o.type === 'jack') drawJack(c, x, S.gy, S.clock);
    }
    // avertissement Jack Shi (il arrive en face)
    for (const o of S.obs) {
      if (o.type !== 'jack' || o.x < S.W - 30) continue;
      const blink = Math.sin(S.clock * 16) > -0.2;
      if (!blink) continue;
      const wx = S.W - 18, wy = S.gy - 40;
      c.fillStyle = 'rgba(255,60,40,.92)'; c.beginPath(); c.moveTo(wx, wy - 10); c.lineTo(wx + 10, wy + 8); c.lineTo(wx - 10, wy + 8); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.font = `900 11px ${FONT_T}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', wx, wy + 2);
      c.font = `900 7px ${FONT_T}`; c.textAlign = 'right'; c.fillStyle = '#ffe2d6'; c.fillText('DRING DRING !', wx - 14, wy + 1);
    }

    // particules (flammes, poussière, étincelles)
    c.save();
    for (const q of S.parts) {
      const k = q.life / q.max;
      if (q.kind === 'dust') { c.globalCompositeOperation = 'source-over'; c.fillStyle = `rgba(200,170,150,${0.35 * k})`; }
      else {
        c.globalCompositeOperation = 'lighter';
        const h = q.kind === 'spark' ? 45 : 18 + 30 * k;
        c.fillStyle = `hsla(${h},100%,${48 + 22 * k}%,${0.85 * k})`;
      }
      c.beginPath(); c.arc(q.x, q.y, q.s * (0.4 + 0.6 * k), 0, TAU); c.fill();
    }
    c.restore();

    // Le Y
    const y = lerp(p.py, p.y, a);
    const mode = p.dead ? 'dead' : opts.idle ? 'idle' : !p.ground ? 'air' : p.duck ? 'duck' : 'run';
    drawLeY(c, p.x, S.gy - y, { mode, phase: p.phase, vy: p.vy, land: p.land, time: S.clock });

    for (const f of S.floats) {
      const k = f.life / f.max;
      c.globalAlpha = Math.min(1, k * 2);
      c.font = `900 9px ${FONT_T}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 2.4; c.strokeStyle = 'rgba(30,8,0,.85)'; c.strokeText(f.text, f.x, f.y);
      c.fillStyle = '#ffd84a'; c.fillText(f.text, f.x, f.y);
      c.globalAlpha = 1;
    }
  }

  // ================================================================== boîtes de collision
  function playerBoxes(p, gy) {
    const fy = gy - p.y, x = p.x;
    if (p.duck && p.ground) return [[x + 6, fy - 35, 19, 19], [x - 11, fy - 22, 30, 21]];
    return [[x - 4, fy - 59, 18, 21], [x - 11, fy - 41, 25, 24], [x - 11, fy - 18, 26, 17]];
  }
  function obstacleBoxes(o, gy, clock) {
    const x = o.x;
    switch (o.type) {
      case 'plot': { const out = []; for (let i = 0; i < o.n; i++) out.push([x + i * 20 + 4.5, gy - 26, 9, 26]); return out; }
      case 'poubelle': return [[x + 2, gy - 33, 20, 33]];
      case 'pile': return [[x + 2, gy - 33, 46, 33], [x + 13, gy - 51, 24, 13]];
      case 'cones': return [[x + 3, gy - 21, o.w - 6, 21]];
      case 'dalgona': { const cy = o.cy + Math.sin(clock * 5 + o.seed) * 1.5; return [[x + o.r * 0.25, cy - o.r * 0.75, o.r * 1.5, o.r * 1.5]]; }
      case 'jack': return [[x + 1, gy - 20, 42, 20], [x + 5, gy - 50, 22, 31]];
    }
    return [];
  }
  const hit = (A, B) => A[0] < B[0] + B[2] && A[0] + A[2] > B[0] && A[1] < B[1] + B[3] && A[1] + A[3] > B[1];

  // ================================================================== le jeu
  const DEATH = {
    plot: ['Plot de chantier : 1 — Le Y : 0', 'Le plot a gagné'],
    poubelle: ['Le blocus a tenu bon !', 'Poubelle 1 — Shox 0'],
    pile: ['Le blocus a tenu bon !', 'Pancarte dans la face'],
    cones: ['Éliminé au ○△□ !', 'Joueur 456 éliminé'],
    dalgona: ['Biscuit dans la face !', 'Dalgona cassé (et Le Y aussi)'],
    jack: ['Jack Shi t\'a doublé !', '52 vitesses, 0 pitié'],
  };

  function mount(root, opts = {}) {
    prepare();
    const canvas = document.createElement('canvas');
    canvas.className = 'sr-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', 'Shox Runner : Espace, flèche haut ou clic pour sauter, flèche bas pour s\'accroupir');
    canvas.style.cssText = 'display:block;width:100%;height:100%;outline:none;touch-action:none;cursor:pointer;-webkit-tap-highlight-color:transparent';
    root.appendChild(canvas);
    const c = canvas.getContext('2d');

    let S = makeWorld(CFG.minW, CFG.minH);
    let state = 'idle';
    let best = Math.max(0, Number(store.get(KEY_BEST, 0)) || 0);
    let scale = 1, dpr = 1, cw = 0, ch = 0;
    let acc = 0, last = 0, raf = 0, destroyed = false, frozen = false;
    let holding = false, downKey = false, overT = 0, result = null, lastMilestone = 0;
    let autopilot = false;
    const G = { gap: 0, next: 'plot', pickAt: null, hist: [] };

    function setState(s) { state = s; if (opts.onState) try { opts.onState(s); } catch {} }

    function resize() {
      const r = root.getBoundingClientRect();
      cw = Math.max(1, r.width); ch = Math.max(1, r.height);
      dpr = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      scale = Math.min(cw / CFG.minW, ch / CFG.minH);
      const W = cw / scale, H = ch / scale;
      // le monde garde 200 unités de haut au minimum : une zone plus large montre plus de route, une plus haute plus de ciel
      S.W = W; S.H = H; S.gy = groundOf(H);
      S.p.x = playerX(W);
      draw(1);
    }

    function reset() {
      const W = S.W, H = S.H, night = 0;
      S = makeWorld(W, H); S.night = night;
      G.gap = 140; G.next = 'plot'; G.pickAt = null; G.hist = [];
      lastMilestone = 0; overT = 0; result = null;
    }

    function start() {
      if (state === 'run') return;
      if (state === 'over' || state === 'idle') reset();
      setState('run');
      jump();
      canvas.focus({ preventScroll: true });
    }

    function jump() {
      const p = S.p;
      if (!p.ground || p.dead) return;
      p.ground = false; p.vy = CFG.jumpV; p.cut = false; p.duck = false; p.land = 0;
      snd('pop');
      for (let i = 0; i < 10; i++) S.parts.push({ x: p.x - 4 + rand(-6, 6), y: S.gy - 1, vx: rand(-60, 20) - S.speed * 0.2, vy: rand(-60, -10), life: 0.35, max: 0.35, s: rand(1, 2.2), kind: 'dust' });
    }
    function releaseJump() {
      const p = S.p;
      if (p.ground || p.vy <= CFG.hopV) return;
      if (p.y >= CFG.minJump) p.vy = CFG.hopV; else p.cut = true;
    }

    function press() {
      if (destroyed) return;
      holding = true;
      if (state === 'idle') { start(); return; }
      if (state === 'pause') { resume(); return; }
      if (state === 'over') { if (overT > 0.55) start(); return; }
      jump();
    }
    function release() { holding = false; if (state === 'run') releaseJump(); }

    function pause() { if (state === 'run') { setState('pause'); draw(1); } }
    function resume() { if (state === 'pause') { setState('run'); last = performance.now(); acc = 0; } }

    // -------------------------------------------------------------- apparition des obstacles
    function chooseType() {
      const sc = S.score;
      const pool = [['plot', 3], ['poubelle', 2.4]];
      if (sc > 150) pool.push(['cones', 2.6]);
      if (sc > 300) pool.push(['pile', 1.5]);
      if (sc > 450) pool.push(['dalgona', 2.2]);
      if (sc > 1200 && G.hist[G.hist.length - 1] !== 'jack') pool.push(['jack', 1.4]);
      for (let tries = 0; tries < 6; tries++) {
        let tot = 0; for (const [, w] of pool) tot += w;
        let r = Math.random() * tot, pick = pool[0][0];
        for (const [k, w] of pool) { r -= w; if (r <= 0) { pick = k; break; } }
        const h = G.hist; if (h.length >= 2 && h[h.length - 1] === pick && h[h.length - 2] === pick) continue;
        return pick;
      }
      return 'plot';
    }
    function planNext(lastW) {
      const sp = S.speed;
      const type = chooseType();
      let min = sp * 0.6 + 80 + (lastW || 0);
      if (type === 'jack') min += (sp + CFG.jackV) * 0.5;
      if (G.hist[G.hist.length - 1] === 'jack') min += sp * 0.35;
      if (type === 'dalgona') min += 20;
      const gap = rand(min, min * 1.55);
      G.gap = gap; G.next = type;
      G.pickAt = gap > min * 1.12 && S.score > 40 && Math.random() < 0.5 ? gap * rand(0.42, 0.58) : null;
    }
    function spawn(type) {
      const x = S.W + 14, sc = S.score;
      let o;
      if (type === 'plot') { const n = randInt(1, sc > 150 ? 3 : 2); o = { type, n, w: 18 + (n - 1) * 20, h: 28 }; }
      else if (type === 'poubelle') o = { type, v: randInt(0, 1), w: 24, h: 35 };
      else if (type === 'pile') o = { type, w: 50, h: 52 };
      else if (type === 'cones') { const n = sc > 300 ? randInt(2, 3) : 2; const start = randInt(0, 2); o = { type, syms: Array.from({ length: n }, (_, i) => (start + i) % 3), w: n * 16 - 2, h: 23 }; }
      else if (type === 'dalgona') {
        const lv = Math.random(); const level = lv < 0.3 ? 'bas' : lv < 0.75 ? 'milieu' : 'haut';
        const cy = level === 'bas' ? S.gy - 18 : level === 'milieu' ? S.gy - 50 : S.gy - 77;
        o = { type, r: 10, w: 20, h: 20, cy, level, vx: CFG.dalV };
      } else if (type === 'jack') {
        o = { type, w: 44, h: 48, vx: CFG.jackV };
        snd('ding'); setTimeout(() => { if (!destroyed && state === 'run') snd('ding'); }, 170);
      }
      o.x = type === 'jack' ? x + 150 : x; o.px = o.x; o.seed = Math.random() * 10; o.vx = o.vx || 0;
      S.obs.push(o);
      G.hist.push(type); if (G.hist.length > 4) G.hist.shift();
      return o;
    }
    function spawnPick() {
      const high = S.score > 120 && Math.random() < 0.45;
      S.picks.push({ x: S.W + 14, px: S.W + 14, cy: high ? S.gy - 100 : S.gy - 30, seed: Math.random() * 10 });
    }

    // -------------------------------------------------------------- mise à jour (pas fixe)
    function emit(dt) {
      const p = S.p;
      if (p.dead) return;
      p.emit -= dt;
      const rate = state === 'run' ? 1 / 70 : 1 / 26;
      while (p.emit <= 0) {
        p.emit += rate;
        const fy = S.gy - p.y;
        S.parts.push({ x: p.x - 9 + rand(-2, 6), y: fy - rand(0, 4), vx: -(state === 'run' ? S.speed * 0.32 : 10) - rand(0, 50), vy: -rand(10, 55), life: rand(0.22, 0.45), max: 0.45, s: rand(1.2, 2.6), kind: 'fire' });
      }
    }
    function updateParts(dt) {
      for (let i = S.parts.length - 1; i >= 0; i--) {
        const q = S.parts[i];
        q.life -= dt; if (q.life <= 0) { S.parts.splice(i, 1); continue; }
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.kind === 'dust') q.vy += 120 * dt; else if (q.kind === 'spark') q.vy += 260 * dt; else q.vy -= 40 * dt;
      }
      if (S.parts.length > 220) S.parts.splice(0, S.parts.length - 220);
      for (let i = S.floats.length - 1; i >= 0; i--) { const f = S.floats[i]; f.life -= dt; f.y -= 22 * dt; if (f.life <= 0) S.floats.splice(i, 1); }
    }

    function update(dt) {
      S.clock += dt;
      S.p.py = S.p.y; S.pdist = S.dist;
      for (const o of S.obs) o.px = o.x;
      for (const k of S.picks) k.px = k.x;
      if (S.shake > 0) S.shake = Math.max(0, S.shake - dt);
      if (S.blink > 0) S.blink = Math.max(0, S.blink - dt);
      if (state === 'idle') { emit(dt); updateParts(dt); return; }
      if (state === 'over') { overT += dt; updateParts(dt); return; }
      if (state !== 'run') return;

      S.t += dt;
      S.speed = Math.min(CFG.speedMax, CFG.speed0 + CFG.accel * S.t);
      const dx = S.speed * dt;
      S.dist += dx;
      S.score = S.dist * CFG.scoreK + S.bonus;
      const m = Math.floor(S.score / 100);
      if (m > lastMilestone) { lastMilestone = m; S.blink = 0.9; snd('tick'); }
      const nt = Math.floor(S.score) % 1000 >= 700 ? 1 : 0;
      S.night = clamp(S.night + Math.sign(nt - S.night) * dt * 0.7, 0, 1);

      // Le Y
      const p = S.p;
      if (autopilot) pilot();
      if (!p.ground) {
        const g = CFG.gravity * (p.fast ? CFG.fastFall : 1);
        p.vy -= g * dt; p.y += p.vy * dt;
        if (p.cut && p.y >= CFG.minJump && p.vy > CFG.hopV) { p.vy = CFG.hopV; p.cut = false; }
        if (p.y <= 0) {
          p.y = 0; p.vy = 0; p.ground = true; p.fast = false; p.cut = false; p.land = 0.14;
          for (let i = 0; i < 8; i++) S.parts.push({ x: p.x - 6 + rand(-8, 10), y: S.gy - 1, vx: rand(-80, 30) - S.speed * 0.15, vy: rand(-50, -10), life: 0.3, max: 0.3, s: rand(1, 2), kind: 'dust' });
        }
      }
      p.duck = p.ground && downKey;
      p.fast = !p.ground && downKey;
      if (p.land > 0) p.land = Math.max(0, p.land - dt);
      p.phase += dt * S.speed / 21;
      emit(dt);

      // obstacles
      for (const o of S.obs) o.x -= dx + o.vx * dt;
      while (S.obs.length && S.obs[0].x + S.obs[0].w < -80) S.obs.shift();
      for (const k of S.picks) k.x -= dx;
      while (S.picks.length && S.picks[0].x < -30) S.picks.shift();
      G.gap -= dx;
      if (G.pickAt !== null && G.gap <= G.pickAt) { spawnPick(); G.pickAt = null; }
      if (G.gap <= 0) { const o = spawn(G.next); planNext(o.w); }

      // bonus : Shox enflammées
      const pb = playerBoxes(p, S.gy);
      for (let i = S.picks.length - 1; i >= 0; i--) {
        const k = S.picks[i];
        const box = [k.x - 10, k.cy - 9, 20, 18];
        if (pb.some((b) => hit(b, box))) {
          S.picks.splice(i, 1);
          S.bonus += CFG.bonus; S.shox += 1;
          snd('coin');
          S.floats.push({ text: `+${CFG.bonus}`, x: k.x, y: k.cy - 12, life: 0.8, max: 0.8 });
          for (let j = 0; j < 22; j++) { const a = rand(0, TAU), v = rand(40, 160); S.parts.push({ x: k.x, y: k.cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: rand(0.3, 0.6), max: 0.6, s: rand(0.8, 1.8), kind: 'spark' }); }
        }
      }
      // collisions
      for (const o of S.obs) {
        if (o.x > p.x + 40 || o.x + o.w < p.x - 20) continue;
        const ob = obstacleBoxes(o, S.gy, S.clock);
        if (ob.some((b) => pb.some((q) => hit(q, b)))) { crash(o); break; }
      }
      updateParts(dt);
    }

    function pilot() {
      const p = S.p;
      const near = S.obs.find((o) => o.x + o.w > p.x - 12);
      if (!near) { downKey = false; return; }
      const rel = S.speed + near.vx;
      const tt = (near.x - (p.x + 14)) / rel;
      if (near.type === 'dalgona' && near.level === 'haut') { downKey = false; return; }
      if (near.type === 'dalgona' && near.level === 'milieu') { downKey = tt < 0.32 && tt > -0.2; return; }
      downKey = false;
      if (p.ground && tt < 0.13 + (near.type === 'jack' ? 0.03 : 0) && tt > -0.05) { jump(); }
    }

    function crash(o) {
      const p = S.p;
      p.dead = true; p.duck = false;
      setState('over'); overT = 0;
      S.shake = 0.35;
      snd('boom');
      for (let j = 0; j < 30; j++) { const a = rand(0, TAU), v = rand(50, 200); S.parts.push({ x: p.x + 8, y: S.gy - p.y - 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: rand(0.4, 0.8), max: 0.8, s: rand(1, 2.4), kind: 'spark' }); }
      const score = Math.floor(S.score);
      const record = score > best;
      if (record) { best = score; store.set(KEY_BEST, best); }
      store.set(KEY_GAMES, (Number(store.get(KEY_GAMES, 0)) || 0) + 1);
      const coins = Math.floor(score / CFG.coinPer);
      let total = null;
      if (coins > 0) {
        const cur = Number(store.get('opening.coins', 1000));
        total = (Number.isFinite(cur) ? cur : 1000) + coins;
        store.set('opening.coins', total);
        setTimeout(() => { try { const f = fx(); if (f) { f.toast(`🔥 +${coins} ShoxCoin${coins > 1 ? 's' : ''} gagné${coins > 1 ? 's' : ''} dans Shox Runner (total ${f.fmt(total)})`); f.sound('coin'); } } catch {} }, 450);
      }
      const lines = DEATH[o.type] || ['Le Y s\'est ramassé !', ''];
      result = { score, best, record, coins, total, shox: S.shox, cause: o.type, title: Math.random() < 0.65 ? lines[0] : 'Le Y s\'est ramassé !', sub: lines[1] };
      if (opts.onEnd) try { opts.onEnd(result); } catch {}
    }

    // -------------------------------------------------------------- rendu
    function hud() {
      const W = S.W;
      c.textBaseline = 'alphabetic'; c.textAlign = 'right';
      c.font = `700 12px ${FONT_M}`;
      const show = !(S.blink > 0 && Math.floor(S.blink * 8) % 2 === 1);
      const sc = pad(state === 'idle' ? 0 : S.score);
      c.lineWidth = 3; c.strokeStyle = 'rgba(10,6,12,.55)';
      if (show) { c.strokeText(sc, W - 12, 21); c.fillStyle = '#ffe2a8'; c.fillText(sc, W - 12, 21); }
      const sw = c.measureText(sc).width;
      const hi = 'HI ' + pad(best);
      c.fillStyle = 'rgba(255,220,190,.62)'; c.strokeText(hi, W - 22 - sw, 21); c.fillText(hi, W - 22 - sw, 21);
      if (S.shox > 0 && state !== 'idle') {
        c.save(); c.translate(14, 14); c.scale(0.75, 0.75); shoe(c, 0, 8, 3, { hot: true, upper: '#1a1218', accent: '#ffd84a' }); c.restore();
        c.textAlign = 'left'; c.font = `700 10.5px ${FONT_M}`; c.fillStyle = '#ffd27a'; c.strokeText('× ' + S.shox, 30, 20.5); c.fillText('× ' + S.shox, 30, 20.5);
      }
    }

    function centerText(txt, y, font, fill, stroke = 'rgba(14,8,10,.7)', lw = 3) {
      c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.strokeText(txt, S.W / 2, y); }
      c.fillStyle = fill; c.fillText(txt, S.W / 2, y);
    }
    function fireFill(y, w) { const g = c.createLinearGradient(S.W / 2 - w / 2, 0, S.W / 2 + w / 2, 0); g.addColorStop(0, '#ff4a00'); g.addColorStop(0.5, '#ff9a00'); g.addColorStop(1, '#ffd23a'); return g; }

    function overlays() {
      const W = S.W, H = S.H;
      if (state === 'idle') {
        const cy = Math.min(H * 0.36, S.gy - 92);
        if (Math.sin(S.clock * 4) > -0.55) centerText('APPUIE SUR ESPACE POUR JOUER', cy, `${opts.compact ? 12 : 13}px ${FONT_D}`, fireFill(cy, 300));
        centerText('↑ ou clic marchent aussi · maintiens pour sauter plus haut · ↓ pour t\'accroupir', cy + 16, `600 8.5px ${FONT_T}`, 'rgba(255,236,220,.88)', 'rgba(14,8,10,.55)', 2.4);
      } else if (state === 'pause') {
        c.fillStyle = 'rgba(8,6,12,.45)'; c.fillRect(-20, -20, W + 40, H + 40);
        const cy = H * 0.4;
        centerText('PAUSE', cy, `18px ${FONT_D}`, fireFill(cy, 80));
        centerText('Espace ou clic pour reprendre', cy + 18, `600 9px ${FONT_T}`, 'rgba(255,236,220,.9)');
      } else if (state === 'over' && result) {
        const k = clamp(overT / 0.25, 0, 1);
        c.fillStyle = `rgba(8,6,12,${0.42 * k})`; c.fillRect(-20, -20, W + 40, H + 40);
        const cy = Math.min(H * 0.42, S.gy - 84) + (1 - k) * 8;
        c.globalAlpha = k;
        centerText(result.title.toUpperCase(), cy - 26, `${opts.compact ? 13 : 15}px ${FONT_D}`, fireFill(cy, 320), 'rgba(14,8,10,.85)', 3.4);
        if (result.record && result.score > 0) {
          const on = Math.sin(S.clock * 9) > -0.4;
          centerText(`NOUVEAU RECORD : ${pad(result.score)}`, cy - 6, `700 10.5px ${FONT_M}`, on ? '#ffd84a' : '#ff9a3c');
        } else {
          centerText(`SCORE ${pad(result.score)}   ·   RECORD ${pad(result.best)}`, cy - 6, `700 10px ${FONT_M}`, '#ffe9cf');
        }
        const coinsTxt = result.coins > 0 ? `+${result.coins} ShoxCoin${result.coins > 1 ? 's' : ''}` : 'Encore un effort : 1 ShoxCoin tous les 100 points';
        c.font = `800 ${result.coins > 0 ? 10 : 8.5}px ${FONT_T}`;
        const tw = c.measureText(coinsTxt).width;
        const cx0 = W / 2 - tw / 2 - (result.coins > 0 ? 7 : 0);
        if (result.coins > 0) {
          const g = c.createRadialGradient(cx0 - 1, cy + 11, 0.5, cx0, cy + 12, 5.5);
          g.addColorStop(0, '#fff2b0'); g.addColorStop(1, '#ff9a00');
          c.fillStyle = g; c.beginPath(); c.arc(cx0, cy + 12, 5, 0, TAU); c.fill();
          c.strokeStyle = '#b35400'; c.lineWidth = 0.8; c.stroke();
        }
        c.textAlign = 'left'; c.textBaseline = 'middle';
        c.lineWidth = 3; c.strokeStyle = 'rgba(14,8,10,.7)'; c.strokeText(coinsTxt, cx0 + (result.coins > 0 ? 8 : 0), cy + 12.5);
        c.fillStyle = result.coins > 0 ? '#ffd27a' : 'rgba(255,230,210,.8)'; c.fillText(coinsTxt, cx0 + (result.coins > 0 ? 8 : 0), cy + 12.5);
        // bouton rejouer
        const by = cy + 36, bw = 104, bh = 21;
        c.fillStyle = 'rgba(255,255,255,.08)'; c.beginPath(); c.roundRect(W / 2 - bw / 2, by - bh / 2, bw, bh, 10.5); c.fill();
        c.strokeStyle = 'rgba(255,150,60,.75)'; c.lineWidth = 0.9; c.stroke();
        c.strokeStyle = '#ffb347'; c.lineWidth = 1.6; c.lineCap = 'round';
        const ix = W / 2 - bw / 2 + 15, iy = by;
        c.beginPath(); c.arc(ix, iy, 4.6, -Math.PI * 0.15, Math.PI * 1.45); c.stroke();
        c.fillStyle = '#ffb347'; c.beginPath(); c.moveTo(ix + 4.4, iy - 5.4); c.lineTo(ix + 5.8, iy - 0.6); c.lineTo(ix + 1.2, iy - 1.8); c.closePath(); c.fill();
        c.font = `800 8.5px ${FONT_T}`; c.textAlign = 'left'; c.fillStyle = '#ffe9cf'; c.fillText('Espace pour rejouer', ix + 10, by + 0.5);
        c.globalAlpha = 1;
      }
    }

    function draw(a) {
      if (!cw) return;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, canvas.width, canvas.height);
      let sx = 0, sy = 0;
      if (S.shake > 0) { const k = S.shake / 0.35; sx = rand(-3, 3) * k; sy = rand(-2, 2) * k; }
      c.setTransform(scale * dpr, 0, 0, scale * dpr, sx * scale * dpr, sy * scale * dpr);
      renderWorld(c, S, a, { idle: state === 'idle' });
      hud();
      overlays();
    }

    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      if (!last) last = now;
      let dt = (now - last) / 1000; last = now;
      if (dt > 0.25) dt = 0.25;
      if (frozen) { draw(1); return; }
      acc += dt;
      let n = 0;
      while (acc >= CFG.step && n < 40) { update(CFG.step); acc -= CFG.step; n++; }
      if (n === 40) acc = 0;
      draw(clamp(acc / CFG.step, 0, 1));
    }

    // -------------------------------------------------------------- entrées
    const isField = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    const isCtrl = (el) => el && el !== canvas && /^(BUTTON|A|SUMMARY)$/.test(el.tagName);
    function onKeyDown(e) {
      if (destroyed || e.ctrlKey || e.metaKey || e.altKey || isField(e.target)) return;
      if (opts.active && !opts.active()) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (state !== 'run' && isCtrl(e.target)) return; // laisser Espace activer un bouton de la page
        e.preventDefault();
        if (e.repeat) return;
        press();
      } else if (e.code === 'ArrowDown') {
        if (state === 'run') e.preventDefault();
        downKey = true;
      }
    }
    function onKeyUp(e) {
      if (e.code === 'Space' || e.code === 'ArrowUp') release();
      else if (e.code === 'ArrowDown') downKey = false;
    }
    function onPointerDown(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      canvas.focus({ preventScroll: true });
      press();
    }
    function onPointerUp() { if (holding) release(); }
    function onBlur() { holding = false; downKey = false; pause(); }
    function onVis() { if (document.hidden) pause(); }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    const ro = new ResizeObserver(() => resize());
    ro.observe(root);
    resize();
    SPR.ready.then(() => draw(1));
    raf = requestAnimationFrame(frame);

    const api = {
      start, pause, resume,
      focus() { canvas.focus({ preventScroll: true }); },
      get state() { return state; },
      get best() { return best; },
      destroy() {
        destroyed = true; cancelAnimationFrame(raf); ro.disconnect();
        window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('pointerup', onPointerUp); window.removeEventListener('blur', onBlur);
        document.removeEventListener('visibilitychange', onVis);
        canvas.remove();
      },
      // pour les tests et les captures
      debug: {
        get world() { return S; },
        get size() { return { W: S.W, H: S.H, scale }; },
        autopilot(on = true) { autopilot = !!on; if (!on) downKey = false; },
        freeze(on = true) { frozen = !!on; draw(1); },
        set(o) {
          if (o.score !== undefined) { const target = o.score; S.bonus = 0; S.dist = target / CFG.scoreK; S.pdist = S.dist; S.score = target; lastMilestone = Math.floor(target / 100); const t = (-CFG.speed0 + Math.sqrt(CFG.speed0 ** 2 + 2 * CFG.accel * S.dist)) / CFG.accel; S.t = t; S.speed = Math.min(CFG.speedMax, CFG.speed0 + CFG.accel * t); }
          if (o.night !== undefined) S.night = o.night;
          if (o.y !== undefined) { S.p.y = S.p.py = o.y; S.p.ground = o.y <= 0; }
          if (o.vy !== undefined) S.p.vy = o.vy;
          if (o.duck !== undefined) { downKey = !!o.duck; S.p.duck = !!o.duck; }
          if (o.shox !== undefined) S.shox = o.shox;
          if (o.gap !== undefined) G.gap = o.gap;
          draw(1);
        },
        clear() { S.obs.length = 0; S.picks.length = 0; },
        spawn(type, x, extra) { const o = spawn(type); if (x !== undefined) { o.x = o.px = x; } if (extra) Object.assign(o, extra); draw(1); return o; },
        pick(x, high) { S.picks.push({ x, px: x, cy: high ? S.gy - 100 : S.gy - 30, seed: 1 }); draw(1); },
        step(sec) { const n = Math.round(sec / CFG.step); for (let i = 0; i < n; i++) update(CFG.step); draw(1); },
        jump, release: releaseJump, press, crash: (type = 'plot') => crash({ type }),
      },
    };
    return api;
  }

  // ================================================================== jaquettes et icônes (bibliothèque, page du jeu)
  function demoWorld(W, H, gy) {
    const S = makeWorld(W, H); if (gy) S.gy = gy;
    S.clock = 1.3; S.dist = 410; S.pdist = 410;
    return S;
  }
  function burnParts(S, x, fy, n) {
    for (let i = 0; i < n; i++) {
      const k = Math.random();
      S.parts.push({ x: x - 10 - k * 46 + rand(-3, 3), y: fy - rand(0, 6) + k * 14, vx: 0, vy: 0, life: 0.45 * (1 - k) + 0.05, max: 0.45, s: rand(1.4, 3.2) * (1 - k * 0.5), kind: 'fire' });
    }
  }

  function drawCover(canvas, kind = 'cover') {
    return prepare().then(() => {
      const c = canvas.getContext('2d');
      const cw = canvas.width, ch = canvas.height;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cw, ch);
      if (kind === 'banner') {
        const k = ch / 200, W = cw / k;
        const S = demoWorld(W, 200);
        S.night = 0.1; S.p.x = W * 0.36;
        S.p.y = S.p.py = 46; S.p.ground = false; S.p.vy = 200;
        S.obs.push({ type: 'cones', syms: [0, 1, 2], w: 46, x: W * 0.36 - 14, px: W * 0.36 - 14, vx: 0, seed: 1 });
        S.obs.push({ type: 'pile', w: 50, x: W * 0.62, px: W * 0.62, vx: 0, seed: 1 });
        S.obs.push({ type: 'dalgona', r: 10, w: 20, cy: S.gy - 70, x: W * 0.5, px: W * 0.5, vx: 0, seed: 3 });
        S.obs.push({ type: 'jack', w: 44, x: W * 0.8, px: W * 0.8, vx: 0, seed: 2 });
        S.obs.push({ type: 'plot', n: 2, w: 38, x: W * 0.15, px: W * 0.15, vx: 0, seed: 2 });
        S.picks.push({ x: W * 0.44, px: W * 0.44, cy: S.gy - 108, seed: 0 });
        burnParts(S, S.p.x, S.gy - 46, 40);
        c.setTransform(k, 0, 0, k, 0, 0);
        renderWorld(c, S, 1, {});
        return;
      }
      // jaquette portrait (2:3) : Le Y en grand, en plein saut au-dessus des cônes ○△□
      const W = 118, k = cw / W, H = ch / k;
      const S = demoWorld(W, H, H * 0.84);
      S.night = 0.04; S.dist = 600; S.pdist = 600; S.clock = 2.1;
      S.p.x = 60; S.p.y = S.p.py = 34; S.p.ground = false; S.p.vy = 260;
      S.obs.push({ type: 'cones', syms: [0, 1, 2], w: 46, x: 40, px: 40, vx: 0, seed: 1 });
      S.obs.push({ type: 'poubelle', v: 1, w: 24, x: 97, px: 97, vx: 0, seed: 1 });
      S.obs.push({ type: 'dalgona', r: 8, w: 16, cy: S.gy - 80, x: 94, px: 94, vx: 0, seed: 1.2 });
      S.picks.push({ x: 15, px: 15, cy: S.gy - 72, seed: 2 });
      burnParts(S, S.p.x, S.gy - 34, 50);
      c.setTransform(k, 0, 0, k, 0, 0);
      renderWorld(c, S, 1, {});
      // voiles + titre
      const vg = c.createLinearGradient(0, 0, 0, H * 0.3);
      vg.addColorStop(0, 'rgba(10,4,12,.88)'); vg.addColorStop(1, 'rgba(10,4,12,0)');
      c.fillStyle = vg; c.fillRect(0, 0, W, H * 0.3);
      const bg = c.createLinearGradient(0, H * 0.86, 0, H);
      bg.addColorStop(0, 'rgba(10,4,12,0)'); bg.addColorStop(1, 'rgba(10,4,12,.92)');
      c.fillStyle = bg; c.fillRect(0, H * 0.86, W, H * 0.14);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const tg = c.createLinearGradient(0, 6, 0, 38);
      tg.addColorStop(0, '#ffe066'); tg.addColorStop(0.5, '#ff9a00'); tg.addColorStop(1, '#ff4a00');
      for (const [txt, y, size] of [['SHOX', 15, 19], ['RUNNER', 32, 15.5]]) {
        c.font = `${size}px ${FONT_D}`;
        c.lineJoin = 'round'; c.lineWidth = 3.6; c.strokeStyle = '#1a0606'; c.strokeText(txt, W / 2, y);
        c.fillStyle = tg; c.fillText(txt, W / 2, y);
      }
      c.font = `800 4.1px ${FONT_T}`; c.fillStyle = 'rgba(255,236,214,.92)';
      if ('letterSpacing' in c) c.letterSpacing = '0.9px';
      c.fillText('LE JEU HORS LIGNE DE FIRE SHOX', W / 2, 43);
      if ('letterSpacing' in c) c.letterSpacing = '0px';
      c.font = `800 5px ${FONT_T}`; c.fillStyle = '#ffd27a';
      c.fillText('Saute. Esquive. Brûle tout.', W / 2, H - 8);
    });
  }

  const ICON_BOX = { plot: [58, 32], poubelle: [26, 37], pile: [52, 54], cones: [46, 25], dalgona: [24, 24], jack: [46, 52], shox: [30, 30], y: [40, 66] };
  function drawIcon(canvas, kind) {
    return prepare().then(() => {
      const c = canvas.getContext('2d');
      const cw = canvas.width, ch = canvas.height;
      const [bw, bh] = ICON_BOX[kind] || [40, 40];
      const k = Math.min(cw / (bw + 8), ch / (bh + 8));
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cw, ch);
      c.setTransform(k, 0, 0, k, cw / 2 - (bw / 2) * k, ch / 2 + (bh / 2) * k);
      const gy = 0;
      switch (kind) {
        case 'plot': drawPlot(c, 0, gy, 3, 0, 0); break;
        case 'poubelle': drawPoubelle(c, 1, gy, 0); break;
        case 'pile': drawPile(c, 1, gy); break;
        case 'cones': drawCones(c, 0, gy, [0, 1, 2], 0); break;
        case 'dalgona': drawDalgona(c, 12, -12, 11, 0.3, false); break;
        case 'jack': drawJack(c, 1, gy, 0.6); break;
        case 'shox': drawPickup(c, 15, -14, 1.2, 1.15); break;
        case 'y': drawLeY(c, 18, gy, { mode: 'idle', time: 0.3 }); break;
      }
    });
  }

  window.ShoxRunner = { mount, drawCover, drawIcon, prepare, CFG };
})();
