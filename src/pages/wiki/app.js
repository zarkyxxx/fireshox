// Wiki Shox — l'encyclopédie incandescente (fireshox://wiki/)
// Navigation par #slug (bouton « précédent » du navigateur compris), recherche, barre latérale repliable.
// Stockage : wiki.prefs { sidebar: 'open'|'closed', toc: true|false }, wiki.vues { slug: nombre }.
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = (s) => String(s ?? '').normalize('NFC').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const textOf = (html) => { const t = document.createElement('template'); t.innerHTML = String(html || '').replace(/<\/(p|li|blockquote|tr|h\d|caption)>|<br\s*\/?>/gi, ' $&').replace(/\{\{[^}]*\}\}/g, '').replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_m, a, b) => b || a); return t.content.textContent.replace(/\s+/g, ' ').trim(); };
  const snd = (n) => { try { FX.sound(n); } catch {} };
  const toast = (t) => { try { FX.toast(t); } catch {} };

  // ------------------------------------------------------------------ données
  const CHAMPS = window.WIKI_CHAMPS || ['Nom complet', 'Surnom(s)', 'Première apparition', 'Signe distinctif'];
  const ACC = window.WIKI_ACCUEIL || {};
  const AUTO_CATS_STUB = ['Ébauche Wiki Shox', 'Archives en attente'];

  function normalize(e) {
    const slug = String(e.slug || '').trim();
    const sections = (Array.isArray(e.sections) ? e.sections : [['Biographie', ''], ['Origines', ''], ['Faits marquants', ''], ['Citations célèbres', '']])
      .map((s) => (Array.isArray(s) ? { titre: s[0], html: s[1] || '', niveau: s[2] === 3 ? 3 : 2 } : { titre: s.titre, html: s.html || '', niveau: s.niveau === 3 ? 3 : 2 }));
    const filled = sections.some((s) => s.html.trim()) || String(e.resume || '').trim();
    const galerie = (Array.isArray(e.galerie) ? e.galerie : [['1.jpg', ''], ['2.jpg', ''], ['3.jpg', '']])
      .map((g) => (Array.isArray(g) ? { src: g[0], cap: g[1] || '' } : typeof g === 'string' ? { src: g, cap: '' } : { src: g.src, cap: g.legende || '' }));
    const o = {
      slug,
      titre: e.titre || slug,
      ebauche: e.ebauche === undefined ? !filled : !!e.ebauche,
      resume: e.resume || '',
      photo: e.photo === undefined ? 'main.jpg' : e.photo,
      legende: e.legende || '',
      infobox: Array.isArray(e.infobox) ? e.infobox : CHAMPS.map((c) => [c, '']),
      sections,
      galerie,
      voirAussi: Array.isArray(e.voirAussi) ? e.voirAussi : [],
      categories: Array.isArray(e.categories) ? e.categories : [],
    };
    o.mono = monogram(o.titre);
    o.cats = [...(o.ebauche ? AUTO_CATS_STUB : []), ...o.categories];
    o.plainTitle = fold(o.titre);
    o.plain = [textOf(o.resume), ...o.sections.map((s) => s.titre + ' ' + textOf(s.html)), ...o.infobox.map((r) => (r[1] ? r[0] + ' ' + textOf(r[1]) : ''))].join(' ').replace(/\s+/g, ' ').trim();
    o.foldPlain = fold(o.plain);
    return o;
  }

  function monogram(t) {
    const words = String(t).replace(/^[^A-Za-zÀ-ÿ]+/, '').split(/[\s-]+/).map((w) => w.replace(/^[LlDd]['’]/, '').replace(/[^A-Za-zÀ-ÿ]/g, '')).filter(Boolean);
    if (!words.length) return '?';
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  const ENTRIES = (window.WIKI_ENTREES || []).map(normalize).filter((e) => e.slug);
  const BY = new Map(ENTRIES.map((e) => [e.slug, e]));
  const findEntry = (target) => {
    const t = String(target || '').trim();
    if (BY.has(t)) return BY.get(t);
    const f = fold(t);
    return ENTRIES.find((e) => e.plainTitle === f || fold(e.slug) === f) || null;
  };

  const imgPath = (e, f) => (!f ? '' : /^(\/|[a-z]+:)/i.test(f) ? f : `/assets/wiki/${e.slug}/${f}`);
  const shownPath = (p) => p.replace(/^\//, '');

  // ------------------------------------------------------------------ stockage
  const prefs = Object.assign({ sidebar: 'open', toc: true }, FX.store.get('wiki.prefs', {}) || {});
  const savePrefs = () => FX.store.set('wiki.prefs', prefs);

  // ------------------------------------------------------------------ mini-wikitexte
  // [[slug|texte]]  {{réf}}  {{note|texte}}
  function links(html) {
    return String(html || '').replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_m, target, label) => {
      const e = findEntry(target);
      const txt = label || (e ? e.titre : target);
      if (e) return `<a class="wl" href="#${encodeURIComponent(e.slug)}" title="${esc(e.titre)}">${txt}</a>`;
      return `<a class="wl new" data-missing="${esc(target)}" title="${esc(target)} (page inexistante)">${txt}</a>`;
    });
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

  // ------------------------------------------------------------------ images (avec remplacement)
  function imgBox(src, { cls = 'ratio-45', mono = '?', label = 'Photo à venir', small = false, contain = false, glow = false } = {}) {
    const extra = [cls, contain ? 'contain' : '', glow ? 'glow' : ''].filter(Boolean).join(' ');
    return `<div class="imgbox ${extra}" data-src="${esc(src)}">` +
      `<div class="ph${small ? ' small' : ''}"><div class="ph-mono">${esc(mono)}</div><div class="ph-label">${esc(label)}</div>${src ? `<code title="${esc(shownPath(src))}">${esc(shownPath(src)).replace(/\//g, '/<wbr>')}</code>` : ''}</div>` +
      '</div>';
  }
  function alternates(src) {
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
      const tries = alternates(src);
      let i = 0;
      const img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.onload = () => { box.appendChild(img); requestAnimationFrame(() => box.classList.add('loaded')); };
      img.onerror = () => { i += 1; if (i < tries.length) img.src = tries[i]; };
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
    list.innerHTML = rows.map(({ e, inTitle }) =>
      `<li class="item${e.slug === current ? ' on' : ''}" data-slug="${esc(e.slug)}" role="option" aria-selected="${e.slug === current}">` +
        `<a href="#${encodeURIComponent(e.slug)}" title="${esc(e.titre)}"><span class="t">${highlight(e.titre, inTitle ? qf : '')}</span>` +
        `${!inTitle && qf ? `<span class="snip">${snippet(e, qf)}</span>` : ''}</a>` +
        '<button class="more" type="button" title="Options" aria-label="Options"><svg viewBox="0 0 24 24" width="16" height="16"><circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/></svg></button>' +
      '</li>').join('');
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
      if (on) li.scrollIntoView({ block: 'nearest' });
    }
    $('#nav-home').classList.toggle('on', current === null && !location.hash.replace(/^#/, ''));
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
    snd('error');
    toast(`La page « ${name.slice(0, 40)} » n'existe pas encore. Seul le Grand Archiviste peut la créer.`);
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
    menu.style.top = Math.min(r.bottom + 6, innerHeight - 110) + 'px';
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
  $('#plus').addEventListener('click', () => { snd('coin'); toast('Wiki Shox Plus est déjà inclus. Gratuit. Comme l\'air chaud.'); });
  for (const b of $$('.tl')) b.addEventListener('click', () => { snd('click'); toast(b.dataset.toast); });

  // raccourcis
  document.addEventListener('keydown', (ev) => {
    const mod = ev.ctrlKey || ev.metaKey;
    if (mod && !ev.shiftKey && !ev.altKey && ev.code === 'KeyK') {
      ev.preventDefault();
      if (app.classList.contains('collapsed')) setCollapsed(false, false);
      q.focus(); q.select();
    } else if (mod && !ev.shiftKey && !ev.altKey && ev.code === 'KeyB') {
      ev.preventDefault();
      setCollapsed(!app.classList.contains('collapsed'));
    } else if (ev.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) {
      ev.preventDefault(); q.focus();
    } else if (ev.key === 'Escape') closeMenu();
  });

  // ------------------------------------------------------------------ rendu : article
  function articleHead(titre, { tabs = true, lang = true, kind = 'Article' } = {}) {
    return `<div class="title-row"><h1>${esc(titre)}</h1>${lang ? '<button class="lang-btn" type="button" data-toast="Wiki Shox existe en 1 langue : le français incandescent. Une version en Shox est en cours de rebond."><svg viewBox="0 0 24 24" width="17" height="17"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 12h17M12 3.5c2.6 2.6 3.6 5.4 3.6 8.5s-1 5.9-3.6 8.5c-2.6-2.6-3.6-5.4-3.6-8.5s1-5.9 3.6-8.5z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>1 langue <span aria-hidden="true">▾</span></button>' : ''}</div>` +
      (tabs ? `<nav class="tabs"><div><button class="tab on" type="button">${kind}</button>` + '<button class="tab" type="button" data-toast="La page de discussion est fermée : tout le monde parlait en même temps.">Discussion</button></div>' +
        '<div><button class="tab on" type="button">Lire</button><button class="tab" type="button" data-toast="Modification réservée au Grand Archiviste des Shox.">Modifier</button><button class="tab" type="button" data-toast="Historique : 1 version. Elle a pris feu, puis elle s\'est très bien remise.">Voir l\'historique</button></div></nav>' : '');
  }

  function renderArticle(e) {
    const ctx = { notes: [] };
    const pageNotes = [];
    let lead = e.resume.trim();
    if (!lead) {
      lead = `<p><b>${esc(e.titre)}</b> est une entrée de Wiki Shox dont l'article attend encore ses archives officielles.{{note|Les documents (photos, anecdotes, citations) n'ont pas encore été transmis à la rédaction.}} ` +
        'Elle figure néanmoins parmi les pages les plus attendues de l\'encyclopédie.{{réf}}</p>';
    }
    const leadHtml = wikify(lead, ctx);

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
      rows += `<tr><th scope="row">${esc(label)}</th><td>${val ? wikify(val, ctx) : '<span class="todo">à compléter</span>'}</td></tr>`;
    }
    if (open) rows += '</table>';
    const hasSub = e.infobox.some((r) => String(r[0] || '').startsWith('#'));
    const photo = imgPath(e, e.photo);
    const isLogo = /\/assets\/logo/.test(photo);
    const infobox = `<aside class="infobox"><div class="ib-title">${esc(e.titre)}</div>` +
      (photo ? `<div class="ib-photo">${imgBox(photo, { mono: e.mono, label: 'Photo officielle à venir', contain: isLogo, glow: isLogo })}</div>` : '') +
      `<div class="ib-caption">${e.legende ? wikify(e.legende, ctx) : `<span class="todo">${esc(e.titre)}, portrait officiel (en attente)</span>`}</div>` +
      (hasSub ? '' : '<div class="ib-sub">Informations</div>') + rows + '</aside>';

    // sections
    const secs = [];
    e.sections.forEach((s, i) => secs.push({ ...s, id: 'sec-' + i, hasChildren: s.niveau === 2 && e.sections[i + 1] && e.sections[i + 1].niveau === 3 }));
    secs.push({ titre: 'Galerie', id: 'sec-galerie', niveau: 2, special: 'galerie' });
    secs.push({ titre: 'Voir aussi', id: 'sec-voir', niveau: 2, special: 'voir' });

    const bodyParts = secs.map((s) => {
      const tag = s.niveau === 3 ? 'h3' : 'h2';
      const head = `<${tag} class="sec" id="${s.id}"><span>${esc(s.titre)}</span><span class="edit">[ <button type="button" data-toast="Modification réservée au Grand Archiviste des Shox.">modifier</button> ]</span></${tag}>`;
      let body = '';
      if (s.special === 'galerie') {
        body = e.galerie.length
          ? '<div class="gallery">' + e.galerie.map((g, gi) => {
            const p = imgPath(e, g.src);
            const logo = /\/assets\/logo/.test(p);
            return `<figure class="g-item">${imgBox(p, { cls: 'ratio-1', mono: e.mono, label: 'Photo à venir', small: true, contain: logo, glow: logo })}<figcaption>${g.cap ? wikify(g.cap, ctx) : '<span class="todo">Légende à venir</span>'}</figcaption></figure>`;
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
        body = wikify(s.html, ctx);
      } else if (!s.hasChildren) {
        body = emptySec();
      }
      return head + body;
    });

    // notes (après le reste pour avoir toutes les notes)
    let notesHtml = '';
    if (ctx.notes.length) {
      notesHtml = '<h2 class="sec" id="sec-notes"><span>Notes et références</span></h2><ol class="notes">' +
        ctx.notes.map((n, i) => `<li id="note-${i + 1}"><a class="up" data-cite="${i + 1}" title="Remonter au texte">↑</a>${links(n)}</li>`).join('') + '</ol>';
      secs.push({ titre: 'Notes et références', id: 'sec-notes', niveau: 2 });
    }
    void pageNotes;

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
      ? `<div class="ambox"><img src="/assets/logo-128.png" alt=""><div><b>Cette page attend ses archives officielles.</b>Les photos, anecdotes et citations de <i>${esc(e.titre)}</i> seront ajoutées par le Grand Archiviste des Shox dès leur réception. En attendant, l'article reste une ébauche.</div><div class="act"><button type="button" data-toast="Merci ! Le Grand Archiviste a bien noté ta motivation incandescente.">Je veux aider</button></div></div>`
      : '';

    // vues
    const vues = FX.store.get('wiki.vues', {}) || {};
    vues[e.slug] = (vues[e.slug] || 0) + 1;
    FX.store.set('wiki.vues', vues);

    return `<article class="view article">${articleHead(e.titre)}` +
      '<div class="tagline">Un article de Wiki Shox, l\'encyclopédie incandescente.</div>' +
      banner +
      `<div class="prose">${infobox}${leadHtml}${toc}${bodyParts.join('')}${notesHtml}</div>` +
      navbox(e.slug) + portals() + catlinks(e.cats) +
      footer(vues[e.slug]) +
      '</article>';
  }

  function emptySec() {
    return '<div class="empty-sec"><span class="ico"><svg viewBox="0 0 24 24" width="17" height="17"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></span>' +
      '<span>Cette section est vide, insuffisamment détaillée ou incomplète. Les archives officielles arrivent bientôt !</span></div>';
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
      '<a class="portal" href="#"><span><img src="/assets/logo-32.png" alt="" width="18" height="18"></span><span>Portail de Fire Shox</span></a>' +
      '</div>';
  }
  function catlinks(cats) {
    if (!cats.length) return '';
    return '<div class="catlinks"><b>Catégories :</b>' +
      cats.map((c) => `<a href="#categorie:${encodeURIComponent(c)}">${esc(c)}</a>`).join(' <span class="sep">|</span> ') + '</div>';
  }
  function footer(vues) {
    return '<footer class="art-foot"><div>' +
      '<p>La dernière modification de cette page a été faite par un ressort, à une heure incandescente.</p>' +
      (vues ? `<p>Cette page a été consultée ${FX.fmt(vues)} fois sur ce navigateur.</p>` : '') +
      '<p>Le texte est disponible sous licence <i>Creative Shox Attribution – Rebond à l\'identique</i> ; d\'autres conditions peuvent s\'appliquer (surtout la gravité).</p>' +
      '<div class="links"><button type="button" data-toast="Nous ne collectons rien. Même pas les chaussettes.">Politique de confidentialité</button><button type="button" data-toast="Wiki Shox : écrit au feu de bois depuis toujours.">À propos de Wiki Shox</button><button type="button" data-toast="Attention : la lecture prolongée peut provoquer une envie soudaine de rebondir.">Avertissements</button></div>' +
      '</div><div class="badges"><span class="badge"><img src="/assets/logo-64.png" alt=""><span>propulsé par<b>Fire Shox</b></span></span></div></footer>';
  }

  // ------------------------------------------------------------------ rendu : accueil, catégorie, page manquante
  function renderHome() {
    const feat = BY.get(ACC.lumiere) || ENTRIES.find((x) => !x.ebauche) || ENTRIES[0];
    const stubs = ENTRIES.filter((x) => x.ebauche).length;
    const ctx = { notes: [] };
    const featText = feat ? textOf(feat.resume).slice(0, 330).replace(/\s+\S*$/, '') + '…' : '';
    return '<div class="view home">' +
      '<section class="home-banner"><img class="logo" src="/assets/logo-256.png" alt="">' +
      '<div><h1>Bienvenue sur <em class="fire-text">Wiki Shox</em></h1><p>L\'encyclopédie incandescente que chacun peut lire en rebondissant.</p></div>' +
      `<div class="home-stats"><span><b>${ENTRIES.length}</b>articles en français</span><span><b>${stubs}</b>ébauches en attente</span><span><b>${ENTRIES.length - stubs}</b>article de qualité (auto-proclamé)</span></div></section>` +
      '<div class="home-grid">' +
      (feat ? `<section class="box"><div class="box-h"><span class="ico">✨</span>Lumière sur…</div><div class="box-b"><div class="feat">${imgBox(imgPath(feat, feat.photo), { cls: 'ratio-1', mono: feat.mono, contain: /logo/.test(feat.photo), glow: /logo/.test(feat.photo), small: true })}<div><h3><a href="#${encodeURIComponent(feat.slug)}">${esc(feat.titre)}</a></h3><p>${esc(featText)}</p><a class="more-link" href="#${encodeURIComponent(feat.slug)}">Lire l'article →</a></div></div></div></section>` : '') +
      `<section class="box"><div class="box-h"><span class="ico">💡</span>Le saviez-vous ?</div><div class="box-b"><ul class="dyk">${(ACC.saviezVous || []).map((t) => `<li>${wikify(t, ctx)}</li>`).join('')}</ul></div></section>` +
      '</div>' +
      '<section class="box home-all"><div class="box-h"><span class="ico">📚</span>Toutes les entrées</div><div class="box-b"><div class="cards">' +
      ENTRIES.map((x) => `<a class="card" href="#${encodeURIComponent(x.slug)}">${imgBox(imgPath(x, x.photo), { cls: 'ratio-1', mono: x.mono, label: 'Photo à venir', small: true, contain: /logo/.test(x.photo), glow: /logo/.test(x.photo) })}<span class="ct">${esc(x.titre)}</span><span class="cs${x.ebauche ? '' : ' star'}">${x.ebauche ? 'Ébauche' : '★ Article de qualité'}</span></a>`).join('') +
      '</div></div></section>' +
      footer(0) +
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
      navbox(null) + footer(0) + '</article>';
  }

  function renderMissing(name) {
    const qf = fold(name);
    const sugg = ENTRIES.filter((x) => x.plainTitle.includes(qf.slice(0, 3)) || qf.includes(fold(x.slug).slice(0, 3))).slice(0, 5);
    return `<article class="view">${articleHead(name, { lang: false })}` +
      '<div class="tagline">Un article de Wiki Shox, l\'encyclopédie incandescente.</div>' +
      `<div class="ambox missing"><img src="/assets/logo-128.png" alt=""><div><b>Wiki Shox ne possède pas d'article avec ce nom exact.</b>La page « ${esc(name)} » a peut-être rebondi trop loin. Vérifie l'orthographe ou utilise la recherche à gauche.</div></div>` +
      (sugg.length ? `<section class="box"><div class="box-h">Vouliez-vous dire…</div><div class="box-b prose"><ul>${sugg.map((m) => `<li><a class="wl" href="#${encodeURIComponent(m.slug)}">${esc(m.titre)}</a></li>`).join('')}</ul></div></section>` : '') +
      navbox(null) + footer(0) + '</article>';
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
    location.hash = slug ? '#' + encodeURIComponent(slug) : '';
    if (!slug) history.replaceState(null, '', location.pathname + location.search);
  }

  function route() {
    let key = '';
    try { key = decodeURIComponent(location.hash.replace(/^#/, '')); } catch { key = location.hash.replace(/^#/, ''); }
    if (lastKey !== null) scrolls.set(lastKey, main.scrollTop);
    const restoring = !navByClick && scrolls.has(key);
    navByClick = false;
    lastKey = key;
    closeMenu();

    let html;
    current = null;
    if (!key) {
      html = renderHome();
      document.title = 'Wiki Shox';
    } else if (/^cat[ée]gorie:/i.test(key)) {
      const name = key.replace(/^cat[ée]gorie:/i, '');
      html = renderCategory(name);
      document.title = `Catégorie : ${name} — Wiki Shox`;
    } else {
      const e = findEntry(key);
      if (e) {
        current = e.slug;
        html = renderArticle(e);
        document.title = `${e.titre} — Wiki Shox`;
      } else {
        html = renderMissing(key);
        document.title = `${key} — Wiki Shox`;
      }
    }
    page.innerHTML = html;
    hydrate(page);
    markActive();
    main.scrollTop = restoring ? scrolls.get(key) : 0;
  }

  // clics dans la page : sommaire, notes, liens rouges, petites blagues
  page.addEventListener('click', (ev) => {
    const t = ev.target;
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
    const miss = t.closest('[data-missing]');
    if (miss) { createPage(miss.dataset.missing); return; }
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
  renderList();
  route();

  // petit accès pour les tests
  window.WikiShox = { entries: ENTRIES, go, findEntry };
})();
