// Fire Shox — accueil Fantôme : recherche (moteur des réglages) et Shox spectrales qui flottent.
(function () {
  'use strict';
  const ENGINES = {
    google: 'https://www.google.com/search?q=%s',
    duckduckgo: 'https://duckduckgo.com/?q=%s',
    bing: 'https://www.bing.com/search?q=%s',
    qwant: 'https://www.qwant.com/?q=%s',
    ecosia: 'https://www.ecosia.org/search?q=%s',
    brave: 'https://search.brave.com/search?q=%s',
  };
  const NAMES = { google: 'Google', duckduckgo: 'DuckDuckGo', bing: 'Bing', qwant: 'Qwant', ecosia: 'Ecosia', brave: 'Brave Search' };
  const settings = FX.store.get('settings', {}) || {};
  const engine = ENGINES[settings.engine] ? settings.engine : 'google';
  const q = document.getElementById('q');
  q.placeholder = `Rechercher sur ${NAMES[engine]} sans laisser de traces…`;

  document.getElementById('search').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = q.value.trim();
    if (!t) { q.focus(); return; }
    let url;
    if (/^(https?|fireshox):\/\//i.test(t)) url = t;
    else if (!/\s/.test(t) && /^[^/?#\s]+\.[a-z][a-z0-9-]{1,62}([/?#].*)?$/i.test(t)) url = 'https://' + t;
    else url = ENGINES[engine].replace('%s', encodeURIComponent(t));
    location.href = url;
  });
  setTimeout(() => q.focus(), 60);

  document.getElementById('another').addEventListener('click', () => {
    if (window.fireshox && fireshox.newGhostWindow) fireshox.newGhostWindow();
    else FX.toast('Ctrl+Maj+N pour une nouvelle fenêtre Fantôme');
  });

  // Shox fantômes : silhouette de basket à ressorts, deux yeux, une traîne de brume.
  const SHOE = `<svg viewBox="0 0 124 84" aria-hidden="true">
    <defs><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4deff" stop-opacity=".34"/><stop offset="1" stop-color="#9a87ff" stop-opacity=".08"/></linearGradient></defs>
    <path d="M8 46 Q8 25 27 20 L45 17 Q53 16 59 23 L71 31 Q90 33 106 38 Q117 41 117 48 L117 52 L8 52 Z" fill="url(#gs)" stroke="#d6ceff" stroke-opacity=".75" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M30 22 Q40 30 58 26" fill="none" stroke="#d6ceff" stroke-opacity=".45" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M70 32 l6 -6 M78 34 l6 -6 M86 36 l5 -5" stroke="#d6ceff" stroke-opacity=".45" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M8 52 L117 52 Q117 57 110 58 L50 58 L50 56 L8 56 Z" fill="#cfc6ff" fill-opacity=".14" stroke="#d6ceff" stroke-opacity=".6" stroke-width="1.3"/>
    <g fill="none" stroke="#8fe3ff" stroke-opacity=".75" stroke-width="2" stroke-linecap="round">
      <path d="M13 57 v8"/><path d="M23 57 v8"/><path d="M33 57 v8"/><path d="M43 57 v8"/>
    </g>
    <rect x="8" y="65" width="42" height="5" rx="2.5" fill="#cfc6ff" fill-opacity=".18" stroke="#d6ceff" stroke-opacity=".6" stroke-width="1.2"/>
    <ellipse cx="38" cy="36" rx="3" ry="4" fill="#0b0726" fill-opacity=".85"/><ellipse cx="50" cy="35" rx="3" ry="4" fill="#0b0726" fill-opacity=".85"/>
    <path d="M14 71 Q20 80 28 74 Q34 82 42 75 Q47 81 52 76" fill="none" stroke="#c9bbff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;
  const zone = document.getElementById('shoes');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = innerWidth > 1300 ? 9 : 7;
  for (let i = 0; i < N; i++) {
    const s = document.createElement('div');
    s.className = 'shoe';
    s.innerHTML = SHOE;
    const w = FX.rand(70, 150);
    const side = i % 2 ? FX.rand(62, 94) : FX.rand(-4, 30); // plutôt sur les bords, loin du texte
    s.style.cssText = [
      `left:${side}%`, `top:${FX.rand(4, 88)}%`, `--w:${w}px`, `--o:${FX.rand(0.28, 0.6).toFixed(2)}`,
      `--d:${FX.rand(14, 26).toFixed(1)}s`, `--h:${FX.rand(4, 8).toFixed(1)}s`, `--delay:${(-FX.rand(0, 20)).toFixed(1)}s`,
      `--dx:${FX.rand(-70, 70).toFixed(0)}px`, `--dy:${FX.rand(-60, 40).toFixed(0)}px`, `--r:${FX.rand(-14, 14).toFixed(0)}deg`,
    ].join(';');
    if (Math.random() < 0.5) s.firstElementChild.style.transform = 'scaleX(-1)'; // certaines vont dans l'autre sens
    if (reduce) s.style.animation = 'none';
    zone.appendChild(s);
  }
})();
