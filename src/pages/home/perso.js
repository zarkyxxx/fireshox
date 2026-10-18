// Accueil Fire Shox — personnalisation : raccourcis perso + fond au choix.
//   home.shortcuts  = [{ id, name, url }]  (12 au maximum ; YouTube, Discord, Google, Twitch au premier lancement)
//   home.bg         = { type: 'embers' | 'pack' | 'meme' | 'custom', id, dim: 0…0.9, embers: true|false }
//   home.bg.custom  = image perso en data URL (JPEG ≤ 1920 px de large, qualité 0,85, ≤ 1,5 Mo)
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const snd = (n) => { try { FX.sound(n); } catch {} };
  const svg = (p, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24">${p}</svg>`;
  const I = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4.5h6V7"/>',
    tab: '<rect x="3" y="5" width="18" height="15" rx="2.5"/><path d="M3 9.5h18M8 5v4.5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m6 12.5 4 4L18 8"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  };

  // ================================================================== petit toast avec « Annuler »
  let undoEl = null, undoTimer = 0, undoFn = null;
  function undoToast(text, fn) {
    if (!undoEl) {
      undoEl = document.createElement('div'); undoEl.className = 'hp-undo'; undoEl.setAttribute('role', 'status');
      undoEl.innerHTML = '<span></span><button type="button">Annuler</button>';
      document.body.appendChild(undoEl);
      undoEl.querySelector('button').addEventListener('click', () => { const f = undoFn; hideUndo(); if (f) f(); });
    }
    undoEl.querySelector('span').textContent = text;
    undoFn = fn;
    undoEl.classList.remove('out'); undoEl.classList.add('on');
    clearTimeout(undoTimer); undoTimer = setTimeout(hideUndo, 6000);
  }
  function hideUndo() { if (!undoEl) return; undoEl.classList.add('out'); undoFn = null; setTimeout(() => undoEl.classList.remove('on', 'out'), 260); }

  // ================================================================== raccourcis
  const MAX = 12;
  const KEY_SC = 'home.shortcuts';
  const DEFAULTS = [
    { name: 'YouTube', url: 'https://www.youtube.com/' },
    { name: 'Discord', url: 'https://discord.com/app' },
    { name: 'Google', url: 'https://www.google.com/' },
    { name: 'Twitch', url: 'https://www.twitch.tv/' },
  ];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let shortcuts = FX.store.get(KEY_SC, null);
  if (!Array.isArray(shortcuts)) {
    shortcuts = DEFAULTS.map((d) => ({ id: uid(), ...d }));
    FX.store.set(KEY_SC, shortcuts);
  }
  shortcuts = shortcuts.filter((s) => s && s.url).slice(0, MAX).map((s) => ({ id: String(s.id || uid()), name: String(s.name || ''), url: String(s.url) }));
  const saveSc = () => FX.store.set(KEY_SC, shortcuts);

  function normUrl(raw) {
    let v = String(raw || '').trim();
    if (!v) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) {
      if (/\s/.test(v) || !/^[^/?#\s]+\.[a-z][a-z0-9-]{1,62}(:\d+)?([/?#].*)?$/i.test(v) && !/^localhost(:\d+)?([/?#].*)?$/i.test(v)) return null;
      v = 'https://' + v;
    }
    try {
      const u = new URL(v);
      if (!/^(https?|fireshox):$/.test(u.protocol) || !u.hostname) return null;
      return u.href;
    } catch { return null; }
  }
  const INTERNAL_NAMES = { home: 'Accueil', opening: 'Shox Opening', shoxbench: 'ShoxBench', wiki: 'Wiki Shox', images: 'Images de M. Claude', jeux: 'Jeux vidéo', runner: 'Shox Runner', notes: 'ShoxNotes', history: 'Historique', downloads: 'Téléchargements', settings: 'Paramètres' };
  function defaultName(url) {
    try { const u = new URL(url); if (u.protocol === 'fireshox:') return INTERNAL_NAMES[u.hostname] || u.hostname; } catch {}
    return hostOf(url).replace(/\.[a-z]+$/i, '').replace(/^./, (c) => c.toUpperCase());
  }
  const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };
  const COLORS = ['#ff7a00', '#ff2d75', '#3d9bff', '#5be08a', '#b44dff', '#ffb000', '#19d3b5', '#ff4d4d'];
  function letterOf(sc) {
    const h = hostOf(sc.url);
    let n = 0; for (const ch of h) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
    const L = (sc.name || h).trim().charAt(0).toUpperCase() || '?';
    return { L, c: COLORS[n % COLORS.length] };
  }
  function iconHtml(sc) {
    const { L, c } = letterOf(sc);
    const letter = `<b class="sc-letter" style="--c:${c}">${esc(L)}</b>`;
    if (/^fireshox:/i.test(sc.url)) return `<img src="/assets/logo-64.png" alt="" draggable="false">`;
    const fav = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(sc.url))}&sz=64`;
    return `${letter}<img src="${esc(fav)}" alt="" draggable="false" data-fav hidden>`;
  }

  const grid = $('#shortcuts');
  function renderSc() {
    grid.innerHTML = shortcuts.map((sc, i) =>
      `<div class="sc" data-id="${esc(sc.id)}" style="animation-delay:${0.04 * i + 0.25}s">` +
        `<a class="sc-link" href="${esc(sc.url)}" draggable="false" title="${esc(sc.name || hostOf(sc.url))}\n${esc(sc.url)}"><span class="sc-ico">${iconHtml(sc)}</span><span class="sc-name">${esc(sc.name || hostOf(sc.url))}</span></a>` +
        `<button class="sc-more" type="button" aria-label="Options du raccourci ${esc(sc.name)}" title="Modifier ou supprimer">${svg(I.more)}</button>` +
      '</div>').join('') +
      (shortcuts.length < MAX ? `<button class="sc sc-add" type="button" id="sc-add" style="animation-delay:${0.04 * shortcuts.length + 0.25}s"><span class="sc-ico">${svg(I.plus)}</span><span class="sc-name">Ajouter un raccourci</span></button>` : '');
    for (const img of grid.querySelectorAll('img[data-fav]')) {
      img.onload = () => { if (img.naturalWidth >= 16) { img.hidden = false; img.previousElementSibling.hidden = true; } };
      img.onerror = () => img.remove();
    }
  }
  grid.classList.add('intro');
  renderSc();
  setTimeout(() => grid.classList.remove('intro'), 1400);
  FX.store.onChange((k, v) => {
    if (k === KEY_SC && Array.isArray(v) && !drag) { shortcuts = v.slice(0, MAX); renderSc(); }
    if (k === KEY_BG || k === KEY_CUSTOM) { applyBg(); if (panel && !panel.hidden) renderPanel(); }
  });

  // ------------------------------------------------------------------ fenêtre d'ajout / modification
  let dlg = null;
  function openDialog(sc) {
    closeMenu();
    if (!dlg) {
      dlg = document.createElement('div');
      dlg.className = 'hp-modal';
      dlg.innerHTML = `<form class="hp-dialog" role="dialog" aria-modal="true" aria-labelledby="sc-dlg-t" novalidate>
        <div class="hd"><span class="hd-ico">${svg(I.flame)}</span><h2 id="sc-dlg-t"></h2></div>
        <label class="fld"><span>Nom</span><input name="name" maxlength="40" placeholder="Ex. YouTube" autocomplete="off" spellcheck="false"></label>
        <label class="fld"><span>Adresse</span><input name="url" placeholder="https://…" autocomplete="off" spellcheck="false" inputmode="url"></label>
        <p class="err" aria-live="polite"></p>
        <div class="acts"><button type="button" class="fs-btn danger" data-act="del">${svg(I.trash)}Supprimer</button><span class="grow"></span><button type="button" class="fs-btn" data-act="cancel">Annuler</button><button type="submit" class="fs-btn fire" data-act="ok">Terminé</button></div>
      </form>`;
      document.body.appendChild(dlg);
      const f = dlg.querySelector('form');
      const sync = () => { f.querySelector('[data-act="ok"]').disabled = !f.url.value.trim(); f.querySelector('.err').textContent = ''; f.url.classList.remove('bad'); };
      f.url.addEventListener('input', sync); f.name.addEventListener('input', () => { f.querySelector('.err').textContent = ''; });
      dlg.addEventListener('mousedown', (e) => { if (e.target === dlg) closeDialog(); });
      f.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); closeDialog(); }
        if (e.key === 'Enter' && !e.isComposing && e.target.tagName === 'INPUT') { e.preventDefault(); f.requestSubmit(); }
      });
      f.querySelector('[data-act="cancel"]').addEventListener('click', closeDialog);
      f.querySelector('[data-act="del"]').addEventListener('click', () => { const id = dlg.dataset.id; closeDialog(); removeSc(id); });
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = normUrl(f.url.value);
        if (!url) { f.querySelector('.err').textContent = 'Adresse invalide. Exemple : youtube.com ou https://discord.com'; f.url.classList.add('bad'); f.url.focus(); snd('error'); return; }
        const name = f.name.value.trim() || defaultName(url);
        const id = dlg.dataset.id;
        if (id) { const s = shortcuts.find((x) => x.id === id); if (s) { s.name = name; s.url = url; } }
        else {
          if (shortcuts.length >= MAX) { f.querySelector('.err').textContent = `${MAX} raccourcis au maximum : supprimes-en un pour en ajouter un autre.`; snd('error'); return; }
          shortcuts.push({ id: uid(), name, url });
        }
        saveSc(); renderSc(); closeDialog(); snd('pop');
        FX.toast(id ? 'Raccourci modifié 🔥' : `Raccourci « ${name} » ajouté 🔥`);
      });
      f.url.dispatchEvent(new Event('input'));
    }
    const f = dlg.querySelector('form');
    dlg.dataset.id = sc ? sc.id : '';
    dlg.querySelector('h2').textContent = sc ? 'Modifier le raccourci' : 'Ajouter un raccourci';
    f.name.value = sc ? sc.name : ''; f.url.value = sc ? sc.url : '';
    f.querySelector('[data-act="del"]').hidden = !sc;
    f.url.dispatchEvent(new Event('input'));
    dlg.classList.add('on');
    requestAnimationFrame(() => (sc ? f.url : f.name).focus());
    snd('click');
  }
  function closeDialog() { if (dlg) dlg.classList.remove('on'); }

  function removeSc(id) {
    const i = shortcuts.findIndex((s) => s.id === id);
    if (i < 0) return;
    const [s] = shortcuts.splice(i, 1);
    saveSc(); renderSc(); snd('tear');
    undoToast(`Raccourci « ${s.name || hostOf(s.url)} » supprimé`, () => { shortcuts.splice(Math.min(i, shortcuts.length), 0, s); saveSc(); renderSc(); snd('pop'); });
  }

  // ------------------------------------------------------------------ menu (clic droit ou ⋯)
  let menu = null;
  function openMenu(sc, x, y) {
    closeMenu();
    menu = document.createElement('div');
    menu.className = 'hp-menu'; menu.setAttribute('role', 'menu');
    menu.innerHTML = `<button type="button" role="menuitem" data-m="tab">${svg(I.tab)}Ouvrir dans un nouvel onglet</button>` +
      `<button type="button" role="menuitem" data-m="edit">${svg(I.edit)}Modifier le raccourci</button>` +
      `<button type="button" role="menuitem" data-m="del" class="danger">${svg(I.trash)}Supprimer</button>`;
    document.body.appendChild(menu);
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.min(x, innerWidth - r.width - 8) + 'px';
    menu.style.top = (y + r.height > innerHeight - 8 ? Math.max(8, y - r.height) : y) + 'px';
    menu.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      closeMenu();
      if (b.dataset.m === 'tab') FX.open(sc.url, { background: false });
      if (b.dataset.m === 'edit') openDialog(sc);
      if (b.dataset.m === 'del') removeSc(sc.id);
    });
    snd('click');
  }
  function closeMenu() { if (menu) { menu.remove(); menu = null; } }
  document.addEventListener('mousedown', (e) => { if (menu && !menu.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); closePanel(); } });
  addEventListener('blur', closeMenu);
  addEventListener('scroll', closeMenu, true);

  grid.addEventListener('contextmenu', (e) => {
    const el = e.target.closest('.sc[data-id]'); if (!el) return;
    e.preventDefault();
    const sc = shortcuts.find((s) => s.id === el.dataset.id);
    if (sc) openMenu(sc, e.clientX, e.clientY);
  });
  grid.addEventListener('click', (e) => {
    if (justDragged) { e.preventDefault(); e.stopPropagation(); return; }
    const more = e.target.closest('.sc-more');
    if (more) {
      e.preventDefault();
      const el = more.closest('.sc'); const sc = shortcuts.find((s) => s.id === el.dataset.id);
      const r = more.getBoundingClientRect();
      if (sc) openMenu(sc, r.left, r.bottom + 6);
      return;
    }
    if (e.target.closest('#sc-add')) { openDialog(null); return; }
    if (e.target.closest('.sc-link')) snd('whoosh');
  }, true);

  // ------------------------------------------------------------------ glisser pour réordonner
  let drag = null, justDragged = false;
  grid.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.sc[data-id]');
    if (!el || e.button !== 0 || e.target.closest('.sc-more')) return;
    const r = el.getBoundingClientRect();
    drag = { el, id: el.dataset.id, x0: e.clientX, y0: e.clientY, gx: e.clientX - r.left, gy: e.clientY - r.top, on: false, pid: e.pointerId };
  });
  function restPos(el) { return { x: el.offsetLeft, y: el.offsetTop }; }
  function flip(mutate) {
    const els = [...grid.children].filter((c) => c !== drag.el);
    const before = new Map(els.map((c) => [c, c.getBoundingClientRect()]));
    mutate();
    for (const c of els) {
      const a = before.get(c), b = c.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (!dx && !dy) continue;
      c.style.transition = 'none'; c.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => { c.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)'; c.style.transform = ''; });
    }
  }
  addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 7) return;
      drag.on = true; closeMenu();
      drag.el.classList.add('dragging'); grid.classList.add('sorting');
      try { drag.el.setPointerCapture(drag.pid); } catch {}
    }
    const g = grid.getBoundingClientRect();
    const px = e.clientX - g.left, py = e.clientY - g.top;
    // tuile survolée → on y déplace la tuile tenue
    const over = [...grid.querySelectorAll('.sc[data-id]')].find((c) => {
      if (c === drag.el) return false;
      const x = c.offsetLeft, y = c.offsetTop;
      return px > x + 8 && px < x + c.offsetWidth - 8 && py > y && py < y + c.offsetHeight;
    });
    if (over) {
      const kids = [...grid.querySelectorAll('.sc[data-id]')];
      const from = kids.indexOf(drag.el), to = kids.indexOf(over);
      flip(() => grid.insertBefore(drag.el, from < to ? over.nextSibling : over));
    }
    const rest = restPos(drag.el);
    drag.el.style.transform = `translate(${px - drag.gx - rest.x}px, ${py - drag.gy - rest.y}px) scale(1.06)`;
  });
  function endDrag() {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.on) return;
    d.el.classList.remove('dragging'); grid.classList.remove('sorting');
    d.el.style.transition = 'transform .2s cubic-bezier(.2,.8,.2,1)'; d.el.style.transform = '';
    setTimeout(() => { d.el.style.transition = ''; }, 220);
    const order = [...grid.querySelectorAll('.sc[data-id]')].map((c) => c.dataset.id);
    shortcuts.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    saveSc(); snd('pop');
    justDragged = true; setTimeout(() => { justDragged = false; }, 50);
  }
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);

  // ================================================================== fond au choix
  const KEY_BG = 'home.bg';
  const KEY_CUSTOM = 'home.bg.custom';
  const PACKS = [
    { id: 'squid', name: 'Paquet Squid', pos: 'center 30%' },
    { id: 'fire', name: 'Paquet Fire', pos: 'center 32%' },
    { id: 'lfi', name: 'Paquet LFI', pos: 'center 28%' },
  ];
  const MEMES = [
    ['le-y-btbf', 'Le Y BTBF', 'center 25%'], ['le-y-lancer-456', 'Le Y lancer 456', 'center 30%'], ['le-y-tenue-456', 'Le Y tenue 456', 'center 25%'],
    ['jack-shi', 'Jack Shi', 'center 35%'], ['la-boussole', 'La Boussole', 'center 35%'], ['dalgona-shox', 'Dalgona Shox', 'center'],
    ['tralalero-shoxala', 'Tralalero Shoxalà', 'center 40%'], ['dtn', 'DTN', 'center 30%'], ['axel', 'Axel', 'center 30%'],
  ];
  const MAX_BYTES = 1.5 * 1024 * 1024;
  const getBg = () => {
    const b = FX.store.get(KEY_BG, null) || {};
    return { type: ['embers', 'pack', 'meme', 'custom'].includes(b.type) ? b.type : 'embers', id: b.id || '', dim: Number.isFinite(b.dim) ? Math.min(0.9, Math.max(0, b.dim)) : 0.55, embers: b.embers !== false };
  };
  const setBg = (patch) => { FX.store.set(KEY_BG, { ...getBg(), ...patch }); applyBg(); if (panel && !panel.hidden) renderPanel(); };

  function srcOf(b) {
    if (b.type === 'pack') { const p = PACKS.find((x) => x.id === b.id) || PACKS[0]; return { src: `/assets/cards/boosters/${p.id}.png`, pos: p.pos }; }
    if (b.type === 'meme') { const m = MEMES.find((x) => x[0] === b.id) || MEMES[0]; return { src: `/assets/memes/${m[0]}.webp`, pos: m[2] }; }
    if (b.type === 'custom') { const d = FX.store.get(KEY_CUSTOM, null); return d ? { src: d, pos: 'center' } : null; }
    return null;
  }
  const bgImg = $('#bg-img');
  let bgToken = 0, bgSrc = '';
  function applyBg() {
    const b = getBg();
    const s = srcOf(b);
    document.body.style.setProperty('--bg-dim', String(b.dim));
    document.body.classList.toggle('has-bg', !!s);
    document.body.classList.toggle('no-embers', !!s && !b.embers);
    if (!s) { bgImg.classList.remove('on'); bgSrc = ''; return; }
    if (s.src === bgSrc) { bgImg.style.backgroundPosition = s.pos; return; }
    const tok = ++bgToken;
    const im = new Image();
    im.onload = () => {
      if (tok !== bgToken) return;
      bgImg.classList.remove('on');
      setTimeout(() => {
        if (tok !== bgToken) return;
        bgImg.style.backgroundImage = `url("${s.src.replace(/"/g, '%22')}")`;
        bgImg.style.backgroundPosition = s.pos;
        bgSrc = s.src;
        requestAnimationFrame(() => bgImg.classList.add('on'));
      }, bgImg.classList.contains('on') ? 180 : 0);
    };
    im.onerror = () => { if (tok === bgToken) { FX.toast('Image de fond introuvable : retour aux braises.'); setBg({ type: 'embers' }); } };
    im.src = s.src;
  }
  applyBg();

  // ------------------------------------------------------------------ image perso
  function readAsImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => { URL.revokeObjectURL(url); res(im); };
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('illisible')); };
      im.src = url;
    });
  }
  async function useFile(file) {
    const err = (t) => { setPanelMsg(t, true); snd('error'); return false; };
    if (!file) return false;
    if (file.type && !file.type.startsWith('image/')) return err('Ce fichier n\'est pas une image.');
    setPanelMsg('Préparation de l\'image…');
    let im;
    try { im = await readAsImage(file); } catch { return err('Impossible de lire cette image.'); }
    const k = Math.min(1, 1920 / im.naturalWidth);
    const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    c.fillStyle = '#0b0a0f'; c.fillRect(0, 0, w, h); // fond sombre sous les images transparentes
    c.drawImage(im, 0, 0, w, h);
    const data = cv.toDataURL('image/jpeg', 0.85);
    const bytes = Math.round((data.length - data.indexOf(',') - 1) * 3 / 4);
    if (bytes > MAX_BYTES) return err(`Image trop lourde : ${(bytes / 1048576).toFixed(1).replace('.', ',')} Mo après compression (1,5 Mo au maximum). Choisis une image plus petite ou plus simple.`);
    FX.store.set(KEY_CUSTOM, data);
    setBg({ type: 'custom' });
    setPanelMsg(`Image enregistrée (${w} × ${h} px, ${Math.round(bytes / 1024)} Ko).`);
    snd('success');
    return true;
  }

  // ------------------------------------------------------------------ panneau « Personnaliser »
  let panel = null, msg = { t: '', bad: false };
  function setPanelMsg(t, bad = false) { msg = { t, bad }; const el = panel && panel.querySelector('.pp-msg'); if (el) { el.textContent = t; el.classList.toggle('bad', bad); el.hidden = !t; } }
  function tile(sel, attrs, inner, label) {
    return `<button type="button" class="pp-tile${sel ? ' on' : ''}" ${attrs} aria-pressed="${sel}" title="${esc(label)}">${inner}<span class="pp-lbl">${esc(label)}</span><i class="pp-ok">${svg(I.check)}</i></button>`;
  }
  function renderPanel() {
    const b = getBg();
    const custom = FX.store.get(KEY_CUSTOM, null);
    panel.querySelector('.pp-body').innerHTML =
      '<div class="pp-sec">Fond</div><div class="pp-grid g4">' +
        tile(b.type === 'embers', 'data-bg="embers"', '<span class="pp-th embers"><i></i><i></i><i></i><i></i><i></i><i></i></span>', 'Braises') +
        PACKS.map((p) => tile(b.type === 'pack' && b.id === p.id, `data-bg="pack" data-id="${p.id}"`, `<span class="pp-th" style="background-image:url('/assets/cards/boosters/${p.id}.png');background-position:${p.pos}"></span>`, p.name)).join('') +
      '</div>' +
      '<div class="pp-sec">Memes</div><div class="pp-grid g3">' +
        MEMES.map(([id, name, pos]) => tile(b.type === 'meme' && b.id === id, `data-bg="meme" data-id="${id}"`, `<span class="pp-th" style="background-image:url('/assets/memes/${id}.webp');background-position:${pos}"></span>`, name)).join('') +
      '</div>' +
      '<div class="pp-sec">Ta propre image</div>' +
      `<div class="pp-own">${custom ? tile(b.type === 'custom', 'data-bg="custom"', `<span class="pp-th" style="background-image:url('${custom.replace(/'/g, '%27')}')"></span>`, 'Mon image') : ''}` +
        `<div class="pp-own-act"><button type="button" class="fs-btn" data-act="pick">${svg(I.upload)}${custom ? 'Changer d\'image' : 'Choisir une image…'}</button>` +
        `${custom ? '<button type="button" class="pp-link" data-act="forget">Retirer mon image</button>' : '<small>JPEG, PNG, WebP… redimensionnée à 1 920 px de large, 1,5 Mo au plus.</small>'}</div></div>` +
      `<p class="pp-msg${msg.bad ? ' bad' : ''}"${msg.t ? '' : ' hidden'}>${esc(msg.t)}</p>`;
    // réglages toujours visibles en bas du panneau
    const foot = panel.querySelector('.pp-foot');
    foot.className = `pp-foot${b.type === 'embers' ? ' off' : ''}`;
    foot.title = b.type === 'embers' ? 'Choisis une image de fond pour régler l\'assombrissement et les braises' : '';
    foot.innerHTML =
        `<label class="pp-range"><span>Assombrissement</span><input type="range" min="0" max="90" step="1" value="${Math.round(b.dim * 100)}" data-act="dim" ${b.type === 'embers' ? 'disabled' : ''}><b>${Math.round(b.dim * 100)} %</b></label>` +
        `<label class="pp-check"><input type="checkbox" data-act="embers" ${b.embers ? 'checked' : ''} ${b.type === 'embers' ? 'disabled' : ''}><span class="box">${svg(I.check)}</span>Garder les braises par-dessus l'image</label>`;
  }
  function openPanel() {
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'hp-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Personnaliser l\'accueil');
      panel.innerHTML = `<div class="pp-head"><span class="hd-ico">${svg(I.flame)}</span><b>Personnaliser l'accueil</b><button type="button" class="pp-x" aria-label="Fermer">${svg(I.close)}</button></div><div class="pp-body"></div><div class="pp-foot"></div>` +
        '<input type="file" accept="image/*" hidden>';
      document.body.appendChild(panel);
      const file = panel.querySelector('input[type=file]');
      panel.querySelector('.pp-x').addEventListener('click', closePanel);
      panel.addEventListener('click', (e) => {
        const t = e.target.closest('[data-bg]');
        if (t) { snd('pop'); setPanelMsg(''); setBg({ type: t.dataset.bg, id: t.dataset.id || '' }); return; }
        const a = e.target.closest('[data-act]'); if (!a) return;
        if (a.dataset.act === 'pick') { file.value = ''; file.click(); }
        if (a.dataset.act === 'forget') { FX.store.set(KEY_CUSTOM, null); if (getBg().type === 'custom') setBg({ type: 'embers' }); else renderPanel(); setPanelMsg('Image retirée.'); snd('tear'); }
      });
      panel.addEventListener('input', (e) => {
        const a = e.target.dataset.act;
        if (a === 'dim') { const v = Number(e.target.value) / 100; document.body.style.setProperty('--bg-dim', String(v)); e.target.nextElementSibling.textContent = `${e.target.value} %`; }
      });
      panel.addEventListener('change', (e) => {
        const a = e.target.dataset.act;
        if (a === 'dim') { FX.store.set(KEY_BG, { ...getBg(), dim: Number(e.target.value) / 100 }); }
        if (a === 'embers') { setBg({ embers: e.target.checked }); snd('click'); }
      });
      file.addEventListener('change', () => { if (file.files && file.files[0]) useFile(file.files[0]); });
      document.addEventListener('mousedown', (e) => { if (panel && !panel.hidden && !panel.contains(e.target) && !e.target.closest('#perso-btn')) closePanel(); });
    }
    renderPanel();
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('on'));
    $('#perso-btn').classList.add('on');
    snd('click');
  }
  function closePanel() {
    if (!panel || panel.hidden) return;
    panel.classList.remove('on'); $('#perso-btn').classList.remove('on');
    setTimeout(() => { if (!panel.classList.contains('on')) panel.hidden = true; }, 200);
  }
  $('#perso-btn').addEventListener('click', () => { if (panel && !panel.hidden && panel.classList.contains('on')) closePanel(); else openPanel(); });

  // accès pour les tests (image de test sans sélecteur de fichier)
  window.HomePerso = {
    useFile, openPanel, closePanel, openDialog, setBg, getBg,
    get shortcuts() { return shortcuts; },
    async useUrl(url) { const r = await fetch(url); const b = await r.blob(); return useFile(new File([b], 'test', { type: b.type || 'image/webp' })); },
  };
})();
