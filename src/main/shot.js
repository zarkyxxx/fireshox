// ShoxShot — captures d'écran des onglets (processus principal).
//   • zone visible : webContents.capturePage()
//   • page entière : protocole DevTools (Page.captureScreenshot + captureBeyondViewport)
//   • zone choisie : rectangle tracé dans l'interface, capturé avec capturePage(rect)
// L'image reste ici (jamais de gros fichier qui transite) : l'interface reçoit un aperçu réduit et
// demande ensuite « copier », « enregistrer » ou « ouvrir le dossier ».
'use strict';
const { app, ipcMain, webContents, clipboard, nativeImage, shell, ClipboardItem } = require('electron');
const fs = require('fs');
const path = require('path');

const MAX_KEEP = 6; // captures gardées en mémoire (les plus récentes)
const MAX_FULL = 16000; // hauteur maximale d'une page entière, en pixels de l'écran

let hooks = {};
let seq = 0;
const shots = new Map(); // id → { img, wcId, saved }

function folder() {
  if (hooks.dir) return hooks.dir;
  try { return path.join(app.getPath('pictures'), 'Fire Shox'); } catch { return app.getPath('downloads'); }
}
function ensureFolder() {
  const dir = folder();
  try { fs.mkdirSync(dir, { recursive: true }); return dir; } catch {}
  const dl = app.getPath('downloads');
  try { fs.mkdirSync(dl, { recursive: true }); } catch {}
  return dl;
}
const pad = (n) => String(n).padStart(2, '0');
function fileName(d = new Date()) {
  return `ShoxShot-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`;
}
function uniquePath(p) {
  if (!fs.existsSync(p)) return p;
  const ext = path.extname(p), base = p.slice(0, -ext.length);
  for (let i = 2; i < 1000; i++) if (!fs.existsSync(`${base}-${i}${ext}`)) return `${base}-${i}${ext}`;
  return `${base}-${Date.now()}${ext}`;
}

// Onglet de CETTE interface (jamais celui d'une autre fenêtre).
function tabOf(e, contentsId) {
  const wc = webContents.fromId(+contentsId);
  if (!wc || wc.isDestroyed() || wc.getType() !== 'webview') return null;
  return wc.hostWebContents === e.sender ? wc : null;
}

// Pages qui font défiler un conteneur intérieur (wiki, applis web…) et pas le document : on fait défiler
// ce conteneur et on assemble les morceaux. Monde isolé : la page ne voit rien.
const WORLD = 4242;
const FIND_SCROLLER = `(() => {
  const de = document.scrollingElement || document.documentElement;
  if (de.scrollHeight > innerHeight + 4) return null;
  let best = null, area = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (el.scrollHeight <= el.clientHeight + 40) continue;
    const oy = getComputedStyle(el).overflowY;
    if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') continue;
    const r = el.getBoundingClientRect();
    const a = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    if (a > area) { area = a; best = el; }
  }
  if (!best || area < innerWidth * innerHeight * 0.25) return null;
  window.__fsxScroller = best;
  const r = best.getBoundingClientRect();
  return { x: Math.max(0, r.left + best.clientLeft), y: Math.max(0, r.top + best.clientTop), w: best.clientWidth, h: best.clientHeight,
    total: best.scrollHeight, start: best.scrollTop, dpr: devicePixelRatio || 1 };
})()`;
const HIDE_STUCK = `(() => {
  const sc = window.__fsxScroller;
  const r0 = sc.getBoundingClientRect();
  const hid = window.__fsxHidden || (window.__fsxHidden = []);
  for (const el of document.querySelectorAll('body *')) {
    if (el.style.visibility === 'hidden' || hid.some(([x]) => x === el)) continue;
    const p = getComputedStyle(el).position;
    if (p !== 'sticky' && p !== 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom <= r0.top || r.top >= r0.bottom || r.right <= r0.left || r.left >= r0.right) continue;
    if (p === 'sticky' && Math.abs(r.top - r0.top) > 3 && Math.abs(r.bottom - r0.bottom) > 3) continue; // collant mais pas « collé »
    hid.push([el, el.style.visibility]);
    el.style.visibility = 'hidden';
  }
  return hid.length;
})()`;
const inWorld = (wc, code) => wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code }]);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function captureScroller(wc, s) {
  const rect = { x: Math.round(s.x), y: Math.round(s.y), width: Math.max(1, Math.floor(s.w)), height: Math.max(1, Math.floor(s.h)) };
  const maxCss = Math.floor(MAX_FULL / s.dpr);
  const total = Math.min(s.total, maxCss);
  const parts = []; // { bmp, size, top (css) }
  try {
    for (let want = 0; want < total; want += rect.height) {
      const top = await inWorld(wc, `(() => { const el = window.__fsxScroller; el.scrollTop = ${want}; return el.scrollTop; })()`);
      // À partir du 2e morceau : en-têtes collants et éléments fixes cachés (sinon ils se répètent).
      if (want > 0) await inWorld(wc, HIDE_STUCK);
      await pause(140); // laisse la page se redessiner (images paresseuses…)
      const img = await wc.capturePage(rect);
      parts.push({ img, top: +top || 0 });
      if ((+top || 0) + rect.height >= total) break;
    }
  } finally {
    inWorld(wc, `(() => { const el = window.__fsxScroller; if (el) el.scrollTop = ${s.start}; delete window.__fsxScroller;
      for (const [x, v] of window.__fsxHidden || []) x.style.visibility = v; delete window.__fsxHidden; })()`).catch(() => {});
  }
  if (!parts.length) return null;
  const size = parts[0].img.getSize(); // pixels de l'écran
  const k = size.height / rect.height;
  const width = size.width;
  const height = Math.round(Math.min(total, parts[parts.length - 1].top + rect.height) * k);
  const out = Buffer.alloc(width * height * 4);
  for (const p of parts) {
    const bmp = p.img.toBitmap();
    const ps = p.img.getSize();
    const y0 = Math.round(p.top * k);
    const rows = Math.min(ps.height, height - y0);
    const w = Math.min(ps.width, width);
    for (let r = 0; r < rows; r++) bmp.copy(out, ((y0 + r) * width) * 4, (r * ps.width) * 4, (r * ps.width + w) * 4);
  }
  return { img: nativeImage.createFromBitmap(out, { width, height, scaleFactor: k }), cut: s.total > maxCss };
}

async function captureFull(wc) {
  let s = null;
  try { s = await inWorld(wc, FIND_SCROLLER); } catch {}
  if (s && s.total > s.h + 4) return captureScroller(wc, s);
  const dbg = wc.debugger;
  dbg.attach('1.3'); // échoue si les outils de développement inspectent déjà la page
  try {
    const m = await dbg.sendCommand('Page.getLayoutMetrics');
    const css = m.cssContentSize || m.contentSize;
    const dpr = m.contentSize && css.width ? Math.max(1, m.contentSize.width / css.width) : 1;
    const width = Math.max(1, Math.ceil(css.width));
    const full = Math.max(1, Math.ceil(css.height));
    const height = Math.min(full, Math.floor(MAX_FULL / dpr));
    const r = await dbg.sendCommand('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true, fromSurface: true, clip: { x: 0, y: 0, width, height, scale: 1 },
    });
    return { img: nativeImage.createFromBuffer(Buffer.from(r.data, 'base64')), cut: full > height };
  } finally {
    try { dbg.detach(); } catch {}
  }
}

function preview(img) {
  const { width, height } = img.getSize();
  // Aperçu léger : le haut de l'image si elle est très longue, 640 px de large au plus.
  const h = Math.min(height, Math.round(width * 1.6));
  let p = h < height ? img.crop({ x: 0, y: 0, width, height: h }) : img;
  if (width > 640) p = p.resize({ width: 640, quality: 'good' });
  return { dataUrl: p.toDataURL(), cropped: h < height };
}

function remember(img, wc) {
  const id = 'shot-' + (++seq);
  shots.set(id, { img, wcId: wc.id, saved: null });
  while (shots.size > MAX_KEEP) shots.delete(shots.keys().next().value);
  return id;
}

async function onCapture(e, contentsId, mode, rect) {
  if (!hooks.isUi(e)) return { ok: false };
  const wc = tabOf(e, contentsId);
  if (!wc) return { ok: false, error: 'onglet' };
  let img = null, cut = false, fallback = false;
  try {
    if (mode === 'full') {
      try { ({ img, cut } = await captureFull(wc)); } catch { fallback = true; }
    }
    if (mode === 'area' && rect && typeof rect === 'object') {
      const r = {
        x: Math.max(0, Math.round(+rect.x || 0)), y: Math.max(0, Math.round(+rect.y || 0)),
        width: Math.max(1, Math.round(+rect.width || 0)), height: Math.max(1, Math.round(+rect.height || 0)),
      };
      img = await wc.capturePage(r);
    }
    if (!img) img = await wc.capturePage();
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err).slice(0, 200) };
  }
  if (!img || img.isEmpty()) return { ok: false, error: 'vide' };
  const id = remember(img, wc);
  const size = img.getSize();
  return { ok: true, id, mode: fallback ? 'visible' : mode, fallback, cut, width: size.width, height: size.height, ...preview(img) };
}

async function onCopy(e, id) {
  if (!hooks.isUi(e)) return false;
  const s = shots.get(id);
  if (!s) return false;
  try {
    if (typeof clipboard.writeImage === 'function') clipboard.writeImage(s.img); // Electron d'avant la v44
    else await clipboard.write([new ClipboardItem({ 'image/png': new Blob([s.img.toPNG()], { type: 'image/png' }) })]);
    return true;
  } catch (err) {
    console.error('[ShoxShot] copie impossible :', err && err.message);
    return false;
  }
}

async function onSave(e, id) {
  if (!hooks.isUi(e)) return { ok: false };
  const s = shots.get(id);
  if (!s) return { ok: false, error: 'expirée' };
  if (s.saved && fs.existsSync(s.saved)) return { ok: true, path: s.saved, name: path.basename(s.saved), dir: path.dirname(s.saved), already: true };
  const dir = ensureFolder();
  const file = uniquePath(path.join(dir, fileName()));
  try { await fs.promises.writeFile(file, s.img.toPNG()); } catch (err) {
    return { ok: false, error: (err && err.code) || 'écriture' };
  }
  s.saved = file;
  return { ok: true, path: file, name: path.basename(file), dir };
}

function onOpenFolder(e, id) {
  if (!hooks.isUi(e)) return;
  const s = shots.get(id);
  if (s && s.saved && fs.existsSync(s.saved)) { shell.showItemInFolder(s.saved); return; }
  shell.openPath(ensureFolder());
}

function init(h) {
  hooks = h || {};
  ipcMain.handle('shot:capture', onCapture);
  ipcMain.handle('shot:copy', onCopy);
  ipcMain.handle('shot:save', onSave);
  ipcMain.on('shot:open-folder', onOpenFolder);
  ipcMain.on('shot:discard', (e, id) => { if (hooks.isUi(e)) shots.delete(id); });
  ipcMain.handle('shot:folder', (e) => (hooks.isUi(e) || (hooks.trusted && hooks.trusted(e)) ? folder() : null));
}

module.exports = { init, fileName };
