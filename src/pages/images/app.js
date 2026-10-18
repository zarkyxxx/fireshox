// Galerie nationale de Monsieur Claude (fireshox://images/)
// Mosaïque (s'adapte au format réel des images), cartels, visionneuse plein écran
// (← → Échap, zoom molette / double-clic / + −, glisser, diaporama « visite guidée »).
// Stockage : images.favoris [numéros], images.visites (compteur de visites).
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const snd = (n) => { try { FX.sound(n); } catch {} };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad = (n) => String(n).padStart(2, '0');

  // Formats provisoires des cases vides (avant l'arrivée des vraies images) : largeur / hauteur
  const PLACEHOLDER_RATIOS = [4 / 3, 4 / 5, 1, 3 / 4, 4 / 3, 4 / 5, 1, 16 / 9, 4 / 5, 1, 3 / 4, 4 / 3];

  const WORKS = (window.CLAUDE_OEUVRES || []).map((w, i) => ({
    i,
    no: pad(i + 1),
    src: String(w.fichier || `/assets/photos/claude/${pad(i + 1)}.jpg`),
    titre: String(w.titre || '').trim(),
    desc: String(w.description || '').trim(),
    date: String(w.date || '').trim(),
    grand: !!w.grand,
    ratio: PLACEHOLDER_RATIOS[i % PLACEHOLDER_RATIOS.length] * (w.grand ? 1.15 : 1),
    img: null,      // Image chargée (ou null)
    ok: false,
  }));
  const N = WORKS.length;
  // Aperçu de test (fireshox://images/?test-images) : quelques cases reçoivent le logo, pour vérifier le rendu avec de vraies images.
  if (/[?&]test-images\b/.test(location.search)) WORKS.forEach((w, i) => { if (i % 3 === 1) w.src = i % 2 ? '/assets/logo-512.png' : '/assets/logo.png'; });
  const shownPath = (p) => p.replace(/^\//, '');
  const titleOf = (w) => w.titre || 'Sans titre';

  // ------------------------------------------------------------------ stockage
  let favs = new Set((FX.store.get('images.favoris', []) || []).filter((n) => Number.isInteger(n)));
  const saveFavs = () => FX.store.set('images.favoris', [...favs].sort((a, b) => a - b));
  const visits = (Number(FX.store.get('images.visites', 0)) || 0) + 1;
  FX.store.set('images.visites', visits);

  // ------------------------------------------------------------------ chargement des images
  function alternates(src) {
    const m = src.match(/^(.*)\.(jpe?g|png|webp)$/i);
    if (!m) return [src];
    const ext = m[2].toLowerCase();
    return [src, ...['jpg', 'png', 'webp', 'jpeg'].filter((x) => x !== ext).map((x) => `${m[1]}.${x}`)];
  }
  function load(w) {
    return new Promise((resolve) => {
      const tries = alternates(w.src);
      let k = 0;
      const img = new Image();
      img.decoding = 'async';
      img.alt = titleOf(w);
      img.onload = () => {
        w.img = img; w.ok = true;
        if (img.naturalWidth && img.naturalHeight) w.ratio = img.naturalWidth / img.naturalHeight;
        resolve(true);
      };
      img.onerror = () => { k += 1; if (k < tries.length) img.src = tries[k]; else resolve(false); };
      img.src = tries[0];
    });
  }

  function placeholder(w) {
    return `<div class="ph"><div class="ph-no">N° ${w.no}</div><div class="ph-txt">Œuvre en cours d'acquisition</div><code>${esc(shownPath(w.src))}</code></div>`;
  }
  function cartelHtml(w, cls = 'cartel') {
    const meta = ['Collection Monsieur Claude', w.date].filter(Boolean).join(' · ');
    return `<figcaption class="${cls}"><div class="no"><span>N° ${w.no}</span><span class="heart">♥</span></div>` +
      `<h3>${esc(titleOf(w))}</h3><div class="meta">${esc(meta)}</div>` +
      (w.desc ? `<p class="desc">${w.desc}</p>` : '<p class="desc todo">Notice en cours de rédaction par le conservateur.</p>') +
      '</figcaption>';
  }

  // ------------------------------------------------------------------ mosaïque
  const grid = $('#grid');
  grid.innerHTML = WORKS.map((w) =>
    `<figure class="work${w.grand ? ' wide' : ''}${favs.has(w.i + 1) ? ' fav' : ''}" data-i="${w.i}" style="animation-delay:${80 + w.i * 55}ms">` +
      '<div class="work-in">' +
        `<button class="frame" type="button" aria-label="Voir l'œuvre n° ${w.no}"><div class="mat"><div class="canvas" style="aspect-ratio:${w.ratio}">${placeholder(w)}</div></div></button>` +
        cartelHtml(w) +
      '</div>' +
    '</figure>').join('');

  // Mosaïque : chaque œuvre va dans la colonne la moins haute (ordre de lecture conservé).
  const ROW = 4; // grid-auto-rows (px)
  const GAP_BELOW = 40;
  function layoutAll() {
    const figs = $$('.work', grid).filter((f) => !f.classList.contains('hide'));
    const cols = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length);
    // 1) largeur (une ou deux colonnes) puis mesure de la hauteur réelle
    for (const f of figs) {
      const c = f.classList.contains('wide') && cols >= 3 ? 2 : 1;
      f.dataset.cols = c;
      f.style.gridColumn = `span ${c}`;
    }
    const hs = figs.map((f) => Math.ceil((f.firstElementChild.getBoundingClientRect().height + GAP_BELOW) / ROW));
    // 2) placement
    const heights = new Array(cols).fill(0);
    figs.forEach((f, k) => {
      const c = Number(f.dataset.cols);
      let best = 0, top = Infinity;
      for (let j = 0; j <= cols - c; j++) {
        const t = Math.max(...heights.slice(j, j + c));
        if (t < top - 2) { top = t; best = j; }
      }
      f.style.gridColumn = `${best + 1} / span ${c}`;
      f.style.gridRow = `${top + 1} / span ${hs[k]}`;
      for (let j = best; j < best + c; j++) heights[j] = top + hs[k];
    });
  }
  let layoutRaf = 0;
  const relayout = () => { cancelAnimationFrame(layoutRaf); layoutRaf = requestAnimationFrame(layoutAll); };
  const ro = new ResizeObserver(relayout);
  for (const f of $$('.work', grid)) ro.observe(f.firstElementChild);
  addEventListener('resize', relayout);
  layoutAll();

  let shown = 0;
  WORKS.forEach((w) => {
    load(w).then((ok) => {
      if (!ok) return;
      shown += 1;
      updateStats();
      const c = grid.querySelector(`.work[data-i="${w.i}"] .canvas`);
      c.style.aspectRatio = String(w.ratio);
      const img = w.img.cloneNode();
      c.appendChild(img);
      requestAnimationFrame(() => c.classList.add('loaded'));
      if (!viewer.hidden && cur === w.i) show(cur, 0);
      paintThumb(w);
    });
  });

  function updateStats() {
    $('#st-total').textContent = N;
    $('#st-shown').textContent = shown;
    $('#st-wait').textContent = N - shown;
    $('#st-visit').textContent = String(visits).padStart(6, '0');
    $('#fav-count').textContent = favs.size;
  }
  updateStats();

  grid.addEventListener('click', (ev) => {
    const f = ev.target.closest('.work');
    if (!f || !ev.target.closest('.frame')) return;
    open(Number(f.dataset.i), f.querySelector('.canvas'));
  });

  // filtre « coups de cœur »
  let filter = 'all';
  for (const b of $$('.seg button')) {
    b.addEventListener('click', () => {
      filter = b.dataset.filter;
      $$('.seg button').forEach((x) => x.classList.toggle('on', x === b));
      applyFilter();
      snd('click');
    });
  }
  function applyFilter() {
    let visible = 0;
    for (const f of $$('.work', grid)) {
      const hide = filter === 'fav' && !favs.has(Number(f.dataset.i) + 1);
      f.classList.toggle('hide', hide);
      if (!hide) visible += 1;
    }
    $('#fav-empty').hidden = !(filter === 'fav' && visible === 0);
    layoutAll();
  }
  function visibleOrder() {
    if (filter !== 'fav') return WORKS.map((w) => w.i);
    const l = WORKS.filter((w) => favs.has(w.i + 1)).map((w) => w.i);
    return l.length ? l : WORKS.map((w) => w.i);
  }

  // ------------------------------------------------------------------ visionneuse
  const viewer = $('#viewer');
  const stage = $('#v-stage');
  const art = $('#v-art');
  let cur = 0;
  let order = WORKS.map((w) => w.i);
  let s = 1, tx = 0, ty = 0;   // zoom et déplacement
  let baseW = 0, baseH = 0;    // taille « ajustée à l'écran »
  let playing = false, playTimer = 0;
  const SLIDE_MS = 5000;

  $('#v-tot').textContent = pad(N);
  $('#v-thumbs').innerHTML = WORKS.map((w) => `<button type="button" class="thumb${favs.has(w.i + 1) ? ' fav' : ''}" data-i="${w.i}" title="N° ${w.no} — ${esc(titleOf(w))}"><span>${w.no}</span><i class="tf">♥</i></button>`).join('');
  function paintThumb(w) {
    const t = $(`.thumb[data-i="${w.i}"]`);
    if (!t || !w.ok || t.querySelector('img')) return;
    const im = w.img.cloneNode(); t.prepend(im); t.classList.add('has-img');
  }

  const HINT = 'Molette ou double-clic pour zoomer · glisser pour se déplacer';
  function hint(text, ms = 3200) {
    const h = $('#v-hint');
    h.textContent = text;
    h.classList.remove('gone');
    clearTimeout(hint.t); hint.t = setTimeout(() => h.classList.add('gone'), ms);
  }
  function open(i, fromEl) {
    order = visibleOrder();
    viewer.hidden = false;
    viewer.classList.remove('closing');
    document.body.classList.add('lock');
    snd('whoosh');
    show(i, 0, fromEl);
    hint(HINT);
  }
  function close() {
    if (viewer.hidden) return;
    stopPlay();
    viewer.classList.add('closing');
    snd('click');
    setTimeout(() => { viewer.hidden = true; viewer.classList.remove('closing'); document.body.classList.remove('lock'); }, 230);
  }

  function fit(w) {
    const r = stage.getBoundingClientRect();
    const maxW = Math.max(200, r.width - 180);
    const maxH = Math.max(200, r.height - 76);
    // le cadre ajoute ~60 px autour de l'image (cadre + passe-partout) quand l'œuvre est vide
    const extra = w.ok ? 0 : 60;
    let wpx = maxW, hpx = (maxW - extra) / w.ratio + extra;
    if (hpx > maxH) { hpx = maxH; wpx = (maxH - extra) * w.ratio + extra; }
    baseW = Math.round(wpx); baseH = Math.round(hpx);
  }

  function show(i, dir, fromEl) {
    cur = i;
    const w = WORKS[i];
    s = 1; tx = 0; ty = 0;
    fit(w);
    art.className = 'v-art' + (w.ok ? ' raw' : '');
    art.style.width = baseW + 'px';
    art.style.height = baseH + 'px';
    art.innerHTML = `<div class="vframe"><div class="vmat"><div class="canvas${w.ok ? ' loaded' : ''}">${w.ok ? '' : placeholder(w)}</div></div></div>`;
    if (w.ok) art.querySelector('.canvas').appendChild(w.img.cloneNode());
    if (dir) { art.classList.add(dir > 0 ? 'slide-in-r' : 'slide-in-l'); }
    else if (fromEl) {
      // ouverture : l'œuvre « sort » de son cadre (FLIP)
      art.style.transition = 'none';
      art.style.transform = 'none';
      const a = fromEl.getBoundingClientRect();
      const b = art.getBoundingClientRect();
      const sc = Math.min(a.width / b.width, a.height / b.height);
      art.style.transition = 'none';
      art.style.transform = `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${sc})`;
      requestAnimationFrame(() => requestAnimationFrame(() => { art.style.transition = 'transform .45s cubic-bezier(.2,.8,.2,1)'; apply(); setTimeout(() => { art.style.transition = ''; }, 470); }));
    }
    if (!fromEl) apply();
    $('#v-num').textContent = w.no;
    $('#v-title').textContent = titleOf(w);
    const cartel = $('#v-cartel');
    cartel.innerHTML = cartelHtml(w, 'vc').replace(/^<figcaption class="vc">|<\/figcaption>$/g, '');
    cartel.style.animation = 'none'; void cartel.offsetWidth; cartel.style.animation = '';
    $('#v-fav').classList.toggle('on', favs.has(i + 1));
    for (const t of $$('.thumb')) {
      const on = Number(t.dataset.i) === i;
      t.classList.toggle('on', on);
      t.classList.toggle('hide', !order.includes(Number(t.dataset.i)));
      if (on) t.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    $('#v-prev').disabled = order.length < 2;
    $('#v-next').disabled = order.length < 2;
    if (playing) restartProgress();
  }

  function step(d) {
    const k = order.indexOf(cur);
    const n = order[(k + d + order.length) % order.length];
    if (n === cur) return;
    snd('flip');
    show(n, d);
  }

  // zoom / déplacement
  function apply() {
    art.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    $('#v-zval').textContent = Math.round(s * 100) + ' %';
    stage.classList.toggle('zoomed', s > 1.001);
    $('#v-zout').disabled = s <= 1.001;
    $('#v-zin').disabled = s >= 5.99;
  }
  function clampPan() {
    const r = stage.getBoundingClientRect();
    const mx = Math.max(0, (baseW * s - r.width) / 2 + 40);
    const my = Math.max(0, (baseH * s - r.height) / 2 + 40);
    tx = clamp(tx, -mx, mx); ty = clamp(ty, -my, my);
    if (s <= 1.001) { tx = 0; ty = 0; }
  }
  function zoomAt(f, cx = 0, cy = 0, animate = false) {
    const s2 = clamp(s * f, 1, 6);
    if (Math.abs(s2 - s) < 1e-4) return;
    const k = s2 / s;
    tx = cx - (cx - tx) * k; ty = cy - (cy - ty) * k; s = s2;
    clampPan();
    art.classList.toggle('anim', animate);
    apply();
    if (animate) setTimeout(() => art.classList.remove('anim'), 300);
    $('#v-hint').classList.add('gone');
  }
  const centerOf = (ev) => { const r = stage.getBoundingClientRect(); return [ev.clientX - (r.left + r.width / 2), ev.clientY - (r.top + r.height / 2)]; };

  stage.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const [cx, cy] = centerOf(ev);
    zoomAt(Math.exp(-ev.deltaY * 0.0018), cx, cy);
  }, { passive: false });
  stage.addEventListener('dblclick', (ev) => {
    if (ev.target.closest('.v-nav')) return;
    const [cx, cy] = centerOf(ev);
    if (s > 1.001) { s = 1; tx = 0; ty = 0; art.classList.add('anim'); apply(); setTimeout(() => art.classList.remove('anim'), 300); }
    else zoomAt(2.5, cx, cy, true);
    snd('tick');
  });
  let drag = null;
  stage.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 || s <= 1.001 || ev.target.closest('.v-nav')) return;
    drag = { x: ev.clientX, y: ev.clientY, tx, ty };
    stage.setPointerCapture(ev.pointerId);
    stage.classList.add('dragging');
  });
  stage.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    tx = drag.tx + (ev.clientX - drag.x); ty = drag.ty + (ev.clientY - drag.y);
    clampPan(); apply();
  });
  const endDrag = () => { drag = null; stage.classList.remove('dragging'); };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  // clic dans le vide (hors œuvre, hors boutons) = fermer
  stage.addEventListener('click', (ev) => {
    if (ev.target === stage && s <= 1.001) close();
  });

  $('#v-zin').addEventListener('click', () => { zoomAt(1.5, 0, 0, true); snd('tick'); });
  $('#v-zout').addEventListener('click', () => { zoomAt(1 / 1.5, 0, 0, true); snd('tick'); });
  $('#v-zval').addEventListener('click', () => { s = 1; tx = 0; ty = 0; art.classList.add('anim'); apply(); setTimeout(() => art.classList.remove('anim'), 300); snd('tick'); });
  $('#v-prev').addEventListener('click', () => step(-1));
  $('#v-next').addEventListener('click', () => step(1));
  $('#v-close').addEventListener('click', close);
  $('#v-thumbs').addEventListener('click', (ev) => {
    const t = ev.target.closest('.thumb'); if (!t) return;
    const i = Number(t.dataset.i);
    if (i === cur) return;
    if (!order.includes(i)) order = WORKS.map((w) => w.i);
    snd('flip');
    show(i, i > cur ? 1 : -1);
  });

  // coups de cœur
  function toggleFav() {
    const n = cur + 1;
    const on = !favs.has(n);
    if (on) favs.add(n); else favs.delete(n);
    saveFavs();
    const b = $('#v-fav');
    b.classList.toggle('on', on);
    b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
    grid.querySelector(`.work[data-i="${cur}"]`).classList.toggle('fav', on);
    $(`.thumb[data-i="${cur}"]`).classList.toggle('fav', on);
    updateStats();
    if (on) {
      snd('ding');
      const r = b.getBoundingClientRect();
      try { FX.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 34, spread: 5, size: 2.6, colors: ['#ff5a4a', '#ff8a6a', '#ffd84a', '#fff2c0'] }); } catch {}
      hint('♥ Ajoutée à tes coups de cœur', 1800);
    } else { snd('click'); hint('Retirée de tes coups de cœur', 1500); }
    if (filter === 'fav') applyFilter();
  }
  $('#v-fav').addEventListener('click', toggleFav);

  // diaporama (« visite guidée »)
  function restartProgress() {
    const bar = $('#v-progress i');
    viewer.style.setProperty('--slide', SLIDE_MS + 'ms');
    bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    clearTimeout(playTimer);
    playTimer = setTimeout(() => step(1), SLIDE_MS);
  }
  function startPlay() { playing = true; viewer.classList.add('playing'); restartProgress(); }
  function stopPlay() { playing = false; viewer.classList.remove('playing'); clearTimeout(playTimer); }
  $('#v-play').addEventListener('click', () => { if (playing) stopPlay(); else startPlay(); snd('click'); });
  $('#tour').addEventListener('click', () => {
    const first = visibleOrder()[0] ?? 0;
    open(first, grid.querySelector(`.work[data-i="${first}"] .canvas`));
    startPlay();
    hint('Visite guidée : une œuvre toutes les 5 secondes · Espace pour mettre en pause', 4200);
  });

  // clavier
  document.addEventListener('keydown', (ev) => {
    if (viewer.hidden) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    switch (ev.key) {
      case 'Escape': ev.preventDefault(); close(); break;
      case 'ArrowRight': ev.preventDefault(); step(1); break;
      case 'ArrowLeft': ev.preventDefault(); step(-1); break;
      case '+': case '=': ev.preventDefault(); zoomAt(1.5, 0, 0, true); break;
      case '-': case '_': ev.preventDefault(); zoomAt(1 / 1.5, 0, 0, true); break;
      case '0': ev.preventDefault(); s = 1; tx = 0; ty = 0; apply(); break;
      case ' ': ev.preventDefault(); if (playing) stopPlay(); else startPlay(); break;
      case 'c': case 'C': toggleFav(); break;
      case 'Home': ev.preventDefault(); show(order[0], -1); break;
      case 'End': ev.preventDefault(); show(order[order.length - 1], 1); break;
    }
  });

  addEventListener('resize', () => {
    if (viewer.hidden) return;
    fit(WORKS[cur]);
    art.style.width = baseW + 'px'; art.style.height = baseH + 'px';
    clampPan(); apply();
  });

  // accès pour les tests
  window.GalerieClaude = { works: WORKS, open: (i) => open(i, null), close, step };
})();
