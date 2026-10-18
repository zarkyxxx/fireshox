// Fire Shox — panneau latéral « Claude » (à droite des pages, comme Copilot dans Edge).
//   • deux onglets : Claude (https://claude.ai/, même session que le navigateur pour rester connecté)
//     et ShoxNotes (fireshox://notes/) ;
//   • ouverture : bouton étincelle de la barre d'outils, menu principal, Ctrl+Maj+K ;
//   • largeur réglable en glissant le bord gauche (320 à 720 px), mémorisée avec l'état ouvert/fermé
//     dans settings (claudeOpen, claudeWidth, claudeTab) ;
//   • « Demander à Claude » (barre d'adresse, clic droit sur une sélection, bouton sur Google) :
//     ShoxPanel.ask(texte) ouvre le panneau sur https://claude.ai/new?q=<texte>.
// Aucun logo de marque : l'icône étincelle et le mot « Claude » suffisent.
'use strict';
(() => {
  const X = window.FSX;
  const S = window.shell;
  if (!X || !S) return;
  const $ = (s, r = document) => r.querySelector(s);
  const MIN_W = 320, MAX_W = 720, DEF_W = 400, MIN_PAGE = 300;
  const PANES = {
    claude: { title: 'Claude', icon: 'sparkle', home: 'https://claude.ai/', wait: 'Connexion à Claude…' },
    notes: { title: 'ShoxNotes', icon: 'notebook', home: 'fireshox://notes/', wait: 'Ouverture de ShoxNotes…' },
  };
  const askUrl = (q) => 'https://claude.ai/new?q=' + encodeURIComponent(String(q || '').trim().slice(0, 4000));

  const views = $('#views');
  const btn = $('#b-claude');
  const panel = document.createElement('aside');
  panel.id = 'claude-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="cp-grip" title="Glisser pour changer la largeur"></div>
    <header class="cp-head">
      <div class="cp-tabs" role="tablist">
        ${Object.entries(PANES).map(([id, p]) => `<button class="cp-tab" role="tab" data-pane="${id}">${X.icon(p.icon)}<span>${p.title}</span></button>`).join('')}
      </div>
      <span class="cp-grow"></span>
      <button class="tb sm" data-a="tab" title="Ouvrir dans un onglet">${X.icon('external')}</button>
      <button class="tb sm" data-a="close" title="Fermer le panneau (Ctrl+Maj+K)">${X.icon('x')}</button>
    </header>
    <div class="cp-body">
      <div class="cp-wait" hidden><i class="cp-spin"></i><span></span></div>
      <div class="cp-fail" hidden><div class="cp-fail-ic">${X.icon('flame')}</div><b>Impossible de joindre la page</b>
        <small>Pas de connexion ? Les Shox attendent le réseau.</small><button class="cp-retry">Réessayer</button></div>
    </div>`;
  document.body.appendChild(panel);
  const body = $('.cp-body', panel);
  const waitEl = $('.cp-wait', panel);
  const failEl = $('.cp-fail', panel);

  const panes = {}; // id → { wv, ready, loaded, failed }
  let current = null;
  let open = false;

  const settings = () => X.settings() || {};
  const clampW = (w) => Math.max(MIN_W, Math.min(MAX_W, Math.round(+w || DEF_W)));
  // Largeur affichée : la largeur choisie, réduite si la fenêtre est trop étroite pour la page.
  function shownWidth() {
    const want = clampW(settings().claudeWidth);
    return Math.max(Math.min(MIN_W, innerWidth - MIN_PAGE), Math.min(want, innerWidth - MIN_PAGE));
  }
  function layout() {
    const r = views.getBoundingClientRect();
    panel.style.top = Math.round(r.top) + 'px';
    document.body.style.setProperty('--cp-w', shownWidth() + 'px');
  }
  new ResizeObserver(layout).observe(views);
  addEventListener('resize', layout);

  // ------------------------------------------------------------------ webviews du panneau
  function ensurePane(id, url) {
    if (panes[id]) return panes[id];
    const p = PANES[id];
    const wv = document.createElement('webview');
    wv.className = 'cp-view';
    wv.dataset.pane = id;
    wv.setAttribute('allowpopups', '');
    wv.setAttribute('src', url || p.home);
    const st = { wv, ready: false, loaded: false, failed: false, contentsId: null };
    panes[id] = st;
    wv.addEventListener('did-attach', () => { try { st.contentsId = wv.getWebContentsId(); } catch {} });
    wv.addEventListener('dom-ready', () => {
      st.ready = true;
      try { st.contentsId = wv.getWebContentsId(); } catch {}
      // Une question posée pendant le tout premier chargement : on l'envoie maintenant.
      if (st.pending) { const u = st.pending; st.pending = null; wv.loadURL(u).catch(() => {}); }
    });
    wv.addEventListener('did-start-loading', () => { if (!st.loaded) showWait(id); });
    wv.addEventListener('did-stop-loading', () => { st.loaded = true; if (current === id) hideWait(); });
    wv.addEventListener('did-fail-load', (e) => {
      if (!e.isMainFrame || e.errorCode === -3 || e.errorCode === 0) return;
      st.failed = true;
      st.failedUrl = e.validatedURL;
      if (current === id) showFail();
    });
    wv.addEventListener('did-navigate', () => { st.failed = false; if (current === id) failEl.hidden = true; });
    body.appendChild(wv);
    return st;
  }
  function showWait(id) {
    if (current !== id) return;
    waitEl.hidden = false;
    $('span', waitEl).textContent = PANES[id].wait;
  }
  function hideWait() { waitEl.hidden = true; }
  function showFail() { hideWait(); failEl.hidden = false; }
  $('.cp-retry', panel).addEventListener('click', () => {
    const st = panes[current];
    if (!st) return;
    failEl.hidden = true;
    st.loaded = false;
    showWait(current);
    const url = st.failedUrl || PANES[current].home;
    if (st.ready) st.wv.loadURL(url).catch(() => {}); else st.wv.setAttribute('src', url);
  });

  function selectPane(id, url) {
    if (!PANES[id]) id = 'claude';
    current = id;
    const existed = !!panes[id];
    const st = ensurePane(id, url);
    if (url && existed) {
      st.loaded = false;
      showWait(id);
      if (st.ready) st.wv.loadURL(url).catch(() => {}); else st.pending = url;
    }
    for (const [k, p] of Object.entries(panes)) p.wv.classList.toggle('on', k === id);
    panel.querySelectorAll('.cp-tab').forEach((t) => t.classList.toggle('on', t.dataset.pane === id));
    if (st.loaded) hideWait(); else showWait(id);
    failEl.hidden = !st.failed;
    if (settings().claudeTab !== id) X.saveSettings({ claudeTab: id });
  }

  // ------------------------------------------------------------------ ouvrir / fermer
  function setOpen(on, { focus = true, save = true } = {}) {
    open = !!on;
    if (open) {
      layout();
      panel.hidden = false;
      panel.classList.remove('cp-in');
      void panel.offsetWidth;
      panel.classList.add('cp-in');
      if (!current) selectPane(settings().claudeTab || 'claude');
      if (focus) setTimeout(() => panes[current] && panes[current].wv.focus(), 60);
    } else {
      panel.hidden = true;
      if (focus) setTimeout(() => { const a = X.active(); if (a && a.wv) a.wv.focus(); }, 0);
    }
    document.body.classList.toggle('cp-open', open);
    btn.classList.toggle('on', open);
    btn.title = open ? 'Fermer le panneau Claude (Ctrl+Maj+K)' : 'Claude (Ctrl+Maj+K)';
    if (save && settings().claudeOpen !== open) X.saveSettings({ claudeOpen: open });
  }
  const toggle = () => setOpen(!open);

  function ask(text) {
    const q = String(text || '').trim();
    if (!q) { setOpen(true); selectPane('claude'); return; }
    setOpen(true, { focus: false });
    selectPane('claude', askUrl(q));
    setTimeout(() => panes.claude && panes.claude.wv.focus(), 80);
  }

  // ------------------------------------------------------------------ largeur (glisser le bord)
  const grip = $('.cp-grip', panel);
  grip.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    // Un voile au-dessus des pages : sinon les webviews avalent les mouvements de la souris.
    const shield = document.createElement('div');
    shield.className = 'cp-shield';
    document.body.appendChild(shield);
    panel.classList.add('cp-resizing');
    let w = shownWidth();
    const move = (ev) => {
      w = Math.max(MIN_W, Math.min(MAX_W, innerWidth - ev.clientX, innerWidth - MIN_PAGE));
      document.body.style.setProperty('--cp-w', Math.round(w) + 'px');
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      shield.remove();
      panel.classList.remove('cp-resizing');
      X.saveSettings({ claudeWidth: clampW(w) });
      layout();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
  grip.addEventListener('dblclick', () => { X.saveSettings({ claudeWidth: DEF_W }); layout(); });

  // ------------------------------------------------------------------ boutons
  panel.querySelectorAll('.cp-tab').forEach((t) => t.addEventListener('click', () => selectPane(t.dataset.pane)));
  panel.querySelector('[data-a=close]').addEventListener('click', () => setOpen(false));
  panel.querySelector('[data-a=tab]').addEventListener('click', () => {
    const st = panes[current];
    let url = PANES[current || 'claude'].home;
    try { if (st && st.ready && st.wv.getURL()) url = st.wv.getURL(); } catch {}
    X.makeTab({ url });
  });
  btn.addEventListener('click', toggle);

  // Menu contextuel des pages du panneau (le menu des onglets ne les connaît pas).
  S.onGuestContextMenu((contentsId, p) => {
    const st = Object.values(panes).find((x) => x.contentsId === contentsId);
    if (!st) return;
    const wv = st.wv;
    const r = wv.getBoundingClientRect();
    const sel = (p.selectionText || '').trim();
    const items = [];
    if (p.linkURL) {
      items.push({ label: 'Ouvrir le lien dans un nouvel onglet', icon: 'plus', action: () => X.makeTab({ url: p.linkURL, background: true }) });
      items.push({ label: "Copier l'adresse du lien", icon: 'copy', action: () => S.copyText(p.linkURL) });
      items.push({ sep: true });
    }
    if (p.isEditable) {
      const f = p.editFlags || {};
      items.push({ label: 'Couper', kbd: 'Ctrl+X', disabled: !f.canCut, action: () => wv.cut() });
      items.push({ label: 'Copier', icon: 'copy', kbd: 'Ctrl+C', disabled: !f.canCopy, action: () => wv.copy() });
      items.push({ label: 'Coller', kbd: 'Ctrl+V', disabled: !f.canPaste, action: () => wv.paste() });
      items.push({ label: 'Tout sélectionner', kbd: 'Ctrl+A', action: () => wv.selectAll() });
      items.push({ sep: true });
    } else if (sel) {
      items.push({ label: 'Copier', icon: 'copy', kbd: 'Ctrl+C', action: () => wv.copy() });
      items.push({ sep: true });
    }
    items.push({ label: 'Précédente', icon: 'back', disabled: !p.canGoBack, action: () => wv.goBack() });
    items.push({ label: 'Actualiser', icon: 'reload', action: () => wv.reload() });
    items.push({ label: 'Ouvrir dans un onglet', icon: 'external', action: () => X.makeTab({ url: wv.getURL() }) });
    items.push({ sep: true });
    items.push({ label: 'Inspecter', icon: 'code', action: () => wv.inspectElement(p.x, p.y) });
    X.openMenu(items, { x: r.left + p.x, y: r.top + p.y });
  });

  // Bouton « 🔥 Demander à Claude » des résultats Google (vérifié par le processus principal).
  if (window.fsx && fsx.onClaudeAsk) fsx.onClaudeAsk(({ q }) => ask(q));

  X.commands['toggle-claude'] = toggle;

  window.ShoxPanel = {
    ask, askUrl, toggle,
    open: (pane) => { setOpen(true); if (pane) selectPane(pane); },
    close: () => setOpen(false),
    isOpen: () => open,
    pane: () => current,
    view: (id) => (panes[id || current] || {}).wv || null,
  };

  // État mémorisé (ouvert / fermé) : on rouvre sans voler le focus de la page.
  if (settings().claudeOpen) setOpen(true, { focus: false, save: false });
})();
