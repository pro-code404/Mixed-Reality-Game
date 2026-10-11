// ============================================================
//  props.js — reusable scenery factories
//  Every placement is its own object with its own transform and
//  identity, even when it shares geometry/materials with others.
//  Movement class is assigned deliberately: trees/benches block
//  (walk-around), flowers are non-blocking decoration.
// ============================================================

import * as THREE from 'three';
import { M } from './materials.js';
import { KIND } from '../core/registry.js';
import { box, disc } from '../core/collision.js';
import { makeRng, pick } from '../core/rng.js';

export function makeTree(world, { scene, x, z, scale = 1, seed = 1 }) {
  const rng = makeRng(seed);
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.18 * scale, 1.5 * scale, 10), M.woodDark);
  trunk.position.y = 0.75 * scale;
  trunk.castShadow = true;
  g.add(trunk);

  const blobs = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < blobs; i++) {
    const r = (0.78 - i * 0.14) * scale;
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), i % 2 ? M.plantDark : M.plant);
    foliage.position.set((rng() - 0.5) * 0.3 * scale, (1.5 + i * 0.5) * scale, (rng() - 0.5) * 0.3 * scale);
    foliage.scale.y = 1.15;
    foliage.castShadow = true;
    g.add(foliage);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rng() * Math.PI * 2;
  scene.add(g);

  return world.add({
    tagPrefix: 'tree_oak', kind: KIND.WALK, scene, object: g,
    colliders: [disc(x, z, 0.34 * scale)], meta: { type: 'tree', scale },
  });
}

export function makeFlowerPatch(world, { scene, x, z, count = 8, spread = 1.3, seed = 2 }) {
  const rng = makeRng(seed);
  const g = new THREE.Group();
  const petals = [0xff6f91, 0xffd166, 0xf6f6f6, 0xb07cff, 0xff8b5e];
  for (let i = 0; i < count; i++) {
    const bx = (rng() - 0.5) * spread;
    const bz = (rng() - 0.5) * spread;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.22, 5), M.plantDark);
    stem.position.set(bx, 0.11, bz);
    g.add(stem);
    const bloom = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 6),
      new THREE.MeshStandardMaterial({ color: pick(rng, petals), roughness: 0.7 }),
    );
    bloom.position.set(bx, 0.24, bz);
    bloom.scale.y = 0.7;
    g.add(bloom);
  }
  g.position.set(x, 0, z);
  scene.add(g);

  // Decoration: no collider, so it can never snag the avatar.
  return world.add({
    tagPrefix: 'flower_patch', kind: KIND.DECOR, scene, object: g,
    colliders: [], meta: { type: 'flowers', count },
  });
}

export function makeBench(world, { scene, x, z, ry = 0, seed = 3 }) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.09, 0.5), M.wood);
  seat.position.y = 0.45;
  seat.castShadow = true;
  g.add(seat);
  for (let i = 0; i < 3; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), M.wood);
    slat.position.set(0, 0.62 + i * 0.16, -0.2);
    g.add(slat);
  }
  for (const sx of [-0.7, 0.7]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.42), M.metal);
    leg.position.set(sx, 0.225, 0);
    g.add(leg);
  }
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  scene.add(g);

  return world.add({
    tagPrefix: 'bench', kind: KIND.WALK, scene, object: g,
    colliders: [disc(x, z, 0.8)], meta: { type: 'bench' },
  });
}

export function makeLampPost(world, { scene, x, z, seed = 4, light = true }) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.16, 12), M.metal);
  base.position.y = 0.08;
  g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.0, 10), M.metal);
  pole.position.y = 1.55;
  g.add(pole);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffb86b, emissiveIntensity: 0.4, roughness: 0.4 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), headMat);
  head.position.y = 3.05;
  g.add(head);
  g.position.set(x, 0, z);
  g.rotation.y = (seed % 4) * 0.4;
  scene.add(g);

  let point = null;
  if (light) {
    point = new THREE.PointLight(0xffc27a, 0.0, 9, 2);
    point.position.set(x, 3.0, z);
    scene.add(point);
  }
  const ent = world.add({
    tagPrefix: 'lamp_post', kind: KIND.WALK, scene, object: g,
    colliders: [disc(x, z, 0.22)], meta: { type: 'lamp', light: point },
  });
  return ent;
}

export function makeBuilding(world, {
  scene, id, x, z, w = 4, d = 4, h = 4, ry = 0, windowFace = 'front', facade = M.facadeA, seed = 5,
}) {
  const rng = makeRng(seed);
  const g = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facade);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.25, d + 0.2), M.roof);
  roof.position.y = h + 0.1;
  roof.castShadow = true;
  g.add(roof);

  // Window grid (glows at night).
  const windows = [];
  const cols = Math.max(2, Math.floor(w / 1.1));
  const rows = Math.max(1, Math.floor((h - 1) / 1.2));
  const winMat = new THREE.MeshStandardMaterial({ color: 0x223044, emissive: 0xffcf8a, emissiveIntensity: 0.0, roughness: 0.35 });
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng() < 0.25) continue;
      const wm = winMat.clone();
      wm.emissiveIntensity = 0.0;
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.06), wm);
      const wx = -w / 2 + (c + 0.5) * (w / cols);
      const wy = 0.9 + r * 1.2;
      win.position.set(wx, wy, d / 2 + 0.02);
      g.add(win);
      windows.push(win);
    }
  }

  g.position.set(x, 0, z);
  g.rotation.y = ry;
  scene.add(g);

  return world.add({
    tagPrefix: 'building', id, kind: KIND.SOLID, scene, object: g,
    colliders: [box(x, z, w, d)],
    meta: { type: 'building', windows, windowFace, name: id },
  });
}

export function makeSignPost(world, { scene, x, z, label = 'Place', color = 0x7cc4ff, seed = 6 }) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), M.woodDark);
  pole.position.y = 0.8;
  g.add(pole);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.5, 0.06),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, emissive: color, emissiveIntensity: 0.15 }),
  );
  board.position.y = 1.55;
  board.castShadow = true;
  g.add(board);
  g.position.set(x, 0, z);
  scene.add(g);

  return world.add({
    tagPrefix: 'sign', kind: KIND.WALK, scene, object: g,
    colliders: [disc(x, z, 0.2)], meta: { type: 'sign', label, color },
  });
}
