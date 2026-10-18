// Wiki Shox — balisage maison SÛR (wikitexte) pour les pages modifiées en ligne.
//
// Règle d'or : le texte vient de n'importe qui. On ÉCHAPPE TOUT le HTML d'abord, puis on n'ajoute que
// quelques balises fixes, sans jamais recopier un attribut fourni par l'auteur (sauf adresses validées
// puis échappées). Pas de javascript:, pas de gestionnaire d'évènement, pas de style.
//
// Syntaxe :
//   paragraphes séparés par une ligne vide ; retour à la ligne simple = saut de ligne
//   **gras** ou '''gras'''     ''italique'' ou *italique*
//   == Titre ==   === Sous-titre ===
//   * élément de liste          # élément numéroté
//   > citation — Auteur
//   | cellule | cellule |   (tableau ; |---|---| sépare l'en-tête ; |+ légende)
//   :: formule centrée
//   [[slug]]  [[slug|texte]]    {{réf}}    {{note|texte de la note}}
//   [https://exemple.fr texte]  (http, https, ou un site interne fireshox://…/)
//   [[Image:https://files.catbox.moe/abcd.jpg|légende]]   (catbox ou /assets/… seulement)
(function () {
  'use strict';

  const IMG_REMOTE = /^https:\/\/files\.catbox\.moe\/[A-Za-z0-9_-]{1,64}\.(?:jpe?g|png|gif|webp)$/i;
  const IMG_LOCAL = /^\/assets\/(?:[A-Za-z0-9_-]+\/){0,4}[A-Za-z0-9_-][A-Za-z0-9_.-]{0,80}\.(?:jpe?g|png|gif|webp)$/i;
  const IMG_FILE = /^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,80}\.(?:jpe?g|png|gif|webp)$/i;
  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const INTERNAL_SITES = ['home', 'opening', 'shoxbench', 'images', 'jeux', 'wiki', 'notes', 'runner'];

  // Échappement : & < > " (les attributs produits ici sont TOUJOURS entre guillemets doubles).
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const clean = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');

  // Adresse d'image autorisée (ou '') : files.catbox.moe en https, /assets/…, ou un nom de fichier seul
  // (rangé dans /assets/wiki/<slug>/).
  function safeImage(src, slug) {
    const s = clean(src).trim();
    if (!s) return '';
    if (IMG_REMOTE.test(s) || IMG_LOCAL.test(s)) return s;
    if (IMG_FILE.test(s) && SLUG_RE.test(slug || '')) return `/assets/wiki/${slug}/${s}`;
    return '';
  }

  // Lien externe autorisé (ou '') : http(s), ou un site interne fireshox://<site>/ connu, sans paramètres.
  function safeLink(url) {
    let u;
    try { u = new URL(clean(url).trim()); } catch { return ''; }
    if (u.username || u.password) return '';
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
    if (u.protocol === 'fireshox:' && INTERNAL_SITES.includes(u.host) && !u.search && /^[\w/.-]*$/.test(u.pathname)) return u.href;
    return '';
  }

  const FACT = '<sup class="fact">⁠[<i><a data-fact title="Cette affirmation rebondit sans source">réf. nécessaire</a></i>]</sup>';
  const EXT_ICON = '<svg class="ext-ico" viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ctx = { notes: [], slug, link(target, labelHtml) → html, image(src, captionHtml, captionText) → html }
  function inline(text, ctx) {
    ctx = ctx || {};
    let s = clean(text);
    const tokens = [];
    const keep = (html) => `\u0000${tokens.push(html) - 1}\u0000`;

    // Notes (leur texte est rendu plus tard, dans « Notes et références »)
    s = s.replace(/\{\{\s*note\s*\|([\s\S]*?)\}\}/gi, (_m, body) => {
      if (!ctx.notes) return '';
      ctx.notes.push({ wiki: body });
      const n = ctx.notes.length;
      return keep(`<sup class="ref" id="cite-${n}">⁠<a data-note="${n}">[${n}]</a></sup>`);
    });
    s = s.replace(/\{\{\s*r[ée]f(?:[ée]rence)?\.?(?:\s+n[ée]cessaire)?\s*\}\}/gi, () => keep(FACT));
    // Image dans une ligne (infobox, légende…) : petite vignette
    s = s.replace(/\[\[\s*(?:image|fichier)\s*:\s*([^|\]\n]{1,300})(?:\|([^\]\n]{0,300}))?\]\]/gi, (m, src, cap) => {
      const ok = safeImage(src, ctx.slug);
      if (!ok || !ctx.image) return keep(`<span class="wt-bad">${esc(m)}</span>`);
      return keep(ctx.image(ok, cap ? formatOnly(cap) : '', cap || '', true));
    });
    // Liens internes
    s = s.replace(/\[\[([^[\]|\n]{1,120})(?:\|([^[\]\n]{0,200}))?\]\]/g, (_m, target, label) => {
      const lab = label !== undefined && label.trim() ? formatOnly(label) : null; // null : le titre de la page
      return keep(ctx.link ? ctx.link(target.trim(), lab) : (lab || esc(target.trim())));
    });
    // Liens externes
    s = s.replace(/\[((?:https?|fireshox):\/\/[^\s\]]{1,500})(?:[ \t]+([^\]\n]{1,200}))?\]/gi, (m, url, label) => {
      const href = safeLink(url);
      if (!href) return keep(esc(m));
      const lab = label ? formatOnly(label) : esc(href);
      return keep(`<a class="wl ext" href="${esc(href)}" data-ext="${esc(href)}" title="${esc(href)}" rel="noopener noreferrer">${lab}${EXT_ICON}</a>`);
    });
    s = formatOnly(s, true);
    // Jetons (peuvent en contenir d'autres)
    for (let i = 0; i < 3 && /\u0000\d+\u0000/.test(s); i++) s = s.replace(/\u0000(\d+)\u0000/g, (_m, k) => tokens[Number(k)] ?? '');
    return s.replace(/\n/g, '<br>');
  }

  // Gras / italique sur du texte (échappé ici, sauf si keepTokens : les jetons \u0000n\u0000 restent).
  function formatOnly(text, keepTokens) {
    let s = keepTokens ? esc(text) : esc(clean(text).replace(/\u0000/g, ''));
    s = s.replace(/'''(.+?)'''/g, '<b>$1</b>');
    s = s.replace(/''(.+?)''/g, '<i>$1</i>');
    s = s.replace(/\*\*(?=\S)(.+?)\*\*/g, '<b>$1</b>');
    s = s.replace(/(^|[^*\w])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![*\w])/g, '$1<i>$2</i>');
    return s;
  }

  // Bloc complet (résumé, section)
  function render(text, ctx) {
    ctx = ctx || {};
    const lines = clean(text).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let para = [];
    let list = null; // { tag, items }
    let table = null; // { caption, rows: [{ head, cells }] }
    const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join('\n'), ctx)}</p>`); para = []; } };
    const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((t) => `<li>${inline(t, ctx)}</li>`).join('')}</${list.tag}>`); list = null; } };
    const flushTable = () => {
      if (!table) return;
      const rows = table.rows.map((r) => `<tr>${r.cells.map((c) => (r.head ? `<th>${inline(c, ctx)}</th>` : `<td>${inline(c, ctx)}</td>`)).join('')}</tr>`).join('');
      out.push(`<table class="wikitable">${table.caption ? `<caption>${inline(table.caption, ctx)}</caption>` : ''}${rows}</table>`);
      table = null;
    };
    const flushAll = () => { flushPara(); flushList(); flushTable(); };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const t = line.trim();
      let m;
      if (!t) { flushAll(); continue; }
      if ((m = /^(={2,3})\s*(.+?)\s*\1$/.exec(t))) {
        flushAll();
        out.push(m[1].length === 2 ? `<h3 class="wt-h">${inline(m[2], ctx)}</h3>` : `<h4 class="wt-h">${inline(m[2], ctx)}</h4>`);
        continue;
      }
      if ((m = /^\[\[\s*(?:image|fichier)\s*:\s*([^|\]\n]{1,300})(?:\|([^\]\n]{0,300}))?\]\]$/i.exec(t))) {
        flushAll();
        const ok = safeImage(m[1], ctx.slug);
        if (ok && ctx.image) out.push(ctx.image(ok, m[2] ? inline(m[2], ctx) : '', m[2] || '', false));
        else out.push(`<p><span class="wt-bad">${esc(t)}</span></p>`);
        continue;
      }
      if ((m = /^([*#-])\s+(.*)$/.exec(t)) && !/^\*\*/.test(t)) {
        flushPara(); flushTable();
        const tag = m[1] === '#' ? 'ol' : 'ul';
        if (list && list.tag !== tag) flushList();
        if (!list) list = { tag, items: [] };
        list.items.push(m[2]);
        continue;
      }
      if (/^>/.test(t)) {
        flushAll();
        const body = t.replace(/^>\s?/, '');
        const k = Math.max(body.lastIndexOf(' — '), body.lastIndexOf(' -- '));
        const quote = k > 0 ? body.slice(0, k) : body;
        const who = k > 0 ? body.slice(k + (body.startsWith(' — ', k) ? 3 : 4)) : '';
        out.push(`<blockquote>${inline(quote, ctx)}${who.trim() ? `<cite>${inline(who.trim(), ctx)}</cite>` : ''}</blockquote>`);
        continue;
      }
      if (/^\|/.test(t)) {
        flushPara(); flushList();
        if (!table) table = { caption: '', rows: [] };
        if (/^\|\+/.test(t)) { table.caption = t.slice(2).trim(); continue; }
        if (/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(t)) { if (table.rows.length) table.rows[table.rows.length - 1].head = true; continue; }
        const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()).slice(0, 12);
        table.rows.push({ head: false, cells });
        continue;
      }
      if (/^::/.test(t)) {
        flushAll();
        out.push(`<p class="formula">${inline(t.replace(/^::\s?/, ''), ctx)}</p>`);
        continue;
      }
      flushList(); flushTable();
      para.push(line.replace(/\s+$/, ''));
    }
    flushAll();
    return out.join('');
  }

  // Texte brut (recherche, résumés)
  function plain(text) {
    return clean(text)
      .replace(/\{\{\s*note\s*\|[\s\S]*?\}\}/gi, '')
      .replace(/\{\{[^}]*\}\}/g, '')
      .replace(/\[\[\s*(?:image|fichier)\s*:[^\]]*\]\]/gi, '')
      .replace(/\[\[([^\]|]+)\|([^\]]*)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/\[(?:https?|fireshox):\/\/\S+\s+([^\]]+)\]/gi, '$1')
      .replace(/'''|''|\*\*/g, '')
      .replace(/^\s*(?:={2,3}|[*#>-]|::|\|)\s?/gm, '')
      .replace(/={2,3}\s*$/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ------------------------------------------------------------------ HTML local (data.js) → wikitexte
  // Seulement pour le contenu de confiance livré avec le navigateur, à la 1re modification d'une page.
  function fromHtml(html) {
    const t = document.createElement('template');
    t.innerHTML = String(html || '');
    return blocks(t.content).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function inl(node) {
    let s = '';
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { s += n.nodeValue.replace(/\s+/g, ' '); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName.toLowerCase();
      const c = inl(n);
      const wrap = (mark) => {
        const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(c);
        return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : c;
      };
      if (tag === 'b' || tag === 'strong') s += wrap('**');
      else if (tag === 'i' || tag === 'em') s += wrap("''");
      else if (tag === 'br') s += '\n';
      else if (tag === 'a') {
        const h = n.getAttribute('href') || '';
        const label = c.trim();
        if (/^#[a-z0-9-]+$/i.test(h)) s += `[[${decodeURIComponent(h.slice(1))}${label ? '|' + label : ''}]]`;
        else if (safeLink(h)) s += `[${h} ${label}]`;
        else s += c;
      } else if (tag === 'img') {
        const src = n.getAttribute('src') || '';
        if (safeImage(src)) s += `[[Image:${src}|${n.getAttribute('alt') || ''}]]`;
      } else s += c;
    }
    return s;
  }
  function blocks(root) {
    const parts = [];
    let buf = '';
    const flush = () => { if (buf.trim()) parts.push(buf.trim()); buf = ''; };
    for (const n of root.childNodes) {
      if (n.nodeType === 3) { buf += n.nodeValue.replace(/\s+/g, ' '); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName.toLowerCase();
      if (tag === 'p') {
        flush();
        const c = inl(n).trim();
        if (c) parts.push(n.classList.contains('formula') ? ':: ' + c : c);
      } else if (tag === 'ul' || tag === 'ol') {
        flush();
        const mark = tag === 'ul' ? '*' : '#';
        const items = [...n.children].filter((li) => li.tagName === 'LI').map((li) => `${mark} ${inl(li).trim().replace(/\s*\n\s*/g, ' ')}`);
        if (items.length) parts.push(items.join('\n'));
      } else if (tag === 'blockquote') {
        flush();
        const cite = n.querySelector('cite');
        const who = cite ? inl(cite).trim() : '';
        const body = n.cloneNode(true);
        body.querySelectorAll('cite').forEach((x) => x.remove());
        parts.push(`> ${inl(body).trim().replace(/\s*\n\s*/g, ' ')}${who ? ' — ' + who : ''}`);
      } else if (tag === 'table') {
        flush();
        const rows = [];
        const cap = n.querySelector('caption');
        if (cap) rows.push(`|+ ${inl(cap).trim()}`);
        for (const tr of n.querySelectorAll('tr')) {
          const cells = [...tr.children].map((c) => inl(c).trim().replace(/\|/g, '/'));
          rows.push(`| ${cells.join(' | ')} |`);
          if ([...tr.children].every((c) => c.tagName === 'TH')) rows.push(`|${cells.map(() => '---').join('|')}|`);
        }
        parts.push(rows.join('\n'));
      } else if (/^h[1-6]$/.test(tag)) {
        flush();
        parts.push(`== ${inl(n).trim()} ==`);
      } else if (tag === 'div' || tag === 'section' || tag === 'figure') {
        flush();
        const c = blocks(n);
        if (c) parts.push(c);
      } else {
        const wrapper = document.createElement('span');
        wrapper.appendChild(n.cloneNode(true));
        buf += inl(wrapper);
      }
    }
    flush();
    return parts.join('\n\n');
  }
  // Texte d'une ligne (infobox, légende) : pas de paragraphes
  function fromHtmlInline(html) {
    return fromHtml(html).replace(/\n{2,}/g, ' ').replace(/\n/g, ' ').trim();
  }

  // ------------------------------------------------------------------ comparaison de versions
  function serialize(d) {
    d = d || {};
    const L = [];
    const statut = d.ebauche ? 'ébauche' : d.statut === 'enrichissement' ? 'en cours d\'enrichissement' : 'article complet';
    L.push(`Titre : ${d.titre || ''}`, `Statut : ${statut}`);
    if (d.chapeau) L.push(`Chapeau : ${d.chapeau}`);
    L.push(`Photo : ${d.photo || '(aucune)'}`);
    if (d.legende) L.push(`Légende : ${d.legende}`);
    if (d.cadrage) L.push(`Cadrage : ${d.cadrage}`);
    L.push('', '— Résumé —', ...String(d.resume || '').split('\n'));
    L.push('', '— Infobox —');
    for (const r of d.infobox || []) L.push(String(r[0] || '').startsWith('#') ? `${r[0]}` : `${r[0]} = ${r[1] || ''}`);
    for (const s of d.sections || []) L.push('', `— ${s[2] === 3 ? 'Sous-section' : 'Section'} : ${s[0]} —`, ...String(s[1] || '').split('\n'));
    L.push('', '— Galerie —');
    for (const g of d.galerie || []) L.push(`${g[0]}${g[1] ? ' | ' + g[1] : ''}`);
    L.push('', `— Voir aussi — ${(d.voirAussi || []).join(', ')}`, `— Catégories — ${(d.categories || []).join(', ')}`);
    return L.join('\n');
  }

  // Diff ligne par ligne (plus longue sous-suite commune). Renvoie [{ t: '=', '-', '+', a, b, text }]
  function diffLines(oldText, newText) {
    const a = String(oldText).split('\n');
    const b = String(newText).split('\n');
    let s = 0;
    while (s < a.length && s < b.length && a[s] === b[s]) s++;
    let ea = a.length, eb = b.length;
    while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
    const A = a.slice(s, ea), B = b.slice(s, eb);
    const n = A.length, m = B.length;
    const out = [];
    for (let i = 0; i < s; i++) out.push({ t: '=', a: i + 1, b: i + 1, text: a[i] });
    if (n * m > 4000000) { // trop gros : tout retiré puis tout ajouté
      A.forEach((x, i) => out.push({ t: '-', a: s + i + 1, text: x }));
      B.forEach((x, i) => out.push({ t: '+', b: s + i + 1, text: x }));
    } else {
      const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
      for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      let i = 0, j = 0;
      while (i < n || j < m) {
        if (i < n && j < m && A[i] === B[j]) { out.push({ t: '=', a: s + i + 1, b: s + j + 1, text: A[i] }); i++; j++; }
        else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) { out.push({ t: '+', b: s + j + 1, text: B[j] }); j++; }
        else { out.push({ t: '-', a: s + i + 1, text: A[i] }); i++; }
      }
    }
    for (let i = ea, j = eb; i < a.length; i++, j++) out.push({ t: '=', a: i + 1, b: j + 1, text: a[i] });
    return out;
  }

  // Titre → identifiant d'adresse (sans accents)
  function slugify(title) {
    return String(title || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/['’]/g, ' ')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
  }

  window.WikiText = { esc, inline, formatOnly: (t) => formatOnly(t), render, plain, fromHtml, fromHtmlInline, serialize, diffLines, slugify, safeImage, safeLink, SLUG_RE };
})();
