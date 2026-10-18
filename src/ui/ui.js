// Fire Shox — interface du navigateur : onglets, barre d'adresse, favoris, menus, téléchargements.
'use strict';
(() => {
  const S = window.shell;
  const $ = (s, r = document) => r.querySelector(s);
  const params = new URLSearchParams(location.search);
  const PLATFORM = params.get('platform') || 'win32';
  document.body.classList.add(PLATFORM === 'darwin' ? 'mac' : 'win');

  const HOME = 'fireshox://home/';
  const INTERNAL = [
    { id: 'home', url: 'fireshox://home/', title: 'Accueil Fire Shox', icon: 'flame', cls: 'home', color: '#ff8a00' },
    { id: 'opening', url: 'fireshox://opening/', title: 'Shox Opening', icon: 'package', cls: 'c-opening', color: '#ffb000' },
    { id: 'shoxbench', url: 'fireshox://shoxbench/', title: 'ShoxBench', icon: 'gauge', cls: 'c-bench', color: '#3fd0e8' },
    { id: 'wiki', url: 'fireshox://wiki/', title: 'Wiki Shox', icon: 'book', cls: 'c-wiki', color: '#9aa6ff' },
    { id: 'images', url: 'fireshox://images/', title: 'Images de Monsieur Claude', short: 'Images de M. Claude', icon: 'image', cls: 'c-images', color: '#ff6fae' },
    { id: 'jeux', url: 'fireshox://jeux/', title: 'Jeux vidéo', icon: 'gamepad', cls: 'c-jeux', color: '#5be08a' },
  ];
  const TOOLS = [
    { id: 'history', url: 'fireshox://history/', title: 'Historique', icon: 'history', color: '#c9a0ff' },
    { id: 'downloads', url: 'fireshox://downloads/', title: 'Téléchargements', icon: 'download', color: '#7fd1ff' },
    { id: 'settings', url: 'fireshox://settings/', title: 'Paramètres', icon: 'settings', color: '#ffcf70' },
  ];
  const ENGINES = {
    google: { name: 'Google', url: 'https://www.google.com/search?q=%s' },
    duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
    bing: { name: 'Bing', url: 'https://www.bing.com/search?q=%s' },
    qwant: { name: 'Qwant', url: 'https://www.qwant.com/?q=%s' },
    ecosia: { name: 'Ecosia', url: 'https://www.ecosia.org/search?q=%s' },
    brave: { name: 'Brave Search', url: 'https://search.brave.com/search?q=%s' },
  };
  const ZOOMS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];

  const icon = (name, cls = 'ic') => `<svg class="${cls}"><use href="#i-${name}"/></svg>`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const internalFor = (url) => [...INTERNAL, ...TOOLS].find((p) => url && url.startsWith(p.url.replace(/\/$/, '')));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  // ------------------------------------------------------------------ réglages
  const DEFAULTS = { engine: 'google', startup: 'restore', bookmarksBar: true, sound: true, turbo: false, hideHero: false, hideLogo: false };
  let settings = { ...DEFAULTS, ...(S.get('settings', {}) || {}) };
  function saveSettings(patch) {
    settings = { ...settings, ...patch };
    S.set('settings', settings);
    applySettings();
  }
  function applySettings() {
    document.body.classList.toggle('turbo', !!settings.turbo);
    $('#b-turbo').classList.toggle('on', !!settings.turbo);
    document.body.classList.toggle('no-bookmarks', settings.bookmarksBar === false);
    document.body.classList.toggle('hide-logo', !!settings.hideLogo);
    $('#address').placeholder = `Rechercher sur ${engine().name} ou taper une Shox-Requête…`;
  }
  const engine = () => ENGINES[settings.engine] || ENGINES.google;
  const searchUrl = (q) => engine().url.replace('%s', encodeURIComponent(q));

  let bookmarks = S.get('bookmarks', []) || [];
  let history = S.get('history', []) || [];
  const saveHistory = debounce(() => S.set('history', history.slice(0, 5000)), 800);

  S.onStoreChange((key, value) => {
    if (key === 'settings') { settings = { ...DEFAULTS, ...(value || {}) }; applySettings(); }
    if (key === 'bookmarks') { bookmarks = value || []; renderBookmarks(); updateStar(); }
    if (key === 'history') history = value || [];
  });

  // ------------------------------------------------------------------ onglets
  const tabs = [];
  const closed = [];
  let active = null;
  let seq = 0;
  const views = $('#views');
  const tabsEl = $('#tabs');
  const address = $('#address');

  function titleFor(url) {
    const p = internalFor(url);
    if (p) return p.title;
    try { return new URL(url).host || url; } catch { return url || 'Nouvel onglet'; }
  }

  function makeTab({ url = HOME, title, background = false, index, lazy = false } = {}) {
    const tab = {
      id: ++seq, url, title: title || titleFor(url), favicon: null, loading: false, wv: null, contentsId: null,
      ready: false, audible: false, muted: false, failedUrl: null, crashed: false,
    };
    tab.el = buildTabEl(tab);
    if (index === undefined || index > tabs.length) tabs.push(tab); else tabs.splice(index, 0, tab);
    renderTabOrder();
    renderTab(tab);
    if (!lazy) ensureWebview(tab);
    if (!background || !active) activate(tab);
    saveSession();
    requestAnimationFrame(markNarrow);
    return tab;
  }

  function buildTabEl(tab) {
    const el = document.createElement('div');
    el.className = 'tab opening';
    el.innerHTML = `<span class="fav"></span><span class="title"></span>
      <button class="audio" title="Couper le son de l'onglet">${icon('volume')}</button>
      <button class="close" title="Fermer l'onglet (Ctrl+W)">${icon('x')}</button>`;
    el.addEventListener('animationend', () => { el.classList.remove('opening'); markNarrow(); }, { once: true });
    el.querySelector('.close').addEventListener('click', (e) => { e.stopPropagation(); closeTab(tab); });
    el.querySelector('.close').addEventListener('pointerdown', (e) => e.stopPropagation());
    el.querySelector('.audio').addEventListener('pointerdown', (e) => e.stopPropagation());
    el.querySelector('.audio').addEventListener('click', (e) => { e.stopPropagation(); toggleMute(tab); });
    el.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); closeTab(tab); } });
    el.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); openMenu(tabMenu(tab), { x: e.clientX, y: e.clientY }); });
    el.addEventListener('pointerdown', (e) => startTabDrag(e, tab));
    return el;
  }

  function renderTab(tab) {
    const el = tab.el;
    el.querySelector('.title').textContent = tab.title || 'Nouvel onglet';
    el.title = `${tab.title || ''}\n${shownUrl(tab)}`;
    const fav = el.querySelector('.fav');
    if (tab.loading && !tab.url.startsWith('fireshox://')) fav.innerHTML = '<i class="spinner"></i>';
    else if (tab.crashed) fav.innerHTML = icon('alert');
    else {
      const p = internalFor(tab.url);
      if (p && p.id === 'home') fav.innerHTML = '<img src="../../assets/logo-32.png" alt="">';
      else if (p) fav.innerHTML = `<span style="color:${p.color}">${icon(p.icon)}</span>`;
      else if (tab.favicon) {
        fav.innerHTML = `<img alt="" src="${esc(tab.favicon)}">`;
        fav.querySelector('img').onerror = () => { fav.innerHTML = icon('globe'); };
      } else fav.innerHTML = icon('globe');
    }
    el.classList.toggle('audible', tab.audible && !tab.muted);
    el.classList.toggle('muted', tab.muted);
    el.querySelector('.audio').innerHTML = icon(tab.muted ? 'mute' : 'volume');
  }

  function renderTabOrder() {
    const plus = $('#newtab');
    for (const t of tabs) tabsEl.insertBefore(t.el, plus);
  }

  function markNarrow() {
    for (const t of tabs) if (!t.el.classList.contains('opening')) t.el.classList.toggle('narrow', t.el.offsetWidth < 84);
  }
  new ResizeObserver(markNarrow).observe(tabsEl);

  function ensureWebview(tab) {
    if (tab.wv) return tab.wv;
    const wv = document.createElement('webview');
    wv.setAttribute('allowpopups', '');
    wv.setAttribute('src', tab.url);
    tab.wv = wv;
    wireWebview(tab, wv);
    views.appendChild(wv);
    if (tab === active) wv.classList.add('active');
    return wv;
  }

  function wireWebview(tab, wv) {
    wv.addEventListener('did-attach', () => { try { tab.contentsId = wv.getWebContentsId(); } catch {} });
    wv.addEventListener('dom-ready', () => {
      tab.ready = true;
      try { tab.contentsId = wv.getWebContentsId(); } catch {}
      if (tab.muted) wv.setAudioMuted(true);
      updateNav(tab);
      if (tab === active) updateZoomBadge();
    });
    wv.addEventListener('did-start-loading', () => {
      tab.loading = true; tab.crashed = false; renderTab(tab);
      if (tab === active) { progressStart(); updateReload(); }
    });
    wv.addEventListener('did-stop-loading', () => {
      tab.loading = false; renderTab(tab); updateNav(tab);
      if (tab === active) { progressDone(); updateReload(); }
    });
    wv.addEventListener('did-navigate', (e) => onNavigate(tab, e.url, true));
    wv.addEventListener('did-navigate-in-page', (e) => { if (e.isMainFrame) onNavigate(tab, e.url, false); });
    wv.addEventListener('page-title-updated', (e) => {
      tab.title = e.title || titleFor(tab.url);
      renderTab(tab);
      const h = history[0];
      if (h && h.url === tab.url) { h.title = tab.title; saveHistory(); }
      if (tab === active) document.title = `${tab.title} — Fire Shox`;
      saveSession();
    });
    wv.addEventListener('page-favicon-updated', (e) => {
      tab.favicon = (e.favicons || [])[0] || null;
      renderTab(tab);
      const h = history[0];
      if (h && h.url === tab.url && tab.favicon && /^https?:/.test(tab.favicon)) { h.fav = tab.favicon; saveHistory(); }
    });
    wv.addEventListener('did-fail-load', (e) => {
      if (!e.isMainFrame || e.errorCode === -3 || e.errorCode === 0) return;
      tab.failedUrl = e.validatedURL;
      const q = new URLSearchParams({ code: String(e.errorCode), url: e.validatedURL, desc: e.errorDescription || '' });
      wv.loadURL('fireshox://error/?' + q).catch(() => {});
    });
    wv.addEventListener('update-target-url', (e) => { if (tab === active) showStatus(e.url); });
    wv.addEventListener('media-started-playing', () => setTimeout(() => checkAudio(tab), 250));
    wv.addEventListener('media-paused', () => setTimeout(() => checkAudio(tab), 250));
    wv.addEventListener('found-in-page', (e) => { if (tab === active) showFindResult(e.result); });
    wv.addEventListener('enter-html-full-screen', () => document.body.classList.add('html-fullscreen'));
    wv.addEventListener('leave-html-full-screen', () => document.body.classList.remove('html-fullscreen'));
    wv.addEventListener('render-process-gone', () => { tab.crashed = true; tab.loading = false; renderTab(tab); showCrash(tab); });
    wv.addEventListener('close', () => closeTab(tab));
  }

  function onNavigate(tab, url, full) {
    tab.url = url;
    if (!url.startsWith('fireshox://error/')) tab.failedUrl = null;
    tab.crashed = false;
    hideCrash(tab);
    updateNav(tab);
    renderTab(tab);
    if (tab === active) { syncAddress(); updateStar(); updateGuard(); updateZoomBadge(); }
    if (full) addHistory(url, tab.title);
    saveSession();
  }

  function shownUrl(tab) {
    return tab.url.startsWith('fireshox://error/') && tab.failedUrl ? tab.failedUrl : tab.url;
  }

  function activate(tab) {
    if (!tab) return;
    const changed = active !== tab;
    active = tab;
    ensureWebview(tab);
    for (const t of tabs) {
      t.el.classList.toggle('active', t === tab);
      if (t.wv) t.wv.classList.toggle('active', t === tab);
      if (t.crashEl) t.crashEl.hidden = t !== tab;
    }
    document.title = `${tab.title} — Fire Shox`;
    syncAddress(true);
    updateStar(); updateGuard(); updateNav(tab); updateZoomBadge(); updateReload();
    if (tab.loading) progressStart(); else progressHide();
    showStatus('');
    if (changed) { closeFind(); saveSession(); }
    if (tab.url === HOME && changed) setTimeout(() => { address.focus(); address.select(); }, 30);
    else if (changed) { if (document.activeElement === address) address.blur(); setTimeout(() => tab.wv.focus(), 0); }
  }

  function closeTab(tab) {
    const i = tabs.indexOf(tab);
    if (i < 0) return;
    closed.push({ url: shownUrl(tab), title: tab.title, index: i });
    if (closed.length > 25) closed.shift();
    tabs.splice(i, 1);
    tab.el.remove();
    if (tab.wv) tab.wv.remove();
    if (tab.crashEl) tab.crashEl.remove();
    if (!tabs.length) { saveSessionNow(); window.close(); return; }
    if (active === tab) { active = null; activate(tabs[Math.min(i, tabs.length - 1)]); }
    saveSession();
    requestAnimationFrame(markNarrow);
  }

  function reopenTab() {
    const c = closed.pop();
    if (c) makeTab({ url: c.url, title: c.title, index: c.index });
  }

  function toggleMute(tab) {
    tab.muted = !tab.muted;
    if (tab.wv && tab.ready) tab.wv.setAudioMuted(tab.muted);
    renderTab(tab);
  }

  function checkAudio(tab) {
    if (!tab.wv || !tab.ready) return;
    try { tab.audible = tab.wv.isCurrentlyAudible(); } catch { tab.audible = false; }
    renderTab(tab);
  }
  setInterval(() => { for (const t of tabs) if (t.audible) checkAudio(t); }, 1500);

  function showCrash(tab) {
    if (!tab.crashEl) {
      tab.crashEl = document.createElement('div');
      tab.crashEl.className = 'crashed';
      tab.crashEl.innerHTML = `<div><div class="big">🔥</div><h2>Aïe, cet onglet a brûlé</h2>
        <p>La page a pris feu (plantage). Les Shox sont intactes.</p><button class="btn-fire">Rallumer l'onglet</button></div>`;
      tab.crashEl.querySelector('button').onclick = () => { hideCrash(tab); tab.wv.reload(); };
      views.appendChild(tab.crashEl);
    }
    tab.crashEl.hidden = tab !== active;
  }
  function hideCrash(tab) { if (tab.crashEl) { tab.crashEl.remove(); tab.crashEl = null; } }

  // Glisser-déposer pour réordonner les onglets
  function startTabDrag(e, tab) {
    if (e.button !== 0) return;
    activate(tab);
    const startX = e.clientX;
    const from = tabs.indexOf(tab);
    const rects = tabs.map((t) => t.el.getBoundingClientRect());
    const w = rects[from].width;
    let dragging = false;
    let target = from;
    const move = (ev) => {
      const dx = ev.clientX - startX;
      if (!dragging && Math.abs(dx) > 6) {
        dragging = true;
        tab.el.classList.add('dragging');
        try { tab.el.setPointerCapture(e.pointerId); } catch {}
      }
      if (!dragging) return;
      const min = rects[0].left - rects[from].left;
      const max = rects[rects.length - 1].right - rects[from].right;
      const cdx = Math.max(min, Math.min(max, dx));
      tab.el.style.transform = `translateX(${cdx}px)`;
      const center = rects[from].left + w / 2 + cdx;
      target = from;
      rects.forEach((r, i) => {
        const c = r.left + r.width / 2;
        if (i < from && center < c) target = Math.min(target, i);
        if (i > from && center > c) target = Math.max(target, i);
      });
      tabs.forEach((t, i) => {
        if (t === tab) return;
        let shift = 0;
        if (from < target && i > from && i <= target) shift = -(w + 2);
        if (from > target && i < from && i >= target) shift = w + 2;
        t.el.style.transition = 'transform .15s ease';
        t.el.style.transform = shift ? `translateX(${shift}px)` : '';
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!dragging) return;
      for (const t of tabs) { t.el.style.transform = ''; t.el.style.transition = ''; }
      tab.el.classList.remove('dragging');
      if (target !== from) {
        tabs.splice(from, 1);
        tabs.splice(target, 0, tab);
        renderTabOrder();
        saveSession();
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  // ------------------------------------------------------------------ navigation
  function navigate(url, tab = active) {
    if (!tab || !url) return;
    ensureWebview(tab);
    if (tab.ready) tab.wv.loadURL(url).catch(() => {});
    else tab.wv.setAttribute('src', url);
    tab.url = url;
    if (tab === active) { syncAddress(true); updateGuard(); setTimeout(() => tab.wv.focus(), 0); }
  }

  function resolveInput(text) {
    const t = text.trim();
    if (!t) return null;
    if (/^(https?|fireshox|file|about|view-source|data):/i.test(t)) return t;
    if (/^[a-z]:[\\/]/i.test(t)) return 'file:///' + t.replace(/\\/g, '/');
    if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/.*)?$/i.test(t)) return 'http://' + t;
    if (!/\s/.test(t) && /^[^/?#\s]+\.[a-z][a-z0-9-]{1,62}(:\d+)?([/?#].*)?$/i.test(t)) return 'https://' + t;
    const p = INTERNAL.find((x) => x.id === t.toLowerCase());
    if (p) return p.url;
    return searchUrl(t);
  }

  function updateNav(tab) {
    if (tab !== active) return;
    let back = false, fwd = false;
    if (tab.wv && tab.ready) { try { back = tab.wv.canGoBack(); fwd = tab.wv.canGoForward(); } catch {} }
    $('#b-back').disabled = !back;
    $('#b-forward').disabled = !fwd;
  }

  function updateReload() {
    const loading = active && active.loading;
    $('#b-reload').innerHTML = icon(loading ? 'x' : 'reload');
    $('#b-reload').title = loading ? 'Arrêter le chargement (Échap)' : 'Actualiser (F5)';
  }

  function reload(hard) {
    const t = active;
    if (!t || !t.wv) return;
    if (t.loading) { t.wv.stop(); return; }
    if (t.failedUrl) { navigate(t.failedUrl, t); return; }
    if (hard) t.wv.reloadIgnoringCache(); else t.wv.reload();
  }

  // ------------------------------------------------------------------ historique
  function addHistory(url, title) {
    if (/^(fireshox:\/\/(error|home)\/|about:|data:|view-source:|blob:|devtools:)/i.test(url)) return;
    const now = Date.now();
    const top = history[0];
    if (top && top.url === url && now - top.t < 60000) { top.t = now; }
    else history.unshift({ url, title: title || titleFor(url), t: now });
    if (history.length > 5000) history.length = 5000;
    saveHistory();
  }

  // ------------------------------------------------------------------ barre d'adresse
  const omnibox = $('#omnibox');
  const suggestEl = $('#suggest');
  let suggestions = [];
  let sel = 0;
  let editing = false;

  function displayUrl(url) {
    if (!url) return '';
    if (url.startsWith('fireshox://')) return url.replace(/\/$/, '');
    try {
      const u = new URL(url);
      if (u.protocol === 'https:') return u.host + (u.pathname === '/' && !u.search && !u.hash ? '' : u.pathname) + u.search + u.hash;
    } catch {}
    return url;
  }

  function syncAddress(force) {
    if (!active) return;
    if (document.activeElement === address && editing && !force) return;
    editing = false;
    const url = shownUrl(active);
    address.value = document.activeElement === address ? url.replace(/^fireshox:\/\/([\w-]+)\/$/, 'fireshox://$1') : displayUrl(url);
    hideSuggest();
  }

  address.addEventListener('focus', () => {
    omnibox.classList.add('focus');
    if (active && !editing) address.value = shownUrl(active).replace(/^fireshox:\/\/([\w-]+)\/$/, 'fireshox://$1');
    setTimeout(() => address.select(), 0);
  });
  address.addEventListener('blur', () => {
    omnibox.classList.remove('focus');
    setTimeout(() => { if (document.activeElement !== address) { editing = false; hideSuggest(); if (active) address.value = displayUrl(shownUrl(active)); } }, 120);
  });
  address.addEventListener('input', () => { editing = true; buildSuggest(address.value); });
  address.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && suggestions.length) { e.preventDefault(); sel = (sel + 1) % suggestions.length; paintSuggest(); return; }
    if (e.key === 'ArrowUp' && suggestions.length) { e.preventDefault(); sel = (sel - 1 + suggestions.length) % suggestions.length; paintSuggest(); return; }
    if (e.key === 'Escape') {
      if (!suggestEl.hidden) { hideSuggest(); return; }
      editing = false; syncAddress(true); active?.wv?.focus(); return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      let url;
      if (e.ctrlKey && !/[\s./]/.test(address.value.trim())) url = `https://www.${address.value.trim()}.com`;
      else url = (suggestions.length && !suggestEl.hidden ? suggestions[sel].url : null) || resolveInput(address.value);
      if (!url) return;
      editing = false;
      hideSuggest();
      if (e.altKey) makeTab({ url }); else navigate(url);
      address.blur();
    }
  });

  function buildSuggest(q) {
    const t = q.trim();
    suggestions = [];
    sel = 0;
    if (!t) { hideSuggest(); return; }
    const target = resolveInput(t);
    const isSearch = target === searchUrl(t);
    const inner = internalFor(target);
    if (isSearch) suggestions.push({ icon: 'search', title: t, sub: `Rechercher sur ${engine().name}`, url: target });
    else if (inner && /^fireshox:/.test(target)) suggestions.push({ icon: inner.icon, color: inner.color, title: inner.title, sub: target.replace(/\/$/, ''), url: target });
    else suggestions.push({ icon: 'globe', title: t, sub: 'Aller à l\'adresse', url: target });
    if (!isSearch && !/^[a-z-]+:/i.test(t)) suggestions.push({ icon: 'search', title: t, sub: `Rechercher sur ${engine().name}`, url: searchUrl(t) });
    const low = t.toLowerCase();
    const seen = new Set(suggestions.map((s) => s.url));
    const add = (s) => { if (!seen.has(s.url) && suggestions.length < 8) { seen.add(s.url); suggestions.push(s); } };
    for (const p of [...INTERNAL, ...TOOLS]) {
      if (p.title.toLowerCase().includes(low) || p.id.includes(low) || p.url.includes(low)) add({ icon: p.icon, color: p.color, title: p.title, sub: p.url.replace(/\/$/, ''), url: p.url });
    }
    for (const b of bookmarks) {
      if ((b.title || '').toLowerCase().includes(low) || b.url.toLowerCase().includes(low)) add({ icon: 'star', title: b.title, sub: displayUrl(b.url), url: b.url });
    }
    const scored = new Map();
    for (const h of history.slice(0, 3000)) {
      const hit = (h.title || '').toLowerCase().includes(low) || h.url.toLowerCase().includes(low);
      if (!hit) continue;
      const s = scored.get(h.url) || { h, n: 0 };
      s.n++;
      scored.set(h.url, s);
    }
    [...scored.values()].sort((a, b) => b.n - a.n || b.h.t - a.h.t).slice(0, 6)
      .forEach(({ h }) => add({ icon: 'history', title: h.title || displayUrl(h.url), sub: displayUrl(h.url), url: h.url }));
    paintSuggest();
  }

  function paintSuggest() {
    if (!suggestions.length) { hideSuggest(); return; }
    suggestEl.innerHTML = suggestions.map((s, i) => `<div class="sg${i === sel ? ' sel' : ''}" data-i="${i}">
      <span style="${s.color ? `color:${s.color}` : ''}">${icon(s.icon)}</span><span class="sg-t">${esc(s.title)}</span><span class="sg-u">${esc(s.sub)}</span></div>`).join('');
    suggestEl.hidden = false;
    omnibox.classList.add('suggesting');
  }
  function hideSuggest() { suggestEl.hidden = true; omnibox.classList.remove('suggesting'); }
  suggestEl.addEventListener('mousedown', (e) => {
    const row = e.target.closest('.sg');
    if (!row) return;
    e.preventDefault();
    const s = suggestions[+row.dataset.i];
    editing = false; hideSuggest(); address.blur();
    if (e.button === 1 || e.ctrlKey) makeTab({ url: s.url, background: true }); else navigate(s.url);
  });

  // ShoxGuard (sécurité de la connexion)
  function updateGuard() {
    const g = $('#guard');
    const url = active ? shownUrl(active) : '';
    g.className = 'guard';
    let ic = 'flame', label = 'ShoxGuard';
    if (url.startsWith('http:')) { g.classList.add('insecure'); ic = 'alert'; label = 'Non sécurisé'; }
    else if (url.startsWith('file:')) { g.classList.add('file'); ic = 'file'; label = 'Fichier'; }
    else if (url.startsWith('fireshox:')) { label = 'Fire Shox'; }
    else if (!url.startsWith('https:')) { g.classList.add('neutral'); ic = 'info'; label = 'ShoxGuard'; }
    g.innerHTML = `${icon(ic)}<span>${label}</span>`;
  }
  $('#guard').addEventListener('click', (e) => {
    const url = active ? shownUrl(active) : '';
    let origin = '';
    try { origin = new URL(url).origin; } catch {}
    let head, text;
    if (url.startsWith('https:')) { head = '<span class="ok">Connexion sécurisée</span>'; text = 'Les données envoyées à ce site sont chiffrées. ShoxGuard veille, ressorts tendus.'; }
    else if (url.startsWith('http:')) { head = '<span class="bad">Connexion non sécurisée</span>'; text = "Évite d'entrer des mots de passe ou des infos bancaires ici : rien n'est chiffré."; }
    else if (url.startsWith('fireshox:')) { head = '<span class="ok">Page interne Fire Shox</span>'; text = 'Page 100 % incandescente, servie directement par le navigateur.'; }
    else { head = 'Page locale'; text = 'Cette page est un fichier ou une page spéciale.'; }
    const saved = S.get('permissions', {}) || {};
    const perms = Object.keys(saved).filter((k) => origin && k.startsWith(origin + '|'));
    const pop = openPop(`<div class="guard-pop"><h3>${icon('flame')} ShoxGuard</h3><p><b>${head}</b><br>${esc(text)}</p>
      ${perms.length ? `<p>Autorisations enregistrées : ${perms.map((k) => esc(k.split('|')[1]) + (saved[k] ? ' ✔' : ' ✖')).join(', ')}</p>
      <div class="pop-foot"><button class="link-btn" data-reset>Réinitialiser les autorisations</button></div>` : ''}</div>`, e.currentTarget, 'left');
    pop.querySelector('[data-reset]')?.addEventListener('click', () => {
      const next = { ...saved }; perms.forEach((k) => delete next[k]); S.set('permissions', next); closeLayer(); toast('Autorisations réinitialisées');
    });
  });

  // ------------------------------------------------------------------ favoris
  const bmEl = $('#bookmarks');
  function renderBookmarks() {
    const html = INTERNAL.map((p) => `<button class="bm ${p.cls}" data-url="${p.url}" title="${esc(p.title)}">${p.id === 'home' ? icon('flame') : icon(p.icon)}<span>${esc(p.short || p.title)}</span></button>`).join('')
      + (bookmarks.length ? '<span class="bm-sep"></span>' : '')
      + bookmarks.map((b) => `<button class="bm" data-id="${b.id}" data-url="${esc(b.url)}" title="${esc(b.title)}\n${esc(b.url)}">${b.fav ? `<img src="${esc(b.fav)}" alt="">` : icon('globe')}<span>${esc(b.title || displayUrl(b.url))}</span></button>`).join('')
      + `<button class="bm bm-more" hidden title="Autres favoris">${icon('chev')}</button>`;
    bmEl.innerHTML = html;
    bmEl.querySelectorAll('img').forEach((img) => { img.onerror = () => img.replaceWith(Object.assign(document.createElement('span'), { innerHTML: icon('globe') })); });
    fitBookmarks();
  }
  function fitBookmarks() {
    const items = [...bmEl.querySelectorAll('.bm:not(.bm-more)')];
    const more = bmEl.querySelector('.bm-more');
    items.forEach((i) => { i.hidden = false; });
    more.hidden = true;
    const limit = bmEl.clientWidth - 46;
    let hiddenAny = false;
    for (const it of items) if (it.offsetLeft + it.offsetWidth > limit) { it.hidden = true; hiddenAny = true; }
    more.hidden = !hiddenAny;
  }
  new ResizeObserver(() => fitBookmarks()).observe(bmEl);
  bmEl.addEventListener('click', (e) => {
    const b = e.target.closest('.bm');
    if (!b) return;
    if (b.classList.contains('bm-more')) {
      const hidden = [...bmEl.querySelectorAll('.bm[hidden]')];
      openMenu(hidden.map((h) => ({ label: h.textContent.trim(), icon: 'star', action: () => navigate(h.dataset.url) })), { anchor: b, align: 'right' });
      return;
    }
    if (e.ctrlKey) makeTab({ url: b.dataset.url, background: true }); else navigate(b.dataset.url);
  });
  bmEl.addEventListener('auxclick', (e) => { const b = e.target.closest('.bm[data-url]'); if (b && e.button === 1) makeTab({ url: b.dataset.url, background: true }); });
  bmEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const b = e.target.closest('.bm[data-url]');
    const items = [];
    if (b) {
      items.push({ label: 'Ouvrir dans un nouvel onglet', icon: 'plus', action: () => makeTab({ url: b.dataset.url, background: true }) });
      items.push({ label: 'Ouvrir dans une nouvelle fenêtre', icon: 'window', action: () => S.newWindow([b.dataset.url]) });
      items.push({ label: "Copier l'adresse", icon: 'copy', action: () => S.copyText(b.dataset.url) });
      if (b.dataset.id) {
        items.push({ sep: true });
        items.push({ label: 'Modifier…', icon: 'settings', action: () => editBookmark(b.dataset.id) });
        items.push({ label: 'Supprimer', icon: 'trash', action: () => { bookmarks = bookmarks.filter((x) => String(x.id) !== b.dataset.id); S.set('bookmarks', bookmarks); renderBookmarks(); updateStar(); } });
      }
      items.push({ sep: true });
    }
    items.push({ label: 'Ajouter cette page aux favoris', icon: 'star', action: toggleBookmark });
    items.push({ label: 'Afficher la barre de favoris', check: settings.bookmarksBar !== false, action: () => saveSettings({ bookmarksBar: settings.bookmarksBar === false }) });
    openMenu(items, { x: e.clientX, y: e.clientY });
  });

  function updateStar() {
    const url = active ? shownUrl(active) : '';
    const on = !!bookmarks.find((b) => b.url === url) || !!INTERNAL.find((p) => p.url === url);
    $('#b-star').classList.toggle('on', on);
    $('#b-star').title = on ? 'Dans vos favoris' : 'Ajouter aux favoris (Ctrl+D)';
  }
  function toggleBookmark() {
    if (!active) return;
    const url = shownUrl(active);
    if (INTERNAL.find((p) => p.url === url)) { toast('Ce site Fire Shox est déjà dans la barre 🔥'); return; }
    const existing = bookmarks.find((b) => b.url === url);
    if (existing) {
      bookmarks = bookmarks.filter((b) => b !== existing);
      toast('Retiré des favoris');
    } else {
      const fav = active.favicon && /^(https?|fireshox):/.test(active.favicon) ? active.favicon : null;
      bookmarks.push({ id: Date.now(), title: active.title || displayUrl(url), url, fav });
      toast('Ajouté aux favoris ⭐');
    }
    S.set('bookmarks', bookmarks);
    renderBookmarks(); updateStar();
  }
  function editBookmark(id) {
    const b = bookmarks.find((x) => String(x.id) === String(id));
    if (!b) return;
    const d = openDialog(`<h3>Modifier le favori</h3><label>Nom</label><input data-n value="${esc(b.title)}"><label>Adresse</label><input data-u value="${esc(b.url)}">
      <div class="row"><button data-c>Annuler</button><button class="primary" data-ok>Enregistrer</button></div>`);
    const save = () => {
      b.title = d.querySelector('[data-n]').value.trim() || b.title;
      b.url = resolveInput(d.querySelector('[data-u]').value) || b.url;
      S.set('bookmarks', bookmarks); renderBookmarks(); updateStar(); closeLayer();
    };
    d.querySelector('[data-ok]').onclick = save;
    d.querySelector('[data-c]').onclick = closeLayer;
    d.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
    setTimeout(() => d.querySelector('[data-n]').select(), 20);
  }

  // ------------------------------------------------------------------ calques : menus, popovers, dialogues
  const layer = $('#layer');
  function closeLayer() { layer.innerHTML = ''; }
  function scrim() {
    closeLayer();
    const s = document.createElement('div');
    s.className = 'scrim';
    s.addEventListener('mousedown', closeLayer);
    s.addEventListener('contextmenu', (e) => { e.preventDefault(); closeLayer(); });
    layer.appendChild(s);
  }
  function place(el, { x, y, anchor, align = 'right' }) {
    layer.appendChild(el);
    const w = el.offsetWidth, h = el.offsetHeight;
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      y = r.bottom + 6;
      x = align === 'right' ? r.right - w : r.left;
    }
    x = Math.max(6, Math.min(x, innerWidth - w - 6));
    if (y + h > innerHeight - 6) y = Math.max(6, (anchor ? anchor.getBoundingClientRect().top - h - 6 : innerHeight - h - 6));
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  }
  function openMenu(items, pos) {
    scrim();
    const m = document.createElement('div');
    m.className = 'menu';
    for (const it of items) {
      if (it.sep) { m.insertAdjacentHTML('beforeend', '<div class="msep"></div>'); continue; }
      if (it.html) { const d = document.createElement('div'); d.innerHTML = it.html; it.bind && it.bind(d); m.appendChild(d); continue; }
      const b = document.createElement('button');
      b.className = 'mi';
      b.disabled = !!it.disabled;
      b.innerHTML = `${it.icon ? icon(it.icon) : '<span style="width:16px"></span>'}<span class="mi-l">${esc(it.label)}</span>`
        + (it.kbd ? `<span class="kbd">${esc(it.kbd)}</span>` : '')
        + (it.check !== undefined ? `<span class="check${it.check ? ' on' : ''}"></span>` : '');
      b.addEventListener('click', () => { if (!it.keepOpen) closeLayer(); it.action && it.action(); if (it.keepOpen) { b.querySelector('.check')?.classList.toggle('on'); } });
      m.appendChild(b);
    }
    place(m, pos);
    return m;
  }
  function openPop(html, anchor, align = 'right') {
    scrim();
    const p = document.createElement('div');
    p.className = 'pop';
    p.innerHTML = html;
    place(p, { anchor, align });
    return p;
  }
  function openDialog(html) {
    scrim();
    const d = document.createElement('div');
    d.className = 'dialog';
    d.innerHTML = html;
    layer.appendChild(d);
    return d;
  }
  let toastTimer;
  function toast(text) {
    document.querySelectorAll('body > .toast').forEach((t) => t.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 2200);
  }

  // Menu contextuel des onglets
  function tabMenu(tab) {
    const i = tabs.indexOf(tab);
    return [
      { label: 'Nouvel onglet à droite', icon: 'plus', action: () => makeTab({ url: HOME, index: i + 1 }) },
      { sep: true },
      { label: 'Actualiser', icon: 'reload', kbd: 'F5', action: () => { activate(tab); reload(); } },
      { label: 'Dupliquer', icon: 'copy', action: () => makeTab({ url: shownUrl(tab), index: i + 1 }) },
      { label: tab.muted ? 'Réactiver le son du site' : 'Couper le son du site', icon: tab.muted ? 'volume' : 'mute', action: () => toggleMute(tab) },
      { sep: true },
      { label: "Fermer l'onglet", icon: 'x', kbd: 'Ctrl+W', action: () => closeTab(tab) },
      { label: 'Fermer les autres onglets', disabled: tabs.length < 2, action: () => tabs.filter((t) => t !== tab).forEach(closeTab) },
      { label: 'Fermer les onglets à droite', disabled: i === tabs.length - 1, action: () => tabs.slice(i + 1).forEach(closeTab) },
      { sep: true },
      { label: "Rouvrir l'onglet fermé", icon: 'history', kbd: 'Ctrl+Maj+T', disabled: !closed.length, action: reopenTab },
    ];
  }

  // Menu contextuel des pages (clic droit dans un site)
  S.onGuestContextMenu((contentsId, p) => {
    const tab = tabs.find((t) => t.contentsId === contentsId);
    if (!tab || !tab.wv) return;
    const wv = tab.wv;
    const r = wv.getBoundingClientRect();
    const items = [];
    const sel = (p.selectionText || '').trim();
    if (p.misspelledWord) {
      (p.dictionarySuggestions || []).slice(0, 5).forEach((s) => items.push({ label: s, action: () => wv.replaceMisspelling(s) }));
      items.push({ label: 'Ajouter au dictionnaire', icon: 'book', action: () => S.guestOp(contentsId, 'addWord', p.misspelledWord) });
      items.push({ sep: true });
    }
    if (p.linkURL) {
      items.push({ label: 'Ouvrir le lien dans un nouvel onglet', icon: 'plus', action: () => makeTab({ url: p.linkURL, background: true, index: tabs.indexOf(tab) + 1 }) });
      items.push({ label: 'Ouvrir le lien dans une nouvelle fenêtre', icon: 'window', action: () => S.newWindow([p.linkURL]) });
      items.push({ label: "Copier l'adresse du lien", icon: 'copy', action: () => S.copyText(p.linkURL) });
      items.push({ sep: true });
    }
    if (p.mediaType === 'image' && p.srcURL) {
      items.push({ label: "Ouvrir l'image dans un nouvel onglet", icon: 'image', action: () => makeTab({ url: p.srcURL, background: true, index: tabs.indexOf(tab) + 1 }) });
      items.push({ label: "Enregistrer l'image", icon: 'download', action: () => S.guestOp(contentsId, 'saveImage', p.srcURL) });
      items.push({ label: "Copier l'image", icon: 'copy', action: () => S.guestOp(contentsId, 'copyImageAt', p.x, p.y) });
      items.push({ label: "Copier l'adresse de l'image", action: () => S.copyText(p.srcURL) });
      items.push({ sep: true });
    }
    if (p.isEditable) {
      const f = p.editFlags || {};
      items.push({ label: 'Annuler', kbd: 'Ctrl+Z', disabled: !f.canUndo, action: () => wv.undo() });
      items.push({ label: 'Rétablir', kbd: 'Ctrl+Y', disabled: !f.canRedo, action: () => wv.redo() });
      items.push({ sep: true });
      items.push({ label: 'Couper', kbd: 'Ctrl+X', disabled: !f.canCut, action: () => wv.cut() });
      items.push({ label: 'Copier', icon: 'copy', kbd: 'Ctrl+C', disabled: !f.canCopy, action: () => wv.copy() });
      items.push({ label: 'Coller', kbd: 'Ctrl+V', disabled: !f.canPaste, action: () => wv.paste() });
      items.push({ label: 'Tout sélectionner', kbd: 'Ctrl+A', action: () => wv.selectAll() });
      items.push({ sep: true });
    } else if (sel) {
      items.push({ label: 'Copier', icon: 'copy', kbd: 'Ctrl+C', action: () => wv.copy() });
      items.push({ label: `Rechercher « ${sel.length > 26 ? sel.slice(0, 26) + '…' : sel} » sur ${engine().name}`, icon: 'search', action: () => makeTab({ url: searchUrl(sel), index: tabs.indexOf(tab) + 1 }) });
      items.push({ sep: true });
    }
    if (!p.linkURL && !p.isEditable && !sel && p.mediaType !== 'image') {
      items.push({ label: 'Précédente', icon: 'back', kbd: 'Alt+←', disabled: !p.canGoBack, action: () => wv.goBack() });
      items.push({ label: 'Suivante', icon: 'forward', kbd: 'Alt+→', disabled: !p.canGoForward, action: () => wv.goForward() });
      items.push({ label: 'Actualiser', icon: 'reload', kbd: 'F5', action: () => wv.reload() });
      items.push({ sep: true });
      items.push({ label: 'Imprimer…', icon: 'printer', kbd: 'Ctrl+P', action: () => wv.print() });
      if (/^https?:/.test(tab.url)) items.push({ label: 'Afficher le code source', icon: 'code', kbd: 'Ctrl+U', action: () => makeTab({ url: 'view-source:' + tab.url, index: tabs.indexOf(tab) + 1 }) });
      items.push({ sep: true });
    }
    items.push({ label: 'Inspecter', icon: 'code', action: () => wv.inspectElement(p.x, p.y) });
    openMenu(items, { x: r.left + p.x, y: r.top + p.y });
  });

  // Menu principal (avatar)
  function zoomOf(tab) { try { return tab && tab.ready ? tab.wv.getZoomFactor() : 1; } catch { return 1; } }
  function mainMenu() {
    const z = Math.round(zoomOf(active) * 100);
    openMenu([
      { html: `<div class="mhead"><img src="../../assets/logo-64.png" alt=""><div><b>Fire Shox</b><small>100 % incandescent · amorti gravitationnel</small></div></div>` },
      { label: 'Nouvel onglet', icon: 'plus', kbd: 'Ctrl+T', action: () => newTab() },
      { label: 'Nouvelle fenêtre', icon: 'window', kbd: 'Ctrl+N', action: () => S.newWindow([]) },
      { sep: true },
      { label: 'Historique', icon: 'history', kbd: 'Ctrl+H', action: () => openTool('history') },
      { label: 'Téléchargements', icon: 'download', kbd: 'Ctrl+J', action: () => openTool('downloads') },
      { label: 'Ajouter cette page aux favoris', icon: 'star', kbd: 'Ctrl+D', action: toggleBookmark },
      { sep: true },
      { html: `<div class="mzoom"><span class="mi-l">Zoom</span><button data-z="-1">−</button><output>${z} %</output><button data-z="1">+</button><button data-z="f" title="Plein écran (F11)">⛶</button></div>`,
        bind: (d) => d.querySelectorAll('[data-z]').forEach((b) => b.addEventListener('click', () => {
          if (b.dataset.z === 'f') { closeLayer(); S.fullscreen(); return; }
          zoomStep(+b.dataset.z);
          d.querySelector('output').textContent = Math.round(zoomOf(active) * 100) + ' %';
        })) },
      { sep: true },
      { label: 'Rechercher dans la page', icon: 'search', kbd: 'Ctrl+F', action: openFind },
      { label: 'Imprimer…', icon: 'printer', kbd: 'Ctrl+P', action: () => active?.wv?.print() },
      { label: 'Outils de développement', icon: 'code', kbd: 'F12', action: toggleDevtools },
      { sep: true },
      { label: 'Mode Turbo Shox', icon: 'zap', check: !!settings.turbo, action: toggleTurbo },
      { label: "Masquer l'image Fire Shox (accueil)", icon: 'eyeoff', check: !!settings.hideHero, action: () => saveSettings({ hideHero: !settings.hideHero }) },
      { label: 'Masquer le logo de la barre', icon: 'eyeoff', check: !!settings.hideLogo, action: () => saveSettings({ hideLogo: !settings.hideLogo }) },
      { sep: true },
      { label: 'Paramètres', icon: 'settings', action: () => openTool('settings') },
      { label: 'À propos de Fire Shox', icon: 'info', action: () => openUrlInTab('fireshox://settings/#about') },
      { label: 'Quitter Fire Shox', icon: 'power', action: () => window.close() },
    ], { anchor: $('#b-menu'), align: 'right' });
  }

  function appsPop() {
    const all = [...INTERNAL, ...TOOLS];
    const pop = openPop(`<h3>${icon('flame')} Sites Fire Shox</h3><div class="apps">${all.map((p) =>
      `<button class="app" data-url="${p.url}" style="--c:${p.color}"><i>${icon(p.icon)}</i>${esc(p.short || p.title)}</button>`).join('')}</div>`, $('#b-apps'));
    pop.querySelectorAll('.app').forEach((a) => a.addEventListener('click', (e) => { closeLayer(); if (e.ctrlKey) makeTab({ url: a.dataset.url, background: true }); else openUrlInTab(a.dataset.url); }));
  }

  // Ouvre une adresse : dans l'onglet courant s'il est sur l'accueil, sinon dans un nouvel onglet.
  function openUrlInTab(url) {
    const existing = tabs.find((t) => t.url.split('#')[0] === url.split('#')[0]);
    if (existing && existing.url === url) { activate(existing); return; }
    if (active && active.url === HOME) navigate(url); else makeTab({ url, index: tabs.indexOf(active) + 1 });
  }
  function openTool(id) { openUrlInTab(TOOLS.find((t) => t.id === id).url); }
  function newTab() { makeTab({ url: HOME }); }

  // ------------------------------------------------------------------ zoom
  function zoomStep(dir) {
    const t = active;
    if (!t || !t.ready) return;
    const cur = zoomOf(t);
    let i = ZOOMS.findIndex((z) => Math.abs(z - cur) < 0.01);
    if (i < 0) i = ZOOMS.findIndex((z) => z > cur) - (dir > 0 ? 1 : 0);
    const next = dir === 0 ? 1 : ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + dir))];
    t.wv.setZoomFactor(next);
    updateZoomBadge(next);
  }
  function updateZoomBadge(z) {
    const f = z ?? zoomOf(active);
    const b = $('#zoom-badge');
    b.hidden = Math.abs(f - 1) < 0.01;
    b.textContent = Math.round(f * 100) + ' %';
  }
  $('#zoom-badge').addEventListener('click', () => zoomStep(0));

  // ------------------------------------------------------------------ recherche dans la page
  const findbar = $('#findbar');
  const findInput = $('#find-input');
  function openFind() {
    findbar.hidden = false;
    findInput.focus();
    findInput.select();
    if (findInput.value) doFind(true);
  }
  function closeFind() {
    if (findbar.hidden) return;
    findbar.hidden = true;
    try { active?.wv?.stopFindInPage('clearSelection'); } catch {}
  }
  function doFind(forward, next = false) {
    const t = active;
    if (!t || !t.ready) return;
    const q = findInput.value;
    if (!q) { t.wv.stopFindInPage('clearSelection'); $('#find-count').textContent = ''; return; }
    t.wv.findInPage(q, { forward, findNext: next });
  }
  function showFindResult(r) {
    const c = $('#find-count');
    c.textContent = `${r.matches ? r.activeMatchOrdinal : 0}/${r.matches}`;
    c.classList.toggle('none', r.matches === 0);
  }
  findInput.addEventListener('input', () => doFind(true));
  findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doFind(!e.shiftKey, true); }
    if (e.key === 'Escape') closeFind();
  });
  $('#find-next').onclick = () => doFind(true, true);
  $('#find-prev').onclick = () => doFind(false, true);
  $('#find-close').onclick = closeFind;

  // ------------------------------------------------------------------ chargement, barre d'état
  const prog = $('#progress');
  let progTimer = null, progVal = 0;
  function progressStart() {
    clearInterval(progTimer);
    progVal = 12;
    prog.classList.add('on');
    prog.firstElementChild.style.width = progVal + '%';
    progTimer = setInterval(() => { progVal += (88 - progVal) * 0.08; prog.firstElementChild.style.width = progVal + '%'; }, 120);
  }
  function progressDone() {
    clearInterval(progTimer);
    prog.firstElementChild.style.width = '100%';
    setTimeout(() => { prog.classList.remove('on'); setTimeout(() => { prog.firstElementChild.style.width = '0'; }, 400); }, 250);
  }
  function progressHide() { clearInterval(progTimer); prog.classList.remove('on'); prog.firstElementChild.style.width = '0'; }

  const statusEl = $('#status');
  function showStatus(url) {
    statusEl.hidden = !url;
    statusEl.textContent = url || '';
  }

  // ------------------------------------------------------------------ téléchargements
  const dls = new Map();
  const fmtSize = (n) => !n ? '' : n < 1024 ? n + ' o' : n < 1048576 ? (n / 1024).toFixed(0) + ' Ko' : n < 1073741824 ? (n / 1048576).toFixed(1).replace('.', ',') + ' Mo' : (n / 1073741824).toFixed(2).replace('.', ',') + ' Go';
  S.onDownload((rec, isNew) => {
    dls.set(rec.id, rec);
    updateDlButton();
    if (isNew) { toast(`Téléchargement : ${rec.name}`); dlPop(); }
    else if (layer.querySelector('.dl-list')) dlPop(true);
  });
  S.onDownloadRemoved((id) => { if (id === 'all') dls.clear(); else dls.delete(id); updateDlButton(); });
  function updateDlButton() {
    const live = [...dls.values()].filter((d) => d.state === 'progressing');
    const b = $('#b-downloads');
    b.classList.toggle('active', live.length > 0);
    const tot = live.reduce((a, d) => a + (d.total || 0), 0), got = live.reduce((a, d) => a + (d.received || 0), 0);
    b.querySelector('.dl-ring circle').style.strokeDashoffset = live.length ? String(97.4 * (1 - (tot ? got / tot : 0.1))) : '97.4';
    b.classList.toggle('done', !live.length && [...dls.values()].some((d) => d.state === 'completed' && Date.now() - (d.end || 0) < 600000));
  }
  async function dlPop(refresh) {
    const list = await S.downloads();
    const all = new Map();
    for (const d of [...list.past].reverse()) all.set(d.id, d);
    for (const d of list.active) all.set(d.id, d);
    for (const d of dls.values()) all.set(d.id, d);
    const items = [...all.values()].sort((a, b) => b.start - a.start).slice(0, 8);
    const html = `<h3>${icon('download')} Téléchargements récents</h3><div class="dl-list">${items.length ? items.map((d) => {
      const pct = d.total ? Math.round((d.received / d.total) * 100) : 0;
      const status = d.state === 'progressing' ? `${fmtSize(d.received)} / ${fmtSize(d.total) || '?'}${d.paused ? ' · en pause' : ''}`
        : d.state === 'completed' ? fmtSize(d.total || d.received) + ' · terminé' : d.state === 'cancelled' ? 'Annulé' : 'Échec';
      return `<div class="dl" data-id="${d.id}"><span class="dl-ic">${icon('file')}</span><div style="min-width:0"><div class="dl-n" title="${esc(d.name)}">${esc(d.name)}</div><div class="dl-s">${status}</div>
        ${d.state === 'progressing' ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}</div><div class="dl-a">
        ${d.state === 'progressing' ? `<button class="tb sm" data-a="${d.paused ? 'resume' : 'pause'}" title="${d.paused ? 'Reprendre' : 'Pause'}">${icon(d.paused ? 'play' : 'pause')}</button><button class="tb sm" data-a="cancel" title="Annuler">${icon('x')}</button>`
        : d.state === 'completed' ? `<button class="tb sm" data-a="show" title="Afficher dans le dossier">${icon('folder')}</button>` : ''}</div></div>`;
    }).join('') : '<div class="empty">Aucun téléchargement pour l\'instant.</div>'}</div>
      <div class="pop-foot"><button class="link-btn" data-all>Tout afficher</button></div>`;
    let pop = layer.querySelector('.pop .dl-list')?.closest('.pop');
    if (refresh && pop) pop.innerHTML = html;
    else if (!refresh) pop = openPop(html, $('#b-downloads'));
    else return;
    pop.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => S.downloadAction(+b.closest('.dl').dataset.id, b.dataset.a)));
    pop.querySelectorAll('.dl').forEach((row) => row.addEventListener('dblclick', () => S.downloadAction(+row.dataset.id, 'open')));
    pop.querySelector('[data-all]').addEventListener('click', () => { closeLayer(); openTool('downloads'); });
  }

  // ------------------------------------------------------------------ turbo, devtools, plein écran
  function toggleTurbo() {
    saveSettings({ turbo: !settings.turbo });
    toast(settings.turbo ? '⚡ TURBO SHOX ACTIVÉ — ressorts en surchauffe 🔥' : 'Turbo Shox désactivé');
  }
  function toggleDevtools() {
    const wv = active?.wv;
    if (!wv || !active.ready) return;
    if (wv.isDevToolsOpened()) wv.closeDevTools(); else wv.openDevTools();
  }
  S.onWinState((s) => {
    if ('fullscreen' in s) {
      document.body.classList.toggle('fullscreen', !!s.fullscreen);
      if (s.fullscreen && !document.body.classList.contains('html-fullscreen')) toast('Plein écran — F11 pour en sortir');
    }
  });

  // ------------------------------------------------------------------ mises à jour
  S.onUpdate((st) => {
    const b = $('#b-update');
    if (st.state === 'ready') {
      b.hidden = false;
      b.title = `Fire Shox ${st.version} est prêt : un clic pour redémarrer à jour (tes onglets sont gardés). Sinon, il s'installera tout seul à la fermeture.`;
      toast(`Mise à jour ${st.version} prête — clique sur « Mettre à jour » ou ferme Fire Shox`);
    }
  });
  $('#b-update').addEventListener('click', () => {
    saveSessionNow();
    $('#b-update').querySelector('span').textContent = 'Redémarrage…';
    S.installUpdate();
  });

  // ------------------------------------------------------------------ raccourcis
  const COMMANDS = {
    'new-tab': newTab,
    'close-tab': () => active && closeTab(active),
    'reopen-tab': reopenTab,
    'next-tab': () => tabs.length && activate(tabs[(tabs.indexOf(active) + 1) % tabs.length]),
    'prev-tab': () => tabs.length && activate(tabs[(tabs.indexOf(active) - 1 + tabs.length) % tabs.length]),
    'focus-omnibox': () => { address.focus(); address.select(); },
    reload: () => reload(false),
    'hard-reload': () => reload(true),
    back: () => active?.ready && active.wv.canGoBack() && active.wv.goBack(),
    forward: () => active?.ready && active.wv.canGoForward() && active.wv.goForward(),
    home: () => navigate(HOME),
    find: openFind,
    history: () => openTool('history'),
    downloads: () => openTool('downloads'),
    bookmark: toggleBookmark,
    print: () => active?.wv?.print(),
    'view-source': () => active && /^https?:/.test(active.url) && makeTab({ url: 'view-source:' + active.url, index: tabs.indexOf(active) + 1 }),
    'zoom-in': () => zoomStep(1),
    'zoom-out': () => zoomStep(-1),
    'zoom-reset': () => zoomStep(0),
    fullscreen: () => S.fullscreen(),
    devtools: toggleDevtools,
    'toggle-bookmarks': () => saveSettings({ bookmarksBar: settings.bookmarksBar === false }),
    'clear-data': () => openUrlInTab('fireshox://settings/#donnees'),
    escape: () => {
      if (layer.childElementCount) { closeLayer(); return; }
      if (!findbar.hidden) { closeFind(); return; }
      if (active?.loading && document.activeElement !== address) active.wv.stop();
    },
  };
  S.onShortcut((name) => {
    if (/^tab-\d$/.test(name)) {
      const n = +name.slice(4);
      const t = n === 9 ? tabs[tabs.length - 1] : tabs[n - 1];
      if (t) activate(t);
      return;
    }
    const fn = COMMANDS[name];
    if (fn) fn();
  });

  // Une page ou le processus principal demande un nouvel onglet
  S.onNewTab(({ url, background, sameTab, from }) => {
    if (sameTab) {
      const t = tabs.find((x) => x.contentsId === from);
      if (t) { navigate(url, t); return; }
    }
    const opener = tabs.find((x) => x.contentsId === from);
    const index = opener ? tabs.indexOf(opener) + 1 : undefined;
    makeTab({ url, background: !!background, index });
  });

  // ------------------------------------------------------------------ boutons
  $('#newtab').addEventListener('click', newTab);
  $('#b-back').addEventListener('click', COMMANDS.back);
  $('#b-forward').addEventListener('click', COMMANDS.forward);
  $('#b-reload').addEventListener('click', (e) => reload(e.shiftKey || e.ctrlKey));
  $('#b-home').addEventListener('click', (e) => { if (e.ctrlKey || e.button === 1) makeTab({ url: HOME, background: true }); else navigate(HOME); });
  $('#b-star').addEventListener('click', toggleBookmark);
  $('#b-turbo').addEventListener('click', toggleTurbo);
  $('#b-menu').addEventListener('click', mainMenu);
  $('#b-apps').addEventListener('click', appsPop);
  $('#b-downloads').addEventListener('click', () => dlPop());
  for (const id of ['#b-back', '#b-forward']) {
    $(id).addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!active?.ready) return;
      const wv = active.wv;
      const goBack = id === '#b-back';
      openMenu([{ label: goBack ? 'Revenir en arrière' : 'Aller en avant', icon: goBack ? 'back' : 'forward', action: () => (goBack ? wv.goBack() : wv.goForward()) },
        { label: "Afficher tout l'historique", icon: 'history', action: () => openTool('history') }], { x: e.clientX, y: e.clientY });
    });
  }
  // Pas de menu contextuel natif dans l'interface, sauf dans la barre d'adresse (couper/copier/coller)
  document.addEventListener('contextmenu', (e) => {
    if (e.target === address || e.target === findInput) {
      e.preventDefault();
      const inp = e.target;
      const hasSel = inp.selectionStart !== inp.selectionEnd;
      openMenu([
        { label: 'Couper', kbd: 'Ctrl+X', disabled: !hasSel, action: () => { inp.focus(); document.execCommand('cut'); } },
        { label: 'Copier', icon: 'copy', kbd: 'Ctrl+C', disabled: !hasSel, action: () => { inp.focus(); document.execCommand('copy'); } },
        { label: 'Coller', kbd: 'Ctrl+V', action: () => { inp.focus(); document.execCommand('paste'); } },
        ...(inp === address ? [{ label: 'Coller et y aller', icon: 'forward', action: async () => { inp.focus(); document.execCommand('paste'); setTimeout(() => { const u = resolveInput(inp.value); if (u) { editing = false; navigate(u); } }, 30); } }] : []),
        { sep: true },
        { label: 'Tout sélectionner', kbd: 'Ctrl+A', action: () => { inp.focus(); inp.select(); } },
      ], { x: e.clientX, y: e.clientY });
      return;
    }
    if (!e.target.closest('.tab, #bookmarks, #b-back, #b-forward')) e.preventDefault();
  });
  window.addEventListener('resize', () => { if (layer.childElementCount) closeLayer(); });
  // Certaines pages demandent un « scrollIntoView » qui remonte jusqu'à l'interface : on la remet en place.
  const unscroll = (el) => el.addEventListener('scroll', () => { if (el.scrollTop || el.scrollLeft) { el.scrollTop = 0; el.scrollLeft = 0; } }, true);
  [$('#app'), views].forEach(unscroll);
  window.addEventListener('scroll', () => { if (scrollX || scrollY) scrollTo(0, 0); });

  // ------------------------------------------------------------------ session
  function sessionData() {
    return { tabs: tabs.map((t) => ({ url: shownUrl(t), title: t.title })), active: Math.max(0, tabs.indexOf(active)) };
  }
  const saveSession = debounce(() => S.set('session', sessionData()), 400);
  function saveSessionNow() { S.set('session', sessionData()); }
  window.addEventListener('beforeunload', () => { if (tabs.length) saveSessionNow(); });

  // ------------------------------------------------------------------ démarrage
  applySettings();
  renderBookmarks();
  updateGuard();
  const startUrls = JSON.parse(params.get('urls') || '[]');
  const session = S.get('session');
  const restore = params.get('restore') !== '0';
  if (startUrls.length) startUrls.forEach((u, i) => makeTab({ url: u, background: i > 0 }));
  else if (restore && settings.startup === 'restore' && session && session.tabs && session.tabs.length) {
    const act = Math.min(session.active || 0, session.tabs.length - 1);
    session.tabs.forEach((t, i) => makeTab({ url: t.url, title: t.title, lazy: i !== act, background: true }));
    activate(tabs[act]);
  } else makeTab({ url: HOME });

  // Pour les tests automatisés (--run)
  window.FS = {
    activeContentsId: () => active && active.contentsId,
    tabs: () => tabs.map((t) => ({ url: t.url, title: t.title, active: t === active })),
    open: (url) => makeTab({ url }),
    menu: mainMenu,
    apps: appsPop,
  };
})();
