// Jeux vidéo — bibliothèque Fire Shox (fireshox://jeux/)
//   fireshox://jeux/              → bibliothèque (vide pour l'instant : « Aucun jeu installé »)
//   fireshox://jeux/?game=<id>    → venu d'une carte QR : fiche du jeu s'il existe,
//                                   sinon annonce « Jeu en préparation » (ids prévus : squid, fire, lfi)
// Stockage : jeux.scans { id: { premier: date ISO, fois: n } }, jeux.lances { id: n }.
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const snd = (n) => { try { FX.sound(n); } catch {} };
  const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const cleanId = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);

  const GAMES = (window.JEUX || []).filter((g) => g && g.id).map((g) => ({
    id: cleanId(g.id),
    titre: String(g.titre || g.id),
    image: g.image || (typeof g.dessin === 'function' ? '' : `/assets/jeux/${cleanId(g.id)}/cover.jpg`),
    banniere: g.banniere || '',
    dessin: typeof g.dessin === 'function' ? g.dessin : null,
    source: g.source || '',
    infos: typeof g.infos === 'function' ? g.infos : null,
    lancement: g.lancement || `fireshox://jeux/${cleanId(g.id)}/`,
    description: g.description || '',
    genre: g.genre || '',
  }));
  const BY = new Map(GAMES.map((g) => [g.id, g]));
  const PLANNED = window.JEUX_PREVUS || {};
  const planned = (id) => {
    const p = PLANNED[id];
    if (!p) return null;
    const c = Array.isArray(p.couleurs) ? p.couleurs : [];
    return { id, nom: String(p.nom || id.toUpperCase()), c1: c[0] || '#ff7a00', c2: c[1] || '#ffd84a', motif: p.motif || 'flammes' };
  };

  // ------------------------------------------------------------------ stockage
  const getScans = () => FX.store.get('jeux.scans', {}) || {};
  function recordScan(id) {
    const s = getScans();
    const cur = s[id] || { premier: new Date().toISOString(), fois: 0 };
    cur.fois = (cur.fois || 0) + 1;
    s[id] = cur;
    FX.store.set('jeux.scans', s);
    return cur.fois;
  }

  // ------------------------------------------------------------------ en-tête
  function refreshCoins() {
    const n = Number(FX.store.get('opening.coins', 1000)) || 0;
    $('#coins-val').textContent = FX.fmt(n);
  }
  refreshCoins();
  FX.store.onChange((key) => { if (key === 'opening.coins') refreshCoins(); if (key === 'jeux.scans') renderSide(); });
  for (const b of $$('[data-toast]')) b.addEventListener('click', () => { snd('error'); FX.toast(b.dataset.toast); });

  // ------------------------------------------------------------------ images (jaquettes)
  function cover(g, cls = 'cover-img') {
    return `<div class="${cls}"><div class="cover-ph"><img src="/assets/logo-128.png" alt=""><b>${esc(g.titre)}</b></div>` +
      `<img data-src="${esc(g.image)}" alt="" hidden></div>`;
  }
  function hydrate(root) {
    for (const img of $$('img[data-src]', root)) {
      const src = img.dataset.src; img.removeAttribute('data-src');
      img.onload = () => { img.hidden = false; };
      img.onerror = () => img.remove();
      img.src = src;
    }
  }

  // ------------------------------------------------------------------ barre latérale
  const q = $('#q');
  function renderSide() {
    const f = fold(q.value.trim());
    const params = new URLSearchParams(location.search);
    const curId = cleanId(params.get('game'));
    const inst = GAMES.filter((g) => !f || fold(g.titre).includes(f));
    const scans = getScans();
    const waiting = Object.keys(scans).filter((id) => !BY.has(id) && planned(id)).map(planned).filter((p) => !f || fold(p.nom).includes(f));
    let html = `<div class="sec-title"><span>Installés</span><span>${inst.length}</span></div>`;
    html += inst.length
      ? inst.map((g) => `<a class="g-row${g.id === curId ? ' on' : ''}" href="?game=${encodeURIComponent(g.id)}" data-game="${esc(g.id)}"><span class="g-ico" style="background:linear-gradient(135deg, #ff4800, #ffc21a)">${esc(g.titre.slice(0, 2).toUpperCase())}<img src="${esc(g.image)}" alt="" onerror="this.remove()"></span><span class="g-name">${esc(g.titre)}</span></a>`).join('')
      : `<div class="side-empty">${f ? 'Aucun jeu ne correspond.' : 'Aucun jeu installé.<br>Les cartes QR de Shox Opening en débloqueront.'}</div>`;
    if (waiting.length) {
      html += `<div class="sec-title"><span>En préparation</span><span>${waiting.length}</span></div>`;
      html += waiting.map((p) => `<a class="g-row${p.id === curId ? ' on' : ''}" href="?game=${encodeURIComponent(p.id)}" data-game="${esc(p.id)}"><span class="g-ico" style="background:linear-gradient(135deg, ${p.c1}, ${p.c2})">${esc(p.nom.slice(0, 2))}</span><span class="g-name">${esc(p.nom)}</span><span class="g-tag">Bientôt</span></a>`).join('');
    }
    $('#side-list').innerHTML = html;
    $('#side-home').classList.toggle('on', !curId);
  }
  q.addEventListener('input', () => { renderSide(); if (!new URLSearchParams(location.search).get('game')) renderHome(); });
  q.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { q.value = ''; renderSide(); renderHome(); } });

  // navigation interne (sans rechargement, bouton « précédent » compris)
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[data-nav="home"], a[data-game]');
    if (!a || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return;
    ev.preventDefault();
    const url = a.dataset.game ? `?game=${encodeURIComponent(a.dataset.game)}` : location.pathname;
    if (url !== location.pathname + location.search) history.pushState(null, '', url);
    snd('click');
    route();
  });
  addEventListener('popstate', () => route());

  $('#add-game').addEventListener('click', () => {
    snd('click');
    if (new URLSearchParams(location.search).get('game')) { history.pushState(null, '', location.pathname); route(); }
    setTimeout(() => {
      const el = $('#how');
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.remove('flash'); void el.offsetWidth; }
    }, 60);
    FX.toast('Les jeux se débloquent avec les cartes QR de Shox Opening.');
  });

  // ------------------------------------------------------------------ vues
  const main = $('#main');

  function fakeQR(canvas, seed = 7) {
    const n = 25, ctx = canvas.getContext('2d');
    canvas.width = n; canvas.height = n;
    let x = seed;
    const rnd = () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; };
    ctx.fillStyle = '#fff7e6'; ctx.fillRect(0, 0, n, n);
    ctx.fillStyle = '#1a120a';
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (rnd() > 0.52) ctx.fillRect(i, j, 1, 1);
    const finder = (cx, cy) => {
      ctx.fillStyle = '#fff7e6'; ctx.fillRect(cx - 1, cy - 1, 9, 9);
      ctx.fillStyle = '#1a120a'; ctx.fillRect(cx, cy, 7, 7);
      ctx.fillStyle = '#fff7e6'; ctx.fillRect(cx + 1, cy + 1, 5, 5);
      ctx.fillStyle = '#1a120a'; ctx.fillRect(cx + 2, cy + 2, 3, 3);
    };
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
    // petit logo au centre
    ctx.fillStyle = '#fff7e6'; ctx.fillRect(9, 9, 7, 7);
    ctx.fillStyle = '#ff6a00'; ctx.fillRect(10, 10, 5, 5);
    ctx.fillStyle = '#ffd84a'; ctx.fillRect(11, 11, 3, 3);
  }

  function renderHome() {
    const f = fold(q.value.trim());
    const inst = GAMES.filter((g) => !f || fold(g.titre).includes(f));
    const scans = getScans();
    const plannedIds = Object.keys(PLANNED);
    let html = '<div class="view">';
    if (GAMES.length) {
      html += `<div class="lib-head"><h1>Tous les jeux <span>(${inst.length})</span></h1></div>` +
        (inst.length ? '<div class="covers">' + inst.map((g) =>
          `<a class="cover" href="?game=${encodeURIComponent(g.id)}" data-game="${esc(g.id)}">${cover(g)}<span class="cover-name">${esc(g.titre)}</span><span class="cover-sub">${esc(g.genre || 'Jeu Fire Shox')}</span></a>`).join('') + '</div>'
          : '<div class="block"><div class="side-empty">Aucun jeu ne correspond à ta recherche.</div></div>');
    } else {
      html +=
        '<section class="empty-hero">' +
          '<div>' +
            '<span class="eh-kicker">🎮 Ta bibliothèque</span>' +
            '<h1>Aucun jeu installé</h1>' +
            '<p>Ta bibliothèque est vide… pour l\'instant. Ici, les jeux ne s\'achètent pas : <b>ils se débloquent</b>.</p>' +
            '<p>Certaines cartes de <b>Shox Opening</b> portent un <b>code QR</b>. Scanne-le avec ton téléphone (ou clique dessus) et le jeu qu\'il cache arrivera directement ici, prêt à lancer.</p>' +
            '<div class="eh-actions"><button type="button" class="fs-btn fire" id="go-opening">🃏 Ouvrir Shox Opening</button><button type="button" class="fs-btn" id="go-how">Comment ça marche ?</button></div>' +
          '</div>' +
          '<div class="qr-wrap"><div class="qr-card"><div class="qc-head"><span>Carte QR</span><img src="/assets/logo-64.png" alt=""></div><div class="qc-code"><canvas id="qr"></canvas><div class="qc-scan"></div></div><div class="qc-foot"><b>Jeu mystère</b><span>Scanne-moi</span></div></div></div>' +
        '</section>' +
        '<section class="block" id="how"><div class="block-h"><h2>Comment débloquer un jeu</h2><span>3 étapes, zéro ressort cassé</span></div><div class="steps">' +
          '<div class="step"><span class="step-n">1</span><div class="step-ico">🃏</div><h3>Ouvre des packs</h3><p>Dans Shox Opening, chaque pack contient des cartes. Certaines, plus rares, cachent un jeu.</p></div>' +
          '<div class="step"><span class="step-n">2</span><div class="step-ico">📱</div><h3>Trouve une carte QR</h3><p>Une carte avec un code QR ? Scanne-la avec ton téléphone ou clique dessus.</p></div>' +
          '<div class="step"><span class="step-n">3</span><div class="step-ico">🚀</div><h3>Joue ici</h3><p>Le jeu apparaît dans cette bibliothèque. S\'il est encore en préparation, tu seras dans la file d\'attente.</p></div>' +
        '</div></section>';
    }
    // étagère : emplacements (débloqués en préparation + verrouillés)
    const slots = plannedIds.filter((id) => !BY.has(id));
    if (slots.length && !f) {
      html += `<section class="block"><div class="block-h"><h2>Emplacements</h2><span>${slots.filter((id) => scans[id]).length} débloqué(s) sur ${slots.length}</span></div><div class="shelf">` +
        slots.map((id) => {
          const p = planned(id);
          if (scans[id]) return `<a class="slot pending" href="?game=${encodeURIComponent(id)}" data-game="${esc(id)}" style="--c1:${p.c1};--c2:${p.c2}"><span class="badge">En préparation</span><span class="code">${esc(p.nom)}</span><span>Débloqué grâce à ta carte QR</span></a>`;
          return '<div class="slot"><span class="lock"><svg viewBox="0 0 24 24" width="20" height="20"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></span><b>Emplacement verrouillé</b><span>Carte QR requise</span></div>';
        }).join('') + '</div></section>';
    }
    html += '</div>';
    main.innerHTML = html;
    hydrate(main);
    const qr = $('#qr'); if (qr) fakeQR(qr, 11);
    const go = $('#go-opening'); if (go) go.addEventListener('click', () => { snd('pop'); FX.open('fireshox://opening/'); });
    const how = $('#go-how'); if (how) how.addEventListener('click', () => { snd('click'); $('#how').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    document.title = 'Jeux vidéo';
  }

  function infosHtml(g) {
    if (!g.infos) return '';
    try { return (g.infos() || []).map(([k, v]) => `<div class="d-stat">${esc(k)}<b>${esc(v)}</b></div>`).join(''); } catch { return ''; }
  }

  // Jaquettes dessinées en direct (canvas) pour les jeux qui n'ont pas encore d'image (ex. Shox Runner).
  function drawArt() {
    const one = (g, w, h, kind) => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      return Promise.resolve(g.dessin(cv, kind)).then(() => cv.toDataURL('image/jpeg', 0.9));
    };
    return Promise.all(GAMES.filter((g) => g.dessin).map(async (g) => {
      try {
        if (!g.image) g.image = await one(g, 600, 900, 'cover');
        if (!g.banniere) g.banniere = await one(g, 1920, 620, 'banner');
      } catch {}
    }));
  }

  function renderGame(g, fromQR) {
    const n = (FX.store.get('jeux.lances', {}) || {})[g.id] || 0;
    main.innerHTML = '<div class="view">' +
      `<section class="detail-hero">${g.banniere ? `<div class="bg" style="background-image:url('${esc(g.banniere)}')"></div>` : `<div class="bg blur" style="background-image:url('${esc(g.image)}')"></div>`}<div class="d-cover">${cover(g)}</div><h1>${esc(g.titre)}</h1></section>` +
      `<div class="detail-bar"><button type="button" class="fs-btn fire play-btn" id="play"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>Jouer</button>` +
      `${g.infos ? infosHtml(g) : `<div class="d-stat">Parties lancées<b>${FX.fmt(n)}</b></div>`}${g.genre ? `<div class="d-stat">Genre<b>${esc(g.genre)}</b></div>` : ''}<div class="d-stat">Source<b>${esc(g.source || 'Carte QR Shox Opening')}</b></div></div>` +
      (fromQR ? '<div class="qr-ok">✅ <span>Carte QR reconnue : <b>' + esc(g.titre) + '</b> est dans ta bibliothèque.</span></div>' : '') +
      `<div class="detail-body">${g.description ? esc(g.description) : 'Aucune description pour l\'instant.'}</div>` +
      '</div>';
    hydrate(main);
    $('#play').addEventListener('click', () => launch(g));
    document.title = `${g.titre} — Jeux vidéo`;
    if (fromQR) setTimeout(() => { const r = $('#play').getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 70 }); snd('success'); }, 350);
  }

  function launch(g) {
    const l = FX.store.get('jeux.lances', {}) || {};
    l[g.id] = (l[g.id] || 0) + 1;
    FX.store.set('jeux.lances', l);
    $('#launch-title').textContent = `Lancement de ${g.titre}…`;
    $('#launch').hidden = false;
    snd('whoosh');
    setTimeout(() => { location.href = g.lancement; }, 1350);
  }

  function decoFor(p) {
    const R = (a, b) => a + Math.random() * (b - a);
    let out = '';
    if (p.motif === 'formes') {
      const shapes = [
        (c) => `<svg viewBox="0 0 100 100" style="color:${c}"><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="9"/></svg>`,
        (c) => `<svg viewBox="0 0 100 100" style="color:${c}"><polygon points="50,10 92,86 8,86" fill="none" stroke="currentColor" stroke-width="9" stroke-linejoin="round"/></svg>`,
        (c) => `<svg viewBox="0 0 100 100" style="color:${c}"><rect x="12" y="12" width="76" height="76" rx="4" fill="none" stroke="currentColor" stroke-width="9"/></svg>`,
      ];
      for (let i = 0; i < 14; i++) {
        const s = R(34, 90);
        out += `<i style="left:${R(-2, 96)}%;top:${R(-4, 96)}%;width:${s}px;height:${s}px;--d:${R(8, 16)}s;--dx:${R(-60, 60)}px;--dy:${R(-60, 60)}px;--dr:${R(-90, 90)}deg;opacity:${R(0.18, 0.5)}">${shapes[i % 3](i % 2 ? p.c1 : p.c2)}</i>`;
      }
    } else if (p.motif === 'pancartes') {
      const words = ['ON VEUT JOUER', 'SHOX POUR TOUS', 'RESSORTS !', 'AMORTI GRATUIT', 'PLUS DE REBONDS', 'LE JEU, VITE !'];
      for (let i = 0; i < 10; i++) {
        out += `<i class="sign" style="left:${R(0, 90)}%;top:${R(4, 82)}%;--d:${R(2.5, 4.5)}s;--dx:0px;--dy:${R(-14, -6)}px;--dr:${R(-6, 6)}deg;rotate:${R(-12, 12)}deg">${words[i % words.length]}</i>`;
      }
    } else {
      for (let i = 0; i < 36; i++) {
        const s = R(4, 12);
        out += `<i class="ember" style="left:${R(0, 100)}%;top:${R(70, 110)}%;width:${s}px;height:${s}px;--d:${R(5, 11)}s;animation-delay:-${R(0, 10)}s"></i>`;
      }
    }
    return `<div class="deco">${out}</div>`;
  }

  function renderPromo(id, rawId, scanned) {
    const p = planned(id);
    const count = p ? (scanned ? recordScan(id) : (getScans()[id] || {}).fois || 1) : 0;
    renderSide();
    if (!p) {
      main.innerHTML = `<div class="view promo" style="--c1:#ff7a00;--c2:#ffb020">` +
        '<div class="promo-card">' +
          '<span class="qr-badge unknown"><span class="ok">?</span>Carte QR inconnue</span>' +
          '<div class="codename">Code lu</div>' +
          `<div class="big-name" data-t="${esc((rawId || '???').toUpperCase())}" style="font-size:72px">${esc((rawId || '???').toUpperCase())}</div>` +
          '<p class="promo-txt">Ce code ne correspond à aucun jeu connu de la bibliothèque. La carte a peut-être trop rebondi, ou le jeu n\'a pas encore été annoncé.</p>' +
          '<div class="promo-actions"><a class="fs-btn fire" href="./" data-nav="home">Retour à la bibliothèque</a></div>' +
        '</div></div>';
      document.title = 'Carte QR inconnue — Jeux vidéo';
      snd('error');
      return;
    }
    main.innerHTML = `<div class="view promo" style="--c1:${p.c1};--c2:${p.c2}">${decoFor(p)}` +
      '<div class="promo-card">' +
        `<span class="qr-badge"><span class="ok">✓</span>Carte QR reconnue${count > 1 ? ` · scannée ${count} fois` : ''}</span>` +
        '<div class="codename">Nom de code</div>' +
        `<div class="big-name" data-t="${esc(p.nom)}">${esc(p.nom)}</div><br>` +
        '<span class="wip"><span class="pulse"></span>Jeu en préparation</span>' +
        '<p class="promo-txt">Bonne nouvelle : ta carte a bien débloqué ce jeu. Moins bonne nouvelle : les développeurs Shox sont encore en train de serrer les ressorts. Il apparaîtra tout seul dans ta bibliothèque dès qu\'il sera prêt.</p>' +
        '<div class="progress"><div class="progress-top"><span><b>Développement</b> · avancement</span><span>Top secret</span></div><div class="bar-track"><div class="bar-fill"></div></div></div>' +
        '<ul class="checklist">' +
          '<li class="done"><span class="st">✓</span>Carte QR scannée</li>' +
          '<li class="done"><span class="st">✓</span>Jeu réservé dans ta bibliothèque</li>' +
          '<li class="doing"><span class="st"></span>Développement en cours…</li>' +
          '<li class="todo"><span class="st"></span>Installation automatique</li>' +
        '</ul>' +
        '<div class="promo-actions"><a class="fs-btn fire" href="./" data-nav="home">Voir ma bibliothèque</a><button type="button" class="fs-btn" id="notify">🔔 Me prévenir</button></div>' +
        `<div class="promo-foot">Code de la carte : <code>${esc(id)}</code></div>` +
      '</div></div>';
    $('#notify').addEventListener('click', (ev) => {
      snd('ding');
      FX.toast('C\'est noté ! Tu seras prévenu… par un rebond.');
      const r = ev.currentTarget.getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 40, spread: 6, colors: [p.c1, p.c2, '#fff2c0'] });
    });
    document.title = `${p.nom} — en préparation`;
    if (count === 1) setTimeout(() => { snd('rare'); FX.burst(innerWidth / 2 + 130, 240, { count: 80, colors: [p.c1, p.c2, '#ffffff', '#fff2c0'] }); }, 450);
    else snd('pop');
  }

  // scanned = true seulement à l'arrivée sur la page (vraie lecture de carte QR),
  // pas quand on navigue dans la bibliothèque.
  function route(scanned = false) {
    const params = new URLSearchParams(location.search);
    const raw = params.get('game');
    const id = cleanId(raw);
    main.scrollTop = 0;
    $('#launch').hidden = true;
    if (raw !== null && id) {
      if (BY.has(id)) {
        // Jeu préinstallé (champ « source ») : ce n'est pas une lecture de carte QR.
        const g = BY.get(id), qr = scanned && !g.source, first = !getScans()[id];
        if (qr) recordScan(id);
        renderGame(g, qr && first);
      }
      else renderPromo(PLANNED[id] ? id : '', id, scanned);
    } else renderHome();
    renderSide();
  }

  // Les jaquettes dessinées sont prêtes en quelques millisecondes ; on ne les attend jamais plus d'une seconde.
  Promise.race([drawArt(), FX.sleep(1000)]).then(() => route(true));
  // Retour sur la page via le bouton « précédent » après un lancement : cacher l'écran de lancement.
  addEventListener('pageshow', () => { $('#launch').hidden = true; });

  // petit accès pour les tests (ajoute un faux jeu le temps de la session)
  window.JeuxShox = { route, games: GAMES, ajouterPourTest(g) { const x = { id: cleanId(g.id), titre: g.titre || g.id, image: g.image || '', banniere: g.banniere || '', lancement: g.lancement || '#', description: g.description || '', genre: g.genre || '' }; GAMES.push(x); BY.set(x.id, x); route(); } };
})();
