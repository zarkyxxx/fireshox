// Accueil Fire Shox
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const ENGINES = {
    google: 'https://www.google.com/search?q=%s', duckduckgo: 'https://duckduckgo.com/?q=%s', bing: 'https://www.bing.com/search?q=%s',
    qwant: 'https://www.qwant.com/?q=%s', ecosia: 'https://www.ecosia.org/search?q=%s', brave: 'https://search.brave.com/search?q=%s',
  };
  const ICONS = {
    package: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    gamepad: '<path d="M6 11h4"/><path d="M8 9v4"/><path d="M15 12h.01"/><path d="M18 10h.01"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>',
    eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
  };
  const svg = (name) => `<svg viewBox="0 0 24 24">${ICONS[name]}</svg>`;

  const FOLDERS = [
    { url: 'fireshox://opening/', title: 'Shox Opening', sub: 'Boosters Squid, Fire & LFI', icon: 'package', c: '#ffb000', stat: () => { const c = FX.store.get('opening.coins', null); return c === null ? '' : `${FX.fmt(c)} ShoxCoins`; } },
    { url: 'fireshox://shoxbench/', title: 'ShoxBench', sub: 'Ton débit en shox/s', icon: 'gauge', c: '#3fd0e8', stat: () => { const l = FX.store.get('bench.speed', []); return Array.isArray(l) && l.length ? `${l.length} test${l.length > 1 ? 's' : ''}` : ''; } },
    { url: 'fireshox://wiki/', title: 'Wiki Shox', sub: "L'encyclopédie incandescente", icon: 'book', c: '#9aa6ff', stat: () => '16 articles' },
    { url: 'fireshox://images/', title: 'Images de Monsieur Claude', sub: 'La galerie nationale', icon: 'image', c: '#ff6fae', stat: () => '' },
    { url: 'fireshox://jeux/', title: 'Jeux vidéo', sub: 'Débloqués par les cartes QR', icon: 'gamepad', c: '#5be08a', stat: () => '' },
  ];

  const NEWS = [
    '<b>RECORD</b> — Un ressort de Shox a rebondi jusqu\'à la stratosphère, la NASA demande des explications.',
    '<b>MÉTÉO</b> — Canicule prévue sur les semelles : 42 °C à l\'ombre d\'une Shox.',
    '<b>SPORT</b> — Le 100 m en Shox homologué : les juges n\'ont vu qu\'une traînée orange.',
    '<b>TECH</b> — Fire Shox dépasse les 9 999 shox/s sur ShoxBench. Les autres navigateurs portent plainte.',
    '<b>CULTURE</b> — La Galerie nationale de Monsieur Claude annonce de nouvelles œuvres « très bientôt ».',
    '<b>ÉCO</b> — Le cours du ShoxCoin s\'envole après l\'ouverture d\'un booster légendaire.',
    '<b>SCIENCE</b> — Des chercheurs prouvent que l\'amorti gravitationnel fonctionne aussi le lundi.',
    '<b>INSOLITE</b> — Un homme retrouve ses Shox dans un volcan : « elles étaient juste à bonne température ».',
    '<b>ALERTE</b> — Turbo Shox activé dans 3 départements, les pompiers sont en Shox eux aussi.',
  ];

  // ------------------------------------------------------------------ réglages en direct
  function settings() { return FX.store.get('settings', {}) || {}; }
  function apply() {
    const s = settings();
    document.body.classList.toggle('turbo', !!s.turbo);
    document.body.classList.toggle('hide-hero', !!s.hideHero);
    $('#toggle-img').innerHTML = s.hideHero ? `${svg('eye')}Afficher l'image` : `${svg('eyeoff')}Masquer l'image`;
    $('#cta').innerHTML = s.turbo ? '<span>⚡</span> Turbo Shox activé — reclique pour refroidir <span>⚡</span>' : '<span>🔥</span> Clique pour activer le Turbo Shox <span>🔥</span>';
  }
  function patchSettings(p) { FX.store.set('settings', { ...settings(), ...p }); apply(); }
  FX.store.onChange((k) => { if (k === 'settings') apply(); if (k && k.startsWith('opening.') || k === 'bench.speed') renderFolders(); });

  // ------------------------------------------------------------------ logo / turbo
  $('#logo-btn').addEventListener('click', (e) => {
    const on = !settings().turbo;
    patchSettings({ turbo: on });
    const r = $('#logo-btn').getBoundingClientRect();
    FX.burst(r.left + r.width / 2, r.top + r.height / 2, { count: on ? 140 : 50, spread: on ? 13 : 7 });
    FX.sound(on ? 'boom' : 'whoosh');
    const b = $('#logo-btn');
    if (!on) { b.classList.remove('kick'); void b.offsetWidth; b.classList.add('kick'); }
    FX.toast(on ? '⚡ TURBO SHOX ACTIVÉ — ressorts en surchauffe' : 'Turbo Shox refroidi 🧊');
  });
  $('#toggle-img').addEventListener('click', () => { patchSettings({ hideHero: !settings().hideHero }); FX.sound('click'); });

  // ------------------------------------------------------------------ recherche
  $('#search').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#q').value.trim();
    if (!q) { $('#q').focus(); return; }
    let url;
    if (/^(https?|fireshox):/i.test(q)) url = q;
    else if (!/\s/.test(q) && /^[^/?#\s]+\.[a-z][a-z0-9-]{1,62}([/?#].*)?$/i.test(q)) url = 'https://' + q;
    else url = (ENGINES[settings().engine] || ENGINES.google).replace('%s', encodeURIComponent(q));
    FX.sound('whoosh');
    location.href = url;
  });

  // ------------------------------------------------------------------ dossiers + favoris
  function renderFolders() {
    $('#folders').innerHTML = FOLDERS.map((f, i) => `<a class="folder" href="${f.url}" style="--c:${f.c};animation-delay:${0.08 * i + 0.1}s">
      <span class="ico">${svg(f.icon)}</span><b>${f.title}</b><small>${f.sub}</small><span class="stat">${f.stat()}</span></a>`).join('');
  }
  document.addEventListener('mouseover', (e) => { if (e.target.closest && e.target.closest('.folder') && !e.target.closest('.folder').contains(e.relatedTarget)) FX.sound('hover'); });
  function renderFavs() {
    const list = (FX.store.get('bookmarks', []) || []).slice(0, 8);
    const el = $('#favs');
    el.hidden = !list.length;
    el.innerHTML = list.map((b) => `<a class="fav" href="${b.url.replace(/"/g, '&quot;')}" title="${(b.title || '').replace(/"/g, '&quot;')}">
      ${b.fav ? `<img src="${b.fav.replace(/"/g, '&quot;')}" alt="" onerror="this.remove()">` : ''}<span></span></a>`).join('');
    [...el.querySelectorAll('.fav span')].forEach((s, i) => { s.textContent = list[i].title || list[i].url; });
  }

  // ------------------------------------------------------------------ braises
  const cv = $('#embers');
  const cx = cv.getContext('2d');
  let W = 0, H = 0;
  const parts = [];
  function fit() { W = cv.width = innerWidth * devicePixelRatio; H = cv.height = innerHeight * devicePixelRatio; }
  addEventListener('resize', fit); fit();
  function spawn() {
    const d = devicePixelRatio;
    parts.push({ x: Math.random() * W, y: H + 10, vx: (Math.random() - 0.5) * 0.4 * d, vy: -(0.4 + Math.random() * 1.2) * d, r: (0.6 + Math.random() * 1.8) * d, life: 1, decay: 0.002 + Math.random() * 0.004, hue: 20 + Math.random() * 25, wob: Math.random() * 6 });
  }
  let last = 0;
  function tick(t) {
    // Braises coupées (fond image sans braises, voir perso.js) : on ne dessine plus rien.
    if (document.body.classList.contains('no-embers')) {
      if (parts.length) { parts.length = 0; cx.clearRect(0, 0, W, H); }
      requestAnimationFrame(tick);
      return;
    }
    const turbo = document.body.classList.contains('turbo');
    const rate = turbo ? 4 : 1;
    for (let i = 0; i < rate; i++) if (Math.random() < 0.55) spawn();
    cx.clearRect(0, 0, W, H);
    cx.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx + Math.sin((t / 600) + p.wob) * 0.3 * devicePixelRatio;
      p.y += p.vy * (turbo ? 2.2 : 1);
      p.life -= p.decay;
      if (p.life <= 0 || p.y < -20) { parts.splice(i, 1); continue; }
      const a = Math.min(1, p.life * 1.4) * 0.8;
      const g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `hsla(${p.hue + 20}, 100%, 70%, ${a})`);
      g.addColorStop(0.35, `hsla(${p.hue}, 100%, 55%, ${a * 0.5})`);
      g.addColorStop(1, 'hsla(20, 100%, 50%, 0)');
      cx.fillStyle = g;
      cx.beginPath(); cx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); cx.fill();
    }
    last = t;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ------------------------------------------------------------------ bandeau
  const shuffled = NEWS.slice().sort(() => Math.random() - 0.5);
  $('#tk-run').innerHTML = shuffled.concat(shuffled).map((n) => `<span>${n}</span>`).join('');

  const s = settings();
  $('#q').placeholder = `Rechercher sur ${({ google: 'Google', duckduckgo: 'DuckDuckGo', bing: 'Bing', qwant: 'Qwant', ecosia: 'Ecosia', brave: 'Brave' })[s.engine] || 'Google'} ou taper une Shox-Requête…`;
  apply();
  renderFolders();
  renderFavs();
  FX.store.onChange((k) => { if (k === 'bookmarks') renderFavs(); });
})();
