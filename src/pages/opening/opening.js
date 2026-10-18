// Shox Opening — la scène d'ouverture : paquet qui tremble, déchirure, cartes qui sortent,
// retournement carte par carte (animation selon la rareté), plateau des 8 cartes, récapitulatif.
//   SO_OPEN.start(booster, { cards, isNew }, rectDeDépart)   (appelé par app.js après l'achat)
(function () {
  'use strict';
  const D = window.SO_DATA, C = window.SO_CARDS, PX = window.SO_PX;
  const $ = (s, r = document) => r.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

  const stage = $('#stage'), center = $('#st-center'), shakeEl = $('#st-shake');
  const elLabel = $('#st-label'), elName = $('#st-name'), elHint = $('#st-hint'), elTray = $('#st-tray');
  const elRecap = $('#st-recap'), elFlash = $('#st-flash'), elMq = $('#st-marquee');
  const elBname = $('#st-bname'), elCount = $('#st-count'), elSkip = $('#st-skip');
  const elDark = stage.querySelector('.st-dark');

  let S = null; // session en cours
  let L = {}; // mesures
  let layersReady = false;

  // ------------------------------------------------------------ mesures
  function measure() {
    const W = innerWidth, H = innerHeight;
    const topH = 64, trayH = 92;
    let ch = Math.max(240, Math.min(620, (H - topH - trayH - 34) * 0.9));
    let cw = ch * 5 / 7;
    if (cw > W * 0.4) { cw = W * 0.4; ch = cw * 7 / 5; }
    // le booster occupe la hauteur libre (sans le plateau), en laissant la place de l'indice en bas
    const pTop = topH + 6, pBot = H - 60;
    const ph = Math.min(pBot - pTop - 8, ch * 1.3);
    const pw = ph / 1.62;
    const cy = Math.round(topH + (H - topH - trayH) / 2 + 4);
    const pcy = Math.round((pTop + pBot) / 2);
    // dans le paquet, les cartes sont un peu réduites (DS) et cachées sous la ligne de déchirure
    const DS = 0.88;
    const deckIn = pcy + (ph - ch * DS) / 2 * 0.6;
    L = { W, H, cw, ch, cy, ph, pw, pcy, DS, y0: deckIn - cy, y1: deckIn - ch * 0.36 - cy, drop: ph * 0.1 };
    const st = stage.style;
    st.setProperty('--cw', cw + 'px'); st.setProperty('--ch', ch + 'px'); st.setProperty('--cy', cy + 'px');
    st.setProperty('--pw', pw + 'px'); st.setProperty('--ph', ph + 'px');
    if (S && S.holder) S.holder.style.top = (pcy - ph / 2) + 'px';
    if (S && S.deck) S.deck.style.top = cy + 'px';
    if (S && S.phase === 'recap') sizeRecap();
  }
  addEventListener('resize', () => { if (S) { measure(); PX.fit(); } });

  // ------------------------------------------------------------ petits effets
  const shk = { amp: 0, until: 0, dur: 1, raf: 0 };
  function shake(amp, ms) {
    const now = performance.now();
    const left = Math.max(0, shk.until - now) / shk.dur;
    shk.amp = Math.max(amp, shk.amp * left * left);
    shk.dur = ms; shk.until = now + ms;
    if (!shk.raf) shk.raf = requestAnimationFrame(shakeLoop);
  }
  function shakeLoop(now) {
    const left = shk.until - now;
    if (left <= 0) { shakeEl.style.transform = ''; shk.raf = 0; return; }
    const k = left / shk.dur, a = shk.amp * k * k;
    shakeEl.style.transform = `translate3d(${rnd(-a, a).toFixed(1)}px,${rnd(-a, a).toFixed(1)}px,0) rotate(${(rnd(-a, a) * 0.05).toFixed(2)}deg)`;
    shk.raf = requestAnimationFrame(shakeLoop);
  }
  function tremble(el, ms, a0, a1) {
    return new Promise((res) => {
      const t0 = performance.now();
      const f = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        const a = a0 + (a1 - a0) * k * k;
        el.style.transform = `translate3d(${rnd(-a, a).toFixed(1)}px,${rnd(-a, a).toFixed(1)}px,0) rotate(${(rnd(-a, a) * 0.3).toFixed(2)}deg)`;
        if (k < 1 && S) requestAnimationFrame(f); else { el.style.transform = ''; res(); }
      };
      requestAnimationFrame(f);
    });
  }
  function flash(op, ms, color) {
    elFlash.style.background = color || '#fff';
    elFlash.animate([{ opacity: op }, { opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.2,.6,.3,1)' });
  }
  function setDark(v) { elDark.style.opacity = v; }
  function hint(html) {
    if (!html) { elHint.classList.remove('show'); return; }
    elHint.innerHTML = '<span class="pulse"></span><span>' + html + '</span>';
    elHint.classList.add('show');
  }
  function gemsHTML(r) { return '<span class="gems">' + '<i></i>'.repeat(D.rarities[r].stars) + '</span>'; }
  function label(g) {
    elLabel.className = 'st-label r-' + g;
    elLabel.innerHTML = g === 'qr' ? 'Carte jeu bonus' : gemsHTML(g) + D.rarities[g].label;
    void elLabel.offsetWidth;
    elLabel.classList.add('show');
  }
  function bigName(c, kind) {
    elName.className = 'st-name ' + kind;
    elName.innerHTML = `<b>${C.esc(c.name)}</b><span>${C.esc(c.sub)}</span>`;
    void elName.offsetWidth;
    elName.classList.add('show');
  }
  // Texte géant qui défile derrière la carte. Préparé (invisible) au début de la séquence pour que
  // son premier dessin ne tombe pas pile au moment de l'explosion ; affiché ensuite par showMarquee().
  function prepMarquee(word, kind) {
    const fs = Math.max(54, Math.min(128, innerHeight * 0.115));
    const copies = Math.ceil(innerWidth / ((word.length + 3) * 0.8 * fs)) + 1;
    const one = (word + ' ✦ ').repeat(copies);
    const rows = kind === 'legend'
      ? [['out', '', 26], ['fill', 'rev', 20], ['out', '', 30]]
      : [['out dim', '', 28], ['out', 'rev', 24]];
    stage.style.setProperty('--mq-line', kind === 'legend' ? 'rgba(255,196,70,.55)' : 'rgba(205,130,255,.5)');
    stage.style.setProperty('--mq-fill', kind === 'legend' ? 'linear-gradient(90deg,#fff3b0,#ffc021,#ff7a00,#ffc021,#fff3b0)' : 'linear-gradient(90deg,#f5dcff,#b44dff,#ff6ad5)');
    elMq.innerHTML = rows.map(([cls, dir, d]) => `<div class="mq-row ${cls} ${dir}" style="--mqd:${d}s"><span>${one}${one}</span></div>`).join('');
    stage.classList.add('mq-prep');
  }
  function showMarquee() { stage.classList.add('mq-on'); }

  // Rayons : texture dessinée une fois sur un petit canvas (720 px) puis agrandie et tournée par
  // le compositeur — bien plus léger qu'un dégradé conique de 3000 px redessiné.
  const raysCv = stage.querySelector('.st-rays-in');
  let raysColor = '';
  function setRays(color) {
    if (color === raysColor) return;
    raysColor = color;
    const g = raysCv.getContext('2d'), N = 720, R = N / 2;
    g.clearRect(0, 0, N, N);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = color;
    for (let a = 0; a < 360; a += 12) {
      const a0 = (a * Math.PI) / 180, a1 = ((a + 4) * Math.PI) / 180;
      g.beginPath(); g.moveTo(R, R); g.arc(R, R, R, a0, a1); g.closePath(); g.fill();
    }
    g.globalCompositeOperation = 'destination-in';
    const m = g.createRadialGradient(R, R, 0, R, R, R);
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.25, 'rgba(0,0,0,.6)'); m.addColorStop(0.62, 'rgba(0,0,0,0)');
    g.fillStyle = m; g.fillRect(0, 0, N, N);
    g.globalCompositeOperation = 'source-over';
  }
  function hexA(hex, a) {
    const n = parseInt(hex.replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function live(sess) { return S === sess && !sess.dead; }
  function going(sess, ph = 'cards') { return live(sess) && sess.phase === ph; }
  function fxStop() { if (S) { S.fx.forEach((e) => e.stop()); S.fx = []; } }
  const cc = () => ({ x: innerWidth / 2, y: L.cy });

  // ------------------------------------------------------------ démarrage
  function initLayers() {
    if (layersReady) return;
    PX.layer('back', $('#fx-back'));
    PX.layer('front', $('#fx-front'));
    layersReady = true;
  }

  function start(b, pull, fromRect, onFly) {
    const again = !!S;
    if (S) teardown(false);
    const sess = {
      b, cards: [{ qr: true, booster: b.id, key: 'qr/' + b.id }].concat(pull.cards), isNew: [false].concat(pull.isNew),
      idx: 0, revealed: false, phase: 'enter', busy: false, fx: [], els: [], slots: [], dead: false,
    };
    S = sess;
    stage.hidden = false;
    document.body.classList.add('stage-open');
    stage.className = 'stage b-' + b.id + ' hide-tray rays-on' + (again ? '' : ' enter');
    for (const [k, v] of Object.entries({ '--a': b.colors.a, '--b': b.colors.b, '--c': b.colors.c, '--dark': b.colors.dark, '--ink': b.colors.ink })) stage.style.setProperty(k, v);
    setRays(hexA(b.colors.a, 0.24));
    initLayers();
    measure();
    PX.fit();
    elBname.textContent = b.name;
    elCount.textContent = '';
    elRecap.hidden = true; elRecap.innerHTML = '';
    setDark(0);
    hint(null);
    elLabel.className = 'st-label'; elName.className = 'st-name';

    // ambiance (calque arrière)
    sess.ambient = ambient(b);

    // plateau
    elTray.innerHTML = '';
    sess.slots = sess.cards.map(() => { const s = document.createElement('div'); s.className = 'tray-slot'; elTray.append(s); return s; });

    // paquet de cartes (caché dans le booster)
    const deck = document.createElement('div');
    deck.className = 'deck';
    deck.style.top = L.cy + 'px';
    deck.style.transform = `translateY(${L.y0}px) scale(${L.DS})`;
    deck.style.visibility = 'hidden';
    sess.deck = deck;
    center.append(deck);

    // booster
    const holder = document.createElement('div');
    holder.className = 'st-pack';
    holder.style.top = (L.pcy - L.ph / 2) + 'px';
    holder.style.setProperty('--tear-y', C.TEAR_Y);
    holder.style.setProperty('--swipe', Math.round(L.pw * 0.72) + 'px');
    holder.innerHTML = '<div class="st-pack-glow"></div><div class="st-pack-shadow"></div><div class="pk-wob"></div>';
    const pk = C.pack(b, { split: true });
    const wob = holder.querySelector('.pk-wob');
    wob.append(pk);
    wob.insertAdjacentHTML('beforeend', '<div class="tear-glow"></div><div class="pk-burst"></div><div class="tear-guide"><span class="finger"></span></div>');
    sess.holder = holder; sess.strip = pk.querySelector('.pk-strip');
    center.append(holder);
    bindTear(sess);

    // arrivée du booster (depuis sa place dans la boutique si on la connaît)
    arrive(sess, holder, fromRect, onFly);
    return sess;
  }

  async function arrive(sess, holder, fromRect, onFly) {
    const b = sess.b;
    // Le paquet est d'abord posé à sa taille finale, quasi invisible, le temps d'être dessiné
    // une fois : le vol qui suit n'a plus rien à peindre (pas d'à-coup en plein vol).
    holder.style.opacity = '0.01';
    await frame(); await frame();
    if (!live(sess)) return;
    holder.style.opacity = '';
    if (onFly) onFly();
    const to = holder.getBoundingClientRect();
    let anim;
    if (fromRect && fromRect.width) {
      const dx = (fromRect.left + fromRect.width / 2) - (to.left + to.width / 2);
      const dy = (fromRect.top + fromRect.height / 2) - (to.top + to.height / 2);
      const s = fromRect.width / to.width;
      anim = holder.animate([
        { transform: `translate(${dx}px,${dy}px) scale(${s})` },
        { transform: 'translate(0,-14px) scale(1.04) rotate(-2deg)', offset: 0.7 },
        { transform: 'none' },
      ], { duration: 820, easing: 'cubic-bezier(.3,.8,.3,1)' });
    } else {
      anim = holder.animate([
        { transform: 'translateY(70vh) rotate(-10deg) scale(.7)', opacity: 0 },
        { transform: 'translateY(-16px) rotate(2deg) scale(1.03)', opacity: 1, offset: 0.7 },
        { transform: 'none', opacity: 1 },
      ], { duration: 760, easing: 'cubic-bezier(.3,.8,.3,1)' });
    }
    FX.sound('whoosh');
    await anim.finished;
    if (!going(sess, 'enter')) return;
    // Les 8 cartes sont construites maintenant, une par image, déjà à leur place derrière le
    // paquet (cachées par lui) : pas d'à-coup au clic d'achat, et elles sont déjà dessinées
    // quand on déchire.
    sess.deck.style.visibility = '';
    for (const c of sess.cards) {
      if (!going(sess, 'enter')) return;
      const oc = makeOC(sess, c);
      sess.deck.prepend(oc);
      sess.els.push(oc);
      layoutStack(sess, true);
      await frame();
    }
    if (!going(sess, 'enter')) return;
    sess.phase = 'pack';
    holder.classList.add('idle');
    hint('Glisse le long des pointillés pour déchirer <span class="k">ou clique</span>');
    const r = holder.getBoundingClientRect();
    PX.spark('front', r.left + r.width / 2, r.top + r.height * 0.5, { count: 26, speed: 380, size: 5, gravity: 200, colors: [b.colors.a, b.colors.c, '#fff'] });
  }

  function ambient(b) {
    if (b.id === 'squid') {
      return PX.emitter('back', { rate: 2.6, spawn: () => PX.make.shape(rnd(0, innerWidth), rnd(innerHeight * 0.2, innerHeight + 20), { size: 26, alpha: 0.32, colors: ['#ff2f7d', '#12b98a', '#ffd1e3'] }) });
    }
    if (b.id === 'lfi') {
      return PX.emitter('back', { rate: 11, spawn: () => PX.make.ember(rnd(0, innerWidth), innerHeight + 10, { colors: ['#ff2a3d', '#ff6a5a', '#fff1dc', '#ff2a3d'], up: 100, minUp: 40, life: 7, size: 4.5 }) });
    }
    return PX.emitter('back', { rate: 16, spawn: () => PX.make.ember(rnd(0, innerWidth), innerHeight + 10, { up: 120, minUp: 40, life: 7, size: 4.5 }) });
  }

  function makeOC(sess, c) {
    const oc = document.createElement('div');
    oc.className = 'oc g-' + (c.qr ? 'qr' : c.rarity);
    oc.innerHTML = '<div class="oc-shk"><div class="oc-lift"><div class="oc-aura"></div><div class="oc-beam"></div><div class="oc-rot"><div class="oc-face back"></div><div class="oc-face front"></div></div></div></div>';
    oc.querySelector('.oc-face.back').append(C.back());
    oc.querySelector('.oc-face.front').append(c.qr ? C.qrCard(sess.b) : C.face(c));
    return oc;
  }

  function layoutStack(sess, instant) {
    sess.els.forEach((oc, i) => {
      const d = i - sess.idx;
      if (d < 0) return;
      const k = Math.min(d, 3);
      if (instant) oc.style.transition = 'none';
      oc.style.transform = d === 0 ? 'translate3d(0,0,0)' : `translate3d(${k * 6}px,${k * 8}px,0) rotate(${(k * 1.7).toFixed(1)}deg) scale(${(1 - k * 0.028).toFixed(3)})`;
      oc.style.zIndex = String(50 - d);
      oc.style.visibility = d > 3 ? 'hidden' : '';
      oc.classList.toggle('cur', d === 0);
      // la face avant de la carte courante est dessinée à l'avance (quasi invisible) pour que le
      // retournement n'ait pas à la peindre au dernier moment
      oc.classList.toggle('prep', d === 0 && !oc.classList.contains('revealed'));
      if (instant) { void oc.offsetWidth; oc.style.transition = ''; }
    });
    sess.slots.forEach((s, i) => s.classList.toggle('cur', i === sess.idx && sess.phase !== 'pack'));
    elCount.textContent = sess.phase === 'cards' ? `Carte ${Math.min(sess.idx + 1, sess.cards.length)} / ${sess.cards.length}` : '';
    elCount.hidden = sess.phase !== 'cards';
  }

  // ------------------------------------------------------------ déchirure
  function bindTear(sess) {
    const h = sess.holder;
    let drag = null;
    h.addEventListener('pointerdown', (e) => {
      if (!live(sess) || sess.phase !== 'pack' || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      drag = { x0: e.clientX, p: 0, moved: false, last: 0 };
      try { h.setPointerCapture(e.pointerId); } catch (_) { /* évènement synthétique */ }
      h.classList.add('tearing'); h.classList.remove('idle');
    });
    h.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x0;
      if (Math.abs(dx) > 6) drag.moved = true;
      drag.p = Math.max(0, Math.min(1, dx / (h.getBoundingClientRect().width * 0.85)));
      setTear(sess, drag.p);
      if (drag.p - drag.last > 0.07) { drag.last = drag.p; tearSparks(sess, drag.p, 10); FX.sound('tick'); }
    });
    const up = () => {
      if (!drag) return;
      const d = drag; drag = null;
      h.classList.remove('tearing');
      if (!d.moved) autoTear(sess);
      else if (d.p > 0.4) completeTear(sess);
      else { setTear(sess, 0, true); h.classList.add('idle'); }
    };
    h.addEventListener('pointerup', up);
    h.addEventListener('pointercancel', up);
    h.addEventListener('click', (e) => e.stopPropagation());
  }
  function setTear(sess, p, smooth) {
    sess.tearP = p;
    sess.strip.style.transition = smooth ? 'transform .4s cubic-bezier(.3,1.45,.45,1)' : 'none';
    sess.strip.style.transform = `rotate(${(-p * 9).toFixed(2)}deg) translateY(${(-p * 5).toFixed(2)}%)`;
    sess.holder.style.setProperty('--p', p.toFixed(3));
  }
  function tearSparks(sess, p, n) {
    const r = sess.holder.getBoundingClientRect();
    PX.spark('front', r.left + r.width * p, r.top + r.height * C.TEAR_Y / 100, { count: n, speed: 360, minSpeed: 60, size: 5, gravity: 500, angle: -Math.PI / 2, cone: 1.4, colors: [sess.b.colors.c, '#fff', '#ffd84a'] });
  }
  function autoTear(sess) {
    if (!live(sess) || sess.phase !== 'pack') return;
    sess.phase = 'tearing';
    sess.holder.classList.remove('idle');
    hint(null);
    const t0 = performance.now(), from = sess.tearP || 0, dur = 380;
    let lastSpark = from;
    const f = (now) => {
      if (!live(sess)) return;
      const k = Math.min(1, (now - t0) / dur);
      const p = from + (0.7 - from) * (k * k * (3 - 2 * k));
      setTear(sess, p);
      if (p - lastSpark > 0.08) { lastSpark = p; tearSparks(sess, p, 8); }
      if (k < 1) requestAnimationFrame(f); else completeTear(sess);
    };
    FX.sound('tick');
    requestAnimationFrame(f);
  }
  async function completeTear(sess) {
    if (!live(sess) || sess.done) return;
    sess.done = true;
    sess.phase = 'tearing';
    hint(null);
    const h = sess.holder, b = sess.b;
    h.classList.remove('idle', 'tearing');
    const r = h.getBoundingClientRect();
    const tx = r.left + r.width / 2, ty = r.top + r.height * C.TEAR_Y / 100;
    FX.sound('tear');
    sess.strip.style.transition = 'none';
    sess.strip.animate([
      { transform: sess.strip.style.transform || 'none' },
      { transform: 'translate(70%,-260%) rotate(-42deg)' },
    ], { duration: 820, easing: 'cubic-bezier(.25,.6,.35,1)', fill: 'forwards' });
    h.style.setProperty('--p', 0);
    h.querySelector('.pk-burst').animate([
      { opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1)', offset: 0.2 }, { opacity: 0, transform: 'scale(1.7)' },
    ], { duration: 1000, easing: 'ease-out' });
    PX.spark('front', tx, ty, { count: 110, speed: 950, minSpeed: 180, size: 8, gravity: 700, angle: -Math.PI / 2, cone: 1.25, jitter: r.width * 0.3, colors: [b.colors.c, b.colors.a, '#fff', '#ffd84a'] });
    for (let i = 0; i < 18; i++) {
      const s = PX.make.streak(tx + rnd(-r.width * 0.3, r.width * 0.3), ty, { r0: 10, r1: innerHeight * 0.7, len: 180, colors: ['#fff', b.colors.c] });
      s.a = -Math.PI / 2 + rnd(-0.75, 0.75);
      PX.add('front', s);
    }
    PX.ring('front', tx, ty, { r0: 20, r1: r.width * 1.1, color: b.colors.c, width: 4, life: 0.6 });
    stage.classList.add('rays-hot');
    flash(0.35, 450);
    shake(10, 480);
    await sleep(430);
    if (!going(sess, 'tearing')) return;
    // les cartes sortent du paquet
    sess.deck.style.visibility = '';
    FX.sound('whoosh');
    const ds = `scale(${L.DS})`;
    sess.deck.animate([{ transform: `translateY(${L.y0}px) ${ds}` }, { transform: `translateY(${L.y1}px) ${ds}` }], { duration: 640, easing: 'cubic-bezier(.2,.85,.3,1)', fill: 'forwards' });
    const hDown = h.animate([{ transform: 'none' }, { transform: `translateY(${L.drop}px)` }], { duration: 640, easing: 'cubic-bezier(.2,.85,.3,1)', fill: 'forwards' });
    await sleep(680);
    if (!going(sess, 'tearing')) return;
    // le paquet tombe, les cartes viennent au centre
    hDown.cancel();
    h.animate([{ transform: `translateY(${L.drop}px)` }, { transform: `translateY(${innerHeight * 0.95}px) rotate(8deg)` }], { duration: 640, easing: 'cubic-bezier(.55,0,.85,.35)', fill: 'forwards' });
    sess.deck.style.zIndex = '5';
    stage.classList.remove('rays-hot', 'rays-on', 'hide-tray');
    const dm = sess.deck.animate([{ transform: `translateY(${L.y1}px) ${ds}` }, { transform: 'translateY(0px) scale(1)' }], { duration: 780, delay: 60, easing: 'cubic-bezier(.3,1.25,.45,1)', fill: 'forwards' });
    await dm.finished;
    if (!going(sess, 'tearing')) return;
    h.remove();
    sess.holder = null;
    sess.phase = 'cards';
    layoutStack(sess);
    hint('Clique pour retourner la carte <span class="k">Espace</span>');
  }

  // ------------------------------------------------------------ retournement
  function flipAnim(oc, { spins = 0, dur = 650, lift = 1.08 }) {
    const rot = oc.querySelector('.oc-rot'), lf = oc.querySelector('.oc-lift');
    lf.animate([{ transform: 'scale(1)' }, { transform: `translateZ(60px) scale(${lift})`, offset: 0.45 }, { transform: 'scale(1)' }], { duration: dur, easing: 'ease-in-out' });
    return rot.animate([{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${180 + spins * 360}deg)` }], { duration: dur, easing: 'cubic-bezier(.4,.05,.15,1)', fill: 'forwards' }).finished;
  }

  async function reveal(sess) {
    const c = sess.cards[sess.idx], oc = sess.els[sess.idx];
    oc.classList.remove('prep');
    sess.busy = true;
    hint(null);
    const g = c.qr ? 'qr' : c.rarity;
    try {
      if (g === 'legend') await legendSeq(sess, oc, c);
      else if (g === 'epic') await epicSeq(sess, oc, c);
      else await simpleSeq(sess, oc, c, g);
    } catch (err) { console.error(err); }
    if (!going(sess)) return;
    oc.classList.add('revealed');
    sess.revealed = true;
    sess.busy = false;
    const last = sess.idx === sess.cards.length - 1;
    if (g === 'qr') hint('Clique sur la carte pour <b>jouer</b> · à côté pour continuer');
    else hint(last ? 'Clique pour voir le récapitulatif' : 'Clique pour la carte suivante');
  }

  async function simpleSeq(sess, oc, c, g) {
    const p = cc();
    FX.sound('flip');
    const f = flipAnim(oc, { dur: g === 'common' ? 520 : 600, lift: g === 'common' ? 1.06 : 1.1 });
    await sleep(g === 'common' ? 260 : 300);
    if (!going(sess)) return;
    if (g === 'rare') {
      FX.sound('rare');
      PX.spark('front', p.x, p.y, { count: 60, speed: 640, minSpeed: 120, size: 7, gravity: 260, jitter: 30, colors: ['#e3f1ff', '#79bdff', '#3d9bff', '#1e6fe0'] });
      PX.ring('front', p.x, p.y, { r0: L.cw * 0.3, r1: L.ch * 0.9, color: '#79bdff', width: 6, life: 0.6 });
    } else if (g === 'qr') {
      FX.sound('ding');
      PX.spark('front', p.x, p.y, { count: 50, speed: 560, size: 6, gravity: 240, jitter: 30, colors: [sess.b.colors.a, sess.b.colors.c, '#fff', '#c9a6ff'] });
      PX.ring('front', p.x, p.y, { r0: L.cw * 0.3, r1: L.ch * 0.85, color: sess.b.colors.c, width: 5, life: 0.6 });
    } else {
      PX.spark('front', p.x, p.y, { count: 16, speed: 360, size: 4, gravity: 300, jitter: L.cw * 0.3, colors: ['#ffffff', '#c9d0d8', '#9aa3ad'] });
    }
    await f;
    if (!going(sess)) return;
    label(g);
  }

  async function epicSeq(sess, oc, c) {
    const p = cc(), shkEl = oc.querySelector('.oc-shk');
    stage.classList.add('hide-tray');
    setRays('rgba(190,110,255,.24)');
    prepMarquee('ÉPIQUE', 'epic');
    stage.classList.add('rays-on');
    setDark(0.55);
    FX.sound('whoosh');
    const imp = PX.emitter('front', { rate: 70, spawn: () => PX.make.implode(p.x, p.y, { r: L.ch * 0.85, size: 6, colors: ['#f5dcff', '#d797ff', '#b44dff', '#ff6ad5'] }) });
    sess.fx.push(imp);
    await tremble(shkEl, 800, 0.4, 5.5);
    imp.stop();
    if (!going(sess)) return;
    FX.sound('epic');
    flash(0.5, 420, '#f3dcff');
    shake(11, 520);
    const f = flipAnim(oc, { spins: 1, dur: 780, lift: 1.12 });
    PX.ring('front', p.x, p.y, { r0: L.cw * 0.2, r1: Math.max(innerWidth, innerHeight) * 0.55, color: '#d797ff', width: 8, life: 0.8 });
    PX.spark('front', p.x, p.y, { count: 110, speed: 900, minSpeed: 160, size: 8, gravity: 260, jitter: 20, colors: ['#ffffff', '#f5dcff', '#d797ff', '#b44dff', '#ff6ad5'] });
    for (let i = 0; i < 16; i++) PX.add('front', PX.make.streak(p.x, p.y, { r0: L.cw * 0.45, r1: innerWidth * 0.6, len: 170, colors: ['#f5dcff', '#d797ff'] }));
    await sleep(160);
    showMarquee();
    await f;
    if (!going(sess)) return;
    label('epic');
    bigName(c, 'epic');
    sess.fx.push(PX.emitter('back', { rate: 10, spawn: () => PX.make.ember(p.x + rnd(-L.cw * 0.75, L.cw * 0.75), p.y + L.ch * 0.45, { up: 110, life: 2.6, size: 4.5, colors: ['#f5dcff', '#d797ff', '#b44dff', '#ff6ad5'] }) }));
    setDark(0.42);
  }

  async function legendSeq(sess, oc, c) {
    const p = cc(), shkEl = oc.querySelector('.oc-shk'), lift = oc.querySelector('.oc-lift');
    stage.classList.add('hide-tray');
    setRays('rgba(255,190,70,.26)');
    prepMarquee('LÉGENDAIRE', 'legend');
    stage.classList.add('rays-on');
    setDark(0.93);
    FX.sound('boom');
    const fl = PX.emitter('back', { rate: 70, spawn: () => { const u = Math.random() - 0.5; return PX.make.flame(p.x + u * Math.abs(u) * 2 * innerWidth, innerHeight + 40, { size: 75, up: 560, minUp: 240, life: 1.5, alpha: 0.42 }); } });
    const imp = PX.emitter('front', { rate: 110, spawn: () => PX.make.implode(p.x, p.y, { r: L.ch, size: 7, colors: ['#fff6d0', '#ffd84a', '#ffb000', '#ff7a00'] }) });
    sess.fx.push(fl, imp);
    const charge = lift.animate([{ transform: 'scale(1)' }, { transform: 'translateZ(40px) scale(1.07)' }], { duration: 1650, easing: 'ease-in', fill: 'forwards' });
    let pulses = 0;
    const rumble = setInterval(() => { if (!going(sess)) return; pulses++; shake(1.5 + pulses * 1.6, 320); if (pulses === 3) { stage.classList.add('rays-hot'); FX.sound('boom'); } }, 300);
    await tremble(shkEl, 1650, 0.5, 10);
    clearInterval(rumble);
    imp.stop();
    if (!going(sess)) { fl.stop(); return; }
    // explosion
    FX.sound('legend');
    flash(1, 700, '#fff8e0');
    shake(24, 950);
    charge.cancel();
    const f = flipAnim(oc, { spins: 1, dur: 950, lift: 1.16 });
    const big = Math.max(innerWidth, innerHeight);
    PX.ring('front', p.x, p.y, { r0: 30, r1: big * 0.75, color: '#ffd84a', width: 12, life: 1 });
    PX.ring('front', p.x, p.y, { r0: 10, r1: L.ch * 1.1, color: '#ffffff', width: 6, life: 0.6 });
    PX.spark('front', p.x, p.y, { count: 190, speed: 1250, minSpeed: 220, size: 10, gravity: 320, life: 1.7, jitter: 20, colors: ['#ffffff', '#fff6d0', '#ffd84a', '#ffb000', '#ff7a00', '#ff3d00'] });
    for (let i = 0; i < 34; i++) PX.add('front', PX.make.streak(p.x, p.y, { r0: L.cw * 0.4, r1: big * 0.8, len: 260, colors: ['#fff6d0', '#ffd84a', '#ffffff'] }));
    for (let i = 0; i < 80; i++) PX.add('front', PX.make.confetti(p.x + rnd(-L.cw * 0.4, L.cw * 0.4), p.y + rnd(-40, 40), { speed: 1000, colors: ['#ffd84a', '#ff7a00', '#ffffff', '#ffb000', sess.b.colors.a] }));
    await sleep(140);
    showMarquee();
    await f;
    if (!going(sess)) { fl.stop(); return; }
    fl.setRate(6);
    label('legend');
    bigName(c, 'legend');
    stage.classList.remove('rays-hot');
    setDark(0.72);
    sess.fx.push(fl);
    sess.fx.push(PX.emitter('back', { rate: 22, spawn: () => PX.make.ember(p.x + rnd(-L.cw * 0.85, L.cw * 0.85), p.y + L.ch * 0.4 + rnd(-30, 30), { up: 160, life: 3, size: 5.5, colors: ['#fff6d0', '#ffd84a', '#ffb000', '#ff7a00'] }) }));
    sess.fx.push(PX.emitter('front', { rate: 5, spawn: () => ({ type: 'spark', x: p.x + rnd(-L.cw * 0.5, L.cw * 0.5), y: p.y + rnd(-L.ch * 0.5, L.ch * 0.5), vx: 0, vy: -20, g: 0, drag: 0, life: 0.6, size: rnd(5, 10), color: '#fff6d0', trail: false }) }));
  }

  function clearReveal(sess) {
    stage.classList.remove('mq-on', 'mq-prep', 'rays-hot', 'rays-on');
    setDark(0);
    elLabel.classList.remove('show');
    elName.classList.remove('show');
    fxStop();
  }

  // ------------------------------------------------------------ carte suivante
  async function next(sess) {
    if (!live(sess) || sess.busy) return;
    sess.busy = true;
    const i = sess.idx, oc = sess.els[i];
    clearReveal(sess);
    hint(null);
    stage.classList.remove('hide-tray');
    // destination : la case du plateau (positions sans les transformations en cours)
    const slot = sess.slots[i];
    const trayLeft = innerWidth / 2 - elTray.offsetWidth / 2;
    const sx = trayLeft + slot.offsetLeft + slot.offsetWidth / 2;
    const sy = elTray.offsetTop + slot.offsetTop + slot.offsetHeight / 2;
    const r = sess.deck.getBoundingClientRect();
    const dx = sx - (r.left + r.width / 2), dy = sy - (L.cy);
    const s = slot.offsetWidth / L.cw;
    oc.style.zIndex = '80';
    FX.sound('whoosh');
    oc.animate([
      { transform: 'translate3d(0,0,0) rotate(0deg) scale(1)' },
      { transform: `translate3d(${dx * 0.25}px,${dy * 0.1 - 30}px,0) rotate(-6deg) scale(${0.75})`, offset: 0.35 },
      { transform: `translate3d(${dx}px,${dy}px,0) rotate(-14deg) scale(${s})` },
    ], { duration: 560, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished.then(() => {
      oc.classList.add('gone');
      fillSlot(sess, i);
    });
    sess.idx++;
    sess.revealed = false;
    if (sess.idx >= sess.cards.length) {
      await sleep(620);
      if (going(sess)) showRecap(sess);
      return;
    }
    layoutStack(sess);
    await sleep(360);
    if (!going(sess)) return;
    sess.busy = false;
    hint('Clique pour retourner la carte');
  }
  function fillSlot(sess, i) {
    const c = sess.cards[i], s = sess.slots[i];
    s.innerHTML = '';
    s.append(C.mini(c.qr ? { qr: true, b: sess.b.id } : c));
    if (!c.qr) s.classList.add('r-' + c.rarity);
    FX.sound('tick');
  }

  function openGame(sess) {
    FX.sound('pop');
    FX.toast('Jeu bonus : bientôt disponible !');
    FX.open(sess.b.game);
  }

  // ------------------------------------------------------------ récapitulatif
  function sizeRecap() {
    const H = innerHeight, W = innerWidth;
    let rw = Math.min(232, ((H - 300) / 2) * 5 / 7, (W - 60 - 3 * W * 0.016) / 4);
    rw = Math.max(96, rw);
    elRecap.style.setProperty('--rw', Math.floor(rw) + 'px');
  }
  function showRecap(sess) {
    if (!live(sess)) return;
    sess.phase = 'recap';
    sess.busy = false;
    clearReveal(sess);
    hint(null);
    stage.classList.add('phase-recap', 'hide-tray');
    sess.deck.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    if (sess.holder) { sess.holder.remove(); sess.holder = null; }
    const b = sess.b;
    const real = sess.cards.map((c, i) => ({ c, i })).filter((x) => !x.c.qr);
    const nNew = real.filter((x) => sess.isNew[x.i]).length;
    const nDup = real.length - nNew;
    const dupValue = real.filter((x) => !sess.isNew[x.i]).reduce((t, x) => t + D.rarities[x.c.rarity].recycle, 0);
    const best = real.reduce((m, x) => (D.rarities[x.c.rarity].rank > D.rarities[m].rank ? x.c.rarity : m), 'common');
    const app = window.SO_APP;
    const coins = app ? app.coins() : 0;
    elRecap.innerHTML = `
      <div class="rc-head">
        <div class="rc-kicker">Récapitulatif</div>
        <h2 class="rc-title">${C.esc(b.name)}</h2>
        <div class="rc-chips">
          <span class="rc-chip best r-${best}">${gemsHTML(best)} Meilleure : ${D.rarities[best].label}</span>
          <span class="rc-chip new">${nNew} nouvelle${nNew > 1 ? 's' : ''}</span>
          <span class="rc-chip">${nDup} doublon${nDup > 1 ? 's' : ''}${nDup ? ` · +${dupValue} au recyclage` : ''}</span>
        </div>
      </div>
      <div class="rc-grid"></div>
      <div class="rc-actions">
        <button class="fs-btn fire rc-again"><svg><use href="#i-redo"/></svg>Rouvrir <span class="price"><svg><use href="#i-coin"/></svg>${b.price}</span></button>
        <button class="fs-btn rc-col"><svg><use href="#i-cards"/></svg>Voir la collection</button>
        <button class="fs-btn rc-shop"><svg><use href="#i-bag"/></svg>Boutique</button>
      </div>
      <div class="rc-bal">Solde : ${FX.fmt(coins)} ShoxCoins</div>`;
    sizeRecap();
    const grid = elRecap.querySelector('.rc-grid');
    // cases réservées tout de suite (la grille ne bouge pas), cartes construites une à une juste
    // avant leur animation d'entrée : le travail est réparti sur plusieurs images
    sess.cards.forEach((c, i) => {
      const cell = document.createElement('button');
      cell.className = 'rc-cell pending' + (c.qr ? ' is-qr' : ' r-' + c.rarity);
      if (!c.qr) {
        const bd = document.createElement('span');
        bd.className = 'rc-badge ' + (sess.isNew[i] ? 'new' : 'dup');
        bd.textContent = sess.isNew[i] ? 'Nouveau' : 'Doublon';
        cell.append(bd);
      }
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        if (c.qr) openGame(sess);
        else if (app) app.openDetail(c.key, real.map((x) => x.c.key));
      });
      grid.append(cell);
      setTimeout(() => {
        if (!live(sess) || sess.phase !== 'recap') return;
        cell.prepend(c.qr ? C.qrCard(b) : C.face(c));
        cell.classList.remove('pending');
        cell.animate([
          { opacity: 0, transform: 'translateY(70px) rotateX(50deg) scale(.7)' },
          { opacity: 1, transform: 'translateY(-8px) rotateX(-6deg) scale(1.03)', offset: 0.7 },
          { opacity: 1, transform: 'none' },
        ], { duration: 640, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
        setTimeout(() => { if (live(sess) && sess.phase === 'recap') FX.sound(c.qr || c.rarity === 'common' ? 'tick' : 'pop'); }, 200);
      }, 100 + i * 80);
    });
    elRecap.hidden = false;
    elRecap.querySelector('.rc-again').addEventListener('click', (e) => { e.stopPropagation(); if (app) app.reopen(b.id, e.currentTarget); });
    elRecap.querySelector('.rc-col').addEventListener('click', (e) => { e.stopPropagation(); close('collection'); });
    elRecap.querySelector('.rc-shop').addEventListener('click', (e) => { e.stopPropagation(); close('boutique'); });
    FX.sound('success');
    if (best === 'legend' || best === 'epic') {
      const colors = best === 'legend' ? ['#ffd84a', '#ff7a00', '#ffffff', '#ffb000'] : ['#d797ff', '#ff6ad5', '#ffffff'];
      setTimeout(() => { if (!live(sess)) return; for (let i = 0; i < 70; i++) PX.add('front', PX.make.confetti(rnd(0, innerWidth), -20, { speed: 200, colors })); }, 500);
    }
    if (app) app.refresh();
  }

  // ------------------------------------------------------------ passer, fermer
  function skip() {
    const sess = S;
    if (!sess || sess.phase === 'recap') return;
    FX.sound('whoosh');
    for (let i = sess.idx; i < sess.cards.length; i++) fillSlot(sess, i);
    sess.busy = false;
    showRecap(sess);
  }

  function teardown(full) {
    if (!S) return;
    S.dead = true;
    if (S.ambient) S.ambient.stop();
    fxStop();
    PX.stopAll();
    PX.clear('back'); PX.clear('front');
    center.innerHTML = '';
    elRecap.innerHTML = ''; elRecap.hidden = true;
    elTray.innerHTML = '';
    elMq.innerHTML = '';
    hint(null);
    elLabel.className = 'st-label'; elName.className = 'st-name';
    shakeEl.style.transform = '';
    S = null;
    if (full) {
      stage.hidden = true;
      stage.className = 'stage';
      document.body.classList.remove('stage-open');
    }
  }

  async function close(to) {
    if (!S || S.closing) return;
    S.closing = true;
    stage.classList.add('leave');
    await sleep(380);
    teardown(true);
    if (window.SO_APP) window.SO_APP.afterClose(to);
  }

  // ------------------------------------------------------------ entrées
  function act(e) {
    const sess = S;
    if (!sess || sess.dead) return;
    if (window.SO_APP && window.SO_APP.detailOpen()) return;
    if (sess.phase === 'pack') { autoTear(sess); return; }
    if (sess.phase !== 'cards' || sess.busy) return;
    const c = sess.cards[sess.idx];
    if (!sess.revealed) { reveal(sess); return; }
    if (c.qr && e && e.target && e.target.closest && e.target.closest('.oc.cur')) { openGame(sess); return; }
    next(sess);
  }
  stage.addEventListener('click', (e) => {
    if (e.target.closest('.st-top, .st-recap')) return;
    act(e);
  });
  elSkip.addEventListener('click', (e) => { e.stopPropagation(); skip(); });
  addEventListener('keydown', (e) => {
    if (!S || (window.SO_APP && window.SO_APP.detailOpen())) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
      if (S.phase === 'recap') return;
      e.preventDefault();
      act(null);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (S.phase === 'recap') close('boutique'); else skip();
    }
  });

  window.SO_OPEN = {
    start, close, skip,
    active: () => !!S,
    // pour les tests
    _state: () => S && { phase: S.phase, idx: S.idx, revealed: S.revealed, busy: S.busy, cards: S.cards.map((c) => (c.qr ? 'QR' : c.rarity + ':' + c.id)) },
    _act: () => act(null),
  };
})();
