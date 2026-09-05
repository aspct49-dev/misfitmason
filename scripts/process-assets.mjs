/**
 * One-shot asset pipeline: takes the raw generated art from the project root and
 * writes web-ready files into public/.
 *
 * Run with: node scripts/process-assets.mjs
 *
 * Kept in the repo so regenerating a piece of art is a re-run rather than a
 * manual trip through an image editor.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const OUT = 'public';

/**
 * Splits a sprite sheet into per-object column runs.
 *
 * Presence of alpha is not enough to separate them: each object carries a soft
 * dark halo that bridges the gaps, so 94% of columns register as "filled".
 * Counting *visible* pixels per column instead — opaque and not near-black —
 * gives a density profile with clean valleys between the objects.
 */
function opaqueColumnRuns(data, width, height, minGap = 20, densityPct = 0.02) {
  const density = new Array(width).fill(0);
  for (let x = 0; x < width; x++) {
    let count = 0;
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 200 && data[i] + data[i + 1] + data[i + 2] > 90) count++;
    }
    density[x] = count;
  }

  const floor = Math.max(...density) * densityPct;
  const filled = density.map((d) => d > floor);

  const runs = [];
  let start = null;
  let gap = 0;
  for (let x = 0; x < width; x++) {
    if (filled[x]) {
      if (start === null) start = x;
      gap = 0;
    } else if (start !== null) {
      gap++;
      // Only close a run once the empty stretch is wide enough to be a real
      // separator rather than a gap inside one object (a hat brim, say).
      if (gap >= minGap) {
        runs.push([start, x - gap]);
        start = null;
        gap = 0;
      }
    }
  }
  if (start !== null) runs.push([start, width - 1]);
  return runs;
}

/**
 * Removes a flat backdrop colour by flood-filling inwards from the borders.
 *
 * A plain colour-distance key would eat the red on the poker chips; only pixels
 * reachable from the edge without crossing artwork are background.
 */
function keyFromBorders(data, width, height, tolerance = 62) {
  const idx = (x, y) => (y * width + x) * 4;
  const [br, bg, bb] = [data[0], data[1], data[2]];

  const matches = (x, y) => {
    const i = idx(x, y);
    const dr = data[i] - br;
    const dg = data[i + 1] - bg;
    const db = data[i + 2] - bb;
    return Math.sqrt(dr * dr + dg * dg + db * db) <= tolerance;
  };

  const seen = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) {
    stack.push([x, 0], [x, height - 1]);
  }
  for (let y = 0; y < height; y++) {
    stack.push([0, y], [width - 1, y]);
  }

  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const p = y * width + x;
    if (seen[p]) continue;
    if (!matches(x, y)) continue;
    seen[p] = 1;
    data[idx(x, y) + 3] = 0;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return data;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  // ---- Page texture -------------------------------------------------------
  // The source is white contour lines on a flat grey field. Turning luminance
  // into alpha and painting the result crimson gives an overlay that tints with
  // the brand and needs no CSS mask-mode support, which is still patchy.
  {
    const { data, info } = await sharp('12315.jpg')
      .resize({ width: 1800 })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const out = Buffer.alloc(info.width * info.height * 4);
    // The grey field sits around 77; the lines run to 255. Everything at or
    // below the field becomes fully transparent.
    const FLOOR = 95;
    const CEIL = 255;
    for (let i = 0, j = 0; i < data.length; i += info.channels, j += 4) {
      const a = Math.max(0, Math.min(255, Math.round(((data[i] - FLOOR) / (CEIL - FLOOR)) * 255)));
      out[j] = 227;
      out[j + 1] = 27;
      out[j + 2] = 69; // #E31B45
      out[j + 3] = a;
    }

    await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
      .webp({ quality: 80, alphaQuality: 100 })
      .toFile(`${OUT}/texture.webp`);
    console.log('texture.webp');
  }

  // ---- The room. Opaque, full-bleed, so it only needs resizing. ----
  await sharp('backdrop.png')
    .resize({ width: 2400, withoutEnlargement: false })
    .webp({ quality: 86 })
    .toFile(`${OUT}/lodge.webp`);
  console.log('lodge.webp');

  // ---- Light shaft. Stays opaque on black and is composited with `screen`,
  //      where black is a no-op, so no keying is needed. ----
  await sharp('light.png')
    .resize({ width: 1800 })
    .webp({ quality: 82 })
    .toFile(`${OUT}/light-shaft.webp`);
  console.log('light-shaft.webp');

  // ---- Foreground table edge. Already has alpha. ----
  await sharp('card.png')
    .resize({ width: 2400 })
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(`${OUT}/table-edge.webp`);
  console.log('table-edge.webp');

  // ---- Five props, sliced out of one sheet so line weight stays identical. ----
  const propNames = ['chip', 'card', 'dice', 'hat', 'keystone'];
  const props = sharp('5items.png').ensureAlpha();
  const { data, info } = await props.raw().toBuffer({ resolveWithObject: true });
  const runs = opaqueColumnRuns(data, info.width, info.height);
  console.log(`  found ${runs.length} objects in 5items.png`);

  for (let i = 0; i < runs.length && i < propNames.length; i++) {
    const [x0, x1] = runs[i];
    const pad = 12;
    const left = Math.max(0, x0 - pad);
    const width = Math.max(1, Math.min(info.width - left, x1 - x0 + 1 + pad * 2));
    // Two passes on purpose: sharp applies trim before extract within a single
    // pipeline, which puts the crop coordinates out of range.
    const slice = await sharp('5items.png')
      .extract({ left, top: 0, width, height: info.height })
      .png()
      .toBuffer();

    await sharp(slice)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
      .resize({ height: 520, fit: 'inside' })
      .webp({ quality: 90, alphaQuality: 100 })
      .toFile(`${OUT}/prop-${propNames[i]}.webp`);
    console.log(`  prop-${propNames[i]}.webp`);
  }

  // ---- Four feature tiles on a flat crimson field: key the field, split 2x2. ----
  const tileSrc = 'ce9bdfdb-810f-4f2a-9854-d9331da1c68d.png';
  const tileNames = ['podium', 'chips', 'battle', 'arch'];
  const t = sharp(tileSrc).ensureAlpha();
  const { data: tData, info: tInfo } = await t.raw().toBuffer({ resolveWithObject: true });
  keyFromBorders(tData, tInfo.width, tInfo.height);

  const keyed = await sharp(tData, {
    raw: { width: tInfo.width, height: tInfo.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const halfW = Math.floor(tInfo.width / 2);
  const halfH = Math.floor(tInfo.height / 2);
  const quadrants = [
    { left: 0, top: 0 },
    { left: halfW, top: 0 },
    { left: 0, top: halfH },
    { left: halfW, top: halfH },
  ];

  for (let i = 0; i < 4; i++) {
    const quad = await sharp(keyed)
      .extract({ ...quadrants[i], width: halfW, height: halfH })
      .png()
      .toBuffer();

    await sharp(quad)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
      .resize({ height: 420, fit: 'inside' })
      .webp({ quality: 90, alphaQuality: 100 })
      .toFile(`${OUT}/tile-${tileNames[i]}.webp`);
    console.log(`  tile-${tileNames[i]}.webp`);
  }

  // ---- Leaderboard ----------------------------------------------------------

  // The two banner frames arrived already keyed. They are NOT trimmed: the
  // content inside them is positioned as a percentage of the frame, so cropping
  // one and not the other would shift every overlay by a different amount.
  await sharp('lbframe.png')
    .resize({ width: 820 })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(`${OUT}/lb-frame.webp`);
  console.log('lb-frame.webp');

  await sharp('frame1.png')
    .resize({ width: 880 })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(`${OUT}/lb-frame-first.webp`);
  console.log('lb-frame-first.webp');

  await sharp('circle.png')
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
    .resize({ width: 320 })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(`${OUT}/seat-empty.webp`);
  console.log('seat-empty.webp');

  await sharp('prize.png')
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
    .resize({ height: 640, fit: 'inside' })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(`${OUT}/prize-chalice.webp`);
  console.log('prize-chalice.webp');

  // Three rank emblems on a flat crimson field. Flood-filling from the borders
  // rather than keying by colour distance: the emblems carry crimson gems of
  // their own, and only background reachable from an edge is background.
  const rankNames = ['crown', 'double', 'single'];
  const { data: rData, info: rInfo } = await sharp('medallion.png')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  keyFromBorders(rData, rInfo.width, rInfo.height);

  const rKeyed = await sharp(rData, {
    raw: { width: rInfo.width, height: rInfo.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const { data: kData, info: kInfo } = await sharp(rKeyed)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rankRuns = opaqueColumnRuns(kData, kInfo.width, kInfo.height);
  console.log(`  found ${rankRuns.length} emblems in medallion.png`);

  for (let i = 0; i < rankRuns.length && i < rankNames.length; i++) {
    const [x0, x1] = rankRuns[i];
    const pad = 10;
    const left = Math.max(0, x0 - pad);
    const width = Math.max(1, Math.min(kInfo.width - left, x1 - x0 + 1 + pad * 2));

    const slice = await sharp(rKeyed)
      .extract({ left, top: 0, width, height: kInfo.height })
      .png()
      .toBuffer();

    await sharp(slice)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
      .resize({ width: 280 })
      .webp({ quality: 92, alphaQuality: 100 })
      .toFile(`${OUT}/rank-${rankNames[i]}.webp`);
    console.log(`  rank-${rankNames[i]}.webp`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
