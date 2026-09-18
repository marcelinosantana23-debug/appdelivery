const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

function createPng(width, height, drawPixel) {
  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
    }
    return ~c;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeInt32BE(crc32(typeAndData), 0);
    return Buffer.concat([len, typeAndData, crc]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idatData = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", idatData),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Draw renderer for Top Food Icon
function drawTopFoodIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const nx = x / w;
  const ny = y / h;

  // Background gradient: Red #DC2626 to Orange #EA580C
  const t = (nx + ny) / 2;
  let bgR = Math.round(220 + (234 - 220) * t);
  let bgG = Math.round(38 + (88 - 38) * t);
  let bgB = Math.round(38 + (12 - 38) * t);
  let bgA = 255;

  if (!isMaskable) {
    // Squircle rounding (r = 0.22 of size)
    const cornerR = w * 0.22;
    let distCorner = 0;
    if (x < cornerR && y < cornerR) distCorner = Math.hypot(cornerR - x, cornerR - y);
    else if (x > w - cornerR && y < cornerR) distCorner = Math.hypot(x - (w - cornerR), cornerR - y);
    else if (x < cornerR && y > h - cornerR) distCorner = Math.hypot(cornerR - x, y - (h - cornerR));
    else if (x > w - cornerR && y > h - cornerR) distCorner = Math.hypot(x - (w - cornerR), y - (h - cornerR));

    if (distCorner > cornerR) {
      return [0, 0, 0, 0]; // Transparent outside squircle
    }
  }

  // Normalized coordinates centered at (0, 0), normalized radius 0..1
  const scale = isMaskable ? 0.75 : 0.9;
  const dx = ((x - cx) / (w / 2)) / scale;
  const dy = ((y - cy) / (h / 2)) / scale;

  // 1. Cloche dome: center (0, -0.05), radius 0.48
  const clocheDist = Math.hypot(dx, dy + 0.05);
  const isClocheDome = dy <= 0.25 && dy >= -0.42 && clocheDist <= 0.48;

  // 2. Cloche handle: center (0, -0.47), radius 0.08
  const handleDist = Math.hypot(dx, dy + 0.47);
  const isHandle = handleDist <= 0.08;

  // 3. Cloche base plate: ellipse cx 0, cy 0.28, rx 0.58, ry 0.07
  const isPlate = Math.hypot(dx / 0.58, (dy - 0.28) / 0.07) <= 1.0;

  // 4. Ribbon bar: x between -0.65 and 0.65, y between 0.42 and 0.68
  const isRibbon = Math.abs(dx) <= 0.65 && dy >= 0.40 && dy <= 0.68;
  const isRibbonBorder = Math.abs(dx) <= 0.63 && dy >= 0.42 && dy <= 0.66;

  // 5. Lightning emblem inside cloche: centered at (0, -0.02)
  const isLightning =
    (dy >= -0.22 && dy <= 0.02 && Math.abs(dx - (-0.08 + (dy + 0.22) * 0.4)) <= 0.06) ||
    (dy >= -0.02 && dy <= 0.18 && Math.abs(dx - (0.04 - (dy - 0.02) * 0.4)) <= 0.06);

  if (isHandle) {
    // Gold handle
    return [245, 158, 11, 255];
  }

  if (isLightning) {
    // Gold lightning bolt inside cloche
    return [253, 224, 71, 255];
  }

  if (isClocheDome || isPlate) {
    // Crisp white cloche
    return [255, 255, 255, 255];
  }

  if (isRibbonBorder) {
    // Dark inner badge for "TOP FOOD" text
    return [24, 24, 27, 255];
  }

  if (isRibbon) {
    // White ribbon border
    return [255, 255, 255, 255];
  }

  // Steam waves: 3 small columns above cloche
  if (dy >= -0.68 && dy <= -0.52) {
    if (Math.abs(dx) <= 0.03 || Math.abs(dx - 0.14) <= 0.025 || Math.abs(dx + 0.14) <= 0.025) {
      return [253, 224, 71, 230];
    }
  }

  return [bgR, bgG, bgB, bgA];
}

const publicDir = path.join(process.cwd(), "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. icon-192.png (192x192)
fs.writeFileSync(
  path.join(publicDir, "icon-192.png"),
  createPng(192, 192, (x, y, w, h) => drawTopFoodIcon(x, y, w, h, false))
);

// 2. icon-512.png (512x512)
fs.writeFileSync(
  path.join(publicDir, "icon-512.png"),
  createPng(512, 512, (x, y, w, h) => drawTopFoodIcon(x, y, w, h, false))
);

// 3. apple-touch-icon.png (180x180)
fs.writeFileSync(
  path.join(publicDir, "apple-touch-icon.png"),
  createPng(180, 180, (x, y, w, h) => drawTopFoodIcon(x, y, w, h, false))
);

// 4. icon-maskable-512.png (512x512 with safe padding)
fs.writeFileSync(
  path.join(publicDir, "icon-maskable-512.png"),
  createPng(512, 512, (x, y, w, h) => drawTopFoodIcon(x, y, w, h, true))
);

// 5. favicon.ico / icon.png fallback
fs.writeFileSync(
  path.join(publicDir, "icon.png"),
  createPng(192, 192, (x, y, w, h) => drawTopFoodIcon(x, y, w, h, false))
);

console.log("Successfully generated all PWA PNG icons in public/!");
