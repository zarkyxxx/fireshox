// Fire Shox — onglets « plus » : onglets qui dorment, onglets épinglés, groupes d'onglets et thèmes
// du navigateur (Fire / Squid / LFI).
//
// Chargé AVANT ui.js : ce fichier déclare window.FireShoxTabsPlus(api). ui.js l'appelle juste avant de
// restaurer la session, avec l'accès à ses onglets et un objet TX où l'on branche les points d'accroche :
//   created(tab, opts)   onglet créé (opts : pinned, group, fav…)     render(tab)      après renderTab
//   beforeOrder()        avant de ranger les onglets dans la bande    afterOrder()     après (pastilles)
//   activate(tab, prev)  au début d'activate (réveil, groupe replié)  webview(tab, wv) webview créé
//   closed(tab)          onglet fermé                                 nextAfterClose(i) onglet à activer
//   drag(e, tab)         glisser-déposer                              tabMenu(tab)     menu contextuel
//   session(data)        données de session à compléter              restore(session) avant la restauration
//   mainMenu()           lignes en plus dans le menu principal (choix du thème)
//
// Réglages (clé « settings ») : theme = 'fire' | 'squid' | 'lfi' ; sleepAfter = minutes avant qu'un
// onglet inutilisé s'endorme (5, 15, 30 par défaut, 60 ; 0 = jamais) ; sleepAfterSec = réglage de test
// caché, en secondes (prioritaire s'il est > 0).
'use strict';
(() => {
  const SYMBOLS = `
    <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></symbol>
    <symbol id="i-pinoff" viewBox="0 0 24 24"><path d="M12 17v5"/><path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89"/><path d="m2 2 20 20"/><path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11"/></symbol>
    <symbol id="i-moon" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M17 4h3l-3 4h3"/></symbol>
    <symbol id="i-group" viewBox="0 0 24 24"><path d="M3 7V5c0-1.1.9-2 2-2h2"/><path d="M17 3h2c1.1 0 2 .9 2 2v2"/><path d="M21 17v2c0 1.1-.9 2-2 2h-2"/><path d="M7 21H5c-1.1 0-2-.9-2-2v-2"/><rect width="7" height="5" x="7" y="7" rx="1"/><rect width="7" height="5" x="10" y="12" rx="1"/></symbol>
    <symbol id="i-ungroup" viewBox="0 0 24 24"><rect width="8" height="6" x="5" y="4" rx="1"/><rect width="8" height="6" x="11" y="14" rx="1"/></symbol>
    <symbol id="i-palette" viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="1.2"/><circle cx="17.5" cy="10.5" r="1.2"/><circle cx="8.5" cy="7.5" r="1.2"/><circle cx="6.5" cy="12.5" r="1.2"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"/></symbol>
    <symbol id="i-fold" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></symbol>
    <symbol id="i-unfold" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>`;

  // Couleurs des groupes : les trois paquets de cartes, puis vert, bleu, violet.
  const GROUP_COLORS = [
    { id: 'squid', name: 'Squid', color: '#ff2f7d' },
    { id: 'fire', name: 'Fire', color: '#ff7a00' },
    { id: 'lfi', name: 'LFI', color: '#ff2a3d' },
    { id: 'vert', name: 'Vert', color: '#2fd27a' },
    { id: 'bleu', name: 'Bleu', color: '#3d8bff' },
    { id: 'violet', name: 'Violet', color: '#a46bff' },
  ];

  const THEMES = {
    fire: { name: 'Fire Shox', short: 'Fire', strip: '#0e0d13', symbol: '#ece6dc' },
    squid: { name: 'Squid Shox', short: 'Squid', strip: '#061114', symbol: '#e3f6f0' },
    lfi: { name: 'LFI Shox', short: 'LFI', strip: '#120608', symbol: '#fbefe0' },
  };

  // Pages Fire Shox « lourdes » (jeux, animations, galeries) : les seules pages internes qui s'endorment.
  const HEAVY_INTERNAL = /^fireshox:\/\/(opening|shoxbench|images|jeux|runner)(\/|$)/i;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ================================================================== état d'une page (transfert)
  // Sert au détachement d'un onglet (la page est rechargée dans l'autre fenêtre) et au réveil d'un
  // onglet endormi : défilement, vidéos / sons (position, lecture, vitesse, volume) et champs texte.
  // Ces deux fonctions sont exécutées DANS la page (executeJavaScript) : elles ne modifient pas le DOM.
  function pageCapture(pause) {
    const out = { url: location.href, x: Math.round(scrollX), y: Math.round(scrollY), box: null, media: [], fields: [], at: Date.now() };
    try {
      const pathOf = (el) => {
        const parts = [];
        while (el && el.nodeType === 1 && el !== document.body && el !== document.documentElement && parts.length < 30) {
          if (el.id) { parts.unshift('#' + CSS.escape(el.id)); return parts.join(' > '); }
          let i = 1;
          for (let s = el.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === el.tagName) i++;
          parts.unshift(`${el.tagName.toLowerCase()}:nth-of-type(${i})`);
          el = el.parentElement;
        }
        return 'body > ' + parts.join(' > ');
      };
      let best = null, area = 0, n = 0;
      for (const el of document.querySelectorAll('body *')) {
        if (++n > 40000) break;
        if ((el.scrollTop > 0 || el.scrollLeft > 0) && (el.scrollHeight > el.clientHeight + 20 || el.scrollWidth > el.clientWidth + 20)) {
          const a = el.clientWidth * el.clientHeight;
          if (a > area) { area = a; best = el; }
        }
      }
      if (best) out.box = { sel: pathOf(best), top: Math.round(best.scrollTop), left: Math.round(best.scrollLeft) };
    } catch {}
    try {
      const count = { video: 0, audio: 0 };
      for (const m of document.querySelectorAll('video, audio')) {
        const tag = m.tagName.toLowerCase();
        const n = count[tag]++;
        if (!(m.duration > 0) || !isFinite(m.duration)) continue; // direct ou pas encore chargé : on ne force rien
        out.media.push({ tag, n, src: m.currentSrc || m.src || '', t: m.currentTime, paused: m.paused, rate: m.playbackRate, vol: m.volume, muted: m.muted, dur: m.duration });
        if (pause && !m.paused) m.pause();
      }
    } catch {}
    try {
      const TEXT = /^(text|search|email|url|tel|number)?$/;
      const list = [...document.querySelectorAll('input, textarea')].filter((f) => f.tagName === 'TEXTAREA' || TEXT.test((f.getAttribute('type') || '').toLowerCase()));
      let total = 0;
      list.forEach((f, i) => {
        if (out.fields.length >= 40 || f.type === 'password' || f.disabled || f.readOnly) return;
        const v = f.value;
        if (v === f.defaultValue || v.length > 20000 || (total += v.length) > 80000) return;
        out.fields.push({ id: f.id || '', name: f.name || '', k: f.name ? [...document.getElementsByName(f.name)].indexOf(f) : -1, i, v });
      });
    } catch {}
    return out;
  }

  function pageRestore(s) {
    const r = { same: true, pending: false, media: 0, scroll: false, fields: 0, times: [] };
    const norm = (u) => { try { const x = new URL(u); return x.origin + x.pathname; } catch { return String(u); } };
    if (norm(location.href) !== norm(s.url)) { r.same = false; return r; }
    const K = '__fireShoxRestore';
    const mem = window[K] || (window[K] = { media: new WeakMap(), fields: new WeakSet(), scrolled: false, box: false });
    const all = [...document.querySelectorAll('video, audio')];
    for (const m of s.media || []) {
      const same = all.filter((x) => x.tagName.toLowerCase() === m.tag);
      let el = m.src && !/^blob:/.test(m.src) ? all.find((x) => (x.currentSrc || x.src) === m.src) : null;
      if (!el) el = same[m.n] || (same.length === 1 ? same[0] : null);
      if (!el || !(el.readyState >= 1) || !(el.duration > 0)) { r.pending = true; continue; }
      if (!isFinite(el.duration)) continue;
      const done = mem.media.get(el);
      const expected = done && !m.paused ? done.t + ((Date.now() - done.at) / 1000) * (m.rate || 1) : m.t;
      if (!done || (done.tries < 3 && Math.abs(el.currentTime - expected) > 3)) {
        try {
          el.playbackRate = m.rate || 1;
          el.volume = m.vol;
          el.muted = !!m.muted;
          if (Math.abs(el.currentTime - expected) > 0.35) el.currentTime = Math.min(expected, el.duration - 0.25);
          if (m.paused) el.pause();
          else { const p = el.play(); if (p && p.catch) p.catch(() => {}); }
          mem.media.set(el, { at: Date.now(), t: el.currentTime, tries: done ? done.tries + 1 : 1, want: m.t, first: done ? done.first : el.currentTime });
        } catch { r.pending = true; continue; }
      }
      const d = mem.media.get(el);
      if (Date.now() - d.at < 2500) r.pending = true; // on surveille encore un peu (lecteurs qui se recalent)
      r.times.push({ captured: Math.round(d.want * 100) / 100, seek: Math.round(d.first * 100) / 100, now: Math.round(el.currentTime * 100) / 100, tries: d.tries });
      r.media++;
    }
    if (s.box && s.box.sel && !mem.box) {
      const b = document.querySelector(s.box.sel);
      if (b) { b.scrollTop = s.box.top; b.scrollLeft = s.box.left; }
      if (b && Math.abs(b.scrollTop - s.box.top) < 3) mem.box = true; else r.pending = true;
    }
    if ((s.x || s.y) && !mem.scrolled) {
      if (Math.abs(scrollY - s.y) > 2 || Math.abs(scrollX - s.x) > 2) scrollTo(s.x, s.y);
      if (Math.abs(scrollY - s.y) <= 2) mem.scrolled = true; else r.pending = true;
    }
    r.scroll = !!(mem.scrolled || mem.box);
    const TEXT = /^(text|search|email|url|tel|number)?$/;
    let list = null;
    for (const f of s.fields || []) {
      let el = f.id ? document.getElementById(f.id) : null;
      if (!el && f.name && f.k >= 0) el = document.getElementsByName(f.name)[f.k] || null;
      if (!el) {
        list = list || [...document.querySelectorAll('input, textarea')].filter((x) => x.tagName === 'TEXTAREA' || TEXT.test((x.getAttribute('type') || '').toLowerCase()));
        el = list[f.i] || null;
      }
      if (!el || !('value' in el) || el.type === 'password') { r.pending = true; continue; }
      if (el.value === f.v) { r.fields++; continue; }
      if (mem.fields.has(el) || el.value !== el.defaultValue) continue; // déjà touché par l'utilisateur
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, f.v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      mem.fields.add(el);
      r.fields++;
    }
    return r;
  }

  function pageResume(s) {
    const all = [...document.querySelectorAll('video, audio')];
    for (const m of s.media || []) {
      if (m.paused) continue;
      const same = all.filter((x) => x.tagName.toLowerCase() === m.tag);
      const el = same[m.n] || (same.length === 1 ? same[0] : null);
      if (el && el.paused) { const p = el.play(); if (p && p.catch) p.catch(() => {}); }
    }
    return true;
  }

  const hasState = (s) => !!s && (s.x || s.y || s.box || (s.media && s.media.length) || (s.fields && s.fields.length));

  // YouTube : en secours, la position voyage aussi dans l'adresse (&t=…s).
  function resumeUrl(url, s) {
    const v = s && s.media && s.media.find((m) => m.tag === 'video' && m.t > 3 && isFinite(m.dur));
    if (!v) return url;
    try {
      const u = new URL(url);
      const yt = (/(^|\.)youtube\.com$/i.test(u.hostname) && u.pathname === '/watch' && u.searchParams.get('v')) || /^youtu\.be$/i.test(u.hostname);
      if (!yt) return url;
      u.searchParams.set('t', Math.floor(v.t) + 's');
      return u.toString();
    } catch { return url; }
  }

  window.FireShoxTabsPlus = function install(api) {
    const { S, TX, tabs, tabsEl, icon, esc } = api;
    const root = document.documentElement;
    const GHOST_WIN = new URLSearchParams(location.search).has('ghost');
    document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${SYMBOLS}</svg>`);

    // ================================================================== groupes : données
    const groups = new Map(); // id → { id, name, color, collapsed }
    let gseq = 0;
    let restoring = false;
    const colorOf = (g) => (GROUP_COLORS.find((c) => c.id === (g && g.color)) || GROUP_COLORS[1]).color;
    const groupOf = (t) => (t && t.group ? groups.get(t.group) || null : null);
    const tabsOf = (gid) => tabs.filter((t) => t.group === gid);
    const isHidden = (t) => { const g = groupOf(t); return !!(g && g.collapsed); };
    const pinnedCount = () => tabs.filter((t) => t.pinned).length;

    function pruneGroups() {
      if (restoring) return;
      const used = new Set(tabs.map((t) => t.group).filter(Boolean));
      for (const id of [...groups.keys()]) if (!used.has(id)) groups.delete(id);
    }

    // Invariants de la bande : épinglés d'abord, onglets d'un même groupe côte à côte.
    function normalize() {
      const pinned = tabs.filter((t) => t.pinned);
      for (const t of pinned) t.group = null;
      const rest = tabs.filter((t) => !t.pinned);
      const out = [...pinned];
      const seen = new Set();
      for (const t of rest) {
        if (t.group && !groups.has(t.group)) t.group = null;
        if (!t.group) { out.push(t); continue; }
        if (seen.has(t.group)) continue;
        seen.add(t.group);
        for (const u of rest) if (u.group === t.group) out.push(u);
      }
      if (out.some((t, i) => t !== tabs[i])) { tabs.length = 0; tabs.push(...out); }
    }

    function nextColor() {
      const used = new Set([...groups.values()].map((g) => g.color));
      const pref = { fire: 'fire', squid: 'squid', lfi: 'lfi' }[curTheme] || 'fire';
      const order = [pref, ...GROUP_COLORS.map((c) => c.id).filter((c) => c !== pref)];
      return order.find((c) => !used.has(c)) || order[groups.size % order.length];
    }

    function createGroup(name = '', color = nextColor()) {
      const g = { id: 'g' + Date.now().toString(36) + (++gseq), name: String(name).slice(0, 40), color, collapsed: false };
      groups.set(g.id, g);
      return g;
    }

    function moveTab(tab, index) {
      const i = tabs.indexOf(tab);
      if (i < 0) return;
      tabs.splice(i, 1);
      tabs.splice(Math.max(0, Math.min(index, tabs.length)), 0, tab);
    }

    function commit(...changed) {
      pruneGroups();
      api.renderTabOrder();
      for (const t of changed) if (t && t.el) api.renderTab(t);
      api.saveSession();
    }

    function addToGroup(tab, gid) {
      if (!groups.has(gid) || tab.pinned) return;
      tab.group = null;
      const members = tabsOf(gid);
      if (members.length) moveTab(tab, tabs.indexOf(members[members.length - 1]) + 1);
      tab.group = gid;
      commit(tab);
    }

    function addToNewGroup(tab, openEditor = true) {
      if (tab.pinned) setPinned(tab, false);
      const old = tab.group;
      const g = createGroup();
      tab.group = null;
      if (old) { const m = tabsOf(old); if (m.length) moveTab(tab, tabs.indexOf(m[m.length - 1]) + 1); }
      tab.group = g.id;
      commit(tab);
      if (openEditor) setTimeout(() => groupMenu(g, true), 40);
      return g;
    }

    function removeFromGroup(tab) {
      const gid = tab.group;
      if (!gid) return;
      const m = tabsOf(gid);
      tab.group = null;
      moveTab(tab, tabs.indexOf(m[m.length - 1]) + 1);
      commit(tab);
    }

    function setPinned(tab, on) {
      if (!!tab.pinned === !!on) return;
      const p = pinnedCount();
      tab.pinned = !!on;
      if (on) { tab.group = null; moveTab(tab, p); } else moveTab(tab, p - 1);
      if (on && tab.sleeping) wakeLater(tab);
      commit(tab);
      requestAnimationFrame(api.markNarrow);
    }

    function setCollapsed(g, on) {
      if (!g || g.collapsed === !!on) return;
      g.collapsed = !!on;
      const a = api.active;
      if (on && a && a.group === g.id) {
        const i = tabs.indexOf(a);
        let next = null;
        for (let j = i + 1; j < tabs.length && !next; j++) if (tabs[j].group !== g.id && !isHidden(tabs[j])) next = tabs[j];
        for (let j = i - 1; j >= 0 && !next; j--) if (tabs[j].group !== g.id && !isHidden(tabs[j])) next = tabs[j];
        if (next) api.activate(next); else api.makeTab({ url: api.HOME, group: null });
      }
      paintStrip();
      api.saveSession();
    }

    function ungroup(g) {
      for (const t of tabsOf(g.id)) t.group = null;
      groups.delete(g.id);
      commit(...tabs);
    }

    function closeGroup(g) {
      g.collapsed = false;
      for (const t of tabsOf(g.id)) api.closeTab(t);
      pruneGroups();
      paintStrip();
    }

    function newTabInGroup(g) {
      const m = tabsOf(g.id);
      g.collapsed = false;
      api.makeTab({ url: api.HOME, index: m.length ? tabs.indexOf(m[m.length - 1]) + 1 : undefined, group: g.id });
    }

    // ================================================================== bande : pastilles et classes
    function chipFor(g) {
      let chip = tabsEl.querySelector(`.tgroup[data-g="${g.id}"]`);
      if (chip) return chip;
      chip = document.createElement('div');
      chip.className = 'tgroup';
      chip.dataset.g = g.id;
      chip.setAttribute('role', 'button');
      chip.innerHTML = '<span class="tg-name"></span><span class="tg-count"></span>';
      chip.addEventListener('click', () => { const gg = groups.get(chip.dataset.g); if (gg) setCollapsed(gg, !gg.collapsed); });
      chip.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); const gg = groups.get(chip.dataset.g); if (gg) groupMenu(gg, false); });
      chip.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
      chip.addEventListener('pointerenter', hideCard);
      return chip;
    }

    function paintChip(chip, g, n) {
      chip.style.setProperty('--g', colorOf(g));
      chip.classList.toggle('collapsed', !!g.collapsed);
      chip.classList.toggle('noname', !g.name);
      chip.querySelector('.tg-name').textContent = g.name;
      chip.querySelector('.tg-count').textContent = String(n);
      chip.title = `${g.name ? `Groupe « ${g.name} »` : 'Groupe sans nom'} · ${n} onglet${n > 1 ? 's' : ''}\n`
        + (g.collapsed ? 'Clic : déplier' : 'Clic : replier') + ' · Clic droit : renommer, couleur…';
    }

    function paintStrip() {
      if (typeof hideCard === 'function' && cardTab && !cardTab.el.isConnected) hideCard();
      const firsts = new Map();
      for (const t of tabs) if (t.group && groups.has(t.group) && !firsts.has(t.group)) firsts.set(t.group, t);
      for (const chip of [...tabsEl.querySelectorAll('.tgroup')]) if (!firsts.has(chip.dataset.g)) chip.remove();
      for (const [gid, first] of firsts) {
        const g = groups.get(gid);
        const chip = chipFor(g);
        paintChip(chip, g, tabsOf(gid).length);
        if (first.el.previousElementSibling !== chip) tabsEl.insertBefore(chip, first.el);
      }
      tabs.forEach((t, i) => {
        const g = groupOf(t);
        const next = tabs[i + 1];
        t.el.classList.toggle('gcol', !!(g && g.collapsed));
        t.el.classList.toggle('g-end', !!g && (!next || next.group !== t.group));
        t.el.classList.toggle('pin-end', !!t.pinned && !(next && next.pinned));
        t.el.classList.toggle('grouped', !!g);
        if (g) t.el.style.setProperty('--g', colorOf(g)); else t.el.style.removeProperty('--g');
      });
      requestAnimationFrame(api.markNarrow);
    }

    // ================================================================== état d'une page : lecture / remise
    async function captureState(t, pause) {
      if (!t || !t.wv || !t.ready) return null;
      try {
        const s = await Promise.race([t.wv.executeJavaScript(`(${pageCapture})(${pause ? 'true' : 'false'})`), wait(1200).then(() => null)]);
        return s && typeof s === 'object' ? s : null;
      } catch { return null; }
    }
    // À dom-ready, puis toutes les 300 ms pendant 15 s (les lecteurs comme YouTube créent la vidéo tard).
    function restorePage(t, wv, s) {
      if (!hasState(s)) return;
      const code = `(${pageRestore})(${JSON.stringify(s)})`;
      let until = 0, stop = false;
      const tick = async () => {
        if (stop || t.wv !== wv) return;
        let r = null;
        try { r = await wv.executeJavaScript(code); } catch {}
        if (r) t.restored = r;
        if ((r && (!r.same || !r.pending)) || Date.now() > until) { stop = true; return; }
        setTimeout(tick, 300);
      };
      wv.addEventListener('dom-ready', () => { until = Date.now() + 15000; tick(); }, { once: true });
    }
    function resumeMedia(t, s) {
      if (t && t.wv && t.ready && s && s.media && s.media.some((m) => !m.paused)) t.wv.executeJavaScript(`(${pageResume})(${JSON.stringify(s)})`).catch(() => {});
    }

    // ================================================================== onglets qui dorment
    function sleepDelay() {
      const s = api.settings || {};
      const sec = Number(s.sleepAfterSec);
      if (sec > 0) return sec * 1000;
      const min = s.sleepAfter === undefined || s.sleepAfter === null || s.sleepAfter === '' ? 30 : Number(s.sleepAfter);
      return min > 0 ? min * 60000 : 0;
    }

    function canSleep(t, manual) {
      if (!t || t === api.active || !t.wv || t.sleeping || t.pinned || t.crashEl) return false;
      if (manual) return true;
      if (t.loading || t.audible) return false;
      const url = api.shownUrl(t) || '';
      if (/^fireshox:/i.test(url) && !HEAVY_INTERNAL.test(url)) return false;
      try { if (t.ready && t.wv.isDevToolsOpened()) return false; } catch {}
      try { if (t.ready && t.wv.isCurrentlyAudible()) return false; } catch {}
      return true;
    }

    async function sleepTab(t, manual = false) {
      if (!canSleep(t, manual) || t.sleepPending) return false;
      t.sleepPending = true;
      const state = await captureState(t, false);
      t.sleepPending = false;
      if (!canSleep(t, manual)) return false;
      const wv = t.wv;
      const url = t.failedUrl || t.url;
      t.scroll = hasState(state) && state.url === t.url ? state : null; // remis au réveil (défilement, vidéo, champs)
      // Comme à la fermeture d'un onglet : ShoxVault oublie ce qu'il savait de cette page.
      if (t.contentsId && S.vault && S.vault.tabClosed) S.vault.tabClosed(t.contentsId);
      t.vaultOffer = null;
      t.url = url;
      t.failedUrl = null;
      t.wv = null; t.ready = false; t.contentsId = null; t.loading = false; t.audible = false;
      t.sleeping = true;
      t.sleptAt = Date.now();
      wv.remove();
      api.renderTab(t);
      return true;
    }

    // Réveil : activate() recrée le webview (ensureWebview) ; on remet la page où elle était.
    function wake(t) {
      t.sleeping = false;
      t.wakeScroll = t.scroll || null;
      t.scroll = null;
      api.renderTab(t);
    }
    function wakeLater(t) { t.sleeping = false; api.renderTab(t); }

    setInterval(() => {
      const delay = sleepDelay();
      if (!delay) return;
      const now = Date.now();
      for (const t of tabs) if (now - (t.lastActive || now) >= delay && canSleep(t, false)) sleepTab(t);
    }, 1000);

    // ================================================================== carte au survol d'un onglet
    const card = document.createElement('div');
    card.id = 'tab-card';
    card.hidden = true;
    document.body.appendChild(card);
    let cardTab = null, cardTimer = 0, cardHiddenAt = 0, dragging = false;

    function hideCard() {
      clearTimeout(cardTimer);
      if (!card.hidden) cardHiddenAt = Date.now();
      card.hidden = true;
      cardTab = null;
    }
    function fillCard(t) {
      const url = api.shownUrl(t) || '';
      let where = url;
      try { const u = new URL(url); where = u.protocol === 'fireshox:' ? 'fireshox://' + u.host : (u.host || url); } catch {}
      const g = groupOf(t);
      card.innerHTML = `<b class="tc-t"></b><span class="tc-u"></span>`
        + (g ? `<span class="tc-g" style="--g:${colorOf(g)}"><i></i><span></span></span>` : '')
        + (t.sleeping ? `<span class="tc-s">${icon('moon')}<span>Onglet endormi pour économiser la mémoire</span></span>` : '')
        + (t.pinned && !t.sleeping ? `<span class="tc-p">${icon('pin')}<span>Onglet épinglé</span></span>` : '');
      card.querySelector('.tc-t').textContent = t.title || 'Nouvel onglet';
      card.querySelector('.tc-u').textContent = where;
      if (g) card.querySelector('.tc-g span').textContent = g.name ? `Groupe « ${g.name} »` : 'Groupe sans nom';
      card.classList.toggle('asleep', !!t.sleeping);
    }
    function showCard(t) {
      if (dragging || api.layer.childElementCount || !t.el.isConnected || isHidden(t)) return;
      cardTab = t;
      fillCard(t);
      card.hidden = false;
      const r = t.el.getBoundingClientRect();
      const w = card.offsetWidth;
      card.style.left = Math.round(Math.max(8, Math.min(r.left, innerWidth - w - 8))) + 'px';
      card.style.top = Math.round(r.bottom + 7) + 'px';
    }
    tabsEl.addEventListener('pointerover', (e) => {
      const el = e.target.closest('.tab');
      if (!el) return;
      const t = tabs.find((x) => x.el === el);
      if (!t || t === cardTab) return;
      clearTimeout(cardTimer);
      const warm = !card.hidden || Date.now() - cardHiddenAt < 400;
      if (!card.hidden) { card.hidden = true; cardHiddenAt = Date.now(); }
      cardTimer = setTimeout(() => showCard(t), warm ? 60 : 480);
    });
    tabsEl.addEventListener('pointerleave', hideCard);
    tabsEl.addEventListener('pointerdown', hideCard, true);
    tabsEl.addEventListener('contextmenu', hideCard, true);
    tabsEl.addEventListener('wheel', hideCard, { passive: true });
    window.addEventListener('blur', hideCard);
    // Groupe déplié / replié : les largeurs changent en fin d'animation, on recalcule les onglets étroits.
    tabsEl.addEventListener('transitionend', (e) => { if (e.target.classList.contains('tab') && e.propertyName === 'flex-basis') api.markNarrow(); });

    // ================================================================== beaucoup d'onglets
    // Les onglets rétrécissent jusqu'à l'icône ; au-delà, la bande défile (molette) et « + » reste visible.
    function fitStrip() {
      const on = tabsEl.classList.contains('overflow');
      const over = tabsEl.scrollWidth > tabsEl.clientWidth + (on ? 0 : 2);
      if (over !== on) { tabsEl.classList.toggle('overflow', over); if (!over) tabsEl.scrollLeft = 0; }
    }
    function revealActive() {
      const a = api.active;
      if (!a || !tabsEl.classList.contains('overflow') || !a.el.isConnected) return;
      const r = a.el.getBoundingClientRect(), c = tabsEl.getBoundingClientRect();
      const plus = 44;
      if (r.left < c.left) tabsEl.scrollLeft -= c.left - r.left + 10;
      else if (r.right > c.right - plus) tabsEl.scrollLeft += r.right - (c.right - plus) + 10;
    }
    tabsEl.addEventListener('wheel', (e) => {
      if (!tabsEl.classList.contains('overflow')) return;
      e.preventDefault();
      tabsEl.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    }, { passive: false });
    // Bord gauche estompé quand des onglets sont cachés à gauche.
    tabsEl.addEventListener('scroll', () => { tabsEl.classList.toggle('scrolled', tabsEl.scrollLeft > 2); hideCard(); });
    TX.narrowed = () => { fitStrip(); tabsEl.classList.toggle('scrolled', tabsEl.scrollLeft > 2); };

    // ================================================================== onglet détaché (nouvelle fenêtre)
    const tear = document.createElement('div');
    tear.id = 'tab-tear';
    tear.hidden = true;
    document.body.appendChild(tear);
    function showTear(t) {
      const last = tabs.length === 1;
      tear.innerHTML = `<div class="tt-tab"><span class="tt-fav"></span><b></b></div>
        <div class="tt-page"><i></i><i></i><i></i></div>
        <div class="tt-hint">${icon('window')}<span>${last ? 'Lâcher : déplacer la fenêtre' : 'Lâcher : nouvelle fenêtre'}</span></div>`;
      const fav = t.el.querySelector('.fav');
      tear.querySelector('.tt-fav').innerHTML = fav ? fav.innerHTML : '';
      tear.querySelector('.tt-fav .zz')?.remove();
      tear.querySelector('b').textContent = t.title || 'Nouvel onglet';
      tear.hidden = false;
      hideCard();
    }
    function moveTear(x, y, out) {
      const w = tear.offsetWidth || 230, h = tear.offsetHeight || 120;
      tear.style.left = Math.round(Math.max(6, Math.min(x - 24, innerWidth - w - 6))) + 'px';
      tear.style.top = Math.round(Math.max(6, Math.min(y + 10, innerHeight - h - 6))) + 'px';
      tear.classList.toggle('out', !!out);
    }
    function hideTear() { tear.hidden = true; }

    // Envoie l'onglet (adresse + état de la page) au processus principal, qui l'ajoute à la fenêtre
    // dont la bande est sous le curseur, ou ouvre une nouvelle fenêtre ; puis on le ferme ici.
    // Dernier onglet de la fenêtre : c'est la fenêtre qui se déplace, l'onglet reste.
    async function detachTab(t, pt = {}) {
      if (!t || !S.detachTab || tabs.indexOf(t) < 0) return null;
      const last = tabs.length === 1;
      const state = await captureState(t, !last); // met la vidéo en pause : pas deux sons en même temps
      const url = resumeUrl(api.shownUrl(t), state);
      let r = null;
      try {
        r = await S.detachTab({ url, title: t.title, pinned: !!t.pinned, state, last, screenX: pt.screenX, screenY: pt.screenY, grabX: pt.grabX });
      } catch {}
      if (r && (r.action === 'merged' || r.action === 'window')) api.closeTab(t);
      else if (!last) resumeMedia(t, state);
      return r;
    }

    // ================================================================== glisser-déposer
    // Les onglets épinglés restent entre eux. Lâché entre deux onglets d'un groupe (ou juste après sa
    // pastille) : l'onglet rejoint le groupe ; lâché hors de son groupe : il en sort.
    function startDrag(e, tab) {
      if (e.button !== 0) return;
      hideCard();
      api.activate(tab);
      const items = [...tabsEl.children].filter((el) => (el.classList.contains('tab') || el.classList.contains('tgroup')) && !el.classList.contains('gcol'));
      const from = items.indexOf(tab.el);
      if (from < 0) return;
      const rects = items.map((el) => el.getBoundingClientRect());
      const self = rects[from];
      const others = items.filter((_, i) => i !== from);
      const orects = rects.filter((_, i) => i !== from);
      const isPin = (el) => el.classList.contains('pinned');
      const lo = tab.pinned ? 0 : others.filter(isPin).length;
      const hi = tab.pinned ? others.filter(isPin).length : others.length;
      const zone = [self, ...orects.slice(lo, hi)];
      const minDx = Math.min(...zone.map((r) => r.left)) - self.left;
      const maxDx = Math.max(...zone.map((r) => r.right)) - self.right;
      const step = self.width + 2;
      const startX = e.clientX, startY = e.clientY;
      const stripBottom = (document.getElementById('tabstrip') || tabsEl).getBoundingClientRect().bottom;
      let k = from;
      let moved = false;
      let torn = false;
      const move = (ev) => {
        const dx = ev.clientX - startX;
        if (!moved && Math.hypot(dx, ev.clientY - startY) > 6) {
          moved = true;
          dragging = true;
          tab.el.classList.add('dragging');
          try { tab.el.setPointerCapture(e.pointerId); } catch {}
        }
        if (!moved) return;
        // Détachement : à plus de ~50 px sous la bande d'onglets, ou hors de la fenêtre.
        const out = ev.clientX < 0 || ev.clientY < 0 || ev.clientX > innerWidth || ev.clientY > innerHeight;
        if (!torn && (out || ev.clientY > stripBottom + 50)) {
          torn = true;
          k = from;
          for (const el of others) { el.style.transition = 'transform .15s ease'; el.style.transform = ''; }
          tab.el.style.transform = '';
          tab.el.classList.remove('dragging');
          if (tabs.length > 1) tab.el.classList.add('tearing');
          showTear(tab);
        } else if (torn && !out && ev.clientY < stripBottom + 22) {
          torn = false;
          tab.el.classList.remove('tearing');
          tab.el.classList.add('dragging');
          hideTear();
        }
        if (torn) { moveTear(ev.clientX, ev.clientY, out); return; }
        const cdx = Math.max(minDx, Math.min(maxDx, dx));
        tab.el.style.transform = `translateX(${cdx}px)`;
        const center = self.left + self.width / 2 + cdx;
        k = lo;
        for (let j = lo; j < hi; j++) if (orects[j].left + orects[j].width / 2 <= center + 0.5) k = j + 1;
        others.forEach((el, j) => {
          let shift = 0;
          if (j < from && j >= k) shift = step;
          if (j >= from && j < k) shift = -step;
          el.style.transition = 'transform .15s ease';
          el.style.transform = shift ? `translateX(${shift}px)` : '';
        });
      };
      const up = (ev) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (!moved) return;
        dragging = false;
        for (const el of items) { el.style.transform = ''; el.style.transition = ''; }
        tab.el.classList.remove('dragging');
        if (torn) {
          hideTear();
          if (ev.type === 'pointercancel') { tab.el.classList.remove('tearing'); return; }
          detachTab(tab, { screenX: ev.screenX, screenY: ev.screenY, grabX: startX }).then((r) => {
            if (!r || r.action === 'none' || r.action === 'moved') tab.el.classList.remove('tearing');
          });
          return;
        }
        if (k === from) return;
        const tabOf = (el) => tabs.find((t) => t.el === el);
        const isChip = (el) => !!el && el.classList.contains('tgroup');
        const L = others[k - 1], R = others[k];
        let group = null;
        if (!tab.pinned && L) {
          const lg = isChip(L) ? (groups.get(L.dataset.g)?.collapsed ? null : L.dataset.g) : tabOf(L)?.group;
          const rg = R && !isChip(R) ? tabOf(R)?.group : null;
          if (lg && (isChip(L) || lg === rg || lg === tab.group)) group = lg;
        }
        tabs.splice(tabs.indexOf(tab), 1);
        let at = 0;
        if (L && isChip(L)) {
          const m = tabsOf(L.dataset.g);
          at = groups.get(L.dataset.g)?.collapsed ? tabs.indexOf(m[m.length - 1]) + 1 : tabs.indexOf(m[0]);
        } else if (L) at = tabs.indexOf(tabOf(L)) + 1;
        tabs.splice(Math.max(0, at), 0, tab);
        tab.group = group;
        commit(tab);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    }

    // ================================================================== menus
    const gdot = (g) => `<span class="gdot" style="--g:${colorOf(g)}"></span>`;
    const groupLabel = (g) => (g.name ? `« ${g.name.length > 22 ? g.name.slice(0, 22) + '…' : g.name} »` : 'sans nom');

    function tabMenu(tab) {
      pruneGroups();
      const i = tabs.indexOf(tab);
      const others = tabs.filter((t) => t !== tab && !t.pinned);
      const right = tabs.slice(i + 1).filter((t) => !t.pinned);
      const items = [
        { label: 'Nouvel onglet à droite', icon: 'plus', action: () => api.makeTab({ url: api.HOME, index: i + 1 }) },
        { sep: true },
        { label: 'Actualiser', icon: 'reload', kbd: 'F5', action: () => { api.activate(tab); api.reload(); } },
        { label: 'Dupliquer', icon: 'copy', action: () => api.makeTab({ url: api.shownUrl(tab), index: i + 1 }) },
        { label: 'Déplacer vers une nouvelle fenêtre', icon: 'window', disabled: tabs.length < 2 || !S.detachTab, action: () => detachTab(tab, {}) },
        { label: tab.pinned ? 'Désépingler' : 'Épingler', icon: tab.pinned ? 'pinoff' : 'pin', action: () => setPinned(tab, !tab.pinned) },
        { label: tab.muted ? 'Réactiver le son du site' : 'Couper le son du site', icon: tab.muted ? 'volume' : 'mute', action: () => api.toggleMute(tab) },
        { label: tab.sleeping ? 'Onglet déjà endormi' : 'Endormir maintenant', icon: 'moon', disabled: !canSleep(tab, true), action: () => sleepTab(tab, true) },
      ];
      if (!tab.pinned) {
        items.push({ sep: true });
        items.push({ label: 'Ajouter à un nouveau groupe', icon: 'group', action: () => addToNewGroup(tab) });
        for (const g of groups.values()) {
          if (g.id === tab.group) continue;
          items.push({
            html: `<button class="mi">${gdot(g)}<span class="mi-l">Ajouter au groupe ${esc(groupLabel(g))}</span></button>`,
            bind: (d) => d.firstElementChild.addEventListener('click', () => { api.closeLayer(); addToGroup(tab, g.id); }),
          });
        }
        if (tab.group) items.push({ label: 'Retirer du groupe', icon: 'ungroup', action: () => removeFromGroup(tab) });
      }
      items.push(
        { sep: true },
        { label: "Fermer l'onglet", icon: 'x', kbd: 'Ctrl+W', action: () => api.closeTab(tab) },
        { label: 'Fermer les autres onglets', disabled: !others.length, action: () => others.forEach((t) => api.closeTab(t)) },
        { label: 'Fermer les onglets à droite', disabled: !right.length, action: () => right.forEach((t) => api.closeTab(t)) },
        { sep: true },
        { label: "Rouvrir l'onglet fermé", icon: 'history', kbd: 'Ctrl+Maj+T', disabled: !api.closed.length, action: api.reopenTab },
      );
      return items;
    }

    // Menu d'une pastille de groupe : nom, couleur, puis actions.
    function groupMenu(g, focusName) {
      paintStrip();
      const chip = tabsEl.querySelector(`.tgroup[data-g="${g.id}"]`);
      if (!chip) return null;
      hideCard();
      const m = api.openMenu([
        {
          html: `<div class="gedit" style="--g:${colorOf(g)}">
            <label class="gname-wrap">${icon('group')}<input class="gname" maxlength="40" spellcheck="false" placeholder="Nom du groupe"></label>
            <div class="gcolors">${GROUP_COLORS.map((c) => `<button class="gsw${c.id === g.color ? ' on' : ''}" data-c="${c.id}" style="--c:${c.color}" title="${c.name}"></button>`).join('')}</div></div>`,
          bind: (d) => {
            const box = d.firstElementChild;
            const input = d.querySelector('.gname');
            input.value = g.name;
            input.addEventListener('input', () => { g.name = input.value.slice(0, 40); paintStrip(); api.saveSession(); });
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); api.closeLayer(); } });
            d.querySelectorAll('.gsw').forEach((b) => b.addEventListener('click', () => {
              g.color = b.dataset.c;
              d.querySelectorAll('.gsw').forEach((x) => x.classList.toggle('on', x === b));
              box.style.setProperty('--g', colorOf(g));
              for (const t of tabsOf(g.id)) api.renderTab(t);
              paintStrip();
              api.saveSession();
            }));
          },
        },
        { sep: true },
        { label: 'Nouvel onglet dans le groupe', icon: 'plus', action: () => newTabInGroup(g) },
        { label: g.collapsed ? 'Déplier le groupe' : 'Replier le groupe', icon: g.collapsed ? 'unfold' : 'fold', action: () => setCollapsed(g, !g.collapsed) },
        { label: 'Dissocier', icon: 'ungroup', action: () => ungroup(g) },
        { sep: true },
        { label: 'Fermer le groupe', icon: 'x', action: () => closeGroup(g) },
      ], { anchor: chip, align: 'left' });
      m.classList.add('gmenu');
      if (focusName) setTimeout(() => { const i = m.querySelector('.gname'); if (i) { i.focus(); i.select(); } }, 30);
      return m;
    }

    // ================================================================== thèmes
    let curTheme = null;
    let animTimer = 0;
    function applyTheme(t, animate) {
      t = THEMES[t] ? t : 'fire';
      if (curTheme === t) return;
      if (animate && curTheme) {
        root.classList.add('theme-anim');
        clearTimeout(animTimer);
        animTimer = setTimeout(() => root.classList.remove('theme-anim'), 700);
      }
      curTheme = t;
      root.dataset.theme = t;
      // Barre de titre de Windows (boutons réduire / agrandir / fermer) assortie à la bande des onglets.
      // Fenêtre Fantôme : ses couleurs passent avant le thème (extras.js s'en occupe).
      if (GHOST_WIN || root.classList.contains('ghost')) return;
      const css = getComputedStyle(root);
      const color = css.getPropertyValue('--strip').trim() || THEMES[t].strip;
      const symbolColor = THEMES[t].symbol;
      const strip = document.getElementById('tabstrip');
      try { S.setOverlay({ color, symbolColor, height: (strip && strip.offsetHeight) || 44 }); } catch {}
    }
    function setTheme(t) {
      if (!THEMES[t]) return;
      api.saveSettings({ theme: t });
      applyTheme(t, true);
    }
    function themeRow() {
      return {
        html: `<div class="mtheme">${icon('palette')}<span class="mi-l">Thème</span>${Object.entries(THEMES).map(([id, th]) =>
          `<button class="mth${id === curTheme ? ' on' : ''}" data-th="${id}" title="${th.name}"><i class="mth-sw mth-${id}"></i><span>${th.short}</span></button>`).join('')}</div>`,
        bind: (d) => d.querySelectorAll('[data-th]').forEach((b) => b.addEventListener('click', () => {
          setTheme(b.dataset.th);
          d.querySelectorAll('[data-th]').forEach((x) => x.classList.toggle('on', x === b));
        })),
      };
    }
    S.onStoreChange((key, value) => { if (key === 'settings') applyTheme((value || {}).theme, true); });
    applyTheme((api.settings || {}).theme, false);

    // ================================================================== points d'accroche de ui.js
    Object.assign(TX, {
      created(tab, opts = {}) {
        tab.pinned = !!opts.pinned;
        tab.group = null;
        tab.sleeping = false;
        tab.lastActive = Date.now();
        if (hasState(opts.state)) tab.wakeScroll = opts.state; // onglet venu d'une autre fenêtre
        if (!tab.favicon && typeof opts.fav === 'string' && /^https?:/i.test(opts.fav)) tab.favicon = opts.fav;
        if (tab.pinned) return;
        if (opts.group && groups.has(opts.group)) tab.group = opts.group;
        else if (opts.group === undefined && opts.index !== undefined) {
          // Ouvert juste à droite d'un onglet groupé (lien, « Nouvel onglet à droite ») : rejoint son groupe.
          const left = tabs[tabs.indexOf(tab) - 1];
          if (left && left.group && !left.pinned && groups.has(left.group)) tab.group = left.group;
        }
      },
      render(tab) {
        const el = tab.el;
        el.removeAttribute('title'); // remplacé par la carte au survol
        el.classList.toggle('pinned', !!tab.pinned);
        el.classList.toggle('sleeping', !!tab.sleeping);
        if (tab.sleeping) {
          const fav = el.querySelector('.fav');
          if (fav && !fav.querySelector('.zz')) fav.insertAdjacentHTML('beforeend', '<i class="zz" aria-hidden="true"><b>z</b><b>z</b></i>');
        }
        if (cardTab === tab && !card.hidden) fillCard(tab);
      },
      beforeOrder: normalize,
      afterOrder: paintStrip,
      activate(tab, prev) {
        const now = Date.now();
        if (prev && prev !== tab) prev.lastActive = now;
        tab.lastActive = now;
        if (tab.sleeping) wake(tab);
        const g = groupOf(tab);
        if (g && g.collapsed) { g.collapsed = false; paintStrip(); api.saveSession(); }
        requestAnimationFrame(() => requestAnimationFrame(revealActive));
      },
      webview(tab, wv) {
        if (tab.sleeping) wakeLater(tab);
        const st = tab.wakeScroll;
        tab.wakeScroll = null;
        if (st) restorePage(tab, wv, st);
      },
      // Onglet lâché depuis une autre fenêtre à l'abscisse x : rang dans la bande et groupe éventuel.
      dropAt(x) {
        let index = tabs.length;
        for (const t of tabs) {
          if (isHidden(t) || !t.el.isConnected) continue;
          const r = t.el.getBoundingClientRect();
          if (x < r.left + r.width / 2) { index = tabs.indexOf(t); break; }
        }
        const L = tabs[index - 1], R = tabs[index];
        return { index, group: L && R && L.group && L.group === R.group ? L.group : null };
      },
      closed(tab) {
        if (cardTab === tab) hideCard();
        if (tab.group) { pruneGroups(); paintStrip(); }
      },
      nextAfterClose(i) {
        for (let j = i; j < tabs.length; j++) if (!isHidden(tabs[j])) return tabs[j];
        for (let j = Math.min(i, tabs.length) - 1; j >= 0; j--) if (!isHidden(tabs[j])) return tabs[j];
        return null;
      },
      drag: startDrag,
      tabMenu,
      session(data) {
        data.tabs.forEach((d, i) => {
          const t = tabs[i];
          if (!t) return;
          if (t.pinned) d.pinned = true;
          if (t.group) d.group = t.group;
          if (t.favicon && /^https?:/i.test(t.favicon) && t.favicon.length < 2048) d.fav = t.favicon;
        });
        const used = new Set(tabs.map((t) => t.group).filter(Boolean));
        data.groups = [...groups.values()].filter((g) => used.has(g.id)).map((g) => ({ id: g.id, name: g.name, color: g.color, collapsed: !!g.collapsed }));
        return data;
      },
      restore(session) {
        groups.clear();
        for (const g of (session && Array.isArray(session.groups) ? session.groups : [])) {
          if (!g || typeof g.id !== 'string') continue;
          groups.set(g.id, { id: g.id, name: String(g.name || '').slice(0, 40), color: GROUP_COLORS.some((c) => c.id === g.color) ? g.color : 'fire', collapsed: !!g.collapsed });
        }
        restoring = true;
        setTimeout(() => {
          restoring = false;
          const a = api.active;
          const ga = groupOf(a);
          if (ga) ga.collapsed = false;
          pruneGroups();
          paintStrip();
        }, 0);
      },
      mainMenu: () => [themeRow()],
    });

    // Pour les tests automatisés (--run) : état et commandes des onglets « plus ».
    window.FSTabs = {
      state: () => ({
        theme: curTheme,
        sleepDelay: sleepDelay(),
        webviews: document.querySelectorAll('#views webview').length,
        tabs: tabs.map((t) => ({ title: t.title, url: t.url, pinned: !!t.pinned, group: t.group, sleeping: !!t.sleeping, wv: !!t.wv, active: t === api.active, hidden: isHidden(t) })),
        groups: [...groups.values()].map((g) => ({ ...g, n: tabsOf(g.id).length })),
      }),
      pin: (i, on = true) => setPinned(tabs[i], on),
      group(idx, name = '', color) {
        const list = idx.map((i) => tabs[i]).filter(Boolean);
        if (!list.length) return null;
        const g = createGroup(name, color || nextColor());
        for (const t of list) { t.pinned = false; t.group = null; }
        for (const t of list.slice(1)) tabs.splice(tabs.indexOf(t), 1);
        tabs.splice(tabs.indexOf(list[0]) + 1, 0, ...list.slice(1));
        for (const t of list) t.group = g.id;
        commit(...list);
        return g.id;
      },
      collapse: (gid, on = true) => setCollapsed(groups.get(gid), on),
      sleep: (i) => sleepTab(tabs[i], true),
      set: (patch) => { api.saveSettings(patch); return api.settings; },
      detach: (i, screenX, screenY, grabX) => detachTab(tabs[i], { screenX, screenY, grabX }),
      capture: (i) => captureState(tabs[i], false),
      restored: (i) => (tabs[i] ? tabs[i].restored || null : null),
      torn: () => !tear.hidden,
      tearPreview(i, x, y) { if (i < 0) { hideTear(); for (const t of tabs) t.el.classList.remove('tearing'); return false; } tabs[i].el.classList.add('tearing'); showTear(tabs[i]); moveTear(x, y, false); return true; },
      activate: (i) => api.activate(tabs[i]),
      theme: setTheme,
      tabMenu(i) { const r = tabs[i].el.getBoundingClientRect(); api.openMenu(tabMenu(tabs[i]), { x: r.left + 20, y: r.bottom - 6 }); },
      groupMenu: (gid, focus) => !!groupMenu(groups.get(gid), focus),
      card(i) { showCard(tabs[i]); return !card.hidden; },
      rect(i) { const r = tabs[i].el.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; },
      chipRect(gid) { const c = tabsEl.querySelector(`.tgroup[data-g="${gid}"]`); if (!c) return null; const r = c.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; },
      overflow: () => ({ tabs: tabsEl.scrollWidth - tabsEl.clientWidth, strip: document.getElementById('tabstrip').scrollWidth - document.getElementById('tabstrip').clientWidth }),
    };
  };
})();
