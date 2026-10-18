// Fire Shox — fonctions ajoutées à l'interface, sans toucher au code des onglets :
//   • ShoxBlock : bouton bouclier, compteur par onglet, popover (liste blanche par site, interrupteur global)
//   • ShoxShot : zone visible, page entière, zone à tracer ; aperçu, copier, enregistrer, ouvrir le dossier
//   • Traduction : bouton de la barre d'adresse, barre « Cette page est en anglais — Traduire ? »
//   • Mode Fantôme : badge, nouvel onglet = accueil Fantôme
// Les onglets sont suivis de l'extérieur : on observe les <webview> ajoutées dans #views et leur classe
// « active » (window.FSX, exposé par ui.js, donne la liste des onglets et quelques fonctions).
'use strict';
(() => {
  const X = window.FSX;
  const S = window.shell;
  const F = window.fsx;
  if (!X || !S || !F) return;
  const $ = (s, r = document) => r.querySelector(s);
  const { icon, esc } = X;
  const views = $('#views');
  const GHOST = window.FS_GHOST || null;
  const GHOST_HOME = 'fireshox://ghost/';
  const settings = () => X.settings() || {};
  const active = () => X.active();
  const urlOf = (tab) => (tab ? X.shownUrl(tab) : '');
  const isWeb = (url) => /^https?:/i.test(url || '');
  const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');
  const hostOf = (url) => { try { return new URL(url).hostname; } catch { return ''; } };
  const plural = (n, one, many) => (n > 1 ? many : one);

  // ================================================================== suivi des onglets
  const known = new WeakSet();
  const tabOf = (wv) => X.tabs().find((t) => t.wv === wv) || null;
  let refreshQueued = false;
  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => { refreshQueued = false; refresh(); });
  }
  function watchWebview(wv) {
    if (known.has(wv)) return;
    known.add(wv);
    wv.addEventListener('did-navigate', () => { const t = tabOf(wv); if (t) onTabNavigate(t); });
    wv.addEventListener('did-navigate-in-page', (e) => { if (e.isMainFrame && tabOf(wv) === active()) queueRefresh(); });
    wv.addEventListener('did-stop-loading', () => { const t = tabOf(wv); if (t) onTabLoaded(t); });
    wv.addEventListener('did-attach', () => { if (tabOf(wv) === active()) queueRefresh(); });
  }
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'childList') m.addedNodes.forEach((n) => { if (n.tagName === 'WEBVIEW') watchWebview(n); });
      else if (m.target.tagName === 'WEBVIEW' && m.target.classList.contains('active')) queueRefresh();
    }
  }).observe(views, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  views.querySelectorAll('webview').forEach(watchWebview);
  S.onStoreChange((key) => { if (key === 'settings') queueRefresh(); });

  function refresh() {
    const t = active();
    refreshBlock(t);
    refreshTranslate(t);
  }
  function onTabNavigate(t) {
    t.fsxBar = null;
    if (t === active()) { hideBar(); queueRefresh(); }
  }

  // ================================================================== ShoxBlock
  const blockBtn = $('#b-block');
  const counts = new Map(); // contentsId → nombre bloqué sur le site affiché
  const states = new Map(); // contentsId → dernier état connu
  let total = 0;
  let blockPopEl = null;

  F.block.onCount((id, n, tot) => {
    counts.set(id, n);
    if (tot != null) total = tot;
    const t = active();
    if (t && t.contentsId === id) paintBlock(t);
    if (blockPopEl && blockPopEl.isConnected && blockPopEl.dataset.id === String(id)) {
      const big = blockPopEl.querySelector('.sb-n[data-live]');
      if (big) { big.textContent = fmt(n); big.classList.remove('bump'); void big.offsetWidth; big.classList.add('bump'); }
      const lab = blockPopEl.querySelector('.sb-l[data-live]');
      if (lab) lab.textContent = `${plural(n, 'pub écrasée', 'pubs écrasées')} par les Shox sur ce site`;
      const tt = blockPopEl.querySelector('.sb-total');
      if (tt) tt.textContent = fmt(total);
    }
  });

  async function refreshBlock(t) {
    paintBlock(t);
    if (!t || !t.contentsId) return;
    let st = null;
    try { st = await F.block.state(t.contentsId); } catch {}
    if (!st || active() !== t) return;
    states.set(t.contentsId, st);
    counts.set(t.contentsId, st.count);
    total = st.total;
    paintBlock(t);
  }
  function paintBlock(t) {
    const st = t && t.contentsId ? states.get(t.contentsId) : null;
    const globalOff = settings().shoxblock === false;
    const siteOff = !!(st && st.allowed && isWeb(urlOf(t)));
    const off = globalOff || siteOff;
    const exempt = !t || !isWeb(urlOf(t)) || (st && st.exempt);
    const n = t && t.contentsId && !off && !exempt ? counts.get(t.contentsId) || 0 : 0;
    blockBtn.classList.toggle('off', off);
    blockBtn.querySelector('use').setAttribute('href', off ? '#i-shield-off' : '#i-shield');
    const badge = blockBtn.querySelector('.blk-n');
    badge.hidden = !n;
    badge.textContent = n > 99 ? '99+' : String(n);
    blockBtn.title = globalOff ? 'ShoxBlock est en pause'
      : siteOff ? 'ShoxBlock est coupé sur ce site'
        : n ? `ShoxBlock : ${n} ${plural(n, 'pub écrasée', 'pubs écrasées')} sur ce site` : 'ShoxBlock';
  }

  async function blockPop() {
    const t = active();
    const id = t && t.contentsId;
    let st = null;
    if (id) { try { st = await F.block.state(id); } catch {} }
    if (st) { states.set(id, st); counts.set(id, st.count); total = st.total; }
    const pop = X.openPop('', blockBtn);
    pop.classList.add('sb-popover');
    blockPopEl = pop;
    pop.dataset.id = String(id || '');
    renderBlockPop(pop, t, st);
  }
  function renderBlockPop(pop, t, st) {
    const url = urlOf(t);
    const globalOn = settings().shoxblock !== false;
    const web = isWeb(url);
    const exempt = !web || !st || st.exempt;
    const siteOn = !!st && !st.allowed;
    const n = st ? st.count : 0;
    let big, label, mood = '';
    if (!globalOn) { big = 'Pause'; label = 'ShoxBlock dort partout. Les pubs reviennent, brrr…'; mood = 'off'; }
    else if (st && !st.ready) { big = '…'; label = 'Chargement des listes de pubs'; mood = 'off'; }
    else if (!web || /^fireshox:/i.test(url)) { big = '0'; label = 'Page Fire Shox : zéro pub, 100 % flammes'; mood = 'calm'; }
    else if (exempt) { big = '—'; label = 'Page protégée : ShoxBlock n\'y touche jamais'; mood = 'calm'; }
    else if (!siteOn) { big = 'Off'; label = 'ShoxBlock est coupé sur ce site'; mood = 'off'; }
    else { big = fmt(n); label = `${plural(n, 'pub écrasée', 'pubs écrasées')} par les Shox sur ce site`; }
    const live = globalOn && web && !exempt && siteOn && st && st.ready;
    pop.innerHTML = `
      <div class="sb-head">${icon('shield')}<b>ShoxBlock</b><span class="sb-grow"></span>
        <span class="sb-gl">${globalOn ? 'Activé' : 'En pause'}</span>
        <label class="xs-switch" title="ShoxBlock partout"><input type="checkbox" data-k="global"${globalOn ? ' checked' : ''}><i></i></label></div>
      <div class="sb-hero ${mood}">
        <div class="sb-n"${live ? ' data-live' : ''}>${esc(big)}</div>
        <div class="sb-l"${live ? ' data-live' : ''}>${esc(label)}</div>
      </div>
      <div class="sb-site${exempt || !globalOn ? ' dis' : ''}">
        <div class="sb-site-t"><b>Activé sur ce site</b><small>${esc(web ? (st && st.site) || hostOf(url) : 'page Fire Shox')}</small></div>
        <label class="xs-switch"><input type="checkbox" data-k="site"${siteOn || exempt ? ' checked' : ''}${exempt || !globalOn ? ' disabled' : ''}><i></i></label>
      </div>
      <div class="sb-foot">🔥 <b class="sb-total">${fmt(st ? st.total : total)}</b>&nbsp;pubs et traqueurs écrasés depuis toujours</div>`;
    pop.querySelector('[data-k=global]').addEventListener('change', (e) => {
      X.saveSettings({ shoxblock: e.target.checked });
      X.toast(e.target.checked ? '🛡️ ShoxBlock réactivé partout' : 'ShoxBlock en pause partout');
      reloadIfWeb(t);
      setTimeout(() => refreshBlockPop(pop, t), 50);
      queueRefresh();
    });
    const siteSw = pop.querySelector('[data-k=site]');
    siteSw.addEventListener('change', async () => {
      if (!t || !t.contentsId) return;
      let next = null;
      try { next = await F.block.setSite(t.contentsId, siteSw.checked); } catch {}
      if (next) states.set(t.contentsId, next);
      X.toast(siteSw.checked ? `🛡️ ShoxBlock réactivé sur ${next ? next.site : 'ce site'}` : `ShoxBlock coupé sur ${next ? next.site : 'ce site'}`);
      reloadIfWeb(t);
      refreshBlockPop(pop, t);
      queueRefresh();
    });
  }
  async function refreshBlockPop(pop, t) {
    if (!pop.isConnected) return;
    let st = null;
    if (t && t.contentsId) { try { st = await F.block.state(t.contentsId); } catch {} }
    if (pop.isConnected) renderBlockPop(pop, t, st);
  }
  function reloadIfWeb(t) {
    if (t && t.wv && t.ready && isWeb(urlOf(t))) { try { t.wv.reload(); } catch {} }
  }
  blockBtn.addEventListener('click', blockPop);

  // ================================================================== ShoxShot
  const shotBtn = $('#b-shot');
  let veil = null;
  let audio = null;

  function shotMenu(anchor) {
    const t = active();
    if (!t || !t.wv) { X.toast('Rien à capturer ici'); return; }
    const a = anchor || (shotBtn.offsetParent ? shotBtn : null);
    X.openMenu([
      { html: `<div class="ss-head">${icon('camera')}<div><b>ShoxShot</b><small>Clic-clac, c'est dans la boîte</small></div></div>` },
      { label: 'Zone visible', icon: 'monitor', action: () => shoot('visible') },
      { label: 'Page entière', icon: 'fullpage', action: () => shoot('full') },
      { label: 'Sélectionner une zone', icon: 'crop', action: () => selectArea() },
    ], a ? { anchor: a, align: 'right' } : { x: innerWidth - 260, y: 60 });
  }

  async function shoot(mode, rect) {
    const t = active();
    if (!t || !t.wv || !t.contentsId) { X.toast('Rien à capturer ici'); return; }
    const wr = t.wv.getBoundingClientRect();
    const zone = rect ? { left: wr.left + rect.x, top: wr.top + rect.y, width: rect.width, height: rect.height } : wr;
    shotBtn.classList.add('busy');
    let r = null;
    try { r = await F.shot.capture(t.contentsId, mode, rect || null); } catch {}
    shotBtn.classList.remove('busy');
    if (!r || !r.ok) { X.toast('Capture impossible 😕'); return; }
    flash(zone);
    shutter();
    showShot(r);
  }

  function flash(z) {
    const f = document.createElement('div');
    f.className = 'ss-flash';
    Object.assign(f.style, { left: z.left + 'px', top: z.top + 'px', width: z.width + 'px', height: z.height + 'px' });
    document.body.appendChild(f);
    f.addEventListener('animationend', () => f.remove(), { once: true });
    setTimeout(() => f.remove(), 900);
  }
  // Petit « clic-clac » d'appareil photo synthétisé (pas de fichier son).
  function shutter() {
    if (settings().sound === false) return;
    try {
      audio = audio || new AudioContext();
      if (audio.state === 'suspended') audio.resume();
      const t0 = audio.currentTime;
      const burst = (at, dur, freq, vol) => {
        const len = Math.max(1, Math.floor(audio.sampleRate * dur));
        const buf = audio.createBuffer(1, len, audio.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
        const src = audio.createBufferSource();
        src.buffer = buf;
        const bp = audio.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 0.9;
        const g = audio.createGain();
        g.gain.value = vol;
        src.connect(bp).connect(g).connect(audio.destination);
        src.start(t0 + at);
      };
      const thump = (at) => {
        const o = audio.createOscillator();
        const g = audio.createGain();
        o.frequency.setValueAtTime(170, t0 + at);
        o.frequency.exponentialRampToValueAtTime(60, t0 + at + 0.07);
        g.gain.setValueAtTime(0.25, t0 + at);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.08);
        o.connect(g).connect(audio.destination);
        o.start(t0 + at); o.stop(t0 + at + 0.1);
      };
      burst(0, 0.045, 3200, 0.55); thump(0);
      burst(0.085, 0.07, 1700, 0.4); thump(0.085);
    } catch {}
  }

  function showShot(r) {
    const kind = r.mode === 'full' ? 'Page entière' : r.mode === 'area' ? 'Zone choisie' : 'Zone visible';
    const notes = [];
    if (r.fallback) notes.push('page entière indisponible ici (outils de développement ouverts ?) : zone visible capturée');
    if (r.cut) notes.push('page très longue : coupée en bas');
    const anchor = shotBtn.offsetParent ? shotBtn : $('#b-menu');
    const pop = X.openPop(`<div class="ss-pop">
      <h3>${icon('camera')} ShoxShot <span class="ss-kind">${kind}</span></h3>
      <div class="ss-prev${r.cropped ? ' cut' : ''}"><img alt="Aperçu de la capture" src="${esc(r.dataUrl)}"></div>
      <div class="ss-info"><span>${fmt(r.width)} × ${fmt(r.height)} px</span>${notes.map((n) => `<small>${esc(n)}</small>`).join('')}</div>
      <div class="ss-acts">
        <button class="ss-btn" data-a="copy">${icon('copy')}<span>Copier</span></button>
        <button class="ss-btn primary" data-a="save">${icon('download')}<span>Enregistrer</span></button>
        <button class="ss-btn" data-a="folder">${icon('folder')}<span>Ouvrir le dossier</span></button>
      </div>
      <div class="ss-saved" hidden></div>
    </div>`, anchor);
    pop.classList.add('ss-popover');
    pop.dataset.shot = r.id;
    const copyBtn = pop.querySelector('[data-a=copy]');
    const saveBtn = pop.querySelector('[data-a=save]');
    copyBtn.addEventListener('click', async () => {
      const ok = await F.shot.copy(r.id).catch(() => false);
      if (!ok) { X.toast('Capture expirée, refais-en une'); return; }
      copyBtn.classList.add('done');
      copyBtn.querySelector('span').textContent = 'Copiée';
      copyBtn.querySelector('use').setAttribute('href', '#i-check');
      X.toast('📋 Capture copiée dans le presse-papiers');
    });
    saveBtn.addEventListener('click', async () => {
      const res = await F.shot.save(r.id).catch(() => null);
      if (!res || !res.ok) { X.toast('Enregistrement impossible 😕'); return; }
      saveBtn.classList.add('done');
      saveBtn.querySelector('span').textContent = 'Enregistrée';
      saveBtn.querySelector('use').setAttribute('href', '#i-check');
      const info = pop.querySelector('.ss-saved');
      info.hidden = false;
      info.textContent = `${res.name} — ${res.dir}`;
      info.title = res.path;
      X.toast('🔥 Capture enregistrée');
    });
    pop.querySelector('[data-a=folder]').addEventListener('click', () => { F.shot.openFolder(r.id); X.closeLayer(); });
  }

  // Zone à tracer : un calque par-dessus la page active.
  function selectArea() {
    const t = active();
    if (!t || !t.wv) return;
    cancelArea();
    const wr = t.wv.getBoundingClientRect();
    veil = document.createElement('div');
    veil.className = 'ss-veil';
    veil.tabIndex = -1;
    Object.assign(veil.style, { left: wr.left + 'px', top: wr.top + 'px', width: wr.width + 'px', height: wr.height + 'px' });
    veil.innerHTML = `<div class="sv-hint">${icon('crop')}<span>Trace le rectangle à capturer</span><kbd>Échap</kbd><span class="sv-dim">pour annuler</span></div>
      <div class="sv-box" hidden><span class="sv-size"></span></div>`;
    document.body.appendChild(veil);
    veil.focus();
    const box = veil.querySelector('.sv-box');
    const size = veil.querySelector('.sv-size');
    let start = null;
    const rectFrom = (e) => {
      const x = Math.max(0, Math.min(wr.width, e.clientX - wr.left));
      const y = Math.max(0, Math.min(wr.height, e.clientY - wr.top));
      return { x: Math.min(x, start.x), y: Math.min(y, start.y), width: Math.abs(x - start.x), height: Math.abs(y - start.y) };
    };
    const draw = (e) => {
      const r = rectFrom(e);
      Object.assign(box.style, { left: r.x + 'px', top: r.y + 'px', width: r.width + 'px', height: r.height + 'px' });
      size.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
      box.classList.toggle('below', r.y < 30);
    };
    veil.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) { cancelArea(); return; }
      e.preventDefault();
      start = { x: e.clientX - wr.left, y: e.clientY - wr.top };
      try { veil.setPointerCapture(e.pointerId); } catch {}
      veil.classList.add('drawing');
      box.hidden = false;
      draw(e);
    });
    veil.addEventListener('pointermove', (e) => { if (start) draw(e); });
    veil.addEventListener('pointerup', (e) => {
      if (!start) return;
      const r = rectFrom(e);
      start = null;
      cancelArea();
      if (r.width < 6 || r.height < 6) { X.toast('Zone trop petite : trace un rectangle plus grand'); return; }
      shoot('area', r);
    });
    veil.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); cancelArea(); } });
    veil.addEventListener('contextmenu', (e) => { e.preventDefault(); cancelArea(); });
  }
  function cancelArea() {
    if (!veil) return false;
    veil.remove();
    veil = null;
    return true;
  }
  addEventListener('resize', cancelArea);
  shotBtn.addEventListener('click', () => shotMenu(shotBtn));

  // ================================================================== Traduction
  const trBtn = $('#b-translate');
  const dismissed = new Set(); // sites où l'on a répondu « Non » (le temps de cette fenêtre)
  const LANG = (() => { try { return new Intl.DisplayNames(['fr'], { type: 'language' }); } catch { return null; } })();
  const baseOf = (lang) => String(lang || '').split(/[-_]/)[0].toLowerCase();
  function langName(lang) {
    const b = baseOf(lang);
    let n = '';
    try { n = LANG ? LANG.of(b) : ''; } catch {}
    return n && n.toLowerCase() !== b ? n : b;
  }
  const forLang = (name) => (/^[aeiouyhéèêâîôû]/i.test(name) ? `l'${name}` : `le ${name}`);
  const translateUrl = (url) => `https://translate.google.com/translate?sl=auto&tl=fr&hl=fr&u=${encodeURIComponent(url)}`;
  function isTranslated(url) {
    try {
      const u = new URL(url);
      return /\.translate\.goog$/i.test(u.hostname) || (u.hostname === 'translate.google.com' && u.pathname.startsWith('/translate'));
    } catch { return false; }
  }
  // https://en-wikipedia-org.translate.goog/wiki/X?_x_tr_sl=auto… → https://en.wikipedia.org/wiki/X
  function originalOf(url) {
    try {
      const u = new URL(url);
      if (u.hostname === 'translate.google.com') return u.searchParams.get('u') || url;
      const host = u.hostname.replace(/\.translate\.goog$/i, '').split('--').map((s) => s.replace(/-/g, '.')).join('-');
      const scheme = u.searchParams.get('_x_tr_sch') === 'http' ? 'http' : 'https';
      for (const k of [...u.searchParams.keys()]) if (k.startsWith('_x_tr_')) u.searchParams.delete(k);
      const q = u.searchParams.toString();
      return `${scheme}://${host}${u.pathname}${q ? '?' + q : ''}${u.hash}`;
    } catch { return url; }
  }
  const canTranslate = (tab = active()) => !!tab && isWeb(urlOf(tab));
  const translateLabel = (tab = active()) => (tab && isTranslated(urlOf(tab)) ? 'Afficher la page originale' : 'Traduire en français');
  function translate(tab = active()) {
    if (!canTranslate(tab)) return;
    const url = urlOf(tab);
    tab.fsxBar = null;
    hideBar();
    if (isTranslated(url)) {
      const o = originalOf(url);
      tab.fsxNoAuto = o; // pas de traduction automatique sur la page qu'on vient de demander en VO
      X.navigate(o, tab);
      return;
    }
    X.navigate(translateUrl(url), tab);
  }

  async function onTabLoaded(t) {
    const url = urlOf(t);
    if (!isWeb(url) || !t.wv) { t.fsxLang = null; if (t === active()) queueRefresh(); return; }
    if (t.fsxLang && t.fsxLang.url === url) return;
    let lang = '';
    try { lang = String((await t.wv.executeJavaScript('document.documentElement.lang || ""')) || ''); } catch {}
    if (urlOf(t) !== url) return;
    t.fsxLang = { url, lang: lang.trim().slice(0, 24) };
    offerTranslation(t, url, t.fsxLang.lang);
    if (t === active()) queueRefresh();
  }

  function offerTranslation(t, url, lang) {
    if (!/^https:/i.test(url) || isTranslated(url)) return;
    const base = baseOf(lang);
    if (!base || base === 'fr') return;
    const s = settings();
    if (s.translateBar === false) return;
    if ((s.translateAlways || []).includes(base)) {
      if (t.fsxNoAuto === url) return;
      X.navigate(translateUrl(url), t);
      if (t === active()) X.toast(`Traduction automatique : ${langName(lang)} → français`);
      return;
    }
    if (dismissed.has(hostOf(url))) return;
    t.fsxBar = { url, lang, base };
  }

  function refreshTranslate(t) {
    const url = urlOf(t);
    const tr = canTranslate(t) && isTranslated(url);
    const info = t && t.fsxLang && t.fsxLang.url === url ? t.fsxLang : null;
    const foreign = !!(info && info.lang && baseOf(info.lang) !== 'fr');
    trBtn.hidden = !(tr || (canTranslate(t) && foreign)); // langue inconnue : menu et clic droit seulement
    trBtn.classList.toggle('on', tr);
    trBtn.title = tr ? 'Afficher la page originale' : foreign ? `Traduire en français (page en ${langName(info.lang)})` : 'Traduire en français';
    if (t && t.fsxBar && t.fsxBar.url === url) showBar(t); else hideBar();
  }
  trBtn.addEventListener('click', () => translate(active()));

  // Barre discrète sous la barre d'adresse.
  const bar = document.createElement('div');
  bar.id = 'translate-bar';
  bar.hidden = true;
  views.parentNode.insertBefore(bar, views);
  let barFor = null;
  function showBar(t) {
    const b = t.fsxBar;
    if (barFor === b && !bar.hidden) return;
    barFor = b;
    const name = langName(b.lang);
    bar.innerHTML = `<span class="tr-ic">${icon('languages')}</span>
      <span class="tr-t">Cette page est en <b>${esc(name)}</b> — Traduire en français ?</span>
      <span class="tr-grow"></span>
      <button class="tr-btn primary" data-a="go">Traduire</button>
      <button class="tr-btn" data-a="always">Toujours pour ${esc(forLang(name))}</button>
      <button class="tr-btn ghost" data-a="no">Non</button>`;
    bar.hidden = false;
    bar.querySelector('[data-a=go]').addEventListener('click', () => translate(t));
    bar.querySelector('[data-a=always]').addEventListener('click', () => {
      const list = [...new Set([...(settings().translateAlways || []), b.base])];
      X.saveSettings({ translateAlways: list });
      X.toast(`Les pages en ${name} seront toujours traduites 🔥`);
      translate(t);
    });
    bar.querySelector('[data-a=no]').addEventListener('click', () => {
      dismissed.add(hostOf(b.url));
      t.fsxBar = null;
      hideBar();
    });
  }
  function hideBar() {
    if (bar.hidden) return;
    bar.hidden = true;
    bar.textContent = '';
    barFor = null;
  }

  // ================================================================== Mode Fantôme
  if (GHOST) {
    const badge = $('#ghost-badge');
    badge.hidden = false;
    const openGhostTab = () => X.makeTab({ url: GHOST_HOME });
    X.commands['new-tab'] = openGhostTab;
    X.commands.home = () => X.navigate(GHOST_HOME);
    // Nouvel onglet et Accueil ouvrent l'accueil Fantôme (capture : avant les écouteurs de ui.js).
    $('#newtab').addEventListener('click', (e) => { e.stopImmediatePropagation(); openGhostTab(); }, true);
    $('#b-home').addEventListener('click', (e) => {
      if (e.ctrlKey) { e.stopImmediatePropagation(); X.makeTab({ url: GHOST_HOME, background: true }); return; }
      e.stopImmediatePropagation();
      X.navigate(GHOST_HOME);
    }, true);
    badge.addEventListener('click', () => {
      const pop = X.openPop(`<div class="gh-pop"><h3>${icon('ghost')} Mode Fantôme</h3>
        <p>Cette fenêtre oublie tout en se fermant : <b>historique, cookies, cache, onglets, autorisations</b>.
        ShoxVault peut remplir tes mots de passe, mais n'en enregistre aucun.</p>
        <p class="gh-dim">Restent : les fichiers téléchargés et les favoris. Les sites, ton école ou ton FAI peuvent toujours voir ce que tu fais.</p>
        <div class="pop-foot"><button class="link-btn" data-more>En savoir plus</button></div></div>`, badge);
      pop.querySelector('[data-more]').addEventListener('click', () => { X.closeLayer(); X.openUrlInTab(GHOST_HOME); });
    });
    // Couleurs des boutons de fenêtre (Windows) : celles du thème Fantôme, même si un thème les change.
    const overlay = () => S.setOverlay({ color: '#0d0c1b', symbolColor: '#ddd6ff', height: 44 });
    setTimeout(overlay, 50);
    S.onStoreChange((key) => { if (key === 'settings') setTimeout(overlay, 50); });
  }

  // ================================================================== raccourcis
  X.commands.shoxshot = () => shotMenu();
  const prevEscape = X.commands.escape;
  X.commands.escape = () => { if (cancelArea()) return; if (prevEscape) prevEscape(); };

  window.ShoxExtras = {
    canTranslate, translateLabel, translate, translateUrl, isTranslated, originalOf,
    shotMenu, shoot, selectArea, blockPop, blockChanged: () => { reloadIfWeb(active()); queueRefresh(); },
    // pour les tests (--run)
    state: () => {
      const t = active();
      return {
        url: urlOf(t), block: { n: blockBtn.querySelector('.blk-n').textContent, badge: !blockBtn.querySelector('.blk-n').hidden, off: blockBtn.classList.contains('off') },
        translate: { button: !trBtn.hidden, on: trBtn.classList.contains('on'), bar: !bar.hidden, text: bar.textContent.replace(/\s+/g, ' ').trim(), lang: t && t.fsxLang },
        ghost: GHOST, panel: window.ShoxPanel ? window.ShoxPanel.isOpen() : null,
      };
    },
  };
  queueRefresh();
})();
