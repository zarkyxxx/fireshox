// Shox Runner — page fireshox://runner/ (le moteur est dans game.js, partagé avec la page d'erreur)
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const pad = (n) => String(Math.max(0, Math.floor(n))).padStart(5, '0');

  const CARDS = [
    { k: 'plot', t: 'Plots de chantier', d: 'Par un, deux ou trois. Un petit saut suffit.' },
    { k: 'poubelle', t: 'Poubelles du blocus', d: 'Le lycée est bloqué. La route aussi.' },
    { k: 'pile', t: 'Barricade', d: '« On veut des Shox » : pancarte comprise, saute haut.' },
    { k: 'cones', t: 'Cônes ○△□', d: 'Tout droit sortis du jeu du calamar.' },
    { k: 'dalgona', t: 'Biscuits dalgona', d: 'Ils volent : en bas, saute ; au milieu, baisse-toi.' },
    { k: 'jack', t: 'Jack Shi à vélo', d: 'Après 1 200 points, il arrive en face. Dring dring !' },
    { k: 'shox', t: 'Shox enflammée', d: 'Bonus : +25 points par Shox ramassée.', bonus: true },
  ];
  $('#cards').innerHTML = CARDS.map((c) => `<div class="card${c.bonus ? ' bonus' : ''}"><canvas data-icon="${c.k}"></canvas><b>${c.t}</b><small>${c.d}</small></div>`).join('');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  for (const cv of document.querySelectorAll('canvas[data-icon]')) {
    cv.width = Math.round(110 * dpr); cv.height = Math.round(66 * dpr);
    ShoxRunner.drawIcon(cv, cv.dataset.icon);
  }

  function refresh() {
    $('#best').textContent = pad(FX.store.get('jeux.runner.best', 0) || 0);
    $('#games').textContent = FX.fmt(FX.store.get('jeux.runner.parties', 0) || 0);
    const coins = Number(FX.store.get('opening.coins', 1000));
    $('#coins').textContent = FX.fmt(Number.isFinite(coins) ? coins : 1000);
  }
  refresh();
  FX.store.onChange((k) => { if (k === 'opening.coins' || (k && k.startsWith('jeux.runner'))) refresh(); });

  const stage = $('#stage');
  const game = ShoxRunner.mount(stage, {
    onEnd(r) {
      setTimeout(refresh, 60);
      if (r.record && r.score > 0) {
        const b = $('#best').closest('.chip');
        b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
      }
    },
  });
  game.focus();

  $('#full').addEventListener('click', () => {
    FX.sound('click');
    if (document.fullscreenElement) document.exitFullscreen();
    else stage.requestFullscreen().then(() => game.focus()).catch(() => FX.toast('Plein écran indisponible ici.'));
  });
  document.addEventListener('fullscreenchange', () => { $('#full').blur(); game.focus(); });

  window.RunnerPage = { game };
})();
