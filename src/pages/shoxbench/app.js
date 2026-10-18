// ShoxBench — socle du site : onglets, ShoxCoins, TURBO, fenêtre modale, formats.
(function () {
  'use strict';
  const D = window.SB_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const SB = (window.SB = {
    D, $, $$,
    timeScale: 1, // accélère les tests (outil de capture) : 0.2 = 5× plus vite
    get turbo() { const s = FX.store.get('settings', {}) || {}; return !!s.turbo; },
  });

  SB.wait = (ms) => FX.sleep(ms * SB.timeScale);
  // « tic » d'aiguille limité (pas de crépitement quand elle hésite sur une graduation)
  let lastTick = 0;
  SB.tick = () => { const n = performance.now(); if (n - lastTick > 110) { lastTick = n; FX.sound('tick'); } };
  // Image suivante : requestAnimationFrame, avec un minuteur de secours quand la fenêtre est
  // masquée ou en arrière-plan (sinon le test resterait figé jusqu'au retour sur l'onglet).
  SB.frame = (fn) => {
    let done = false, a = 0, b = 0;
    const go = (t) => { if (done) return; done = true; cancelAnimationFrame(a); clearTimeout(b); fn(t); };
    a = requestAnimationFrame(go);
    b = setTimeout(() => go(performance.now()), 60);
  };
  SB.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  SB.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  SB.list = (key) => { const v = FX.store.get(key, []); return Array.isArray(v) ? v : []; };

  // Heure « chrono » : Aujourd’hui · 14:32:05
  SB.when = (t, short) => {
    const d = new Date(t), now = new Date();
    const hm = d.toLocaleTimeString('fr-FR', short ? { hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return (short ? '' : 'Aujourd’hui · ') + hm;
    if (d.toDateString() === y.toDateString()) return 'Hier · ' + hm;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' + hm;
  };
  // Débits : 2 décimales sous 1000, 1 au-dessus, entier pour la surchauffe
  SB.speed = (v) => (v >= 9999 ? FX.fmt(9999) : FX.fmt(v, v >= 1000 ? 1 : 2));

  // ---------------------------------------------------------------- ShoxCoins
  const coinsBtn = $('#coinsBtn'), coinsVal = $('#coinsVal');
  const readCoins = () => { const c = Number(FX.store.get('opening.coins', 1000)); return Number.isFinite(c) ? c : 1000; };
  function showCoins(v) { coinsVal.textContent = FX.fmt(v); }
  SB.addCoins = (n) => {
    const v = readCoins() + n;
    FX.store.set('opening.coins', v);
    showCoins(v);
    coinsBtn.classList.remove('bump'); void coinsBtn.offsetWidth; coinsBtn.classList.add('bump');
    FX.sound('coin');
    FX.toast(`+${n} ShoxCoins pour Shox Opening`);
  };
  coinsBtn.addEventListener('click', () => { FX.sound('click'); FX.open('fireshox://opening/'); });
  showCoins(readCoins());

  // ---------------------------------------------------------------- TURBO
  const turboHooks = [];
  SB.onTurbo = (fn) => turboHooks.push(fn);
  function applyTurbo() {
    const t = SB.turbo;
    $('#turboPill').hidden = !t;
    $('#turboTag').hidden = !t;
    document.body.classList.toggle('turbo', t);
    turboHooks.forEach((fn) => fn(t));
  }
  FX.store.onChange((key, value) => {
    if (key === 'opening.coins') showCoins(Number(value) || 0);
    if (key === 'settings') applyTurbo();
  });
  // Filet de sécurité : relire TURBO et les ShoxCoins quand on revient sur l'onglet
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { applyTurbo(); showCoins(readCoins()); } });
  addEventListener('focus', () => { applyTurbo(); showCoins(readCoins()); });

  // ---------------------------------------------------------------- onglets
  const TABS = ['debit', 'shoxometre'];
  const ink = $('.tab-ink');
  function placeInk() {
    const on = $('.tab.on'); if (!on) return;
    const nav = on.parentElement.getBoundingClientRect(), r = on.getBoundingClientRect();
    ink.style.left = r.left - nav.left + 10 + 'px';
    ink.style.width = r.width - 20 + 'px';
  }
  SB.tab = null;
  function showTab(name, user) {
    if (!TABS.includes(name)) name = 'debit';
    if (SB.tab === name) return;
    SB.tab = name;
    $$('.tab').forEach((b) => { b.classList.toggle('on', b.dataset.tab === name); b.setAttribute('aria-selected', b.dataset.tab === name); });
    $$('.sec').forEach((s) => { s.hidden = s.dataset.sec !== name; });
    placeInk();
    FX.store.set('bench.tab', name);
    document.title = name === 'debit' ? 'ShoxBench' : 'Shoxomètre · ShoxBench';
    if (user) { FX.sound('click'); window.scrollTo({ top: 0 }); }
    window.dispatchEvent(new CustomEvent('sb:tab', { detail: name }));
  }
  $$('.tab').forEach((b) => b.addEventListener('click', () => { history.replaceState(null, '', '#' + b.dataset.tab); showTab(b.dataset.tab, true); }));
  window.addEventListener('hashchange', () => showTab(location.hash.slice(1), true));
  window.addEventListener('resize', placeInk);
  document.fonts && document.fonts.ready.then(placeInk);

  // ---------------------------------------------------------------- fenêtre modale
  const back = $('#modal'), box = $('.modal', back);
  let onClose = null;
  SB.modal = {
    open(html, cls = '') {
      box.className = 'modal ' + cls;
      box.innerHTML = html;
      back.hidden = false;
      $$('[data-close]', box).forEach((b) => b.addEventListener('click', () => SB.modal.close()));
      return box;
    },
    close(result) {
      if (back.hidden) return;
      back.hidden = true; box.innerHTML = '';
      const fn = onClose; onClose = null; if (fn) fn(result);
    },
    onClose(fn) { onClose = fn; },
  };
  back.addEventListener('mousedown', (e) => { if (e.target === back) SB.modal.close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') SB.modal.close(); });

  // Confirmation dans la page (pas de confirm())
  SB.confirm = ({ title, text, ok = 'Effacer', cancel = 'Annuler' }) => new Promise((resolve) => {
    FX.sound('pop');
    const m = SB.modal.open(`
      <div class="md-icon"><svg class="ic"><use href="#i-trash"/></svg></div>
      <div class="md-head"><h3>${SB.esc(title)}</h3></div>
      <div class="md-body"><p>${text}</p></div>
      <div class="md-actions">
        <button class="fs-btn" data-close>${SB.esc(cancel)}</button>
        <button class="fs-btn danger" data-ok>${SB.esc(ok)}</button>
      </div>`, 'small');
    let answered = false;
    SB.modal.onClose(() => { if (!answered) resolve(false); });
    $('[data-ok]', m).addEventListener('click', () => { answered = true; SB.modal.close(); resolve(true); });
    setTimeout(() => $('[data-ok]', m)?.focus(), 30);
  });

  // ---------------------------------------------------------------- médailles (SVG, pas d’emoji)
  const MEDALS = [
    ['#fff4b8', '#ffc21a', '#c77700', '#5a3000'],
    ['#ffffff', '#c9d0da', '#7d8794', '#2d333b'],
    ['#ffd9b5', '#d98a4a', '#8a4518', '#3a1a05'],
  ];
  SB.medal = (rank) => {
    const [c1, c2, c3, ink2] = MEDALS[rank - 1];
    const id = 'md' + rank;
    return `<svg viewBox="0 0 32 32" aria-label="Médaille ${rank}">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient></defs>
      <path d="M9 1h6l3.2 9.5h-6z" fill="#ff5a1f"/><path d="M23 1h-6l-3.2 9.5h6z" fill="#c2360c"/>
      <circle cx="16" cy="20.5" r="10" fill="url(#${id})"/>
      <circle cx="16" cy="20.5" r="7.4" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1"/>
      <text x="16" y="24.6" text-anchor="middle" font-family="Bungee, sans-serif" font-size="11" fill="${ink2}">${rank}</text>
    </svg>`;
  };

  // ---------------------------------------------------------------- listes défilantes : fondu en bas s'il reste des lignes
  $$('.laps-scroll').forEach((el) => {
    const upd = () => el.classList.toggle('more', el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    el.addEventListener('scroll', upd, { passive: true });
    new ResizeObserver(upd).observe(el);
    new MutationObserver(upd).observe(el, { childList: true, subtree: true });
  });

  // ---------------------------------------------------------------- démarrage
  SB.boot = () => {
    applyTurbo();
    const start = location.hash.slice(1) || FX.store.get('bench.tab', 'debit');
    showTab(TABS.includes(start) ? start : 'debit');
  };
})();
