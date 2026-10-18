// fireshox://passwords — page de gestion ShoxVault.
// Les mots de passe ne passent par cette page que si on clique sur « afficher » ou « modifier » ;
// « copier » est fait par le processus principal. Tout texte venant d'un site (domaine, identifiant)
// est inséré avec textContent : jamais de HTML construit avec ces valeurs.
(function () {
  'use strict';
  if (window.top !== window) { document.documentElement.textContent = ''; return; } // jamais dans une iframe
  const V = window.shoxvault;
  const $ = (s) => document.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const ICONS = {
    eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    edit: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  };
  function svg(name) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'ic');
    s.innerHTML = ICONS[name]; // constantes ci-dessus uniquement
    return s;
  }
  function h(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }
  function iconBtn(name, title, cls) {
    const b = h('button', 'iconbtn' + (cls ? ' ' + cls : ''));
    b.type = 'button';
    b.title = title;
    b.setAttribute('aria-label', title);
    b.append(svg(name));
    return b;
  }
  const hueOf = (s) => { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return 14 + (x % 34); };
  const short = (host) => String(host || '').replace(/^www\./, '');
  const DOTS = '••••••••••••';
  const ERR = {
    unavailable: 'Chiffrement Windows indisponible : rien n\'a été enregistré',
    doublon: 'Cet identifiant existe déjà pour ce site', adresse: 'Adresse invalide : il faut un site en https (ou localhost)',
    'mot de passe': 'Mot de passe vide ou trop long', identifiant: 'Identifiant trop long', introuvable: 'Ce compte n\'existe plus',
  };
  const fail = (r) => FX.toast(ERR[r && r.error] || 'Oups, ça n\'a pas marché');

  let state = { available: true, entries: [], never: [] };
  const shown = new Map(); // id → { text, timer }
  let editing = null;
  let confirming = null;

  // ------------------------------------------------------------ réglages
  const DEF = { pwSave: true, pwAutofill: true };
  const settings = () => ({ ...(FX.store.get('settings', {}) || {}) });
  function loadSettings() {
    const s = settings();
    document.querySelectorAll('[data-key]').forEach((el) => { el.checked = (s[el.dataset.key] ?? DEF[el.dataset.key]) !== false; });
  }
  document.querySelectorAll('[data-key]').forEach((el) => el.addEventListener('change', () => {
    FX.store.set('settings', { ...settings(), [el.dataset.key]: el.checked });
    FX.sound('click');
    FX.toast('Réglage enregistré');
  }));
  FX.store.onChange((k) => { if (k === 'settings') loadSettings(); });

  // ------------------------------------------------------------ données
  async function load() {
    if (!V) {
      $('#list').replaceChildren(empty('🔒', 'Coffre inaccessible', 'Ouvre cette page dans Fire Shox.'));
      return;
    }
    const r = await V.list();
    if (!r) return;
    state = r;
    for (const id of [...shown.keys()]) if (!state.entries.some((e) => e.id === id)) forget(id);
    render();
  }

  function empty(big, title, text) {
    const d = h('div', 'empty');
    d.append(h('div', 'big', big), h('b', null, title), document.createTextNode(text));
    return d;
  }

  function forget(id) {
    const s = shown.get(id);
    if (s) clearTimeout(s.timer);
    shown.delete(id);
  }

  function render() {
    $('#warn').hidden = state.available !== false;
    $('#add').disabled = state.available === false;
    $('#import').disabled = state.available === false;
    const q = $('#q').value.trim().toLowerCase();
    const items = state.entries.filter((e) => !q || e.host.toLowerCase().includes(q) || e.username.toLowerCase().includes(q) || e.origin.includes(q));
    $('#count').textContent = state.entries.length ? `(${state.entries.length})` : '';
    const list = $('#list');
    if (!state.entries.length) {
      list.replaceChildren(empty('🔑', 'Aucun mot de passe pour l\'instant', 'Connecte-toi sur un site : ShoxVault te proposera de garder le mot de passe au chaud.'));
    } else if (!items.length) {
      list.replaceChildren(empty('🕳️', 'Aucun résultat', 'Essaie un autre site ou un autre identifiant.'));
    } else {
      const card = h('div', 'card');
      for (const e of items) card.append(editing === e.id ? editRow(e) : confirming === e.id ? confirmRow(e) : row(e));
      list.replaceChildren(card);
    }
    renderNever();
  }

  function siteCell(origin, host) {
    const site = h('div', 'site');
    site.append(h('b', null, short(host)));
    const small = h('small', origin.startsWith('http:') ? 'http' : null, origin.startsWith('http:') ? origin + ' · non chiffré' : origin);
    site.append(small);
    site.title = origin;
    return site;
  }

  function row(e) {
    const r = h('div', 'acc');
    r.dataset.id = e.id;
    const av = h('span', 'av', (short(e.host).charAt(0) || '?').toUpperCase());
    av.style.setProperty('--h', String(hueOf(e.host)));
    const user = h('div', 'user' + (e.username ? '' : ' none'), e.username || 'sans identifiant');
    user.title = e.username;
    const s = shown.get(e.id);
    const secret = h('div', 'secret' + (s ? ' shown' : ''), s ? s.text : DOTS);
    const acts = h('div', 'acts');
    const eye = iconBtn(s ? 'eyeoff' : 'eye', s ? 'Masquer le mot de passe' : 'Afficher le mot de passe', s ? 'on' : '');
    eye.addEventListener('click', () => toggleShow(e.id));
    const cp = iconBtn('copy', 'Copier le mot de passe');
    cp.addEventListener('click', async () => { if (await V.copy(e.id, 'password')) { FX.sound('pop'); FX.toast('Mot de passe copié 🔥'); } else fail(); });
    const cu = iconBtn('user', 'Copier l\'identifiant');
    cu.addEventListener('click', async () => { if (await V.copy(e.id, 'username')) FX.toast('Identifiant copié'); else fail(); });
    const ed = iconBtn('edit', 'Modifier');
    ed.addEventListener('click', () => { editing = e.id; confirming = null; render(); });
    const del = iconBtn('trash', 'Supprimer', 'danger');
    del.addEventListener('click', () => { confirming = e.id; editing = null; render(); });
    acts.append(eye, cp, cu, ed, del);
    r.append(av, siteCell(e.origin, e.host), user, secret, acts);
    return r;
  }

  async function toggleShow(id) {
    if (shown.has(id)) { forget(id); render(); return; }
    const text = await V.reveal(id);
    if (text == null) { fail(); return; }
    // Re-masqué tout seul au bout de 30 secondes.
    shown.set(id, { text, timer: setTimeout(() => { forget(id); render(); }, 30000) });
    render();
  }

  function editRow(e) {
    const box = h('form', 'edit');
    box.autocomplete = 'off';
    const head = h('div', 'head2');
    const av = h('span', 'av', (short(e.host).charAt(0) || '?').toUpperCase());
    av.style.setProperty('--h', String(hueOf(e.host)));
    head.append(av, h('span', null, 'Modifier le compte — '), h('span', 'fire-text', short(e.host)));
    const grid = h('div', 'grid2');
    const lu = h('label', null, 'Identifiant');
    const iu = h('input');
    iu.value = e.username;
    iu.spellcheck = false;
    lu.append(iu);
    const lp = h('label', null, 'Mot de passe');
    const wrap = h('span', 'pwfield');
    const ip = h('input');
    ip.type = 'password';
    ip.autocomplete = 'new-password';
    ip.placeholder = 'Chargement…';
    const tg = iconBtn('eye', 'Afficher');
    tg.addEventListener('click', () => { const on = ip.type === 'password'; ip.type = on ? 'text' : 'password'; tg.replaceChildren(svg(on ? 'eyeoff' : 'eye')); });
    wrap.append(ip, tg);
    lp.append(wrap);
    grid.append(lu, lp);
    const foot = h('div', 'formfoot');
    const cancel = h('button', 'fs-btn', 'Annuler');
    cancel.type = 'button';
    cancel.addEventListener('click', () => { editing = null; render(); });
    const ok = h('button', 'fs-btn fire', 'Enregistrer');
    ok.type = 'submit';
    foot.append(h('span', 'hint', 'Le nouveau mot de passe est rechiffré aussitôt.'), h('div', 'grow'), cancel, ok);
    box.append(head, grid, foot);
    let original = null;
    V.reveal(e.id).then((p) => { original = p; if (p != null && !ip.value) ip.value = p; ip.placeholder = ''; });
    box.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const patch = {};
      if (iu.value.trim() !== e.username) patch.username = iu.value;
      if (ip.value && ip.value !== original) patch.password = ip.value;
      if (!Object.keys(patch).length) { editing = null; render(); return; }
      const r = await V.update(e.id, patch);
      if (!r || !r.ok) { fail(r); return; }
      forget(e.id);
      editing = null;
      FX.sound('success');
      FX.toast('Compte mis à jour 🔥');
      load();
    });
    box.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { editing = null; render(); } });
    setTimeout(() => iu.focus(), 30);
    return box;
  }

  function confirmRow(e) {
    const box = h('div', 'confirm');
    const p = h('p');
    p.append('Supprimer le mot de passe de ', h('b', null, e.username || 'sans identifiant'), ' sur ', h('b', null, short(e.host)), ' ? C\'est définitif.');
    const foot = h('div', 'formfoot');
    const cancel = h('button', 'fs-btn', 'Annuler');
    cancel.addEventListener('click', () => { confirming = null; render(); });
    const del = h('button', 'fs-btn red', 'Supprimer');
    del.addEventListener('click', async () => {
      const r = await V.remove(e.id);
      confirming = null;
      if (!r || !r.ok) { fail(r); return; }
      forget(e.id);
      FX.sound('whoosh');
      FX.toast('Mot de passe supprimé');
      load();
    });
    foot.append(h('div', 'grow'), cancel, del);
    box.append(p, foot);
    setTimeout(() => cancel.focus(), 30);
    return box;
  }

  function renderNever() {
    const box = $('#never');
    if (!state.never.length) { box.replaceChildren(h('div', 'none-msg', 'Aucun site bloqué. Quand tu cliques sur « Jamais pour ce site », il apparaît ici.')); return; }
    box.replaceChildren(...state.never.map((n) => {
      const r = h('div', 'nv');
      const b = h('button', 'fs-btn', 'Retirer');
      b.title = 'ShoxVault pourra de nouveau proposer d\'enregistrer sur ce site';
      b.addEventListener('click', async () => { const res = await V.unblock(n.origin); if (res && res.ok) { FX.toast(`${short(n.host)} retiré de la liste`); load(); } });
      r.append(svg('ban'), siteCell(n.origin, n.host), b);
      return r;
    }));
  }

  // ------------------------------------------------------------ ajouter, importer
  const addform = $('#addform');
  $('#add').addEventListener('click', () => {
    addform.hidden = !addform.hidden;
    if (!addform.hidden) setTimeout(() => $('#a-url').focus(), 30);
  });
  $('#a-cancel').addEventListener('click', () => { addform.reset(); addform.hidden = true; });
  const tgl = addform.querySelector('[data-toggle]');
  tgl.append(svg('eye'));
  tgl.addEventListener('click', () => { const ip = $('#a-pass'); const on = ip.type === 'password'; ip.type = on ? 'text' : 'password'; tgl.replaceChildren(svg(on ? 'eyeoff' : 'eye')); });
  addform.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!$('#a-pass').value) { FX.toast('Il manque le mot de passe'); return; }
    const r = await V.add({ url: $('#a-url').value, username: $('#a-user').value, password: $('#a-pass').value });
    if (!r || !r.ok) { fail(r); return; }
    addform.reset();
    addform.hidden = true;
    FX.sound('success');
    FX.toast(r.result === 'updated' ? 'Compte mis à jour 🔥' : r.result === 'same' ? 'Ce compte était déjà dans le coffre' : 'Ajouté au coffre 🔥');
    load();
  });
  $('#import').addEventListener('click', async () => {
    const r = await V.importCsv();
    if (!r || r.canceled) return;
    if (!r.ok) { FX.toast(r.error === 'format' ? 'Ce fichier ne ressemble pas à un export de mots de passe' : ERR[r.error] || 'Import impossible'); return; }
    FX.sound('success');
    FX.toast(`Import : ${r.added} ajouté(s), ${r.updated} mis à jour, ${r.skipped} ignoré(s)`);
    load();
  });

  $('#q').addEventListener('input', render);
  if (V) V.onChange(load);
  loadSettings();
  load();
  $('#q').focus();
})();
