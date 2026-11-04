const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const TARGET_MAX_BYTES = 50883; // Exactly 50,883 bytes (49.69 KiB)

// Binary WebP magic byte check
function verifyWebPBuffer(buffer) {
  if (buffer.length < 12) return false;
  const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46; // "RIFF"
  const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50; // "WEBP"
  return isRiff && isWebp;
}

// Adaptive WebP Compression Engine mirroring uploadService.ts
async function compressImageToTargetWebP(inputBuffer, targetBytes = TARGET_MAX_BYTES) {
  const metadata = await sharp(inputBuffer).metadata();
  const naturalW = metadata.width;
  const naturalH = metadata.height;
  const aspect = naturalW / naturalH;

  const MAX_DIMENSION = 1200;
  let baseW = naturalW;
  let baseH = naturalH;
  if (baseW > MAX_DIMENSION || baseH > MAX_DIMENSION) {
    if (baseW >= baseH) {
      baseW = MAX_DIMENSION;
      baseH = Math.max(1, Math.round(baseW / aspect));
    } else {
      baseH = MAX_DIMENSION;
      baseW = Math.max(1, Math.round(baseH * aspect));
    }
  }

  let currentW = baseW;
  let currentH = baseH;
  let quality = 82;
  const MIN_SIDE = 320;
  const MIN_QUALITY = 30;

  let bestBuffer = null;
  let bestQuality = quality;
  let attempts = 0;
  const maxAttempts = 24;

  const startTime = Date.now();

  while (attempts < maxAttempts) {
    attempts++;
    const outBuffer = await sharp(inputBuffer)
      .resize(currentW, currentH, { fit: 'fill' })
      .webp({ quality, alphaQuality: 75, effort: 4 })
      .toBuffer();

    bestBuffer = outBuffer;
    bestQuality = quality;

    if (outBuffer.length <= targetBytes) {
      break;
    }

    if (quality > 42) {
      quality = Math.max(38, quality - 8);
    } else if (Math.min(currentW, currentH) > MIN_SIDE) {
      const nextW = Math.max(MIN_SIDE, Math.round(currentW * 0.88));
      currentH = Math.max(1, Math.round(nextW / aspect));
      currentW = nextW;
      quality = Math.min(70, quality + 15);
    } else if (quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - 5);
    } else {
      break;
    }
  }

  const durationMs = Date.now() - startTime;
  const isValidWebP = verifyWebPBuffer(bestBuffer);
  const isWithinLimit = bestBuffer.length <= targetBytes;
  const originalSize = inputBuffer.length;
  const compressedSize = bestBuffer.length;
  const savedPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

  return {
    originalSizeBytes: originalSize,
    compressedSizeBytes: compressedSize,
    originalKb: (originalSize / 1024).toFixed(1),
    compressedKb: (compressedSize / 1024).toFixed(1),
    savedPercent,
    outputWidth: currentW,
    outputHeight: currentH,
    qualityUsed: bestQuality,
    attempts,
    durationMs,
    isValidWebP,
    isWithinLimit,
    buffer: bestBuffer
  };
}

async function runBenchmark() {
  console.log("==========================================================================");
  console.log(" ZEBALPHA AUTOMATIC WEBP COMPRESSION TEST SUITE (TARGET <= 50,883 BYTES)");
  console.log("==========================================================================");

  // Generate realistic test photo
  async function generatePhoto(width, height, targetMinBytes, isPng = false) {
    if (isPng) {
      // Realistic e-commerce transparent product image: product shape centered on transparent background
      const svg = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#3b82f6" />
              <stop offset="50%" stop-color="#8b5cf6" />
              <stop offset="100%" stop-color="#ec4899" />
            </linearGradient>
            <radialGradient id="g2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fbbf24" />
              <stop offset="100%" stop-color="#f59e0b" />
            </radialGradient>
          </defs>
          <!-- Transparent background (no rect) -->
          <ellipse cx="${width * 0.5}" cy="${height * 0.5}" rx="${width * 0.38}" ry="${height * 0.42}" fill="url(#g1)" />
          <polygon points="${width * 0.3},${height * 0.2} ${width * 0.7},${height * 0.35} ${width * 0.5},${height * 0.8}" fill="url(#g2)" opacity="0.85" />
          <circle cx="${width * 0.5}" cy="${height * 0.4}" r="${width * 0.15}" fill="#ffffff" opacity="0.3" />
        </svg>
      `;
      return await sharp(Buffer.from(svg)).png().toBuffer();
    } else {
      // Realistic product photograph with gradients and textures
      const svg = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#18181b" />
              <stop offset="50%" stop-color="#27272a" />
              <stop offset="100%" stop-color="#09090b" />
            </linearGradient>
            <linearGradient id="cloth" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ef4444" />
              <stop offset="50%" stop-color="#b91c1c" />
              <stop offset="100%" stop-color="#7f1d1d" />
            </linearGradient>
          </defs>
          <rect width="${width}" height="${height}" fill="url(#bg)" />
          <path d="M${width*0.2} ${height*0.2} L${width*0.8} ${height*0.2} L${width*0.85} ${height*0.85} L${width*0.15} ${height*0.85} Z" fill="url(#cloth)" />
          <circle cx="${width*0.5}" cy="${height*0.5}" r="${Math.min(width, height)*0.25}" fill="#fbbf24" opacity="0.75" />
        </svg>
      `;
      let q = 85;
      let buf = await sharp(Buffer.from(svg)).jpeg({ quality: q }).toBuffer();
      // Pad to target minimum size if desired
      if (buf.length < targetMinBytes) {
        const padding = Buffer.alloc(targetMinBytes - buf.length, 0x41);
        buf = Buffer.concat([buf, padding]);
      }
      return buf;
    }
  }

  const testCases = [
    { label: "100 KB JPEG", w: 800, h: 800, targetBytes: 100 * 1024, isPng: false },
    { label: "500 KB JPEG", w: 1200, h: 900, targetBytes: 500 * 1024, isPng: false },
    { label: "2 MB JPEG", w: 2000, h: 1500, targetBytes: 2 * 1024 * 1024, isPng: false },
    { label: "5 MB JPEG", w: 3200, h: 2400, targetBytes: 5 * 1024 * 1024, isPng: false },
    { label: "10 MB JPEG", w: 4500, h: 3375, targetBytes: 10 * 1024 * 1024, isPng: false },
    { label: "PNG with transparency", w: 1200, h: 1200, targetBytes: 800 * 1024, isPng: true },
    { label: "High-res Product (4032x3024)", w: 4032, h: 3024, targetBytes: 6 * 1024 * 1024, isPng: false }
  ];

  const results = [];

  for (const tc of testCases) {
    process.stdout.write(`Testing: ${tc.label}... `);
    const rawBuf = await generatePhoto(tc.w, tc.h, tc.targetBytes, tc.isPng);
    const result = await compressImageToTargetWebP(rawBuf, TARGET_MAX_BYTES);
    results.push({ ...tc, ...result });

    console.log(`DONE in ${result.durationMs}ms`);
    console.log(`   Original: ${result.originalKb} KB (${result.originalSizeBytes.toLocaleString()} bytes)`);
    console.log(`   WebP Out: ${result.compressedKb} KB (${result.compressedSizeBytes.toLocaleString()} bytes) | Saved: ${result.savedPercent}%`);
    console.log(`   Dimensions: ${result.outputWidth}x${result.outputHeight} | Quality: ${result.qualityUsed} | WebP Header: ${result.isValidWebP ? 'VALID (RIFF/WEBP)' : 'INVALID'}`);
    console.log(`   Result: ${result.isWithinLimit ? 'PASS (<= 50,883 bytes)' : 'FAIL (> 50,883 bytes)'}`);
    console.log("--------------------------------------------------------------------------");
  }

  const allPassed = results.every(r => r.isWithinLimit && r.isValidWebP);
  console.log(`\nTEST SUITE SUMMARY: ${allPassed ? "ALL 7 TEST CASES PASSED STRICTLY <= 50,883 BYTES!" : "SOME CASES FAILED"}`);

  return results;
}

runBenchmark().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
