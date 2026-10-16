/**
 * ZEBALPHA — LIVE 3D/AR GARMENT RENDERER
 * Real-time WebGL AR garment visualization engine using Three.js.
 * 
 * STRICT PRIVACY & RESOURCE SAFETY:
 * - Runs 100% locally in volatile browser memory.
 * - ZERO frame storage, ZERO network calls for camera data.
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
  garmentImageUrl?: string;
}

export class LiveGarmentRenderer {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private garmentGroup: THREE.Group | null = null;
  private garmentMaterial: THREE.MeshStandardMaterial | null = null;
  private frontTextureMesh: THREE.Mesh | null = null;
  private animFrameId: number | null = null;
  private isRunning: boolean = false;
  private currentConfig: GarmentConfig = { category: 'upper_body' };
  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
  private loadedTexture: THREE.Texture | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initThree();
  }

  private initThree() {
    // 1. Transparent WebGL Renderer with fallback dimensions if clientWidth is 0
    const w = this.canvas.clientWidth || this.canvas.width || 640;
    const h = this.canvas.clientHeight || this.canvas.height || 850;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // 2. Scene
    this.scene = new THREE.Scene();

    // 3. Perspective Camera
    const aspect = w / Math.max(1, h);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    // 4. Lighting: Ambient + Key Directional Light + Rim Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(1.5, 3, 4);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf1f5f9, 0.9);
    fillLight.position.set(-2, 1, 3);
    this.scene.add(fillLight);

    // 5. Garment Root Group
    this.garmentGroup = new THREE.Group();
    this.scene.add(this.garmentGroup);

    // Initial build
    this.rebuildGarmentGeometry();
  }

  /**
   * Constructs realistic 3D garment mesh tailored to apparel category.
   * Maps the chosen product image directly onto the front drape!
   */
  private rebuildGarmentGeometry() {
    if (!this.garmentGroup) return;

    // Clear existing children
    while (this.garmentGroup.children.length > 0) {
      const child = this.garmentGroup.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
      this.garmentGroup.remove(child!);
    }

    const baseColorHex = this.resolveColor(
      this.currentConfig.colorHex || this.currentConfig.colorName || 'white'
    );

    // Base Fabric Material (for sleeves, collar, back, and torso body)
    this.garmentMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseColorHex),
      roughness: 0.65,
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
      // Bottoms/Jeans
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
      // Upper Body: T-Shirt / Shirt / Hoodie (Standard Apparel)
      
      // 1. Back & Side Shell (Open half cylinder behind body, z <= 0)
      const backGeom = new THREE.CylinderGeometry(0.92, 0.86, 2.1, 32, 1, true, Math.PI * 0.5, Math.PI);
      const backTorso = new THREE.Mesh(backGeom, this.garmentMaterial);
      backTorso.position.set(0, -0.75, -0.15);
      this.garmentGroup.add(backTorso);

      // 2. Collar Ring (Crew Neck)
      const collarGeom = new THREE.TorusGeometry(0.42, 0.08, 16, 32);
      const collar = new THREE.Mesh(collarGeom, this.garmentMaterial);
      collar.rotation.x = Math.PI / 2.2;
      collar.position.set(0, 0.32, 0.08);
      this.garmentGroup.add(collar);

      // 3. Left Shoulder & Sleeve
      const leftSleeveGeom = new THREE.CylinderGeometry(0.32, 0.28, 0.95, 24);
      const leftSleeve = new THREE.Mesh(leftSleeveGeom, this.garmentMaterial);
      leftSleeve.position.set(-1.05, 0.0, 0.0);
      leftSleeve.rotation.z = Math.PI / 4.2;
      this.garmentGroup.add(leftSleeve);

      // 4. Right Shoulder & Sleeve
      const rightSleeveGeom = new THREE.CylinderGeometry(0.32, 0.28, 0.95, 24);
      const rightSleeve = new THREE.Mesh(rightSleeveGeom, this.garmentMaterial);
      rightSleeve.position.set(1.05, 0.0, 0.0);
      rightSleeve.rotation.z = -Math.PI / 4.2;
      this.garmentGroup.add(rightSleeve);

      // 5. Front Drape Texture Panel (Always present immediately, unoccluded at z = +0.20)
      const frontGeom = new THREE.PlaneGeometry(2.0, 2.3, 16, 16);
      const pos = frontGeom.attributes.position;
      if (pos) {
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const z = Math.cos(x * 1.3) * 0.12;
          pos.setZ(i, z);
        }
        frontGeom.computeVertexNormals();
      }

      const frontMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(baseColorHex),
        roughness: 0.65,
        metalness: 0.03,
        side: THREE.DoubleSide,
        depthWrite: true,
      });

      this.frontTextureMesh = new THREE.Mesh(frontGeom, frontMat);
      this.frontTextureMesh.position.set(0, -0.75, 0.2);
      this.garmentGroup.add(this.frontTextureMesh);

      // Load and apply actual product graphic/image if available
      if (this.currentConfig.garmentImageUrl) {
        this.loadAndApplyGarmentTexture(this.currentConfig.garmentImageUrl);
      }
    }
  }

  /**
   * Loads the actual chosen product image and maps it onto the front of the 3D t-shirt!
   */
  private loadAndApplyGarmentTexture(imageUrl: string) {
    if (!this.garmentGroup || !imageUrl) return;

    this.textureLoader.setCrossOrigin('anonymous');
    this.textureLoader.load(
      imageUrl,
      (texture) => {
        if (!this.garmentGroup || !this.frontTextureMesh) return;
        texture.colorSpace = THREE.SRGBColorSpace;
        this.loadedTexture = texture;

        const textureMat = new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          opacity: 0.98,
          roughness: 0.65,
          metalness: 0.02,
          side: THREE.DoubleSide,
          depthWrite: true,
        });

        if (Array.isArray(this.frontTextureMesh.material)) {
          this.frontTextureMesh.material.forEach((m) => m.dispose());
        } else if (this.frontTextureMesh.material) {
          this.frontTextureMesh.material.dispose();
        }

        this.frontTextureMesh.material = textureMat;
      },
      undefined,
      (err) => {
        console.warn('[LiveGarmentRenderer] Fallback to procedural fabric shading:', err);
      }
    );
  }

  /**
   * Dynamically resolves any arbitrary color string, hex code, or CSS name.
   */
  private resolveColor(input: string): string {
    if (!input) return '#f8fafc';
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

    // 3. Extract primary hue token from compound names (e.g. "Pure White" -> "white", "Off White" -> "white")
    const tokens = clean.split(/[\s\-_/]+/);
    for (const token of tokens) {
      try {
        const parsed = new THREE.Color(token);
        if (!isNaN(parsed.r)) {
          return `#${parsed.getHexString()}`;
        }
      } catch (_) {}
    }

    return '#f8fafc';
  }

  public updateConfig(config: Partial<GarmentConfig>) {
    const prevCategory = this.currentConfig.category;
    const prevImage = this.currentConfig.garmentImageUrl;
    this.currentConfig = { ...this.currentConfig, ...config };

    if (config.category && config.category !== prevCategory) {
      this.rebuildGarmentGeometry();
    } else {
      if (config.garmentImageUrl && config.garmentImageUrl !== prevImage) {
        this.loadAndApplyGarmentTexture(config.garmentImageUrl);
      }
      if (config.colorName || config.colorHex) {
        const colorVal = this.resolveColor(
          this.currentConfig.colorHex || this.currentConfig.colorName || 'white'
        );
        if (this.garmentMaterial) {
          this.garmentMaterial.color.set(colorVal);
        }
        if (this.frontTextureMesh && !this.loadedTexture && this.frontTextureMesh.material instanceof THREE.MeshStandardMaterial) {
          this.frontTextureMesh.material.color.set(colorVal);
        }
      }
    }
  }

  /**
   * Synchronizes 3D Garment Drape directly with tracked shoulders and torso.
   */
  public updatePose(pose: TrackedBodyPose) {
    if (!this.garmentGroup || !this.camera) return;

    if (!pose.isPersonDetected) {
      this.garmentGroup.visible = false;
      return;
    }

    this.garmentGroup.visible = true;

    // Convert normalized coordinates (0..1) to Three.js world space coordinates
    const vFOV = (this.camera.fov * Math.PI) / 180;
    const planeHeightAt5 = 2 * Math.tan(vFOV / 2) * 5;
    const planeWidthAt5 = planeHeightAt5 * this.camera.aspect;

    // Center X: Maps (0..1) to (-planeWidth/2 .. +planeWidth/2)
    const targetX = (pose.shoulderCenter.x - 0.5) * planeWidthAt5;

    // Center Y: Positions the garment collar right at the detected shoulders/clavicle
    // In Three.js world space, y = 0 is center, +y is top, -y is bottom
    const normalizedShoulderY = pose.shoulderCenter.y;
    const targetY = -(normalizedShoulderY - 0.5) * planeHeightAt5 - 0.15;

    // Scale calculation: Adjust width to match tracked shoulder width accurately
    let sizeMultiplier = 1.0;
    if (this.currentConfig.size) {
      const s = this.currentConfig.size.toUpperCase();
      if (s === 'XS') sizeMultiplier = 0.94;
      else if (s === 'S') sizeMultiplier = 0.97;
      else if (s === 'M') sizeMultiplier = 1.0;
      else if (s === 'L') sizeMultiplier = 1.06;
      else if (s === 'XL') sizeMultiplier = 1.12;
      else if (s === 'XXL' || s === '2XL') sizeMultiplier = 1.18;
    }

    // A standard upper-body garment spans ~1.35x the shoulder width in 3D scale
    const baseScale = Math.max(0.4, Math.min(1.8, pose.shoulderWidth * planeWidthAt5 * 0.72)) * sizeMultiplier;

    // Smooth transform interpolation for stable, responsive 30 FPS fitting
    this.garmentGroup.position.x = THREE.MathUtils.lerp(this.garmentGroup.position.x, targetX, 0.35);
    this.garmentGroup.position.y = THREE.MathUtils.lerp(this.garmentGroup.position.y, targetY, 0.35);
    this.garmentGroup.position.z = 0; // Front of camera at z=5
    this.garmentGroup.scale.set(baseScale, baseScale, baseScale);

    // Rotate to match shoulder tilt angle
    const targetRotZ = -(pose.shoulderTiltDeg * Math.PI) / 180;
    this.garmentGroup.rotation.z = THREE.MathUtils.lerp(this.garmentGroup.rotation.z, targetRotZ, 0.28);
  }

  public resize(width: number, height: number) {
    if (!this.renderer || !this.camera) return;
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
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

    if (this.loadedTexture) {
      this.loadedTexture.dispose();
      this.loadedTexture = null;
    }

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
    this.frontTextureMesh = null;
  }
}
