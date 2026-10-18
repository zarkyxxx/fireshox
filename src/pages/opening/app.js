// Shox Opening — boutique, ShoxCoins, collection, vue détaillée, recyclage, bonus quotidien.
// Clés sauvegardées (FX.store) :
//   opening.coins      nombre de ShoxCoins (1000 au départ ; d'autres sites peuvent en ajouter)
//   opening.inventory  { "booster/id-carte": { n: nombre possédé, t: date d'obtention, fresh: pas encore vue } }
//   opening.stats      { packs, cards, legends, epics, spent, earned, recycled, byBooster: {…} }
//   opening.daily      { last: "AAAA-MM-JJ", streak: jours d'affilée }
//   opening.ui         { filter, missing } (préférences d'affichage de la collection)
// Options de test cachées (dans l'adresse) : ?force=legend|mec|epic|rare|common  ?reset=1  ?coins=5000
//   ?open=squid|fire|lfi  ?view=collection  ?fill=20  ?detail=fire/le-mec
(function () {
  'use strict';
  const D = window.SO_DATA, C = window.SO_CARDS, PX = window.SO_PX, O = window.SO_OPEN;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const esc = C.esc;
  const K = { coins: 'opening.coins', inv: 'opening.inventory', stats: 'opening.stats', daily: 'opening.daily', ui: 'opening.ui' };
  const q = new URLSearchParams(location.search);
  const FORCE = q.get('force');
  const RANK = (r) => D.rarities[r].rank;

  // ------------------------------------------------------------ état sauvegardé
  const readCoins = () => { const v = FX.store.get(K.coins, null); return typeof v === 'number' && isFinite(v) ? Math.max(0, Math.round(v)) : null; };
  const defaultStats = () => ({ packs: 0, cards: 0, legends: 0, epics: 0, spent: 0, earned: 0, recycled: 0, byBooster: {} });
  if (q.get('reset')) {
    FX.store.set(K.coins, D.economy.start); FX.store.set(K.inv, {}); FX.store.set(K.stats, defaultStats());
    FX.store.set(K.daily, null); FX.store.set(K.ui, {});
  }
  if (readCoins() === null) FX.store.set(K.coins, D.economy.start);
  if (q.get('coins')) FX.store.set(K.coins, Math.max(0, parseInt(q.get('coins'), 10) || 0));
  let coinVal = readCoins() ?? D.economy.start;
  let inv = sanitizeInv(FX.store.get(K.inv, {}));
  let stats = Object.assign(defaultStats(), FX.store.get(K.stats, {}) || {});
  stats.byBooster = stats.byBooster || {};
  let ui = Object.assign({ filter: 'all', missing: false }, FX.store.get(K.ui, {}) || {});

  function sanitizeInv(v) {
    const out = {};
    if (v && typeof v === 'object') for (const [k, e] of Object.entries(v)) if (D.card(k) && e && e.n > 0) out[k] = { n: Math.floor(e.n), t: e.t || Date.now(), fresh: !!e.fresh };
    return out;
  }
  function save() { FX.store.set(K.inv, inv); FX.store.set(K.stats, stats); }
  const coins = () => coinVal;
  function setCoins(v) { coinVal = Math.max(0, Math.round(v)); FX.store.set(K.coins, coinVal); paintCoins(); }
  function addCoins(n) { const cur = readCoins(); setCoins((cur ?? coinVal) + n); }
  if (FX.store.onChange) {
    FX.store.onChange((key, value) => {
      if (key === K.coins && typeof value === 'number' && Math.round(value) !== coinVal) {
        const diff = Math.round(value) - coinVal;
        coinVal = Math.round(value);
        paintCoins();
        if (diff > 0) { const r = $('#coins').getBoundingClientRect(); floatText(r.left + r.width / 2, r.bottom + 14, '+' + diff); }
      }
    });
  }

  // ------------------------------------------------------------ tirage
  function rollRarity() {
    const list = ['common', 'rare', 'epic', 'legend'];
    const tot = list.reduce((t, r) => t + D.rarities[r].weight, 0);
    let x = Math.random() * tot;
    for (const r of list) { x -= D.rarities[r].weight; if (x < 0) return r; }
    return 'common';
  }
  function pickCard(b, rarity) {
    const list = b.cards.filter((c) => c.rarity === rarity);
    const tot = list.reduce((t, c) => t + (c.w || 1), 0);
    let x = Math.random() * tot;
    for (const c of list) { x -= c.w || 1; if (x < 0) return c; }
    return list[list.length - 1];
  }
  function drawPack(b) {
    let out = [];
    for (let i = 0; i < 7; i++) out.push(pickCard(b, rollRarity()));
    if (FORCE === 'legend') out[6] = pickCard(b, 'legend');
    else if (FORCE === 'mec') out[6] = b.cards.find((c) => c.rarity === 'legend' && c.art && c.art.logo);
    else if (FORCE === 'epic') out[6] = pickCard(b, 'epic');
    else if (FORCE === 'rare') out[6] = pickCard(b, 'rare');
    else if (FORCE === 'common') out = out.map(() => pickCard(b, 'common'));
    // suspense : les plus rares à la fin
    return out.map((c, i) => ({ c, i })).sort((x, y) => RANK(x.c.rarity) - RANK(y.c.rarity) || x.i - y.i).map((x) => x.c);
  }

  // ------------------------------------------------------------ achat
  function buy(id, srcEl, opts = {}) {
    const b = D.booster(id);
    if (!b) return false;
    if (O.active() && !opts.again) return false;
    const have = readCoins() ?? coinVal;
    if (have < b.price) { poor(b, srcEl, have); return false; }
    setCoins(have - b.price);
    if (srcEl) { const r = srcEl.getBoundingClientRect(); floatText(r.left + r.width / 2, r.top, '−' + b.price, true); }
    FX.sound('coin');
    $('#coins').classList.add('loss');
    setTimeout(() => $('#coins').classList.remove('loss'), 700);
    const cards = drawPack(b);
    const isNew = [];
    for (const c of cards) {
      const e = inv[c.key];
      isNew.push(!e);
      if (e) e.n++; else inv[c.key] = { n: 1, t: Date.now(), fresh: true };
      if (c.rarity === 'legend') stats.legends++;
      if (c.rarity === 'epic') stats.epics++;
    }
    stats.packs++; stats.cards += cards.length; stats.spent += b.price;
    stats.byBooster[b.id] = (stats.byBooster[b.id] || 0) + 1;
    save();
    let rect = null, onFly = null;
    if (!opts.again) {
      const item = $(`.shop-item[data-b="${b.id}"]`);
      const pk = item && item.querySelector('.pack');
      if (pk && view === 'boutique') { rect = pk.getBoundingClientRect(); const pf = item.querySelector('.pack-float'); onFly = () => { pf.style.visibility = 'hidden'; }; }
    }
    stopAmbient();
    O.start(b, { cards, isNew }, rect, onFly);
    refreshHeader();
    return true;
  }
  function poor(b, el, have) {
    FX.sound('error');
    const miss = b.price - have;
    FX.toast(`Il te manque ${FX.fmt(miss)} ShoxCoins. Bonus quotidien, recyclage ou ShoxBench !`, 3400);
    const zone = el && el.closest('.shop-item') && el.closest('.shop-item').querySelector('.pack-zone');
    if (zone) { zone.classList.remove('nope'); void zone.offsetWidth; zone.classList.add('nope'); }
    const coinsEl = $('#coins');
    coinsEl.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 380 });
  }

  // ------------------------------------------------------------ en-tête
  let shownCoins = coinVal, coinRaf = 0;
  function paintCoins() {
    const el = $('#coins-val'), pill = $('#coins');
    const from = shownCoins, to = coinVal;
    if (from === to) { el.textContent = FX.fmt(to); return; }
    if (to > from) { pill.classList.remove('gain', 'bump'); void pill.offsetWidth; pill.classList.add('gain', 'bump'); }
    cancelAnimationFrame(coinRaf);
    const t0 = performance.now(), dur = Math.min(900, 300 + Math.abs(to - from) * 2);
    const f = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      shownCoins = Math.round(from + (to - from) * e);
      el.textContent = FX.fmt(shownCoins);
      if (k < 1) coinRaf = requestAnimationFrame(f);
    };
    coinRaf = requestAnimationFrame(f);
    $$('.buy-btn').forEach((btn) => btn.classList.toggle('poor', D.booster(btn.dataset.b).price > to));
  }
  function floatText(x, y, text, neg) {
    const el = document.createElement('div');
    el.className = 'coin-float' + (neg ? ' neg' : '');
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.textContent = text;
    document.body.append(el);
    setTimeout(() => el.remove(), 1300);
  }
  function uniqueCount(bid) { return Object.keys(inv).filter((k) => !bid || k.startsWith(bid + '/')).length; }
  const TOTAL = D.boosters.reduce((t, b) => t + b.cards.length, 0);
  function refreshHeader() {
    $('#tab-count').textContent = `${uniqueCount()}/${TOTAL}`;
    paintDaily();
  }

  // ------------------------------------------------------------ bonus quotidien
  const ymd = (t) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function dailyState() {
    const d = FX.store.get(K.daily, null) || {};
    const today = ymd(Date.now()), yest = ymd(Date.now() - 864e5);
    const ready = d.last !== today;
    const streak = ready ? (d.last === yest ? (d.streak || 1) + 1 : 1) : (d.streak || 1);
    const amount = Math.min(D.economy.dailyMax, D.economy.daily + D.economy.dailyStep * (streak - 1));
    return { ready, streak, amount };
  }
  function untilMidnight() {
    const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
    const min = Math.max(1, Math.round((m - n) / 60000));
    return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`;
  }
  function paintDaily() {
    const s = dailyState();
    $('#daily-btn').classList.toggle('ready', s.ready);
    $('#daily-lbl').textContent = s.ready ? `+${s.amount}` : 'Bonus';
    $('#daily-card').classList.toggle('ready', s.ready);
    $('#dc-title').textContent = s.ready ? (s.streak > 1 ? `Bonus quotidien · série de ${s.streak} jours` : 'Bonus quotidien') : 'Bonus récupéré';
    $('#dc-sub').textContent = s.ready ? `+${s.amount} ShoxCoins` : `Prochain dans ${untilMidnight()}`;
    const btn = $('#dc-btn');
    btn.disabled = !s.ready;
    btn.textContent = s.ready ? 'Récupérer' : 'Demain';
  }
  function claimDaily(el) {
    const s = dailyState();
    if (!s.ready) { FX.sound('error'); FX.toast(`Déjà récupéré aujourd'hui. Prochain bonus dans ${untilMidnight()}.`); return; }
    FX.store.set(K.daily, { last: ymd(Date.now()), streak: s.streak });
    stats.earned += s.amount; save();
    coinRain(el, s.amount, 22);
    FX.sound('success');
    FX.toast(s.streak > 1 ? `+${s.amount} ShoxCoins · série de ${s.streak} jours !` : `+${s.amount} ShoxCoins ! Reviens demain pour la série.`);
    paintDaily();
  }
  function coinRain(fromEl, amount, n) {
    const fr = fromEl.getBoundingClientRect();
    const tr = $('#coins .coin-ico').getBoundingClientRect();
    const x0 = fr.left + fr.width / 2, y0 = fr.top + fr.height / 2;
    const tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2;
    let arrived = 0, credited = false;
    for (let i = 0; i < n; i++) {
      PX.add('page', {
        type: 'homing', x: x0 + rnd(-30, 30), y: y0 + rnd(-14, 14), tx, ty, bend: rnd(-160, 160), ph: rnd(0, 6), size: rnd(8, 11),
        life: 0.75 + i * 0.035,
        onEnd: () => {
          arrived++;
          if (!credited) { credited = true; addCoins(amount); floatText(tx, ty + 30, '+' + amount); }
          if (arrived % 3 === 1) FX.sound('coin');
          const pill = $('#coins'); pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
        },
      });
    }
    PX.spark('page', x0, y0, { count: 30, speed: 420, size: 5, gravity: 300, colors: ['#fff1b0', '#ffd84a', '#ffb000'] });
  }

  // ------------------------------------------------------------ navigation
  let view = 'boutique';
  function go(v, opts = {}) {
    if (v !== 'boutique' && v !== 'collection') v = 'boutique';
    const prev = view;
    if (prev === 'collection' && v !== 'collection') clearFresh();
    view = v;
    $('#view-boutique').hidden = v !== 'boutique';
    $('#view-collection').hidden = v !== 'collection';
    $$('.tab').forEach((t) => t.classList.toggle('on', t.dataset.view === v));
    moveInk();
    if (v === 'collection') renderCollection(); else renderShop();
    if (location.hash !== '#' + v) history.replaceState(null, '', location.pathname + location.search + '#' + v);
    if (!opts.keepScroll) scrollTo(0, 0);
    if (v === 'boutique') startAmbient(); else stopAmbient();
  }
  function moveInk() {
    const on = $('.tab.on'), ink = $('.tab-ink');
    if (!on) return;
    ink.style.width = on.offsetWidth + 'px';
    ink.style.transform = `translateX(${on.offsetLeft}px)`;
  }
  $$('.tab').forEach((t) => t.addEventListener('click', () => { FX.sound('click'); go(t.dataset.view); }));
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== view) go(h); });
  addEventListener('resize', () => { moveInk(); if (dt.open) sizeDetail(); });

  // ------------------------------------------------------------ ambiance (braises de la boutique)
  let ambientEm = null;
  function startAmbient() {
    if (ambientEm || O.active()) return;
    ambientEm = PX.emitter('page', { rate: 5, spawn: () => PX.make.ember(rnd(0, innerWidth), innerHeight + 10, { up: 70, minUp: 25, life: 9, size: 3.2, alpha: 0.55 }) });
  }
  function stopAmbient() { if (ambientEm) { ambientEm.stop(); ambientEm = null; } }

  // ------------------------------------------------------------ boutique
  function vars(el, b) { for (const [k, v] of Object.entries({ '--a': b.colors.a, '--b': b.colors.b, '--c': b.colors.c, '--dark': b.colors.dark, '--ink': b.colors.ink })) el.style.setProperty(k, v); }
  function renderShop() {
    const grid = $('#shop-grid');
    grid.innerHTML = '';
    D.boosters.forEach((b, i) => {
      const item = document.createElement('div');
      item.className = 'shop-item b-' + b.id;
      item.dataset.b = b.id;
      vars(item, b);
      item.style.setProperty('--delay', (-i * 1.6) + 's');
      const have = uniqueCount(b.id);
      item.innerHTML = `
        <div class="pack-zone" role="button" tabindex="0" aria-label="Ouvrir le ${esc(b.name)}">
          <div class="pack-halo"></div><div class="pack-shadow"></div>
          <div class="pack-float"><div class="pack-tilt"></div></div>
        </div>
        <div class="si-name">${esc(b.name)}</div>
        <div class="si-tag">${esc(b.tagline)}</div>
        <div class="si-prog"><div class="bar"><i style="width:${(have / b.cards.length) * 100}%"></i></div><span>${have}/${b.cards.length}</span></div>
        <button class="buy-btn${b.price > coinVal ? ' poor' : ''}" data-b="${b.id}"><span>Ouvrir</span><span class="price"><svg><use href="#i-coin"/></svg>${b.price}</span></button>`;
      item.querySelector('.pack-tilt').append(C.pack(b));
      const zone = item.querySelector('.pack-zone'), tilt = item.querySelector('.pack-tilt');
      zone.addEventListener('pointerenter', () => FX.sound('hover'));
      zone.addEventListener('pointermove', (e) => {
        const r = zone.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.transform = `rotateY(${(x * 34).toFixed(1)}deg) rotateX(${(-y * 22).toFixed(1)}deg) translateZ(30px) scale(1.04)`;
      });
      zone.addEventListener('pointerleave', () => { tilt.style.transform = ''; });
      zone.addEventListener('click', () => buy(b.id, item.querySelector('.buy-btn')));
      zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); buy(b.id, item.querySelector('.buy-btn')); } });
      item.querySelector('.buy-btn').addEventListener('click', (e) => buy(b.id, e.currentTarget));
      grid.append(item);
    });
    if (!$('#shop-odds')) {
      const o = document.createElement('div');
      o.className = 'odds'; o.id = 'shop-odds';
      o.innerHTML = 'Taux par carte :' + ['common', 'rare', 'epic', 'legend'].map((r) => `<span><i style="background:${D.rarities[r].color}"></i>${D.rarities[r].label} <b>${D.rarities[r].weight} %</b></span>`).join('');
      grid.after(o);
    }
    const dup = dupInfo();
    $('#earn-recycle-sub').textContent = dup.count ? `${dup.count} doublon${dup.count > 1 ? 's' : ''} à recycler : +${FX.fmt(dup.value)} ShoxCoins.` : 'De 5 à 200 ShoxCoins la carte selon la rareté.';
  }

  // ------------------------------------------------------------ collection
  function dupInfo() {
    const rows = [];
    let count = 0, value = 0;
    for (const [k, e] of Object.entries(inv)) {
      if (e.n > 1) {
        const c = D.card(k), v = (e.n - 1) * D.rarities[c.rarity].recycle;
        rows.push({ c, extra: e.n - 1, v });
        count += e.n - 1; value += v;
      }
    }
    rows.sort((a, b) => RANK(b.c.rarity) - RANK(a.c.rarity) || b.v - a.v);
    return { rows, count, value };
  }
  function sortCards(list) {
    const bo = (id) => D.boosters.findIndex((b) => b.id === id);
    return list.sort((a, b) => RANK(b.rarity) - RANK(a.rarity) || bo(a.booster) - bo(b.booster) || a.no - b.no);
  }
  function clearFresh() {
    let ch = false;
    for (const e of Object.values(inv)) if (e.fresh) { e.fresh = false; ch = true; }
    if (ch) save();
  }
  let listKeys = [];
  function renderCollection() {
    const all = D.boosters.flatMap((b) => b.cards);
    const nUnique = uniqueCount();
    const dup = dupInfo();
    $('#col-lead').innerHTML = nUnique
      ? `<b>${nUnique}</b> carte${nUnique > 1 ? 's' : ''} différente${nUnique > 1 ? 's' : ''} sur ${TOTAL}${dup.count ? ` · ${dup.count} doublon${dup.count > 1 ? 's' : ''}` : ''}. Clique sur une carte pour la voir en grand.`
      : 'Aucune carte pour l\'instant. Ouvre un booster pour commencer.';
    $('#col-stats').innerHTML = [
      [stats.packs, 'Boosters ouverts'], [stats.cards, 'Cartes tirées'], [stats.legends, 'Légendaires', 'gold'], [FX.fmt(stats.spent), 'ShoxCoins dépensés'],
    ].map(([v, l, cls]) => `<div class="stat-tile ${cls || ''}"><b>${v}</b><span>${l}</span></div>`).join('');

    // progression par booster
    const prog = $('#col-progress');
    prog.innerHTML = '';
    for (const b of D.boosters) {
      const have = uniqueCount(b.id);
      const card = document.createElement('div');
      card.className = 'prog-card' + (have === b.cards.length ? ' done' : '');
      vars(card, b);
      card.innerHTML = `<div class="mini-pack"></div>
        <div class="pc-main">
          <div class="pc-top"><b>${esc(b.short)}</b><span><em>${have}</em>/${b.cards.length}</span></div>
          <div class="pc-segs">${b.cards.map((c) => `<i class="${inv[c.key] ? 'on' : ''}" style="--sc:${D.rarities[c.rarity].color}" title="${inv[c.key] ? esc(c.name) : '???'}"></i>`).join('')}</div>
          <div class="pc-foot"><span>${have === b.cards.length ? 'Collection complète !' : `${stats.byBooster[b.id] || 0} ouvert${(stats.byBooster[b.id] || 0) > 1 ? 's' : ''}`}</span><button class="pc-game"><svg><use href="#i-play"/></svg>Jeu bonus</button></div>
        </div>`;
      card.querySelector('.mini-pack').append(C.pack(b));
      card.querySelector('.pc-game').addEventListener('click', () => { FX.sound('pop'); FX.toast('Jeu bonus : bientôt disponible !'); FX.open(b.game); });
      prog.append(card);
    }

    // filtres
    const chips = $('#col-chips');
    const opts = [{ id: 'all', label: 'Toutes', n: nUnique }].concat(D.boosters.map((b) => ({ id: b.id, label: b.short, n: uniqueCount(b.id), b })));
    chips.innerHTML = opts.map((o) => `<button class="chip${ui.filter === o.id ? ' on' : ''}" data-f="${o.id}" ${o.b ? `style="--a:${o.b.colors.a}"` : ''}>${o.b ? '<i></i>' : ''}${esc(o.label)} <em>${o.n}</em></button>`).join('');
    chips.querySelectorAll('.chip').forEach((ch) => ch.addEventListener('click', () => { FX.sound('click'); ui.filter = ch.dataset.f; FX.store.set(K.ui, ui); renderCollection(); }));
    $('#col-missing').checked = !!ui.missing;
    const rb = $('#col-recycle');
    rb.disabled = !dup.count;
    rb.querySelector('span').innerHTML = dup.count ? `Recycler les doublons <b>+${FX.fmt(dup.value)}</b>` : 'Aucun doublon';

    // grille par rareté
    const grid = $('#col-grid');
    grid.innerHTML = '';
    const inFilter = (c) => ui.filter === 'all' || c.booster === ui.filter;
    const owned = sortCards(all.filter((c) => inv[c.key] && inFilter(c)));
    listKeys = owned.map((c) => c.key);
    if (!owned.length && !ui.missing) {
      const em = document.createElement('div');
      em.className = 'empty';
      em.innerHTML = `<div class="em-card"></div><h3>${nUnique ? 'Rien dans ce booster pour l\'instant' : 'Ta collection est vide'}</h3><p>${nUnique ? 'Ouvre ce booster pour remplir cette page.' : 'Chaque booster contient 8 cartes. Les Légendaires brûlent les doigts.'}</p><button class="fs-btn fire">Ouvrir un booster</button>`;
      em.querySelector('.em-card').replaceWith(C.back());
      em.querySelector('button').addEventListener('click', () => go('boutique'));
      grid.append(em);
      return;
    }
    let delay = 0;
    for (const r of D.rarityOrder) {
      const R = D.rarities[r];
      const ownedR = owned.filter((c) => c.rarity === r);
      const missR = ui.missing ? all.filter((c) => c.rarity === r && inFilter(c) && !inv[c.key]) : [];
      if (!ownedR.length && !missR.length) continue;
      const totalR = all.filter((c) => c.rarity === r && inFilter(c)).length;
      const grp = document.createElement('section');
      grp.className = 'rar-group r-' + r;
      grp.innerHTML = `<div class="rg-head"><h3><span class="gems">${'<i></i>'.repeat(R.stars)}</span>${R.plural}</h3><em>${ownedR.length}/${totalR}</em></div><div class="cgrid"></div>`;
      const cg = grp.querySelector('.cgrid');
      for (const c of ownedR) {
        const e = inv[c.key];
        const slot = document.createElement('button');
        slot.className = 'cslot r-' + c.rarity;
        slot.style.setProperty('--d', Math.min(delay++ * 0.03, 0.6) + 's');
        slot.innerHTML = '<div class="cs-tilt"></div>';
        const face = C.face(c);
        face.style.setProperty('--delay', (-rnd(0, 4)).toFixed(2) + 's');
        slot.querySelector('.cs-tilt').append(face);
        if (e.n > 1) slot.insertAdjacentHTML('beforeend', `<span class="cs-count">×${e.n}</span>`);
        if (e.fresh) slot.insertAdjacentHTML('beforeend', '<span class="cs-new">Nouveau</span>');
        slot.addEventListener('pointermove', (ev) => {
          const rr = slot.getBoundingClientRect();
          slot.style.setProperty('--ry', (((ev.clientX - rr.left) / rr.width - 0.5) * 18).toFixed(1) + 'deg');
          slot.style.setProperty('--rx', ((0.5 - (ev.clientY - rr.top) / rr.height) * 14).toFixed(1) + 'deg');
        });
        slot.addEventListener('pointerleave', () => { slot.style.removeProperty('--rx'); slot.style.removeProperty('--ry'); });
        slot.addEventListener('click', () => openDetail(c.key, listKeys));
        cg.append(slot);
      }
      for (const c of missR) {
        const slot = document.createElement('div');
        slot.className = 'cslot missing r-' + c.rarity;
        slot.style.setProperty('--d', Math.min(delay++ * 0.03, 0.6) + 's');
        slot.innerHTML = `<div class="ghost"><svg><use href="#i-lock"/></svg><b>N° ${String(c.no).padStart(2, '0')}</b><span>???</span><em>${esc(D.booster(c.booster).short)}</em></div>`;
        cg.append(slot);
      }
      grid.append(grp);
    }
  }
  $('#col-missing').addEventListener('change', (e) => { ui.missing = e.target.checked; FX.store.set(K.ui, ui); FX.sound('click'); renderCollection(); });
  $('#col-recycle').addEventListener('click', () => openRecycle());

  // ------------------------------------------------------------ recyclage
  const modal = $('#modal'), mdBox = $('#md-box');
  function openRecycle() {
    const dup = dupInfo();
    if (!dup.count) { FX.toast('Aucun doublon à recycler pour l\'instant.'); return; }
    FX.sound('pop');
    mdBox.innerHTML = `<h3>Recycler les doublons ?</h3><p>On garde un exemplaire de chaque carte. Les autres partent au broyeur à ressorts.</p>
      <div class="md-list"></div>
      <div class="md-total"><span>${dup.count} carte${dup.count > 1 ? 's' : ''}</span><b><svg><use href="#i-coin"/></svg>+${FX.fmt(dup.value)}</b></div>
      <div class="md-actions"><button class="fs-btn md-no">Annuler</button><button class="fs-btn fire md-yes"><svg style="width:18px;height:18px"><use href="#i-recycle"/></svg>Recycler</button></div>`;
    const list = mdBox.querySelector('.md-list');
    for (const r of dup.rows) {
      const row = document.createElement('div');
      row.className = 'md-row';
      row.append(C.mini(r.c));
      row.insertAdjacentHTML('beforeend', `<span>${esc(r.c.name)}<em>×${r.extra}</em></span><b>+${r.v}</b>`);
      list.append(row);
    }
    modal.hidden = false;
    mdBox.querySelector('.md-no').addEventListener('click', closeModal);
    mdBox.querySelector('.md-yes').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      for (const k of Object.keys(inv)) if (inv[k].n > 1) inv[k].n = 1;
      stats.recycled += dup.count; stats.earned += dup.value;
      save();
      coinRain(btn, dup.value, Math.min(26, 8 + dup.count));
      FX.sound('success');
      FX.toast(`${dup.count} doublon${dup.count > 1 ? 's' : ''} recyclé${dup.count > 1 ? 's' : ''} : +${FX.fmt(dup.value)} ShoxCoins`);
      closeModal();
      refresh();
    });
  }
  function closeModal() { modal.hidden = true; mdBox.innerHTML = ''; }
  modal.querySelector('.md-backdrop').addEventListener('click', closeModal);

  // ------------------------------------------------------------ vue détaillée (3D + holo)
  const det = $('#detail'), dtStage = $('#dt-stage'), dtTilt = $('#dt-tilt'), dtInfo = $('#dt-info'), dtGlow = $('#dt-glow');
  const dt = { open: false, list: [], i: 0, raf: 0, mx: 0.5, my: 0.5, h: 0, px: 0.5, py: 0.5, inside: false, card: null };
  function sizeDetail() {
    const W = innerWidth, H = innerHeight;
    let w = Math.min((H - 70) * 5 / 7, 450, W - 180 - 300 - 60);
    w = Math.max(220, w);
    det.style.setProperty('--dw', Math.floor(w) + 'px');
  }
  function openDetail(key, list) {
    dt.list = list && list.includes(key) ? list.filter((k) => k && D.card(k)) : [key];
    dt.i = dt.list.indexOf(key);
    dt.open = true;
    det.hidden = false;
    det.classList.remove('leave');
    sizeDetail();
    renderDetail();
    FX.sound('whoosh');
    if (!dt.raf) dt.raf = requestAnimationFrame(dtLoop);
  }
  function renderDetail() {
    const key = dt.list[dt.i], c = D.card(key), b = D.booster(c.booster), R = D.rarities[c.rarity], e = inv[key];
    vars(det, b);
    det.style.setProperty('--glow', c.rarity === 'legend' ? 'rgba(255,176,0,.7)' : c.rarity === 'epic' ? 'rgba(180,77,255,.6)' : c.rarity === 'rare' ? 'rgba(61,155,255,.45)' : 'rgba(255,255,255,.14)');
    dtTilt.innerHTML = '<div class="dt-in"></div>';
    const face = C.face(c);
    dtTilt.firstChild.append(face);
    dt.card = face;
    const stat = (v) => {
      const n = typeof v === 'number' ? v : 100;
      return `<span class="bar"><i class="${typeof v === 'number' ? '' : 'inf'}" style="width:${n}%"></i></span><b>${typeof v === 'number' ? v : esc(v)}</b>`;
    };
    const date = e ? new Date(e.t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    dtInfo.innerHTML = `
      <div class="di-rar r-${c.rarity}"><span class="gems">${'<i></i>'.repeat(R.stars)}</span>${R.label}</div>
      <h2 class="di-name ${c.rarity === 'legend' ? 'legend' : ''}">${esc(c.name)}</h2>
      <div class="di-sub">${esc(c.sub)}</div>
      <div class="di-booster"><i></i>${esc(b.name)} · N° ${String(c.no).padStart(2, '0')}/${b.cards.length}</div>
      <p class="di-text">${esc(c.text)}</p>
      <div class="di-stats">${b.statLabels.map((l, i) => `<div class="di-stat"><span>${esc(l)}</span>${stat(c.stats[i])}</div>`).join('')}</div>
      <div class="di-own">${e ? `Possédée <b>×${e.n}</b> · depuis le ${date}` : 'Pas encore dans ta collection'}</div>
      <div class="di-actions">${e && e.n > 1 ? `<button class="fs-btn di-recycle"><svg><use href="#i-recycle"/></svg>Recycler un doublon <b>+${R.recycle}</b></button>` : ''}</div>
      <div class="di-hint"><span class="k">←</span><span class="k">→</span> pour naviguer · <span class="k">Échap</span> pour fermer</div>`;
    dtInfo.style.animation = 'none'; void dtInfo.offsetWidth; dtInfo.style.animation = '';
    const rb = dtInfo.querySelector('.di-recycle');
    if (rb) rb.addEventListener('click', () => recycleOne(key, rb));
    $('#dt-prev').disabled = dt.i <= 0;
    $('#dt-next').disabled = dt.i >= dt.list.length - 1;
    if (e && e.fresh) { e.fresh = false; save(); }
  }
  function recycleOne(key, btn) {
    const e = inv[key];
    if (!e || e.n < 2) return;
    const v = D.rarities[D.card(key).rarity].recycle;
    e.n--; stats.recycled++; stats.earned += v; save();
    coinRain(btn, v, 6);
    FX.sound('coin');
    renderDetail();
    refresh();
  }
  function navDetail(d) {
    const j = dt.i + d;
    if (j < 0 || j >= dt.list.length) return;
    dt.i = j;
    FX.sound('flip');
    renderDetail();
    dtTilt.firstChild.animate([{ transform: `translateX(${d * 60}px) rotateY(${d * 35}deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.1)' });
  }
  function closeDetail() {
    if (!dt.open) return;
    dt.open = false;
    det.classList.add('leave');
    setTimeout(() => { if (!dt.open) { det.hidden = true; det.classList.remove('leave'); dtTilt.innerHTML = ''; } }, 300);
    if (view === 'collection' && !O.active()) renderCollection();
  }
  function dtLoop(now) {
    if (!dt.open) { dt.raf = 0; return; }
    let tx, ty, hov;
    if (dt.inside) { tx = dt.px; ty = dt.py; hov = 1; } else { const t = now / 1000; tx = 0.5 + Math.sin(t * 0.8) * 0.2; ty = 0.5 + Math.cos(t * 0.6) * 0.14; hov = 0; }
    dt.mx += (tx - dt.mx) * 0.12; dt.my += (ty - dt.my) * 0.12; dt.h += (hov - dt.h) * 0.08;
    dtTilt.style.transform = `rotateY(${((dt.mx - 0.5) * 30).toFixed(2)}deg) rotateX(${((0.5 - dt.my) * 24).toFixed(2)}deg)`;
    if (dt.card) { dt.card.style.setProperty('--mx', dt.mx.toFixed(3)); dt.card.style.setProperty('--my', dt.my.toFixed(3)); dt.card.style.setProperty('--hov', dt.h.toFixed(3)); }
    dtGlow.style.setProperty('--gx', ((dt.mx - 0.5) * -50).toFixed(1) + 'px');
    dtGlow.style.setProperty('--gy', ((dt.my - 0.5) * -40).toFixed(1) + 'px');
    dt.raf = requestAnimationFrame(dtLoop);
  }
  det.addEventListener('pointermove', (e) => {
    const r = dtStage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    dt.inside = x > -0.2 && x < 1.2 && y > -0.12 && y < 1.12;
    dt.px = Math.max(0, Math.min(1, x)); dt.py = Math.max(0, Math.min(1, y));
  });
  det.addEventListener('pointerleave', () => { dt.inside = false; });
  det.querySelector('.dt-backdrop').addEventListener('click', closeDetail);
  det.querySelector('.dt-wrap').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeDetail(); });
  $('#dt-close').addEventListener('click', closeDetail);
  $('#dt-prev').addEventListener('click', () => navDetail(-1));
  $('#dt-next').addEventListener('click', () => navDetail(1));
  addEventListener('keydown', (e) => {
    if (!modal.hidden && e.key === 'Escape') { closeModal(); return; }
    if (!dt.open) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeDetail(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); navDetail(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); navDetail(1); }
  }, true);

  // ------------------------------------------------------------ divers
  $('#daily-btn').addEventListener('click', (e) => claimDaily(e.currentTarget));
  $('#dc-btn').addEventListener('click', (e) => claimDaily(e.currentTarget));
  $('#earn-recycle').addEventListener('click', () => { go('collection'); setTimeout(openRecycle, 250); });
  $('#earn-bench').addEventListener('click', () => { FX.sound('click'); FX.open('fireshox://shoxbench/'); });
  setInterval(paintDaily, 30000);

  function refresh() {
    refreshHeader();
    paintCoins();
    if (O.active()) return;
    if (view === 'collection') renderCollection(); else renderShop();
  }
  function afterClose(to) {
    $$('.pack-float').forEach((p) => { p.style.visibility = ''; });
    go(to || view, { keepScroll: false });
    refresh();
  }
  function reopen(id, el) {
    const b = D.booster(id);
    const have = readCoins() ?? coinVal;
    if (have < b.price) { FX.sound('error'); FX.toast(`Il te manque ${FX.fmt(b.price - have)} ShoxCoins pour rouvrir ce booster.`); return; }
    buy(id, el, { again: true });
  }

  window.SO_APP = { coins, openDetail, detailOpen: () => dt.open, reopen, afterClose, refresh };
  window.Opening = {
    buy: (id) => buy(id, $(`.buy-btn[data-b="${id}"]`)), go, state: () => ({ coins: coinVal, inv, stats, ui, daily: FX.store.get(K.daily, null) }),
    fill(n) { for (let i = 0; i < n; i++) { const b = D.boosters[i % 3]; const c = pickCard(b, rollRarity()); const e = inv[c.key]; if (e) e.n++; else inv[c.key] = { n: 1, t: Date.now(), fresh: i % 4 === 0 }; } save(); refresh(); },
    detail: openDetail, closeDetail, recycle: openRecycle,
  };

  // ------------------------------------------------------------ démarrage
  PX.layer('page', $('#fx-page'));
  paintCoins();
  refreshHeader();
  C.probeAll().then(() => {
    if (q.get('fill')) window.Opening.fill(parseInt(q.get('fill'), 10) || 20);
    const start = q.get('view') || location.hash.slice(1) || 'boutique';
    go(start);
    requestAnimationFrame(moveInk);
    document.fonts && document.fonts.ready.then(moveInk);
    if (q.get('detail') && inv[q.get('detail')]) openDetail(q.get('detail'), [q.get('detail')]);
    if (q.get('open')) setTimeout(() => buy(q.get('open'), $(`.buy-btn[data-b="${q.get('open')}"]`)), 400);
  });
})();
