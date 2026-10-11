// ============================================================
//  apartment.js — the compact starter studio
//  One connected room with distinct, tagged zones: sleep, kitchen,
//  dining, living, study, window, bathroom access and a front door
//  that leads outside. Every important object is a separate entity.
// ============================================================

import * as THREE from 'three';
import { ROOM, SCENE, SCALE } from '../config.js';
import { M } from './materials.js';
import { KIND } from '../core/registry.js';
import { box, disc } from '../core/collision.js';
import { buildExterior } from './exterior.js';

const HALF = { x: ROOM.w / 2, z: ROOM.d / 2 };

export function buildApartment(scene, world) {
  const group = new THREE.Group();
  group.name = 'apartment';
  scene.add(group);

  const register = (opts) => world.add({ scene: SCENE.APARTMENT, ...opts });
  const solid = (cx, cz, sx, sz) => box(cx, cz, sx, sz);
  const wallCollider = (cx, cz, sx, sz) => box(cx, cz, Math.max(sx, 0.2), Math.max(sz, 0.2));

  // ---------------- Shell ----------------
  const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM.w, 0.2, ROOM.d), M.floor);
  floor.position.y = -0.1;
  floor.receiveShadow = true;
  group.add(floor);
  register({ tagPrefix: 'surface', kind: KIND.DECOR, object: floor, meta: { type: 'floor' } });

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), M.ceil);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM.h;
  group.add(ceiling);

  const wallSeg = (w, h, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.2), M.wall);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  const WIN = { x: -0.6, w: 3.0, h: 1.9, sill: 0.7 };
  const DOOR = { x: 3.5, w: 1.0, h: 2.1 };
  const BATH = { z: 0.5, w: 0.9, h: 2.1 };

  // Back wall (window opening)
  const bwZ = -HALF.z;
  wallSeg(6.9, ROOM.h, -2.05, ROOM.h / 2, bwZ); // left of window
  wallSeg(6.1, ROOM.h, 2.35, ROOM.h / 2, bwZ);  // right of window
  wallSeg(WIN.w, 0.7, WIN.x, 0.35, bwZ);        // under window
  wallSeg(WIN.w, ROOM.h - (WIN.sill + WIN.h), WIN.x, (WIN.sill + WIN.h + ROOM.h) / 2, bwZ); // over
  register({ tagPrefix: 'wall_back', kind: KIND.SOLID, object: group, colliders: [
    wallCollider(-2.05, bwZ, 6.9, 0.2), wallCollider(2.35, bwZ, 6.1, 0.2), wallCollider(WIN.x, bwZ, WIN.w, 0.2),
  ], meta: { type: 'wall' } });

  // Front wall (door opening)
  const fwZ = HALF.z;
  wallSeg(7.5, ROOM.h, -1.0, ROOM.h / 2, fwZ);  // left of door
  wallSeg(1.5, ROOM.h, 4.75, ROOM.h / 2, fwZ);  // right of door
  wallSeg(DOOR.w, ROOM.h - DOOR.h, DOOR.x, (DOOR.h + ROOM.h) / 2, fwZ); // over door
  register({ tagPrefix: 'wall_front', kind: KIND.SOLID, object: group, colliders: [
    wallCollider(-1.0, fwZ, 7.5, 0.2), wallCollider(4.75, fwZ, 1.5, 0.2),
  ], meta: { type: 'wall' } });

  // Right wall (solid)
  wallSeg(ROOM.d, ROOM.h, HALF.x, ROOM.h / 2, 0, Math.PI / 2);
  register({ tagPrefix: 'wall_right', kind: KIND.SOLID, object: group, colliders: [wallCollider(HALF.x, 0, 0.2, ROOM.d)], meta: { type: 'wall' } });

  // Left wall (bathroom opening)
  const lwX = -HALF.x;
  const zBackLen = (HALF.z + BATH.z - BATH.w / 2);
  const zBackC = (-HALF.z + (BATH.z - BATH.w / 2)) / 2;
  const zFrontLen = (HALF.z - (BATH.z + BATH.w / 2));
  const zFrontC = ((BATH.z + BATH.w / 2) + HALF.z) / 2;
  wallSeg(zBackLen, ROOM.h, lwX, ROOM.h / 2, zBackC, Math.PI / 2);
  wallSeg(zFrontLen, ROOM.h, lwX, ROOM.h / 2, zFrontC, Math.PI / 2);
  wallSeg(BATH.w, ROOM.h - BATH.h, lwX, (BATH.h + ROOM.h) / 2, BATH.z, Math.PI / 2);
  register({ tagPrefix: 'wall_left', kind: KIND.SOLID, object: group, colliders: [
    wallCollider(lwX, zBackC, 0.2, zBackLen), wallCollider(lwX, zFrontC, 0.2, zFrontLen),
  ], meta: { type: 'wall' } });

  // ---------------- Window assembly ----------------
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(WIN.w + 0.24, WIN.h + 0.24, 0.14), M.woodDark);
  winFrame.position.set(WIN.x, WIN.sill + WIN.h / 2, bwZ + 0.08);
  group.add(winFrame);
  const winSill = new THREE.Mesh(new THREE.BoxGeometry(WIN.w + 0.5, 0.12, 0.42), M.wood);
  winSill.position.set(WIN.x, WIN.sill, bwZ + 0.16);
  winSill.castShadow = true;
  group.add(winSill);
  const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w, WIN.h), M.glass);
  winGlass.position.set(WIN.x, WIN.sill + WIN.h / 2, bwZ + 0.14);
  group.add(winGlass);
  const curtains = [];
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.42, WIN.h + 0.3, 0.09), M.fabric2);
    c.position.set(WIN.x + s * (WIN.w / 2 + 0.22), WIN.sill + WIN.h / 2 + 0.05, bwZ + 0.26);
    c.castShadow = true;
    group.add(c);
    curtains.push(c);
  }
  register({
    tagPrefix: 'window', kind: KIND.WALK, object: group, colliders: [],
    interact: { action: 'window', label: 'Toggle blinds', at: { x: WIN.x, z: bwZ + 0.8 }, radius: 1.9 }, meta: { type: 'window', curtains },
  });

  // ---------------- Front door ----------------
  const dFrame = new THREE.Mesh(new THREE.BoxGeometry(DOOR.w + 0.3, DOOR.h + 0.2, 0.26), M.woodDark);
  dFrame.position.set(DOOR.x, DOOR.h / 2 + 0.05, fwZ - 0.02);
  group.add(dFrame);
  const dLeaf = new THREE.Mesh(new THREE.BoxGeometry(DOOR.w, DOOR.h, 0.08), M.wood);
  dLeaf.position.set(DOOR.x, DOOR.h / 2, fwZ - 0.12);
  dLeaf.castShadow = true;
  group.add(dLeaf);
  const dHandle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), M.metal);
  dHandle.position.set(DOOR.x + DOOR.w / 2 - 0.14, 1.05, fwZ - 0.18);
  group.add(dHandle);
  const threshold = new THREE.Mesh(new THREE.BoxGeometry(DOOR.w + 0.4, 0.08, 0.5), M.stone);
  threshold.position.set(DOOR.x, 0.04, fwZ - 0.28);
  group.add(threshold);
  register({
    tagPrefix: 'door_front', kind: KIND.SOLID, object: dLeaf, colliders: [solid(DOOR.x, fwZ, DOOR.w, 0.2)],
    interact: { action: 'leave', label: 'Go Outside', at: { x: DOOR.x, z: fwZ - 0.9 }, radius: 1.7 }, meta: { type: 'door', target: 'outside' },
  });
  group.userData.doorFront = dLeaf;

  // ---------------- Bathroom door ----------------
  const bFrame = new THREE.Mesh(new THREE.BoxGeometry(0.26, BATH.h + 0.2, BATH.w + 0.3), M.woodDark);
  bFrame.position.set(lwX + 0.02, BATH.h / 2 + 0.05, BATH.z);
  group.add(bFrame);
  const bLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, BATH.h, BATH.w), M.wood);
  bLeaf.position.set(lwX + 0.12, BATH.h / 2, BATH.z);
  group.add(bLeaf);
  register({
    tagPrefix: 'door_bathroom', kind: KIND.SOLID, object: bLeaf, colliders: [solid(lwX, BATH.z, 0.2, BATH.w)],
    interact: { action: 'bathroom', label: 'Bathroom (later update)', at: { x: lwX + 0.9, z: BATH.z }, radius: 1.5 }, meta: { type: 'door' },
  });

  // ---------------- Wall accent + clock ----------------
  const accent = new THREE.Mesh(new THREE.BoxGeometry(2.8, ROOM.h - 0.4, 0.06), M.wallAccent);
  accent.position.set(-3.7, (ROOM.h - 0.4) / 2 + 0.1, bwZ + 0.12);
  group.add(accent);

  // ================= SLEEP ZONE =================
  const bedX = -3.7;
  const bedZ = -2.35;
  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.34, 2.9), M.woodDark);
  bedFrame.position.set(bedX, 0.17, bedZ);
  bedFrame.castShadow = true;
  bedFrame.receiveShadow = true;
  group.add(bedFrame);
  for (const [lx, lz] of [[-0.85, -1.25], [0.85, -1.25], [-0.85, 1.25], [0.85, 1.25]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), M.woodDark);
    leg.position.set(bedX + lx, 0.1, bedZ + lz);
    group.add(leg);
  }
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.28, 2.72), M.fabric);
  mattress.position.set(bedX, 0.48, bedZ);
  mattress.castShadow = true;
  group.add(mattress);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.6), M.fabric2);
  pillow.position.set(bedX, 0.68, bedZ - 0.95);
  pillow.castShadow = true;
  group.add(pillow);
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.12, 1.6), M.fabric3);
  blanket.position.set(bedX, 0.66, bedZ + 0.5);
  blanket.castShadow = true;
  group.add(blanket);
  register({ tagPrefix: 'bed', kind: KIND.WALK, object: bedFrame, colliders: [solid(bedX, bedZ, 2.0, 2.9)], interact: { action: 'rest', label: 'Rest', at: { x: bedX, z: bedZ + 1.9 }, radius: 1.7 }, meta: { type: 'bed' } });

  // Nightstand + lamp
  const nsX = -2.45;
  const nsZ = -3.55;
  const nsTop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.5), M.wood);
  nsTop.position.set(nsX, 0.5, nsZ);
  nsTop.castShadow = true;
  group.add(nsTop);
  for (const [lx, lz] of [[-0.24, -0.19], [0.24, -0.19], [-0.24, 0.19], [0.24, 0.19]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), M.woodDark);
    leg.position.set(nsX + lx, 0.25, nsZ + lz);
    group.add(leg);
  }
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.12, 12), M.metal);
  lampBase.position.set(nsX, 0.6, nsZ);
  group.add(lampBase);
  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), M.metal);
  lampPole.position.set(nsX, 0.84, nsZ);
  group.add(lampPole);
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.28, 16, 1, true), M.fabric2);
  lampShade.position.set(nsX, 1.14, nsZ);
  lampShade.castShadow = true;
  group.add(lampShade);
  register({ tagPrefix: 'nightstand', kind: KIND.WALK, object: nsTop, colliders: [solid(nsX, nsZ, 0.6, 0.5)], meta: { type: 'nightstand' } });
  register({ tagPrefix: 'lamp_bedside', kind: KIND.INTERACT, object: lampShade, colliders: [], interact: { action: 'lamp', label: 'Toggle lamp', at: { x: nsX, z: nsZ }, radius: 1.4 }, meta: { type: 'lamp', shade: lampShade } });

  // Plant by window
  const plantX = 1.7;
  const plantZ = -3.6;
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.46, 16), M.pot);
  pot.position.set(plantX, 0.23, plantZ);
  pot.castShadow = true;
  group.add(pot);
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), M.plant);
  leaves.position.set(plantX, 0.9, plantZ);
  leaves.scale.set(1, 1.3, 1);
  leaves.castShadow = true;
  group.add(leaves);
  register({ tagPrefix: 'plant', kind: KIND.INTERACT, object: leaves, colliders: [disc(plantX, plantZ, 0.34)], interact: { action: 'plant', label: 'Tend the plant', at: { x: plantX, z: plantZ }, radius: 1.5 }, meta: { type: 'plant', leaves } });

  // ================= KITCHENETTE =================
  const kx = 5.0;
  const kz = -0.6;
  const kLen = 2.6;
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, kLen), M.stone);
  counterTop.position.set(kx, SCALE.counterHeight, kz);
  counterTop.castShadow = true;
  counterTop.receiveShadow = true;
  group.add(counterTop);
  const cabinets = new THREE.Mesh(new THREE.BoxGeometry(0.66, SCALE.counterHeight, kLen), M.woodLight);
  cabinets.position.set(kx, SCALE.counterHeight / 2, kz);
  cabinets.castShadow = true;
  group.add(cabinets);
  for (let i = 0; i < 3; i++) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.02, SCALE.counterHeight - 0.12, 0.02), M.woodDark);
    seam.position.set(kx - 0.34, SCALE.counterHeight / 2, kz - kLen / 2 + (i + 0.5) * (kLen / 3));
    group.add(seam);
  }
  const sink = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.6), M.metal);
  sink.position.set(kx, SCALE.counterHeight + 0.03, kz - 0.7);
  group.add(sink);
  const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.36, 8), M.metal);
  faucet.position.set(kx - 0.25, SCALE.counterHeight + 0.25, kz - 0.7);
  group.add(faucet);
  const spout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.04), M.metal);
  spout.position.set(kx - 0.13, SCALE.counterHeight + 0.42, kz - 0.7);
  group.add(spout);
  const cooktop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.7), M.plastic);
  cooktop.position.set(kx, SCALE.counterHeight + 0.03, kz + 0.6);
  group.add(cooktop);
  register({ tagPrefix: 'counter_kitchen', kind: KIND.WALK, object: counterTop, colliders: [solid(kx, kz, 0.72, kLen)], interact: { action: 'kitchen', label: 'Use counter', at: { x: kx - 0.8, z: kz }, radius: 1.6 }, meta: { type: 'counter' } });

  // Fridge (back-right corner)
  const fX = 5.0;
  const fZ = -2.9;
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.9, 0.8), M.plastic);
  fridge.position.set(fX, 0.95, fZ);
  fridge.castShadow = true;
  group.add(fridge);
  const fHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.08), M.metal);
  fHandle.position.set(fX - 0.34, 1.35, fZ + 0.28);
  group.add(fHandle);
  register({ tagPrefix: 'fridge', kind: KIND.WALK, object: fridge, colliders: [solid(fX, fZ, 0.8, 0.8)], interact: { action: 'fridge', label: 'Grab a snack', at: { x: fX - 0.9, z: fZ }, radius: 1.5 }, meta: { type: 'fridge' } });

  // Counter props
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.11, 12), M.fabric2);
  mug.position.set(kx, SCALE.counterHeight + 0.1, kz - 0.2);
  group.add(mug);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.08, 14), M.stone);
  bowl.position.set(kx, SCALE.counterHeight + 0.09, kz + 0.9);
  group.add(bowl);
  register({ tagPrefix: 'kitchen_props', kind: KIND.DECOR, object: mug, colliders: [], meta: { type: 'props' } });

  // ================= DINING =================
  const tX = 2.9;
  const tZ = 1.5;
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.09, 0.8), M.wood);
  tableTop.position.set(tX, 0.86, tZ);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  group.add(tableTop);
  for (const [lx, lz] of [[-0.52, -0.3], [0.52, -0.3], [-0.52, 0.3], [0.52, 0.3]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.86, 0.07), M.woodDark);
    leg.position.set(tX + lx, 0.43, tZ + lz);
    group.add(leg);
  }
  register({ tagPrefix: 'dining_table', kind: KIND.WALK, object: tableTop, colliders: [solid(tX, tZ, 1.25, 0.8)], meta: { type: 'table' } });
  makeChair(group, tX, tZ - 0.75, 0, register);
  makeChair(group, tX, tZ + 0.75, Math.PI, register);
  for (const s of [-0.25, 0.25]) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.025, 16), M.plastic);
    plate.position.set(tX + s, 0.92, tZ);
    group.add(plate);
  }

  // ================= LIVING =================
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.8, 40), M.rug);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.2, 0.012, 0.9);
  rug.receiveShadow = true;
  group.add(rug);
  register({ tagPrefix: 'rug', kind: KIND.DECOR, object: rug, colliders: [], meta: { type: 'rug' } });

  const sX = 0.2;
  const sZ = 1.95;
  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.5, 0.95), M.leather);
  sofaBase.position.set(sX, 0.4, sZ);
  sofaBase.castShadow = true;
  sofaBase.receiveShadow = true;
  group.add(sofaBase);
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.6, 0.25), M.leather);
  sofaBack.position.set(sX, 0.75, sZ + 0.42);
  sofaBack.castShadow = true;
  group.add(sofaBack);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.55, 0.95), M.leather);
    arm.position.set(sX + s * 1.15, 0.65, sZ);
    arm.castShadow = true;
    group.add(arm);
  }
  const cushionMat = M.fabric3;
  for (const s of [-1, 1]) {
    const cush = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.68), cushionMat);
    cush.position.set(sX + s * 0.55, 0.76, sZ - 0.05);
    cush.castShadow = true;
    group.add(cush);
  }
  register({ tagPrefix: 'sofa', kind: KIND.WALK, object: sofaBase, colliders: [solid(sX, sZ, 2.3, 0.95)], meta: { type: 'sofa' } });

  const cX = 0.2;
  const cZ = 0.55;
  const coffeeTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.6), M.wood);
  coffeeTop.position.set(cX, 0.42, cZ);
  coffeeTop.castShadow = true;
  coffeeTop.receiveShadow = true;
  group.add(coffeeTop);
  for (const [lx, lz] of [[-0.5, -0.24], [0.5, -0.24], [-0.5, 0.24], [0.5, 0.24]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.06), M.woodDark);
    leg.position.set(cX + lx, 0.21, cZ + lz);
    group.add(leg);
  }
  register({ tagPrefix: 'coffee_table', kind: KIND.WALK, object: coffeeTop, colliders: [solid(cX, cZ, 1.2, 0.6)], meta: { type: 'table' } });

  const radioBody = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.26, 0.24), M.woodDark);
  radioBody.position.set(cX, 0.59, cZ);
  radioBody.castShadow = true;
  group.add(radioBody);
  const radioDial = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), M.metal);
  radioDial.rotation.x = Math.PI / 2;
  radioDial.position.set(cX + 0.16, 0.61, cZ + 0.13);
  group.add(radioDial);
  register({ tagPrefix: 'radio', kind: KIND.INTERACT, object: radioBody, colliders: [], interact: { action: 'radio', label: 'Turn on the radio', at: { x: cX, z: cZ }, radius: 1.7 }, meta: { type: 'radio', dial: radioDial } });

  // ================= STUDY =================
  const dX = -3.9;
  const dZ = 2.6;
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.9), M.wood);
  deskTop.position.set(dX, 0.88, dZ);
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  group.add(deskTop);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.08), M.woodDark);
  apron.position.set(dX, 0.8, dZ + 0.4);
  group.add(apron);
  for (const [lx, lz] of [[-0.82, -0.38], [0.82, -0.38], [-0.82, 0.38], [0.82, 0.38]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.88, 0.08), M.woodDark);
    leg.position.set(dX + lx, 0.44, dZ + lz);
    group.add(leg);
  }
  register({ tagPrefix: 'desk', kind: KIND.WALK, object: deskTop, colliders: [solid(dX, dZ, 1.8, 0.9)], meta: { type: 'desk' } });
  makeChair(group, dX, dZ - 0.85, 0, register);

  // Desk lamp
  const dlBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.06, 10), M.metal);
  dlBase.position.set(dX + 0.7, 0.95, dZ);
  group.add(dlBase);
  const dlArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), M.metal);
  dlArm.position.set(dX + 0.7, 1.2, dZ);
  dlArm.rotation.z = 0.3;
  group.add(dlArm);
  const dlHead = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.2, 12, 1, true), M.metal);
  dlHead.position.set(dX + 0.82, 1.42, dZ);
  group.add(dlHead);
  // Monitor
  const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.05), M.screen);
  monitor.position.set(dX, 1.32, dZ + 0.32);
  group.add(monitor);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.1), M.metal);
  stand.position.set(dX, 0.98, dZ + 0.32);
  group.add(stand);
  // Books + notebook
  for (let i = 0; i < 3; i++) {
    const book = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.24 + i * 0.03, 0.2),
      new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.05 + i * 0.12, 0.45, 0.45), roughness: 0.8 }),
    );
    book.position.set(dX - 0.6, 1.04 + (i % 2) * 0.26, dZ + 0.2);
    book.rotation.y = 0.1 * i;
    book.castShadow = true;
    group.add(book);
  }
  const notebook = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.4), M.plastic);
  notebook.position.set(dX + 0.3, 0.94, dZ - 0.2);
  group.add(notebook);

  // ================= LIGHTS =================
  const hemi = new THREE.HemisphereLight(0x88aaff, 0x3a2a1a, 0.5);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffffff, 0.32);
  scene.add(ambient);
  const interior = new THREE.PointLight(0xfff0dd, 2.0, 20, 1.6);
  interior.position.set(0, 2.8, 0);
  scene.add(interior);
  const windowLight = new THREE.PointLight(0x9ec9ff, 0, 16, 2);
  windowLight.position.set(WIN.x, 2.0, bwZ + 0.3);
  scene.add(windowLight);
  const lampLight = new THREE.PointLight(0xffb86b, 0, 8, 2);
  lampLight.position.set(nsX, 1.2, nsZ);
  scene.add(lampLight);
  const sun = new THREE.DirectionalLight(0xffffff, 1.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.025;
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 50;
  scene.add(sun);
  scene.add(sun.target);

  const exterior = buildExterior(scene, { winX: WIN.x, wallZ: bwZ });

  return {
    group,
    lights: { hemi, ambient, interior, windowLight, lampLight, sun },
    exterior,
    spawn: { x: -0.6, z: 3.0 },
    bounds: { minX: -HALF.x, maxX: HALF.x, minZ: -HALF.z, maxZ: HALF.z },
    meta: { lampShade, curtains, lampLight },
  };
}

/** A complete chair: seat, back and four visible legs. */
function makeChair(parent, x, z, ry, register) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 0.48), M.wood);
  seat.position.set(x, SCALE.chairSeat, z);
  seat.castShadow = true;
  g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.06), M.wood);
  back.position.set(x, SCALE.chairSeat + 0.31, z + 0.2);
  back.rotation.y = ry;
  g.add(back);
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, SCALE.chairSeat, 0.05), M.woodDark);
      leg.position.set(x + s * 0.2, SCALE.chairSeat / 2, z + t * 0.2);
      g.add(leg);
    }
  }
  parent.add(g);
  register({ tagPrefix: 'chair', kind: KIND.WALK, object: g, colliders: [disc(x, z, 0.34)], meta: { type: 'chair' } });
  return g;
}
