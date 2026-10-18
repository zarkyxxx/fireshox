// ShoxBench — Shoxomètre politique (100 % hasard, 100 % symétrique) + historique.
(function () {
  'use strict';
  const { D, $, $$ } = SB;
  const KEY = 'bench.politics', MAXH = 100;
  const NS = 'http://www.w3.org/2000/svg';
  const CAT_COL = ['var(--p0)', 'var(--p1)', 'var(--p2)', 'var(--p3)', 'var(--p4)'];
  const CAT_HEX = ['#e5383b', '#ff7b9c', '#f2b33d', '#5b9dff', '#4562f0'];
  const CAT_TXT = ['#ff6f72', '#ff9bb5', '#ffc85e', '#86b6ff', '#8a9dff']; // teintes plus claires pour le texte

  const pol = $('#pol'), svg = $('#polSvg'), btn = $('#polBtn');
  const prPos = $('#prPos'), prCat = $('#prCat'), prPhrase = $('#prPhrase'), prBox = $('#polResult');
  const stepsEl = $('#polSteps'), logEl = $('#ppLog'), pctEl = $('#ppPct'), barEl = $('#ppBar');
  const hEl = $('#polHist');
  const hist = () => SB.list(KEY);
  SB.polHist = hist;
  let running = false;

  // Catégorie symétrique autour de 50 : centre 40–60, modéré 20–39 / 61–80, extrême 0–19 / 81–100
  const catOf = (pos) => { const d = pos - 50; return Math.abs(d) <= 10 ? 2 : d < 0 ? (d < -30 ? 0 : 1) : d > 30 ? 4 : 3; };

  // ------------------------------------------------------------ jauge SVG
  const CX = 320, CY = 306, R_IN = 206, R_OUT = 250;
  const pt = (r, deg) => { const a = (deg * Math.PI) / 180; return [CX + Math.cos(a) * r, CY + Math.sin(a) * r]; };
  const posDeg = (pos) => 180 + pos * 1.8; // 0 % = gauche (180°), 100 % = droite (360°)
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const sector = (r0, r1, d0, d1) => {
    const [x0, y0] = pt(r1, d0), [x1, y1] = pt(r1, d1), [x2, y2] = pt(r0, d1), [x3, y3] = pt(r0, d0);
    return `M${x0} ${y0} A${r1} ${r1} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 0 0 ${x3} ${y3}Z`;
  };
  let needleG, segEls = [], labelEls = [];
  function buildGauge() {
    svg.innerHTML = '';
    const defs = el('defs', {}, svg);
    defs.innerHTML = `
      <radialGradient id="pg-face" cx="50%" cy="100%" r="100%"><stop offset="0" stop-color="#2a1a14"/><stop offset=".55" stop-color="#17131b"/><stop offset="1" stop-color="#121017"/></radialGradient>
      <linearGradient id="pg-needle" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff5a00"/><stop offset=".6" stop-color="#ffb000"/><stop offset="1" stop-color="#fff4d0"/></linearGradient>
      <linearGradient id="pg-shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,255,255,.22)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/></linearGradient>
      <clipPath id="pg-hub"><circle cx="${CX}" cy="${CY}" r="33"/></clipPath>
      <path id="pg-text" d="M${CX - 268} ${CY} A268 268 0 0 1 ${CX + 268} ${CY}"/>
      <filter id="pg-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>`;
    // cadran
    el('path', { d: `M${CX - R_OUT - 8} ${CY} A${R_OUT + 8} ${R_OUT + 8} 0 0 1 ${CX + R_OUT + 8} ${CY}Z`, fill: 'url(#pg-face)', stroke: 'rgba(255,255,255,.07)' }, svg);
    // segments colorés
    segEls = [];
    for (let i = 0; i < 5; i++) {
      const d0 = 180 + i * 36 + (i ? 0.8 : 0), d1 = 180 + (i + 1) * 36 - (i < 4 ? 0.8 : 0);
      const gr = el('g', { class: 'seg' }, svg);
      el('path', { d: sector(R_IN, R_OUT, d0, d1), fill: CAT_HEX[i], opacity: '.16', filter: 'url(#pg-glow)' }, gr);
      const p = el('path', { d: sector(R_IN, R_OUT, d0, d1), fill: CAT_HEX[i] }, gr);
      el('path', { d: sector(R_OUT - 12, R_OUT, d0, d1), fill: 'url(#pg-shine)', opacity: '.6' }, gr);
      gr.style.transition = 'opacity .5s';
      segEls.push(gr);
      p.setAttribute('opacity', '.92');
    }
    // graduations : toutes les 2,5 %, majeures tous les 10 %
    const ticks = el('g', { stroke: 'rgba(255,255,255,.5)', 'stroke-linecap': 'round' }, svg);
    for (let i = 0; i <= 40; i++) {
      const pos = i * 2.5, major = i % 4 === 0, deg = posDeg(pos);
      const [x0, y0] = pt(R_IN - 6, deg), [x1, y1] = pt(R_IN - (major ? 22 : 13), deg);
      el('line', { x1: x0, y1: y0, x2: x1, y2: y1, 'stroke-width': major ? 2.4 : 1.3, opacity: major ? 0.85 : 0.45 }, ticks);
    }
    const nums = el('g', { 'font-family': 'JetBrains Mono, monospace', 'font-size': 13, 'font-weight': 700, fill: 'rgba(201,195,207,.6)', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, svg);
    for (let pos = 0; pos <= 100; pos += 20) {
      const [x, y] = pt(R_IN - 40, posDeg(pos));
      el('text', { x, y: y + (pos === 0 || pos === 100 ? -8 : 0) }, nums).textContent = pos;
    }
    // libellés courbes
    labelEls = [];
    D.categories.forEach((name, i) => {
      const t = el('text', { 'font-family': 'Outfit, sans-serif', 'font-size': 14.5, 'font-weight': 800, 'letter-spacing': '.6', fill: CAT_TXT[i], 'text-anchor': 'middle' }, svg);
      const tp = el('textPath', { href: '#pg-text', startOffset: `${10 + i * 20}%` }, t);
      tp.textContent = name.toUpperCase();
      t.style.transition = 'opacity .5s';
      labelEls.push(t);
    });
    // inscription du cadran
    el('text', { x: CX, y: CY - 116, 'text-anchor': 'middle', 'font-family': 'Bungee, sans-serif', 'font-size': 15, fill: 'rgba(255,255,255,.13)', 'letter-spacing': '3' }, svg).textContent = 'SHOX-O-MÈTRE';
    el('text', { x: CX, y: CY - 96, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace', 'font-size': 10.5, fill: 'rgba(255,255,255,.16)' }, svg).textContent = 'modèle R4 · étalonné au hasard';
    // aiguille
    needleG = el('g', { class: 'needle', style: 'filter: drop-shadow(0 4px 8px rgba(0,0,0,.6))' }, svg);
    el('path', { d: `M${CX - 9} ${CY} L${CX - 1.6} ${CY - 214} L${CX + 1.6} ${CY - 214} L${CX + 9} ${CY}Z`, fill: 'url(#pg-needle)' }, needleG);
    el('path', { d: `M${CX - 1.2} ${CY - 40} L${CX - 0.6} ${CY - 208} L${CX + 0.6} ${CY - 208} L${CX + 1.2} ${CY - 40}Z`, fill: 'rgba(255,255,255,.55)' }, needleG);
    // moyeu : le Mec aux Shox
    el('circle', { cx: CX, cy: CY, r: 39, fill: '#0d0a0e', stroke: '#ff8a00', 'stroke-width': 2.5, style: 'filter: drop-shadow(0 0 10px rgba(255,110,0,.7))' }, svg);
    el('image', { href: '/assets/logo-128.png', x: CX - 37, y: CY - 37, width: 74, height: 74, 'clip-path': 'url(#pg-hub)' }, svg);
  }

  // ------------------------------------------------------------ physique de l’aiguille
  const N = { x: 50, v: 0, target: 50, k: 38, c: 7.5, idle: true };
  let raf = 0, lastT = 0, lastCat = -1;
  function loop(now) {
    const dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
    let tgt = N.target;
    if (N.idle) tgt += Math.sin(now / 900) * 1.2;
    N.v += (N.k * (tgt - N.x) - N.c * N.v) * dt;
    N.x += N.v * dt;
    if (N.x < -1.5) { N.x = -1.5; N.v = Math.abs(N.v) * 0.35; }
    if (N.x > 101.5) { N.x = 101.5; N.v = -Math.abs(N.v) * 0.35; }
    needleG.setAttribute('transform', `rotate(${(N.x - 50) * 1.8} ${CX} ${CY})`);
    if (running) {
      prPos.textContent = Math.round(SB.clamp(N.x, 0, 100));
      const c = catOf(Math.round(SB.clamp(N.x, 0, 100)));
      if (c !== lastCat) { lastCat = c; SB.tick(); }
    }
    const visible = pol.offsetParent !== null;
    raf = visible ? 1 : 0; if (visible) SB.frame(loop);
    if (!raf) lastT = 0;
  }
  const kick = () => { if (!raf) { raf = 1; SB.frame(loop); } };

  function highlight(cat) {
    segEls.forEach((s, i) => (s.style.opacity = cat == null || i === cat ? 1 : 0.32));
    labelEls.forEach((t, i) => (t.style.opacity = cat == null || i === cat ? 1 : 0.4));
  }

  // ------------------------------------------------------------ étapes
  function buildSteps() {
    stepsEl.innerHTML = D.politicsSteps.map((s) => `<li><span class="st"><svg class="ic"><use href="#i-check"/></svg></span><span>${SB.esc(s.t)}</span></li>`).join('');
  }
  function log(line) {
    const s = document.createElement('span'); s.textContent = '> ' + line;
    logEl.appendChild(s);
    while (logEl.children.length > 3) logEl.firstChild.remove();
  }
  const fill = (t) => t.replace('{a}', Math.round(FX.rand(41, 99))).replace('{b}', Math.round(FX.rand(41, 99))).replace('{c}', Math.round(FX.rand(41, 99))).replace('{n}', Math.round(FX.rand(6, 14)));
  function progress(p) { const v = Math.round(p * 100); pctEl.textContent = v + ' %'; barEl.style.width = v + '%'; }

  function phraseFor(pos) {
    const cat = catOf(pos);
    if (cat === 2) return FX.pick(D.politicsPhrases.centre);
    const left = cat < 2;
    const tpl = FX.pick(cat === 0 || cat === 4 ? D.politicsPhrases.extreme : D.politicsPhrases.modere);
    return tpl.replace(/\{c\}/g, left ? 'gauche' : 'droite').replace(/\{pied\}/g, left ? 'pied gauche' : 'pied droit');
  }
  function showResult(r, fresh) {
    const c = r.cat;
    prPos.textContent = r.pos;
    prCat.textContent = D.categories[c];
    prCat.style.background = CAT_HEX[c] + '26';
    prCat.style.color = CAT_TXT[c];
    prCat.style.boxShadow = `inset 0 0 0 1px ${CAT_HEX[c]}66`;
    prPhrase.textContent = r.phrase;
    highlight(c);
    if (fresh) { prBox.classList.remove('pop'); void prBox.offsetWidth; prBox.classList.add('pop'); }
  }

  // ------------------------------------------------------------ analyse
  async function run() {
    if (running) return;
    running = true;
    pol.dataset.state = 'run';
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spin"></span><span>Analyse en cours…</span>';
    $('[data-clear="politics"]').disabled = true;
    highlight(null);
    prCat.textContent = 'Analyse en cours…';
    prCat.removeAttribute('style');
    prPhrase.textContent = 'L’aiguille réfléchit. Ne bouge surtout pas les pieds.';
    buildSteps(); progress(0);
    logEl.innerHTML = '';
    log('démarrage du Shoxomètre…');
    const final = Math.floor(Math.random() * 101);
    N.idle = false; N.k = 38; N.c = 6;
    FX.sound('whoosh');
    kick();

    // l’aiguille hésite : cibles au hasard, amplitude qui diminue
    let wander = true;
    (async () => {
      let amp = 55;
      while (wander) {
        N.target = SB.clamp(final + (Math.random() * 2 - 1) * amp + (Math.random() * 2 - 1) * 12, 0, 100);
        if (Math.random() < 0.18) N.target = Math.random() < 0.5 ? 2 : 98; // gros coup de panique, des deux côtés
        amp = Math.max(14, amp * 0.88);
        await SB.wait(FX.rand(280, 620));
      }
    })();

    const steps = $$('li', stepsEl), S = D.politicsSteps;
    for (let i = 0; i < S.length; i++) {
      steps[i].classList.add('on');
      for (const line of S[i].log) { log(fill(line)); await SB.wait(FX.rand(260, 420)); }
      await SB.wait(FX.rand(120, 260));
      steps[i].classList.remove('on'); steps[i].classList.add('ok');
      progress((i + 1) / S.length);
      FX.sound('tick');
    }
    wander = false;
    log('verdict : ' + final + ' %');
    N.target = final; N.k = 55; N.c = 6.5;
    await SB.wait(1500);
    N.x = final; N.v = 0;

    const h = hist();
    const rec = { n: (h.length ? h[h.length - 1].n : 0) + 1, t: Date.now(), pos: final, cat: catOf(final), phrase: phraseFor(final) };
    h.push(rec);
    if (h.length > MAXH) h.splice(0, h.length - MAXH);
    FX.store.set(KEY, h);

    running = false;
    N.idle = true;
    pol.dataset.state = 'done';
    showResult(rec, true);
    btn.disabled = false;
    btn.innerHTML = '<svg class="ic redo"><use href="#i-redo"/></svg><span>Refaire l’analyse</span>';
    FX.sound('success');
    const b = prPos.getBoundingClientRect();
    FX.burst(b.left + b.width / 2, b.top + b.height / 2, { count: 50, colors: [CAT_HEX[rec.cat], '#ffd84a', '#fff2c0'] });
    renderHist(rec.n);
    SB.addCoins(15);
  }
  btn.addEventListener('click', () => { FX.sound('click'); run(); });
  SB.runPolitics = run;

  // ------------------------------------------------------------ historique + stats
  function renderHist(fresh) {
    const h = hist();
    $('[data-count]', hEl).textContent = h.length;
    $('[data-clear]', hEl).disabled = !h.length || running;
    $('.lap-table', hEl).hidden = !h.length;
    $('[data-empty]', hEl).hidden = !!h.length;
    const rows = [];
    for (let i = h.length - 1; i >= 0; i--) {
      const r = h[i], p = h[i - 1];
      let shift = '<span class="shift flat">—</span>';
      if (p) {
        const d = r.pos - p.pos;
        shift = d === 0 ? '<span class="shift flat">= 0</span>' : `<span class="shift">${d < 0 ? '← ' : ''}${Math.abs(d)} pt${Math.abs(d) > 1 ? 's' : ''}${d > 0 ? ' →' : ''}</span>`;
      }
      rows.push(`<tr class="${r.n === fresh ? 'fresh' : ''}">
        <td class="c-n"><span class="lapn"><i>#</i>${r.n}</span></td>
        <td class="when"><b>${SB.esc(SB.when(r.t))}</b></td>
        <td><div class="posbar-wrap"><div class="posbar">${CAT_HEX.map((c) => `<i style="background:${c}"></i>`).join('')}</div><b style="left:${r.pos}%"></b></div></td>
        <td class="r"><span class="v">${r.pos}<small>%</small></span></td>
        <td><span class="catchip" style="color:${CAT_TXT[r.cat]};background:${CAT_HEX[r.cat]}22">${D.categories[r.cat]}</span></td>
        <td class="r">${shift}</td>
      </tr>`);
    }
    $('[data-rows]', hEl).innerHTML = rows.join('');

    // répartition
    const counts = [0, 0, 0, 0, 0]; h.forEach((r) => counts[r.cat]++);
    const max = Math.max(1, ...counts);
    $('[data-distrib]', hEl).innerHTML = D.categories.map((name, i) => `
      <div class="drow"><span style="color:${CAT_TXT[i]}">${name}</span>
        <div class="dtrack"><i style="background:${CAT_HEX[i]};width:${h.length ? (counts[i] / max) * 100 : 0}%"></i></div>
        <span class="mono">${counts[i]} · ${h.length ? Math.round((counts[i] / h.length) * 100) : 0} %</span></div>`).join('');

    // moyenne
    const box = $('[data-polstats]', hEl);
    if (!h.length) { box.innerHTML = '<div class="rank-empty">La moyenne attend ta première analyse.</div>'; return; }
    const avg = h.reduce((s, r) => s + r.pos, 0) / h.length;
    const ac = catOf(Math.round(avg));
    let gap = 0; for (let i = 1; i < h.length; i++) gap = Math.max(gap, Math.abs(h[i].pos - h[i - 1].pos));
    box.innerHTML = `<div class="avgbox">
      <div class="avg-top"><span class="mono">${FX.fmt(avg, 1)}<small style="font-size:15px;color:var(--muted)"> %</small></span>
        <span class="catchip" style="color:${CAT_TXT[ac]};background:${CAT_HEX[ac]}22">${D.categories[ac]}</span></div>
      <div class="avg-scale">${CAT_HEX.map((c) => `<i style="background:${c}"></i>`).join('')}<b style="left:${avg}%"></b></div>
      <div class="avg-ends"><span>Extrême gauche</span><span>Extrême droite</span></div>
      <div class="avg-line">Sur <b>${h.length}</b> analyse${h.length > 1 ? 's' : ''}. Plus grand écart entre deux passages : <b>${gap} pts</b>${gap >= 50 ? ' (souplesse de ressort remarquable)' : ''}.</div>
    </div>`;
  }

  $('[data-clear="politics"]').addEventListener('click', async () => {
    const n = hist().length; if (!n || running) return;
    const ok = await SB.confirm({
      title: 'Effacer l’historique ?',
      text: `Les <b>${n} analyse${n > 1 ? 's' : ''}</b> du Shoxomètre et leur répartition seront supprimées. Tes ressorts oublieront tout.`,
    });
    if (!ok) return;
    FX.store.set(KEY, []);
    FX.sound('whoosh');
    restore();
    renderHist();
    FX.toast('Historique du Shoxomètre effacé');
  });

  function restore() {
    const h = hist(), last = h[h.length - 1];
    buildSteps(); progress(0);
    logEl.innerHTML = '';
    if (last) {
      pol.dataset.state = 'done';
      N.target = N.x = last.pos;
      showResult(last, false);
      log(`dernière analyse (n° ${last.n}) : ${last.pos} %`);
      btn.innerHTML = '<svg class="ic redo"><use href="#i-redo"/></svg><span>Refaire l’analyse</span>';
    } else {
      pol.dataset.state = 'idle';
      N.target = N.x = 50;
      highlight(null);
      prPos.textContent = '—';
      prCat.textContent = 'En attente d’analyse';
      prCat.removeAttribute('style');
      prPhrase.textContent = 'Lance l’analyse : l’aiguille hésitera un peu, puis se posera là où tes Shox l’ont décidé.';
      log('prêt. Pose tes Shox bien à plat.');
      btn.innerHTML = '<svg class="ic"><use href="#i-play"/></svg><span>Lancer l’analyse</span>';
    }
  }

  buildGauge();
  restore();
  renderHist();
  window.addEventListener('sb:tab', (e) => { if (e.detail === 'shoxometre') kick(); });

  SB.boot();
  kick();
})();
