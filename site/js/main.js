/* Fire Shox — site de téléchargement. Aucune dépendance. */
(function () {
  'use strict';

  var REPO = 'zarkyxxx/fireshox';
  var SITE_URL = 'https://zarkyxxx.github.io/fireshox/';
  var API = 'https://api.github.com/repos/' + REPO + '/releases/latest';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var UA = navigator.userAgent || '';
  var isTouchDevice = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(UA) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(UA));
  var isWindows = /Windows NT/i.test(UA) && !isTouchDevice;
  if (isTouchDevice) root.classList.add('is-touch');
  if (!isWindows && !isTouchDevice) root.classList.add('not-windows');

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ------------------------------------------------------------------
     Toasts
     ------------------------------------------------------------------ */
  var toastWrap = $('#toasts');
  function toast(build, ms) {
    var t = el('div', 'toast');
    var ico = el('img'); ico.src = 'img/logo-64.png'; ico.alt = '';
    t.appendChild(ico);
    var body = el('div');
    if (typeof build === 'function') build(body); else body.textContent = build;
    t.appendChild(body);
    toastWrap.appendChild(t);
    while (toastWrap.children.length > 2) toastWrap.removeChild(toastWrap.firstChild);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 400);
    }, ms || 5200);
  }

  /* ------------------------------------------------------------------
     Braises (canvas plein écran, derrière le contenu)
     ------------------------------------------------------------------ */
  var Embers = (function () {
    var cv = $('#embers');
    if (!cv || !cv.getContext) return { burst: function () {} };
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, DPR = 1, parts = [], last = 0, running = true, target = 0, lastScroll = window.scrollY;

    function sprite(r, g, b) {
      var c = document.createElement('canvas'); c.width = c.height = 64;
      var x = c.getContext('2d');
      var gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,250,225,1)');
      gr.addColorStop(0.16, 'rgba(' + r + ',' + g + ',' + b + ',.95)');
      gr.addColorStop(0.42, 'rgba(' + r + ',' + g + ',' + b + ',.25)');
      gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      return c;
    }
    var SPR = [sprite(255, 214, 90), sprite(255, 140, 24), sprite(255, 72, 12)];

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      target = Math.round(Math.min(150, (W * H) / 10500) * (reduce ? 0.35 : 1));
    }

    function spawn(o) {
      o = o || {};
      var burst = !!o.burst;
      parts.push({
        x: o.x != null ? o.x : Math.random() * W,
        y: o.y != null ? o.y : H + 12,
        vx: o.vx != null ? o.vx : (Math.random() - 0.5) * 16,
        vy: o.vy != null ? o.vy : -(20 + Math.random() * 60),
        size: o.size || (1.1 + Math.random() * 3.1),
        life: 0,
        max: o.max || (4 + Math.random() * 7),
        ph: Math.random() * 6.283,
        sw: 0.6 + Math.random() * 1.7,
        burst: burst
      });
    }

    function burst(x, y, n, power) {
      if (reduce) n = Math.round(n / 3);
      power = power || 1;
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6;
        var s = (90 + Math.random() * 300) * power;
        spawn({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: 1.6 + Math.random() * 3.6, max: 0.9 + Math.random() * 1.6, burst: true });
      }
      wake();
    }

    var heroLogo = $('#heroLogo');
    function heroSparks(dt) {
      if (!heroLogo || window.scrollY > H) return;
      if (Math.random() > dt * (reduce ? 3 : 14)) return;
      var r = heroLogo.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2, rad = r.width * 0.47;
      var a = Math.random() * Math.PI * 2;
      spawn({
        x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad,
        vx: Math.cos(a) * (10 + Math.random() * 30), vy: -(25 + Math.random() * 70),
        size: 0.9 + Math.random() * 2.2, max: 1.4 + Math.random() * 2.4
      });
    }

    function frame(t) {
      if (!running) return;
      var dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      // décalage de parallaxe quand on fait défiler
      var sy = window.scrollY, dScroll = sy - lastScroll; lastScroll = sy;

      var calm = 0; for (var k = 0; k < parts.length; k++) if (!parts[k].burst) calm++;
      var need = target - calm;
      if (need > 0) { var add = Math.min(need, Math.max(1, Math.round(target * dt * 0.35))); for (var j = 0; j < add; j++) spawn(); }
      heroSparks(dt);

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      var slow = reduce ? 0.4 : 1;
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.life += dt;
        p.ph += dt * p.sw * 2;
        if (p.burst) {
          p.vx *= (1 - 1.8 * dt); p.vy = p.vy * (1 - 1.6 * dt) - 40 * dt;
        } else {
          p.vx += Math.sin(p.ph) * 14 * dt;
          p.vx *= (1 - 0.5 * dt);
        }
        p.x += p.vx * dt * slow;
        p.y += p.vy * dt * slow - dScroll * (p.burst ? 0 : 0.18);
        var k2 = p.life / p.max;
        if (k2 >= 1 || p.y < -30 || p.x < -40 || p.x > W + 40) { parts.splice(i, 1); continue; }
        var alpha = k2 < 0.12 ? k2 / 0.12 : 1 - (k2 - 0.12) / 0.88;
        alpha *= 0.72 + 0.28 * Math.sin(t * 0.018 + p.ph * 5);
        var spr = SPR[k2 < 0.3 ? 0 : k2 < 0.65 ? 1 : 2];
        var s = p.size * (1 - k2 * 0.45) * 7;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.drawImage(spr, p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }

    function wake() { if (!running && !document.hidden) { running = true; last = 0; requestAnimationFrame(frame); } }

    resize();
    for (var i = 0; i < target; i++) { spawn({ y: Math.random() * H }); parts[parts.length - 1].life = Math.random() * 3; }
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) running = false; else wake();
    });
    requestAnimationFrame(frame);
    return { burst: burst };
  })();

  /* ------------------------------------------------------------------
     Apparition au défilement
     ------------------------------------------------------------------ */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (n) { io.observe(n); });
  } else {
    reveals.forEach(function (n) { n.classList.add('in'); });
  }

  /* ------------------------------------------------------------------
     Barre du haut
     ------------------------------------------------------------------ */
  var topbar = $('#topbar');
  function onScroll() { topbar.classList.toggle('scrolled', window.scrollY > 12); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  var heroCta = $('.hero .cta');
  if (heroCta && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      topbar.classList.toggle('past-hero', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(heroCta);
  } else {
    topbar.classList.add('past-hero');
  }

  /* ------------------------------------------------------------------
     Captures : la vraie image remplace l'illustration si elle existe
     ------------------------------------------------------------------ */
  $$('[data-shot]').forEach(function (fig) {
    var img = $('img', fig);
    if (!img) return;
    function ok() { if (img.naturalWidth > 0) fig.classList.add('has-img'); }
    if (img.complete) ok();
    img.addEventListener('load', ok);
    img.addEventListener('error', function () { fig.classList.add('no-img'); });
  });

  /* ------------------------------------------------------------------
     Dernière version (API GitHub), avec repli propre
     ------------------------------------------------------------------ */
  function fmtSize(b) {
    var mo = b / 1048576;
    return (mo >= 100 ? Math.round(mo) : mo.toFixed(1)).toString().replace('.', ',') + ' Mo';
  }
  function fmtDate(iso) {
    try { return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)); }
    catch (e) { return iso.slice(0, 10); }
  }
  function fmtInt(n) {
    try { return n.toLocaleString('fr-FR'); } catch (e) { return String(n); }
  }

  function applyRelease(d) {
    if (!d) return;
    var bits = [];
    if (d.tag) bits.push(['Version ', String(d.tag).replace(/^v/i, '')]);
    if (d.size) bits.push(['', fmtSize(d.size)]);
    if (d.date) bits.push(['', fmtDate(d.date)]);
    if (!bits.length) return;
    $$('[data-meta]').forEach(function (m) {
      m.textContent = '';
      var main = el('span', 'm-main');
      bits.forEach(function (b, i) {
        if (i) main.appendChild(document.createTextNode(' · '));
        if (b[0]) main.appendChild(document.createTextNode(b[0]));
        main.appendChild(el('b', null, b[1]));
      });
      var sub = 'Windows 10 / 11 · 64 bits';
      if (d.downloads > 0) sub += ' · ' + fmtInt(d.downloads) + (d.downloads > 1 ? ' téléchargements' : ' téléchargement');
      m.appendChild(main);
      m.appendChild(el('span', 'm-sub', sub));
      m.classList.add('live');
    });
    if (d.url && /^https:\/\/github\.com\//.test(d.url)) {
      $$('a[data-dl]').forEach(function (a) { a.href = d.url; });
    }
  }

  function loadRelease() {
    var KEY = 'fireshox-release-v1';
    try {
      var cached = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (cached && Date.now() - cached.t < 10 * 60 * 1000) { applyRelease(cached.d); return; }
    } catch (e) { /* stockage indisponible : tant pis */ }
    if (!window.fetch) return;
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 7000);
    fetch(API, { headers: { Accept: 'application/vnd.github+json' }, signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        clearTimeout(timer);
        var exes = (j.assets || []).filter(function (a) { return /\.exe$/i.test(a.name); });
        exes.sort(function (a, b) { return (/setup/i.test(b.name) ? 1 : 0) - (/setup/i.test(a.name) ? 1 : 0); });
        var exe = exes[0];
        var d = {
          tag: j.tag_name || j.name || '',
          date: j.published_at || j.created_at || '',
          size: exe ? exe.size : 0,
          url: exe ? exe.browser_download_url : '',
          downloads: exes.reduce(function (s, a) { return s + (a.download_count || 0); }, 0)
        };
        try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { /* rien */ }
        applyRelease(d);
      })
      .catch(function () { clearTimeout(timer); /* on garde « Windows 10 / 11 · 64 bits » */ });
  }
  loadRelease();

  /* ------------------------------------------------------------------
     Boutons de téléchargement
     ------------------------------------------------------------------ */
  function pageUrl() {
    return /^https?:/.test(location.protocol) ? location.origin + location.pathname : SITE_URL;
  }
  $$('a[data-dl]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var r = a.getBoundingClientRect();
      Embers.burst(r.left + r.width / 2, r.top + r.height / 2, a.classList.contains('btn-mini') ? 24 : 60, 1.1);

      if (isTouchDevice) {
        ev.preventDefault();
        var url = pageUrl();
        var data = { title: 'Fire Shox', text: 'Fire Shox, le navigateur 100 % incandescent. À installer sur un PC Windows :', url: url };
        var copy = function () {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function () {
              toast('Lien copié ! Ouvrez-le sur votre PC Windows pour installer Fire Shox.');
            }, function () { toast('Ouvrez ' + url + ' sur votre PC Windows.', 7000); });
          } else toast('Ouvrez ' + url + ' sur votre PC Windows.', 7000);
        };
        if (navigator.share) navigator.share(data).catch(function (e) { if (!e || e.name !== 'AbortError') copy(); });
        else copy();
        return;
      }

      toast(function (b) {
        b.appendChild(document.createTextNode('C’est parti ! Si Windows affiche un message bleu : '));
        var link = el('a', null, 'voici quoi faire');
        link.href = '#faq-smartscreen';
        link.addEventListener('click', function () { openFaq($('#faq-smartscreen')); });
        b.appendChild(link);
        b.appendChild(document.createTextNode('.'));
      }, 8000);
    });
  });

  /* ------------------------------------------------------------------
     FAQ : ouverture / fermeture animées
     ------------------------------------------------------------------ */
  function openFaq(d) { if (d && !d.open) $('summary', d).click(); }
  $$('.faq-list details').forEach(function (d) {
    var sum = $('summary', d), body = $('.faq-a', d);
    sum.addEventListener('click', function (e) {
      if (reduce || !body.animate) return;
      e.preventDefault();
      if (d.dataset.anim) return;
      d.dataset.anim = '1';
      var pad = getComputedStyle(body).paddingBottom;
      if (!d.open) {
        d.open = true;
        var h = body.offsetHeight;
        body.animate([{ height: '0px', paddingBottom: '0px', opacity: 0 }, { height: h + 'px', paddingBottom: pad, opacity: 1 }],
          { duration: 340, easing: 'cubic-bezier(.2,.75,.2,1)' }).onfinish = function () { delete d.dataset.anim; };
      } else {
        var h2 = body.offsetHeight;
        body.animate([{ height: h2 + 'px', paddingBottom: pad, opacity: 1 }, { height: '0px', paddingBottom: '0px', opacity: 0 }],
          { duration: 260, easing: 'ease-in' }).onfinish = function () { d.open = false; delete d.dataset.anim; };
      }
    });
  });
  if (location.hash === '#faq-smartscreen') openFaq($('#faq-smartscreen'));

  /* ------------------------------------------------------------------
     Compteurs (stats)
     ------------------------------------------------------------------ */
  var counters = $$('[data-count]');
  function runCounter(n) {
    var to = +n.getAttribute('data-count');
    if (reduce || to === 0) { n.textContent = fmtInt(to); return; }
    var t0 = performance.now(), dur = 1700;
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - k, 4);
      n.textContent = fmtInt(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (n) { n.textContent = '0'; cio.observe(n); });
  }

  /* ------------------------------------------------------------------
     Logo du héros : inclinaison à la souris, rebond + braises au clic
     ------------------------------------------------------------------ */
  var logoWrap = $('#heroLogo'), logoBtn = $('#logoBtn');
  if (logoWrap && window.matchMedia && matchMedia('(pointer: fine)').matches && !reduce) {
    var hero = $('.hero'), raf = 0, mx = 0, my = 0;
    hero.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var r = logoWrap.getBoundingClientRect();
        var dx = (mx - (r.left + r.width / 2)) / window.innerWidth;
        var dy = (my - (r.top + r.height / 2)) / window.innerHeight;
        logoWrap.style.setProperty('--ry', (dx * 16).toFixed(2) + 'deg');
        logoWrap.style.setProperty('--rx', (-dy * 16).toFixed(2) + 'deg');
      });
    });
    hero.addEventListener('pointerleave', function () {
      logoWrap.style.setProperty('--rx', '0deg'); logoWrap.style.setProperty('--ry', '0deg');
    });
  }
  var clicks = 0;
  var LINES = {
    5: 'Mode TURBO activé. C’est un placebo, mais vous le sentez, hein ?',
    12: 'Attention : surchauffe du logo. Laissez refroidir 3 secondes.',
    25: 'Vous avez débloqué : « Ami des ressorts ». Aucune récompense, mais quelle fierté.'
  };
  if (logoBtn) logoBtn.addEventListener('click', function (e) {
    clicks++;
    logoBtn.classList.remove('boing'); void logoBtn.offsetWidth; logoBtn.classList.add('boing');
    var r = logoBtn.getBoundingClientRect();
    var x = e.clientX || (r.left + r.width / 2), y = e.clientY || (r.top + r.height / 2);
    Embers.burst(x, y, 70, 1.25);
    if (LINES[clicks]) toast(LINES[clicks]);
  });

  /* ------------------------------------------------------------------
     Bandeaux qui défilent : on remplit pour couvrir l'écran, puis on boucle
     ------------------------------------------------------------------ */
  $$('.tape-track').forEach(function (tr, idx) {
    var set = Array.prototype.slice.call(tr.children);
    var need = window.innerWidth * 1.25 + 300, guard = 0;
    while (tr.scrollWidth < need && guard++ < 12) set.forEach(function (n) { tr.appendChild(n.cloneNode(true)); });
    Array.prototype.slice.call(tr.children).forEach(function (n) { tr.appendChild(n.cloneNode(true)); });
    var half = tr.scrollWidth / 2;
    tr.style.setProperty('--dur', (half / (idx === 0 ? 38 : 62)).toFixed(1) + 's');
    tr.classList.add('run');
  });
})();
