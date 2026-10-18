// Wiki Shox partagé — côté page : cache local, synchronisation, brouillons, pseudo.
// Le réseau passe UNIQUEMENT par window.fireshoxWiki (processus principal, voir src/main/wiki-cloud.js).
//
// Clés FX.store :
//   wiki.cloud.cache  { index: { pages: { slug: meta } }, pages: { slug: page }, at }  (lecture hors ligne)
//   wiki.brouillons   { slug: { base, data, summary, at, section } }                   (jamais perdre un texte)
//   wiki.pseudo       « Pseudo » des modifications
//   wiki.vu           { slug: révision vue }                                          (badge « modifié »)
(function () {
  'use strict';

  const api = window.fireshoxWiki || null;
  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const SYNC_MS = 60000;

  // ------------------------------------------------------------------ cache local
  function loadCache() {
    const c = FX.store.get('wiki.cloud.cache', null);
    const out = { index: { pages: {} }, pages: {}, at: 0 };
    if (!c || typeof c !== 'object') return out;
    if (c.index && c.index.pages && typeof c.index.pages === 'object') {
      for (const [slug, m] of Object.entries(c.index.pages)) if (SLUG_RE.test(slug) && m && Number.isInteger(m.revision)) out.index.pages[slug] = m;
    }
    if (c.pages && typeof c.pages === 'object') {
      for (const [slug, p] of Object.entries(c.pages)) if (SLUG_RE.test(slug) && p && p.data && Number.isInteger(p.revision)) out.pages[slug] = p;
    }
    out.at = Number(c.at) || 0;
    return out;
  }
  let cache = loadCache();
  const saveCache = () => FX.store.set('wiki.cloud.cache', cache);

  const state = { online: null, syncing: false, lastSync: cache.at || 0, error: '' };
  const listeners = new Set();
  const emit = (type, detail) => { for (const fn of listeners) { try { fn(type, detail); } catch (err) { console.error(err); } } };

  // ------------------------------------------------------------------ synchronisation
  let syncing = null;
  function sync() {
    if (!api) return Promise.resolve([]);
    if (syncing) return syncing;
    state.syncing = true;
    emit('status');
    syncing = (async () => {
      const changed = [];
      try {
        const r = await api.index();
        if (!r || !r.ok) { state.online = false; state.error = (r && r.error) || 'offline'; return changed; }
        cache.index = r.index;
        // Seulement les pages dont la révision a changé
        const todo = Object.entries(r.index.pages).filter(([slug, m]) => !cache.pages[slug] || cache.pages[slug].revision < m.revision);
        let failed = '';
        for (const [slug] of todo) {
          const p = await api.page(slug);
          if (!p || !p.ok) { failed = (p && p.error) || 'offline'; break; }
          if (p.page) { cache.pages[slug] = p.page; changed.push(slug); }
        }
        state.online = !failed;
        state.error = failed;
        state.lastSync = Date.now();
        cache.at = state.lastSync;
        saveCache();
        return changed;
      } catch {
        state.online = false;
        state.error = 'offline';
        return changed;
      } finally {
        state.syncing = false;
        syncing = null;
        emit('sync', changed);
        emit('status');
      }
    })();
    return syncing;
  }

  let timer = 0;
  function start() {
    if (!api) { state.online = false; state.error = 'absent'; emit('status'); return; }
    sync();
    clearInterval(timer);
    timer = setInterval(() => { if (!document.hidden) sync(); }, SYNC_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - state.lastSync > SYNC_MS) sync(); });
    addEventListener('online', () => sync());
  }

  // ------------------------------------------------------------------ lecture / écriture
  async function history(slug) {
    if (!api) return { ok: false, error: 'absent' };
    const r = await api.history(slug);
    if (r && r.ok) { state.online = true; emit('status'); } else if (r && r.error === 'offline') { state.online = false; emit('status'); }
    return r || { ok: false, error: 'offline' };
  }

  async function fetchPage(slug) {
    if (!api) return { ok: false, error: 'absent' };
    const r = await api.page(slug);
    if (r && r.ok && r.page) { cache.pages[slug] = r.page; saveCache(); }
    return r || { ok: false, error: 'offline' };
  }

  async function publish(req) {
    if (!api) return { ok: false, error: 'absent' };
    let r;
    try { r = await api.publish(req); } catch { r = { ok: false, error: 'offline' }; }
    r = r || { ok: false, error: 'offline' };
    if (r.ok && r.page) {
      state.online = true;
      cache.pages[r.page.slug] = r.page;
      cache.index.pages[r.page.slug] = r.meta || { title: r.page.title, revision: r.page.revision, modified: r.page.modified, author: r.page.author, summary: '' };
      saveCache();
      seen(r.page.slug, r.page.revision);
      emit('sync', [r.page.slug]);
    } else if (r.conflict && r.current) {
      state.online = true;
      cache.pages[r.current.slug] = r.current;
      saveCache();
    } else if (r.error === 'offline') state.online = false;
    emit('status');
    return r;
  }

  async function upload(type, bytes) {
    if (!api) return { ok: false, error: 'absent' };
    try { return (await api.upload({ type, bytes })) || { ok: false, error: 'offline' }; } catch { return { ok: false, error: 'offline' }; }
  }

  // ------------------------------------------------------------------ brouillons, pseudo, pages vues
  const drafts = {
    all: () => FX.store.get('wiki.brouillons', {}) || {},
    get: (slug) => drafts.all()[slug] || null,
    set(slug, d) { const all = drafts.all(); all[slug] = { ...d, at: Date.now() }; FX.store.set('wiki.brouillons', all); },
    remove(slug) { const all = drafts.all(); if (all[slug]) { delete all[slug]; FX.store.set('wiki.brouillons', all); } },
  };
  const pseudo = {
    get: () => { const p = FX.store.get('wiki.pseudo', ''); return typeof p === 'string' ? p : ''; },
    set: (p) => FX.store.set('wiki.pseudo', String(p || '').replace(/\s+/g, ' ').trim().slice(0, 32)),
  };
  function seenMap() { const v = FX.store.get('wiki.vu', {}); return v && typeof v === 'object' ? v : {}; }
  function seen(slug, rev) {
    const v = seenMap();
    if ((v[slug] || 0) >= rev) return;
    v[slug] = rev;
    FX.store.set('wiki.vu', v);
  }
  // Modifiée en ligne depuis ta dernière visite ?
  function isNew(slug) {
    const m = cache.index.pages[slug];
    return !!m && m.revision > (seenMap()[slug] || 0);
  }

  window.WikiCloud = {
    available: !!api,
    state,
    on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    start,
    sync,
    pages: () => cache.pages,
    page: (slug) => cache.pages[slug] || null,
    index: () => cache.index.pages,
    meta: (slug) => cache.index.pages[slug] || null,
    fetchPage,
    history,
    publish,
    upload,
    drafts,
    pseudo,
    seen,
    isNew,
    info: () => (api ? api.info() : Promise.resolve({ ok: false })),
  };
})();
