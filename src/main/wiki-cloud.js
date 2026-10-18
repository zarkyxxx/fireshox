// Wiki Shox en ligne — le wiki partagé par tous les Fire Shox (processus principal).
//
// Hébergement sans compte :
//   • textes : textdb.dev (clé → texte JSON), clés « <préfixe>-index », « <préfixe>-page-<slug> »,
//     « <préfixe>-hist-<slug> » ;
//   • photos : catbox.moe (envoi anonyme), servies par https://files.catbox.moe/….
//
// Règles de sécurité (ne pas assouplir) :
//   • Seule la page fireshox://wiki/ (cadre principal) peut appeler ces fonctions : l'adresse vient de
//     e.senderFrame (Chromium), jamais d'une valeur envoyée par la page.
//   • Le processus principal ne parle qu'à ces deux hôtes, et seulement avec le préfixe de clés ci-dessous.
//   • Tout ce qui est lu ou écrit est revalidé ici (forme, tailles, slugs, adresses d'images). La page
//     échappe de son côté TOUT le texte avant d'appliquer son balisage maison (voir wiki/wikitext.js).
'use strict';
const { ipcMain, net } = require('electron');

// ---------------------------------------------------------------------------
// Configuration (unique endroit à changer)
// ---------------------------------------------------------------------------
const CONFIG = {
  textdb: 'https://textdb.dev/api/data/',
  prefix: 'fireshox-wiki-pw32z8m76tnr9a0k',
  upload: 'https://catbox.moe/user/api.php',
  imageHost: 'files.catbox.moe',
};
const LIMITS = {
  page: 30000, // caractères (JSON des données d'une page)
  hist: 30, // versions gardées par page
  histChars: 300000, // taille max de l'historique d'une page (les plus anciennes partent d'abord)
  photo: 4 * 1024 * 1024,
  pages: 400, // pages dans l'index
  title: 120,
  author: 32,
  summary: 200,
};
const WIKI_ORIGIN = 'fireshox://wiki';
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMG_REMOTE = /^https:\/\/files\.catbox\.moe\/[A-Za-z0-9_-]{1,64}\.(?:jpe?g|png|gif|webp)$/i;
const IMG_LOCAL = /^\/assets\/(?:[A-Za-z0-9_-]+\/){0,4}[A-Za-z0-9_-][A-Za-z0-9_.-]{0,80}\.(?:jpe?g|png|gif|webp)$/i;
const IMG_FILE = /^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,80}\.(?:jpe?g|png|gif|webp)$/i;
const TYPES = {
  'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  'image/gif': { ext: 'gif', magic: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  'image/webp': { ext: 'webp', magic: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
};

let testMode = false;
let testFiles = ''; // faux serveur : adresse où sont servies les photos envoyées

const KEY = {
  index: () => `${CONFIG.prefix}-index`,
  page: (slug) => `${CONFIG.prefix}-page-${slug}`,
  hist: (slug) => `${CONFIG.prefix}-hist-${slug}`,
  test: () => `${CONFIG.prefix}-test`,
};

// ---------------------------------------------------------------------------
// Expéditeur : la page fireshox://wiki/, cadre principal, et rien d'autre.
// ---------------------------------------------------------------------------
function fromWiki(e) {
  const f = e && e.senderFrame;
  if (!f || f.parent) return false;
  let u;
  try { u = new URL(f.url); } catch { return false; }
  if (u.protocol !== 'fireshox:' || u.host !== 'wiki') return false;
  if (typeof f.origin === 'string' && f.origin && f.origin !== WIKI_ORIGIN) return false;
  const type = e.sender.getType();
  return type === 'webview' || type === 'window';
}

// Petits garde-fous de débit (par onglet).
const rates = new Map();
function allowed(e, kind, max, perMs = 60000) {
  const k = `${e.sender.id}:${kind}`;
  const now = Date.now();
  const r = rates.get(k) || { n: 0, t: now };
  if (now - r.t > perMs) { r.n = 0; r.t = now; }
  r.n += 1;
  rates.set(k, r);
  return r.n <= max;
}

// ---------------------------------------------------------------------------
// Réseau
// ---------------------------------------------------------------------------
function fail(code) { const err = new Error(code); err.code = code; return err; }

async function request(url, init = {}, ms = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await net.fetch(url, { ...init, signal: ctrl.signal, bypassCustomProtocolHandlers: true, credentials: 'omit', cache: 'no-store' });
  } catch {
    throw fail('offline');
  } finally {
    clearTimeout(timer);
  }
}

// textdb renvoie le texte enregistré ; une clé vide ou absente donne "" (chaîne JSON vide).
function decode(txt) {
  const s = String(txt || '').trim();
  if (!s) return null;
  let v;
  try { v = JSON.parse(s); } catch { throw fail('format'); }
  if (typeof v === 'string') {
    if (!v.trim()) return null;
    try { v = JSON.parse(v); } catch { throw fail('format'); }
  }
  return v && typeof v === 'object' ? v : null;
}

async function readKey(key) {
  const r = await request(CONFIG.textdb + encodeURIComponent(key), { headers: { accept: 'application/json' } });
  if (r.status === 404) return null;
  if (!r.ok) throw fail('http');
  const txt = await r.text();
  if (txt.length > 3000000) throw fail('format');
  return decode(txt);
}

async function writeKey(key, value) {
  const body = JSON.stringify(value);
  const r = await request(CONFIG.textdb + encodeURIComponent(key), {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body,
  });
  if (!r.ok) throw fail('http');
  try { await r.text(); } catch {}
}

// ---------------------------------------------------------------------------
// Validation (tout ce qui entre ou sort)
// ---------------------------------------------------------------------------
const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, max) : '');
const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const int = (v) => (Number.isInteger(v) && v >= 0 && v < 1e9 ? v : null);
const time = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 1e14 ? Math.round(v) : 0);

function cleanImg(v) {
  const s = str(v, 300).trim();
  if (!s) return '';
  if (IMG_REMOTE.test(s) || IMG_LOCAL.test(s) || IMG_FILE.test(s)) return s;
  return '';
}

function cleanAuthor(v) {
  const s = str(v, 60).replace(/\s+/g, ' ').trim().slice(0, LIMITS.author);
  return s.length >= 2 ? s : '';
}

function cleanData(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  return {
    titre: str(d.titre, LIMITS.title).replace(/\s+/g, ' ').trim(),
    chapeau: str(d.chapeau, 400),
    resume: str(d.resume, LIMITS.page),
    photo: cleanImg(d.photo),
    legende: str(d.legende, 400),
    cadrage: typeof d.cadrage === 'string' && /^\d{1,3}% \d{1,3}%$/.test(d.cadrage) ? d.cadrage : '',
    ebauche: d.ebauche === true,
    statut: d.statut === 'enrichissement' ? 'enrichissement' : '',
    infobox: arr(d.infobox, 40)
      .map((r) => [str(Array.isArray(r) ? r[0] : '', 80), str(Array.isArray(r) ? r[1] : '', 800)])
      .filter((r) => r[0].trim() || r[1].trim()),
    sections: arr(d.sections, 60)
      .map((s) => [str(Array.isArray(s) ? s[0] : '', 150), str(Array.isArray(s) ? s[1] : '', LIMITS.page), Array.isArray(s) && s[2] === 3 ? 3 : 2])
      .filter((s) => s[0].trim() || s[1].trim()),
    galerie: arr(d.galerie, 40)
      .map((g) => [cleanImg(Array.isArray(g) ? g[0] : ''), str(Array.isArray(g) ? g[1] : '', 400)])
      .filter((g) => g[0]),
    voirAussi: [...new Set(arr(d.voirAussi, 30).map((x) => str(x, 60)).filter((x) => SLUG_RE.test(x)))],
    categories: [...new Set(arr(d.categories, 20).map((x) => str(x, 60).replace(/\s+/g, ' ').trim()).filter(Boolean))],
  };
}

function cleanPage(v, slug) {
  if (!v || typeof v !== 'object') return null;
  const revision = int(v.revision);
  const data = cleanData(v.data);
  if (v.slug !== slug || !revision || !data || !data.titre) return null;
  return { slug, title: data.titre, revision, modified: time(v.modified), author: cleanAuthor(v.author) || 'Anonyme', data };
}

function cleanHist(v) {
  return arr(v, LIMITS.hist + 5).map((h) => {
    if (!h || typeof h !== 'object') return null;
    const revision = int(h.revision);
    const data = cleanData(h.data);
    if (!revision || !data) return null;
    return { revision, date: time(h.date), author: cleanAuthor(h.author) || 'Anonyme', summary: str(h.summary, LIMITS.summary), title: data.titre, data };
  }).filter(Boolean).sort((a, b) => a.revision - b.revision).slice(-LIMITS.hist);
}

function cleanIndex(v) {
  const out = { pages: {} };
  const pages = v && typeof v === 'object' && v.pages && typeof v.pages === 'object' ? v.pages : {};
  let n = 0;
  for (const [slug, m] of Object.entries(pages)) {
    if (n >= LIMITS.pages) break;
    if (!SLUG_RE.test(slug) || slug.length > 60 || !m || typeof m !== 'object') continue;
    const revision = int(m.revision);
    if (!revision) continue;
    out.pages[slug] = {
      title: str(m.title, LIMITS.title).trim() || slug,
      revision,
      modified: time(m.modified),
      author: cleanAuthor(m.author) || 'Anonyme',
      summary: str(m.summary, 120),
    };
    n += 1;
  }
  return out;
}

function trimHist(hist) {
  let h = hist.slice(-LIMITS.hist);
  while (h.length > 1 && JSON.stringify(h).length > LIMITS.histChars) h = h.slice(1);
  return h;
}

// ---------------------------------------------------------------------------
// Opérations
// ---------------------------------------------------------------------------
const errOf = (err) => (err && ['offline', 'http', 'format'].includes(err.code) ? err.code : 'offline');

async function getIndex(e) {
  if (!fromWiki(e)) return { ok: false, error: 'refus' };
  if (!allowed(e, 'read', 120)) return { ok: false, error: 'trop-vite' };
  try { return { ok: true, index: cleanIndex(await readKey(KEY.index())) }; } catch (err) { return { ok: false, error: errOf(err) }; }
}

async function getPage(e, slug) {
  if (!fromWiki(e)) return { ok: false, error: 'refus' };
  slug = str(slug, 60);
  if (!SLUG_RE.test(slug)) return { ok: false, error: 'slug' };
  if (!allowed(e, 'read', 120)) return { ok: false, error: 'trop-vite' };
  try { return { ok: true, page: cleanPage(await readKey(KEY.page(slug)), slug) }; } catch (err) { return { ok: false, error: errOf(err) }; }
}

async function getHist(e, slug) {
  if (!fromWiki(e)) return { ok: false, error: 'refus' };
  slug = str(slug, 60);
  if (!SLUG_RE.test(slug)) return { ok: false, error: 'slug' };
  if (!allowed(e, 'read', 120)) return { ok: false, error: 'trop-vite' };
  try { return { ok: true, hist: cleanHist(await readKey(KEY.hist(slug))) }; } catch (err) { return { ok: false, error: errOf(err) }; }
}

// Écritures une par une (deux publications du même navigateur ne se croisent jamais).
let chain = Promise.resolve();
function serial(fn) {
  const p = chain.then(fn, fn);
  chain = p.catch(() => {});
  return p;
}

async function publish(e, req) {
  if (!fromWiki(e)) return { ok: false, error: 'refus' };
  if (!req || typeof req !== 'object') return { ok: false, error: 'format' };
  const slug = str(req.slug, 60);
  if (!SLUG_RE.test(slug)) return { ok: false, error: 'slug' };
  const data = cleanData(req.data);
  if (!data || !data.titre) return { ok: false, error: 'titre' };
  if (JSON.stringify(data).length > LIMITS.page) return { ok: false, error: 'trop-long' };
  const author = cleanAuthor(req.author);
  if (!author) return { ok: false, error: 'pseudo' };
  const summary = str(req.summary, LIMITS.summary).replace(/\s+/g, ' ').trim();
  const base = int(req.base) ?? -1;
  if (!allowed(e, 'write', 12)) return { ok: false, error: 'trop-vite' };

  return serial(async () => {
    try {
      // 1. Tout relire d'abord : si une lecture échoue, rien n'est écrit.
      const [rawPage, rawHist, rawIndex] = await Promise.all([readKey(KEY.page(slug)), readKey(KEY.hist(slug)), readKey(KEY.index())]);
      const current = cleanPage(rawPage, slug);
      const curRev = current ? current.revision : 0;
      // 2. Quelqu'un a publié entre-temps → conflit (la page choisit quelle version garder).
      if (curRev !== base) return { ok: false, conflict: true, current };
      if (base === 0 && req.create === true && current) return { ok: false, conflict: true, current };
      const now = Date.now();
      const page = { slug, title: data.titre, revision: curRev + 1, modified: now, author, data };
      // 3. Page, historique, puis index (relu juste avant d'écrire pour ne rien écraser).
      await writeKey(KEY.page(slug), page);
      const hist = cleanHist(rawHist);
      hist.push({ revision: page.revision, date: now, author, summary, title: data.titre, data });
      await writeKey(KEY.hist(slug), trimHist(hist));
      let index = cleanIndex(rawIndex);
      try { index = cleanIndex(await readKey(KEY.index())); } catch {}
      index.pages[slug] = { title: data.titre, revision: page.revision, modified: now, author, summary: summary.slice(0, 120) };
      await writeKey(KEY.index(), index);
      return { ok: true, page, meta: index.pages[slug] };
    } catch (err) {
      return { ok: false, error: errOf(err) };
    }
  });
}

function multipart(fields, file) {
  const boundary = '----FireShoxWiki' + Math.random().toString(16).slice(2) + Date.now().toString(16);
  const parts = [];
  for (const [k, v] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  }
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="${file.name}"\r\nContent-Type: ${file.type}\r\n\r\n`));
  parts.push(file.buf);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return { body: Buffer.concat(parts), type: `multipart/form-data; boundary=${boundary}` };
}

async function upload(e, file) {
  if (!fromWiki(e)) return { ok: false, error: 'refus' };
  if (!file || typeof file !== 'object') return { ok: false, error: 'format' };
  const t = TYPES[str(file.type, 40)];
  if (!t) return { ok: false, error: 'type' };
  const bytes = file.bytes;
  if (!bytes || typeof bytes.byteLength !== 'number' || !ArrayBuffer.isView(bytes)) return { ok: false, error: 'format' };
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (!buf.length) return { ok: false, error: 'format' };
  if (buf.length > LIMITS.photo) return { ok: false, error: 'trop-lourd' };
  if (buf.length < 12 || !t.magic(buf)) return { ok: false, error: 'type' };
  if (!allowed(e, 'upload', 20)) return { ok: false, error: 'trop-vite' };
  const name = `wiki-shox-${Date.now().toString(36)}.${t.ext}`;
  const mp = multipart({ reqtype: 'fileupload' }, { name, type: str(file.type, 40), buf: Buffer.from(buf) });
  let r;
  try {
    r = await request(CONFIG.upload, { method: 'POST', headers: { 'content-type': mp.type }, body: mp.body }, 60000);
  } catch (err) {
    return { ok: false, error: errOf(err) };
  }
  if (!r.ok) return { ok: false, error: 'http' };
  const url = (await r.text()).trim();
  if (!IMG_REMOTE.test(url)) return { ok: false, error: 'format' };
  return { ok: true, url };
}

function info(e) {
  if (!fromWiki(e)) return { ok: false };
  return { ok: true, test: testMode, limits: { page: LIMITS.page, hist: LIMITS.hist, photo: LIMITS.photo, author: LIMITS.author, summary: LIMITS.summary } };
}

// ---------------------------------------------------------------------------
// Mise en route
// ---------------------------------------------------------------------------
// Adresses de test (faux serveur tools/wiki-test/mock.js), seulement si l'argument est fourni, et
// seulement sur la machine elle-même.
function localUrl(v) {
  if (typeof v !== 'string' || !v) return null;
  let u;
  try { u = new URL(v); } catch { return null; }
  if (u.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(u.hostname) || u.username || u.password) return null;
  return u;
}

function init(opts = {}) {
  const ep = localUrl(opts.endpoint);
  if (ep) { CONFIG.textdb = `${ep.origin}/api/data/`; testMode = true; }
  const up = localUrl(opts.upload);
  if (up) { CONFIG.upload = up.href; testFiles = `${up.origin}/files/`; testMode = true; }
  if (testMode) console.log('[wiki] faux serveur :', CONFIG.textdb, CONFIG.upload);
  ipcMain.handle('wiki:info', info);
  ipcMain.handle('wiki:index', getIndex);
  ipcMain.handle('wiki:page', getPage);
  ipcMain.handle('wiki:hist', getHist);
  ipcMain.handle('wiki:publish', publish);
  ipcMain.handle('wiki:upload', upload);
}

// Tests seulement : les photos « https://files.catbox.moe/… » sont servies par le faux serveur, pour que
// la page garde exactement les mêmes adresses (et la même politique de sécurité) qu'en vrai.
function setupSession(ses) {
  if (!testFiles || !ses) return;
  try {
    ses.protocol.handle('https', (req) => {
      let u = null;
      try { u = new URL(req.url); } catch {}
      if (u && u.hostname === CONFIG.imageHost) return net.fetch(testFiles + u.pathname.replace(/^\/+/, ''), { bypassCustomProtocolHandlers: true });
      return net.fetch(req, { bypassCustomProtocolHandlers: true });
    });
  } catch (err) { console.error('[wiki] interception de test impossible', err && err.message); }
}

module.exports = { init, setupSession, CONFIG, LIMITS, cleanData, cleanIndex, cleanPage, cleanHist, fromWiki, KEY, decode };
