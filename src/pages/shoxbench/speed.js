// ShoxBench — test de débit Shox (ping, descente, montée) + historique « tours de chrono ».
(function () {
  'use strict';
  const { D, $, $$ } = SB;
  const KEY = 'bench.speed', SKEY = 'bench.server', MAXH = 100;

  const root = $('#speed'), stage = $('#stage'), gaugeEl = $('#gauge');
  const gcv = $('#gaugeCv'), g = gcv.getContext('2d');
  const fcv = $('#flames'), f = fcv.getContext('2d');
  const ro = $('#readout'), roPhase = $('.ro-phase span', ro), roIcon = $('.ro-phase use', ro), roVal = $('.ro-val', ro), roUnit = $('.ro-unit', ro);
  const verdictEl = $('#verdict'), goBtn = $('#goBtn'), srvBtn = $('#srvBtn');
  const hEl = $('#speedHist');

  const COL = {
    ping: { line: '#ffd166', a: '#ffb000', b: '#ffe08a' },
    down: { line: '#ff9a2a', a: '#ff4d00', b: '#ffd04a' },
    up: { line: '#ff4d7d', a: '#ff2d55', b: '#ffb08a' },
    heat: { line: '#ff3b2f', a: '#ff1a1a', b: '#fff0c0' },
  };

  const hist = () => SB.list(KEY);
  SB.speedHist = hist;
  let running = false;

  // ------------------------------------------------------------ serveur
  const pingOf = (s) => s.ping || Math.round(3 + Math.sqrt(s.km) * 0.85);
  let server = D.servers.find((s) => s.id === FX.store.get(SKEY, 'sssm')) || D.servers[0];
  function showConn() {
    $('#ispName').textContent = D.isp.name;
    $('#ispIp').textContent = 'IP ' + D.isp.ip;
    $('#srvCity').textContent = server.city;
    $('#srvHost').textContent = `${server.host} · ${FX.fmt(server.km)} km`;
  }
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function openServers() {
    FX.sound('pop');
    const m = SB.modal.open(`
      <div class="md-head"><h3>Choisir un serveur</h3><button class="md-x" data-close aria-label="Fermer"><svg class="ic"><use href="#i-x"/></svg></button></div>
      <label class="md-search"><svg class="ic"><use href="#i-search"/></svg><input type="text" placeholder="Ville ou hébergeur (ex. Rebond…)" spellcheck="false"></label>
      <ul class="srv-list"></ul>`, 'srv');
    const list = $('.srv-list', m), input = $('input', m);
    const draw = () => {
      const q = norm(input.value.trim());
      const rows = D.servers.filter((s) => !q || norm(s.city + ' ' + s.host).includes(q)).sort((a, b) => a.km - b.km);
      list.innerHTML = rows.length ? rows.map((s) => `
        <li><button class="srv-opt${s.id === server.id ? ' on' : ''}" data-id="${s.id}">
          <span class="pin"><svg class="ic"><use href="#i-pin"/></svg></span>
          <span><b>${SB.esc(s.city)}</b><span class="h">${SB.esc(s.host)}</span></span>
          <span class="km">${FX.fmt(s.km)} km<i>~${FX.fmt(pingOf(s))} ms</i></span>
          <svg class="ic chk"><use href="#i-check"/></svg>
        </button></li>`).join('') : '<li class="srv-none">Aucun serveur dans ce coin. Essaie « Shox ».</li>';
    };
    list.addEventListener('click', (e) => {
      const b = e.target.closest('.srv-opt'); if (!b) return;
      server = D.servers.find((s) => s.id === b.dataset.id) || server;
      FX.store.set(SKEY, server.id);
      showConn();
      FX.sound('click');
      SB.modal.close();
      FX.toast('Serveur : ' + server.city);
    });
    input.addEventListener('input', draw);
    draw();
    setTimeout(() => input.focus(), 40);
  }
  srvBtn.addEventListener('click', openServers);

  // ------------------------------------------------------------ métriques + petites courbes
  const M = {};
  for (const k of ['ping', 'down', 'up']) {
    const el = $(`.metric[data-k="${k}"]`, root);
    M[k] = { el, val: $('.m-val', el), cv: $('.spark', el), samples: [], expect: 20 };
  }
  function drawSpark(k) {
    const m = M[k], cv = m.cv, w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const s = m.samples; if (s.length < 2) return;
    const col = m.heat ? COL.heat : COL[k];
    let max = Math.max(...s), min = k === 'ping' ? Math.min(...s) * 0.7 : 0;
    if (max - min < 1e-6) max = min + 1;
    const n = Math.max(s.length, m.expect), pad = 2;
    const X = (i) => (i / (n - 1)) * w, Y = (v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    c.beginPath(); c.moveTo(X(0), Y(s[0]));
    for (let i = 1; i < s.length; i++) {
      const xm = (X(i - 1) + X(i)) / 2;
      c.bezierCurveTo(xm, Y(s[i - 1]), xm, Y(s[i]), X(i), Y(s[i]));
    }
    const grd = c.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, col.line + '66'); grd.addColorStop(1, col.line + '00');
    c.save(); c.lineTo(X(s.length - 1), h); c.lineTo(0, h); c.closePath(); c.fillStyle = grd; c.fill(); c.restore();
    c.lineWidth = 1.8; c.strokeStyle = col.line; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(X(0), Y(s[0]));
    for (let i = 1; i < s.length; i++) { const xm = (X(i - 1) + X(i)) / 2; c.bezierCurveTo(xm, Y(s[i - 1]), xm, Y(s[i]), X(i), Y(s[i])); }
    c.stroke();
  }
  const fmtMetric = (k, v) => (k === 'ping' ? FX.fmt(Math.round(v)) : SB.speed(v));
  function setMetric(k, v, cls) {
    const m = M[k];
    m.val.textContent = v == null ? '—' : fmtMetric(k, v);
    m.el.classList.remove('live', 'done', 'old', 'heat');
    if (cls) cls.split(' ').forEach((c) => c && m.el.classList.add(c));
  }
  const downsample = (a, n = 28) => {
    if (a.length <= n) return a.map((v) => Math.round(v * 10) / 10);
    const out = [];
    for (let i = 0; i < n; i++) {
      const s = Math.floor((i * a.length) / n), e = Math.max(s + 1, Math.floor(((i + 1) * a.length) / n));
      let sum = 0; for (let j = s; j < e; j++) sum += a[j];
      out.push(Math.round((sum / (e - s)) * 10) / 10);
    }
    return out;
  };

  // ------------------------------------------------------------ jauge (canvas)
  const A0 = Math.PI * 0.75, SW = Math.PI * 1.5;
  const G = { W: 0, H: 0, dpr: 1, R: 100, T: 16, cx: 0, cy: 0, t: 0, v: 0, target: 0, intro: 0, introTo: 0, phase: 'ping', heat: false, pulse: 0, lastMajor: -1 };
  const hubImg = new Image(); hubImg.src = '/assets/logo-128.png';
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  function v2t(v) {
    const s = D.scale;
    if (v <= 0) return 0;
    for (let i = 1; i < s.length; i++) if (v <= s[i]) return (i - 1 + (v - s[i - 1]) / (s[i] - s[i - 1])) / (s.length - 1);
    return 1;
  }

  function layout() {
    const r = stage.getBoundingClientRect();
    if (r.width < 100 || r.height < 100) return; // section masquée (autre onglet)
    G.dpr = Math.min(2, devicePixelRatio || 1);
    G.W = r.width; G.H = r.height;
    gcv.width = Math.round(G.W * G.dpr); gcv.height = Math.round(G.H * G.dpr);
    const Rout = Math.min((G.H - 8) / 1.72, G.W * 0.42);
    G.T = Math.max(14, Rout * 0.105);
    G.R = Rout - G.T / 2 - 13;
    G.cx = G.W / 2;
    G.cy = (G.H - 1.707 * Rout) / 2 + Rout;
    ro.style.top = G.cy + G.R * 0.3 + 'px';
    const fr = fcv.getBoundingClientRect();
    fcv.width = Math.round(fr.width * G.dpr); fcv.height = Math.round(fr.height * G.dpr);
    Fl.ox = fr.left - r.left; Fl.oy = fr.top - r.top;
    ['ping', 'down', 'up'].forEach(drawSpark);
    drawGauge();
  }

  function drawGauge() {
    const { W, H, dpr, R, T, cx, cy } = G;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const intro = ease(SB.clamp(G.intro, 0, 1));
    if (intro <= 0.002 || R < 20 || stage.offsetParent === null) return;
    const col = G.heat ? COL.heat : COL[G.phase === 'up' ? 'up' : 'down'];
    const live = G.phase === 'down' || G.phase === 'up';
    const tShown = live ? SB.clamp(G.t, 0, 1) : 0;
    g.globalAlpha = Math.min(1, intro * 1.4);

    // halo de fond
    const halo = g.createRadialGradient(cx, cy, R * 0.15, cx, cy, R * 1.25);
    halo.addColorStop(0, G.heat ? 'rgba(255,40,20,.16)' : 'rgba(255,90,0,.09)');
    halo.addColorStop(1, 'rgba(255,90,0,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, R * 1.25, 0, Math.PI * 2); g.fill();

    // piste
    const end = A0 + SW * intro;
    g.lineCap = 'round';
    g.lineWidth = T; g.strokeStyle = 'rgba(255,255,255,.06)';
    g.beginPath(); g.arc(cx, cy, R, A0, end); g.stroke();
    g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,.07)';
    g.beginPath(); g.arc(cx, cy, R - T / 2 - 7, A0, end); g.stroke();

    // graduations (majeures = valeurs de l’échelle, 4 mineures entre)
    const S = D.scale, segs = S.length - 1, r0 = R + T / 2 + 5;
    g.lineCap = 'butt';
    for (let i = 0; i <= segs * 5; i++) {
      const tt = i / (segs * 5);
      if (tt > intro + 1e-6) break;
      const a = A0 + SW * tt, major = i % 5 === 0;
      const passed = live && G.t > 0.002 && tt <= tShown + 1e-6;
      const r1 = r0 + (major ? 9 : 4.5);
      g.strokeStyle = passed ? col.b : major ? 'rgba(255,255,255,.34)' : 'rgba(255,255,255,.14)';
      g.lineWidth = major ? 2 : 1.2;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
    }
    const fs = Math.max(11, Math.round(R * 0.08));
    g.font = `700 ${fs}px "JetBrains Mono", Consolas, monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const lr = R - T / 2 - fs * 1.45;
    S.forEach((v, i) => {
      const tt = i / segs; if (tt > intro + 1e-6) return;
      const a = A0 + SW * tt;
      const passed = live && G.t > 0.002 && tt <= tShown + 1e-6;
      g.fillStyle = passed ? '#ffffff' : 'rgba(201,195,207,.5)';
      g.fillText(String(v), cx + Math.cos(a) * lr, cy + Math.sin(a) * lr);
    });

    // arc de progression
    if (live && tShown > 0.001) {
      const cg = g.createConicGradient(A0, cx, cy);
      cg.addColorStop(0, col.a); cg.addColorStop(0.75, col.b); cg.addColorStop(1, col.a);
      g.save();
      g.lineCap = 'round'; g.shadowColor = col.a; g.shadowBlur = G.heat ? 34 : 22;
      g.lineWidth = T; g.strokeStyle = cg;
      g.beginPath(); g.arc(cx, cy, R, A0, A0 + SW * tShown); g.stroke();
      g.restore();
    }

    // radar du ping
    if (G.phase === 'ping' || G.phase === 'connect') {
      for (let k = 0; k < 3; k++) {
        const p = (G.pulse + k / 3) % 1;
        g.strokeStyle = `rgba(255,208,102,${(1 - p) * 0.45})`; g.lineWidth = 2;
        g.beginPath(); g.arc(cx, cy, R * (0.14 + p * 0.62), 0, Math.PI * 2); g.stroke();
      }
    }

    // aiguille
    const tn = live ? Math.max(0, G.t) : 0;
    const a = A0 + SW * Math.min(tn, 1.055) + (G.heat ? (Math.random() - 0.5) * 0.03 : 0);
    const nx = Math.cos(a), ny = Math.sin(a), px = -ny, py = nx;
    const r1 = R * 0.17, r2 = R - T / 2 - 3, w0 = Math.max(3.5, R * 0.045), w1 = 1.2;
    const ng = g.createLinearGradient(cx + nx * r1, cy + ny * r1, cx + nx * r2, cy + ny * r2);
    ng.addColorStop(0, 'rgba(255,255,255,0)'); ng.addColorStop(0.45, 'rgba(255,225,190,.5)'); ng.addColorStop(1, '#ffffff');
    g.save();
    g.shadowColor = 'rgba(255,140,40,.9)'; g.shadowBlur = 12;
    g.fillStyle = ng; g.beginPath();
    g.moveTo(cx + nx * r1 + px * w0, cy + ny * r1 + py * w0);
    g.lineTo(cx + nx * r2 + px * w1, cy + ny * r2 + py * w1);
    g.lineTo(cx + nx * r2 - px * w1, cy + ny * r2 - py * w1);
    g.lineTo(cx + nx * r1 - px * w0, cy + ny * r1 - py * w0);
    g.closePath(); g.fill(); g.restore();

    // moyeu : Le Y
    const hr = Math.max(14, R * 0.11);
    g.save();
    g.beginPath(); g.arc(cx, cy, hr + 3, 0, Math.PI * 2); g.fillStyle = '#0d0a0e'; g.fill();
    g.lineWidth = 2; g.strokeStyle = col.a; g.shadowColor = col.a; g.shadowBlur = 14; g.stroke();
    g.restore();
    if (hubImg.complete && hubImg.naturalWidth) {
      g.save(); g.beginPath(); g.arc(cx, cy, hr, 0, Math.PI * 2); g.clip();
      g.drawImage(hubImg, cx - hr * 1.12, cy - hr * 1.12, hr * 2.24, hr * 2.24);
      g.restore();
    }
    g.globalAlpha = 1;
  }

  // ------------------------------------------------------------ flammes TURBO
  const Fl = { parts: [], ox: -60, oy: -14, sprites: null, was: false };
  function sprites() {
    if (Fl.sprites) return Fl.sprites;
    Fl.sprites = ['255,244,190', '255,176,48', '255,96,12', '190,30,8'].map((rgb) => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.4, `rgba(${rgb},.5)`); gr.addColorStop(1, `rgba(${rgb},0)`);
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c;
    });
    return Fl.sprites;
  }
  function drawFlames(k) {
    const dpr = G.dpr, W = fcv.width / dpr, H = fcv.height / dpr;
    f.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!SB.turbo || stage.offsetParent === null) {
      if (Fl.was) { f.clearRect(0, 0, W, H); Fl.parts = []; Fl.was = false; }
      return;
    }
    Fl.was = true;
    f.globalCompositeOperation = 'source-over';
    f.clearRect(0, 0, W, H);
    const run = root.dataset.state === 'run';
    let cx, cy, rad, a0, a1;
    if (run) {
      cx = G.cx - Fl.ox; cy = G.cy - Fl.oy; rad = G.R + G.T / 2 + 6; a0 = A0; a1 = A0 + SW * ease(SB.clamp(G.intro, 0, 1));
    } else {
      const s = stage.getBoundingClientRect(), b = goBtn.getBoundingClientRect();
      cx = b.left + b.width / 2 - s.left - Fl.ox; cy = b.top + b.height / 2 - s.top - Fl.oy; rad = b.width / 2 - 2; a0 = 0; a1 = Math.PI * 2;
    }
    if (a1 - a0 < 0.05) return;
    const boost = run && (G.phase === 'down' || G.phase === 'up') ? 1 + SB.clamp(G.t, 0, 1.2) * 0.8 : 1;
    // aura de chaleur le long du cercle
    f.save();
    f.globalCompositeOperation = 'lighter';
    f.lineCap = 'round'; f.lineWidth = run ? 8 : 6;
    f.shadowColor = 'rgba(255,90,0,.9)'; f.shadowBlur = 26;
    f.strokeStyle = `rgba(255,110,10,${(0.16 + 0.08 * Math.sin(performance.now() / 160)) * boost})`;
    f.beginPath(); f.arc(cx, cy, rad + 4, a0, a1); f.stroke();
    f.restore();
    // nouvelles flammèches (montent en ondulant, du blanc-jaune au rouge sombre)
    const n = Math.round((run ? 10 : 7) * boost * k);
    for (let i = 0; i < n; i++) {
      const a = a0 + Math.random() * (a1 - a0), r = rad + FX.rand(-1, 7), out = FX.rand(0.1, 0.55);
      const life = FX.rand(16, 32) * (0.85 + 0.25 * boost);
      Fl.parts.push({
        x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r,
        vx: Math.cos(a) * out + FX.rand(-0.2, 0.2), vy: Math.sin(a) * out * 0.4 - FX.rand(0.7, 1.7) * Math.sqrt(boost),
        life, max: life, s: FX.rand(4.5, 10) * (run ? 1 : 0.85), ph: Math.random() * 6,
      });
    }
    const sp = sprites();
    f.globalCompositeOperation = 'lighter';
    Fl.parts = Fl.parts.filter((p) => p.life > 0);
    for (const p of Fl.parts) {
      p.vx += Math.sin((p.life + p.ph) * 0.35) * 0.05 * k;
      p.x += p.vx * k; p.y += p.vy * k; p.vy -= 0.03 * k; p.life -= k;
      const q = p.life / p.max, sz = p.s * (0.3 + 0.7 * q);
      f.globalAlpha = Math.min(1, q * 1.7) * 0.6;
      f.drawImage(sp[q > 0.72 ? 0 : q > 0.48 ? 1 : q > 0.24 ? 2 : 3], p.x - sz, p.y - sz * 1.7, sz * 2, sz * 3.4);
    }
    f.globalAlpha = 1;
    f.globalCompositeOperation = 'source-over';
  }

  // ------------------------------------------------------------ boucle d’animation
  let raf = 0, lastT = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
    // intro de la jauge
    G.intro += (G.introTo - G.intro) * Math.min(1, dt * (G.introTo > G.intro ? 2.6 : 5));
    // aiguille : ressort amorti (légèrement sous-amorti → petit rebond)
    const k = 140, c = 17;
    G.v += (k * (G.target - G.t) - c * G.v) * dt;
    G.t += G.v * dt;
    if (G.t < 0) { G.t = 0; G.v = Math.abs(G.v) * 0.25; }
    G.pulse = (G.pulse + dt * 0.8) % 1;
    // petit « tic » quand l’aiguille franchit une graduation majeure
    const major = Math.floor(SB.clamp(G.t, 0, 1) * (D.scale.length - 1) + 1e-6);
    if (running && major > G.lastMajor && (G.phase === 'down' || G.phase === 'up')) SB.tick();
    G.lastMajor = major;
    drawGauge();
    drawFlames(dt * 60);
    const busy = running || G.intro > 0.003 || Math.abs(G.v) > 0.001 || (SB.turbo && stage.offsetParent !== null);
    raf = busy ? 1 : 0; if (busy) SB.frame(loop);
    if (!raf) lastT = 0;
  }
  const kick = () => { if (!raf) { raf = 1; SB.frame(loop); } };
  SB.onTurbo(() => kick());

  function phaseLoop(ms, fn) {
    return new Promise((res) => {
      const dur = Math.max(1, ms * SB.timeScale), t0 = performance.now();
      const step = (now) => { const p = Math.min(1, (now - t0) / dur); fn(p); if (p >= 1) res(); else SB.frame(step); };
      SB.frame(step);
    });
  }

  function setReadout(phase, val, unit, heat) {
    const icon = { connect: 'i-globe', ping: 'i-ping', down: 'i-down', up: 'i-up' }[phase];
    const label = { connect: 'Connexion', ping: 'Ping Shox', down: 'Descente', up: 'Montée' }[phase];
    if (roPhase.textContent !== label) { roPhase.textContent = label; roIcon.setAttribute('href', '#' + icon); }
    const col = heat ? '#ff5136' : phase === 'up' ? COL.up.line : phase === 'down' ? COL.down.line : COL.ping.line;
    roIcon.parentElement.style.color = col;
    roVal.textContent = val;
    roUnit.textContent = unit;
    ro.classList.toggle('heat', !!heat);
  }

  // ------------------------------------------------------------ génération des valeurs (fictives)
  function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function makePlan(turbo, srv) {
    const r = Math.random();
    let down = SB.clamp(Math.exp(Math.log(300) + gauss() * 0.55) * srv.q, 14, 1000);
    let up = down * FX.rand(0.3, 0.8);
    let heat = null, socks = false;
    if (SB.forceHeat || r < 0.035) heat = SB.forceHeat || (Math.random() < 0.7 ? 'down' : 'up');
    else if (r < 0.065) { socks = true; down = FX.rand(0.4, 3.2); up = down * FX.rand(0.2, 0.7); }
    let ping = pingOf(srv) * FX.rand(0.85, 1.3);
    if (turbo) { down *= 1.5; up *= 1.5; ping /= 1.5; }
    return { down, up, ping, jit: FX.rand(0.6, 3) + ping * 0.08, heat, socks, heatAt: FX.rand(0.38, 0.62) };
  }

  async function speedPhase(k, T, ms, plan) {
    const m = M[k];
    G.phase = k; G.heat = false; G.lastMajor = 0;
    m.samples = []; m.heat = false; m.expect = Math.round(ms / 85);
    setMetric(k, 0, 'live');
    const ph = Math.random() * 6;
    let nz = 0, cur = 0, sample = 0, acc = 0, lastP = 0, heated = false;
    const keep = [];
    await phaseLoop(ms, (p) => {
      acc += p - lastP; lastP = p;
      const heatNow = plan.heat === k && p >= plan.heatAt;
      if (heatNow && !heated) {
        heated = true; G.heat = true; m.heat = true;
        gaugeEl.classList.remove('shake'); void gaugeEl.offsetWidth; gaugeEl.classList.add('shake');
        m.el.classList.add('heat');
        FX.sound('boom');
        const r = stage.getBoundingClientRect();
        FX.burst(r.left + G.cx, r.top + G.cy, { count: 90, spread: 11 });
      }
      if (acc >= 85 / ms || p >= 1) {
        acc = 0;
        if (heated) sample = 9999 * (1 - Math.random() * 0.002);
        else {
          nz = nz * 0.8 + (Math.random() * 2 - 1) * 0.2;
          const ramp = 1 - Math.exp(-p * 8.5);
          sample = Math.max(0, T * ramp * (1 + 0.045 * Math.sin(p * 17 + ph) + 0.1 * nz));
          if (p > 0.28) keep.push(sample);
        }
        m.samples.push(sample);
        drawSpark(k);
      }
      cur += (sample - cur) * (heated ? 0.5 : 0.22);
      G.target = heated ? 1.055 : v2t(cur);
      const shown = heated ? 9999 : cur;
      setReadout(k, SB.speed(shown), heated ? 'SURCHAUFFE !' : 'shox/s', heated);
      m.val.textContent = SB.speed(shown);
    });
    const final = heated ? 9999 : keep.reduce((a, b) => a + b, 0) / Math.max(1, keep.length);
    setMetric(k, final, 'done' + (heated ? ' heat' : ''));
    m.heat = heated;
    drawSpark(k);
    return { value: Math.round(final * 100) / 100, samples: m.samples.slice(), heat: heated };
  }

  // ------------------------------------------------------------ déroulement du test
  async function run() {
    if (running) return;
    running = true;
    const turbo = SB.turbo, srv = server, plan = makePlan(turbo, srv);
    root.dataset.state = 'run';
    verdictEl.hidden = true;
    srvBtn.disabled = true;
    $$('[data-clear="speed"]').forEach((b) => (b.disabled = true));
    for (const k of ['ping', 'down', 'up']) { M[k].samples = []; M[k].heat = false; setMetric(k, null); drawSpark(k); }
    $('[data-jit]', root).textContent = '—';
    G.t = 0; G.v = 0; G.target = 0; G.heat = false; G.phase = 'connect'; G.introTo = 1;
    FX.sound('whoosh');
    kick();

    // connexion
    setReadout('connect', '· · ·', srv.city);
    await SB.wait(750);

    // ping
    G.phase = 'ping';
    const pm = M.ping; pm.expect = 20;
    setMetric('ping', null, 'live');
    let last = plan.ping;
    await phaseLoop(1800, (p) => {
      const want = Math.floor(p * 20);
      while (pm.samples.length < want) {
        const spike = Math.random() < 0.08 ? FX.rand(2, 4) : 1;
        last = Math.max(1, plan.ping + Math.abs(gauss()) * plan.jit * spike);
        pm.samples.push(last); drawSpark('ping');
        setReadout('ping', FX.fmt(Math.round(last)), 'ms');
        pm.val.textContent = FX.fmt(Math.round(last));
      }
    });
    const ps = pm.samples.slice().sort((a, b) => a - b);
    const ping = Math.max(1, Math.round(ps[Math.floor(ps.length * 0.3)]));
    let jit = 0; for (let i = 1; i < pm.samples.length; i++) jit += Math.abs(pm.samples[i] - pm.samples[i - 1]);
    jit = Math.max(1, Math.round(jit / (pm.samples.length - 1)));
    setMetric('ping', ping, 'done');
    $('[data-jit]', root).textContent = FX.fmt(jit);
    FX.sound('pop');

    // descente puis montée
    const down = await speedPhase('down', plan.down, 6500, plan);
    G.target = 0; G.heat = false;
    setReadout('up', SB.speed(0), 'shox/s');
    await SB.wait(650);
    FX.sound('pop');
    const up = await speedPhase('up', plan.up, 6000, plan);
    G.target = 0; G.heat = false;
    await SB.wait(500);
    G.introTo = 0;
    await SB.wait(260);

    // résultat
    const h = hist();
    const prevBest = h.reduce((b, r) => Math.max(b, r.down), 0);
    const rec = {
      n: (h.length ? h[h.length - 1].n : 0) + 1, t: Date.now(), ping, jit, down: down.value, up: up.value,
      srv: srv.id, turbo, heat: down.heat ? 'down' : up.heat ? 'up' : null, socks: plan.socks || undefined,
      sp: { p: downsample(M.ping.samples), d: downsample(down.samples), u: downsample(up.samples) },
    };
    h.push(rec);
    if (h.length > MAXH) h.splice(0, h.length - MAXH);
    FX.store.set(KEY, h);

    running = false;
    root.dataset.state = 'done';
    srvBtn.disabled = false;
    showVerdict(rec, false);
    renderHist(rec.n);
    FX.sound('success');
    SB.addCoins(15);
    if (h.length > 1 && rec.down > prevBest) {
      setTimeout(() => {
        FX.sound('rare');
        const b = M.down.el.getBoundingClientRect();
        FX.burst(b.left + b.width / 2, b.top + b.height / 2, { count: 70 });
        FX.toast('Nouveau record de descente !');
      }, 450);
    }
    kick();
  }
  goBtn.addEventListener('click', () => { FX.sound('click'); run(); });
  SB.runSpeed = run;

  function verdictFor(rec) {
    const v = rec.heat ? 99999 : rec.down;
    return D.speedVerdicts.find((x) => v <= x.max).text;
  }
  function showVerdict(rec, old) {
    const city = (D.servers.find((s) => s.id === rec.srv) || server).city;
    verdictEl.innerHTML = (old ? `<b>Dernier test</b> <span class="mono-s">(${SB.esc(SB.when(rec.t).toLowerCase())})</span> : ` : `<b>Verdict :</b> `) + SB.esc(verdictFor(rec));
    verdictEl.title = 'Serveur : ' + city;
    verdictEl.hidden = false;
  }

  // ------------------------------------------------------------ historique, classement, stats
  function delta(cur, prev, lowerIsBetter, ms) {
    if (prev == null) return '<span class="dl flat">départ</span>';
    const d = cur - prev;
    const txt = ms ? FX.fmt(Math.abs(Math.round(d))) : FX.fmt(Math.abs(d), Math.abs(d) >= 100 ? 0 : 1);
    if (Math.abs(d) < (ms ? 0.5 : 0.05)) return '<span class="dl flat">= 0</span>';
    const good = lowerIsBetter ? d < 0 : d > 0;
    return `<span class="dl ${good ? 'good' : 'bad'}">${d > 0 ? '▲' : '▼'} ${txt}</span>`;
  }
  const cityOf = (id) => (D.servers.find((s) => s.id === id) || { city: 'Serveur disparu' }).city;

  function renderHist(fresh) {
    const h = hist();
    $('[data-count]', hEl).textContent = h.length;
    $('[data-clear]', hEl).disabled = !h.length || running;
    $('.lap-table', hEl).hidden = !h.length;
    $('[data-empty]', hEl).hidden = !!h.length;
    const best = h.reduce((b, r) => (r.down > b ? r.down : b), -1);
    const bestN = (h.find((r) => r.down === best) || {}).n;
    const rows = [];
    for (let i = h.length - 1; i >= 0; i--) {
      const r = h[i], p = h[i - 1];
      const tags = (r.n === bestN ? '<span class="tag rec"><svg class="ic"><use href="#i-trophy"/></svg>Record</span>' : '')
        + (r.turbo ? '<span class="tag turbo"><svg class="ic"><use href="#i-bolt"/></svg>Turbo</span>' : '')
        + (r.heat ? '<span class="tag heat">Surchauffe</span>' : '');
      rows.push(`<tr class="${r.n === fresh ? 'fresh' : ''}">
        <td class="c-n"><span class="lapn"><i>#</i>${r.n}</span></td>
        <td class="when"><b>${SB.esc(SB.when(r.t))}${tags}</b><span>${SB.esc(cityOf(r.srv))}</span></td>
        <td class="r"><span class="v">${FX.fmt(r.ping)}<small>ms</small></span>${delta(r.ping, p && p.ping, true, true)}</td>
        <td class="r"><span class="v${r.n === bestN ? ' best' : ''}">${SB.speed(r.down)}</span>${delta(r.down, p && p.down)}</td>
        <td class="r"><span class="v">${SB.speed(r.up)}</span>${delta(r.up, p && p.up)}</td>
      </tr>`);
    }
    $('[data-rows]', hEl).innerHTML = rows.join('');

    // classement (5 meilleures descentes)
    const top = h.slice().sort((a, b) => b.down - a.down || a.t - b.t).slice(0, 5);
    $('[data-rank]', hEl).innerHTML = top.length ? top.map((r, i) => `
      <li class="r${i + 1}">
        <span class="medal">${i < 3 ? SB.medal(i + 1) : `<span class="num">${i + 1}</span>`}</span>
        <span class="who"><b>${SB.speed(r.down)}<small>shox/s</small></b><span>Tour #${r.n} · ${SB.esc(cityOf(r.srv))}</span></span>
        <span class="lap">${SB.esc(SB.when(r.t, true))}</span>
      </li>`).join('') : '<li class="rank-empty">Le podium attend ses premiers ressorts.</li>';

    // statistiques
    const n = h.length, avg = (k) => (n ? h.reduce((s, r) => s + r[k], 0) / n : 0);
    const tile = (k, v, u, hot) => `<div class="tile${hot ? ' hot' : ''}"><div class="tile-k">${k}</div><div class="tile-v">${v}${u ? `<small>${u}</small>` : ''}</div></div>`;
    $('[data-stats]', hEl).innerHTML = n ? [
      tile('Tests', FX.fmt(n)),
      tile('Record', SB.speed(best), 'shox/s', true),
      tile('Moy. descente', SB.speed(avg('down')), 'shox/s'),
      tile('Moy. montée', SB.speed(avg('up')), 'shox/s'),
      tile('Ping moyen', FX.fmt(Math.round(avg('ping'))), 'ms'),
      tile('Gagnés', '+' + FX.fmt(n * 15), 'ShoxCoins'),
    ].join('') : '<div class="rank-empty" style="grid-column:1/-1">Rien à calculer pour l’instant.</div>';
  }

  // Effacer l’historique (confirmation dans la page)
  $('[data-clear="speed"]').addEventListener('click', async () => {
    const n = hist().length; if (!n || running) return;
    const ok = await SB.confirm({
      title: 'Effacer l’historique ?',
      text: `Les <b>${n} test${n > 1 ? 's' : ''}</b> de débit, le classement et les records seront supprimés. Tes ShoxCoins, eux, restent.`,
    });
    if (!ok) return;
    FX.store.set(KEY, []);
    FX.sound('whoosh');
    restoreIdle();
    renderHist();
    FX.toast('Historique de débit effacé');
  });

  // État au chargement : dernier résultat affiché (atténué)
  function restoreIdle() {
    const h = hist(), last = h[h.length - 1];
    if (!last) {
      root.dataset.state = 'idle';
      verdictEl.innerHTML = 'Appuie sur <b>GO</b> pour mesurer le rebond de ta connexion, en shox par seconde.';
      verdictEl.hidden = false;
      for (const k of ['ping', 'down', 'up']) { M[k].samples = []; setMetric(k, null); drawSpark(k); }
      $('[data-jit]', root).textContent = '—';
      return;
    }
    root.dataset.state = 'done';
    const sp = last.sp || {};
    [['ping', last.ping, sp.p], ['down', last.down, sp.d], ['up', last.up, sp.u]].forEach(([k, v, s]) => {
      M[k].samples = s || []; M[k].expect = (s || []).length; M[k].heat = last.heat === k;
      setMetric(k, v, 'old' + (last.heat === k ? ' heat' : ''));
    });
    $('[data-jit]', root).textContent = FX.fmt(last.jit || 1);
    showVerdict(last, true);
    requestAnimationFrame(() => ['ping', 'down', 'up'].forEach(drawSpark));
  }

  // ------------------------------------------------------------ démarrage
  showConn();
  restoreIdle();
  renderHist();
  new ResizeObserver(() => layout()).observe(stage);
  window.addEventListener('sb:tab', (e) => { if (e.detail === 'debit') requestAnimationFrame(() => { layout(); kick(); }); });
  document.fonts && document.fonts.ready.then(() => layout());
  kick();
})();
