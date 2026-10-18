// Fire Shox — outils communs des sites internes.
// À inclure par :  <script src="/shared/fx.js"></script>   (script classique, pas de module)
//
//   FX.store.get(clé, défaut) / FX.store.set(clé, valeur) / FX.store.onChange(fn)
//       → sauvegardé sur disque par le navigateur (survit à la fermeture).
//         Hors du navigateur (aperçu), repli sur localStorage.
//   FX.open(url, { background, sameTab })   → ouvre un onglet du navigateur
//   FX.sound(nom)  → petits sons synthétisés : click, hover, tick, pop, whoosh, coin, tear,
//                    flip, rare, epic, legend, success, error, boom, ding
//   FX.burst(x, y, { count, colors, spread, gravity, size }) → gerbe d'étincelles (écran)
//   FX.toast(texte)
//   FX.rand(a, b), FX.pick(liste), FX.sleep(ms), FX.fmt(nombre, décimales)
//   FX.theme.get() → 'fire' | 'squid' | 'lfi' ; FX.theme.set(nom) ; FX.theme.colors() → couleurs d'étincelles
//       Le thème du navigateur est posé sur <html data-theme="…"> (base.css redéfinit les variables) et
//       suivi en direct ; l'évènement « fs-theme » (document) prévient les pages qui dessinent elles-mêmes.
(function () {
  'use strict';
  const api = window.fireshox;

  const store = {
    get(key, fallback) {
      if (api) return api.get(key, fallback);
      try { const v = localStorage.getItem('fs:' + key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
    },
    set(key, value) {
      if (api) return api.set(key, value);
      try { localStorage.setItem('fs:' + key, JSON.stringify(value)); } catch {}
    },
    onChange(fn) { return api ? api.onChange(fn) : () => {}; },
  };

  function open(url, opts) {
    if (api) api.open(url, opts || {});
    else window.open(url, '_blank');
  }

  // ---------------------------------------------------------------- thèmes (fire, squid, lfi)
  const THEMES = ['fire', 'squid', 'lfi'];
  const SPARKS = {
    fire: ['#ffd84a', '#ffb000', '#ff7a00', '#ff3d00', '#fff2c0'],
    squid: ['#ff2f7d', '#ff8cbc', '#12b98a', '#5fe0c0', '#ffe3ef'],
    lfi: ['#ff2a3d', '#ff6b57', '#ffe2c2', '#c8102e', '#fff4e8'],
  };
  let themeTimer = 0;
  function currentTheme() {
    const s = store.get('settings', {}) || {};
    return THEMES.includes(s.theme) ? s.theme : 'fire';
  }
  function applyTheme(t, animate) {
    const root = document.documentElement;
    t = THEMES.includes(t) ? t : 'fire';
    if (root.dataset.theme === t) return;
    if (animate && root.dataset.theme) {
      root.classList.add('fs-theme-anim');
      clearTimeout(themeTimer);
      themeTimer = setTimeout(() => root.classList.remove('fs-theme-anim'), 700);
    }
    root.dataset.theme = t;
    try { document.dispatchEvent(new CustomEvent('fs-theme', { detail: t })); } catch {}
  }
  applyTheme(currentTheme(), false);
  store.onChange((key, value) => { if (key === 'settings') applyTheme((value || {}).theme, true); });
  const theme = {
    list: THEMES.slice(),
    get: () => document.documentElement.dataset.theme || currentTheme(),
    set(t) {
      if (!THEMES.includes(t)) return;
      store.set('settings', { ...(store.get('settings', {}) || {}), theme: t });
      applyTheme(t, true);
    },
    colors: () => SPARKS[theme.get()] || SPARKS.fire,
  };

  // ---------------------------------------------------------------- sons
  let ctx = null;
  let master = null;
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function soundOn() {
    const s = store.get('settings', {}) || {};
    return s.sound !== false;
  }
  function tone({ type = 'sine', f0 = 440, f1 = f0, dur = 0.15, vol = 0.3, delay = 0, attack = 0.005, q }) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (q) { const bq = a.createBiquadFilter(); bq.type = 'lowpass'; bq.frequency.value = q; o.connect(bq); node = bq; }
    node.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise({ dur = 0.3, vol = 0.3, delay = 0, from = 800, to = 4000, type = 'bandpass', q = 0.8 }) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + delay;
    const len = Math.max(1, Math.floor(a.sampleRate * dur));
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t); src.stop(t + dur + 0.02);
  }
  const SOUNDS = {
    click: () => tone({ type: 'triangle', f0: 900, f1: 500, dur: 0.06, vol: 0.18 }),
    hover: () => tone({ type: 'sine', f0: 1400, f1: 1600, dur: 0.035, vol: 0.05 }),
    tick: () => tone({ type: 'square', f0: 2200, f1: 1800, dur: 0.02, vol: 0.05, q: 3000 }),
    pop: () => { tone({ type: 'sine', f0: 300, f1: 900, dur: 0.09, vol: 0.3 }); noise({ dur: 0.05, vol: 0.08, from: 2000, to: 6000 }); },
    whoosh: () => noise({ dur: 0.35, vol: 0.25, from: 300, to: 3000, q: 1.2 }),
    coin: () => { tone({ type: 'square', f0: 988, dur: 0.08, vol: 0.12, q: 4000 }); tone({ type: 'square', f0: 1319, dur: 0.25, vol: 0.12, delay: 0.07, q: 4000 }); },
    tear: () => { noise({ dur: 0.45, vol: 0.4, from: 4000, to: 900, q: 0.6 }); noise({ dur: 0.2, vol: 0.2, from: 6000, to: 2000, delay: 0.12 }); },
    flip: () => { noise({ dur: 0.12, vol: 0.2, from: 1500, to: 5000, q: 1.5 }); tone({ type: 'sine', f0: 600, f1: 300, dur: 0.08, vol: 0.08 }); },
    rare: () => [523, 659, 784].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.25, vol: 0.18, delay: i * 0.07 })),
    epic: () => [440, 554, 659, 880].forEach((f, i) => tone({ type: 'sawtooth', f0: f, dur: 0.35, vol: 0.12, delay: i * 0.08, q: 2600 })),
    legend: () => {
      tone({ type: 'sine', f0: 60, f1: 40, dur: 1.2, vol: 0.5 });
      noise({ dur: 1.4, vol: 0.25, from: 200, to: 6000, q: 0.5 });
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ type: 'sawtooth', f0: f, dur: 0.9, vol: 0.1, delay: 0.25 + i * 0.09, q: 3200 }));
    },
    success: () => [660, 880].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.18, vol: 0.2, delay: i * 0.09 })),
    error: () => tone({ type: 'square', f0: 220, f1: 150, dur: 0.25, vol: 0.12, q: 1200 }),
    boom: () => { tone({ type: 'sine', f0: 120, f1: 30, dur: 0.7, vol: 0.6 }); noise({ dur: 0.6, vol: 0.35, from: 1200, to: 100, type: 'lowpass', q: 0.3 }); },
    ding: () => { tone({ type: 'sine', f0: 1568, dur: 0.6, vol: 0.18 }); tone({ type: 'sine', f0: 2349, dur: 0.5, vol: 0.08, delay: 0.01 }); },
  };
  function sound(name) {
    if (!soundOn()) return;
    try { (SOUNDS[name] || SOUNDS.click)(); } catch {}
  }

  // ---------------------------------------------------------------- étincelles
  let canvas = null, c2d = null, parts = [], raf = 0;
  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99998';
    document.body.appendChild(canvas);
    c2d = canvas.getContext('2d');
    const fit = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; };
    fit(); addEventListener('resize', fit);
  }
  function loop() {
    const dpr = devicePixelRatio;
    c2d.clearRect(0, 0, canvas.width, canvas.height);
    c2d.globalCompositeOperation = 'lighter';
    parts = parts.filter((p) => p.life > 0);
    for (const p of parts) {
      p.vx *= 0.985; p.vy = p.vy * 0.985 + p.g; p.x += p.vx; p.y += p.vy; p.life -= 1;
      const a = Math.max(0, p.life / p.max);
      c2d.globalAlpha = a;
      c2d.fillStyle = p.c;
      c2d.beginPath(); c2d.arc(p.x * dpr, p.y * dpr, p.s * dpr * (0.5 + a * 0.5), 0, Math.PI * 2); c2d.fill();
    }
    c2d.globalAlpha = 1;
    raf = parts.length ? requestAnimationFrame(loop) : 0;
  }
  function burst(x, y, o = {}) {
    ensureCanvas();
    const colors = o.colors || theme.colors();
    const n = o.count || 60, spread = o.spread || 9, g = o.gravity ?? 0.18, size = o.size || 3.2;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, sp = Math.random() * spread;
      const life = 40 + Math.random() * 50;
      parts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - (o.up || 2), g, life, max: life, s: size * (0.4 + Math.random()), c: colors[(Math.random() * colors.length) | 0] });
    }
    if (!raf) raf = requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- toast
  function toast(text, ms = 2600) {
    let wrap = document.querySelector('.fs-toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'fs-toast-wrap'; document.body.appendChild(wrap); }
    const el = document.createElement('div');
    el.className = 'fs-toast'; el.textContent = text;
    wrap.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s, transform .3s'; el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; }, ms);
    setTimeout(() => el.remove(), ms + 350);
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (l) => l[(Math.random() * l.length) | 0];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmt = (n, d = 0) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

  window.FX = { store, open, sound, burst, toast, rand, pick, sleep, fmt, theme, inBrowser: !!api };
})();
