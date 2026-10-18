// Shox Opening — rendu HTML des cartes (face, dos, carte QR), des paquets et des miniatures.
// Toutes les tailles internes sont en unités cqw : une carte s'adapte à n'importe quelle largeur.
(function () {
  'use strict';
  const D = window.SO_DATA;

  // ------------------------------------------------------------ images (présentes ou non ?)
  const known = new Map();
  function probe(url) {
    if (known.has(url)) { const v = known.get(url); return v instanceof Promise ? v : Promise.resolve(v); }
    const p = new Promise((res) => {
      const im = new Image();
      im.onload = () => { known.set(url, true); res(true); };
      im.onerror = () => { known.set(url, false); res(false); };
      im.src = url;
    });
    known.set(url, p);
    return p;
  }
  function state(url) { const v = known.get(url); return v instanceof Promise ? undefined : v; }
  function probeAll() {
    const list = [];
    for (const b of D.boosters) { list.push(b.pack); for (const c of b.cards) list.push(c.img); }
    return Promise.race([Promise.all(list.map(probe)), new Promise((r) => setTimeout(r, 1500))]);
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const vars = (b) => `--a:${b.colors.a};--b:${b.colors.b};--c:${b.colors.c};--dark:${b.colors.dark};--ink:${b.colors.ink}`;
  const two = (n) => String(n).padStart(2, '0');

  function imgTag(url, cls) {
    const st = state(url);
    if (st === false) return '';
    return `<img class="${cls}" src="${url}" alt="" draggable="false" data-probe="${st === true ? 1 : 0}">`;
  }
  function wireImgs(root) {
    root.querySelectorAll('img[data-probe="0"]').forEach((im) => {
      im.addEventListener('error', () => { known.set(im.getAttribute('src'), false); im.remove(); }, { once: true });
      im.addEventListener('load', () => { known.set(im.getAttribute('src'), true); }, { once: true });
    });
    return root;
  }

  // ------------------------------------------------------------ dessins de remplacement
  const SVG_MASK = {
    circle: '<circle cx="50" cy="60" r="13" fill="none" stroke="#fff" stroke-width="5"/>',
    triangle: '<path d="M50 44 L66 71 L34 71 Z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>',
    square: '<rect x="37" y="47" width="26" height="26" fill="none" stroke="#fff" stroke-width="5"/>',
  };
  function maskSvg(kind) {
    // dégradés g-hood / g-mask : définis une seule fois dans index.html
    return `<svg class="ph-mask" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 4 C82 4 98 34 96 66 C94 98 76 118 50 118 C24 118 6 98 4 66 C2 34 18 4 50 4 Z" fill="url(#g-hood)"/>
      <ellipse cx="50" cy="63" rx="33" ry="42" fill="url(#g-mask)"/>
      <ellipse cx="40" cy="38" rx="12" ry="6" fill="#fff" opacity=".12" transform="rotate(-25 40 38)"/>
      ${SVG_MASK[kind]}</svg>`;
  }

  function mainArt(b, c) {
    const a = c.art || {};
    if (a.logo) return `<div class="ph-logo"><div class="ph-logo-glow"></div><img src="/assets/logo-512.png" alt="" draggable="false"></div>`;
    if (a.mask) return maskSvg(a.mask);
    if (a.shoe) return `<svg class="ph-shoe" viewBox="0 0 64 40" style="color:${a.shoe}"><use href="#i-shox"/></svg>`;
    if (a.banner) {
      const words = a.banner.split(' ');
      const half = Math.ceil(words.length / 2);
      return `<div class="ph-banner"><i></i><i></i><span>${esc(words.slice(0, half).join(' '))}<br>${esc(words.slice(half).join(' '))}</span></div>`;
    }
    return `<div class="ph-emoji">${a.emoji || '👟'}</div>`;
  }

  function placeholder(b, c) {
    const a = c.art || {};
    const mark = a.mark || '';
    const markCls = mark.length > 6 ? 'ph-mark long' : mark.length > 3 ? 'ph-mark mid' : 'ph-mark';
    return `<div class="ph ph-${b.id}">
      <div class="ph-bg"></div>
      <div class="${markCls}">${esc(mark)}</div>
      <div class="ph-main">${mainArt(b, c)}</div>
      <div class="ph-fx"></div>
    </div>`;
  }

  // ------------------------------------------------------------ face de carte
  function gems(r) {
    return '<span class="gems">' + '<i></i>'.repeat(D.rarities[r].stars) + '</span>';
  }
  function statVal(v) { return typeof v === 'number' ? v : esc(v); }

  function face(c, opts = {}) {
    const b = D.booster(c.booster);
    const R = D.rarities[c.rarity];
    const el = document.createElement('div');
    el.className = `tcard r-${c.rarity} b-${b.id} lay-${c.frame} fit-${c.fit}${c.photo ? ' photo' : ''}${opts.cls ? ' ' + opts.cls : ''}`;
    el.style.cssText = vars(b) + `;--focus:${c.focus};--zoom:${c.zoom || 1}`;
    el.dataset.key = c.key;
    // image entière (fit contain) : posée sur un fond flou d'elle-même
    const img = imgTag(c.img, 'tc-img');
    const blur = c.fit === 'contain' && img ? imgTag(c.img, 'tc-blur') : '';
    el.innerHTML = `
      <div class="tc-art">${placeholder(b, c)}${blur}${img}</div>
      <div class="tc-shade"></div>
      <div class="tc-head"><span class="tc-name">${esc(c.name)}</span></div>
      <div class="tc-body">
        <div class="tc-rar">${gems(c.rarity)}<span>${R.label}</span></div>
        <div class="tc-sub">${esc(c.sub)}</div>
        <p class="tc-text">${esc(c.text)}</p>
        <div class="tc-stats">${b.statLabels.map((l, i) => `<span><b>${statVal(c.stats[i])}</b><i>${esc(l)}</i></span>`).join('')}</div>
        <div class="tc-foot"><span>${esc(b.short)}</span><span>N° ${two(c.no)}/${two(b.cards.length)}</span></div>
      </div>
      <div class="tc-frame"></div>
      <div class="tc-foil"></div>
      <div class="tc-holo"></div>
      <div class="tc-glare"></div>`;
    return wireImgs(el);
  }

  // ------------------------------------------------------------ carte QR (1re carte de chaque booster)
  const qrCache = {};
  function qrCard(b, opts = {}) {
    const el = document.createElement('div');
    el.className = `tcard qcard b-${b.id}${opts.cls ? ' ' + opts.cls : ''}`;
    el.style.cssText = vars(b);
    el.dataset.key = 'qr/' + b.id;
    if (!qrCache[b.id]) qrCache[b.id] = window.SO_QR.svg(b.game, { ecl: 'Q', dark: '#121016', eye: b.colors.a, eyeIn: b.id === 'lfi' ? '#121016' : b.colors.a, hole: true });
    const qr = qrCache[b.id];
    el.innerHTML = `
      <div class="qc-bg"></div>
      <div class="qc-head">
        <span class="qc-badge">Carte jeu</span>
        <span class="qc-title">${esc(b.qr.title)}</span>
        <span class="qc-sub">${esc(b.qr.sub)}</span>
      </div>
      <div class="qc-qr">${qr}<div class="qc-logo"><img src="/assets/logo-128.png" alt="" draggable="false"></div><div class="qc-scan"></div></div>
      <div class="qc-cta" data-play role="button" title="Lancer le jeu bonus"><svg><use href="#i-play"/></svg>Jouer</div>
      <div class="qc-foot"><span>${esc(b.short)}</span><span>Jeu bientôt dispo</span></div>
      <div class="tc-frame"></div>
      <div class="tc-foil"></div>
      <div class="tc-holo"></div>
      <div class="tc-glare"></div>`;
    return el;
  }

  // ------------------------------------------------------------ dos de carte
  // Le dos reprend l'illustration du paquet ouvert (opts.booster = 'squid' | 'fire' | 'lfi') ;
  // sans paquet ou sans image de paquet : le dos dessiné (anneau de feu et logo).
  function back(opts = {}) {
    const el = document.createElement('div');
    el.className = 'cback' + (opts.cls ? ' ' + opts.cls : '');
    const b = opts.booster && D.boosters.find((x) => x.id === opts.booster);
    el.innerHTML = `
      <div class="cb-pattern"></div>
      <div class="cb-ring"><div class="cb-spin"></div><div class="cb-disc"><img src="/assets/logo-256.png" alt="" draggable="false"></div></div>
      <div class="cb-top">Fire Shox</div>
      <div class="cb-bot">Opening</div>
      ${b ? imgTag(b.pack, 'cb-img') : ''}
      <div class="cb-frame"></div>`;
    return wireImgs(el);
  }

  // ------------------------------------------------------------ miniature (plateau, listes)
  function mini(c) {
    const el = document.createElement('div');
    if (c === 'qr' || (c && c.qr)) {
      const b = D.booster(c.booster || c.b);
      el.className = `mcard qr b-${b.id}`;
      el.style.cssText = vars(b);
      el.innerHTML = `<div class="mc-qr"><svg><use href="#i-qr"/></svg></div>`;
      return el;
    }
    const b = D.booster(c.booster);
    el.className = `mcard r-${c.rarity} b-${b.id}`;
    el.style.cssText = vars(b);
    const a = c.art || {};
    const inner = a.logo ? `<img class="mc-logo" src="/assets/logo-128.png" alt="">` : a.mask ? maskSvg(a.mask) : a.shoe ? `<svg class="ph-shoe" viewBox="0 0 64 40" style="color:${a.shoe}"><use href="#i-shox"/></svg>` : a.banner ? '<span class="mc-emoji">🏳️</span>' : `<span class="mc-emoji">${a.emoji || '👟'}</span>`;
    el.style.setProperty('--focus', c.focus);
    el.innerHTML = `<div class="ph ph-${b.id}"><div class="ph-bg"></div></div><div class="mc-art">${inner}</div>${imgTag(c.img, 'mc-img')}<div class="mc-frame"></div>`;
    return wireImgs(el);
  }

  // ------------------------------------------------------------ paquet (booster)
  // Contour : bords haut/bas dentelés ; ligne de déchirure irrégulière à ~10 % de la hauteur.
  const TEAR_Y = 10.5;
  function zig(y0, y1, n, fromLeft) {
    const pts = [];
    for (let i = 0; i <= n * 2; i++) {
      const x = (i / (n * 2)) * 100;
      pts.push([x, i % 2 ? y1 : y0]);
    }
    return fromLeft ? pts : pts.reverse();
  }
  function tearLine(seed) {
    let s = seed || 7;
    const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const pts = [];
    const n = 34;
    for (let i = 0; i <= n; i++) pts.push([(i / n) * 100, TEAR_Y + (r() - 0.5) * 1.6 + (i % 2 ? 0.45 : -0.2)]);
    return pts;
  }
  const poly = (pts) => 'polygon(' + pts.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(',') + ')';
  function packShapes(seed) {
    const top = zig(0, 1.1, 38, true);
    const bot = zig(100, 98.9, 32, false);
    const tear = tearLine(seed);
    return {
      whole: poly([...top, ...bot]),
      strip: poly([...top, ...tear.slice().reverse()]),
      body: poly([...tear, ...bot]),
    };
  }

  function packArt(b) {
    if (b.id === 'squid') {
      return `<div class="pa pa-squid"><div class="pa-num">456</div>
        <svg class="pa-shapes" viewBox="0 0 300 100"><circle cx="50" cy="50" r="36"/><path d="M150 12 L193 86 L107 86 Z"/><rect x="215" y="15" width="70" height="70"/></svg>
        <div class="pa-dots"></div></div>`;
    }
    if (b.id === 'fire') {
      return `<div class="pa pa-fire"><div class="pa-flames"></div><img class="pa-logo" src="/assets/logo-512.png" alt="" draggable="false"></div>`;
    }
    return `<div class="pa pa-lfi"><div class="pa-sun"></div><div class="pa-mega">📢</div><div class="pa-band"><span>La Foulée Insoumise</span></div></div>`;
  }

  function packFace(b) {
    return `<div class="pk-face">
      <div class="pk-art">${packArt(b)}${imgTag(b.pack, 'pk-img')}</div>
      <div class="pk-tint"></div>
      <div class="pk-brand"><img src="/assets/logo-64.png" alt=""><span>Fire Shox</span></div>
      <div class="pk-title"><span class="w1" style="--wsize:${Math.min(27, 84 / (b.word.length * 0.86)).toFixed(1)}cqw">${esc(b.word)}</span><span class="w2">Shox</span></div>
      <div class="pk-badge">Booster · 8 cartes</div>
      <div class="pk-crimp top"></div><div class="pk-crimp bot"></div>
      <div class="pk-tearline"></div>
      <div class="pk-shade"></div>
      <div class="pk-foil"></div>
    </div>`;
  }

  function pack(b, opts = {}) {
    const el = document.createElement('div');
    el.className = `pack b-${b.id}${opts.cls ? ' ' + opts.cls : ''}`;
    el.style.cssText = vars(b) + ';--tear-y:' + TEAR_Y;
    const sh = packShapes(b.id.length * 13 + 5);
    if (opts.split) {
      el.innerHTML = `<div class="pk-piece pk-body" style="clip-path:${sh.body}">${packFace(b)}</div>
        <div class="pk-piece pk-strip" style="clip-path:${sh.strip}">${packFace(b)}</div>`;
    } else {
      el.innerHTML = `<div class="pk-piece pk-whole" style="clip-path:${sh.whole}">${packFace(b)}</div>`;
    }
    return wireImgs(el);
  }

  window.SO_CARDS = { probe, probeAll, state, face, qrCard, back, mini, pack, esc, TEAR_Y };
})();
