// Détourage du logo Fire Shox : on retire le fond noir extérieur à l'anneau de feu.
// Le noir relié au bord de l'image devient transparent ; les flammes qui s'y fondent
// gardent leur lueur (alpha tiré de la luminosité, couleur « dé-prémultipliée »).
// Posé sur du noir, le résultat est identique à l'original.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(__dirname, 'logo-source.webp');
const ASSETS = path.join(ROOT, 'assets');
const BUILD = path.join(ROOT, 'build');

const THRESHOLD = 34;   // noir « de fond » si max(r,g,b) < seuil
const SOFT = 5;         // bord adouci (px) entre fond et sujet

async function main() {
  fs.mkdirSync(ASSETS, { recursive: true });
  fs.mkdirSync(BUILD, { recursive: true });
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const maxc = new Uint8Array(N);
  for (let i = 0; i < N; i++) maxc[i] = Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);

  // 1. Remplissage depuis les bords : tout le noir relié à l'extérieur.
  const ext = new Uint8Array(N);
  const stack = new Int32Array(N);
  let sp = 0;
  const push = (i) => { if (!ext[i] && maxc[i] < THRESHOLD) { ext[i] = 1; stack[sp++] = i; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (sp > 0) {
    const i = stack[--sp], x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1);
    if (x < W - 1) push(i + 1);
    if (y > 0) push(i - W);
    if (y < H - 1) push(i + W);
  }

  // 2. Distance (chanfrein) au fond, pour adoucir le bord.
  const INF = 1e9;
  const dist = new Float32Array(N);
  for (let i = 0; i < N; i++) dist[i] = ext[i] ? 0 : INF;
  const D1 = 1, D2 = Math.SQRT2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; let d = dist[i];
    if (x > 0) d = Math.min(d, dist[i - 1] + D1);
    if (y > 0) {
      d = Math.min(d, dist[i - W] + D1);
      if (x > 0) d = Math.min(d, dist[i - W - 1] + D2);
      if (x < W - 1) d = Math.min(d, dist[i - W + 1] + D2);
    }
    dist[i] = d;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x; let d = dist[i];
    if (x < W - 1) d = Math.min(d, dist[i + 1] + D1);
    if (y < H - 1) {
      d = Math.min(d, dist[i + W] + D1);
      if (x < W - 1) d = Math.min(d, dist[i + W + 1] + D2);
      if (x > 0) d = Math.min(d, dist[i + W - 1] + D2);
    }
    dist[i] = d;
  }

  // 3. Alpha + couleur dé-prémultipliée.
  const out = Buffer.alloc(N * 4);
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let i = 0; i < N; i++) {
    const glow = Math.pow(Math.min(1, Math.max(0, (maxc[i] - 6) / 150)), 0.85);
    let a = ext[i] ? glow : Math.max(glow, Math.min(1, dist[i] / SOFT));
    if (a < 0.012) a = 0;
    const o = i * 4;
    if (a > 0) {
      out[o] = Math.min(255, Math.round(data[i * 3] / a));
      out[o + 1] = Math.min(255, Math.round(data[i * 3 + 1] / a));
      out[o + 2] = Math.min(255, Math.round(data[i * 3 + 2] / a));
      out[o + 3] = Math.round(a * 255);
      if (a > 0.06) {
        const x = i % W, y = (i / W) | 0;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }

  // 4. Recadrage carré centré sur le sujet.
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const side = Math.min(W, H, Math.round(Math.max(maxX - minX, maxY - minY) * 1.03));
  const left = Math.max(0, Math.min(W - side, Math.round(cx - side / 2)));
  const top = Math.max(0, Math.min(H - side, Math.round(cy - side / 2)));
  const full = sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left, top, width: side, height: side });
  const master = await full.png().toBuffer();

  await sharp(master).resize(1024, 1024).png().toFile(path.join(ASSETS, 'logo.png'));
  for (const s of [512, 256, 128, 64, 32]) {
    await sharp(master).resize(s, s, { kernel: 'lanczos3' }).png().toFile(path.join(ASSETS, `logo-${s}.png`));
  }
  // Icônes : petites tailles un peu plus contrastées pour rester lisibles.
  const icoSizes = [256, 128, 64, 48, 32, 24, 16];
  const pngs = [];
  for (const s of icoSizes) {
    let p = sharp(master).resize(s, s, { kernel: 'lanczos3' });
    if (s <= 48) p = p.modulate({ saturation: 1.25, brightness: 1.08 }).sharpen();
    pngs.push(await p.png().toBuffer());
  }
  await sharp(master).resize(512, 512).png().toFile(path.join(BUILD, 'icon.png'));
  const { default: pngToIco } = await import('png-to-ico');
  fs.writeFileSync(path.join(BUILD, 'icon.ico'), await pngToIco(pngs));
  fs.copyFileSync(path.join(BUILD, 'icon.ico'), path.join(ASSETS, 'icon.ico'));

  // Contrôles visuels : logo posé sur blanc, sur gris et sur le fond de l'appli.
  const preview = path.join(ROOT, '.cache', 'logo-preview.png');
  const tile = await sharp(master).resize(420, 420).png().toBuffer();
  const bgs = [{ r: 255, g: 255, b: 255 }, { r: 120, g: 120, b: 128 }, { r: 14, g: 13, b: 20 }];
  await sharp({ create: { width: 1300, height: 440, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
    .composite(await Promise.all(bgs.map(async (bg, k) => ({
      input: await sharp({ create: { width: 420, height: 420, channels: 4, background: { ...bg, alpha: 1 } } })
        .composite([{ input: tile }]).png().toBuffer(),
      left: 10 + k * 430, top: 10,
    }))))
    .png().toFile(preview);
  console.log('logo ok', { side, left, top, preview });
}

main().catch((e) => { console.error(e); process.exit(1); });
