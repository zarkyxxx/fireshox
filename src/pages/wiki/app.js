// Wiki Shox — l'encyclopédie incandescente (fireshox://wiki/)
// Navigation par #slug (bouton « précédent » du navigateur compris), recherche, barre latérale repliable.
// Wiki PARTAGÉ : une page modifiée en ligne (cloud.js) remplace sa version d'origine (data.js).
//   • version d'origine (data.js) : HTML local de confiance → wikify()
//   • version en ligne : wikitexte venu de n'importe qui → WikiText (tout est échappé)
// Routes : #slug, #categorie:Nom, #modifier:slug[:section], #historique:slug, #version:slug:rév,
//          #diff:slug:rév, #creer[:Titre], #recentes  (les 6 dernières sont dans editor.js)
// Stockage : wiki.prefs { sidebar, toc }, wiki.vues { slug: nombre } (+ clés de cloud.js)
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = (s) => String(s ?? '').normalize('NFC').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const textOf = (html) => { const t = document.createElement('template'); t.innerHTML = String(html || '').replace(/<\/(p|li|blockquote|tr|h\d|caption)>|<br\s*\/?>/gi, ' $&').replace(/\{\{[^}]*\}\}/g, '').replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_m, a, b) => b || a); return t.content.textContent.replace(/\s+/g, ' ').trim(); };
  const snd = (n) => { try { FX.sound(n); } catch {} };
  const toast = (t) => { try { FX.toast(t); } catch {} };
  const WT = window.WikiText;
  const Cloud = window.WikiCloud;

  // ------------------------------------------------------------------ données
  const CHAMPS = window.WIKI_CHAMPS || ['Nom complet', 'Surnom(s)', 'Première apparition', 'Signe distinctif'];
  const ACC = window.WIKI_ACCUEIL || {};
  const AUTO_CATS_STUB = ['Ébauche Wiki Shox', 'Archives en attente'];
  const DEFAULT_SECTIONS = [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']];
  const DEFAULTS = (window.WIKI_ENTREES || []).filter((e) => e && WT.SLUG_RE.test(String(e.slug || '')));
  const DEFAULT_BY = new Map(DEFAULTS.map((e) => [e.slug, e]));
  const POS_RE = /^\d{1,3}% \d{1,3}%$/;

  // format : 'html' (data.js, confiance) ou 'wiki' (en ligne) ; cloud : { revision, modified, author } ou null
  function normalize(e, format = 'html', cloud = null) {
    const slug = String(e.slug || '').trim();
    const wiki = format === 'wiki';
    const sections = (Array.isArray(e.sections) ? e.sections : DEFAULT_SECTIONS)
      .map((s) => (Array.isArray(s) ? { titre: String(s[0] || ''), html: String(s[1] || ''), niveau: s[2] === 3 ? 3 : 2 } : { titre: String(s.titre || ''), html: String(s.html || ''), niveau: s.niveau === 3 ? 3 : 2 }));
    const filled = sections.some((s) => s.html.trim()) || String(e.resume || '').trim();
    const galerie = (Array.isArray(e.galerie) ? e.galerie : [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']])
      .map((g) => (Array.isArray(g) ? { src: String(g[0] || ''), cap: String(g[1] || '') } : typeof g === 'string' ? { src: g, cap: '' } : { src: String(g.src || ''), cap: String(g.legende || '') }))
      .map((g) => ({ ...g, src: wiki ? WT.safeImage(g.src, slug) : g.src }))
      .filter((g) => g.src);
    const photo = e.photo === undefined ? 'main.jpg' : String(e.photo || '');
    const o = {
      slug,
      format,
      cloud,
      titre: String(e.titre || slug),
      ebauche: e.ebauche === undefined ? !filled : !!e.ebauche,
      resume: String(e.resume || ''),
      photo: wiki ? WT.safeImage(photo, slug) : photo,
      legende: String(e.legende || ''),
      infobox: (Array.isArray(e.infobox) ? e.infobox : CHAMPS.map((c) => [c, ''])).map((r) => [String((r && r[0]) || ''), String((r && r[1]) || '')]),
      sections,
      galerie,
      voirAussi: Array.isArray(e.voirAussi) ? e.voirAussi.map(String) : [],
      categories: Array.isArray(e.categories) ? e.categories.map(String) : [],
      statut: String(e.statut || ''),
      cadrage: POS_RE.test(String(e.cadrage || '')) ? String(e.cadrage) : '',
      chapeau: String(e.chapeau || ''),
    };
    o.enrich = !o.ebauche && o.statut === 'enrichissement';
    o.mono = monogram(o.titre);
    o.cats = [...(o.ebauche ? AUTO_CATS_STUB : []), ...o.categories, ...(o.enrich ? ['Article en cours d\'enrichissement'] : [])];
    o.plainTitle = fold(o.titre);
    const pt = wiki ? WT.plain : textOf;
    o.plain = [pt(o.resume), ...o.sections.map((s) => s.titre + ' ' + pt(s.html)), ...o.infobox.map((r) => (r[1] ? r[0] + ' ' + pt(r[1]) : ''))].join(' ').replace(/\s+/g, ' ').trim();
    o.foldPlain = fold(o.plain);
    return o;
  }

  function monogram(t) {
    const words = String(t).replace(/^[^A-Za-zÀ-ÿ0-9]+/, '').split(/[\s-]+/).map((w) => w.replace(/^[LlDd]['’]/, '').replace(/[^A-Za-zÀ-ÿ0-9]/g, '')).filter(Boolean);
    if (!words.length) return '?';
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  // Une page en ligne (cloud.js) → entrée
  const fromCloud = (p) => normalize({ slug: p.slug, ...p.data }, 'wiki', { revision: p.revision, modified: p.modified, author: p.author });
  // Des données de page (éditeur, ancienne version) → entrée affichable
  function entryFromData(slug, data, cloud = null) { return normalize({ ...(data || {}), slug }, 'wiki', cloud); }

  const ENTRIES = [];
  const BY = new Map();
  function rebuild() {
    const cloud = Cloud ? Cloud.pages() : {};
    const list = DEFAULTS.map((raw) => (cloud[raw.slug] ? fromCloud(cloud[raw.slug]) : normalize(raw, 'html')));
    const extra = Object.values(cloud).filter((p) => p && !DEFAULT_BY.has(p.slug) && WT.SLUG_RE.test(p.slug)).map(fromCloud)
      .sort((a, b) => a.plainTitle.localeCompare(b.plainTitle, 'fr'));
    ENTRIES.splice(0, ENTRIES.length, ...list, ...extra);
    BY.clear();
    for (const e of ENTRIES) BY.set(e.slug, e);
  }
  rebuild();

  const findEntry = (target) => {
    const t = String(target || '').trim();
    if (BY.has(t)) return BY.get(t);
    const f = fold(t);
    return ENTRIES.find((e) => e.plainTitle === f || fold(e.slug) === f) || null;
  };

  // Données (wikitexte) d'une entrée, pour l'éditeur et l'historique.
  // La version d'origine (HTML de data.js) est convertie en wikitexte à la 1re modification.
  function defaultData(slug) {
    const raw = DEFAULT_BY.get(slug);
    if (!raw) return null;
    const n = normalize(raw, 'html');
    return {
      titre: n.titre,
      chapeau: WT.fromHtmlInline(n.chapeau),
      resume: WT.fromHtml(n.resume),
      photo: n.photo,
      legende: WT.fromHtmlInline(n.legende),
      cadrage: n.cadrage,
      ebauche: n.ebauche,
      statut: n.statut === 'enrichissement' ? 'enrichissement' : '',
      infobox: n.infobox.map((r) => [r[0], WT.fromHtmlInline(r[1])]),
      sections: n.sections.map((s) => [s.titre, WT.fromHtml(s.html), s.niveau]),
      galerie: n.galerie.map((g) => [g.src, WT.fromHtmlInline(g.cap)]),
      voirAussi: n.voirAussi.filter((x) => WT.SLUG_RE.test(x)),
      categories: n.categories,
    };
  }
  function dataOf(slug) {
    const p = Cloud && Cloud.page(slug);
    if (p) return JSON.parse(JSON.stringify(p.data));
    return defaultData(slug);
  }

  const imgPath = (e, f) => (!f ? '' : /^(\/|[a-z]+:)/i.test(f) ? f : `/assets/wiki/${e.slug}/${f}`);
  const shownPath = (p) => p.replace(/^\//, '');

  // ------------------------------------------------------------------ stockage
  const prefs = Object.assign({ sidebar: 'open', toc: true }, FX.store.get('wiki.prefs', {}) || {});
  const savePrefs = () => FX.store.set('wiki.prefs', prefs);

  // ------------------------------------------------------------------ liens et mini-wikitexte
  function linkHtml(target, labelHtml) {
    const e = findEntry(target);
    if (e) return `<a class="wl" href="#${encodeURIComponent(e.slug)}" title="${esc(e.titre)}">${labelHtml ?? esc(e.titre)}</a>`;
    return `<a class="wl new" href="#creer:${encodeURIComponent(String(target).slice(0, 120))}" data-missing="${esc(target)}" title="${esc(target)} (page inexistante : la créer)">${labelHtml ?? esc(target)}</a>`;
  }
  // HTML local de confiance (data.js) : [[slug|texte]] → lien
  function links(html) {
    return String(html || '').replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_m, target, label) => linkHtml(target, label || null));
  }
  function wikify(html, ctx) {
    let s = String(html || '');
    s = s.replace(/\{\{\s*r[ée]f\s*\}\}/gi, () => '<sup class="fact">⁠[<i><a data-fact title="Cette affirmation rebondit sans source">réf. nécessaire</a></i>]</sup>');
    s = s.replace(/\{\{\s*note\s*\|([\s\S]*?)\}\}/gi, (_m, body) => {
      if (!ctx) return '';
      ctx.notes.push(body);
      const n = ctx.notes.length;
      return `<sup class="ref" id="cite-${n}">⁠<a data-note="${n}">[${n}]</a></sup>`;
    });
    return links(s);
  }
  // Vignette d'image dans un texte en ligne ([[Image:…|légende]]) : adresse déjà validée par WikiText.
  function thumb(e, src, capHtml, capText, inl) {
    return `<figure class="wt-thumb${inl ? ' inl' : ''}">${imgBox(src, { cls: 'ratio-43', mono: e.mono, label: 'Image', small: true, natural: true, cap: WT.plain(capText) || e.titre })}` +
      `${capHtml ? `<figcaption>${capHtml}</figcaption>` : ''}</figure>`;
  }
  const wctx = (e, ctx) => ({ notes: ctx ? ctx.notes : null, slug: e.slug, link: linkHtml, image: (src, capHtml, capText, inl) => thumb(e, src, capHtml, capText, inl) });
  // Bloc (résumé, section) et ligne (infobox, légende) selon la provenance du texte
  const block = (e, text, ctx) => (e.format === 'wiki' ? WT.render(text, wctx(e, ctx)) : wikify(text, ctx));
  const line = (e, text, ctx) => (e.format === 'wiki' ? WT.inline(text, wctx(e, ctx)) : wikify(text, ctx));
  const noteHtml = (e, n) => (typeof n === 'string' ? links(n) : WT.inline(n.wiki, wctx(e, null)));
  const plainOf = (e, text) => (e.format === 'wiki' ? WT.plain(text) : textOf(text));

  // ------------------------------------------------------------------ images (avec remplacement)
  // natural : la case prend le format réel de l'image une fois chargée (portrait ou paysage)
  // position : point de recadrage (object-position) quand la case garde un format imposé
  function imgBox(src, { cls = 'ratio-45', mono = '?', label = 'Photo à venir', small = false, contain = false, glow = false, natural = false, position = '', zoom = true, cap = '' } = {}) {
    const extra = [cls, contain ? 'contain' : '', glow ? 'glow' : '', zoom ? 'zoomable' : ''].filter(Boolean).join(' ');
    const attrs = (natural ? ' data-fit="natural"' : '') + (position && POS_RE.test(position) ? ` data-pos="${esc(position)}"` : '') + (cap ? ` data-cap="${esc(cap)}"` : '');
    const remote = /^https:/.test(src);
    return `<div class="imgbox ${extra}" data-src="${esc(src)}"${attrs}>` +
      `<div class="ph${small ? ' small' : ''}"><div class="ph-mono">${esc(mono)}</div><div class="ph-label">${esc(remote ? 'Chargement de la photo…' : label)}</div>${src && !remote ? `<code title="${esc(shownPath(src))}">${esc(shownPath(src)).replace(/\//g, '/<wbr>')}</code>` : ''}</div>` +
      '</div>';
  }
  // Seules adresses chargées : /assets/… (local) et https://files.catbox.moe/… (photos envoyées)
  const LOADABLE = /^(?:\/assets\/[\w./-]+|https:\/\/files\.catbox\.moe\/[\w-]+\.(?:jpe?g|png|gif|webp))$/i;
  function alternates(src) {
    if (/^https:/.test(src)) return [src];
    const m = src.match(/^(.*)\.(jpe?g|png|webp)$/i);
    if (!m) return [src];
    const ext = m[2].toLowerCase();
    return [src, ...['jpg', 'png', 'webp', 'jpeg'].filter((x) => x !== ext).map((x) => `${m[1]}.${x}`)];
  }
  function hydrate(root) {
    for (const box of $$('.imgbox[data-src]', root)) {
      const src = box.dataset.src;
      if (!src || box.dataset.done) continue;
      box.dataset.done = '1';
      if (!LOADABLE.test(src) || src.includes('..')) continue;
      const tries = alternates(src);
      let i = 0;
      const img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      if (box.dataset.pos) img.style.objectPosition = box.dataset.pos;
      img.onload = () => {
        const r = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
        box.dataset.ratio = String(r);
        if (box.dataset.fit === 'natural') {
          const rr = Math.max(0.56, Math.min(2.2, r));
          box.style.aspectRatio = String(rr);
          const fig = box.closest('.g-item');
          if (fig) fig.style.setProperty('--r', rr.toFixed(3));
        }
        box.appendChild(img);
        requestAnimationFrame(() => box.classList.add('loaded'));
      };
      img.onerror = () => {
        i += 1;
        if (i < tries.length) { img.src = tries[i]; return; }
        const lab = box.querySelector('.ph-label');
        if (lab && /^https:/.test(src)) lab.textContent = 'Photo indisponible (hors ligne ?)';
      };
      img.src = tries[0];
    }
  }

  // ------------------------------------------------------------------ barre latérale
  const app = $('#app');
  const list = $('#list');
  const q = $('#q');
  const searchBox = $('.search');
  let current = null;       // slug affiché (ou null)
  let kbIndex = -1;         // sélection clavier dans les résultats
  let view = 'home';        // home | article | category | missing | editor…

  function setCollapsed(c, sound = true) {
    app.classList.toggle('collapsed', c);
    prefs.sidebar = c ? 'closed' : 'open';
    savePrefs();
    if (sound) snd('flip');
  }
  $('#collapse').addEventListener('click', () => setCollapsed(true));
  $('#expand').addEventListener('click', () => setCollapsed(false));
  if (prefs.sidebar === 'closed') app.classList.add('collapsed');

  function highlight(title, qf) {
    if (!qf) return esc(title);
    const f = fold(title);
    const i = f.indexOf(qf);
    if (i < 0 || f.length !== title.length) return esc(title);
    return esc(title.slice(0, i)) + '<mark>' + esc(title.slice(i, i + qf.length)) + '</mark>' + esc(title.slice(i + qf.length));
  }
  function snippet(e, qf) {
    const i = e.foldPlain.indexOf(qf);
    if (i < 0) return '';
    const a = Math.max(0, i - 18);
    const pre = (a > 0 ? '…' : '') + e.plain.slice(a, i);
    const hit = e.plain.slice(i, i + qf.length);
    const post = e.plain.slice(i + qf.length, i + qf.length + 40);
    return esc(pre) + '<mark>' + esc(hit) + '</mark>' + esc(post);
  }

  let lastQ = null;
  function renderList() {
    const raw = q.value.trim();
    const qf = fold(raw);
    searchBox.classList.toggle('has-q', !!q.value);
    let rows = ENTRIES.map((e) => ({ e, inTitle: !qf || e.plainTitle.includes(qf) || fold(e.slug).includes(qf), inText: !!qf && e.foldPlain.includes(qf) }));
    if (qf) rows = [...rows.filter((r) => r.inTitle), ...rows.filter((r) => !r.inTitle && r.inText)];
    list.classList.toggle('filtering', qf !== lastQ && lastQ !== null);
    lastQ = qf;
    list.innerHTML = rows.map(({ e, inTitle }) => {
      const fresh = Cloud && e.slug !== current && Cloud.isNew(e.slug);
      return `<li class="item${e.slug === current ? ' on' : ''}" data-slug="${esc(e.slug)}" role="option" aria-selected="${e.slug === current}">` +
        `<a href="#${encodeURIComponent(e.slug)}" title="${esc(e.titre)}"><span class="t">${highlight(e.titre, inTitle ? qf : '')}</span>` +
        `${!inTitle && qf ? `<span class="snip">${snippet(e, qf)}</span>` : ''}</a>` +
        (fresh ? '<span class="badge-mod" title="Modifiée depuis ta dernière visite">modifié</span>' : '') +
        '<button class="more" type="button" title="Options" aria-label="Options"><svg viewBox="0 0 24 24" width="16" height="16"><circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/></svg></button>' +
      '</li>';
    }).join('');
    $('#count').textContent = qf ? `${rows.length} / ${ENTRIES.length}` : String(ENTRIES.length);
    $('#group-label').textContent = qf ? 'Résultats' : 'Articles';
    const none = qf && !rows.length;
    $('#no-result').hidden = !none;
    if (none) { $('#nr-q').textContent = raw; $('#nr-q2').textContent = raw; }
    kbIndex = qf && rows.length ? 0 : -1;
    paintKb();
  }
  function paintKb() {
    const items = $$('.item', list);
    items.forEach((li, i) => li.classList.toggle('kb', i === kbIndex));
    if (kbIndex >= 0 && items[kbIndex]) items[kbIndex].scrollIntoView({ block: 'nearest' });
  }
  function markActive() {
    for (const li of $$('.item', list)) {
      const on = li.dataset.slug === current;
      li.classList.toggle('on', on);
      li.setAttribute('aria-selected', String(on));
      if (on) { li.scrollIntoView({ block: 'nearest' }); const b = li.querySelector('.badge-mod'); if (b) b.remove(); }
    }
    const key = location.hash.replace(/^#/, '');
    $('#nav-home').classList.toggle('on', !key);
    $('#nav-create').classList.toggle('on', /^creer/.test(key));
    $('#nav-recent').classList.toggle('on', key === 'recentes');
  }

  q.addEventListener('input', renderList);
  q.addEventListener('keydown', (ev) => {
    const items = $$('.item', list);
    if (ev.key === 'ArrowDown' && items.length) { ev.preventDefault(); kbIndex = (kbIndex + 1) % items.length; paintKb(); snd('tick'); }
    else if (ev.key === 'ArrowUp' && items.length) { ev.preventDefault(); kbIndex = (kbIndex - 1 + items.length) % items.length; paintKb(); snd('tick'); }
    else if (ev.key === 'Enter') {
      const li = items[Math.max(0, kbIndex)];
      if (li) { go(li.dataset.slug); q.blur(); }
      else if (q.value.trim()) createPage(q.value.trim());
    } else if (ev.key === 'Escape') {
      if (q.value) { q.value = ''; renderList(); } else q.blur();
    }
  });
  $('#clear').addEventListener('click', (ev) => { ev.preventDefault(); q.value = ''; renderList(); q.focus(); });
  $('#nr-create').addEventListener('click', () => createPage(q.value.trim()));
  function createPage(name) {
    snd('click');
    go('creer:' + String(name || '').slice(0, 120));
  }

  list.addEventListener('click', (ev) => {
    const more = ev.target.closest('.more');
    if (more) { ev.preventDefault(); openMenu(more, more.closest('.item').dataset.slug); return; }
    const a = ev.target.closest('a');
    if (a) { navByClick = true; snd('click'); }
  });

  // menu « ⋯ »
  const menu = $('#menu');
  let menuSlug = null, menuBtn = null;
  function openMenu(btn, slug) {
    if (menuBtn === btn && !menu.hidden) { closeMenu(); return; }
    closeMenu();
    menuSlug = slug; menuBtn = btn; btn.classList.add('open');
    const r = btn.getBoundingClientRect();
    menu.hidden = false;
    menu.style.left = Math.min(r.left, innerWidth - 240) + 'px';
    menu.style.top = Math.min(r.bottom + 6, innerHeight - 200) + 'px';
    snd('tick');
  }
  function closeMenu() { menu.hidden = true; if (menuBtn) menuBtn.classList.remove('open'); menuBtn = null; }
  menu.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    const url = `fireshox://wiki/#${menuSlug}`;
    if (b.dataset.act === 'open') { FX.open(url, { background: true }); toast('Ouvert dans un nouvel onglet.'); }
    if (b.dataset.act === 'copy') {
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Lien copié : ' + url), () => toast(url));
    }
    if (b.dataset.act === 'edit') go('modifier:' + menuSlug);
    if (b.dataset.act === 'hist') go('historique:' + menuSlug);
    snd('click');
    closeMenu();
  });
  document.addEventListener('mousedown', (ev) => { if (!menu.hidden && !ev.target.closest('#menu, .more')) closeMenu(); });
  $('#side-scroll').addEventListener('scroll', closeMenu, { passive: true });

  $('#random').addEventListener('click', () => {
    const pool = ENTRIES.filter((e) => e.slug !== current);
    const e = FX.pick(pool.length ? pool : ENTRIES);
    snd('pop');
    const r = $('#random').getBoundingClientRect();
    try { FX.burst(r.left + 24, r.top + r.height / 2, { count: 26, spread: 5, size: 2.4 }); } catch {}
    go(e.slug);
  });
  for (const b of $$('.tl')) b.addEventListener('click', () => { snd('click'); toast(b.dataset.toast); });

  // ------------------------------------------------------------------ état de la synchronisation
  function ago(t) { return window.WikiEditor ? WikiEditor.ago(t) : ''; }
  function paintSync() {
    const el = $('#sync');
    if (!el || !Cloud) return;
    const s = Cloud.state;
    let cls = 'wait', title = 'Wiki partagé', sub = 'Connexion…';
    if (!Cloud.available) { cls = 'off'; sub = 'Lecture seule (hors de Fire Shox)'; }
    else if (s.syncing && s.online === null) { cls = 'wait'; sub = 'Synchronisation…'; }
    else if (s.online === false) { cls = 'off'; title = 'Hors ligne'; sub = s.lastSync ? `Dernière version connue (${ago(s.lastSync)})` : 'Version d\'origine du wiki'; }
    else if (s.online) { cls = 'on'; sub = s.syncing ? 'Synchronisation…' : `À jour · ${ago(s.lastSync)}`; }
    el.className = 'sync ' + cls;
    $('#sync-title').textContent = title;
    $('#sync-sub').textContent = sub;
  }
  $('#sync').addEventListener('click', () => { if (Cloud) { snd('tick'); Cloud.sync(); } });
  setInterval(paintSync, 15000);

  // raccourcis
  document.addEventListener('keydown', (ev) => {
    const mod = ev.ctrlKey || ev.metaKey;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if (mod && !ev.shiftKey && !ev.altKey && ev.code === 'KeyK') {
      ev.preventDefault();
      if (app.classList.contains('collapsed')) setCollapsed(false, false);
      q.focus(); q.select();
    } else if (mod && !ev.shiftKey && !ev.altKey && ev.code === 'KeyB' && !typing) {
      ev.preventDefault();
      setCollapsed(!app.classList.contains('collapsed'));
    } else if (ev.key === '/' && !typing) {
      ev.preventDefault(); q.focus();
    } else if (ev.key === 'Escape') closeMenu();
  });

  // ------------------------------------------------------------------ rendu : article
  function articleHead(titre, { tabs = true, lang = true, kind = 'Article', slug = '', active = 'lire', inert = false } = {}) {
    const href = (h) => (inert ? '' : ` href="${h}"`);
    const s = encodeURIComponent(slug);
    return `<div class="title-row"><h1>${esc(titre)}</h1>${lang ? '<button class="lang-btn" type="button" data-toast="Wiki Shox existe en 1 langue : le français incandescent. Une version en Shox est en cours de rebond."><svg viewBox="0 0 24 24" width="17" height="17"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 12h17M12 3.5c2.6 2.6 3.6 5.4 3.6 8.5s-1 5.9-3.6 8.5c-2.6-2.6-3.6-5.4-3.6-8.5s1-5.9 3.6-8.5z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>1 langue <span aria-hidden="true">▾</span></button>' : ''}</div>` +
      (tabs ? `<nav class="tabs"><div><a class="tab${active !== 'discussion' ? ' on' : ''}"${href('#' + s)}>${kind}</a>` + '<button class="tab" type="button" data-toast="La page de discussion est fermée : tout le monde parlait en même temps.">Discussion</button></div>' +
        (slug
          ? `<div><a class="tab${active === 'lire' ? ' on' : ''}"${href('#' + s)}>Lire</a><a class="tab${active === 'modifier' ? ' on' : ''}"${href('#modifier:' + s)}>Modifier</a><a class="tab${active === 'historique' ? ' on' : ''}"${href('#historique:' + s)}>Voir l'historique</a></div>`
          : '<div><a class="tab on">Lire</a></div>') + '</nav>' : '');
  }

  // opts : { preview: true } (éditeur : rien de cliquable, pas de compteur), { version: { … } } (ancienne version)
  function renderArticle(e, opts = {}) {
    const ctx = { notes: [] };
    const inert = !!opts.preview;
    let leadHtml;
    if (e.resume.trim()) leadHtml = block(e, e.resume, ctx);
    else {
      leadHtml = wikify(`<p><b>${esc(e.titre)}</b> est une entrée de Wiki Shox dont l'article attend encore ses archives officielles.{{note|Les documents (photos, anecdotes, citations) n'ont pas encore été transmis à la rédaction.}} ` +
        'Elle figure néanmoins parmi les pages les plus attendues de l\'encyclopédie.{{réf}}</p>', ctx);
    }

    // infobox
    let rows = '';
    let open = false;
    for (const r of e.infobox) {
      const label = String(r[0] || '');
      if (label.startsWith('#')) {
        if (open) { rows += '</table>'; open = false; }
        rows += `<div class="ib-sub">${esc(label.replace(/^#\s*/, ''))}</div>`;
        continue;
      }
      if (!open) { rows += '<table class="ib-table">'; open = true; }
      const val = String(r[1] || '').trim();
      rows += `<tr><th scope="row">${esc(label)}</th><td>${val ? line(e, val, ctx) : '<span class="todo">à compléter</span>'}</td></tr>`;
    }
    if (open) rows += '</table>';
    const hasSub = e.infobox.some((r) => String(r[0] || '').startsWith('#'));
    const photo = imgPath(e, e.photo);
    const isLogo = /\/assets\/logo/.test(photo);
    const infobox = `<aside class="infobox"><div class="ib-title">${esc(e.titre)}</div>` +
      (photo || e.format === 'wiki' ? `<div class="ib-photo">${imgBox(photo, { cls: photo ? 'ratio-45' : 'ratio-43', mono: e.mono, label: photo ? 'Photo officielle à venir' : 'Pas encore de photo', contain: isLogo, glow: isLogo, natural: !!photo && !e.cadrage, position: e.cadrage, cap: plainOf(e, e.legende) || e.titre })}</div>` : '') +
      (e.legende.trim() ? `<div class="ib-caption">${line(e, e.legende, ctx)}</div>`
        : e.format === 'wiki' && photo ? '<div class="ib-caption"></div>'
          : `<div class="ib-caption"><span class="todo">${esc(e.titre)}, ${photo ? 'portrait officiel (en attente)' : 'en attente d\'une photo'}</span></div>`) +
      (hasSub ? '' : '<div class="ib-sub">Informations</div>') + rows + '</aside>';

    // sections
    const secs = [];
    e.sections.forEach((s, i) => secs.push({ ...s, id: 'sec-' + i, idx: i, hasChildren: s.niveau === 2 && e.sections[i + 1] && e.sections[i + 1].niveau === 3 }));
    secs.push({ titre: 'Galerie', id: 'sec-galerie', niveau: 2, special: 'galerie', idx: 'galerie' });
    secs.push({ titre: 'Voir aussi', id: 'sec-voir', niveau: 2, special: 'voir', idx: 'voir' });

    const editLink = (idx) => (inert ? '' : `<span class="edit">[ <a href="#modifier:${encodeURIComponent(e.slug)}:${idx}">modifier</a> ]</span>`);
    const bodyParts = secs.map((s) => {
      const tag = s.niveau === 3 ? 'h3' : 'h2';
      const head = `<${tag} class="sec" id="${s.id}"><span>${esc(s.titre)}</span>${editLink(s.idx)}</${tag}>`;
      let body = '';
      if (s.special === 'galerie') {
        body = e.galerie.length
          ? '<div class="gallery">' + e.galerie.map((g) => {
            const p = imgPath(e, g.src);
            const logo = /\/assets\/logo/.test(p);
            return `<figure class="g-item" style="--r:1">${imgBox(p, { cls: 'ratio-1', mono: e.mono, label: 'Photo à venir', small: true, contain: logo, glow: logo, natural: true, cap: plainOf(e, g.cap) || e.titre })}<figcaption>${g.cap.trim() ? line(e, g.cap, ctx) : '<span class="todo">Légende à venir</span>'}</figcaption></figure>`;
          }).join('') + '</div>'
          : emptySec();
      } else if (s.special === 'voir') {
        const items = e.voirAussi.map((slug) => findEntry(slug)).filter((x) => x && x.slug !== e.slug);
        body = '<ul class="see-also">' +
          items.map((x) => `<li><a class="wl" href="#${encodeURIComponent(x.slug)}">${esc(x.titre)}</a></li>`).join('') +
          '<li><a class="wl" href="#">Liste de toutes les entrées de Wiki Shox</a></li>' +
          `<li><a class="wl" href="#categorie:${encodeURIComponent(e.cats[0] || 'Ébauche Wiki Shox')}">Catégorie : ${esc(e.cats[0] || 'Ébauche Wiki Shox')}</a></li>` +
          '</ul>';
      } else if (s.html.trim()) {
        body = block(e, s.html, ctx);
      } else if (!s.hasChildren) {
        body = emptySec();
      }
      return head + body;
    });

    // notes (après le reste pour avoir toutes les notes)
    let notesHtml = '';
    if (ctx.notes.length) {
      notesHtml = '<h2 class="sec" id="sec-notes"><span>Notes et références</span></h2><ol class="notes">' +
        ctx.notes.map((n, i) => `<li id="note-${i + 1}"><a class="up" data-cite="${i + 1}" title="Remonter au texte">↑</a>${noteHtml(e, n)}</li>`).join('') + '</ol>';
      secs.push({ titre: 'Notes et références', id: 'sec-notes', niveau: 2 });
    }

    // sommaire
    let n2 = 0, n3 = 0, tocHtml = '<ol>';
    let inSub = false;
    for (const s of secs) {
      if (s.niveau === 3) {
        n3 += 1;
        if (!inSub) { tocHtml = tocHtml.replace(/<\/li>$/, '') + '<ol>'; inSub = true; }
        tocHtml += `<li><a data-go="${s.id}"><span class="num">${n2}.${n3}</span>${esc(s.titre)}</a></li>`;
      } else {
        if (inSub) { tocHtml += '</ol></li>'; inSub = false; }
        n2 += 1; n3 = 0;
        tocHtml += `<li><a data-go="${s.id}"><span class="num">${n2}</span>${esc(s.titre)}</a></li>`;
      }
    }
    if (inSub) tocHtml += '</ol></li>';
    tocHtml += '</ol>';
    const toc = `<div class="toc${prefs.toc ? '' : ' closed'}" id="toc"><div class="toc-head"><span>Sommaire</span><button type="button" id="toc-toggle">[${prefs.toc ? 'masquer' : 'afficher'}]</button></div>${tocHtml}</div>`;

    const banner = e.ebauche
      ? `<div class="ambox"><img src="/assets/logo-128.png" alt=""><div><b>Cette page attend ses archives officielles.</b>Les photos, anecdotes et citations de <i>${esc(e.titre)}</i> peuvent être ajoutées par n'importe qui : clique sur « Modifier » pour compléter l'article.</div><div class="act">${inert ? '' : `<a class="amb-btn" href="#modifier:${encodeURIComponent(e.slug)}">Compléter la page</a>`}</div></div>`
      : e.enrich
        ? '<div class="ambox mini"><span class="mini-ico">📚</span><span><b>Article en cours d\'enrichissement</b> — d\'autres archives arrivent.</span></div>'
        : '';
    const hatnote = e.chapeau.trim() ? `<div class="hatnote"><span aria-hidden="true">↳</span> <i>${line(e, e.chapeau, null)}</i></div>` : '';

    // vues
    let vues = 0;
    if (!inert && !opts.version) {
      const all = FX.store.get('wiki.vues', {}) || {};
      all[e.slug] = (all[e.slug] || 0) + 1;
      vues = all[e.slug];
      FX.store.set('wiki.vues', all);
    }

    return `<article class="view article${inert ? ' preview' : ''}">${articleHead(e.titre, { slug: e.slug, inert, active: opts.version ? 'historique' : 'lire' })}` +
      '<div class="tagline">Un article de Wiki Shox, l\'encyclopédie incandescente.</div>' +
      (opts.version ? opts.version : '') +
      banner + hatnote +
      `<div class="prose">${infobox}${leadHtml}${toc}${bodyParts.join('')}${notesHtml}</div>` +
      (inert ? '' : navbox(e.slug) + portals()) + catlinks(e.cats, inert) +
      (inert ? '' : footer(vues, e)) +
      '</article>';
  }

  function emptySec() {
    return '<div class="empty-sec"><span class="ico"><svg viewBox="0 0 24 24" width="17" height="17"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></span>' +
      '<span>Cette section est vide, insuffisamment détaillée ou incomplète. Tu peux la compléter avec « modifier ».</span></div>';
  }
  function navbox(cur) {
    return '<div class="navbox"><div class="nb-title"><img src="/assets/logo-64.png" alt="">Wiki Shox — l\'encyclopédie incandescente</div>' +
      '<div class="nb-row"><div class="nb-group">Entrées</div><div class="nb-list">' +
      ENTRIES.map((x) => `<a class="${x.slug === cur ? 'cur' : ''}" href="#${encodeURIComponent(x.slug)}">${esc(x.titre)}</a>`).join(' <span class="sep">·</span> ') +
      '</div></div>' +
      '<div class="nb-row"><div class="nb-group">Sites Fire Shox</div><div class="nb-list">' +
      '<a href="fireshox://opening/">Shox Opening</a> <span class="sep">·</span> <a href="fireshox://shoxbench/">ShoxBench</a> <span class="sep">·</span> <a href="fireshox://images/">Galerie de Monsieur Claude</a> <span class="sep">·</span> <a href="fireshox://jeux/">Jeux vidéo</a>' +
      '</div></div></div>';
  }
  function portals() {
    return '<div class="portals">' +
      '<a class="portal" href="#"><span>🔥</span><span>Portail du feu</span></a>' +
      '<a class="portal" href="#les-shoxs"><span>👟</span><span>Portail de la chaussure à ressorts</span></a>' +
      '<a class="portal" href="#recentes"><span>🕒</span><span>Modifications récentes</span></a>' +
      '</div>';
  }
  function catlinks(cats, inert) {
    if (!cats.length) return '';
    return '<div class="catlinks"><b>Catégories :</b>' +
      cats.map((c) => (inert ? `<a>${esc(c)}</a>` : `<a href="#categorie:${encodeURIComponent(c)}">${esc(c)}</a>`)).join(' <span class="sep">|</span> ') + '</div>';
  }
  function footer(vues, e) {
    let last;
    if (e && e.cloud) {
      const d = e.cloud.modified ? new Date(e.cloud.modified) : null;
      last = `<p class="last-mod">Dernière modification par <b>${esc(e.cloud.author)}</b> ${esc(ago(e.cloud.modified))}${d ? ` <span class="abs">(${esc(d.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }))})</span>` : ''} · révision ${e.cloud.revision} · <a href="#historique:${encodeURIComponent(e.slug)}">historique</a></p>`;
    } else if (e) {
      last = `<p class="last-mod">Version d'origine de Wiki Shox : cette page n'a encore jamais été modifiée en ligne. <a href="#modifier:${encodeURIComponent(e.slug)}">Modifier</a></p>`;
    } else last = '<p>Wiki Shox est modifiable par tous les possesseurs de Fire Shox : chaque modification est visible par tout le monde.</p>';
    return '<footer class="art-foot"><div>' + last +
      (vues ? `<p>Cette page a été consultée ${FX.fmt(vues)} fois sur ce navigateur.</p>` : '') +
      '<p>Le texte est disponible sous licence <i>Creative Shox Attribution – Rebond à l\'identique</i> ; d\'autres conditions peuvent s\'appliquer (surtout la gravité).</p>' +
      '<div class="links"><button type="button" data-toast="Nous ne collectons rien. Même pas les chaussettes. (Les pages et photos publiées sont visibles par tous.)">Politique de confidentialité</button><button type="button" data-toast="Wiki Shox : écrit au feu de bois par toute la bande.">À propos de Wiki Shox</button><button type="button" data-toast="Attention : la lecture prolongée peut provoquer une envie soudaine de rebondir.">Avertissements</button></div>' +
      '</div><div class="badges"><span class="badge"><img src="/assets/logo-64.png" alt=""><span>propulsé par<b>Fire Shox</b></span></span></div></footer>';
  }

  // ------------------------------------------------------------------ rendu : accueil, catégorie, page manquante
  function renderHome() {
    const feat = BY.get(ACC.lumiere) || ENTRIES.find((x) => !x.ebauche) || ENTRIES[0];
    const stubs = ENTRIES.filter((x) => x.ebauche).length;
    const ctx = { notes: [] };
    const featText = feat ? plainOf(feat, feat.resume).slice(0, 330).replace(/\s+\S*$/, '') + '…' : '';
    const featPhoto = feat ? imgPath(feat, feat.photo) : '';
    return '<div class="view home">' +
      '<section class="home-banner"><img class="logo" src="/assets/logo-256.png" alt="">' +
      '<div><h1>Bienvenue sur <em class="fire-text">Wiki Shox</em></h1><p>L\'encyclopédie incandescente que tout le monde peut modifier.</p></div>' +
      `<div class="home-stats"><span><b>${ENTRIES.length}</b>articles en français</span><span><b>${ENTRIES.length - stubs}</b>articles rédigés</span><span><b>${stubs}</b>ébauches en attente</span></div></section>` +
      '<div class="home-grid">' +
      (feat ? `<section class="box"><div class="box-h"><span class="ico">✨</span>Lumière sur…</div><div class="box-b"><div class="feat">${imgBox(featPhoto, { cls: 'ratio-1', mono: feat.mono, contain: /logo/.test(featPhoto), glow: /logo/.test(featPhoto), small: true, zoom: false })}<div><h3><a href="#${encodeURIComponent(feat.slug)}">${esc(feat.titre)}</a></h3><p>${esc(featText)}</p><a class="more-link" href="#${encodeURIComponent(feat.slug)}">Lire l'article →</a></div></div></div></section>` : '') +
      `<section class="box"><div class="box-h"><span class="ico">💡</span>Le saviez-vous ?</div><div class="box-b"><ul class="dyk">${(ACC.saviezVous || []).map((t) => `<li>${wikify(t, ctx)}</li>`).join('')}</ul></div></section>` +
      '</div>' +
      '<section class="box home-all"><div class="box-h"><span class="ico">📚</span>Toutes les entrées<a class="box-act" href="#creer">+ Créer une page</a></div><div class="box-b"><div class="cards">' +
      ENTRIES.map((x) => {
        const p = imgPath(x, x.photo);
        const fresh = Cloud && Cloud.isNew(x.slug);
        return `<a class="card" href="#${encodeURIComponent(x.slug)}">${imgBox(p, { cls: 'ratio-1', mono: x.mono, label: 'Photo à venir', small: true, contain: /logo/.test(p), glow: /logo/.test(p), position: x.cadrage || '50% 30%', zoom: false })}<span class="ct">${esc(x.titre)}</span><span class="cs${fresh ? ' mod' : x.ebauche ? '' : x.enrich ? ' new' : ' star'}">${fresh ? '● Modifié' : x.ebauche ? 'Ébauche' : x.enrich ? '● Nouvel article' : '★ Article de qualité'}</span></a>`;
      }).join('') +
      '</div></div></section>' +
      footer(0, null) +
      '</div>';
  }

  function renderCategory(name) {
    const members = ENTRIES.filter((x) => x.cats.includes(name));
    const groups = new Map();
    for (const m of members) {
      const k = fold(m.titre).replace(/[^a-z]/g, '')[0]?.toUpperCase() || '#';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(m);
    }
    const keys = [...groups.keys()].sort();
    const key = (m) => fold(m.titre).replace(/[^a-z0-9 ]/g, '');
    for (const k of keys) groups.get(k).sort((a, b) => key(a).localeCompare(key(b), 'fr'));
    return `<article class="view">${articleHead('Catégorie : ' + name, { lang: false, kind: 'Catégorie' })}` +
      '<div class="tagline">Une catégorie de Wiki Shox, l\'encyclopédie incandescente.</div>' +
      `<p class="cat-intro">Pages dans la catégorie « ${esc(name)} » : ${members.length} page${members.length > 1 ? 's' : ''}.</p>` +
      (members.length ? '<div class="cat-cols prose">' + keys.map((k) => `<h3>${k}</h3><ul>${groups.get(k).map((m) => `<li><a class="wl" href="#${encodeURIComponent(m.slug)}">${esc(m.titre)}</a></li>`).join('')}</ul>`).join('') + '</div>' : '<p class="todo">Cette catégorie est vide. Même les ressorts l\'ont quittée.</p>') +
      navbox(null) + footer(0, null) + '</article>';
  }

  function renderMissing(name) {
    const qf = fold(name);
    const sugg = ENTRIES.filter((x) => x.plainTitle.includes(qf.slice(0, 3)) || qf.includes(fold(x.slug).slice(0, 3))).slice(0, 5);
    return `<article class="view">${articleHead(name, { lang: false })}` +
      '<div class="tagline">Un article de Wiki Shox, l\'encyclopédie incandescente.</div>' +
      `<div class="ambox missing"><img src="/assets/logo-128.png" alt=""><div><b>Wiki Shox ne possède pas d'article avec ce nom exact.</b>La page « ${esc(name)} » a peut-être rebondi trop loin. Vérifie l'orthographe, utilise la recherche… ou crée-la !</div><div class="act"><a class="amb-btn" href="#creer:${encodeURIComponent(name.slice(0, 120))}">Créer la page</a></div></div>` +
      (sugg.length ? `<section class="box"><div class="box-h">Vouliez-vous dire…</div><div class="box-b prose"><ul>${sugg.map((m) => `<li><a class="wl" href="#${encodeURIComponent(m.slug)}">${esc(m.titre)}</a></li>`).join('')}</ul></div></section>` : '') +
      navbox(null) + footer(0, null) + '</article>';
  }

  // ------------------------------------------------------------------ routeur (#slug)
  const page = $('#page');
  const main = $('#main');
  const scrolls = new Map();
  let navByClick = false;
  let lastKey = null;

  function go(slug) {
    navByClick = true;
    if (location.hash.replace(/^#/, '') === slug) { route(); return; }
    location.hash = slug ? '#' + slug.split(':').map(encodeURIComponent).join(':') : '';
    if (!slug) history.replaceState(null, '', location.pathname + location.search);
  }

  const EDITOR_ROUTES = /^(modifier|historique|version|diff|creer|recentes)(?::|$)/;
  function route() {
    let key = '';
    try { key = decodeURIComponent(location.hash.replace(/^#/, '')); } catch { key = location.hash.replace(/^#/, ''); }
    if (lastKey !== null) scrolls.set(lastKey, main.scrollTop);
    const restoring = !navByClick && scrolls.has(key);
    navByClick = false;
    lastKey = key;
    closeMenu();
    if (window.WikiEditor) WikiEditor.leave();

    current = null;
    let m;
    if ((m = EDITOR_ROUTES.exec(key)) && window.WikiEditor) {
      view = m[1];
      const r = WikiEditor.route(m[1], key.slice(m[0].length)) || {};
      current = r.current || null;
      document.title = (r.title ? r.title + ' — ' : '') + 'Wiki Shox';
      markActive();
      main.scrollTop = 0;
      return;
    }
    let html;
    if (!key) {
      view = 'home';
      html = renderHome();
      document.title = 'Wiki Shox';
    } else if (/^cat[ée]gorie:/i.test(key)) {
      view = 'category';
      const name = key.replace(/^cat[ée]gorie:/i, '');
      html = renderCategory(name);
      document.title = `Catégorie : ${name} — Wiki Shox`;
    } else {
      const e = findEntry(key);
      if (e) {
        view = 'article';
        current = e.slug;
        html = renderArticle(e);
        document.title = `${e.titre} — Wiki Shox`;
        if (Cloud && e.cloud) Cloud.seen(e.slug, e.cloud.revision);
      } else {
        view = 'missing';
        html = renderMissing(key);
        document.title = `${key} — Wiki Shox`;
      }
    }
    page.innerHTML = html;
    hydrate(page);
    markActive();
    main.scrollTop = restoring ? scrolls.get(key) : 0;
  }

  // Nouvelle version reçue : on rafraîchit la liste, et la page affichée si elle a changé (jamais l'éditeur).
  function onCloud(type, changed) {
    if (type === 'status') { paintSync(); return; }
    if (type !== 'sync') return;
    rebuild();
    renderList();
    markActive();
    paintSync();
    if (!changed || !changed.length) return;
    // (« missing » : un lien vers une page créée par quelqu'un d'autre, arrivée avec cette synchronisation)
    if ((view === 'article' && changed.includes(current)) || view === 'home' || view === 'missing' || view === 'category') {
      const top = main.scrollTop;
      navByClick = true;
      route();
      main.scrollTop = top;
      if (view === 'article') toast('Cette page vient d\'être mise à jour par quelqu\'un.');
    }
  }

  // ------------------------------------------------------------------ visionneuse d'images
  const viewer = $('#viewer');
  const vStage = $('#v-stage');
  const vImg = $('#v-img');
  let vItems = [], vIdx = 0, vs = 1, vtx = 0, vty = 0, vDrag = null;

  function openViewer(box) {
    const scope = box.closest('.ed-prev-body, .hist-view') || page;
    const boxes = $$('.imgbox.zoomable.loaded', scope);
    vItems = boxes.map((b) => ({ src: b.querySelector('img').src, cap: b.dataset.cap || '' }));
    vIdx = Math.max(0, boxes.indexOf(box));
    viewer.hidden = false;
    viewer.classList.remove('closing');
    $('#v-art').textContent = document.title.replace(/ — Wiki Shox$/, '');
    showV(0);
    snd('whoosh');
  }
  function closeViewer() {
    if (viewer.hidden) return;
    viewer.classList.add('closing');
    snd('click');
    setTimeout(() => { viewer.hidden = true; viewer.classList.remove('closing'); }, 200);
  }
  function showV(dir) {
    const it = vItems[vIdx];
    if (!it) return;
    vs = 1; vtx = 0; vty = 0;
    vImg.classList.remove('slide-r', 'slide-l');
    vImg.src = it.src;
    void vImg.offsetWidth;
    if (dir) vImg.classList.add(dir > 0 ? 'slide-r' : 'slide-l');
    applyV();
    $('#v-count').textContent = `${vIdx + 1} / ${vItems.length}`;
    $('#v-title').textContent = it.cap;
    $('#v-cap').textContent = it.cap;
    $('#v-prev').hidden = $('#v-next').hidden = vItems.length < 2;
  }
  function stepV(d) {
    if (vItems.length < 2) return;
    vIdx = (vIdx + d + vItems.length) % vItems.length;
    snd('flip');
    showV(d);
  }
  function applyV(anim) {
    vImg.classList.toggle('anim', !!anim);
    vImg.style.transform = `translate(${vtx}px, ${vty}px) scale(${vs})`;
    $('#v-zval').textContent = Math.round(vs * 100) + ' %';
    vStage.classList.toggle('zoomed', vs > 1.001);
    $('#v-zout').disabled = vs <= 1.001;
    $('#v-zin').disabled = vs >= 5.99;
  }
  function clampV() {
    const r = vStage.getBoundingClientRect();
    const mx = Math.max(0, (vImg.offsetWidth * vs - r.width) / 2 + 40);
    const my = Math.max(0, (vImg.offsetHeight * vs - r.height) / 2 + 40);
    vtx = Math.max(-mx, Math.min(mx, vtx)); vty = Math.max(-my, Math.min(my, vty));
    if (vs <= 1.001) { vtx = 0; vty = 0; }
  }
  function zoomV(f, cx = 0, cy = 0, anim = false) {
    const s2 = Math.max(1, Math.min(6, vs * f));
    if (Math.abs(s2 - vs) < 1e-4) return;
    const k = s2 / vs;
    vtx = cx - (cx - vtx) * k; vty = cy - (cy - vty) * k; vs = s2;
    clampV(); applyV(anim);
  }
  const vCenter = (ev) => { const r = vStage.getBoundingClientRect(); return [ev.clientX - (r.left + r.width / 2), ev.clientY - (r.top + r.height / 2)]; };
  vStage.addEventListener('wheel', (ev) => { ev.preventDefault(); const [cx, cy] = vCenter(ev); zoomV(Math.exp(-ev.deltaY * 0.0018), cx, cy); }, { passive: false });
  vStage.addEventListener('dblclick', (ev) => {
    if (ev.target.closest('.v-nav')) return;
    if (vs > 1.001) { vs = 1; vtx = 0; vty = 0; applyV(true); } else { const [cx, cy] = vCenter(ev); zoomV(2.5, cx, cy, true); }
    snd('tick');
  });
  vStage.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 || vs <= 1.001 || ev.target.closest('.v-nav')) return;
    vDrag = { x: ev.clientX, y: ev.clientY, tx: vtx, ty: vty };
    vStage.setPointerCapture(ev.pointerId); vStage.classList.add('dragging');
  });
  vStage.addEventListener('pointermove', (ev) => { if (!vDrag) return; vtx = vDrag.tx + ev.clientX - vDrag.x; vty = vDrag.ty + ev.clientY - vDrag.y; clampV(); applyV(); });
  const endV = () => { vDrag = null; vStage.classList.remove('dragging'); };
  vStage.addEventListener('pointerup', endV);
  vStage.addEventListener('pointercancel', endV);
  vStage.addEventListener('click', (ev) => { if (ev.target === vStage && vs <= 1.001) closeViewer(); });
  $('#v-prev').addEventListener('click', () => stepV(-1));
  $('#v-next').addEventListener('click', () => stepV(1));
  $('#v-close').addEventListener('click', closeViewer);
  $('#v-zin').addEventListener('click', () => { zoomV(1.5, 0, 0, true); snd('tick'); });
  $('#v-zout').addEventListener('click', () => { zoomV(1 / 1.5, 0, 0, true); snd('tick'); });
  $('#v-zval').addEventListener('click', () => { vs = 1; vtx = 0; vty = 0; applyV(true); snd('tick'); });
  document.addEventListener('keydown', (ev) => {
    if (viewer.hidden || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    if (k === 'Escape') { ev.preventDefault(); ev.stopImmediatePropagation(); closeViewer(); }
    else if (k === 'ArrowRight') { ev.preventDefault(); stepV(1); }
    else if (k === 'ArrowLeft') { ev.preventDefault(); stepV(-1); }
    else if (k === '+' || k === '=') { ev.preventDefault(); zoomV(1.5, 0, 0, true); }
    else if (k === '-' || k === '_') { ev.preventDefault(); zoomV(1 / 1.5, 0, 0, true); }
    else if (k === '0') { ev.preventDefault(); vs = 1; vtx = 0; vty = 0; applyV(true); }
  }, true);
  window.addEventListener('hashchange', () => { if (!viewer.hidden) { viewer.hidden = true; } });

  // clics dans la page : sommaire, notes, liens, petites blagues
  page.addEventListener('click', (ev) => {
    const t = ev.target;
    // Aperçu de l'éditeur : rien n'y est cliquable (sauf les images)
    const inPreview = t.closest('.article.preview');
    const zb = t.closest('.imgbox.zoomable.loaded');
    if (zb && !t.closest('a')) { openViewer(zb); return; }
    const ext = t.closest('a[data-ext]');
    if (ext) {
      ev.preventDefault();
      if (inPreview) return;
      const href = WT.safeLink(ext.dataset.ext);
      if (href) { snd('click'); FX.open(href); }
      return;
    }
    if (inPreview) {
      if (t.closest('a')) ev.preventDefault();
      if (t.closest('[data-go]')) { const el = inPreview.querySelector('#' + CSS.escape(t.closest('[data-go]').dataset.go)); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      return;
    }
    const goEl = t.closest('[data-go]');
    if (goEl) { scrollToEl(document.getElementById(goEl.dataset.go)); snd('tick'); return; }
    const note = t.closest('[data-note]');
    if (note) {
      const li = document.getElementById('note-' + note.dataset.note);
      scrollToEl(li, 'center'); li && li.classList.add('hl'); setTimeout(() => li && li.classList.remove('hl'), 1600); snd('tick'); return;
    }
    const cite = t.closest('[data-cite]');
    if (cite) { scrollToEl(document.getElementById('cite-' + cite.dataset.cite), 'center'); snd('tick'); return; }
    if (t.closest('[data-fact]')) {
      snd('error');
      toast(FX.pick(['Référence introuvable : elle a dû rebondir.', 'Source : « tkt, c\'est vrai ».', 'Cette information a été vérifiée par personne.', 'La référence a pris feu. Respect.']));
      return;
    }
    if (t.closest('#toc-toggle')) {
      prefs.toc = !prefs.toc; savePrefs();
      $('#toc').classList.toggle('closed', !prefs.toc);
      t.closest('#toc-toggle').textContent = `[${prefs.toc ? 'masquer' : 'afficher'}]`;
      snd('tick'); return;
    }
    const tb = t.closest('[data-toast]');
    if (tb) { snd('click'); toast(tb.dataset.toast); return; }
    const a = t.closest('a[href^="#"]');
    if (a) { navByClick = true; snd('click'); }
  });

  function scrollToEl(el, block = 'start') {
    if (!el) return;
    if (block === 'start') {
      const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 70;
      main.scrollTo({ top, behavior: 'smooth' });
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    } else el.scrollIntoView({ behavior: 'smooth', block });
  }

  window.addEventListener('hashchange', route);

  // ------------------------------------------------------------------ démarrage
  const api = {
    entries: ENTRIES, findEntry, go, route, rebuild, renderList, markActive,
    esc, fold, hydrate, imgBox, renderArticle, entryFromData, defaultData, dataOf, hasDefault: (slug) => DEFAULT_BY.has(slug),
    page, main, scrollToEl, current: () => current, CHAMPS, toast, snd,
  };
  window.WikiShox = api;
  if (window.WikiEditor) WikiEditor.attach(api);
  renderList();
  route();
  paintSync();
  if (Cloud) { Cloud.on(onCloud); Cloud.start(); }
})();
