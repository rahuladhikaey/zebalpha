/**
 * Client-side Smart Background Removal Engine for ZebAlpha Custom Studio.
 * Handles white, black, cream, or solid colored rectangular backgrounds on both
 * Cloudinary CDN Vault artworks and Customer Uploaded images with 2px anti-aliased
 * edge de-fringing, interior enclosed gap cleanup (e.g. inside lettering), and auto-trim.
 */

export interface BgRemovalResult {
  dataUrl: string;
  blob: Blob;
  detectedBgHex: string;
  alreadyTransparent: boolean;
}

const REMOVAL_CACHE = new Map<string, BgRemovalResult>();

function rgbToHex(r: number, g: number, b: number): string {
  const toH = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${toH(r)}${toH(g)}${toH(b)}`;
}

function loadCorsSafeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const isRemote = /^https?:\/\//i.test(src);
    if (isRemote) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load artwork image for background removal."));

    // Append tiny cache-buster on remote CDN URLs so browser never reuses a non-CORS cached response
    if (isRemote) {
      const sep = src.includes("?") ? "&" : "?";
      img.src = `${src}${sep}bgrm=1`;
    } else {
      img.src = src;
    }
  });
}

/**
 * Removes the background from a design image and returns a crisp, auto-trimmed transparent PNG.
 * @param imageSrc Cloudinary URL or Data/Blob URL
 * @param tolerance Color matching threshold (24 = gentle, 44 = balanced default, 70 = aggressive)
 */
export async function removeDesignBackground(
  imageSrc: string,
  tolerance: number = 44
): Promise<BgRemovalResult> {
  const cacheKey = `${imageSrc}::${tolerance}`;
  const cached = REMOVAL_CACHE.get(cacheKey);
  if (cached) return cached;

  const img = await loadCorsSafeImage(imageSrc);

  // Cap processing resolution to 1024px max side for <40ms mobile execution while keeping print-grade sharpness
  const MAX_DIM = 1024;
  let W = img.naturalWidth || img.width;
  let H = img.naturalHeight || img.height;
  if (W > MAX_DIM || H > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / W, MAX_DIM / H);
    W = Math.max(1, Math.round(W * ratio));
    H = Math.max(1, Math.round(H * ratio));
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);

  const imgData = ctx.getImageData(0, 0, W, H);
  const data = imgData.data;
  const N = W * H;

  // Step 1: Sample perimeter border pixels to detect pre-existing transparency & dominant background color
  const borderSamples: [number, number, number][] = [];
  let transparentBorderCount = 0;
  let totalBorderCount = 0;

  const samplePixel = (x: number, y: number) => {
    const o = (y * W + x) * 4;
    totalBorderCount++;
    if (data[o + 3] < 30) {
      transparentBorderCount++;
    } else {
      borderSamples.push([data[o], data[o + 1], data[o + 2]]);
    }
  };

  const stepX = Math.max(1, Math.floor(W / 80));
  const stepY = Math.max(1, Math.floor(H / 80));
  for (let x = 0; x < W; x += stepX) {
    samplePixel(x, 0);
    samplePixel(x, Math.min(H - 1, 2));
    samplePixel(x, H - 1);
    samplePixel(x, Math.max(0, H - 3));
  }
  for (let y = 0; y < H; y += stepY) {
    samplePixel(0, y);
    samplePixel(Math.min(W - 1, 2), y);
    samplePixel(W - 1, y);
    samplePixel(Math.max(0, W - 3), y);
  }

  // If artwork is already a transparent cutout PNG (>15% transparent perimeter), return cleanly as-is
  if (totalBorderCount > 0 && transparentBorderCount / totalBorderCount > 0.15) {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png");
    });
    const res: BgRemovalResult = {
      dataUrl: canvas.toDataURL("image/png"),
      blob,
      detectedBgHex: "transparent",
      alreadyTransparent: true,
    };
    REMOVAL_CACHE.set(cacheKey, res);
    return res;
  }

  // Find dominant border color using quantized 16-step color histogram (immune to stray corner watermarks)
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
  for (const [r, g, b] of borderSamples) {
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    const prev = buckets.get(key);
    if (prev) {
      prev.r += r;
      prev.g += g;
      prev.b += b;
      prev.count++;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  let best = { r: 255, g: 255, b: 255, count: 0 };
  for (const entry of buckets.values()) {
    if (entry.count > best.count) best = entry;
  }

  const bgR = best.count > 0 ? best.r / best.count : 255;
  const bgG = best.count > 0 ? best.g / best.count : 255;
  const bgB = best.count > 0 ? best.b / best.count : 255;
  const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
  const bgMax = Math.max(bgR, bgG, bgB);
  const bgMin = Math.min(bgR, bgG, bgB);
  const bgIsNearNeutralWhite = bgLum > 224 && bgMax - bgMin < 24;
  const bgIsNearNeutralBlack = bgLum < 32 && bgMax - bgMin < 24;

  const colorDist = (o: number) => {
    const dr = data[o] - bgR;
    const dg = data[o + 1] - bgG;
    const db = data[o + 2] - bgB;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  // Step 2: 4-connected BFS flood-fill starting from all matching border pixels
  const visited = new Uint8Array(N);
  const bgMask = new Uint8Array(N); // 1 = background removed
  const queue = new Int32Array(N);
  let qHead = 0;
  let qTail = 0;

  const seedThresh = tolerance * 1.05;
  const growThresh = tolerance;

  const enqueue = (idx: number) => {
    if (!visited[idx]) {
      visited[idx] = 1;
      bgMask[idx] = 1;
      queue[qTail++] = idx;
    }
  };

  const isBgPixel = (idx: number, thresh: number) => {
    const o = idx * 4;
    if (data[o + 3] < 20) return true;
    const d = colorDist(o);
    if (d <= thresh) return true;
    // Also tolerate slight JPEG compression shade drift on white or black paper backgrounds
    if (bgIsNearNeutralWhite) {
      const r = data[o], g = data[o + 1], b = data[o + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (lum > 255 - thresh * 0.92 && chroma < 20) return true;
    } else if (bgIsNearNeutralBlack) {
      const r = data[o], g = data[o + 1], b = data[o + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (lum < thresh * 0.72 && chroma < 18) return true;
    }
    return false;
  };

  for (let x = 0; x < W; x++) {
    if (isBgPixel(x, seedThresh)) enqueue(x);
    const bIdx = (H - 1) * W + x;
    if (isBgPixel(bIdx, seedThresh)) enqueue(bIdx);
  }
  for (let y = 0; y < H; y++) {
    const lIdx = y * W;
    if (isBgPixel(lIdx, seedThresh)) enqueue(lIdx);
    const rIdx = y * W + (W - 1);
    if (isBgPixel(rIdx, seedThresh)) enqueue(rIdx);
  }

  while (qHead < qTail) {
    const cur = queue[qHead++];
    const x = cur % W;
    const y = (cur - x) / W;
    if (x > 0 && !visited[cur - 1] && isBgPixel(cur - 1, growThresh)) enqueue(cur - 1);
    if (x < W - 1 && !visited[cur + 1] && isBgPixel(cur + 1, growThresh)) enqueue(cur + 1);
    if (y > 0 && !visited[cur - W] && isBgPixel(cur - W, growThresh)) enqueue(cur - W);
    if (y < H - 1 && !visited[cur + W] && isBgPixel(cur + W, growThresh)) enqueue(cur + W);
  }

  // Step 3: Clean enclosed pure background pockets (e.g., white gaps inside lettering / around limbs)
  // Uses a tighter threshold so intentional light artwork details (like white eyes/shoes) stay protected!
  if (bgIsNearNeutralWhite || bgIsNearNeutralBlack) {
    const tightThresh = Math.max(12, Math.round(tolerance * 0.36));
    const holeVisited = new Uint8Array(N);
    const compQueue = new Int32Array(N);

    for (let i = 0; i < N; i++) {
      if (bgMask[i] || holeVisited[i]) continue;
      if (colorDist(i * 4) > tightThresh) continue;

      let cHead = 0;
      let cTail = 0;
      holeVisited[i] = 1;
      compQueue[cTail++] = i;

      while (cHead < cTail) {
        const cur = compQueue[cHead++];
        const x = cur % W;
        const y = (cur - x) / W;
        const tryPush = (n: number) => {
          if (!bgMask[n] && !holeVisited[n] && colorDist(n * 4) <= tightThresh) {
            holeVisited[n] = 1;
            compQueue[cTail++] = n;
          }
        };
        if (x > 0) tryPush(cur - 1);
        if (x < W - 1) tryPush(cur + 1);
        if (y > 0) tryPush(cur - W);
        if (y < H - 1) tryPush(cur + W);
      }

      // Only clear medium-to-large uniform trapped background pockets (> 0.08% and < 22% of canvas)
      const areaFrac = cTail / N;
      if (areaFrac > 0.0008 && areaFrac < 0.22) {
        for (let k = 0; k < cTail; k++) {
          bgMask[compQueue[k]] = 1;
        }
      }
    }
  }

  // Step 4: Smooth 2-pixel anti-aliased edge feathering + color decontamination (zero white/dark halo!)
  const distToBg = new Uint8Array(N).fill(9);
  for (let i = 0; i < N; i++) {
    if (bgMask[i]) distToBg[i] = 0;
  }
  for (let pass = 1; pass <= 2; pass++) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (distToBg[i] > pass) {
          if (
            distToBg[i - 1] === pass - 1 ||
            distToBg[i + 1] === pass - 1 ||
            distToBg[i - W] === pass - 1 ||
            distToBg[i + W] === pass - 1
          ) {
            distToBg[i] = pass;
          }
        }
      }
    }
  }

  let minX = W, minY = H, maxX = 0, maxY = 0;
  const softRange = Math.max(24, tolerance * 1.35);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const o = i * 4;
      if (bgMask[i]) {
        data[o + 3] = 0;
        continue;
      }

      if (distToBg[i] === 1 || distToBg[i] === 2) {
        const d = colorDist(o);
        const rawAlpha = Math.max(0, Math.min(1, (d - tolerance * 0.45) / softRange));
        const cov = distToBg[i] === 1 ? rawAlpha : Math.min(1, rawAlpha * 1.45);
        data[o + 3] = Math.round(data[o + 3] * cov);

        // Un-premultiply edge fringe so white box backgrounds don't leave bright fringes on black tees
        if (cov > 0.12 && cov < 0.98) {
          data[o] = Math.max(0, Math.min(255, Math.round((data[o] - bgR * (1 - cov)) / cov)));
          data[o + 1] = Math.max(0, Math.min(255, Math.round((data[o + 1] - bgG * (1 - cov)) / cov)));
          data[o + 2] = Math.max(0, Math.min(255, Math.round((data[o + 2] - bgB * (1 - cov)) / cov)));
        }
      }

      if (data[o + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Step 5: Tightly trim empty transparent margins so artwork scales cleanly on the garment
  const hasContent = maxX > minX + 4 && maxY > minY + 4;
  let exportCanvas = canvas;

  if (hasContent) {
    const pad = 6;
    const sx = Math.max(0, minX - pad);
    const sy = Math.max(0, minY - pad);
    const sw = Math.min(W - sx, maxX - minX + 1 + pad * 2);
    const sh = Math.min(H - sy, maxY - minY + 1 + pad * 2);

    exportCanvas = document.createElement("canvas");
    exportCanvas.width = sw;
    exportCanvas.height = sh;
    const eCtx = exportCanvas.getContext("2d");
    if (eCtx) {
      eCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    exportCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Cutout PNG export failed"))), "image/png");
  });

  const result: BgRemovalResult = {
    dataUrl: exportCanvas.toDataURL("image/png"),
    blob,
    detectedBgHex: rgbToHex(bgR, bgG, bgB),
    alreadyTransparent: false,
  };

  if (REMOVAL_CACHE.size > 24) {
    const firstKey = REMOVAL_CACHE.keys().next().value;
    if (firstKey) REMOVAL_CACHE.delete(firstKey);
  }
  REMOVAL_CACHE.set(cacheKey, result);

  return result;
}
