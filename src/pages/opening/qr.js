// Shox Opening — petit encodeur de QR codes (mode octets, versions 1 à 10), rendu SVG.
// Algorithme standard ISO 18004 (même méthode que la bibliothèque de Nayuki), sans dépendance.
//   SO_QR.matrix('fireshox://jeux/?game=squid', 'Q') → { size, dark: [[bool]] }
//   SO_QR.svg(texte, { ecl, eye, eyeIn, dark, light, hole }) → chaîne SVG
(function () {
  'use strict';

  const ECL = { L: [0, 1], M: [1, 0], Q: [2, 3], H: [3, 2] }; // [index tables, bits de format]
  const ECC_PER_BLOCK = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28],
  ];
  const NUM_BLOCKS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8],
  ];

  function rawModules(ver) {
    let r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const n = Math.floor(ver / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }
  const dataCodewords = (ver, e) => Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[e][ver] * NUM_BLOCKS[e][ver];

  function alignPositions(ver, size) {
    if (ver === 1) return [];
    const n = Math.floor(ver / 7) + 2;
    const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
    const out = [6];
    for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
    return out;
  }

  function gfMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
  }
  function rsDivisor(deg) {
    const r = new Array(deg).fill(0);
    r[deg - 1] = 1;
    let root = 1;
    for (let i = 0; i < deg; i++) {
      for (let j = 0; j < r.length; j++) {
        r[j] = gfMul(r[j], root);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return r;
  }
  function rsRemainder(data, div) {
    const r = div.map(() => 0);
    for (const b of data) {
      const f = b ^ r.shift();
      r.push(0);
      div.forEach((c, i) => { r[i] ^= gfMul(c, f); });
    }
    return r;
  }

  function matrix(text, eclName) {
    const [e, formatBits] = ECL[eclName || 'M'];
    const bytes = Array.from(new TextEncoder().encode(text));
    let ver = 1;
    for (; ver <= 10; ver++) {
      const cap = dataCodewords(ver, e) * 8;
      if (4 + 8 + bytes.length * 8 <= cap) break;
    }
    if (ver > 10) throw new Error('Texte trop long pour le QR');
    const size = ver * 4 + 17;

    // --- flux de bits
    const bits = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(0b0100, 4);
    put(bytes.length, 8);
    for (const b of bytes) put(b, 8);
    const capBits = dataCodewords(ver, e) * 8;
    put(0, Math.min(4, capBits - bits.length));
    put(0, (8 - (bits.length % 8)) % 8);
    for (let pad = 0xec; bits.length < capBits; pad ^= 0xec ^ 0x11) put(pad, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) {
      let v = 0;
      for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
      data.push(v);
    }

    // --- correction d'erreurs + entrelacement
    const nBlocks = NUM_BLOCKS[e][ver];
    const eccLen = ECC_PER_BLOCK[e][ver];
    const raw = Math.floor(rawModules(ver) / 8);
    const nShort = nBlocks - (raw % nBlocks);
    const shortLen = Math.floor(raw / nBlocks);
    const div = rsDivisor(eccLen);
    const blocks = [];
    for (let i = 0, k = 0; i < nBlocks; i++) {
      const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1));
      k += dat.length;
      const ecc = rsRemainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const all = [];
    for (let i = 0; i < blocks[0].length; i++) {
      blocks.forEach((blk, j) => {
        if (i !== shortLen - eccLen || j >= nShort) all.push(blk[i]);
      });
    }

    // --- motifs fixes
    const mod = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, d) => { mod[y][x] = d; fn[y][x] = true; };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, d !== 2 && d !== 4);
      }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    const al = alignPositions(ver, size);
    al.forEach((ax, i) => al.forEach((ay, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
    const drawFormat = (mask) => {
      const d = (formatBits << 3) | mask;
      let rem = d;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const b = ((d << 10) | rem) ^ 0x5412;
      const bit = (i) => ((b >>> i) & 1) !== 0;
      for (let i = 0; i <= 5; i++) set(8, i, bit(i));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
      set(8, size - 8, true);
    };
    drawFormat(0);
    if (ver >= 7) throw new Error('Version ≥ 7 non gérée');

    // --- placement en zigzag
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const up = ((right + 1) & 2) === 0;
          const y = up ? size - 1 - vert : vert;
          if (!fn[y][x] && i < all.length * 8) {
            mod[y][x] = ((all[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
        }
      }
    }

    // --- masque : on garde celui qui pénalise le moins
    const MASKS = [
      (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
      (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
    ];
    const applyMask = (m) => {
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x];
    };
    const penalty = () => {
      let p = 0;
      for (let pass = 0; pass < 2; pass++) {
        for (let a = 0; a < size; a++) {
          let run = 0, prev = null;
          for (let b = 0; b < size; b++) {
            const cur = pass ? mod[b][a] : mod[a][b];
            if (cur === prev) run++;
            else { if (run >= 5) p += run - 2; run = 1; prev = cur; }
          }
          if (run >= 5) p += run - 2;
        }
      }
      for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
        const c = mod[y][x];
        if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3;
      }
      const pat = [true, false, true, true, true, false, true];
      for (let y = 0; y < size; y++) for (let x = 0; x + 7 <= size; x++) {
        let h = true, v = true;
        for (let k = 0; k < 7; k++) { if (mod[y][x + k] !== pat[k]) h = false; if (mod[x + k][y] !== pat[k]) v = false; }
        if (h) p += 40; if (v) p += 40;
      }
      let dark = 0;
      for (const row of mod) for (const c of row) if (c) dark++;
      const total = size * size;
      p += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
      return p;
    };
    let best = 0, bestP = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(m); drawFormat(m);
      const p = penalty();
      if (p < bestP) { bestP = p; best = m; }
      applyMask(m);
    }
    applyMask(best); drawFormat(best);
    return { size, dark: mod, version: ver };
  }

  // Rendu SVG stylé : yeux arrondis colorés, modules légèrement arrondis, trou central optionnel
  // (le niveau Q tolère ~25 % de pertes, le trou en couvre moins de 7 %).
  function svg(text, o = {}) {
    const q = matrix(text, o.ecl || 'Q');
    const n = q.size, quiet = 2, W = n + quiet * 2;
    const dark = o.dark || '#111', eye = o.eye || dark, eyeIn = o.eyeIn || eye, light = o.light || '#fff';
    const hole = o.hole ? Math.max(5, Math.round(n * 0.24) | 1) : 0;
    const h0 = Math.floor((n - hole) / 2), h1 = h0 + hole;
    const inEye = (x, y) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
    let path = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (!q.dark[y][x] || inEye(x, y)) continue;
      if (hole && x >= h0 && x < h1 && y >= h0 && y < h1) continue;
      const X = x + quiet, Y = y + quiet;
      path += `M${X + 0.08} ${Y + 0.08}h0.84v0.84h-0.84z`;
    }
    const eyeAt = (x, y) => {
      const X = x + quiet, Y = y + quiet;
      return `<rect x="${X + 0.5}" y="${Y + 0.5}" width="6" height="6" rx="1.7" fill="none" stroke="${eye}" stroke-width="1"/>`
        + `<rect x="${X + 2}" y="${Y + 2}" width="3" height="3" rx="0.9" fill="${eyeIn}"/>`;
    };
    const holeSvg = hole ? `<rect x="${h0 + quiet + 0.35}" y="${h0 + quiet + 0.35}" width="${hole - 0.7}" height="${hole - 0.7}" rx="1.4" fill="${o.holeFill || light}"/>` : '';
    return `<svg class="qr-svg" viewBox="0 0 ${W} ${W}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">`
      + `<rect width="${W}" height="${W}" rx="2" fill="${light}"/>`
      + `<path d="${path}" fill="${dark}"/>`
      + `<g shape-rendering="geometricPrecision">${eyeAt(0, 0)}${eyeAt(n - 7, 0)}${eyeAt(0, n - 7)}${holeSvg}</g>`
      + `</svg>`;
  }

  window.SO_QR = { matrix, svg, hole: (text, ecl) => { const n = matrix(text, ecl || 'Q').size; return { n, hole: Math.max(5, Math.round(n * 0.24) | 1) }; } };
})();
