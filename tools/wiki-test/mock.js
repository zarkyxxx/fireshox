// Faux serveur du Wiki Shox partagé : imite textdb.dev et catbox.moe sur la machine (http).
//
//   node tools/wiki-test/mock.js [port]        (port par défaut : 8790)
//
// Puis lancer Fire Shox avec :
//   --wiki-endpoint=http://127.0.0.1:8790  --wiki-upload=http://127.0.0.1:8790/user/api.php
//
// Comme textdb : GET /api/data/<clé> → le texte enregistré, ou "" si la clé est vide ;
//                POST /api/data/<clé> (corps = texte) → enregistre.
// Comme catbox : POST /user/api.php (multipart, reqtype=fileupload + fileToUpload)
//                → « https://files.catbox.moe/<nom>.<ext> » ; la photo est servie par GET /files/<nom>.
// Pilotage des tests :
//   GET  /__dump            → toutes les clés (JSON)
//   POST /__reset           → tout effacer
//   POST /__offline/on|off  → simule une panne (toutes les requêtes textdb/catbox échouent)
//   GET  /__log             → dernières requêtes
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2]) || 8790;
const SAVE = path.join(__dirname, '..', '..', '.cache', 'wiki-test', 'mock-data.json');

let db = {};
let files = {}; // nom → { type, b64 }
let offline = false;
const log = [];
try { ({ db = {}, files = {} } = JSON.parse(fs.readFileSync(SAVE, 'utf8'))); } catch {}
function persist() {
  try { fs.mkdirSync(path.dirname(SAVE), { recursive: true }); fs.writeFileSync(SAVE, JSON.stringify({ db, files })); } catch {}
}

const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };

function body(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on('data', (c) => { n += c.length; if (n > 8 * 1024 * 1024) { reject(new Error('trop gros')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseMultipart(buf, type) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(type || '');
  if (!m) return {};
  const boundary = Buffer.from('--' + (m[1] || m[2]));
  const out = {};
  let pos = buf.indexOf(boundary);
  while (pos !== -1) {
    const start = pos + boundary.length + 2;
    const next = buf.indexOf(boundary, start);
    if (next === -1) break;
    const part = buf.subarray(start, next - 2);
    const sep = part.indexOf('\r\n\r\n');
    if (sep !== -1) {
      const head = part.subarray(0, sep).toString();
      const name = /name="([^"]+)"/.exec(head)?.[1];
      const filename = /filename="([^"]*)"/.exec(head)?.[1];
      const ctype = /content-type:\s*([^\r\n]+)/i.exec(head)?.[1];
      const data = part.subarray(sep + 4);
      if (name) out[name] = filename !== undefined ? { filename, type: ctype, data } : data.toString();
    }
    pos = next;
  }
  return out;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const send = (status, text, type = 'application/json; charset=utf-8') => {
    res.writeHead(status, { 'content-type': type, 'access-control-allow-origin': '*' });
    res.end(text);
  };
  log.push(`${new Date().toISOString().slice(11, 19)} ${req.method} ${u.pathname}`);
  if (log.length > 200) log.shift();
  try {
    if (u.pathname === '/__dump') return send(200, JSON.stringify({ keys: Object.keys(db), db, files: Object.keys(files) }, null, 1));
    if (u.pathname === '/__log') return send(200, JSON.stringify(log, null, 1));
    if (u.pathname === '/__reset' && req.method === 'POST') { db = {}; files = {}; persist(); return send(200, '"ok"'); }
    if (u.pathname.startsWith('/__offline/')) { offline = u.pathname.endsWith('/on'); return send(200, JSON.stringify({ offline })); }

    if (offline) { req.socket.destroy(); return; }

    let m = /^\/api\/data\/([\w.-]{1,200})$/.exec(u.pathname);
    if (m) {
      const key = m[1];
      if (req.method === 'GET') {
        await new Promise((r) => setTimeout(r, 60));
        return send(200, Object.prototype.hasOwnProperty.call(db, key) ? db[key] : '""');
      }
      if (req.method === 'POST') {
        const b = (await body(req)).toString('utf8');
        db[key] = b;
        persist();
        await new Promise((r) => setTimeout(r, 60));
        return send(200, JSON.stringify({ ok: true }));
      }
    }
    if (u.pathname === '/user/api.php' && req.method === 'POST') {
      const form = parseMultipart(await body(req), req.headers['content-type']);
      const f = form.fileToUpload;
      if (form.reqtype !== 'fileupload' || !f || !f.data || !f.data.length) return send(400, 'Bad request', 'text/plain');
      const ext = (/\.([a-z0-9]+)$/i.exec(f.filename || '')?.[1] || 'jpg').toLowerCase();
      const name = Math.random().toString(36).slice(2, 8) + '.' + ext;
      files[name] = { type: f.type || TYPES[ext] || 'application/octet-stream', b64: f.data.toString('base64') };
      persist();
      return send(200, `https://files.catbox.moe/${name}`, 'text/plain');
    }
    m = /^\/files\/([\w.-]{1,80})$/.exec(u.pathname);
    if (m && files[m[1]]) {
      res.writeHead(200, { 'content-type': files[m[1]].type });
      return res.end(Buffer.from(files[m[1]].b64, 'base64'));
    }
    send(404, '"introuvable"');
  } catch (err) {
    send(500, JSON.stringify(String(err && err.message)));
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`[mock wiki] http://127.0.0.1:${PORT}  (${Object.keys(db).length} clés)`));
