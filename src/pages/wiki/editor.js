// Wiki Shox — modifier comme sur Wikipédia (en mieux) : éditeur avec aperçu en direct, historique,
// comparaison de versions, restauration, conflits, création de page, modifications récentes.
// Tout le texte saisi est du wikitexte (wikitext.js) : jamais de HTML.
(function () {
  'use strict';

  const WT = window.WikiText;
  const Cloud = window.WikiCloud;
  let A = null; // API de app.js (window.WikiShox)

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = WT.esc;
  const snd = (n) => { try { FX.sound(n); } catch {} };
  const toast = (t) => { try { FX.toast(t); } catch {} };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const PAGE_MAX = 30000;
  const PHOTO_MAX = 4 * 1024 * 1024;
  const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const ERRORS = {
    offline: 'Pas de connexion : impossible de publier. Ton texte est gardé en brouillon sur cet ordinateur, rien n\'est perdu.',
    http: 'Le serveur du wiki a répondu de travers. Réessaie dans un instant (ton brouillon est gardé).',
    format: 'Réponse illisible du serveur du wiki. Réessaie dans un instant (ton brouillon est gardé).',
    'trop-long': `Page trop longue : ${PAGE_MAX.toLocaleString('fr-FR')} caractères au maximum.`,
    'trop-vite': 'Doucement ! Trop de publications d\'un coup : attends une minute.',
    'trop-lourd': 'Photo trop lourde (4 Mo au maximum).',
    type: 'Format de photo refusé (JPEG, PNG, WebP ou GIF).',
    titre: 'Le titre ne peut pas être vide.',
    pseudo: 'Choisis un pseudo d\'au moins 2 caractères.',
    slug: 'Adresse de page invalide.',
    refus: 'Action refusée par Fire Shox.',
    absent: 'Les modifications ne sont possibles que dans le navigateur Fire Shox.',
  };
  const errText = (code) => ERRORS[code] || ERRORS.offline;

  // ------------------------------------------------------------------ dates
  function ago(t) {
    if (!t) return '';
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 45) return 'à l\'instant';
    if (s < 3600) return `il y a ${Math.max(1, Math.round(s / 60))} min`;
    if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
    const d = Math.round(s / 86400);
    if (d === 1) return 'hier';
    if (d < 30) return `il y a ${d} jours`;
    return 'le ' + new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  const fmtDate = (t) => (t ? new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
  const fmtTime = (t) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const n = (x) => Number(x || 0).toLocaleString('fr-FR');

  // ------------------------------------------------------------------ fenêtres modales
  function modal({ title, body, actions, wide = false, onMount, validate }) {
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'md-ov';
      ov.innerHTML = `<div class="md${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">` +
        `<div class="md-h"><h2>${esc(title)}</h2><button type="button" class="md-x" data-md="cancel" aria-label="Fermer">×</button></div>` +
        `<div class="md-b">${body}</div>` +
        `<div class="md-f">${actions.map((a) => `<button type="button" class="fs-btn${a.fire ? ' fire' : ''}" data-md="${esc(a.id)}">${esc(a.label)}</button>`).join('')}</div></div>`;
      document.body.appendChild(ov);
      const prevFocus = document.activeElement;
      const done = (id) => {
        document.removeEventListener('keydown', key, true);
        resolve({ id, root: ov });
        ov.classList.add('out');
        setTimeout(() => { ov.remove(); if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch {} }, 180);
      };
      ov.addEventListener('click', (e) => {
        const b = e.target.closest('[data-md]');
        if (b) {
          if (b.dataset.md !== 'cancel' && validate && !validate(ov, b.dataset.md)) { snd('error'); return; }
          snd('click');
          done(b.dataset.md);
        } else if (e.target === ov) done('cancel');
      });
      const key = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); done('cancel'); }
        else if (e.key === 'Enter' && e.target.matches && e.target.matches('.md input')) { e.preventDefault(); const f = ov.querySelector('.md-f .fs-btn.fire'); if (f) f.click(); }
      };
      document.addEventListener('keydown', key, true);
      if (onMount) onMount(ov);
      const first = ov.querySelector('.md-b input, .md-f .fs-btn.fire');
      if (first) setTimeout(() => first.focus(), 30);
    });
  }

  // ------------------------------------------------------------------ pseudo
  async function ensurePseudo(force) {
    const cur = Cloud.pseudo.get();
    if (cur && !force) return cur;
    const r = await modal({
      title: force ? 'Changer de pseudo' : 'Choisis ton pseudo',
      body: '<p class="md-p">Il apparaîtra à côté de chacune de tes modifications, dans l\'historique visible par <b>tous</b> les possesseurs de Fire Shox.</p>' +
        `<label class="ed-field"><span>Pseudo</span><input id="md-pseudo" maxlength="32" autocomplete="off" spellcheck="false" placeholder="Ex. : Le Grand Archiviste" value="${esc(cur)}"></label>`,
      actions: [{ id: 'cancel', label: 'Annuler' }, { id: 'ok', label: 'Valider', fire: true }],
      validate: (root) => $('#md-pseudo', root).value.replace(/\s+/g, ' ').trim().length >= 2,
    });
    if (r.id !== 'ok') return '';
    Cloud.pseudo.set($('#md-pseudo', r.root).value);
    const p = Cloud.pseudo.get();
    const el = $('#ed-pseudo');
    if (el) el.textContent = p;
    return p;
  }

  // ------------------------------------------------------------------ photos (réduction + envoi)
  async function prepareImage(file) {
    if (!file || !TYPES.includes(file.type)) throw new Error('Format refusé : JPEG, PNG, WebP ou GIF seulement.');
    if (file.size > 40 * 1024 * 1024) throw new Error('Fichier beaucoup trop lourd.');
    if (file.type === 'image/gif' && file.size <= PHOTO_MAX) return { type: 'image/gif', bytes: new Uint8Array(await file.arrayBuffer()) };
    let bmp;
    try { bmp = await createImageBitmap(file); } catch { throw new Error('Cette image est illisible.'); }
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#121017';
    g.fillRect(0, 0, w, h);
    g.drawImage(bmp, 0, 0, w, h);
    try { bmp.close(); } catch {}
    for (const q of [0.85, 0.72, 0.6]) {
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
      if (blob && blob.size <= PHOTO_MAX) return { type: 'image/jpeg', bytes: new Uint8Array(await blob.arrayBuffer()) };
    }
    throw new Error('Image trop lourde, même réduite.');
  }
  function pickFiles(multiple) {
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = TYPES.join(',');
      inp.multiple = !!multiple;
      inp.style.display = 'none';
      inp.addEventListener('change', () => { resolve([...inp.files]); inp.remove(); });
      document.body.appendChild(inp);
      inp.click();
    });
  }
  // Envoie des fichiers, renvoie les adresses obtenues (dans l'ordre), en affichant la progression.
  async function uploadFiles(files) {
    const urls = [];
    files = files.slice(0, 12);
    for (let i = 0; i < files.length; i++) {
      setState(`Envoi de la photo${files.length > 1 ? ` ${i + 1}/${files.length}` : ''}…`, 'busy');
      try {
        const img = await prepareImage(files[i]);
        const r = await Cloud.upload(img.type, img.bytes);
        if (!r.ok) throw new Error(r.error === 'offline' ? 'Pas de connexion : impossible d\'envoyer la photo.' : errText(r.error));
        urls.push(r.url);
      } catch (err) {
        snd('error');
        setState(err.message || 'Envoi impossible.', 'bad');
        toast(err.message || 'Envoi impossible.');
        return urls;
      }
    }
    if (urls.length) { snd('pop'); setState(urls.length > 1 ? `${urls.length} photos envoyées` : 'Photo envoyée', 'ok'); }
    return urls;
  }

  // =================================================================== ÉDITEUR
  let ed = null; // { slug, base, data, original, summary, section, busy }
  let prevTimer = 0, draftTimer = 0;

  function normData(d, slug) {
    d = d || {};
    return {
      titre: String(d.titre || ''),
      chapeau: String(d.chapeau || ''),
      resume: String(d.resume || ''),
      photo: WT.safeImage(d.photo || '', slug) ? String(d.photo) : '',
      legende: String(d.legende || ''),
      cadrage: /^\d{1,3}% \d{1,3}%$/.test(d.cadrage || '') ? d.cadrage : '',
      ebauche: !!d.ebauche,
      statut: d.statut === 'enrichissement' ? 'enrichissement' : '',
      infobox: (Array.isArray(d.infobox) ? d.infobox : []).map((r) => [String(r[0] || ''), String(r[1] || '')]),
      sections: (Array.isArray(d.sections) ? d.sections : []).map((s) => [String(s[0] || ''), String(s[1] || ''), s[2] === 3 ? 3 : 2]),
      galerie: (Array.isArray(d.galerie) ? d.galerie : []).map((g) => [String(g[0] || ''), String(g[1] || '')]).filter((g) => WT.safeImage(g[0], slug)),
      voirAussi: (Array.isArray(d.voirAussi) ? d.voirAussi : []).filter((x) => WT.SLUG_RE.test(x)),
      categories: (Array.isArray(d.categories) ? d.categories : []).map(String).filter(Boolean),
    };
  }
  // Ce qui part en ligne : lignes et sections vides retirées, espaces superflus nettoyés.
  function publishable(d) {
    const x = clone(d);
    x.titre = x.titre.replace(/\s+/g, ' ').trim();
    x.infobox = x.infobox.filter((r) => r[0].replace(/^#\s*$/, '').trim() || r[1].trim()).map((r) => [r[0].trim(), r[1].trim()]);
    x.sections = x.sections.filter((s) => s[0].trim() || s[1].trim()).map((s) => [s[0].trim(), s[1].replace(/\s+$/, ''), s[2]]);
    x.resume = x.resume.replace(/\s+$/, '');
    x.categories = [...new Set(x.categories.map((c) => c.trim()).filter(Boolean))];
    return x;
  }
  const sizeOf = (d) => JSON.stringify(d).length;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function openEditor(rest) {
    const [rawSlug, section] = rest.split(':');
    const slug = rawSlug || '';
    const e = A.findEntry(slug);
    if (!e) { notFound(slug); return { title: 'Page introuvable' }; }
    if (!Cloud.available) {
      A.page.innerHTML = `<article class="view">${headHtml(e, 'modifier')}<div class="ed-notice bad"><b>Modification impossible ici.</b> ${esc(ERRORS.absent)}</div></article>`;
      return { title: 'Modifier ' + e.titre, current: e.slug };
    }
    const online = Cloud.page(e.slug);
    const base = online ? online.revision : 0;
    const original = normData(A.dataOf(e.slug), e.slug);
    const draft = Cloud.drafts.get(e.slug);
    ed = { slug: e.slug, base, data: clone(original), original, summary: '', section: section || '', busy: false, draft: null };
    if (draft && draft.data) {
      ed.data = normData(draft.data, e.slug);
      ed.summary = String(draft.summary || '');
      ed.base = Number.isInteger(draft.base) ? draft.base : base;
      ed.draft = { at: draft.at, stale: ed.base !== base };
    }
    renderEditor();
    return { title: 'Modifier ' + e.titre, current: e.slug };
  }

  function headHtml(e, active) {
    const s = encodeURIComponent(e.slug);
    return `<div class="title-row"><h1>${esc(e.titre)}</h1></div>` +
      `<nav class="tabs"><div><a class="tab on" href="#${s}">Article</a></div><div><a class="tab${active === 'lire' ? ' on' : ''}" href="#${s}">Lire</a><a class="tab${active === 'modifier' ? ' on' : ''}" href="#modifier:${s}">Modifier</a><a class="tab${active === 'historique' ? ' on' : ''}" href="#historique:${s}">Voir l'historique</a></div></nav>`;
  }

  const TOOLS = '<div class="ed-tools" role="toolbar">' +
    '<button type="button" data-tool="b" title="Gras (Ctrl+B)"><b>G</b></button>' +
    '<button type="button" data-tool="i" title="Italique (Ctrl+I)"><i>I</i></button>' +
    '<span class="sep"></span>' +
    '<button type="button" data-tool="link" title="Lien vers une page du wiki">[[ ]]</button>' +
    '<button type="button" data-tool="ext" title="Lien vers un site">🔗</button>' +
    '<button type="button" data-tool="ref" title="[réf. nécessaire]">réf.</button>' +
    '<button type="button" data-tool="note" title="Note numérotée">note</button>' +
    '<span class="sep"></span>' +
    '<button type="button" data-tool="h" title="Intertitre">T</button>' +
    '<button type="button" data-tool="list" title="Liste à puces">•</button>' +
    '<button type="button" data-tool="quote" title="Citation">❝</button>' +
    '<button type="button" data-tool="img" title="Insérer une photo">📷</button>' +
    '<button type="button" class="help" data-tool="help" title="Aide sur la mise en forme">?</button>' +
    '</div>';

  const HELP = '<div class="ed-help" hidden><table>' +
    '<tr><td><code>**gras**</code></td><td><b>gras</b></td><td><code>\'\'italique\'\'</code></td><td><i>italique</i></td></tr>' +
    '<tr><td><code>[[le-y|Le Y]]</code></td><td>lien vers une page</td><td><code>[https://site.fr texte]</code></td><td>lien vers un site</td></tr>' +
    '<tr><td><code>{{réf}}</code></td><td>[réf. nécessaire]</td><td><code>{{note|texte}}</code></td><td>note numérotée</td></tr>' +
    '<tr><td><code>== Titre ==</code></td><td>intertitre</td><td><code>* élément</code></td><td>liste</td></tr>' +
    '<tr><td><code>&gt; phrase — Auteur</code></td><td>citation</td><td><code>[[Image:adresse|légende]]</code></td><td>photo (bouton 📷)</td></tr>' +
    '</table><p>Ligne vide = nouveau paragraphe. Le HTML n\'est pas accepté : il s\'affiche tel quel.</p></div>';

  function renderEditor() {
    const d = ed.data;
    const etat = d.ebauche ? 'ebauche' : d.statut === 'enrichissement' ? 'enrichissement' : 'complet';
    const cad = d.cadrage;
    const cadOpts = [['', 'Image entière'], ['50% 50%', 'Recadrée au centre'], ['50% 20%', 'Recadrée vers le haut'], ['50% 80%', 'Recadrée vers le bas']];
    if (cad && !cadOpts.some((o) => o[0] === cad)) cadOpts.push([cad, `Recadrage personnalisé (${cad})`]);
    const s = encodeURIComponent(ed.slug);
    A.page.innerHTML = `<div class="view editor" id="editor">` +
      `<div class="ed-top"><div class="ed-titles"><div class="ed-kicker">${ed.base ? `Modification de la révision ${ed.base}` : 'Première modification en ligne'} · <a href="#historique:${s}">historique</a></div>` +
      `<h1>Modifier « <span id="ed-h1">${esc(d.titre || ed.slug)}</span> »</h1></div>` +
      '<div class="ed-seg" role="tablist"><button type="button" data-mode="edit" class="on">✎ Écrire</button><button type="button" data-mode="preview">👁 Aperçu</button></div></div>' +
      '<div id="ed-notices"></div>' +
      '<div class="ed-grid"><div class="ed-form" id="ed-form">' +
        // Généralités
        '<section class="ed-card" data-card="general"><h2>Généralités</h2>' +
          `<label class="ed-field"><span>Titre de la page</span><input data-k="titre" maxlength="120" value="${esc(d.titre)}"></label>` +
          '<div class="ed-row2">' +
            `<label class="ed-field"><span>État de l'article</span><select data-k="etat"><option value="ebauche"${etat === 'ebauche' ? ' selected' : ''}>Ébauche (bandeau « archives en attente »)</option><option value="enrichissement"${etat === 'enrichissement' ? ' selected' : ''}>En cours d'enrichissement</option><option value="complet"${etat === 'complet' ? ' selected' : ''}>Article complet</option></select></label>` +
            `<label class="ed-field"><span>Note d'homonymie <small>(facultatif)</small></span><input data-k="chapeau" maxlength="400" placeholder="Ne doit pas être confondu avec [[la-pomme]]." value="${esc(d.chapeau)}"></label>` +
          '</div></section>' +
        // Résumé
        `<section class="ed-card" data-card="resume"><h2>Résumé <small>introduction de l'article</small></h2>${TOOLS}${HELP}<textarea data-k="resume" rows="6" spellcheck="true" placeholder="Une ou deux phrases qui présentent le sujet. Ex. : **${esc(d.titre || 'Le sujet')}** est…">${esc(d.resume)}</textarea></section>` +
        // Photo
        '<section class="ed-card" data-card="photo"><h2>Photo principale <small>en haut de l\'infobox</small></h2><div class="ed-photo">' +
          '<div class="ed-photo-prev" id="ed-photo-prev"></div>' +
          '<div class="ed-photo-side">' +
            '<div class="ed-btns"><button type="button" class="fs-btn" data-act="photo-pick">📷 Choisir une photo…</button><button type="button" class="fs-btn ghost" data-act="photo-clear">Retirer</button></div>' +
            '<div class="ed-hint">Ou glisse une image ici. JPEG, PNG, WebP ou GIF, réduite à 1 600 px (4 Mo max). <b>Les photos envoyées sont publiques.</b></div>' +
            `<label class="ed-field"><span>Légende</span><input data-k="legende" maxlength="400" value="${esc(d.legende)}" placeholder="Ce qu'on voit sur la photo"></label>` +
            `<label class="ed-field"><span>Cadrage dans l'infobox</span><select data-k="cadrage">${cadOpts.map((o) => `<option value="${esc(o[0])}"${o[0] === cad ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>` +
          '</div></div></section>' +
        // Infobox
        '<section class="ed-card" data-card="infobox"><h2>Infobox <small>la fiche à droite de l\'article</small></h2><div class="ed-ib" id="ed-ib"></div>' +
          '<div class="ed-btns"><button type="button" class="fs-btn small" data-act="ib-add">+ Ligne</button><button type="button" class="fs-btn small ghost" data-act="ib-sub">+ Sous-titre</button></div></section>' +
        // Sections
        '<section class="ed-card" data-card="sections"><h2>Sections</h2><div id="ed-secs"></div>' +
          '<div class="ed-btns"><button type="button" class="fs-btn small" data-act="sec-add">+ Ajouter une section</button></div></section>' +
        // Galerie
        '<section class="ed-card" data-card="galerie" id="ed-card-galerie"><h2>Galerie</h2><div class="ed-gal" id="ed-gal"></div></section>' +
        // Voir aussi, catégories
        '<section class="ed-card" data-card="voir" id="ed-card-voir"><h2>Voir aussi <small>liens en bas de page</small></h2><div class="ed-chips" id="ed-voir"></div></section>' +
        '<section class="ed-card" data-card="cats"><h2>Catégories</h2><div class="ed-chips" id="ed-cats"></div></section>' +
      '</div>' +
      '<aside class="ed-preview"><div class="ed-prev-h"><span><i class="live"></i>Aperçu en direct</span><span class="ed-size" id="ed-size"></span></div><div class="ed-prev-body" id="ed-prev"></div></aside></div>' +
      // Barre du bas
      '<div class="ed-bar"><div class="ed-bar-in">' +
        `<label class="ed-sum"><span>Résumé de la modification</span><input id="ed-summary" maxlength="200" placeholder="Ex. : ajout de la photo du lancer" value="${esc(ed.summary)}"></label>` +
        '<div class="ed-bar-r">' +
          `<div class="ed-who">Pseudo : <b id="ed-pseudo">${esc(Cloud.pseudo.get() || '(à choisir)')}</b> · <button type="button" data-act="pseudo">changer</button></div>` +
          '<div class="ed-state" id="ed-state" aria-live="polite"></div>' +
          '<div class="ed-actions"><button type="button" class="fs-btn" data-act="cancel">Annuler</button>' +
          '<button type="button" class="fs-btn fire" data-act="publish" id="ed-publish">Publier les modifications</button></div>' +
        '</div></div></div>' +
      '</div>';
    paintPhoto();
    paintInfobox();
    paintSections();
    paintGallery();
    paintChips();
    paintNotices();
    preview(true);
    setState(ed.draft ? 'Brouillon repris' : '', ed.draft ? 'ok' : '');
    bindEditor();
    // Section demandée (bouton « modifier » d'une section)
    requestAnimationFrame(() => {
      let target = null;
      if (/^\d+$/.test(ed.section)) target = $(`#ed-sec-${ed.section}`);
      else if (ed.section === 'galerie') target = $('#ed-card-galerie');
      else if (ed.section === 'voir') target = $('#ed-card-voir');
      if (target) {
        A.scrollToEl(target);
        const ta = target.querySelector('textarea');
        if (ta) ta.focus({ preventScroll: true });
      } else $('[data-k="titre"]').focus({ preventScroll: true });
    });
  }

  function paintNotices() {
    const box = $('#ed-notices');
    if (!box || !ed) return;
    let h = '';
    if (Cloud.state.online === false) h += '<div class="ed-notice bad"><b>Hors ligne.</b> Tu peux continuer à écrire (brouillon gardé sur cet ordinateur), mais la publication est impossible pour l\'instant.</div>';
    if (ed.draft) {
      h += `<div class="ed-notice draft"><span>📝 <b>Brouillon non publié repris</b> (enregistré ${esc(ago(ed.draft.at))}).${ed.draft.stale ? ' <b>La page a changé en ligne depuis :</b> à la publication, tu choisiras quelle version garder.' : ''}</span><button type="button" class="fs-btn small ghost" data-act="draft-drop">Repartir de la version en ligne</button></div>`;
    }
    const online = Cloud.page(ed.slug);
    if (online && online.revision > ed.base && !ed.draft) {
      h += `<div class="ed-notice warn">⚠ <b>${esc(online.author)}</b> vient de publier une nouvelle version de cette page (${esc(ago(online.modified))}). Tu pourras choisir quelle version garder en publiant.</div>`;
    }
    box.innerHTML = h;
  }

  function paintPhoto() {
    const d = ed.data;
    const src = WT.safeImage(d.photo, ed.slug);
    $('#ed-photo-prev').innerHTML = A.imgBox(src, { cls: 'ratio-45', mono: '📷', label: src ? 'Photo' : 'Pas de photo', small: true, natural: false, zoom: false, position: d.cadrage || '50% 30%' }) +
      (src ? `<code class="ed-url" title="${esc(src)}">${esc(src.replace(/^https:\/\//, ''))}</code>` : '');
    A.hydrate($('#ed-photo-prev'));
  }

  function mini(i, len, horiz) {
    return `<div class="ed-mini"><button type="button" data-move="-1" data-i="${i}" title="${horiz ? 'Vers la gauche' : 'Monter'}"${i === 0 ? ' disabled' : ''}>${horiz ? '←' : '↑'}</button>` +
      `<button type="button" data-move="1" data-i="${i}" title="${horiz ? 'Vers la droite' : 'Descendre'}"${i === len - 1 ? ' disabled' : ''}>${horiz ? '→' : '↓'}</button>` +
      `<button type="button" data-del="${i}" title="Supprimer" class="del">×</button></div>`;
  }

  function paintInfobox() {
    const rows = ed.data.infobox;
    $('#ed-ib').innerHTML = rows.length ? rows.map((r, i) => {
      const sub = r[0].startsWith('#');
      return `<div class="ed-ib-row${sub ? ' sub' : ''}" data-list="infobox">` +
        (sub
          ? `<input class="lab" data-ib="${i}" data-col="0" maxlength="80" placeholder="Sous-titre" value="${esc(r[0].replace(/^#\s*/, ''))}">`
          : `<input class="lab" data-ib="${i}" data-col="0" maxlength="80" placeholder="Libellé" value="${esc(r[0])}"><input class="val" data-ib="${i}" data-col="1" maxlength="800" placeholder="Valeur" value="${esc(r[1])}">`) +
        mini(i, rows.length) + '</div>';
    }).join('') : '<div class="ed-empty">Aucune ligne. Ajoute « Surnom », « Spécialité »…</div>';
  }

  function paintSections() {
    const secs = ed.data.sections;
    $('#ed-secs').innerHTML = secs.length ? secs.map((s, i) => `<div class="ed-sec${s[2] === 3 ? ' sub' : ''}" id="ed-sec-${i}" data-list="sections">` +
      `<div class="ed-sec-h"><span class="num">${i + 1}</span><input data-sec="${i}" data-f="0" maxlength="150" placeholder="Titre de la section" value="${esc(s[0])}">` +
      `<select data-sec="${i}" data-f="2" title="Niveau"><option value="2"${s[2] !== 3 ? ' selected' : ''}>Section</option><option value="3"${s[2] === 3 ? ' selected' : ''}>Sous-section</option></select>${mini(i, secs.length)}</div>` +
      `${TOOLS}<textarea data-sec="${i}" data-f="1" rows="${Math.min(14, Math.max(4, s[1].split('\n').length + 1))}" spellcheck="true" placeholder="Texte de la section (laisse vide : « section à compléter »)">${esc(s[1])}</textarea></div>`).join('')
      : '<div class="ed-empty">Aucune section.</div>';
  }

  function paintGallery() {
    const g = ed.data.galerie;
    $('#ed-gal').innerHTML = g.map((x, i) => `<div class="ed-gal-item" data-list="galerie">` +
      `<div class="ed-gal-img">${A.imgBox(WT.safeImage(x[0], ed.slug), { cls: 'ratio-1', mono: '📷', label: 'Photo à venir', small: true, zoom: false })}</div>` +
      `<input data-gal="${i}" maxlength="400" placeholder="Légende" value="${esc(x[1])}">${mini(i, g.length, true)}</div>`).join('') +
      '<button type="button" class="ed-gal-add" data-act="gal-add"><span>＋</span>Ajouter des photos<small>ou glisse-les ici</small></button>';
    A.hydrate($('#ed-gal'));
  }

  function paintChips() {
    const d = ed.data;
    const voir = d.voirAussi.map((slug) => { const x = A.findEntry(slug); return x ? x : { slug, titre: slug }; });
    const avail = A.entries.filter((x) => x.slug !== ed.slug && !d.voirAussi.includes(x.slug));
    $('#ed-voir').innerHTML = voir.map((x, i) => `<span class="chip">${esc(x.titre)}<button type="button" data-chip="voir" data-i="${i}" title="Retirer">×</button></span>`).join('') +
      `<select data-act="voir-add" class="chip-add"><option value="">+ Ajouter un lien…</option>${avail.map((x) => `<option value="${esc(x.slug)}">${esc(x.titre)}</option>`).join('')}</select>`;
    $('#ed-cats').innerHTML = d.categories.map((c, i) => `<span class="chip">${esc(c)}<button type="button" data-chip="cats" data-i="${i}" title="Retirer">×</button></span>`).join('') +
      '<input class="chip-in" id="ed-cat-in" maxlength="60" placeholder="+ Catégorie (Entrée)">';
  }

  // ------------------------------------------------------------------ interactions
  function bindEditor() {
    const root = $('#editor');
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    for (const card of $$('[data-card="photo"], [data-card="galerie"]', root)) {
      card.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); card.classList.add('drop'); } });
      card.addEventListener('dragleave', () => card.classList.remove('drop'));
      card.addEventListener('drop', async (e) => {
        e.preventDefault();
        card.classList.remove('drop');
        const files = [...e.dataTransfer.files].filter((f) => TYPES.includes(f.type));
        if (!files.length) { toast('Glisse une image JPEG, PNG, WebP ou GIF.'); return; }
        if (card.dataset.card === 'photo') setPhotoFiles(files.slice(0, 1)); else addGalleryFiles(files);
      });
    }
  }

  function onInput(e) {
    const t = e.target;
    const d = ed.data;
    if (t.id === 'ed-summary') { ed.summary = t.value; schedule(false); return; }
    if (t.dataset.k && t.tagName !== 'SELECT') {
      d[t.dataset.k] = t.value;
      if (t.dataset.k === 'titre') $('#ed-h1').textContent = t.value || ed.slug;
    } else if (t.dataset.ib !== undefined) {
      const r = d.infobox[+t.dataset.ib];
      if (!r) return;
      if (r[0].startsWith('#')) r[0] = '# ' + t.value; else r[+t.dataset.col] = t.value;
    } else if (t.dataset.sec !== undefined && t.dataset.f !== '2') {
      const s = d.sections[+t.dataset.sec];
      if (s) s[+t.dataset.f] = t.value;
      if (t.tagName === 'TEXTAREA') autoGrow(t);
    } else if (t.dataset.gal !== undefined) {
      const g = d.galerie[+t.dataset.gal];
      if (g) g[1] = t.value;
    } else return;
    schedule(true);
  }

  function onChange(e) {
    const t = e.target;
    const d = ed.data;
    if (t.dataset.k === 'etat') {
      d.ebauche = t.value === 'ebauche';
      d.statut = t.value === 'enrichissement' ? 'enrichissement' : '';
    } else if (t.dataset.k === 'cadrage') {
      d.cadrage = t.value;
      paintPhoto();
    } else if (t.dataset.sec !== undefined && t.dataset.f === '2') {
      const s = d.sections[+t.dataset.sec];
      if (s) s[2] = t.value === '3' ? 3 : 2;
      t.closest('.ed-sec').classList.toggle('sub', t.value === '3');
    } else if (t.dataset.act === 'voir-add') {
      if (t.value && !d.voirAussi.includes(t.value)) d.voirAussi.push(t.value);
      paintChips();
    } else return;
    schedule(true);
  }

  function onKey(e) {
    if (e.target.id === 'ed-cat-in' && e.key === 'Enter') {
      e.preventDefault();
      const v = e.target.value.replace(/\s+/g, ' ').trim().slice(0, 60);
      if (v && !ed.data.categories.includes(v) && ed.data.categories.length < 20) { ed.data.categories.push(v); paintChips(); schedule(true); $('#ed-cat-in').focus(); }
      return;
    }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && !e.altKey && e.code === 'KeyS') { e.preventDefault(); publish(); return; }
    if (mod && e.target.tagName === 'TEXTAREA' && (e.code === 'KeyB' || e.code === 'KeyI')) {
      e.preventDefault();
      e.stopPropagation();
      tool(e.target, e.code === 'KeyB' ? 'b' : 'i');
    }
  }

  async function onClick(e) {
    const t = e.target;
    const d = ed.data;
    const mode = t.closest('[data-mode]');
    if (mode) {
      $('#editor').classList.toggle('show-preview', mode.dataset.mode === 'preview');
      $$('.ed-seg [data-mode]').forEach((b) => b.classList.toggle('on', b === mode));
      if (mode.dataset.mode === 'preview') preview(true);
      snd('tick');
      return;
    }
    const tb = t.closest('[data-tool]');
    if (tb) {
      const bar = tb.closest('.ed-tools');
      if (tb.dataset.tool === 'help') { const h = bar.nextElementSibling; if (h && h.classList.contains('ed-help')) h.hidden = !h.hidden; snd('tick'); return; }
      let ta = bar.nextElementSibling;
      while (ta && ta.tagName !== 'TEXTAREA') ta = ta.nextElementSibling;
      if (ta) tool(ta, tb.dataset.tool);
      return;
    }
    const mv = t.closest('[data-move]');
    const del = t.closest('[data-del]');
    if (mv || del) {
      const box = (mv || del).closest('[data-list]');
      const listName = box && box.dataset.list;
      const arr = d[listName];
      if (!arr) return;
      const i = +(mv || del).dataset.i;
      if (del) {
        const label = listName === 'sections' ? `la section « ${arr[i][0] || 'sans titre'} »` : listName === 'galerie' ? 'cette photo' : 'cette ligne';
        if (listName === 'sections' && arr[i][1].trim()) {
          const r = await modal({ title: 'Supprimer la section ?', body: `<p class="md-p">Supprimer ${esc(label)} et son texte ? (Tu peux toujours annuler en ne publiant pas.)</p>`, actions: [{ id: 'cancel', label: 'Garder' }, { id: 'ok', label: 'Supprimer', fire: true }] });
          if (r.id !== 'ok') return;
        }
        arr.splice(i, 1);
      } else {
        const j = i + +mv.dataset.move;
        if (j < 0 || j >= arr.length) return;
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      snd('tick');
      if (listName === 'infobox') paintInfobox();
      if (listName === 'sections') paintSections();
      if (listName === 'galerie') paintGallery();
      schedule(true);
      return;
    }
    const chip = t.closest('[data-chip]');
    if (chip) {
      (chip.dataset.chip === 'voir' ? d.voirAussi : d.categories).splice(+chip.dataset.i, 1);
      paintChips(); schedule(true); snd('tick');
      return;
    }
    const act = t.closest('[data-act]');
    if (!act || act.tagName === 'SELECT') return;
    switch (act.dataset.act) {
      case 'ib-add': d.infobox.push(['', '']); paintInfobox(); focusLast('#ed-ib .lab'); schedule(true); break;
      case 'ib-sub': d.infobox.push(['# ', '']); paintInfobox(); focusLast('#ed-ib .lab'); schedule(true); break;
      case 'sec-add': d.sections.push(['', '', 2]); paintSections(); focusLast('#ed-secs .ed-sec-h input'); schedule(true); break;
      case 'gal-add': addGalleryFiles(await pickFiles(true)); break;
      case 'photo-pick': setPhotoFiles(await pickFiles(false)); break;
      case 'photo-clear': d.photo = ''; paintPhoto(); schedule(true); break;
      case 'pseudo': ensurePseudo(true); break;
      case 'cancel': cancel(); break;
      case 'publish': publish(); break;
      case 'draft-drop': {
        const r = await modal({ title: 'Repartir de la version en ligne ?', body: '<p class="md-p">Ton brouillon non publié sera effacé de cet ordinateur.</p>', actions: [{ id: 'cancel', label: 'Garder le brouillon' }, { id: 'ok', label: 'Effacer le brouillon', fire: true }] });
        if (r.id !== 'ok') return;
        Cloud.drafts.remove(ed.slug);
        const online = Cloud.page(ed.slug);
        ed.base = online ? online.revision : 0;
        ed.original = normData(A.dataOf(ed.slug), ed.slug);
        ed.data = clone(ed.original);
        ed.summary = '';
        ed.draft = null;
        renderEditor();
        break;
      }
      default:
    }
  }

  function focusLast(sel) { const l = $$(sel); const x = l[l.length - 1]; if (x) { x.focus(); x.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
  function autoGrow(ta) { const rows = Math.min(24, Math.max(4, ta.value.split('\n').length + 1)); if (rows > ta.rows) ta.rows = rows; }

  async function setPhotoFiles(files) {
    if (!files || !files.length) return;
    const [url] = await uploadFiles(files.slice(0, 1));
    if (!url || !ed) return;
    ed.data.photo = url;
    paintPhoto();
    schedule(true);
  }
  async function addGalleryFiles(files) {
    if (!files || !files.length) return;
    const urls = await uploadFiles(files);
    if (!ed) return;
    for (const u of urls) ed.data.galerie.push([u, '']);
    if (urls.length) { paintGallery(); schedule(true); }
  }

  // Boutons de mise en forme
  async function tool(ta, kind) {
    const wrap = (before, after, ph) => {
      const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
      const sel = v.slice(s, e) || ph;
      ta.value = v.slice(0, s) + before + sel + after + v.slice(e);
      ta.setSelectionRange(s + before.length, s + before.length + sel.length);
      ta.focus();
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const linePrefix = (prefix, ph) => {
      const s = ta.selectionStart, v = ta.value;
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      const before = ls === s && v.slice(ls, ta.selectionEnd).length === 0 ? prefix + ph : prefix;
      ta.value = v.slice(0, ls) + before + v.slice(ls);
      const pos = ls + before.length;
      ta.setSelectionRange(before === prefix ? pos : ls + prefix.length, pos);
      ta.focus();
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    };
    switch (kind) {
      case 'b': wrap('**', '**', 'texte en gras'); break;
      case 'i': wrap("''", "''", 'texte en italique'); break;
      case 'link': wrap('[[', ']]', 'les-shoxs|LES SHOXS'); break;
      case 'ext': wrap('[https://exemple.fr ', ']', 'texte du lien'); break;
      case 'ref': wrap('', '{{réf}}', ''); break;
      case 'note': wrap('{{note|', '}}', 'texte de la note'); break;
      case 'h': wrap('\n== ', ' ==\n', 'Intertitre'); break;
      case 'list': linePrefix('* ', 'élément'); break;
      case 'quote': linePrefix('> ', 'Une phrase célèbre — Son auteur'); break;
      case 'img': {
        const keepS = ta.selectionStart;
        const [url] = await uploadFiles(await pickFiles(false));
        if (!url) return;
        ta.focus();
        ta.setSelectionRange(keepS, keepS);
        wrap(`\n[[Image:${url}|`, ']]\n', 'Légende de la photo');
        break;
      }
      default:
    }
    snd('tick');
  }

  // Aperçu + brouillon (différés pour rester fluide)
  function schedule(changed) {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 500);
    if (changed) { clearTimeout(prevTimer); prevTimer = setTimeout(() => preview(false), 280); }
  }
  function saveDraft() {
    clearTimeout(draftTimer);
    if (!ed) return;
    if (same(ed.data, ed.original) && !ed.summary.trim()) { Cloud.drafts.remove(ed.slug); setState('', ''); return; }
    Cloud.drafts.set(ed.slug, { base: ed.base, data: ed.data, summary: ed.summary });
    setState('Brouillon enregistré ✓', 'ok');
  }
  function preview(force) {
    clearTimeout(prevTimer);
    if (!ed) return;
    const box = $('#ed-prev');
    if (!box) return;
    if (!force && !box.offsetParent) return; // aperçu caché (petite fenêtre) : rien à faire
    const d = publishable(ed.data);
    const top = box.scrollTop;
    box.innerHTML = A.renderArticle(A.entryFromData(ed.slug, d, null), { preview: true });
    A.hydrate(box);
    box.scrollTop = top;
    const size = sizeOf(d);
    const el = $('#ed-size');
    el.textContent = `${n(size)} / ${n(PAGE_MAX)} caractères`;
    el.classList.toggle('warn', size > PAGE_MAX * 0.85);
    el.classList.toggle('bad', size > PAGE_MAX);
  }
  function setState(text, kind) {
    const el = $('#ed-state');
    if (!el) return;
    el.textContent = text;
    el.className = 'ed-state' + (kind ? ' ' + kind : '');
  }

  function cancel() {
    if (!ed) return;
    saveDraft();
    const kept = !!Cloud.drafts.get(ed.slug);
    const slug = ed.slug;
    if (kept) toast('Brouillon gardé : tu le retrouveras en cliquant sur « Modifier ».');
    A.go(slug);
  }

  async function publish(baseOverride) {
    if (!ed || ed.busy) return;
    const d = publishable(ed.data);
    if (!d.titre) { setState(ERRORS.titre, 'bad'); snd('error'); $('[data-k="titre"]').focus(); return; }
    if (sizeOf(d) > PAGE_MAX) { setState(ERRORS['trop-long'], 'bad'); snd('error'); return; }
    const author = await ensurePseudo(false);
    if (!author) { setState('Publication annulée : un pseudo est nécessaire.', 'bad'); return; }
    saveDraft();
    const slug = ed.slug;
    const btn = $('#ed-publish');
    ed.busy = true;
    btn.disabled = true;
    btn.textContent = 'Publication…';
    setState('Envoi au wiki partagé…', 'busy');
    const r = await Cloud.publish({ slug, base: baseOverride ?? ed.base, data: d, summary: ed.summary.trim(), author });
    if (!ed || ed.slug !== slug) return;
    ed.busy = false;
    btn.disabled = false;
    btn.textContent = 'Publier les modifications';
    if (r.ok) {
      Cloud.drafts.remove(slug);
      ed.original = clone(ed.data);
      ed = null;
      A.rebuild();
      A.renderList();
      snd('success');
      try { const b = btn.getBoundingClientRect(); FX.burst(b.left + b.width / 2, b.top, { count: 70 }); } catch {}
      toast('Modifications publiées : tout le monde les voit maintenant 🔥');
      A.go(slug);
      return;
    }
    if (r.conflict) { setState('Conflit de modification', 'bad'); snd('error'); conflict(r.current, d); return; }
    snd('error');
    setState(errText(r.error), 'bad');
    paintNotices();
    if (r.error === 'offline') toast('Pas de connexion : brouillon gardé, publication impossible.');
  }

  async function conflict(current, mine) {
    const theirs = current ? current.data : null;
    const body = current
      ? `<p class="md-p"><b>${esc(current.author)}</b> a publié la révision ${current.revision} ${esc(ago(current.modified))}, après que tu as commencé à écrire. ` +
        'Voici ce qui change entre <span class="lg del">sa version</span> et <span class="lg add">la tienne</span> :</p>' +
        `<div class="md-diff">${diffTable(WT.serialize(theirs), WT.serialize(mine), 2)}</div>` +
        '<p class="md-p small">« Garder la mienne » publie ta version par-dessus (la sienne reste dans l\'historique). « Prendre la sienne » abandonne ton brouillon.</p>'
      : '<p class="md-p">La page a changé en ligne. Tu peux publier ta version quand même.</p>';
    const r = await modal({
      title: 'Quelqu\'un a modifié cette page pendant que tu écrivais',
      body,
      wide: true,
      actions: [{ id: 'cancel', label: 'Revenir à l\'éditeur' }, { id: 'theirs', label: 'Prendre la sienne' }, { id: 'mine', label: 'Garder la mienne', fire: true }],
    });
    if (!ed) return;
    if (r.id === 'mine') { ed.base = current ? current.revision : 0; publish(ed.base); }
    else if (r.id === 'theirs') {
      Cloud.drafts.remove(ed.slug);
      const slug = ed.slug;
      ed = null;
      A.rebuild();
      A.renderList();
      toast('Version de l\'autre gardée. Ton brouillon a été abandonné.');
      A.go(slug);
    } else setState('Conflit non résolu : choisis une version en publiant à nouveau.', 'bad');
  }

  // =================================================================== DIFF
  function charMarks(a, b) {
    let p = 0;
    while (p < a.length && p < b.length && a[p] === b[p]) p++;
    let s = 0;
    while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
    const mk = (x) => esc(x.slice(0, p)) + (x.length - s > p ? `<mark>${esc(x.slice(p, x.length - s))}</mark>` : '') + esc(x.slice(x.length - s));
    return [mk(a), mk(b)];
  }
  // Tableau de différences ligne par ligne (rouge = retiré, vert = ajouté), contexte replié.
  function diffTable(oldText, newText, ctxLines = 3) {
    const ops = WT.diffLines(oldText, newText);
    // Paires « retiré puis ajouté » : on surligne les caractères qui changent
    const html = [];
    for (let i = 0; i < ops.length; i++) {
      const o = ops[i];
      if (o.t === '-' && ops[i + 1] && ops[i + 1].t === '+' && (i === 0 || ops[i - 1].t !== '-') && (!ops[i + 2] || ops[i + 2].t !== '+')) {
        const [a, b] = charMarks(o.text, ops[i + 1].text);
        o.html = a; ops[i + 1].html = b;
      }
    }
    const changed = ops.map((o) => o.t !== '=');
    const near = ops.map((_, i) => { for (let k = Math.max(0, i - ctxLines); k <= Math.min(ops.length - 1, i + ctxLines); k++) if (changed[k]) return true; return false; });
    let hidden = [];
    const flushHidden = () => {
      if (!hidden.length) return;
      html.push(`<tbody class="fold" data-fold><tr class="fold-row"><td colspan="4"><button type="button" class="fold-btn">⋯ ${hidden.length} ligne${hidden.length > 1 ? 's' : ''} identique${hidden.length > 1 ? 's' : ''} — afficher</button></td></tr></tbody><tbody class="folded" hidden>${hidden.join('')}</tbody>`);
      hidden = [];
    };
    let adds = 0, dels = 0;
    for (let i = 0; i < ops.length; i++) {
      const o = ops[i];
      const txt = o.html !== undefined ? o.html : esc(o.text);
      const row = `<tr class="${o.t === '+' ? 'add' : o.t === '-' ? 'del' : 'eq'}"><td class="ln">${o.a || ''}</td><td class="ln">${o.b || ''}</td><td class="mk">${o.t === '+' ? '+' : o.t === '-' ? '−' : ''}</td><td class="tx">${txt || '&nbsp;'}</td></tr>`;
      if (o.t === '+') adds++;
      if (o.t === '-') dels++;
      if (o.t === '=' && !near[i]) { hidden.push(row); continue; }
      flushHidden();
      html.push(`<tbody>${row}</tbody>`);
    }
    flushHidden();
    const none = !adds && !dels;
    return `<div class="diff-stats"><span class="add">+${adds} ligne${adds > 1 ? 's' : ''}</span><span class="del">−${dels} ligne${dels > 1 ? 's' : ''}</span>${none ? '<span class="same">Aucune différence</span>' : ''}</div>` +
      `<div class="diff-wrap"><table class="diff">${html.join('')}</table></div>`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.fold-btn');
    if (!b) return;
    const tb = b.closest('tbody');
    const next = tb.nextElementSibling;
    if (next) next.hidden = false;
    tb.remove();
  });

  // =================================================================== HISTORIQUE
  const histCache = new Map(); // slug → { at, list }
  async function loadVersions(slug, fresh) {
    const c = histCache.get(slug);
    if (c && !fresh && Date.now() - c.at < 30000) return c;
    const r = await Cloud.history(slug);
    let list = r.ok ? r.hist.slice() : [];
    // Hors ligne : au moins la dernière version connue
    if (!r.ok) { const p = Cloud.page(slug); if (p) list = [{ revision: p.revision, date: p.modified, author: p.author, summary: '', title: p.title, data: p.data, cached: true }]; }
    list.sort((a, b) => b.revision - a.revision);
    const trimmed = list.length && list[list.length - 1].revision > 1;
    if (A.hasDefault(slug)) list.push({ revision: 0, date: 0, author: 'Wiki Shox', summary: 'Version d\'origine, livrée avec Fire Shox', title: '', data: A.defaultData(slug), origin: true });
    for (const v of list) v.size = WT.serialize(v.data).length;
    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      const prev = list[i + 1];
      v.delta = prev ? v.size - prev.size : v.size;
      v.prev = prev ? prev.revision : null;
    }
    const out = { at: Date.now(), list, ok: !!r.ok, error: r.error, trimmed };
    histCache.set(slug, out);
    return out;
  }

  let token = 0; // une seule vue asynchrone à la fois
  function loading(e, active, text) {
    A.page.innerHTML = `<article class="view hist-view">${headHtml(e, active)}<div class="h-loading"><span class="spin"></span>${esc(text)}</div></article>`;
  }

  async function showHistory(rest) {
    const e = A.findEntry(rest);
    if (!e) { notFound(rest); return { title: 'Page introuvable' }; }
    const my = ++token;
    loading(e, 'historique', 'Chargement de l\'historique…');
    histCache.delete(e.slug);
    const h = await loadVersions(e.slug, true);
    if (my !== token) return {};
    const s = encodeURIComponent(e.slug);
    const curRev = h.list.length ? h.list[0].revision : 0;
    const rows = h.list.map((v) => {
      const cur = v.revision === curRev;
      const deltaCls = v.delta > 0 ? 'pos' : v.delta < 0 ? 'neg' : 'zero';
      const who = v.origin ? '<span class="h-who origin"><img src="/assets/logo-32.png" alt="">Wiki Shox</span>' : `<span class="h-who"><span class="av">${esc((v.author || '?')[0].toUpperCase())}</span>${esc(v.author)}</span>`;
      return `<li class="h-row${cur ? ' cur' : ''}${v.origin ? ' origin' : ''}">` +
        `<span class="h-links">(<a href="#version:${s}:${v.revision}">${cur ? 'actuelle' : 'voir'}</a> | ${v.prev !== null ? `<a href="#diff:${s}:${v.revision}">diff</a>` : '<span class="off">diff</span>'})</span>` +
        `<span class="h-date">${v.origin ? 'Origine' : esc(fmtDate(v.date))}</span>${who}` +
        `<span class="h-size">${n(v.size)} car.</span><span class="h-delta ${deltaCls}">${v.delta > 0 ? '+' : v.delta < 0 ? '−' : '±'}${n(Math.abs(v.delta))}</span>` +
        `<span class="h-sum">${v.summary ? esc(v.summary) : '<i>sans résumé</i>'}</span>` +
        (cur ? '<span class="h-badge">version actuelle</span>' : `<button type="button" class="h-restore" data-restore="${v.revision}">Restaurer</button>`) +
        '</li>';
    }).join('');
    A.page.innerHTML = `<article class="view hist-view">${headHtml(e, 'historique')}` +
      '<div class="tagline">Historique des versions de la page, partagé par tous les possesseurs de Fire Shox.</div>' +
      (h.ok ? '' : `<div class="ed-notice bad"><b>${h.error === 'offline' ? 'Pas de connexion' : 'Historique indisponible'}.</b> Seules les versions connues de cet ordinateur sont affichées.</div>`) +
      '<div class="h-legend">(actuelle) : version en ligne · (diff) : différences avec la version précédente · Restaurer : republie cette version (rien n\'est effacé)</div>' +
      `<ul class="h-list">${rows}</ul>` +
      (h.trimmed ? '<p class="h-foot">Seules les 30 dernières versions sont gardées en ligne.</p>' : '') +
      '</article>';
    bindRestore(e.slug);
    return { title: 'Historique de ' + e.titre, current: e.slug };
  }

  function versionBanner(e, v, isCur) {
    const s = encodeURIComponent(e.slug);
    const who = v.origin ? 'livrée avec Fire Shox' : `publiée par <b>${esc(v.author)}</b> le ${esc(fmtDate(v.date))}`;
    return `<div class="old-rev${isCur ? ' cur' : ''}"><div><b>${isCur ? 'Version actuelle' : (v.origin ? 'Version d\'origine' : `Ancienne version (révision ${v.revision})`)}</b> de cette page, ${who}.` +
      `${v.summary ? ` <span class="sum">« ${esc(v.summary)} »</span>` : ''}${isCur ? '' : ` Elle peut être très différente de la <a href="#${s}">version actuelle</a>.`}</div>` +
      `<div class="old-btns">${v.prev !== null ? `<a class="fs-btn small" href="#diff:${s}:${v.revision}">Comparer avec la précédente</a>` : ''}` +
      `<a class="fs-btn small" href="#historique:${s}">Historique</a>${isCur ? '' : `<button type="button" class="fs-btn small fire" data-restore="${v.revision}">Restaurer cette version</button>`}</div></div>`;
  }

  async function showVersion(rest) {
    const [slug, revS] = rest.split(':');
    const e = A.findEntry(slug);
    if (!e) { notFound(slug); return { title: 'Page introuvable' }; }
    const rev = Number(revS);
    const my = ++token;
    loading(e, 'historique', 'Chargement de la version…');
    const h = await loadVersions(e.slug);
    if (my !== token) return {};
    const v = h.list.find((x) => x.revision === rev);
    if (!v) { A.page.innerHTML = `<article class="view hist-view">${headHtml(e, 'historique')}<div class="ed-notice bad">Version introuvable (elle a peut-être été retirée de l'historique).</div></article>`; return { title: e.titre, current: e.slug }; }
    const isCur = h.list[0] && h.list[0].revision === v.revision;
    const ent = A.entryFromData(e.slug, v.data, v.origin ? null : { revision: v.revision, modified: v.date, author: v.author });
    A.page.innerHTML = `<div class="hist-view">${A.renderArticle(ent, { version: versionBanner(e, v, isCur) })}</div>`;
    A.hydrate(A.page);
    bindRestore(e.slug);
    return { title: `${e.titre} (révision ${v.revision})`, current: e.slug };
  }

  async function showDiff(rest) {
    const [slug, revS] = rest.split(':');
    const e = A.findEntry(slug);
    if (!e) { notFound(slug); return { title: 'Page introuvable' }; }
    const rev = Number(revS);
    const my = ++token;
    loading(e, 'historique', 'Comparaison des versions…');
    const h = await loadVersions(e.slug);
    if (my !== token) return {};
    const i = h.list.findIndex((x) => x.revision === rev);
    const v = h.list[i];
    if (!v) { A.page.innerHTML = `<article class="view hist-view">${headHtml(e, 'historique')}<div class="ed-notice bad">Version introuvable.</div></article>`; return { title: e.titre, current: e.slug }; }
    const old = h.list[i + 1] || { revision: null, origin: false, author: '', date: 0, summary: '', data: {}, empty: true };
    const s = encodeURIComponent(e.slug);
    const side = (x, label) => `<div class="dh"><div class="dh-k">${label}</div>` +
      (x.empty ? '<b>Page vide</b> (création)' : `<b><a href="#version:${s}:${x.revision}">${x.origin ? 'Version d\'origine' : `Révision ${x.revision}`}</a></b> ${x.origin ? '' : `du ${esc(fmtDate(x.date))}`}<div class="dh-who">${x.origin ? 'Wiki Shox' : esc(x.author)}</div><div class="dh-sum">${x.summary ? esc(x.summary) : '<i>sans résumé</i>'}</div>`) + '</div>';
    const isCur = h.list[0] && h.list[0].revision === v.revision;
    A.page.innerHTML = `<article class="view hist-view">${headHtml(e, 'historique')}` +
      `<div class="diff-head">${side(old, 'Avant')}<div class="dh-arrow">→</div>${side(v, isCur ? 'Après (version actuelle)' : 'Après')}</div>` +
      (isCur ? '' : `<div class="diff-actions"><button type="button" class="fs-btn small fire" data-restore="${v.revision}">Restaurer la version de droite</button></div>`) +
      diffTable(WT.serialize(old.empty ? {} : old.data), WT.serialize(v.data)) +
      `<div class="diff-actions bottom"><a class="fs-btn small" href="#historique:${s}">← Retour à l'historique</a></div>` +
      '</article>';
    bindRestore(e.slug);
    return { title: `Différences — ${e.titre}`, current: e.slug };
  }

  function bindRestore(slug) {
    for (const b of $$('[data-restore]', A.page)) b.addEventListener('click', () => restore(slug, Number(b.dataset.restore)));
  }

  async function restore(slug, rev) {
    const h = await loadVersions(slug);
    const v = h.list.find((x) => x.revision === rev);
    if (!v) { toast('Version introuvable.'); return; }
    const label = v.origin ? 'la version d\'origine' : `la révision ${v.revision} de ${v.author} (${fmtDate(v.date)})`;
    const r = await modal({
      title: 'Restaurer cette version ?',
      body: `<p class="md-p">La page reviendra à ${esc(label)}. Une <b>nouvelle version</b> sera créée : rien n'est effacé de l'historique.</p>`,
      actions: [{ id: 'cancel', label: 'Annuler' }, { id: 'ok', label: 'Restaurer', fire: true }],
    });
    if (r.id !== 'ok') return;
    const author = await ensurePseudo(false);
    if (!author) return;
    const fresh = await Cloud.fetchPage(slug);
    if (!fresh.ok) { snd('error'); toast(errText(fresh.error)); return; }
    const base = fresh.page ? fresh.page.revision : 0;
    const summary = v.origin ? 'Restauration de la version d\'origine' : `Restauration de la révision ${v.revision} (${v.author}, ${new Date(v.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })})`;
    const res = await Cloud.publish({ slug, base, data: v.data, summary, author });
    if (res.ok) {
      histCache.delete(slug);
      Cloud.drafts.remove(slug);
      A.rebuild();
      A.renderList();
      snd('success');
      toast('Version restaurée : elle est en ligne pour tout le monde.');
      A.go(slug);
    } else if (res.conflict) {
      snd('error');
      toast('Quelqu\'un vient de modifier la page : réessaie.');
      histCache.delete(slug);
    } else { snd('error'); toast(errText(res.error)); }
  }

  // =================================================================== CRÉER UNE PAGE
  function template(title, kind) {
    const pote = kind !== 'libre';
    return {
      titre: title,
      chapeau: '',
      resume: '',
      photo: '',
      legende: '',
      cadrage: '',
      ebauche: true,
      statut: '',
      infobox: pote ? A.CHAMPS.map((c) => [c, '']) : [['Type', ''], ['Première apparition', ''], ['Particularité', '']],
      sections: (pote ? ['Biographie', 'Origines', 'Faits marquants', 'Citations célèbres'] : ['Description', 'Histoire', 'Dans la culture']).map((t) => [t, '', 2]),
      galerie: [],
      voirAussi: ['les-shoxs'],
      categories: [],
    };
  }

  function showCreate(rest) {
    const pre = rest || '';
    A.page.innerHTML = '<article class="view create-view"><div class="title-row"><h1>Créer une page</h1></div>' +
      '<div class="tagline">La nouvelle page apparaîtra chez tous les possesseurs de Fire Shox.</div>' +
      '<div class="cr-card">' +
        `<label class="ed-field big"><span>Titre de la page</span><input id="cr-title" maxlength="120" autocomplete="off" placeholder="Ex. : La Légende du Ressort d'Or" value="${esc(pre)}"></label>` +
        '<div class="cr-slug">Adresse : <code>fireshox://wiki/#<b id="cr-slug">…</b></code></div>' +
        '<div class="cr-msg" id="cr-msg" aria-live="polite"></div>' +
        '<div class="cr-models"><div class="cr-label">Modèle de départ</div>' +
          '<label class="cr-model"><input type="radio" name="cr-model" value="pote" checked><span><b>👤 Fiche d\'un pote</b><small>Infobox (nom, surnom, spécialité…) et sections Biographie, Origines, Faits marquants, Citations.</small></span></label>' +
          '<label class="cr-model"><input type="radio" name="cr-model" value="libre"><span><b>📜 Article libre</b><small>Pour un objet, une légende, un lieu, un évènement… Sections Description, Histoire, Dans la culture.</small></span></label>' +
        '</div>' +
        '<div class="cr-actions"><a class="fs-btn" href="#">Annuler</a><button type="button" class="fs-btn fire" id="cr-go">Créer la page</button></div>' +
      '</div></article>';
    const inp = $('#cr-title');
    const check = () => {
      const title = inp.value.replace(/\s+/g, ' ').trim();
      const slug = WT.slugify(title);
      $('#cr-slug').textContent = slug || '…';
      const msg = $('#cr-msg');
      const exists = slug && (A.findEntry(slug) || A.findEntry(title));
      let ok = false;
      if (!title) msg.innerHTML = '<span class="muted">Choisis un titre.</span>';
      else if (!slug) msg.innerHTML = '<span class="bad">Ce titre ne contient aucune lettre ni aucun chiffre.</span>';
      else if (exists) msg.innerHTML = `<span class="bad">Cette page existe déjà : <a href="#${encodeURIComponent(exists.slug)}">${esc(exists.titre)}</a></span>`;
      else { msg.innerHTML = '<span class="ok">✓ Ce nom est libre.</span>'; ok = true; }
      $('#cr-go').disabled = !ok;
      return ok ? { title, slug } : null;
    };
    inp.addEventListener('input', check);
    inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') $('#cr-go').click(); });
    check();
    setTimeout(() => inp.focus(), 30);
    $('#cr-go').addEventListener('click', async () => {
      const c = check();
      if (!c) return;
      if (!Cloud.available) { toast(ERRORS.absent); return; }
      const author = await ensurePseudo(false);
      if (!author) return;
      const btn = $('#cr-go');
      btn.disabled = true;
      btn.textContent = 'Création…';
      const kind = ($('input[name="cr-model"]:checked') || {}).value;
      const r = await Cloud.publish({ slug: c.slug, base: 0, create: true, data: template(c.title, kind), summary: 'Création de la page', author });
      btn.textContent = 'Créer la page';
      if (r.ok) {
        A.rebuild();
        A.renderList();
        snd('success');
        try { const b = btn.getBoundingClientRect(); FX.burst(b.left + b.width / 2, b.top, { count: 80 }); } catch {}
        toast('Page créée : elle apparaît chez tout le monde. Clique sur « Modifier » pour la remplir !');
        A.go(c.slug);
      } else if (r.conflict) {
        A.rebuild(); A.renderList();
        $('#cr-msg').innerHTML = `<span class="bad">Quelqu'un vient de créer cette page : <a href="#${encodeURIComponent(c.slug)}">l'ouvrir</a></span>`;
        snd('error');
      } else {
        btn.disabled = false;
        $('#cr-msg').innerHTML = `<span class="bad">${esc(errText(r.error))}</span>`;
        snd('error');
      }
    });
    return { title: 'Créer une page' };
  }

  // =================================================================== MODIFICATIONS RÉCENTES
  function showRecent() {
    const paint = () => {
      const idx = Cloud.index();
      const rows = Object.entries(idx).map(([slug, m]) => ({ slug, ...m })).sort((a, b) => (b.modified || 0) - (a.modified || 0));
      const st = Cloud.state;
      let html = '<article class="view recent-view"><div class="title-row"><h1>Modifications récentes</h1>' +
        '<button type="button" class="fs-btn small" id="rc-refresh">↻ Actualiser</button></div>' +
        '<div class="tagline">La dernière modification de chaque page du wiki partagé, de la plus récente à la plus ancienne.</div>';
      if (st.online === false) html += `<div class="ed-notice bad"><b>Hors ligne.</b> Liste de la dernière synchronisation${st.lastSync ? ` (${esc(ago(st.lastSync))})` : ''}.</div>`;
      if (!rows.length) {
        html += '<div class="rc-empty"><img src="/assets/logo-128.png" alt=""><h2>Aucune modification en ligne pour l\'instant</h2><p>Sois le premier ! Ouvre une page et clique sur « Modifier », ou <a href="#creer">crée une nouvelle page</a>.</p></div>';
      } else {
        let day = '';
        html += '<div class="rc-list">';
        for (const r of rows) {
          const d = new Date(r.modified || 0);
          const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          if (label !== day) { if (day) html += '</ul>'; day = label; html += `<h3 class="rc-day">${esc(label)}</h3><ul class="rc-ul">`; }
          const s = encodeURIComponent(r.slug);
          const fresh = Cloud.isNew(r.slug);
          html += `<li class="rc-row"><span class="rc-time">${esc(fmtTime(r.modified))}</span>` +
            `<span class="rc-links">(<a href="#diff:${s}:${r.revision}">diff</a> | <a href="#historique:${s}">hist.</a>)</span>` +
            `<a class="rc-title" href="#${s}">${esc(r.title)}</a>` +
            (r.revision === 1 && !A.hasDefault(r.slug) ? '<span class="rc-flag new" title="Nouvelle page">N</span>' : '') +
            (fresh ? '<span class="badge-mod">modifié</span>' : '') +
            `<span class="rc-who"><span class="av">${esc((r.author || '?')[0].toUpperCase())}</span>${esc(r.author)}</span>` +
            `<span class="rc-sum">${r.summary ? esc(r.summary) : '<i>sans résumé</i>'}</span><span class="rc-rev">rév. ${r.revision}</span></li>`;
        }
        html += '</ul></div>';
      }
      html += '</article>';
      A.page.innerHTML = html;
      $('#rc-refresh').addEventListener('click', async () => { snd('tick'); $('#rc-refresh').disabled = true; await Cloud.sync(); if (location.hash === '#recentes') paint(); });
    };
    paint();
    Cloud.sync().then(() => { if (location.hash === '#recentes') paint(); });
    return { title: 'Modifications récentes' };
  }

  function notFound(slug) {
    A.page.innerHTML = `<article class="view"><div class="title-row"><h1>${esc(slug || 'Page')}</h1></div><div class="ed-notice bad">Cette page n'existe pas. <a href="#creer:${encodeURIComponent(slug)}">La créer</a></div></article>`;
  }

  // =================================================================== routes
  function route(kind, rest) {
    token++;
    switch (kind) {
      case 'modifier': return openEditor(rest);
      case 'historique': case 'version': case 'diff': {
        const e = A.findEntry(rest.split(':')[0]);
        if (kind === 'historique') showHistory(rest); else if (kind === 'version') showVersion(rest); else showDiff(rest);
        const label = kind === 'historique' ? 'Historique' : kind === 'version' ? 'Version' : 'Différences';
        return e ? { title: `${label} — ${e.titre}`, current: e.slug } : { title: label };
      }
      case 'creer': return showCreate(rest);
      case 'recentes': return showRecent();
      default: return {};
    }
  }
  function leave() {
    if (ed) { saveDraft(); clearTimeout(prevTimer); ed = null; }
  }

  // Nouvelle version reçue pendant qu'on écrit : on prévient (sans toucher au texte).
  if (Cloud) Cloud.on((type, changed) => {
    if (ed && (type === 'status' || (type === 'sync' && changed && changed.includes(ed.slug)))) paintNotices();
  });

  window.WikiEditor = {
    attach(api) { A = api; },
    route,
    leave,
    ago,
    // Pour les tests (même chemin que le bouton ou le glisser-déposer)
    test: { setPhotoFiles, addGalleryFiles, publish: () => publish(), state: () => ed, diffTable },
  };
})();
