// ShoxNotes — le bloc-notes de Fire Shox (fireshox://notes/)
// Liste à gauche, éditeur à droite ; une seule colonne sous 640 px (panneau latéral d'environ 360 px).
// Stockage : notes.list = [{ id, title, text, color: '' | 'squid' | 'fire' | 'lfi', pinned, created, updated }]
// Mise en forme : « - [ ] » / « - [x] » cases à cocher, « - » puces, « # » titres, **gras**, liens cliquables (FX.open).
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const snd = (n) => { try { FX.sound(n); } catch {} };
  const KEY = 'notes.list';

  const COLORS = {
    '': { name: 'Aucune', c: 'transparent' },
    squid: { name: 'Squid', sub: 'rose', c: '#ff2d75' },
    fire: { name: 'Fire', sub: 'orange', c: '#ff7a00' },
    lfi: { name: 'LFI', sub: 'rouge', c: '#e5232f' },
  };

  // ------------------------------------------------------------------ données
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function load() {
    const raw = FX.store.get(KEY, null);
    if (!Array.isArray(raw)) return null;
    return raw.filter((n) => n && n.id).map((n) => ({
      id: String(n.id), title: String(n.title || ''), text: String(n.text || ''),
      color: COLORS[n.color] ? n.color : '', pinned: !!n.pinned,
      created: Number(n.created) || Date.now(), updated: Number(n.updated) || Date.now(),
    }));
  }
  let notes = load();
  if (!notes) {
    const now = Date.now();
    notes = [{
      id: uid(), color: 'fire', pinned: true, created: now, updated: now,
      title: 'Bienvenue dans ShoxNotes 🔥',
      text: 'Le bloc-notes officiel de Le Y. Tout s\'enregistre tout seul, même si tu fermes Fire Shox.\n\n**Ce que tu peux faire :**\n- [x] Écrire une note (bouton + ou Ctrl+N)\n- [ ] Cocher une case en cliquant dessus\n- [ ] Mettre du **gras** avec deux étoiles de chaque côté\n- [ ] Coller un lien, il devient cliquable : fireshox://runner/\n- Épingler une note et lui donner une étiquette : Squid, Fire ou LFI',
    }];
    FX.store.set(KEY, notes);
  }
  let saveTimer = 0, savedAt = 0;
  function saveNow() { clearTimeout(saveTimer); saveTimer = 0; FX.store.set(KEY, notes); savedAt = Date.now(); renderMeta(); }
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 300); }
  addEventListener('beforeunload', () => { if (saveTimer) saveNow(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) saveNow(); });

  const byId = (id) => notes.find((n) => n.id === id);
  const sorted = () => notes.slice().sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated));

  // ------------------------------------------------------------------ dates
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  function rel(ts) {
    const d = new Date(ts), now = new Date(), diff = (now - d) / 1000;
    if (diff < 45) return 'à l\'instant';
    if (diff < 3600) return `il y a ${Math.max(1, Math.round(diff / 60))} min`;
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const days = Math.round((day(now) - day(d)) / 864e5);
    if (days === 0) return `aujourd'hui, ${hm(d)}`;
    if (days === 1) return `hier, ${hm(d)}`;
    if (days < 7) return `${JOURS[d.getDay()].slice(0, 3)}. ${hm(d)}`;
    return `${d.getDate()} ${MOIS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : ''}`;
  }
  const full = (ts) => { const d = new Date(ts); return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()].replace('.', '')} ${d.getFullYear()} à ${hm(d)}`; };

  // ------------------------------------------------------------------ mise en forme
  const URL_RE = /((?:https?|fireshox):\/\/[^\s<>"]+|www\.[^\s<>"]+\.[^\s<>"]+)/gi;
  function inline(text) {
    let out = '', last = 0;
    const bold = (s) => esc(s).replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>');
    text.replace(URL_RE, (m, _u, idx) => {
      let url = m, tail = '';
      while (/[.,;:!?)\]»"']$/.test(url)) { tail = url.slice(-1) + tail; url = url.slice(0, -1); }
      out += bold(text.slice(last, idx));
      const href = /^www\./i.test(url) ? 'https://' + url : url;
      out += `<a class="lk" href="${esc(href)}" data-href="${esc(href)}" title="Ouvrir ${esc(href)} dans un nouvel onglet">${esc(url)}</a>` + esc(tail);
      last = idx + m.length;
      return m;
    });
    return out + bold(text.slice(last));
  }
  const TASK = /^(\s*)[-*]\s\[( |x|X)\]\s?(.*)$/;
  const BULLET = /^(\s*)[-*•]\s+(.*)$/;
  function render(text) {
    const lines = text.split('\n');
    return lines.map((l, i) => {
      let m;
      if ((m = l.match(TASK))) {
        const on = m[2] !== ' ';
        return `<div class="ln task${on ? ' done' : ''}" data-line="${i}" style="--ind:${m[1].length}"><button type="button" class="cb" role="checkbox" aria-checked="${on}" aria-label="Cocher"><svg viewBox="0 0 24 24"><path d="m6 12.5 4 4L18 8"/></svg></button><span>${inline(m[3]) || '&nbsp;'}</span></div>`;
      }
      if ((m = l.match(BULLET))) return `<div class="ln bullet" data-line="${i}" style="--ind:${m[1].length}"><i></i><span>${inline(m[2])}</span></div>`;
      if ((m = l.match(/^(#{1,2})\s+(.*)$/))) return `<div class="ln h${m[1].length}" data-line="${i}">${inline(m[2])}</div>`;
      if (!l.trim()) return `<div class="ln empty" data-line="${i}"></div>`;
      return `<div class="ln" data-line="${i}">${inline(l)}</div>`;
    }).join('');
  }
  const plain = (s) => s.replace(TASK, '$3').replace(BULLET, '$2').replace(/^#{1,2}\s+/, '').replace(/\*\*([^*]+?)\*\*/g, '$1');
  function tasks(text) {
    let all = 0, done = 0;
    for (const l of text.split('\n')) { const m = l.match(TASK); if (m) { all++; if (m[2] !== ' ') done++; } }
    return { all, done };
  }

  // ------------------------------------------------------------------ état de l'interface
  const app = $('#app'), list = $('#list'), q = $('#q'), ta = $('#ta'), view = $('#view'), title = $('#title');
  let current = null, filter = '', editing = false;
  const narrow = () => matchMedia('(max-width: 639px)').matches;

  function count() {
    const n = notes.length;
    $('#count').textContent = `${n} note${n > 1 ? 's' : ''}`;
  }

  function renderFilters() {
    const used = new Set(notes.map((n) => n.color).filter(Boolean));
    const chips = [['', 'Toutes']].concat(Object.keys(COLORS).filter((k) => k).map((k) => [k, COLORS[k].name]));
    $('#filters').innerHTML = chips.map(([k, name]) => `<button type="button" role="tab" class="chip${filter === k ? ' on' : ''}${k && !used.has(k) ? ' unused' : ''}" data-filter="${k}" aria-selected="${filter === k}">${k ? `<i style="--c:${COLORS[k].c}"></i>` : ''}${name}</button>`).join('');
  }

  function highlight(s, words) {
    let h = esc(s);
    if (!words.length) return h;
    // surlignage insensible aux accents : on travaille sur la version « pliée » pour trouver les positions
    const f = fold(s); const marks = [];
    for (const w of words) { let i = 0; while ((i = f.indexOf(w, i)) !== -1) { marks.push([i, i + w.length]); i += w.length; } }
    if (!marks.length) return h;
    marks.sort((a, b) => a[0] - b[0]);
    let out = '', last = 0;
    for (const [a, b] of marks) { if (a < last) continue; out += esc(s.slice(last, a)) + '<mark>' + esc(s.slice(a, b)) + '</mark>'; last = b; }
    return out + esc(s.slice(last));
  }

  function renderList() {
    const words = fold(q.value.trim()).split(/\s+/).filter(Boolean);
    const all = sorted().filter((n) => !filter || n.color === filter);
    const shown = all.filter((n) => { const f = fold(n.title + '\n' + n.text); return words.every((w) => f.includes(w)); });
    const item = (n) => {
      const firstLines = n.text.split('\n').map((l) => plain(l).trim()).filter(Boolean);
      let snip = firstLines[0] || '';
      if (words.length) { const hit = firstLines.find((l) => words.some((w) => fold(l).includes(w))); if (hit) snip = hit; }
      const t = tasks(n.text);
      return `<button type="button" class="item${n.id === current ? ' on' : ''}" data-id="${n.id}" style="--c:${COLORS[n.color].c}">` +
        `<span class="it-top"><b class="it-title">${n.title ? highlight(n.title, words) : '<em>Sans titre</em>'}</b>${n.pinned ? '<svg class="it-pin" viewBox="0 0 24 24" aria-label="Épinglée"><path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>' : ''}</span>` +
        `<span class="it-snip">${snip ? highlight(snip.slice(0, 160), words) : '<em>Pas de texte</em>'}</span>` +
        `<span class="it-meta"><time>${rel(n.updated)}</time>${t.all ? `<span class="it-tasks${t.done === t.all ? ' ok' : ''}">☑ ${t.done}/${t.all}</span>` : ''}${n.color ? `<span class="it-tag">${COLORS[n.color].name}</span>` : ''}</span>` +
        '</button>';
    };
    let html = '';
    if (!notes.length) {
      html = '<div class="list-empty"><img src="/assets/logo-128.png" alt=""><b>Aucune note</b><span>Le Y n\'a encore rien noté.<br>Lance-toi avec le bouton « Nouvelle ».</span></div>';
    } else if (!shown.length) {
      html = `<div class="list-empty small"><b>Aucune note trouvée</b><span>${words.length ? `Rien ne correspond à « ${esc(q.value.trim())} ».` : 'Aucune note avec cette étiquette.'}</span></div>`;
    } else {
      const pin = shown.filter((n) => n.pinned), rest = shown.filter((n) => !n.pinned);
      if (pin.length) html += `<div class="sec">Épinglées</div>${pin.map(item).join('')}`;
      if (rest.length) html += `${pin.length ? '<div class="sec">Notes</div>' : ''}${rest.map(item).join('')}`;
    }
    list.innerHTML = html;
    count();
  }

  // ------------------------------------------------------------------ éditeur
  function renderMeta() {
    const n = byId(current);
    if (!n) { $('#meta').innerHTML = ''; return; }
    const words = (n.title + ' ' + n.text).trim().split(/\s+/).filter(Boolean).length;
    const c = COLORS[n.color];
    $('#meta').innerHTML = `${n.color ? `<span class="tag" style="--c:${c.c}">${c.name}</span>` : ''}<span title="Modifiée ${full(n.updated)}">Modifiée ${narrow() ? rel(n.updated) : full(n.updated)}</span><span class="dotsep">·</span><span>${words} mot${words > 1 ? 's' : ''}</span>` +
      `<span class="saved${saveTimer ? ' pending' : ''}">${saveTimer ? 'Enregistrement…' : '✓ Enregistrée'}</span>`;
  }
  function renderTools() {
    const n = byId(current);
    const pin = $('#t-pin');
    pin.classList.toggle('on', !!(n && n.pinned));
    pin.title = n && n.pinned ? 'Désépingler' : 'Épingler';
    $('#t-color-dot').style.setProperty('--c', n && n.color ? COLORS[n.color].c : 'transparent');
    $('#t-color-dot').classList.toggle('none', !(n && n.color));
    $('#editor').style.setProperty('--accent', n && n.color ? COLORS[n.color].c : 'rgba(255,122,0,.0)');
  }
  function renderView() {
    const n = byId(current);
    if (!n) return;
    view.innerHTML = n.text ? render(n.text) : '<div class="ln ph">Écris ta note… clique ici pour commencer.</div>';
  }
  function autosize() {
    ta.style.height = '0px';
    ta.style.height = Math.max(ta.scrollHeight, 120) + 'px';
  }
  function setEditing(on, line) {
    editing = on;
    app.classList.toggle('editing', on);
    if (on) {
      ta.hidden = false; view.hidden = true;
      autosize();
      if (line !== undefined) {
        const n = byId(current); const lines = n.text.split('\n');
        const L = Math.min(Math.max(0, line), lines.length - 1);
        let pos = 0; for (let i = 0; i < L; i++) pos += lines[i].length + 1;
        pos += lines[L].length;
        ta.focus({ preventScroll: true }); ta.setSelectionRange(pos, pos);
      }
    } else {
      renderView(); ta.hidden = true; view.hidden = false;
    }
  }

  function open(id, opts = {}) {
    const n = byId(id);
    if (saveTimer) saveNow();
    current = n ? n.id : null;
    app.classList.toggle('has-note', !!n);
    if (!n) { renderList(); return; }
    title.value = n.title; ta.value = n.text;
    renderTools(); renderMeta();
    setEditing(!!opts.edit || !n.text);
    if (opts.focusTitle) title.focus();
    else if (opts.edit) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    $('#ed-scroll').scrollTop = 0;
    app.classList.add('show-editor');
    renderList();
    const it = list.querySelector('.item.on'); if (it) it.scrollIntoView({ block: 'nearest' });
  }

  function newNote() {
    const now = Date.now();
    const n = { id: uid(), title: '', text: '', color: filter || '', pinned: false, created: now, updated: now };
    notes.push(n);
    if (q.value) { q.value = ''; $('#q-clear').hidden = true; }
    saveNow();
    snd('pop');
    open(n.id, { edit: true, focusTitle: true });
  }

  function touch(n) { n.updated = Date.now(); save(); renderMeta(); listSoon(); }
  let listTimer = 0;
  function listSoon() { clearTimeout(listTimer); listTimer = setTimeout(renderList, 160); }

  title.addEventListener('input', () => { const n = byId(current); if (!n) return; n.title = title.value; touch(n); });
  title.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); setEditing(true); ta.focus(); ta.setSelectionRange(0, 0); } });
  ta.addEventListener('input', () => { const n = byId(current); if (!n) return; n.text = ta.value; autosize(); touch(n); });
  ta.addEventListener('blur', () => {
    // on quitte le champ : retour à l'affichage mis en forme (sauf si on clique sur un outil)
    setTimeout(() => { if (document.activeElement !== ta && byId(current) && byId(current).text) setEditing(false); }, 0);
  });

  // Entrée sur une ligne de liste : on continue la liste (et une ligne vide la termine)
  ta.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyB') { e.preventDefault(); toggleBold(); return; }
    if (e.key === 'Escape') { ta.blur(); return; }
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const v = ta.value, p = ta.selectionStart;
    if (p !== ta.selectionEnd) return;
    const ls = v.lastIndexOf('\n', p - 1) + 1;
    const line = v.slice(ls, p);
    const m = line.match(/^(\s*)([-*•])\s(\[( |x|X)\]\s)?/);
    if (!m) return;
    e.preventDefault();
    const prefix = m[1] + m[2] + ' ' + (m[3] ? '[ ] ' : '');
    if (line.trim() === m[0].trim()) { // élément vide → fin de la liste
      ta.setRangeText('', ls, p, 'end');
    } else {
      ta.setRangeText('\n' + prefix, p, p, 'end');
    }
    ta.dispatchEvent(new Event('input'));
  });

  view.addEventListener('click', (e) => {
    const cb = e.target.closest('.cb');
    const n = byId(current);
    if (!n) return;
    if (cb) {
      const i = Number(cb.closest('.ln').dataset.line);
      const lines = n.text.split('\n');
      lines[i] = lines[i].replace(/\[( |x|X)\]/, (m, s) => (s === ' ' ? '[x]' : '[ ]'));
      n.text = lines.join('\n'); ta.value = n.text;
      touch(n); renderView(); snd('tick');
      return;
    }
    const a = e.target.closest('a.lk');
    if (a) { e.preventDefault(); FX.open(a.dataset.href); snd('click'); return; }
    const ln = e.target.closest('.ln');
    setEditing(true, ln && ln.dataset.line !== undefined ? Number(ln.dataset.line) : n.text.split('\n').length - 1);
    if (!ln) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  });

  // ------------------------------------------------------------------ outils
  function toggleBold() {
    const n = byId(current); if (!n) return;
    if (!editing) setEditing(true, n.text.split('\n').length - 1);
    const a = ta.selectionStart, b = ta.selectionEnd, v = ta.value;
    const sel = v.slice(a, b);
    if (sel.startsWith('**') && sel.endsWith('**') && sel.length >= 4) ta.setRangeText(sel.slice(2, -2), a, b, 'select');
    else if (v.slice(a - 2, a) === '**' && v.slice(b, b + 2) === '**') { ta.setRangeText(sel, a - 2, b + 2, 'select'); }
    else if (a === b) { ta.setRangeText('****', a, b, 'end'); ta.setSelectionRange(a + 2, a + 2); }
    else ta.setRangeText(`**${sel}**`, a, b, 'select');
    ta.focus(); ta.dispatchEvent(new Event('input'));
  }
  function toggleCheck() {
    const n = byId(current); if (!n) return;
    if (!editing) setEditing(true, n.text.split('\n').length - 1);
    const v = ta.value;
    const a = v.lastIndexOf('\n', ta.selectionStart - 1) + 1;
    let b = v.indexOf('\n', ta.selectionEnd); if (b === -1) b = v.length;
    const lines = v.slice(a, b).split('\n');
    const allTask = lines.every((l) => TASK.test(l) || !l.trim());
    const out = lines.map((l) => {
      if (allTask) return l.replace(/^(\s*)[-*]\s\[( |x|X)\]\s?/, '$1');
      if (TASK.test(l)) return l;
      return l.replace(/^(\s*)(?:[-*•]\s+)?/, '$1- [ ] ');
    }).join('\n');
    ta.setRangeText(out, a, b, 'end');
    ta.focus(); ta.dispatchEvent(new Event('input'));
  }
  for (const id of ['#t-check', '#t-bold', '#t-pin', '#t-color', '#t-del']) $(id).addEventListener('mousedown', (e) => e.preventDefault());
  $('#t-bold').addEventListener('click', toggleBold);
  $('#t-check').addEventListener('click', toggleCheck);
  $('#t-pin').addEventListener('click', () => {
    const n = byId(current); if (!n) return;
    n.pinned = !n.pinned; saveNow(); renderTools(); renderList(); snd(n.pinned ? 'pop' : 'click');
    FX.toast(n.pinned ? '📌 Note épinglée en haut de la liste' : 'Note désépinglée');
  });
  const pal = $('#palette');
  pal.innerHTML = Object.keys(COLORS).map((k) => `<button type="button" role="menuitemradio" data-color="${k}"><i class="dot${k ? '' : ' none'}" style="--c:${COLORS[k].c}"></i><span>${COLORS[k].name}${COLORS[k].sub ? ` <small>${COLORS[k].sub}</small>` : ''}</span><svg class="ok" viewBox="0 0 24 24"><path d="m6 12.5 4 4L18 8"/></svg></button>`).join('');
  $('#t-color').addEventListener('click', (e) => {
    e.stopPropagation();
    const n = byId(current); if (!n) return;
    pal.hidden = !pal.hidden;
    for (const b of pal.querySelectorAll('button')) b.setAttribute('aria-checked', String(b.dataset.color === n.color));
    snd('click');
  });
  pal.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const n = byId(current); if (!n) return;
    n.color = b.dataset.color; saveNow(); pal.hidden = true;
    renderTools(); renderMeta(); renderFilters(); renderList(); snd('pop');
  });
  document.addEventListener('click', (e) => { if (!pal.hidden && !e.target.closest('.pal-wrap')) pal.hidden = true; });

  // supprimer avec annulation
  let undoState = null, undoTimer = 0;
  $('#t-del').addEventListener('click', () => {
    const n = byId(current); if (!n) return;
    const idx = notes.indexOf(n);
    notes.splice(idx, 1);
    saveNow(); snd('tear');
    undoState = { note: n, idx };
    const next = sorted()[0];
    if (narrow()) { current = null; app.classList.remove('show-editor', 'has-note'); renderList(); }
    else open(next ? next.id : null);
    if (!next) { current = null; app.classList.remove('has-note'); }
    renderFilters(); renderList();
    const u = $('#undo');
    $('#undo-txt').textContent = 'Note supprimée';
    $('#undo').title = n.title ? `« ${n.title} »` : '';
    u.hidden = false; u.classList.remove('out'); void u.offsetWidth; u.classList.add('in');
    clearTimeout(undoTimer);
    undoTimer = setTimeout(hideUndo, 6000);
  });
  function hideUndo() { const u = $('#undo'); u.classList.add('out'); setTimeout(() => { u.hidden = true; u.classList.remove('in', 'out'); }, 250); undoState = null; }
  $('#undo-btn').addEventListener('click', () => {
    if (!undoState) return;
    const { note, idx } = undoState;
    notes.splice(Math.min(idx, notes.length), 0, note);
    saveNow(); snd('pop'); clearTimeout(undoTimer); hideUndo();
    renderFilters(); open(note.id);
  });

  // ------------------------------------------------------------------ liste, recherche, filtres
  list.addEventListener('click', (e) => { const it = e.target.closest('.item'); if (it) { snd('click'); open(it.dataset.id); } });
  q.addEventListener('input', () => { $('#q-clear').hidden = !q.value; renderList(); });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { q.value = ''; $('#q-clear').hidden = true; renderList(); }
    if (e.key === 'Enter') { const it = list.querySelector('.item'); if (it) open(it.dataset.id); }
  });
  $('#q-clear').addEventListener('click', (e) => { e.preventDefault(); q.value = ''; $('#q-clear').hidden = true; renderList(); q.focus(); });
  $('#filters').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; filter = b.dataset.filter; snd('click'); renderFilters(); renderList(); });
  $('#new').addEventListener('click', newNote);
  $('#new2').addEventListener('click', newNote);
  $('#back').addEventListener('click', () => { if (saveTimer) saveNow(); app.classList.remove('show-editor'); setEditing(false); renderList(); snd('click'); });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.code === 'KeyN') { e.preventDefault(); newNote(); }
  });

  // une autre page (ou le panneau latéral) a modifié les notes
  FX.store.onChange((k) => {
    if (k !== KEY) return;
    const fresh = load(); if (!fresh) return;
    const mine = byId(current);
    const editingHere = mine && (document.activeElement === ta || document.activeElement === title);
    if (editingHere) { const i = fresh.findIndex((n) => n.id === mine.id); if (i >= 0) fresh[i] = mine; else fresh.push(mine); }
    notes = fresh;
    if (current && !byId(current)) { current = null; app.classList.remove('has-note', 'show-editor'); }
    else if (current && !editingHere) { const n = byId(current); title.value = n.title; ta.value = n.text; renderTools(); renderMeta(); if (!editing) renderView(); }
    renderFilters(); renderList();
  });

  // les dates relatives vieillissent
  setInterval(() => { if (!document.hidden) { renderList(); renderMeta(); } }, 60000);

  // ------------------------------------------------------------------ démarrage
  renderFilters();
  const first = sorted()[0];
  if (first && !narrow()) open(first.id);
  else renderList();

  window.ShoxNotes = { open, newNote, get notes() { return notes; }, get current() { return current; } };
})();
