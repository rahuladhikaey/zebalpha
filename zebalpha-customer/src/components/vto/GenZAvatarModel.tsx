"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { RotateCw, Sparkles, Move3d } from "lucide-react";

export type AvatarGender = "male" | "female";
export type AvatarSkinTone = "#fce0d2" | "#e8b898" | "#c68652" | "#9e5c32" | "#66391d" | "#2b170c";
export type AvatarHairStyle =
  | "textured_crop"
  | "middle_part"
  | "messy_curls"
  | "buzz_cut"
  | "wolf_cut"
  | "high_ponytail"
  | "bob_cut"
  | "fade";
export type AvatarBodyBuild = "slim" | "athletic" | "boxy_oversized" | "regular";
export type AvatarEyewear = "none" | "cyber_shades" | "retro_black";
export type AvatarAccessories = "none" | "silver_chain" | "pearl_choker";

export interface AvatarConfig {
  gender: AvatarGender;
  skinTone: string;
  hairStyle: AvatarHairStyle;
  hairColor: string;
  facialHair?: "none" | "stubble" | "goatee";
  bodyBuild: AvatarBodyBuild;
  eyewear?: AvatarEyewear;
  accessories?: AvatarAccessories;
}

export const DEFAULT_MALE_AVATAR: AvatarConfig = {
  gender: "male",
  skinTone: "#c68652",
  hairStyle: "textured_crop",
  hairColor: "#18181b",
  facialHair: "stubble",
  bodyBuild: "boxy_oversized",
  eyewear: "cyber_shades",
  accessories: "silver_chain",
};

export const DEFAULT_FEMALE_AVATAR: AvatarConfig = {
  gender: "female",
  skinTone: "#e8b898",
  hairStyle: "wolf_cut",
  hairColor: "#18181b",
  bodyBuild: "athletic",
  eyewear: "retro_black",
  accessories: "pearl_choker",
};

export const SKIN_TONE_OPTIONS: { id: string; name: string; hex: string }[] = [
  { id: "fair_ivory", name: "Ivory", hex: "#fce0d2" },
  { id: "warm_wheat", name: "Warm Wheat", hex: "#e8b898" },
  { id: "honey_dusk", name: "Honey Dusky", hex: "#c68652" },
  { id: "rich_bronze", name: "Rich Bronze", hex: "#9e5c32" },
  { id: "deep_mocha", name: "Deep Mocha", hex: "#66391d" },
  { id: "obsidian", name: "Obsidian", hex: "#2b170c" },
];

export const HAIR_COLOR_OPTIONS: { id: string; name: string; hex: string }[] = [
  { id: "jet_black", name: "Jet Black", hex: "#18181b" },
  { id: "ash_brown", name: "Ash Brown", hex: "#451a03" },
  { id: "platinum_blonde", name: "Platinum", hex: "#e0e7ff" },
  { id: "cyber_mint", name: "Cyber Mint", hex: "#10b981" },
  { id: "hot_pink", name: "Neon Pink", hex: "#ec4899" },
  { id: "midnight_blue", name: "Cobalt Blue", hex: "#2563eb" },
];

interface GenZAvatarModelProps {
  config: AvatarConfig;
  garmentImageUrl?: string;
  garmentCategory?: string;
  garmentColorHex?: string;
  garmentName?: string;
  activeSize?: string;
  className?: string;
}

export function GenZAvatarModel({
  config,
  garmentImageUrl = "",
  garmentCategory = "upper_body",
  garmentColorHex = "",
  garmentName = "",
  activeSize = "M",
  className = "",
}: GenZAvatarModelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Three.js Core Refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Rotation & Drag state
  const isDraggingRef = useRef(false);
  const previousMouseXRef = useRef(0);
  const targetRotationYRef = useRef(0);
  const currentRotationYRef = useRef(0);

  const [isRotating, setIsRotating] = useState(false);

  // Reset 360 view to front
  const handleResetRotation = () => {
    targetRotationYRef.current = 0;
  };

  /**
   * BUILD FULL 3D META AVATAR CHARACTER IN THREE.JS
   */
  const build3DAvatar = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear existing avatar group
    if (avatarGroupRef.current) {
      scene.remove(avatarGroupRef.current);
      // Clean memory
      avatarGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
    }

    const isFemale = config.gender === "female";
    const skinHex = config.skinTone || (isFemale ? "#e8b898" : "#c68652");
    const hairHex = config.hairColor || "#18181b";

    const isBoxy = config.bodyBuild === "boxy_oversized";
    const isAthletic = config.bodyBuild === "athletic";
    const isSlim = config.bodyBuild === "slim";

    const shoulderScale = isBoxy ? 1.25 : isAthletic ? 1.15 : isSlim ? 0.95 : 1.05;
    const sizeMultiplier =
      activeSize === "XS"
        ? 0.94
        : activeSize === "S"
        ? 0.97
        : activeSize === "XL" || activeSize === "XXL"
        ? 1.08
        : 1.0;

    const rootGroup = new THREE.Group();
    avatarGroupRef.current = rootGroup;
    scene.add(rootGroup);

    // =========================================================================
    // 1. MATERIALS (Meta Avatar Soft Clay / Pixar Lighting)
    // =========================================================================
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(skinHex),
      roughness: 0.58,
      metalness: 0.05,
    });

    const hairMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hairHex),
      roughness: 0.55,
      metalness: 0.12,
    });

    const eyeWhiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.1,
      metalness: 0.0,
    });

    const irisMaterial = new THREE.MeshStandardMaterial({
      color: isFemale ? 0x1e3a8a : 0x1c1917, // Blue/Dark Hazel
      roughness: 0.2,
      metalness: 0.1,
    });

    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const lipsMaterial = new THREE.MeshStandardMaterial({
      color: isFemale ? 0xe11d48 : 0x9f4a4a,
      roughness: 0.4,
      metalness: 0.05,
    });

    // Streetwear Pants Material (Baggy Denim/Cargo)
    const pantsMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
      metalness: 0.02,
    });

    // Streetwear Sneaker Material
    const sneakerSoleMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.05,
    });

    const isFootwearProduct =
      garmentCategory.includes("footwear") ||
      garmentCategory.includes("shoe") ||
      garmentName.toLowerCase().includes("crocs") ||
      garmentName.toLowerCase().includes("shoe") ||
      garmentName.toLowerCase().includes("sandal");

    const sneakerUpperMaterial = new THREE.MeshStandardMaterial({
      color: isFootwearProduct && garmentColorHex ? new THREE.Color(garmentColorHex) : new THREE.Color(0x10b981),
      roughness: 0.45,
      metalness: 0.1,
    });

    // Garment / Shirt Material
    const garmentColor = garmentColorHex ? new THREE.Color(garmentColorHex) : new THREE.Color(0x18181b);
    const garmentMaterial = new THREE.MeshStandardMaterial({
      color: garmentColor,
      roughness: 0.72,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    // Load actual product image onto the chest if available!
    if (garmentImageUrl && !isFootwearProduct) {
      new THREE.TextureLoader().load(
        garmentImageUrl,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          garmentMaterial.map = tex;
          garmentMaterial.needsUpdate = true;
        },
        undefined,
        () => {}
      );
    }

    // =========================================================================
    // 2. HEAD & FACIAL FEATURES (3D Pixar/Meta Rounded Shapes)
    // =========================================================================
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.35, 0);
    rootGroup.add(headGroup);

    // 3D Skull / Face Mesh
    const headRadius = isFemale ? 0.28 : 0.30;
    const headGeo = new THREE.SphereGeometry(headRadius, 32, 32);
    headGeo.scale(1.0, 1.18, 1.05); // Stylized oval
    const headMesh = new THREE.Mesh(headGeo, skinMaterial);
    headGroup.add(headMesh);

    // 3D Neck
    const neckGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.24, 24);
    const neckMesh = new THREE.Mesh(neckGeo, skinMaterial);
    neckMesh.position.set(0, -0.25, 0);
    headGroup.add(neckMesh);

    // 3D Eyes (Left & Right)
    const eyeOffsetX = 0.105;
    const eyeOffsetY = 0.04;
    const eyeOffsetZ = 0.26;

    [-1, 1].forEach((side) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * eyeOffsetX, eyeOffsetY, eyeOffsetZ);
      headGroup.add(eyeGroup);

      // Sclera (Eyeball)
      const eyeballGeo = new THREE.SphereGeometry(0.045, 16, 16);
      const eyeballMesh = new THREE.Mesh(eyeballGeo, eyeWhiteMaterial);
      eyeGroup.add(eyeballMesh);

      // Iris
      const irisGeo = new THREE.SphereGeometry(0.026, 16, 16);
      irisGeo.scale(1, 1, 0.3);
      const irisMesh = new THREE.Mesh(irisGeo, irisMaterial);
      irisMesh.position.set(0, 0, 0.038);
      eyeGroup.add(irisMesh);

      // Pupil
      const pupilGeo = new THREE.SphereGeometry(0.013, 12, 12);
      pupilGeo.scale(1, 1, 0.2);
      const pupilMesh = new THREE.Mesh(pupilGeo, pupilMaterial);
      pupilMesh.position.set(0, 0, 0.044);
      eyeGroup.add(pupilMesh);

      // Specular Highlight Glint
      const glintGeo = new THREE.SphereGeometry(0.005, 8, 8);
      const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const glintMesh = new THREE.Mesh(glintGeo, glintMat);
      glintMesh.position.set(side * 0.008, 0.01, 0.046);
      eyeGroup.add(glintMesh);

      // Eyebrow
      const browGeo = new THREE.CapsuleGeometry(0.012, 0.065, 4, 8);
      const browMesh = new THREE.Mesh(browGeo, hairMaterial);
      browMesh.rotation.z = side * 0.15;
      browMesh.rotation.y = side * 0.25;
      browMesh.position.set(side * eyeOffsetX, eyeOffsetY + 0.065, eyeOffsetZ - 0.01);
      headGroup.add(browMesh);
    });

    // 3D Nose
    const noseGeo = new THREE.ConeGeometry(0.03, 0.07, 16);
    noseGeo.rotateX(Math.PI / 4);
    const noseMesh = new THREE.Mesh(noseGeo, skinMaterial);
    noseMesh.position.set(0, -0.015, 0.30);
    headGroup.add(noseMesh);

    // 3D Lips
    const lipGeo = new THREE.CapsuleGeometry(0.02, 0.07, 8, 16);
    lipGeo.scale(1.2, 0.6, 0.8);
    const lipMesh = new THREE.Mesh(lipGeo, lipsMaterial);
    lipMesh.position.set(0, -0.12, 0.28);
    headGroup.add(lipMesh);

    // Male Stubble / Facial Hair
    if (!isFemale && config.facialHair === "stubble") {
      const stubbleGeo = new THREE.SphereGeometry(headRadius * 1.01, 24, 24, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.4);
      const stubbleMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.35,
      });
      const stubbleMesh = new THREE.Mesh(stubbleGeo, stubbleMat);
      stubbleMesh.scale.set(1.01, 1.18, 1.06);
      headGroup.add(stubbleMesh);
    }

    // =========================================================================
    // 3. 3D VOLUMETRIC HAIRSTYLE (True Meta Avatar 3D Volume)
    // =========================================================================
    const hairGroup = new THREE.Group();
    headGroup.add(hairGroup);

    if (config.hairStyle === "textured_crop" || config.hairStyle === "fade") {
      // Top Volume
      const topHairGeo = new THREE.SphereGeometry(headRadius * 1.06, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
      topHairGeo.scale(1.04, 1.25, 1.08);
      const topHairMesh = new THREE.Mesh(topHairGeo, hairMaterial);
      topHairMesh.position.set(0, 0.04, -0.02);
      hairGroup.add(topHairMesh);

      // Textured front fringe
      const fringeGeo = new THREE.CapsuleGeometry(0.04, 0.22, 6, 12);
      const fringeMesh = new THREE.Mesh(fringeGeo, hairMaterial);
      fringeMesh.rotation.z = Math.PI / 2;
      fringeMesh.position.set(0, 0.20, 0.24);
      hairGroup.add(fringeMesh);
    } else if (config.hairStyle === "middle_part") {
      const mainGeo = new THREE.SphereGeometry(headRadius * 1.08, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
      mainGeo.scale(1.05, 1.22, 1.1);
      const mainMesh = new THREE.Mesh(mainGeo, hairMaterial);
      hairGroup.add(mainMesh);

      // Left & right swept drapes
      [-1, 1].forEach((side) => {
        const drapeGeo = new THREE.CapsuleGeometry(0.035, 0.16, 6, 12);
        const drapeMesh = new THREE.Mesh(drapeGeo, hairMaterial);
        drapeMesh.position.set(side * 0.12, 0.10, 0.23);
        drapeMesh.rotation.z = side * 0.4;
        hairGroup.add(drapeMesh);
      });
    } else if (config.hairStyle === "messy_curls") {
      // Clustered 3D Curls
      for (let i = 0; i < 22; i++) {
        const curlGeo = new THREE.SphereGeometry(0.065 + (i % 3) * 0.015, 12, 12);
        const curlMesh = new THREE.Mesh(curlGeo, hairMaterial);
        const angle = (i / 22) * Math.PI * 2;
        const radius = 0.20 + (i % 2) * 0.05;
        const y = 0.16 + (i % 4) * 0.04;
        curlMesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius * 0.85);
        hairGroup.add(curlMesh);
      }
    } else if (config.hairStyle === "wolf_cut") {
      // Shag Wolf Cut with feathered shoulder-length layers
      const topGeo = new THREE.SphereGeometry(headRadius * 1.08, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
      topGeo.scale(1.06, 1.25, 1.12);
      const topMesh = new THREE.Mesh(topGeo, hairMaterial);
      hairGroup.add(topMesh);

      [-1, 1].forEach((side) => {
        const wingGeo = new THREE.CylinderGeometry(0.04, 0.02, 0.35, 12);
        const wingMesh = new THREE.Mesh(wingGeo, hairMaterial);
        wingMesh.position.set(side * 0.24, -0.08, -0.05);
        wingMesh.rotation.z = -side * 0.2;
        hairGroup.add(wingMesh);
      });
    } else if (config.hairStyle === "high_ponytail") {
      const sleekGeo = new THREE.SphereGeometry(headRadius * 1.05, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
      sleekGeo.scale(1.03, 1.2, 1.05);
      const sleekMesh = new THREE.Mesh(sleekGeo, hairMaterial);
      hairGroup.add(sleekMesh);

      // Top Ponytail Knot
      const knotGeo = new THREE.SphereGeometry(0.07, 12, 12);
      const knotMesh = new THREE.Mesh(knotGeo, hairMaterial);
      knotMesh.position.set(0, 0.38, -0.12);
      hairGroup.add(knotMesh);

      // Long Ponytail Drop
      const tailGeo = new THREE.CylinderGeometry(0.05, 0.02, 0.45, 12);
      const tailMesh = new THREE.Mesh(tailGeo, hairMaterial);
      tailMesh.position.set(0, 0.18, -0.24);
      tailMesh.rotation.x = -0.3;
      hairGroup.add(tailMesh);
    } else {
      // Buzz Cut
      const buzzGeo = new THREE.SphereGeometry(headRadius * 1.02, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
      buzzGeo.scale(1.02, 1.19, 1.03);
      const buzzMesh = new THREE.Mesh(buzzGeo, hairMaterial);
      buzzMesh.position.set(0, 0.01, 0);
      hairGroup.add(buzzMesh);
    }

    // =========================================================================
    // 4. 3D TORSO & STREETWEAR GARMENT DRAPE (Oversized Hoodie / T-Shirt)
    // =========================================================================
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.65, 0);
    rootGroup.add(torsoGroup);

    // Torso Body Mesh (T-Shirt / Hoodie Drape)
    const torsoWidth = 0.52 * shoulderScale * sizeMultiplier;
    const torsoHeight = 0.64;
    const torsoDepth = 0.28 * sizeMultiplier;

    const chestGeo = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth, 8, 8, 8);
    // Smooth and round corners of streetwear box
    const pos = chestGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      // Subtle barrel curvature
      pos.setZ(i, z * (1 + 0.15 * (1 - Math.abs(y / (torsoHeight / 2)))));
      pos.setX(i, x * (1 - 0.1 * ((y - torsoHeight / 2) / torsoHeight)));
    }
    chestGeo.computeVertexNormals();

    const torsoMesh = new THREE.Mesh(chestGeo, garmentMaterial);
    torsoGroup.add(torsoMesh);

    // Collar / Ribbed Neckline
    const collarGeo = new THREE.TorusGeometry(0.14, 0.025, 12, 32);
    collarGeo.rotateX(Math.PI / 2);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.position.set(0, torsoHeight / 2 + 0.01, 0);
    torsoGroup.add(collarMesh);

    // Left & Right Sleeves
    [-1, 1].forEach((side) => {
      const sleeveGeo = new THREE.CylinderGeometry(0.11 * sizeMultiplier, 0.10 * sizeMultiplier, 0.28, 16);
      sleeveGeo.rotateZ(side * 0.45);
      const sleeveMesh = new THREE.Mesh(sleeveGeo, garmentMaterial);
      sleeveMesh.position.set(side * (torsoWidth * 0.55), 0.16, 0);
      torsoGroup.add(sleeveMesh);

      // Arm & Hand (Skin)
      const armGeo = new THREE.CylinderGeometry(0.065, 0.06, 0.38, 16);
      armGeo.rotateZ(side * 0.15);
      const armMesh = new THREE.Mesh(armGeo, skinMaterial);
      armMesh.position.set(side * (torsoWidth * 0.68), -0.12, 0);
      torsoGroup.add(armMesh);

      // Stylized Hand
      const handGeo = new THREE.SphereGeometry(0.065, 12, 12);
      handGeo.scale(1, 1.2, 0.8);
      const handMesh = new THREE.Mesh(handGeo, skinMaterial);
      handMesh.position.set(side * (torsoWidth * 0.74), -0.34, 0);
      torsoGroup.add(handMesh);
    });

    // =========================================================================
    // 5. 3D LOWER BODY: BAGGY STREETWEAR CARGO PANTS
    // =========================================================================
    const legsGroup = new THREE.Group();
    legsGroup.position.set(0, 0.12, 0);
    rootGroup.add(legsGroup);

    [-1, 1].forEach((side) => {
      const legGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.65, 16);
      legGeo.rotateZ(side * 0.05);
      const legMesh = new THREE.Mesh(legGeo, pantsMaterial);
      legMesh.position.set(side * 0.15, -0.15, 0);
      legsGroup.add(legMesh);

      // Cargo Pocket Box
      const pocketGeo = new THREE.BoxGeometry(0.06, 0.12, 0.08);
      const pocketMesh = new THREE.Mesh(pocketGeo, pantsMaterial);
      pocketMesh.position.set(side * 0.28, -0.10, 0.02);
      legsGroup.add(pocketMesh);
    });

    // =========================================================================
    // 6. 3D SNEAKERS / CROCS (Streetwear Kicks)
    // =========================================================================
    [-1, 1].forEach((side) => {
      const shoeGroup = new THREE.Group();
      shoeGroup.position.set(side * 0.16, -0.42, 0.04);
      legsGroup.add(shoeGroup);

      // Chunky Outsole
      const soleGeo = new THREE.BoxGeometry(0.16, 0.06, 0.32);
      const soleMesh = new THREE.Mesh(soleGeo, sneakerSoleMaterial);
      soleMesh.position.set(0, 0.03, 0.04);
      shoeGroup.add(soleMesh);

      // Sneaker / Crocs Upper
      const upperGeo = new THREE.SphereGeometry(0.10, 16, 16);
      upperGeo.scale(1.2, 0.8, 1.8);
      const upperMesh = new THREE.Mesh(upperGeo, sneakerUpperMaterial);
      upperMesh.position.set(0, 0.08, 0.06);
      shoeGroup.add(upperMesh);
    });

    // =========================================================================
    // 7. 3D STREETWEAR ACCESSORIES (Cyber Shades & Cuban Chain)
    // =========================================================================
    if (config.eyewear === "cyber_shades") {
      const shadesGroup = new THREE.Group();
      shadesGroup.position.set(0, 0.04, 0.28);
      headGroup.add(shadesGroup);

      // Curved Visor Frame
      const visorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 32, 1, true, -Math.PI / 3, (Math.PI * 2) / 3);
      visorGeo.rotateY(Math.PI / 2);
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.85,
      });
      const visorMesh = new THREE.Mesh(visorGeo, visorMat);
      shadesGroup.add(visorMesh);
    } else if (config.eyewear === "retro_black") {
      const shadesGroup = new THREE.Group();
      shadesGroup.position.set(0, 0.04, 0.29);
      headGroup.add(shadesGroup);

      [-1, 1].forEach((side) => {
        const frameGeo = new THREE.BoxGeometry(0.09, 0.05, 0.02);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2, metalness: 0.5 });
        const frameMesh = new THREE.Mesh(frameGeo, frameMat);
        frameMesh.position.set(side * 0.08, 0, 0);
        shadesGroup.add(frameMesh);
      });
    }

    if (config.accessories === "silver_chain") {
      const chainGeo = new THREE.TorusGeometry(0.19, 0.015, 12, 32);
      chainGeo.rotateX(Math.PI / 2.3);
      const chainMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.95 });
      const chainMesh = new THREE.Mesh(chainGeo, chainMat);
      chainMesh.position.set(0, torsoHeight / 2 - 0.04, 0.02);
      torsoGroup.add(chainMesh);
    } else if (config.accessories === "pearl_choker") {
      const chokerGeo = new THREE.TorusGeometry(0.16, 0.014, 12, 32);
      chokerGeo.rotateX(Math.PI / 2);
      const chokerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.2 });
      const chokerMesh = new THREE.Mesh(chokerGeo, chokerMat);
      chokerMesh.position.set(0, torsoHeight / 2 + 0.02, 0);
      torsoGroup.add(chokerMesh);
    }

    // Offset entire avatar down slightly so feet rest at bottom of viewport
    rootGroup.position.set(0, -0.42, 0);
  }, [
    activeSize,
    config.accessories,
    config.bodyBuild,
    config.eyewear,
    config.facialHair,
    config.gender,
    config.hairColor,
    config.hairStyle,
    config.skinTone,
    garmentCategory,
    garmentColorHex,
    garmentImageUrl,
    garmentName,
  ]);

  /**
   * INITIALIZE THREE.JS ENGINE ON CANVAS
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth || 400;
    const height = canvas.clientHeight || 550;

    // 1. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    // 2. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 0.48, 3.8);
    cameraRef.current = camera;

    // 4. Lighting: Soft Pixar Key Light + Cool Fill + Emerald Cyber Rim Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff6ed, 2.0);
    keyLight.position.set(2.0, 3.5, 3.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.2);
    fillLight.position.set(-2.5, 1.5, 2.0);
    scene.add(fillLight);

    // Glowing Emerald Backlight Rim
    const rimLight = new THREE.DirectionalLight(0x10b981, 1.8);
    rimLight.position.set(0, 2.5, -3.0);
    scene.add(rimLight);

    // 5. Build Initial 3D Avatar
    build3DAvatar();

    // 6. Animation Loop (Smooth 60 FPS Render with Inertia Rotation)
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      // Smooth lerp rotation toward target
      currentRotationYRef.current = THREE.MathUtils.lerp(
        currentRotationYRef.current,
        targetRotationYRef.current,
        0.12
      );

      if (avatarGroupRef.current) {
        // Idle gentle breathing sway when not actively dragged
        const elapsed = clock.getElapsedTime();
        const idleSway = Math.sin(elapsed * 1.5) * 0.02;

        avatarGroupRef.current.rotation.y = currentRotationYRef.current;
        avatarGroupRef.current.position.y = -0.42 + idleSway;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle Resize
    const handleResize = () => {
      if (!canvas || !renderer || !camera) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      renderer.dispose();
    };
  }, [build3DAvatar]);

  // Rebuild 3D geometry when avatar config or product updates
  useEffect(() => {
    build3DAvatar();
  }, [build3DAvatar]);

  /**
   * TOUCH & MOUSE 360° DRAG TO ROTATE
   */
  const handlePointerDown = (clientX: number) => {
    isDraggingRef.current = true;
    previousMouseXRef.current = clientX;
    setIsRotating(true);
  };

  const handlePointerMove = (clientX: number) => {
    if (!isDraggingRef.current) return;
    const deltaX = clientX - previousMouseXRef.current;
    previousMouseXRef.current = clientX;
    // Rotate sensitivity
    targetRotationYRef.current += deltaX * 0.012;
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    setIsRotating(false);
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden touch-none ${className}`}
      onMouseDown={(e) => handlePointerDown(e.clientX)}
      onMouseMove={(e) => handlePointerMove(e.clientX)}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
      onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
      onTouchEnd={handlePointerUp}
    >
      {/* Background Cyber Ambient Radial Glow */}
      <div className="absolute inset-0 bg-radial from-emerald-500/12 via-black/80 to-black pointer-events-none" />

      {/* 3D Ground Neon Pedestal */}
      <div className="absolute bottom-6 w-52 h-10 rounded-[100%] bg-emerald-500/15 blur-xl pointer-events-none" />
      <div className="absolute bottom-5 w-44 h-4 rounded-[100%] border border-emerald-500/30 bg-zinc-950/80 shadow-[0_0_25px_rgba(16,185,129,0.35)] pointer-events-none" />

      {/* Floating 360 Rotation Guidance */}
      <div className="absolute top-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 border border-zinc-800 text-[10px] font-bold text-zinc-300 backdrop-blur-md shadow-lg pointer-events-none">
        <Move3d size={13} className="text-emerald-400 animate-pulse" />
        <span>Drag to rotate 360°</span>
      </div>

      {/* Reset Front Rotation View Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleResetRotation();
        }}
        className="absolute bottom-16 right-4 z-20 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-black/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-[10px] font-bold transition shadow-lg backdrop-blur-md active:scale-95 cursor-pointer"
        title="Reset to front view"
      >
        <RotateCw size={12} className={isRotating ? "animate-spin" : ""} />
        <span>Front View</span>
      </button>

      {/* True WebGL Three.js Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full max-h-[58vh] sm:max-h-[64vh] cursor-grab active:cursor-grabbing z-10"
      />
    </div>
  );
}
