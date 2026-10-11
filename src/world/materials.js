// ============================================================
//  materials.js — one small, coherent shared material set
//  Reuse keeps draw calls low and the palette consistent, which is
//  what makes the scene read as "deliberately built".
// ============================================================

import * as THREE from 'three';

const std = (color, roughness, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, ...extra });

export const M = {
  floor: std(0x8a6a4a, 0.85),
  wall: std(0xe8e2d6, 0.94),
  wallAccent: std(0xd6cdbf, 0.94),
  ceil: std(0xf4f0e8, 0.96, { side: THREE.DoubleSide }),
  trim: std(0xcfc6b6, 0.8),

  wood: std(0x9a7a52, 0.7),
  woodDark: std(0x5a4230, 0.7),
  woodLight: std(0xc4a878, 0.7),

  fabric: std(0x6f8fae, 0.94),
  fabric2: std(0xc47a5a, 0.94),
  fabric3: std(0x9bb0a0, 0.94),
  rug: std(0xb07a5a, 0.97),

  metal: std(0x9aa3ad, 0.35, { metalness: 0.7 }),
  plastic: std(0xf2f2f2, 0.6),
  leather: std(0x6b4a3a, 0.8),
  stone: std(0xb8b0a0, 0.9),

  glass: new THREE.MeshStandardMaterial({
    color: 0xbfe0ff, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.28,
  }),

  plant: std(0x4e8c5a, 0.85),
  plantDark: std(0x3c6f47, 0.85),
  pot: std(0xb06a3a, 0.85),
  grass: std(0x5f8f52, 0.95),
  path: std(0xbdb6a6, 0.95),

  screen: std(0x1a2a3a, 0.3, { emissive: 0x1a2a3a, emissiveIntensity: 0.2 }),

  // Building / exterior (matte, lit)
  facadeA: std(0xcdbfa8, 0.95),
  facadeB: std(0xb9a892, 0.95),
  facadeC: std(0xd8cbb4, 0.95),
  roof: std(0x7a5a4a, 0.9),
};

/** Clone a material with a different colour (used for per-instance tint). */
export function tint(mat, color) {
  const m = mat.clone();
  m.color = new THREE.Color(color);
  return m;
}
