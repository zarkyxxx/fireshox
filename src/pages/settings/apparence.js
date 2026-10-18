// Fire Shox — Paramètres : choix du thème du navigateur (Fire / Squid / LFI) et onglets qui dorment.
// Réglages (clé « settings ») : theme = 'fire' | 'squid' | 'lfi' ; sleepAfter = minutes (0 = jamais).
// Images des cartes : /assets/cards/boosters/<thème>.png (sinon, un dégradé aux couleurs du thème).
(function () {
  'use strict';
  const THEMES = [
    {
      id: 'fire', name: 'Fire Shox', desc: 'Orange brûlant et braises jaunes. L’original, 100 % incandescent.',
      img: '/assets/cards/boosters/fire.png', pos: '50% 34%',
      mock: { strip: '#0e0d13', bar: '#15131b', acc: '#ff8a00', grad: 'linear-gradient(90deg,#ff4800,#ff8a00 55%,#ffc21a)' },
      sparks: ['#ffd84a', '#ffb000', '#ff7a00', '#ff3d00', '#fff2c0'], c1: '#ff7a00', c2: '#ffc21a',
    },
    {
      id: 'squid', name: 'Squid Shox', desc: 'Rose néon, vert sarcelle et ○ △ □. Que le meilleur rebondisse.',
      img: '/assets/cards/boosters/squid.png', pos: '50% 26%',
      mock: { strip: '#061114', bar: '#0a181c', acc: '#ff2f7d', grad: 'linear-gradient(90deg,#ff2f7d,#ff5c9d 55%,#ff8cbc)' },
      sparks: ['#ff2f7d', '#ff8cbc', '#12b98a', '#5fe0c0', '#ffe3ef'], c1: '#ff2f7d', c2: '#12b98a',
    },
    {
      id: 'lfi', name: 'LFI Shox', desc: 'Rouge vif, bordeaux et crème. Les Shox au premier rang.',
      img: '/assets/cards/boosters/lfi.png', pos: '50% 20%',
      mock: { strip: '#120608', bar: '#1a090c', acc: '#ff2a3d', grad: 'linear-gradient(90deg,#d6102c,#ff2a3d 55%,#ff5a4c)' },
      sparks: ['#ff2a3d', '#ff6b57', '#ffe2c2', '#c8102e', '#fff4e8'], c1: '#ff2a3d', c2: '#ffe2c2',
    },
  ];
  const SLEEP = [{ v: 5, l: '5 min' }, { v: 15, l: '15 min' }, { v: 30, l: '30 min' }, { v: 60, l: '1 h' }, { v: 0, l: 'Jamais' }];

  const get = () => FX.store.get('settings', {}) || {};
  const save = (patch) => FX.store.set('settings', { ...get(), ...patch });
  const themeNow = () => (FX.theme ? FX.theme.get() : (get().theme || 'fire'));
  const sleepNow = () => { const v = get().sleepAfter; return v === undefined || v === null || v === '' ? 30 : Number(v); };

  // ---------------------------------------------------------------- cartes des thèmes
  const grid = document.getElementById('theme-cards');
  if (grid) {
    grid.innerHTML = THEMES.map((t) => `
      <button class="th-card" role="radio" data-theme-id="${t.id}" style="--c1:${t.c1};--c2:${t.c2}">
        <span class="th-img" style="background-image:url('${t.img}'),radial-gradient(120% 90% at 50% 20%, ${t.c1}, ${t.mock.strip} 70%);background-position:${t.pos},center"></span>
        <span class="th-shade"></span>
        <span class="th-badge"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>Activé</span>
        <span class="th-body">
          <span class="th-mock" style="--ms:${t.mock.strip};--mb:${t.mock.bar};--ma:${t.mock.acc};--mg:${t.mock.grad}" aria-hidden="true">
            <i class="mk-strip"><i class="mk-logo"></i><i class="mk-tab on"></i><i class="mk-tab"></i></i>
            <i class="mk-bar"><i class="mk-omni"></i><i class="mk-turbo"></i></i>
          </span>
          <b class="th-name">${t.name}</b>
          <small class="th-desc">${t.desc}</small>
        </span>
      </button>`).join('');
    grid.querySelectorAll('.th-card').forEach((card) => {
      card.addEventListener('click', () => {
        const t = THEMES.find((x) => x.id === card.dataset.themeId);
        if (!t || themeNow() === t.id) { FX.sound('click'); return; }
        if (FX.theme) FX.theme.set(t.id); else save({ theme: t.id });
        markTheme();
        const r = card.getBoundingClientRect();
        FX.burst(r.left + r.width / 2, r.top + r.height * 0.42, { count: 70, colors: t.sparks, spread: 8 });
        FX.sound('pop');
        FX.toast(`Thème ${t.name} activé`);
      });
    });
  }
  function markTheme() {
    const cur = themeNow();
    document.querySelectorAll('.th-card').forEach((c) => {
      const on = c.dataset.themeId === cur;
      c.classList.toggle('on', on);
      c.setAttribute('aria-checked', String(on));
    });
  }

  // ---------------------------------------------------------------- onglets qui dorment
  const seg = document.getElementById('sleep-seg');
  if (seg) {
    seg.innerHTML = SLEEP.map((o) => `<button role="radio" data-v="${o.v}">${o.l}</button>`).join('') + '<i class="seg-pill"></i>';
    seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      save({ sleepAfter: Number(b.dataset.v) });
      markSleep();
      FX.sound('click');
      FX.toast(Number(b.dataset.v) ? `Les onglets inutilisés s'endorment après ${b.textContent}` : 'Les onglets ne s’endorment plus');
    }));
  }
  function markSleep() {
    if (!seg) return;
    const v = sleepNow();
    let on = null;
    seg.querySelectorAll('button').forEach((b) => {
      const yes = Number(b.dataset.v) === v;
      b.classList.toggle('on', yes);
      b.setAttribute('aria-checked', String(yes));
      if (yes) on = b;
    });
    const pill = seg.querySelector('.seg-pill');
    if (pill && on) { pill.style.width = on.offsetWidth + 'px'; pill.style.transform = `translateX(${on.offsetLeft}px)`; pill.style.opacity = '1'; } else if (pill) pill.style.opacity = '0';
  }

  FX.store.onChange((k) => { if (k === 'settings') { markTheme(); markSleep(); } });
  document.addEventListener('fs-theme', markTheme);
  addEventListener('resize', markSleep);
  markTheme();
  markSleep();
  // La pastille du sélecteur se place une fois les polices chargées.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(markSleep);
})();
