// ============================================================
//  outside.js — the fictional neighborhood the front door opens to
//  A separate, lazily-built scene (never running while you are
//  indoors). Buildings, trees, benches, flowers and lamps are all
//  distinct tagged objects. The map is entirely fictional — no GPS,
//  no real businesses, no real location.
// ============================================================

import * as THREE from 'three';
import { OUTSIDE, SCENE } from '../config.js';
import { M } from './materials.js';
import { KIND } from '../core/registry.js';
import { box, disc } from '../core/collision.js';
import { makeTree, makeFlowerPatch, makeBench, makeLampPost, makeBuilding, makeSignPost } from './props.js';

export const DESTINATIONS = [
  { id: 'plaza', name: 'Community Plaza', emoji: '✦', x: 1.5, z: -0.5, desc: 'Hosts fictional seasonal events.' },
  { id: 'park', name: 'Maple Park', emoji: '❦', x: -9, z: -3, desc: 'A quiet fictional green space.' },
  { id: 'cafe', name: 'Blue Hour Café', emoji: '☕', x: 9, z: -4, desc: 'A cozy fictional café.' },
  { id: 'shop', name: 'Corner Shop', emoji: '◈', x: -9, z: 4, desc: 'Daily essentials (fictional).' },
];

export function buildOutside(world) {
  const scene = new THREE.Scene();
  scene.name = 'outside';
  scene.background = new THREE.Color(0x9ec9ff);
  scene.fog = new THREE.Fog(0x9ec9ff, 26, 62);

  const register = (opts) => world.add({ scene: SCENE.OUTSIDE, ...opts });

  // ---- Ground & paths ----
  const ground = new THREE.Mesh(new THREE.BoxGeometry(OUTSIDE.w + 30, 0.2, OUTSIDE.d + 30), M.grass);
  ground.position.y = -0.1;
  ground.receiveShadow = true;
  scene.add(ground);

  const plazaMat = M.path;
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.1, 48), plazaMat);
  plaza.position.set(1.5, 0.0, -0.5);
  plaza.receiveShadow = true;
  scene.add(plaza);
  register({ tagPrefix: 'plaza', kind: KIND.DECOR, object: plaza, colliders: [], meta: { type: 'plaza' } });

  const path = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 14), plazaMat);
  path.position.set(1.5, 0.0, -6);
  path.receiveShadow = true;
  scene.add(path);

  // ---- Fountain ----
  const fountain = new THREE.Group();
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.4, 24), M.stone);
  basin.position.y = 0.2;
  basin.castShadow = true;
  fountain.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.12, 24),
    new THREE.MeshStandardMaterial({ color: 0x7fb8e6, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }));
  water.position.y = 0.4;
  fountain.add(water);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.1, 12), M.stone);
  spout.position.y = 0.95;
  fountain.add(spout);
  fountain.position.set(1.5, 0, -0.5);
  scene.add(fountain);
  register({ tagPrefix: 'fountain', kind: KIND.WALK, object: fountain, colliders: [disc(1.5, -0.5, 1.7)], meta: { type: 'fountain' } });

  // ---- Buildings (home + fictional destinations) ----
  const home = makeBuilding(world, { scene, id: 'building_home_01', x: 0, z: -9, w: 6, d: 5, h: 4.2, facade: M.facadeC, seed: 7 });
  makeBuilding(world, { scene, id: 'building_cafe_01', x: 10.5, z: -5, w: 4.5, d: 4.5, h: 3.2, facade: M.facadeA, seed: 8 });
  makeBuilding(world, { scene, id: 'building_shop_01', x: -10.5, z: 5, w: 4.5, d: 4.5, h: 3.2, facade: M.facadeB, seed: 9 });

  // The studio itself — a small annex beside the home block.
  makeBuilding(world, { scene, id: 'building_studio_01', x: 0, z: -3.5, w: 2.6, d: 2.2, h: 2.6, facade: M.facadeB, seed: 12 });

  // ---- Home door (return path) ----
  const homeDoorZ = -9 + 2.5 + 0.1;
  const homeDoor = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.12), M.wood);
  homeDoor.position.set(0, 1.0, homeDoorZ);
  scene.add(homeDoor);
  const homeHandle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M.metal);
  homeHandle.position.set(0.34, 1.0, homeDoorZ + 0.08);
  scene.add(homeHandle);
  register({
    tagPrefix: 'door_home', kind: KIND.WALK, object: homeDoor, colliders: [],
    interact: { action: 'return_home', label: 'Return Home', at: { x: 0, z: homeDoorZ + 1.0 }, radius: 1.8 }, meta: { type: 'door', target: 'apartment' },
  });

  // ---- Trees, flowers, benches, lamps ----
  const treeSpots = [[-4, 2], [-6, -6], [5, 3], [7, -1], [-2.5, -3], [4, -3.5], [-7, 3], [3, 6]];
  treeSpots.forEach((p, i) => makeTree(world, { scene, x: p[0], z: p[1], scale: 0.9 + (i % 3) * 0.15, seed: 100 + i }));

  const flowerSpots = [[-3, 0.5], [5, 1], [-1, 3], [6, -3], [-5, 4], [2, 4.5], [-6, -1]];
  flowerSpots.forEach((p, i) => makeFlowerPatch(world, { scene, x: p[0], z: p[1], count: 7 + (i % 3), seed: 200 + i }));

  makeBench(world, { scene, x: -2, z: 0.5, ry: 0.4, seed: 301 });
  makeBench(world, { scene, x: 4.5, z: 0.2, ry: -0.5, seed: 302 });
  makeBench(world, { scene, x: 1.5, z: 3.4, ry: Math.PI, seed: 303 });

  const lamps = [];
  for (const p of [[-3, -6], [6, -6], [-6, 6], [6, 6], [1.5, -9.5]]) {
    const ent = makeLampPost(world, { scene, x: p[0], z: p[1], seed: 400 + p[0], light: true });
    if (ent.meta.light) lamps.push(ent.meta.light);
  }

  // ---- Destination posts (visual + interaction) ----
  for (const d of DESTINATIONS) {
    makeSignPost(world, { scene, x: d.x, z: d.z, label: d.name, color: 0x7cc4ff, seed: 500 + d.x });
    register({
      tagPrefix: `place_${d.id}`, id: `place_${d.id}`, kind: KIND.DECOR, object: plaza, colliders: [],
      interact: { action: 'destination', label: `Visit ${d.name}`, at: { x: d.x, z: d.z }, radius: 2.4, meta: { ...d } }, meta: { type: 'destination', ...d },
    });
  }

  // ---- Lights ----
  const hemi = new THREE.HemisphereLight(0x9fb8e0, 0x3a4a30, 0.75);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffffff, 0.28);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 1.35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 70;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  const bounds = { minX: -OUTSIDE.w / 2, maxX: OUTSIDE.w / 2, minZ: -OUTSIDE.d / 2, maxZ: OUTSIDE.d / 2 };

  function update(skyState, dt, reducedMotion) {
    scene.background.copy(skyState.sky);
    scene.fog.color.copy(skyState.sky);
    hemi.color.copy(skyState.hemi);
    hemi.intensity = skyState.hemiI;
    ambient.intensity = skyState.isNight ? 0.12 : 0.28;
    sun.color.copy(skyState.sun);
    sun.intensity = skyState.sunI;
    const angle = ((clockHour(skyState) - 6) / 12) * Math.PI;
    const sunY = Math.max(0.15, Math.sin(angle));
    sun.position.set(Math.cos(angle) * 20, sunY * 26, 12);
    sun.target.position.set(0, 0, 0);
    sun.target.updateMatrixWorld();

    const nightBoost = skyState.isNight ? 1.0 : 0.0;
    for (const l of lamps) l.intensity = nightBoost * 2.4;

    for (const e of world.inScene(SCENE.OUTSIDE)) {
      if (e.meta && e.meta.windows) {
        const on = skyState.isNight ? 1 : 0.0;
        for (const w of e.meta.windows) w.material.emissiveIntensity = w.material.emissiveIntensity * 0.9 + on * 0.85 * 0.1;
      }
    }
  }

  return {
    scene,
    lights: { hemi, ambient, sun },
    spawn: { x: 1.5, z: 3.5 },
    bounds,
    destinations: DESTINATIONS,
    homePos: { x: 0, z: homeDoorZ },
    homeName: 'Maple District',
    update,
    homeEntity: home,
  };
}

// The outside update needs an hour to place the sun; derive a rough
// hour from the palette so we do not have to thread the clock through.
function clockHour(skyState) {
  const s = skyState.sky;
  if (skyState.isNight) return 1;
  if (s.r > s.b) return 8; // warm → morning/evening
  return 14;
}
