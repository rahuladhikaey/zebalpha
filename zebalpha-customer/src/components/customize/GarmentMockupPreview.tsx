"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  Sparkles,
  RotateCw,
  RotateCcw,
  Move,
  Maximize2,
  Eye,
  SlidersHorizontal,
} from "lucide-react";

export type GarmentType = "oversized_tee" | "hoodie" | "standard_tee" | "tote_bag" | string;
export type PlacementPosition = "front_chest" | "full_front" | "pocket" | "back";

export interface GarmentColorOption {
  name: string;
  hex: string;
  isDark: boolean;
}

export const GARMENT_COLORS: GarmentColorOption[] = [
  { name: "Jet Black", hex: "#1C1E24", isDark: true },
  { name: "Off-White", hex: "#F2EFE8", isDark: false },
  { name: "Vintage Beige", hex: "#D6C5A5", isDark: false },
  { name: "Royal Navy", hex: "#142645", isDark: true },
  { name: "Maroon Crimson", hex: "#5A1120", isDark: true },
  { name: "Forest Green", hex: "#133B27", isDark: true },
  { name: "Charcoal Ash", hex: "#353942", isDark: true },
  { name: "Dusty Rose", hex: "#BC7D85", isDark: false },
];

export const GARMENT_TYPES: {
  id: GarmentType;
  label: string;
  gsm: string;
  badge: string;
  basePrice?: number;
}[] = [
  { id: "oversized_tee", label: "Oversized Heavy Tee", gsm: "240 GSM", badge: "POPULAR", basePrice: 799 },
  { id: "hoodie", label: "Streetwear Fleece Hoodie", gsm: "380 GSM", badge: "WINTER", basePrice: 1499 },
  { id: "standard_tee", label: "Classic Combed Cotton Tee", gsm: "190 GSM", badge: "DAILY", basePrice: 499 },
  { id: "tote_bag", label: "Heavy Canvas Tote Bag", gsm: "340 GSM", badge: "ECO", basePrice: 399 },
];

export interface PrintTransform {
  scale: number; // 0.6 to 1.35
  offsetX: number; // -0.25 to 0.25
  offsetY: number; // -0.25 to 0.25
}

interface GarmentMockupPreviewProps {
  garmentType: GarmentType;
  garmentLabel?: string;
  selectedColor: GarmentColorOption;
  designImageSrc: string | null;
  designTitle?: string;
  placement: PlacementPosition;
  printTransform?: PrintTransform;
  onPrintTransformChange?: (next: PrintTransform) => void;
  isSubmitting?: boolean;
}

type NormalizedGarmentKind = "oversized_tee" | "standard_tee" | "hoodie" | "tote_bag";

function normalizeGarmentKind(rawType: string, rawLabel?: string): NormalizedGarmentKind {
  const hint = `${rawType || ""} ${rawLabel || ""}`.toLowerCase();
  if (hint.includes("tote") || hint.includes("bag")) return "tote_bag";
  if (hint.includes("hoodie") || hint.includes("fleece") || hint.includes("sweat")) return "hoodie";
  if (hint.includes("standard") || hint.includes("classic") || hint.includes("regular")) return "standard_tee";
  return "oversized_tee";
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Evaluates a point on the sculpted 3D T-shirt / Hoodie torso surface.
 * v in [0, 1] from bottom hem to collar top; theta = 0 is Front (+Z), theta = PI is Back (-Z).
 */
function evaluateTorsoPoint(
  v: number,
  theta: number,
  kind: NormalizedGarmentKind
): { x: number; y: number; z: number; rx: number; rz: number } {
  const isHoodie = kind === "hoodie";
  const isOversized = kind === "oversized_tee";

  const wBase = isHoodie ? 0.9 : isOversized ? 0.87 : 0.78;
  const dBase = isHoodie ? 0.43 : isOversized ? 0.39 : 0.35;

  // Anatomical width profile from bottom hem -> waist -> chest -> shoulders -> neck
  let widthMult = 1.0;
  if (v < 0.35) {
    const t = v / 0.35;
    widthMult = isHoodie
      ? 0.9 + 0.09 * smoothstep(0, 1, t)
      : isOversized
      ? 0.99 - 0.015 * Math.sin(t * Math.PI)
      : 0.98 - 0.055 * Math.sin(t * Math.PI * 0.85);
  } else if (v < 0.86) {
    const t = (v - 0.35) / 0.51;
    widthMult = (isOversized || isHoodie ? 0.985 : 0.93) + (isOversized || isHoodie ? 0.075 : 0.11) * smoothstep(0, 1, t);
  } else {
    const t = (v - 0.86) / 0.14;
    const shoulderW = wBase * (isOversized || isHoodie ? 1.06 : 1.04);
    const neckW = isHoodie ? 0.36 : 0.32;
    widthMult = (shoulderW + (neckW - shoulderW) * smoothstep(0, 1, t)) / wBase;
  }

  // Depth profile: fuller chest, tapered shoulders & neck
  let depthMult = 0.94 + 0.12 * Math.sin(v * Math.PI * 0.95);
  if (v > 0.86) {
    const t = (v - 0.86) / 0.14;
    const neckD = isHoodie ? 0.28 : 0.23;
    depthMult = depthMult * (1 - smoothstep(0, 1, t)) + (neckD / dBase) * smoothstep(0, 1, t);
  }

  const rx = wBase * widthMult;
  const rz = dBase * depthMult;

  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);

  // Subtle realistic chest fullness on front (+Z) and soft back curve (-Z)
  const chestBoost = cosT > 0 ? 1 + 0.055 * Math.pow(cosT, 2) * Math.sin(v * Math.PI) : 1;

  // Natural soft vertical fabric drape ripples (stronger near bottom hem)
  const hemFactor = Math.pow(1 - v, 1.6);
  const drape = 1 + hemFactor * 0.018 * Math.sin(theta * 5 + 0.45) + 0.006 * Math.sin(theta * 3 - v * 2.4);

  const x = rx * sinT * drape;
  const z = rz * cosT * chestBoost * drape;

  let y = -1.12 + v * 2.16;

  // Natural downward shoulder slope near the outer shoulder edges
  if (v > 0.74) {
    const t = smoothstep(0.74, 1.0, v);
    y -= 0.13 * t * Math.pow(Math.abs(sinT), 1.8) * (1 - 0.55 * smoothstep(0.9, 1.0, v));
  }

  // Sculpted crew-neck U-scoop on front, gentle curve on back
  if (v > 0.8) {
    const t = Math.pow((v - 0.8) / 0.2, 1.8);
    const frontScoop = Math.max(0, cosT);
    const backScoop = Math.max(0, -cosT);
    y -= (isHoodie ? 0.15 : 0.21) * t * Math.pow(frontScoop, 2.2);
    y -= 0.055 * t * Math.pow(backScoop, 2.0);
  }

  return { x, y, z, rx, rz };
}

function buildTorsoGeometry(kind: NormalizedGarmentKind): THREE.BufferGeometry {
  const radialSegs = 72;
  const heightSegs = 48;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= heightSegs; iy++) {
    const v = iy / heightSegs;
    for (let ix = 0; ix <= radialSegs; ix++) {
      const u = ix / radialSegs;
      const theta = u * Math.PI * 2;
      const pt = evaluateTorsoPoint(v, theta, kind);
      positions.push(pt.x, pt.y, pt.z);
      uvs.push(u * 2, v * 2);
    }
  }

  const stride = radialSegs + 1;
  for (let iy = 0; iy < heightSegs; iy++) {
    for (let ix = 0; ix < radialSegs; ix++) {
      const a = iy * stride + ix;
      const b = a + 1;
      const c = (iy + 1) * stride + ix;
      const d = c + 1;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

function buildCollarGeometry(kind: NormalizedGarmentKind): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const count = 48;
  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2;
    const p = evaluateTorsoPoint(0.992, theta, kind);
    pts.push(new THREE.Vector3(p.x, p.y, p.z));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  return new THREE.TubeGeometry(curve, 64, kind === "hoodie" ? 0.055 : 0.042, 14, true);
}

function buildHemGeometry(kind: NormalizedGarmentKind): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const count = 56;
  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2;
    const p = evaluateTorsoPoint(0.015, theta, kind);
    pts.push(new THREE.Vector3(p.x, p.y, p.z));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  return new THREE.TubeGeometry(curve, 64, kind === "hoodie" ? 0.052 : 0.018, 10, true);
}

function buildSleeveGroup(
  side: -1 | 1,
  kind: NormalizedGarmentKind,
  fabricMat: THREE.MeshStandardMaterial,
  ribMat: THREE.MeshStandardMaterial,
  innerMat: THREE.MeshStandardMaterial
): THREE.Group {
  const group = new THREE.Group();
  const isHoodie = kind === "hoodie";
  const isOversized = kind === "oversized_tee";

  // Curved path from inside upper shoulder outward and downward
  const points = isHoodie
    ? [
        new THREE.Vector3(side * 0.68, 0.72, 0.0),
        new THREE.Vector3(side * 1.02, 0.56, 0.02),
        new THREE.Vector3(side * 1.24, 0.05, 0.06),
        new THREE.Vector3(side * 1.32, -0.52, 0.1),
        new THREE.Vector3(side * 1.34, -0.98, 0.12),
      ]
    : isOversized
    ? [
        new THREE.Vector3(side * 0.66, 0.72, 0.0),
        new THREE.Vector3(side * 1.02, 0.56, 0.01),
        new THREE.Vector3(side * 1.28, 0.24, 0.02),
        new THREE.Vector3(side * 1.44, -0.02, 0.02),
      ]
    : [
        new THREE.Vector3(side * 0.60, 0.73, 0.0),
        new THREE.Vector3(side * 0.94, 0.60, 0.01),
        new THREE.Vector3(side * 1.18, 0.36, 0.01),
        new THREE.Vector3(side * 1.30, 0.20, 0.01),
      ];

  const curve = new THREE.CatmullRomCurve3(points);
  const lengthSegs = isHoodie ? 36 : 24;
  const radialSegs = 32;
  const frames = curve.computeFrenetFrames(lengthSegs, false);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const rStart = isHoodie ? 0.34 : isOversized ? 0.32 : 0.28;
  const rEnd = isHoodie ? 0.165 : isOversized ? 0.255 : 0.215;

  for (let i = 0; i <= lengthSegs; i++) {
    const t = i / lengthSegs;
    const center = curve.getPointAt(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const radius = rStart + (rEnd - rStart) * Math.pow(t, 0.85);

    for (let j = 0; j <= radialSegs; j++) {
      const phi = (j / radialSegs) * Math.PI * 2;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);
      // Slight elliptical cross-section for natural draped sleeve
      const localR = radius * (1 + 0.06 * cosP * cosP);
      const vx = center.x + localR * (cosP * N.x + sinP * B.x);
      const vy = center.y + localR * (cosP * N.y + sinP * B.y);
      const vz = center.z + localR * (cosP * N.z + sinP * B.z);
      positions.push(vx, vy, vz);
      uvs.push(j / radialSegs, t);
    }
  }

  const stride = radialSegs + 1;
  for (let i = 0; i < lengthSegs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * stride + j;
      const b = a + 1;
      const c = (i + 1) * stride + j;
      const d = c + 1;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  const sleeveGeom = new THREE.BufferGeometry();
  sleeveGeom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  sleeveGeom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  sleeveGeom.setIndex(indices);
  sleeveGeom.computeVertexNormals();

  const sleeveMesh = new THREE.Mesh(sleeveGeom, fabricMat);
  sleeveMesh.castShadow = true;
  sleeveMesh.receiveShadow = true;
  group.add(sleeveMesh);

  // Dark hollow cuff cap + clean cuff rib ring at end of sleeve
  const endPt = curve.getPointAt(1);
  const endTangent = curve.getTangentAt(1).normalize();
  const capGeom = new THREE.CircleGeometry(rEnd * 0.96, 28);
  const capMesh = new THREE.Mesh(capGeom, innerMat);
  capMesh.position.copy(endPt);
  capMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), endTangent);
  group.add(capMesh);

  const cuffGeom = new THREE.TorusGeometry(rEnd * 0.99, isHoodie ? 0.036 : 0.015, 10, 32);
  const cuffMesh = new THREE.Mesh(cuffGeom, isHoodie ? ribMat : fabricMat);
  cuffMesh.position.copy(endPt);
  cuffMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), endTangent);
  group.add(cuffMesh);

  return group;
}

function buildHoodieExtras(
  fabricMat: THREE.MeshStandardMaterial,
  innerMat: THREE.MeshStandardMaterial
): THREE.Group {
  const extras = new THREE.Group();

  // 1. Sculpted 3D Hood shell rising around back & sides of neckline
  const hoodGeom = new THREE.SphereGeometry(0.46, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.62);
  hoodGeom.scale(1.12, 0.92, 1.18);
  const hoodMesh = new THREE.Mesh(hoodGeom, fabricMat);
  hoodMesh.position.set(0, 0.96, -0.15);
  hoodMesh.rotation.x = -0.58;
  extras.add(hoodMesh);

  const hoodInner = new THREE.Mesh(hoodGeom.clone(), innerMat);
  hoodInner.scale.set(0.95, 0.95, 0.95);
  hoodInner.position.copy(hoodMesh.position);
  hoodInner.rotation.copy(hoodMesh.rotation);
  extras.add(hoodInner);

  // 2. Sculpted Kangaroo Pocket conforming onto lower front torso
  const pSegsX = 20;
  const pSegsY = 12;
  const pPos: number[] = [];
  const pUv: number[] = [];
  const pIdx: number[] = [];
  for (let iy = 0; iy <= pSegsY; iy++) {
    const ty = iy / pSegsY;
    const v = 0.1 + ty * 0.25;
    const halfW = 0.56 - ty * 0.14;
    for (let ix = 0; ix <= pSegsX; ix++) {
      const tx = ix / pSegsX;
      const xTarget = (tx - 0.5) * 2 * halfW;
      const theta = Math.asin(Math.max(-0.78, Math.min(0.78, xTarget / 0.88)));
      const pt = evaluateTorsoPoint(v, theta, "hoodie");
      // Slight puffy 3D elevation outward
      const puff = 0.032 + 0.02 * Math.sin(tx * Math.PI) * Math.sin(ty * Math.PI);
      pPos.push(pt.x, pt.y, pt.z + puff);
      pUv.push(tx, ty);
    }
  }
  const pStride = pSegsX + 1;
  for (let iy = 0; iy < pSegsY; iy++) {
    for (let ix = 0; ix < pSegsX; ix++) {
      const a = iy * pStride + ix;
      const b = a + 1;
      const c = (iy + 1) * pStride + ix;
      const d = c + 1;
      pIdx.push(a, b, d, a, d, c);
    }
  }
  const pocketGeom = new THREE.BufferGeometry();
  pocketGeom.setAttribute("position", new THREE.Float32BufferAttribute(pPos, 3));
  pocketGeom.setAttribute("uv", new THREE.Float32BufferAttribute(pUv, 2));
  pocketGeom.setIndex(pIdx);
  pocketGeom.computeVertexNormals();
  const pocketMesh = new THREE.Mesh(pocketGeom, fabricMat);
  extras.add(pocketMesh);

  // 3. Twin Hoodie Drawstrings + brushed silver aglets
  const cordMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.75, metalness: 0.1 });
  const agletMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.25, metalness: 0.85 });

  [-1, 1].forEach((side) => {
    const cordCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.11, 0.82, 0.34),
      new THREE.Vector3(side * 0.125, 0.62, 0.43),
      new THREE.Vector3(side * 0.13, 0.38, 0.455),
    ]);
    const cord = new THREE.Mesh(new THREE.TubeGeometry(cordCurve, 16, 0.011, 8, false), cordMat);
    extras.add(cord);

    const aglet = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.055, 10), agletMat);
    aglet.position.set(side * 0.13, 0.355, 0.455);
    extras.add(aglet);
  });

  return extras;
}

function buildToteBagGroup(
  fabricMat: THREE.MeshStandardMaterial,
  innerMat: THREE.MeshStandardMaterial
): THREE.Group {
  const group = new THREE.Group();

  // Sculpted slightly-bulged canvas tote body
  const segX = 28;
  const segY = 24;
  const segZ = 10;
  const boxGeom = new THREE.BoxGeometry(1.66, 1.78, 0.42, segX, segY, segZ);
  const pos = boxGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const ny = (y + 0.89) / 1.78;
    // Slight realistic taper toward bottom & gentle canvas swell in center
    const taper = 0.94 + 0.06 * ny;
    const swell = 1 + 0.1 * Math.cos((x / 0.83) * Math.PI * 0.5) * Math.sin(ny * Math.PI);
    x *= taper;
    z *= swell;
    pos.setXYZ(i, x, y - 0.18, z);
  }
  boxGeom.computeVertexNormals();
  const bodyMesh = new THREE.Mesh(boxGeom, fabricMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // Recessed dark interior opening at top
  const topOpening = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.06, 0.30), innerMat);
  topOpening.position.set(0, 0.70, 0);
  group.add(topOpening);

  // Twin curved arched canvas shoulder handles (Front & Back)
  [-0.17, 0.17].forEach((zOff) => {
    const strapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.42, 0.64, zOff),
      new THREE.Vector3(-0.38, 1.24, zOff * 1.05),
      new THREE.Vector3(0, 1.46, zOff * 1.05),
      new THREE.Vector3(0.38, 1.24, zOff * 1.05),
      new THREE.Vector3(0.42, 0.64, zOff),
    ]);
    const strapGeom = new THREE.TubeGeometry(strapCurve, 36, 0.042, 10, false);
    strapGeom.scale(1, 1, 0.45);
    const strapMesh = new THREE.Mesh(strapGeom, fabricMat);
    group.add(strapMesh);
  });

  return group;
}

/**
 * Builds a high-resolution curved print decal mesh that hugs the exact 3D garment surface
 * with zero z-fighting and exact artwork aspect-ratio preservation.
 */
function buildConformingDecalGeometry(
  kind: NormalizedGarmentKind,
  placement: PlacementPosition,
  transform: PrintTransform,
  aspectRatio: number
): THREE.BufferGeometry {
  const isBack = placement === "back";
  const isTote = kind === "tote_bag";

  // Base bounding box in 3D model units per placement preset
  let baseCenterX = 0;
  let baseCenterY = isTote ? -0.18 : 0.22;
  let maxW = isTote ? 0.96 : 0.76;
  let maxH = isTote ? 0.96 : 0.76;

  if (!isTote) {
    switch (placement) {
      case "pocket":
        baseCenterX = 0.32;
        baseCenterY = 0.40;
        maxW = 0.32;
        maxH = 0.32;
        break;
      case "full_front":
        baseCenterX = 0;
        baseCenterY = 0.04;
        maxW = 1.06;
        maxH = 1.14;
        break;
      case "back":
        baseCenterX = 0;
        baseCenterY = 0.16;
        maxW = 1.02;
        maxH = 1.12;
        break;
      case "front_chest":
      default:
        baseCenterX = 0;
        baseCenterY = 0.24;
        maxW = 0.78;
        maxH = 0.78;
        break;
    }
  } else if (placement === "pocket") {
    baseCenterX = 0.3;
    baseCenterY = 0.12;
    maxW = 0.42;
    maxH = 0.42;
  } else if (placement === "full_front" || placement === "back") {
    maxW = 1.12;
    maxH = 1.12;
  }

  // Fit aspect ratio cleanly without distortion
  const safeAspect = Number.isFinite(aspectRatio) && aspectRatio > 0.1 ? aspectRatio : 1;
  let printW = maxW;
  let printH = maxW / safeAspect;
  if (printH > maxH) {
    printH = maxH;
    printW = maxH * safeAspect;
  }

  // Apply user live scale & X/Y try-view offsets
  const clampedScale = Math.max(0.55, Math.min(1.4, transform.scale || 1));
  printW *= clampedScale;
  printH *= clampedScale;

  const centerX = baseCenterX + (transform.offsetX || 0) * 0.75;
  const centerY = baseCenterY + (transform.offsetY || 0) * 0.75;

  const segsX = 28;
  const segsY = 28;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= segsY; iy++) {
    const ty = iy / segsY;
    const localY = (ty - 0.5) * printH;

    for (let ix = 0; ix <= segsX; ix++) {
      const tx = ix / segsX;
      const localX = (tx - 0.5) * printW;

      if (isTote) {
        const rawX = Math.max(-0.74, Math.min(0.74, centerX + localX));
        const rawY = Math.max(-0.98, Math.min(0.56, centerY + localY));
        const x = isBack ? -rawX : rawX;
        const ny = (rawY + 0.18 + 0.89) / 1.78;
        const swell = 1 + 0.1 * Math.cos((x / 0.83) * Math.PI * 0.5) * Math.sin(Math.max(0, Math.min(1, ny)) * Math.PI);
        const z = (isBack ? -1 : 1) * (0.21 * swell + 0.018);
        positions.push(x, rawY, z);
      } else {
        const yTarget = Math.max(-0.96, Math.min(0.76, centerY + localY));
        const v = Math.max(0.06, Math.min(0.86, (yTarget + 1.12) / 2.16));
        const ref = evaluateTorsoPoint(v, isBack ? Math.PI : 0, kind);
        const xTarget = centerX + localX;
        const ratio = Math.max(-0.76, Math.min(0.76, xTarget / Math.max(0.4, ref.rx)));
        const alpha = Math.asin(ratio);
        const theta = isBack ? Math.PI + alpha : alpha;
        const pt = evaluateTorsoPoint(v, theta, kind);

        // Push slightly outward along horizontal radial normal to guarantee zero z-fighting
        const nLen = Math.hypot(pt.x, pt.z) || 1;
        const offset = 0.016;
        positions.push(pt.x + (pt.x / nLen) * offset, pt.y, pt.z + (pt.z / nLen) * offset);
      }

      uvs.push(tx, ty);
    }
  }

  const stride = segsX + 1;
  for (let iy = 0; iy < segsY; iy++) {
    for (let ix = 0; ix < segsX; ix++) {
      const a = iy * stride + ix;
      const b = a + 1;
      const c = (iy + 1) * stride + ix;
      const d = c + 1;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Generates a subtle procedural cotton jersey micro-weave bump texture once in memory.
 */
function createCottonWeaveTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const knit = ((x + y) % 4 === 0 ? 18 : -14) + ((x * 7 + y * 13) % 11) - 5;
      const v = Math.max(0, Math.min(255, 128 + knit));
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  return tex;
}

const DEFAULT_TRANSFORM: PrintTransform = { scale: 1, offsetX: 0, offsetY: 0 };

export function GarmentMockupPreview({
  garmentType,
  garmentLabel,
  selectedColor,
  designImageSrc,
  designTitle = "Custom Graphic",
  placement,
  printTransform = DEFAULT_TRANSFORM,
  onPrintTransformChange,
  isSubmitting = false,
}: GarmentMockupPreviewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [viewSide, setViewSide] = useState<"front" | "back">("front");
  const [showFineTune, setShowFineTune] = useState(false);
  const [artworkAspect, setArtworkAspect] = useState<number>(1);
  const [isLoadingTexture, setIsLoadingTexture] = useState(false);

  const normalizedKind = useMemo(
    () => normalizeGarmentKind(garmentType, garmentLabel),
    [garmentType, garmentLabel]
  );

  // Refs shared with the live Three.js render loop
  const garmentRootRef = useRef<THREE.Group | null>(null);
  const garmentMeshGroupRef = useRef<THREE.Group | null>(null);
  const fabricMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const ribMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const innerMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const decalMeshRef = useRef<THREE.Mesh | null>(null);
  const decalMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  const targetRotYRef = useRef<number>(0);
  const currentRotYRef = useRef<number>(0);
  const targetRotXRef = useRef<number>(0.04);
  const currentRotXRef = useRef<number>(0.04);
  const autoSpinRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const dragLastXRef = useRef<number>(0);
  const dragLastYRef = useRef<number>(0);
  const targetColorRef = useRef<THREE.Color>(new THREE.Color(selectedColor.hex));

  useEffect(() => {
    autoSpinRef.current = autoSpin;
  }, [autoSpin]);

  // Auto-turn 3D garment when user switches between Front / Back print placement
  useEffect(() => {
    if (placement === "back") {
      setViewSide("back");
      setAutoSpin(false);
      targetRotYRef.current = Math.PI;
    } else {
      setViewSide("front");
      setAutoSpin(false);
      targetRotYRef.current = 0;
    }
  }, [placement]);

  // Update target color smoothly whenever user clicks a garment swatch
  useEffect(() => {
    targetColorRef.current.set(selectedColor.hex);
  }, [selectedColor.hex]);

  // Initialize Three.js Studio Scene ONCE
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 420;
    renderer.setSize(width, height);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50);
    camera.position.set(0, 0.06, 5.15);
    camera.lookAt(0, -0.02, 0);

    // 4-Point Luxury Studio Lighting (makes even Jet Black folds & collar edges pop cleanly)
    const hemiLight = new THREE.HemisphereLight(0xfffaf0, 0x262936, 1.55);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff6e8, 2.25);
    keyLight.position.set(3.2, 4.4, 4.6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(512, 512);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.1);
    fillLight.position.set(-4.0, 1.8, 3.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfde68a, 1.35);
    rimLight.position.set(-1.5, 3.4, -4.4);
    scene.add(rimLight);

    const rimLightRight = new THREE.DirectionalLight(0x6ee7b7, 0.85);
    rimLightRight.position.set(3.4, 1.2, -3.5);
    scene.add(rimLightRight);

    // Soft studio floor shadow disc beneath garment
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext("2d");
    if (sctx) {
      const grad = sctx.createRadialGradient(128, 128, 12, 128, 128, 120);
      grad.addColorStop(0, "rgba(0,0,0,0.65)");
      grad.addColorStop(0.55, "rgba(0,0,0,0.22)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, 256, 256);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const floorShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.3),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    floorShadow.rotation.x = -Math.PI / 2;
    floorShadow.position.y = -1.42;
    scene.add(floorShadow);

    // Shared procedural fabric materials
    const weaveTex = createCottonWeaveTexture();
    const initialCol = new THREE.Color(selectedColor.hex);

    const fabricMat = new THREE.MeshStandardMaterial({
      color: initialCol.clone(),
      roughness: 0.86,
      metalness: 0.03,
      bumpMap: weaveTex || undefined,
      bumpScale: 0.012,
      side: THREE.FrontSide,
    });

    const ribMat = new THREE.MeshStandardMaterial({
      color: initialCol.clone().multiplyScalar(0.92),
      roughness: 0.92,
      metalness: 0.02,
      bumpMap: weaveTex || undefined,
      bumpScale: 0.018,
    });

    const innerMat = new THREE.MeshStandardMaterial({
      color: initialCol.clone().multiplyScalar(0.35),
      roughness: 0.96,
      metalness: 0.0,
      side: THREE.BackSide,
    });

    const decalMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.72,
      metalness: 0.02,
      bumpMap: weaveTex || undefined,
      bumpScale: 0.005,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      opacity: 0,
    });

    fabricMatRef.current = fabricMat;
    ribMatRef.current = ribMat;
    innerMatRef.current = innerMat;
    decalMatRef.current = decalMat;

    const rootGroup = new THREE.Group();
    const meshGroup = new THREE.Group();
    rootGroup.add(meshGroup);

    const decalMesh = new THREE.Mesh(
      buildConformingDecalGeometry(normalizedKind, placement, printTransform, 1),
      decalMat
    );
    decalMesh.renderOrder = 2;
    rootGroup.add(decalMesh);

    scene.add(rootGroup);
    garmentRootRef.current = rootGroup;
    garmentMeshGroupRef.current = meshGroup;
    decalMeshRef.current = decalMesh;

    // ResizeObserver for crisp responsive framing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(200, Math.floor(entry.contentRect.width));
        const h = Math.max(240, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    // 60fps smooth render loop
    let rafId = 0;
    let lastTime = performance.now();
    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      if (document.hidden) {
        lastTime = now;
        return;
      }

      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (autoSpinRef.current && !isDraggingRef.current) {
        targetRotYRef.current += dt * 0.72;
      }

      // Smooth damped rotation + subtle floating studio breath
      const ease = 1 - Math.exp(-8 * dt);
      currentRotYRef.current += (targetRotYRef.current - currentRotYRef.current) * ease;
      currentRotXRef.current += (targetRotXRef.current - currentRotXRef.current) * ease;

      rootGroup.rotation.y = currentRotYRef.current;
      rootGroup.rotation.x = currentRotXRef.current;
      rootGroup.position.y = Math.sin(now * 0.0018) * 0.025;

      // Smooth fabric color lerp
      fabricMat.color.lerp(targetColorRef.current, Math.min(1, dt * 10));
      ribMat.color.copy(fabricMat.color).multiplyScalar(0.91);
      innerMat.color.copy(fabricMat.color).multiplyScalar(0.36);

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      if (decalMat.map) decalMat.map.dispose();
      decalMat.dispose();
      fabricMat.dispose();
      ribMat.dispose();
      innerMat.dispose();
      weaveTex?.dispose();
      shadowTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild 3D Garment Geometry cleanly whenever Garment Type changes
  useEffect(() => {
    const meshGroup = garmentMeshGroupRef.current;
    const fabricMat = fabricMatRef.current;
    const ribMat = ribMatRef.current;
    const innerMat = innerMatRef.current;
    if (!meshGroup || !fabricMat || !ribMat || !innerMat) return;

    // Dispose old meshes
    while (meshGroup.children.length > 0) {
      const child = meshGroup.children.pop();
      if (!child) continue;
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
    }

    if (normalizedKind === "tote_bag") {
      meshGroup.add(buildToteBagGroup(fabricMat, innerMat));
    } else {
      const torsoGeom = buildTorsoGeometry(normalizedKind);
      const torsoMesh = new THREE.Mesh(torsoGeom, fabricMat);
      torsoMesh.castShadow = true;
      torsoMesh.receiveShadow = true;
      meshGroup.add(torsoMesh);

      const innerTorsoMesh = new THREE.Mesh(torsoGeom.clone(), innerMat);
      meshGroup.add(innerTorsoMesh);

      const collarMesh = new THREE.Mesh(buildCollarGeometry(normalizedKind), ribMat);
      meshGroup.add(collarMesh);

      const hemMesh = new THREE.Mesh(buildHemGeometry(normalizedKind), normalizedKind === "hoodie" ? ribMat : fabricMat);
      meshGroup.add(hemMesh);

      meshGroup.add(buildSleeveGroup(-1, normalizedKind, fabricMat, ribMat, innerMat));
      meshGroup.add(buildSleeveGroup(1, normalizedKind, fabricMat, ribMat, innerMat));

      if (normalizedKind === "hoodie") {
        meshGroup.add(buildHoodieExtras(fabricMat, innerMat));
      }
    }
  }, [normalizedKind]);

  // Update Decal Mesh Geometry whenever garment, placement, scale, offset, or image aspect changes
  useEffect(() => {
    const decalMesh = decalMeshRef.current;
    if (!decalMesh) return;
    const nextGeom = buildConformingDecalGeometry(
      normalizedKind,
      placement,
      printTransform,
      artworkAspect
    );
    decalMesh.geometry.dispose();
    decalMesh.geometry = nextGeom;
  }, [normalizedKind, placement, printTransform, artworkAspect]);

  // Load & apply live Design Texture onto the 3D Garment
  useEffect(() => {
    const decalMat = decalMatRef.current;
    if (!decalMat) return;

    if (!designImageSrc) {
      if (decalMat.map) {
        decalMat.map.dispose();
        decalMat.map = null;
      }
      decalMat.opacity = 0;
      decalMat.needsUpdate = true;
      return;
    }

    let cancelled = false;
    setIsLoadingTexture(true);

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const w = img.naturalWidth || 1;
      const h = img.naturalHeight || 1;
      setArtworkAspect(w / h);

      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;

      if (decalMat.map) decalMat.map.dispose();
      decalMat.map = tex;
      decalMat.opacity = 0.98;
      decalMat.needsUpdate = true;
      setIsLoadingTexture(false);
    };
    img.onerror = () => {
      if (cancelled) return;
      setIsLoadingTexture(false);
    };
    img.src = designImageSrc;

    return () => {
      cancelled = true;
    };
  }, [designImageSrc]);

  // Pointer drag-to-spin 360° (horizontal spin preserves vertical page scroll on phones!)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    setAutoSpin(false);
    dragLastXRef.current = e.clientX;
    dragLastYRef.current = e.clientY;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if capture unsupported
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragLastXRef.current;
    const dy = e.clientY - dragLastYRef.current;
    dragLastXRef.current = e.clientX;
    dragLastYRef.current = e.clientY;

    targetRotYRef.current += dx * 0.012;
    targetRotXRef.current = Math.max(-0.28, Math.min(0.32, targetRotXRef.current + dy * 0.004));
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const snapToView = (side: "front" | "back") => {
    setAutoSpin(false);
    setViewSide(side);
    targetRotXRef.current = 0.04;
    // Pick nearest congruent angle so rotation never whips multiple turns
    const baseTarget = side === "back" ? Math.PI : 0;
    const twoPi = Math.PI * 2;
    const current = currentRotYRef.current;
    const turns = Math.round((current - baseTarget) / twoPi);
    targetRotYRef.current = baseTarget + turns * twoPi;
  };

  const updateTransform = (patch: Partial<PrintTransform>) => {
    if (!onPrintTransformChange) return;
    onPrintTransformChange({ ...printTransform, ...patch });
  };

  const displayGarmentName =
    garmentLabel || GARMENT_TYPES.find((g) => g.id === garmentType)?.label || "Custom Tee";

  return (
    <div className="space-y-3">
      {/* 3D Interactive Garment Stage */}
      <div className="relative w-full aspect-[4/4.6] sm:aspect-square rounded-3xl bg-[radial-gradient(circle_at_50%_38%,#323847_0%,#151821_55%,#090a0e_100%)] border border-zinc-700/80 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.75)] select-none">
        {/* Subtle Colored Studio Rim Aura */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none transition-colors duration-500 blur-3xl"
          style={{ backgroundColor: selectedColor.hex }}
        />

        {/* Subtle Studio Grid Backdrop */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(251,191,36,0.9) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Top Single-Line Studio HUD */}
        <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
          <div className="inline-flex items-center gap-1.5 min-w-0 max-w-[68%] px-2.5 py-1 rounded-full bg-black/70 border border-white/10 backdrop-blur-md">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0 border border-white/30"
              style={{ backgroundColor: selectedColor.hex }}
            />
            <span className="text-[10px] font-bold text-white truncate">
              {displayGarmentName}
            </span>
            <span className="text-[10px] text-zinc-400 shrink-0 hidden sm:inline">
              • {selectedColor.name}
            </span>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/15 border border-amber-400/35 text-amber-300 backdrop-blur-md shrink-0">
            <Sparkles className="w-2.5 h-2.5 text-amber-300" />
            <span>3D Live View</span>
          </div>
        </div>

        {/* 3D WebGL Canvas OR Graceful 3D-Shaded Fallback */}
        {!webglFailed ? (
          <div
            ref={mountRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative z-10 w-full h-full cursor-grab active:cursor-grabbing touch-pan-y"
            aria-label="Interactive 3D Garment Preview — drag horizontally to rotate 360 degrees"
          />
        ) : (
          /* WebGL-safe Sculpted Fallback */
          <div className="relative z-10 w-full h-full flex items-center justify-center p-8">
            <div className="relative w-64 h-72 flex items-center justify-center">
              <svg viewBox="0 0 260 280" className="w-full h-full drop-shadow-2xl">
                <path
                  d="M78,24 L104,16 C115,34 145,34 156,16 L182,24 L244,68 L220,114 L186,96 L186,262 L74,262 L74,96 L40,114 L16,68 Z"
                  fill={selectedColor.hex}
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="2"
                />
              </svg>
              {designImageSrc && (
                <img
                  src={designImageSrc}
                  alt={designTitle}
                  className="absolute w-28 h-28 object-contain"
                  style={{
                    transform: `translate(${(printTransform.offsetX || 0) * 60}px, ${(printTransform.offsetY || 0) * -60}px) scale(${printTransform.scale || 1})`,
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Loading Texture Indicator */}
        {isLoadingTexture && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
            <div className="px-3 py-1.5 rounded-full bg-black/75 border border-amber-400/30 text-[10px] font-bold text-amber-300 flex items-center gap-2 backdrop-blur-md">
              <div className="h-3 w-3 rounded-full border-2 border-amber-300 border-t-transparent animate-spin" />
              <span>Applying artwork on 3D garment...</span>
            </div>
          </div>
        )}

        {/* Empty Design Prompt Overlay */}
        {!designImageSrc && !isLoadingTexture && (
          <div className="absolute bottom-16 inset-x-4 z-20 pointer-events-none flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 border border-zinc-700 text-[10px] font-bold text-zinc-300 backdrop-blur-md">
              <Move className="w-3 h-3 text-amber-400" />
              <span>Select a Vault design or upload artwork to preview live</span>
            </div>
          </div>
        )}

        {/* Bottom 3D Interactive Camera Controls */}
        <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-black/75 border border-white/10 backdrop-blur-md">
            <button
              type="button"
              onClick={() => snapToView("front")}
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                viewSide === "front" && !autoSpin
                  ? "bg-amber-400 text-black"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => snapToView("back")}
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                viewSide === "back" && !autoSpin
                  ? "bg-amber-400 text-black"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setAutoSpin((s) => !s)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                autoSpin
                  ? "bg-emerald-400 text-black"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <RotateCw className={`w-3 h-3 ${autoSpin ? "animate-spin" : ""}`} />
              <span>360°</span>
            </button>
          </div>

          {onPrintTransformChange && (
            <button
              type="button"
              onClick={() => setShowFineTune((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md transition cursor-pointer ${
                showFineTune
                  ? "bg-emerald-400 text-black border-emerald-300"
                  : "bg-black/75 text-amber-200 border-amber-400/40 hover:border-amber-300"
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Adjust Print</span>
            </button>
          )}
        </div>

        {/* Submission Loader */}
        {isSubmitting && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-in fade-in">
            <div className="h-8 w-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
            <span className="text-xs font-black uppercase tracking-widest text-amber-300">
              Submitting Your Custom Order...
            </span>
          </div>
        )}
      </div>

      {/* Drag Hint + Placement Summary Line */}
      <div className="flex items-center justify-between px-1 text-[10px] font-semibold text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <Eye className="w-3 h-3 text-amber-400" />
          <span>Drag shirt left/right to inspect 360°</span>
        </span>
        <span className="capitalize text-zinc-300">
          Print: <strong className="text-amber-300">{placement.replace(/_/g, " ")}</strong>
        </span>
      </div>

      {/* Collapsible Interactive Live Print Size & Position Controls */}
      {showFineTune && onPrintTransformChange && (
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-300">
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Live Artwork Position &amp; Size</span>
            </span>
            <button
              type="button"
              onClick={() => onPrintTransformChange(DEFAULT_TRANSFORM)}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-1">
                <span>Print Size</span>
                <span className="text-emerald-400 font-mono">{Math.round((printTransform.scale || 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.6}
                max={1.35}
                step={0.05}
                value={printTransform.scale}
                onChange={(e) => updateTransform({ scale: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-1">
                <span>Left / Right</span>
                <span className="text-emerald-400 font-mono">{Math.round((printTransform.offsetX || 0) * 100)}</span>
              </div>
              <input
                type="range"
                min={-0.25}
                max={0.25}
                step={0.02}
                value={printTransform.offsetX}
                onChange={(e) => updateTransform({ offsetX: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-1">
                <span>Up / Down</span>
                <span className="text-emerald-400 font-mono">{Math.round((printTransform.offsetY || 0) * 100)}</span>
              </div>
              <input
                type="range"
                min={-0.25}
                max={0.25}
                step={0.02}
                value={printTransform.offsetY}
                onChange={(e) => updateTransform({ offsetY: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
