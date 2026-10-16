/**
 * ZEBALPHA — LIVE 3D/AR GARMENT RENDERER
 * Real-time WebGL AR garment visualization engine using Three.js.
 * 
 * STRICT PRIVACY & RESOURCE SAFETY:
 * - Runs 100% locally in volatile browser memory.
 * - ZERO frame storage, ZERO network calls.
 * - Full WebGL resource disposal on cleanup.
 */

import * as THREE from 'three';
import { TrackedBodyPose } from './LiveBodyTracker';

export interface GarmentConfig {
  category: 'upper_body' | 'lower_body' | 'dresses' | 'outerwear' | string;
  colorName?: string;
  colorHex?: string;
  size?: string;
  productName?: string;
}



export class LiveGarmentRenderer {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private garmentGroup: THREE.Group | null = null;
  private garmentMaterial: THREE.MeshStandardMaterial | null = null;
  private animFrameId: number | null = null;
  private isRunning: boolean = false;
  private currentConfig: GarmentConfig = { category: 'upper_body' };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initThree();
  }

  private initThree() {
    // 1. Transparent WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // 2. Scene
    this.scene = new THREE.Scene();

    // 3. Perspective Camera
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    // 4. Lighting: Ambient + Key Directional Light + Fill Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(1.5, 3, 4);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe2e8f0, 0.8);
    rimLight.position.set(-2, 1, -2);
    this.scene.add(rimLight);

    // 5. Garment Root Group
    this.garmentGroup = new THREE.Group();
    this.scene.add(this.garmentGroup);

    // Initial build
    this.rebuildGarmentGeometry();
  }

  /**
   * Constructs procedural 3D garment mesh tailored to apparel category.
   */
  private rebuildGarmentGeometry() {
    if (!this.garmentGroup) return;

    // Clear existing children
    while (this.garmentGroup.children.length > 0) {
      const child = this.garmentGroup.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
      }
      this.garmentGroup.remove(child!);
    }

    // Material with realistic fabric characteristics
    const baseColor = this.resolveColor(this.currentConfig.colorHex || this.currentConfig.colorName || 'black');
    this.garmentMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseColor),
      roughness: 0.72,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    const category = this.currentConfig.category;

    if (category === 'dresses') {
      // Dress: Torso + Flared Skirt
      const bodiceGeom = new THREE.CylinderGeometry(0.85, 0.75, 1.2, 32);
      const bodice = new THREE.Mesh(bodiceGeom, this.garmentMaterial);
      bodice.position.y = 0.4;
      this.garmentGroup.add(bodice);

      const skirtGeom = new THREE.CylinderGeometry(0.75, 1.4, 2.0, 32);
      const skirt = new THREE.Mesh(skirtGeom, this.garmentMaterial);
      skirt.position.y = -1.1;
      this.garmentGroup.add(skirt);
    } else if (category === 'lower_body') {
      // Bottoms/Jeans: Waistband + Two Trouser Legs
      const waistGeom = new THREE.CylinderGeometry(0.85, 0.85, 0.4, 32);
      const waist = new THREE.Mesh(waistGeom, this.garmentMaterial);
      waist.position.y = 0.5;
      this.garmentGroup.add(waist);

      const leftLegGeom = new THREE.CylinderGeometry(0.38, 0.28, 2.3, 24);
      const leftLeg = new THREE.Mesh(leftLegGeom, this.garmentMaterial);
      leftLeg.position.set(-0.4, -0.85, 0);
      this.garmentGroup.add(leftLeg);

      const rightLegGeom = new THREE.CylinderGeometry(0.38, 0.28, 2.3, 24);
      const rightLeg = new THREE.Mesh(rightLegGeom, this.garmentMaterial);
      rightLeg.position.set(0.4, -0.85, 0);
      this.garmentGroup.add(rightLeg);
    } else {
      // Upper Body: T-Shirt / Shirt / Hoodie / Jacket Torso + Shoulders + Sleeves
      // Main Torso Body
      const torsoGeom = new THREE.CylinderGeometry(1.0, 0.88, 1.9, 32);
      const torso = new THREE.Mesh(torsoGeom, this.garmentMaterial);
      torso.position.y = -0.3;
      this.garmentGroup.add(torso);

      // Collar
      const collarGeom = new THREE.TorusGeometry(0.45, 0.08, 16, 32);
      const collar = new THREE.Mesh(collarGeom, this.garmentMaterial);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 0.65, 0);
      this.garmentGroup.add(collar);

      // Left Shoulder & Sleeve
      const leftSleeveGeom = new THREE.CylinderGeometry(0.32, 0.28, 0.85, 24);
      const leftSleeve = new THREE.Mesh(leftSleeveGeom, this.garmentMaterial);
      leftSleeve.position.set(-1.05, 0.2, 0);
      leftSleeve.rotation.z = Math.PI / 4.5;
      this.garmentGroup.add(leftSleeve);

      // Right Shoulder & Sleeve
      const rightSleeveGeom = new THREE.CylinderGeometry(0.32, 0.28, 0.85, 24);
      const rightSleeve = new THREE.Mesh(rightSleeveGeom, this.garmentMaterial);
      rightSleeve.position.set(1.05, 0.2, 0);
      rightSleeve.rotation.z = -Math.PI / 4.5;
      this.garmentGroup.add(rightSleeve);
    }
  }

  /**
   * Dynamically resolves any arbitrary color string, hex code, or CSS name
   * from the database without requiring hardcoded color dictionaries.
   */
  private resolveColor(input: string): string {
    if (!input) return '#171717';
    const clean = input.trim().toLowerCase();

    // 1. Direct valid hex string
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(clean)) {
      return clean;
    }

    // 2. Try parsing directly via Three.js (supports all 140+ standard W3C CSS color names)
    try {
      const parsed = new THREE.Color(clean.replace(/\s+/g, ''));
      if (!isNaN(parsed.r)) {
        return `#${parsed.getHexString()}`;
      }
    } catch (_) {}

    // 3. Extract the primary hue token from compound seller names (e.g., "Dusty Rose" -> "rose", "Dark Olive" -> "olive")
    const tokens = clean.split(/[\s\-_/]+/);
    for (const token of tokens) {
      try {
        const parsed = new THREE.Color(token);
        if (!isNaN(parsed.r)) {
          return `#${parsed.getHexString()}`;
        }
      } catch (_) {}
    }

    // 4. Deterministic HSL generation for custom boutique colors entered by sellers
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    const dynamicColor = new THREE.Color();
    dynamicColor.setHSL(hue / 360, 0.45, 0.35);
    return `#${dynamicColor.getHexString()}`;
  }

  public updateConfig(config: Partial<GarmentConfig>) {
    const prevCategory = this.currentConfig.category;
    this.currentConfig = { ...this.currentConfig, ...config };

    if (config.category && config.category !== prevCategory) {
      this.rebuildGarmentGeometry();
    } else if (config.colorName || config.colorHex) {
      const colorVal = this.resolveColor(this.currentConfig.colorHex || this.currentConfig.colorName || 'black');
      if (this.garmentMaterial) {
        this.garmentMaterial.color.set(colorVal);
      }
    }
  }

  public updatePose(pose: TrackedBodyPose) {
    if (!this.garmentGroup || !this.camera) return;

    if (!pose.isPersonDetected) {
      this.garmentGroup.visible = false;
      return;
    }

    this.garmentGroup.visible = true;

    // Convert normalized coordinates (0..1) to Three.js world space coordinates
    // When camera is at z = 5 with FOV 45:
    const vFOV = (this.camera.fov * Math.PI) / 180;
    const planeHeightAt5 = 2 * Math.tan(vFOV / 2) * 5;
    const planeWidthAt5 = planeHeightAt5 * this.camera.aspect;

    // Map shoulder center (0..1) to world (-planeWidth/2 .. +planeWidth/2)
    const targetX = (pose.shoulderCenter.x - 0.5) * planeWidthAt5;
    // Y is inverted in web coordinates vs Three.js world coordinates
    const targetY = -(pose.shoulderCenter.y - 0.5) * planeHeightAt5 - 0.35;

    // Scale calculation based on shoulder width
    let sizeMultiplier = 1.0;
    if (this.currentConfig.size) {
      const s = this.currentConfig.size.toUpperCase();
      if (s === 'XS') sizeMultiplier = 0.92;
      else if (s === 'S') sizeMultiplier = 0.96;
      else if (s === 'M') sizeMultiplier = 1.0;
      else if (s === 'L') sizeMultiplier = 1.06;
      else if (s === 'XL') sizeMultiplier = 1.12;
      else if (s === 'XXL' || s === '2XL') sizeMultiplier = 1.18;
    }

    const baseScale = (pose.shoulderWidth * planeWidthAt5 * 0.48) * sizeMultiplier;

    // Smooth transform interpolation
    this.garmentGroup.position.x = THREE.MathUtils.lerp(this.garmentGroup.position.x, targetX, 0.3);
    this.garmentGroup.position.y = THREE.MathUtils.lerp(this.garmentGroup.position.y, targetY, 0.3);
    this.garmentGroup.scale.set(baseScale, baseScale, baseScale);

    // Rotate to match shoulder tilt angle
    const targetRotZ = -(pose.shoulderTiltDeg * Math.PI) / 180;
    this.garmentGroup.rotation.z = THREE.MathUtils.lerp(this.garmentGroup.rotation.z, targetRotZ, 0.25);
  }

  public resize(width: number, height: number) {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public render() {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
  }

  public start() {
    this.isRunning = true;
    const renderLoop = () => {
      if (!this.isRunning) return;
      this.render();
      this.animFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Disposes of all WebGL resources, geometries, materials, and contexts.
   */
  public dispose() {
    this.stop();

    if (this.garmentGroup) {
      this.garmentGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });
      this.scene?.remove(this.garmentGroup);
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      const gl = this.renderer.getContext();
      if (gl) {
        const loseCtx = gl.getExtension('WEBGL_lose_context');
        if (loseCtx) loseCtx.loseContext();
      }
    }

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.garmentGroup = null;
    this.garmentMaterial = null;
  }
}
