/**
 * ZEBALPHA — LIVE BODY TRACKER (COMPUTER VISION ENGINE)
 * Real-time, local-only body pose and orientation tracking.
 * 
 * STRICT PRIVACY GUARANTEE:
 * - Runs 100% locally in browser runtime memory.
 * - ZERO frame storage, ZERO network transmission, ZERO persistence.
 * - Processes temporary downscaled luminance gradients in volatile RAM.
 */

export interface TrackedBodyPose {
  isPersonDetected: boolean;
  shoulderCenter: { x: number; y: number };
  shoulderWidth: number;
  shoulderTiltDeg: number;
  torsoHeight: number;
  distanceStatus: 'too_close' | 'too_far' | 'optimal' | 'none';
  centerStatus: 'centered' | 'move_left' | 'move_right';
  guidanceMessage: string;
  confidence: number;
}

export class LiveBodyTracker {
  private video: HTMLVideoElement | null = null;
  private animFrameId: number | null = null;
  private isRunning: boolean = false;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  // Smoothing buffers for stable AR rendering (exponential moving average)
  private smoothedPose: TrackedBodyPose = {
    isPersonDetected: false,
    shoulderCenter: { x: 0.5, y: 0.4 },
    shoulderWidth: 0.35,
    shoulderTiltDeg: 0,
    torsoHeight: 0.5,
    distanceStatus: 'none',
    centerStatus: 'centered',
    guidanceMessage: 'Step into the fitting frame to begin',
    confidence: 0,
  };

  private onPoseCallback?: (pose: TrackedBodyPose) => void;

  constructor(onPose?: (pose: TrackedBodyPose) => void) {
    this.onPoseCallback = onPose;
    if (typeof window !== 'undefined') {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = 160;
      this.offscreenCanvas.height = 120;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    }
  }

  public start(videoElement: HTMLVideoElement) {
    this.video = videoElement;
    this.isRunning = true;
    this.loop();
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public dispose() {
    this.stop();
    this.video = null;
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.onPoseCallback = undefined;
  }

  public getLatestPose(): TrackedBodyPose {
    return this.smoothedPose;
  }

  private loop = () => {
    if (!this.isRunning) return;

    if (this.video && this.video.readyState >= 2 && !this.video.paused) {
      this.analyzeFrame();
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Fast, privacy-safe local optical gradient pose estimation.
   * Runs in volatile memory on a 160x120 downscaled buffer to ensure steady 30+ FPS.
   */
  private analyzeFrame() {
    if (!this.video || !this.offscreenCanvas || !this.offscreenCtx) return;

    const w = this.offscreenCanvas.width;
    const h = this.offscreenCanvas.height;

    // Draw current video frame to small volatile memory canvas
    this.offscreenCtx.drawImage(this.video, 0, 0, w, h);
    const imgData = this.offscreenCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 1. Detect person presence and foreground variance in central fitting region
    let centralLuminanceSum = 0;
    let centralPixelCount = 0;
    let horizontalMass = new Float32Array(w);
    let verticalMass = new Float32Array(h);

    const midYStart = Math.floor(h * 0.15);
    const midYEnd = Math.floor(h * 0.85);
    const midXStart = Math.floor(w * 0.2);
    const midXEnd = Math.floor(w * 0.8);

    for (let y = midYStart; y < midYEnd; y += 2) {
      for (let x = midXStart; x < midXEnd; x += 2) {
        const idx = (y * w + x) * 4;
        const r = data[idx] ?? 0;
        const g = data[idx + 1] ?? 0;
        const b = data[idx + 2] ?? 0;
        // Standard perceptual luminance
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // Optical silhouette weighting (edge gradient & contrast)
        const leftIdx = (y * w + Math.max(0, x - 2)) * 4;
        const diffX = Math.abs(lum - (0.299 * (data[leftIdx] ?? 0) + 0.587 * (data[leftIdx + 1] ?? 0) + 0.114 * (data[leftIdx + 2] ?? 0)));

        const weight = diffX > 12 ? 1 : 0.2;
        horizontalMass[x] = (horizontalMass[x] ?? 0) + weight;
        verticalMass[y] = (verticalMass[y] ?? 0) + weight;

        centralLuminanceSum += lum;
        centralPixelCount++;
      }
    }

    // 2. Compute Center of Torso Mass and Torso Bounds
    let totalHWeight = 0;
    let weightedX = 0;
    for (let x = midXStart; x < midXEnd; x++) {
      const mass = horizontalMass[x] ?? 0;
      weightedX += x * mass;
      totalHWeight += mass;
    }

    const rawCenterX = totalHWeight > 10 ? (weightedX / totalHWeight) / w : 0.5;

    // 3. Estimate Shoulder Width from horizontal spread around center
    let leftEdge = rawCenterX * w;
    let rightEdge = rawCenterX * w;
    const threshold = totalHWeight / (midXEnd - midXStart) * 0.7;

    for (let x = Math.floor(rawCenterX * w); x >= midXStart; x--) {
      if ((horizontalMass[x] ?? 0) >= threshold) leftEdge = x;
    }
    for (let x = Math.floor(rawCenterX * w); x < midXEnd; x++) {
      if ((horizontalMass[x] ?? 0) >= threshold) rightEdge = x;
    }

    const rawShoulderWidth = Math.max(0.2, Math.min(0.65, (rightEdge - leftEdge) / w));

    // 4. Estimate Shoulder Center Y (usually at upper third of torso mass)
    let totalVWeight = 0;
    let weightedY = 0;
    const shoulderBandStart = Math.floor(h * 0.2);
    const shoulderBandEnd = Math.floor(h * 0.6);

    for (let y = shoulderBandStart; y < shoulderBandEnd; y++) {
      const mass = verticalMass[y] ?? 0;
      weightedY += y * mass;
      totalVWeight += mass;
    }

    const rawCenterY = totalVWeight > 10 ? (weightedY / totalVWeight) / h : 0.38;

    // 5. Shoulder Tilt (calculated from left vs right vertical mass centroid)
    let leftYSum = 0, leftYWeight = 0;
    let rightYSum = 0, rightYWeight = 0;
    const midX = Math.floor(rawCenterX * w);

    for (let y = shoulderBandStart; y < shoulderBandEnd; y += 2) {
      for (let x = Math.max(0, midX - 25); x < midX; x += 2) {
        const idx = (y * w + x) * 4;
        const lum = ((data[idx] ?? 0) + (data[idx + 1] ?? 0) + (data[idx + 2] ?? 0)) / 3;
        leftYSum += y * lum;
        leftYWeight += lum;
      }
      for (let x = midX; x < Math.min(w, midX + 25); x += 2) {
        const idx = (y * w + x) * 4;
        const lum = ((data[idx] ?? 0) + (data[idx + 1] ?? 0) + (data[idx + 2] ?? 0)) / 3;
        rightYSum += y * lum;
        rightYWeight += lum;
      }
    }

    const leftCentroidY = leftYWeight > 0 ? leftYSum / leftYWeight : h * 0.38;
    const rightCentroidY = rightYWeight > 0 ? rightYSum / rightYWeight : h * 0.38;
    const rawTiltDeg = Math.max(-15, Math.min(15, (rightCentroidY - leftCentroidY) * 0.8));

    // Determine Confidence & Presence
    const isDetected = totalHWeight > 25 && centralPixelCount > 50;
    const confidence = isDetected ? Math.min(1.0, totalHWeight / 120) : 0;

    // Distance & Center Status
    let distanceStatus: TrackedBodyPose['distanceStatus'] = 'optimal';
    let guidanceMessage = 'Perfect alignment ✨ Live fitting active';

    if (!isDetected) {
      distanceStatus = 'none';
      guidanceMessage = 'Step into the camera frame to preview';
    } else if (rawShoulderWidth > 0.55) {
      distanceStatus = 'too_close';
      guidanceMessage = 'Step back slightly for full torso view';
    } else if (rawShoulderWidth < 0.25) {
      distanceStatus = 'too_far';
      guidanceMessage = 'Step a little closer to the mirror';
    } else if (Math.abs(rawCenterX - 0.5) > 0.12) {
      guidanceMessage = rawCenterX < 0.5 ? 'Shift slightly right to center' : 'Shift slightly left to center';
    } else if (Math.abs(rawTiltDeg) > 6) {
      guidanceMessage = 'Level your shoulders for optimal fitting';
    }

    let centerStatus: TrackedBodyPose['centerStatus'] = 'centered';
    if (rawCenterX < 0.42) centerStatus = 'move_right';
    else if (rawCenterX > 0.58) centerStatus = 'move_left';

    // Exponential moving average smoothing (alpha = 0.25 for smooth 30 FPS rendering)
    const alpha = 0.25;
    this.smoothedPose = {
      isPersonDetected: isDetected,
      shoulderCenter: {
        x: this.smoothedPose.shoulderCenter.x * (1 - alpha) + rawCenterX * alpha,
        y: this.smoothedPose.shoulderCenter.y * (1 - alpha) + rawCenterY * alpha,
      },
      shoulderWidth: this.smoothedPose.shoulderWidth * (1 - alpha) + rawShoulderWidth * alpha,
      shoulderTiltDeg: this.smoothedPose.shoulderTiltDeg * (1 - alpha) + rawTiltDeg * alpha,
      torsoHeight: this.smoothedPose.torsoHeight * (1 - alpha) + (rawShoulderWidth * 1.35) * alpha,
      distanceStatus,
      centerStatus,
      guidanceMessage,
      confidence,
    };

    if (this.onPoseCallback) {
      this.onPoseCallback(this.smoothedPose);
    }
  }

  /**
   * Draws polished, non-intrusive fitting-room guides directly on an overlay canvas.
   */
  public drawGuidanceOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    ctx.clearRect(0, 0, width, height);
    const pose = this.smoothedPose;

    // 1. Subtle mirror frame brackets in 4 corners
    const bracketSize = Math.min(width, height) * 0.08;
    const inset = 20;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // Top Left
    ctx.beginPath();
    ctx.moveTo(inset, inset + bracketSize);
    ctx.lineTo(inset, inset);
    ctx.lineTo(inset + bracketSize, inset);
    ctx.stroke();

    // Top Right
    ctx.beginPath();
    ctx.moveTo(width - inset - bracketSize, inset);
    ctx.lineTo(width - inset, inset);
    ctx.lineTo(width - inset, inset + bracketSize);
    ctx.stroke();

    // Bottom Left
    ctx.beginPath();
    ctx.moveTo(inset, height - inset - bracketSize);
    ctx.lineTo(inset, height - inset);
    ctx.lineTo(inset + bracketSize, height - inset);
    ctx.stroke();

    // Bottom Right
    ctx.beginPath();
    ctx.moveTo(width - inset - bracketSize, height - inset);
    ctx.lineTo(width - inset, height - inset);
    ctx.lineTo(width - inset, height - inset - bracketSize);
    ctx.stroke();

    if (!pose.isPersonDetected) {
      // Draw silhouette invitation guide when no person is detected
      const centerX = width * 0.5;
      const centerY = height * 0.45;
      const headRadius = width * 0.09;

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.5;

      // Head oval
      ctx.beginPath();
      ctx.arc(centerX, centerY - headRadius * 1.3, headRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Torso shoulders
      const sWidth = width * 0.36;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + headRadius * 0.7, sWidth * 0.5, headRadius * 1.4, 0, 0, Math.PI);
      ctx.stroke();

      ctx.restore();
      return;
    }

    // 2. Active tracking guides: Subtle shoulder alignment bar & torso frame
    const sx = pose.shoulderCenter.x * width;
    const sy = pose.shoulderCenter.y * height;
    const sw = pose.shoulderWidth * width;
    const halfSw = sw * 0.5;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate((pose.shoulderTiltDeg * Math.PI) / 180);

    // Shoulder Level Bar
    const isLevel = Math.abs(pose.shoulderTiltDeg) < 4;
    ctx.strokeStyle = isLevel ? 'rgba(52, 211, 153, 0.7)' : 'rgba(251, 191, 36, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(-halfSw, 0);
    ctx.lineTo(halfSw, 0);
    ctx.stroke();

    // Subtle shoulder joint anchor points
    ctx.fillStyle = isLevel ? '#34d399' : '#fbbf24';
    ctx.beginPath();
    ctx.arc(-halfSw, 0, 4, 0, Math.PI * 2);
    ctx.arc(halfSw, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
