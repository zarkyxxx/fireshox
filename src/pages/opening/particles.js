// Shox Opening — moteur de particules sur canvas (plusieurs calques, une seule boucle).
//   SO_PX.layer('front', canvasElement)
//   SO_PX.spark('front', x, y, { count, colors, speed, gravity, size, life, up })
//   SO_PX.emitter('back', { rate, spawn: () => particule })  → { stop() }
//   SO_PX.add('front', { type, x, y, … })
// Types : spark (point lumineux), ember (braise qui monte), flame (grosse flamme douce),
// confetti (papier), shape (○ △ □ en contour), ring (onde de choc), streak (trait de vitesse),
// homing (vole vers une cible, ex. pièces vers le compteur).
(function () {
  'use strict';
  const layers = new Map();
  const emitters = new Set();
  let raf = 0, last = 0;
  const DPR = Math.min(1.5, window.devicePixelRatio || 1);

  function layer(name, canvas) {
    const L = { canvas, ctx: canvas.getContext('2d'), parts: [], w: 0, h: 0 };
    layers.set(name, L);
    fit(L);
    return L;
  }
  function fit(L) {
    const r = L.canvas.getBoundingClientRect();
    L.w = r.width || innerWidth; L.h = r.height || innerHeight;
    L.canvas.width = Math.round(L.w * DPR); L.canvas.height = Math.round(L.h * DPR);
  }
  addEventListener('resize', () => layers.forEach(fit));

  // Sprites lumineux pré-rendus (beaucoup plus rapides que shadowBlur).
  const sprites = new Map();
  function glow(color) {
    let s = sprites.get(color);
    if (s) return s;
    s = document.createElement('canvas');
    s.width = s.height = 64;
    const g = s.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.18, color);
    grd.addColorStop(0.45, hexA(color, 0.35));
    grd.addColorStop(1, hexA(color, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    sprites.set(color, s);
    return s;
  }
  function soft(color) {
    const k = 'soft' + color;
    let s = sprites.get(k);
    if (s) return s;
    s = document.createElement('canvas');
    s.width = s.height = 128;
    const g = s.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, hexA(color, 0.9));
    grd.addColorStop(0.4, hexA(color, 0.45));
    grd.addColorStop(1, hexA(color, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    sprites.set(k, s);
    return s;
  }
  function hexA(hex, a) {
    if (hex.startsWith('rgb')) return hex.replace(/rgba?\(([^)]+)\)/, (m, inner) => { const p = inner.split(',').slice(0, 3); return `rgba(${p.join(',')},${a})`; });
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  const FLAME = ['#fff6d0', '#ffd84a', '#ffb000', '#ff7a00', '#ff3d00', '#7a1200'];
  const FIRE = ['#ffd27a', '#ffa31a', '#ff7a00', '#ff4a00', '#c41e00', '#5a0a00'];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (l) => l[(Math.random() * l.length) | 0];

  function add(name, p) {
    const L = layers.get(name);
    if (!L) return null;
    p.t = 0;
    p.life = p.life || 1;
    p.vx = p.vx || 0; p.vy = p.vy || 0;
    p.rot = p.rot || 0; p.vr = p.vr || 0;
    if (L.parts.length > 1400) L.parts.shift();
    L.parts.push(p);
    start();
    return p;
  }

  function spark(name, x, y, o = {}) {
    const n = o.count || 40;
    for (let i = 0; i < n; i++) {
      const a = o.angle !== undefined ? o.angle + rnd(-(o.cone || 0.5), o.cone || 0.5) : rnd(0, Math.PI * 2);
      const sp = rnd(o.minSpeed || 60, o.speed || 520);
      add(name, {
        type: 'spark', x: x + rnd(-(o.jitter || 0), o.jitter || 0), y: y + rnd(-(o.jitter || 0), o.jitter || 0),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0),
        g: o.gravity ?? 380, drag: o.drag ?? 1.6, life: rnd(o.life ? o.life * 0.6 : 0.5, o.life || 1.2),
        size: rnd(0.6, 1.2) * (o.size || 7), color: pick(o.colors || FLAME.slice(0, 5)), trail: o.trail ?? true,
      });
    }
  }

  function ring(name, x, y, o = {}) {
    add(name, { type: 'ring', x, y, r0: o.r0 || 10, r1: o.r1 || 300, life: o.life || 0.7, color: o.color || '#ffd84a', width: o.width || 6 });
  }

  function emitter(name, o) {
    const e = { name, rate: o.rate || 30, spawn: o.spawn, acc: 0, alive: true, until: o.duration ? performance.now() + o.duration * 1000 : 0 };
    e.stop = () => { e.alive = false; emitters.delete(e); };
    e.setRate = (r) => { e.rate = r; };
    emitters.add(e);
    start();
    return e;
  }

  function clear(name) {
    if (name) { const L = layers.get(name); if (L) L.parts.length = 0; }
    else layers.forEach((L) => { L.parts.length = 0; });
  }
  function stopAll() { emitters.forEach((e) => e.stop()); }

  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    // émetteurs
    emitters.forEach((e) => {
      if (e.until && now > e.until) { e.stop(); return; }
      e.acc += e.rate * dt;
      while (e.acc >= 1) { e.acc -= 1; const p = e.spawn(); if (p) add(e.name, p); }
    });
    let alive = emitters.size > 0;
    layers.forEach((L) => {
      const c = L.ctx;
      c.setTransform(DPR, 0, 0, DPR, 0, 0);
      c.clearRect(0, 0, L.w, L.h);
      if (!L.parts.length) return;
      alive = true;
      const keep = [];
      for (const p of L.parts) {
        p.t += dt;
        const k = p.t / p.life;
        if (k >= 1) { if (p.onEnd) p.onEnd(p); continue; }
        keep.push(p);
        draw(c, p, k, dt);
      }
      L.parts = keep;
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    });
    raf = alive ? requestAnimationFrame(loop) : 0;
  }

  function draw(c, p, k, dt) {
    switch (p.type) {
      case 'spark': {
        const dr = Math.exp(-p.drag * dt);
        p.vx *= dr; p.vy = p.vy * dr + p.g * dt;
        const px = p.x, py = p.y;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const a = 1 - k * k;
        c.globalCompositeOperation = 'lighter';
        if (p.trail) {
          c.globalAlpha = a * 0.55;
          c.strokeStyle = p.color; c.lineWidth = p.size * 0.35 * (1 - k * 0.6); c.lineCap = 'round';
          c.beginPath(); c.moveTo(px - p.vx * dt * 2.5, py - p.vy * dt * 2.5); c.lineTo(p.x, p.y); c.stroke();
        }
        c.globalAlpha = a;
        const s = p.size * (1.6 - k);
        c.drawImage(glow(p.color), p.x - s, p.y - s, s * 2, s * 2);
        break;
      }
      case 'ember': {
        p.x += (p.vx + Math.sin(p.t * p.wf + p.ph) * p.wa) * dt; p.y += p.vy * dt;
        const flick = 0.65 + 0.35 * Math.sin(p.t * 18 + p.ph);
        const a = Math.sin(Math.PI * Math.min(1, k * 1.05)) * flick * (p.alpha || 1);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
        const s = p.size;
        c.drawImage(glow(p.color), p.x - s, p.y - s, s * 2, s * 2);
        break;
      }
      case 'flame': {
        p.x += (p.vx + Math.sin(p.t * 6 + p.ph) * 18) * dt; p.y += p.vy * dt; p.vy *= 0.995;
        const pal = p.colors || FIRE;
        const col = pal[Math.min(pal.length - 1, Math.floor(k * pal.length))];
        const s = p.size * (0.6 + Math.sin(Math.PI * k) * 0.8);
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = (1 - k) * (p.alpha || 0.5);
        c.drawImage(soft(col), p.x - s * 0.8, p.y - s * 1.5, s * 1.6, s * 3);
        break;
      }
      case 'confetti': {
        p.vx *= 0.99; p.vy = Math.min(p.vy + 420 * dt, 260);
        p.x += (p.vx + Math.sin(p.t * 3 + p.ph) * 40) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1;
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.cos(p.t * p.flip));
        c.fillStyle = p.color; c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        c.restore();
        break;
      }
      case 'shape': {
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = Math.sin(Math.PI * k) * (p.alpha || 0.8);
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.strokeStyle = p.color; c.lineWidth = p.lw || 3; c.lineJoin = 'round';
        const s = p.size; c.beginPath();
        if (p.shape === 'circle') c.arc(0, 0, s, 0, Math.PI * 2);
        else if (p.shape === 'triangle') { c.moveTo(0, -s); c.lineTo(s * 0.92, s * 0.6); c.lineTo(-s * 0.92, s * 0.6); c.closePath(); }
        else c.rect(-s * 0.85, -s * 0.85, s * 1.7, s * 1.7);
        c.stroke(); c.restore();
        break;
      }
      case 'ring': {
        const e = 1 - Math.pow(1 - k, 3);
        const r = p.r0 + (p.r1 - p.r0) * e;
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = (1 - k) * 0.9;
        c.strokeStyle = p.color; c.lineWidth = p.width * (1 - k * 0.7);
        c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.stroke();
        break;
      }
      case 'streak': {
        const e = 1 - Math.pow(1 - k, 2);
        const d0 = p.r0 + (p.r1 - p.r0) * e, len = p.len * (1 - k);
        const cx = Math.cos(p.a), cy = Math.sin(p.a);
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = (1 - k) * (p.alpha || 0.9);
        c.strokeStyle = p.color; c.lineWidth = p.width || 2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(p.x + cx * d0, p.y + cy * d0); c.lineTo(p.x + cx * (d0 + len), p.y + cy * (d0 + len)); c.stroke();
        break;
      }
      case 'implode': {
        // part d'un rayon et converge vers le centre (effet de « charge »)
        const e = k * k;
        const r = p.r * (1 - e);
        const x = p.x + Math.cos(p.a) * r, y = p.y + Math.sin(p.a) * r * 0.8;
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = Math.min(1, k * 3) * (1 - e * 0.4);
        const s = p.size * (1 - e * 0.5);
        c.drawImage(glow(p.color), x - s, y - s, s * 2, s * 2);
        break;
      }
      case 'homing': {
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const mx = (p.x + p.tx) / 2 + p.bend, my = Math.min(p.y, p.ty) - 120;
        const u = 1 - e;
        const x = u * u * p.x + 2 * u * e * mx + e * e * p.tx;
        const y = u * u * p.y + 2 * u * e * my + e * e * p.ty;
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = 1;
        const s = p.size * (1 - e * 0.45);
        coin(c, x, y, s, p.t * 9 + p.ph);
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.35;
        c.drawImage(glow('#ffb000'), x - s * 2, y - s * 2, s * 4, s * 4);
        break;
      }
    }
  }

  function coin(c, x, y, s, spin) {
    const sx = Math.max(0.15, Math.abs(Math.cos(spin)));
    c.save(); c.translate(x, y); c.scale(sx, 1);
    const g = c.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, '#fff1b0'); g.addColorStop(0.5, '#ffb000'); g.addColorStop(1, '#b85c00');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, s, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(122,61,0,.7)'; c.lineWidth = s * 0.14; c.beginPath(); c.arc(0, 0, s * 0.7, 0, Math.PI * 2); c.stroke();
    c.restore();
  }

  // Aides prêtes à l'emploi
  const make = {
    ember: (x, y, o = {}) => ({ type: 'ember', x, y, vx: rnd(-14, 14), vy: -rnd(o.minUp || 30, o.up || 90), wf: rnd(1.5, 3.5), wa: rnd(8, 30), ph: rnd(0, 6.28), life: rnd(o.life ? o.life * 0.5 : 2, o.life || 4.5), size: rnd(1.5, o.size || 4.5), color: pick(o.colors || FLAME.slice(1, 5)), alpha: o.alpha }),
    flame: (x, y, o = {}) => ({ type: 'flame', x, y, vx: rnd(-20, 20), vy: -rnd(o.minUp || 120, o.up || 300), ph: rnd(0, 6.28), life: rnd(0.7, o.life || 1.4), size: rnd(o.size ? o.size * 0.5 : 30, o.size || 70), alpha: o.alpha || 0.45, colors: o.colors }),
    confetti: (x, y, o = {}) => { const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05); const sp = rnd(200, o.speed || 700); return { type: 'confetti', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vr: rnd(-8, 8), rot: rnd(0, 6), flip: rnd(4, 12), ph: rnd(0, 6), life: rnd(2, 3.4), size: rnd(8, 14), color: pick(o.colors || ['#ffd84a', '#ff7a00', '#fff']) }; },
    shape: (x, y, o = {}) => ({ type: 'shape', x, y, vx: rnd(-30, 30), vy: -rnd(20, 70), vr: rnd(-1, 1), rot: rnd(0, 6), life: rnd(2.5, 5), size: rnd(8, o.size || 22), shape: pick(['circle', 'triangle', 'square']), color: pick(o.colors || ['#ff2f7d', '#12b98a']), lw: rnd(2, 3.5), alpha: o.alpha || 0.7 }),
    implode: (x, y, o = {}) => ({ type: 'implode', x, y, a: rnd(0, 6.28), r: rnd(o.r ? o.r * 0.6 : 160, o.r || 340), life: rnd(0.5, 0.9), size: rnd(3, o.size || 7), color: pick(o.colors || FLAME.slice(0, 4)) }),
    streak: (x, y, o = {}) => ({ type: 'streak', x, y, a: rnd(0, 6.28), r0: o.r0 || 40, r1: rnd(o.r1 ? o.r1 * 0.6 : 300, o.r1 || 700), len: rnd(40, o.len || 160), width: rnd(1, 3), life: rnd(0.35, 0.7), color: pick(o.colors || ['#fff6d0', '#ffd84a']), alpha: o.alpha }),
  };

  window.SO_PX = { layer, add, spark, ring, emitter, clear, stopAll, make, rnd, pick, FLAME, fit: () => layers.forEach(fit) };
})();
