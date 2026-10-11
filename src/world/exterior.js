// ============================================================
//  exterior.js — the fictional world seen through the window
//  Layered depth: balcony/courtyard (near) → rooftops (mid) →
//  skyline + sky gradient (far), plus a few clearly-simulated slow
//  vehicles. Colour + brightness follow the shared day/night clock.
// ============================================================

import * as THREE from 'three';
import { M } from './materials.js';
import { makeRng } from '../core/rng.js';

export function buildExterior(scene, { winX = -0.6, wallZ = -4.25 } = {}) {
  const group = new THREE.Group();
  group.name = 'exterior_window_view';
  scene.add(group);

  // ---- Sky gradient backdrop ----
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      top: { value: new THREE.Color(0x8ec5ff) },
      bot: { value: new THREE.Color(0xffd9a8) },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 bot; varying vec2 vUv; void main(){ gl_FragColor = vec4(mix(bot, top, clamp(vUv.y,0.0,1.0)), 1.0); }`,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(70, 34), skyMat);
  sky.position.set(winX, 9, wallZ - 16);
  group.add(sky);

  // ---- Far skyline ----
  const skylineMat = new THREE.MeshStandardMaterial({ color: 0x6a7a96, roughness: 1 });
  const rngFar = makeRng(11);
  for (let i = 0; i < 18; i++) {
    const bw = 0.8 + rngFar() * 1.6;
    const bh = 2.0 + rngFar() * 6;
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.4), skylineMat);
    b.position.set(winX - 13 + i * 1.5, bh / 2 + 1.2, wallZ - 12);
    group.add(b);
  }

  // ---- Mid rooftops ----
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8a6a5a, roughness: 0.95 });
  const rngMid = makeRng(22);
  for (let i = 0; i < 8; i++) {
    const rw = 2 + rngMid() * 1.6;
    const rh = 1.2 + rngMid() * 1.6;
    const r = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, 2.6), roofMat);
    r.position.set(winX - 8 + i * 2.3, rh / 2 + 0.6, wallZ - 7);
    r.castShadow = true;
    r.receiveShadow = true;
    group.add(r);
  }

  // ---- Near courtyard ----
  const courtWall = new THREE.Mesh(new THREE.BoxGeometry(12, 1.4, 0.3), M.stone);
  courtWall.position.set(winX, 0.7, wallZ - 2.6);
  courtWall.castShadow = true;
  group.add(courtWall);

  const treeTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.7, 8), M.woodDark);
  treeTrunk.position.set(winX - 3.2, 0.85, wallZ - 2.4);
  group.add(treeTrunk);
  const treeTop = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), M.plant);
  treeTop.position.set(winX - 3.2, 2.1, wallZ - 2.4);
  group.add(treeTop);

  // ---- Simulated street + a few fictional vehicles ----
  const street = new THREE.Mesh(new THREE.BoxGeometry(40, 0.05, 2.6), new THREE.MeshStandardMaterial({ color: 0x2c3038, roughness: 1 }));
  street.position.set(winX, 0.02, wallZ - 4.6);
  group.add(street);

  const cars = [];
  const carColors = [0xc94a4a, 0x4a7db5, 0xd8d0c0, 0x5a8a5a];
  const rngCar = makeRng(33);
  for (let i = 0; i < 3; i++) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 0.55), new THREE.MeshStandardMaterial({ color: carColors[i % carColors.length], roughness: 0.5 }));
    body.position.y = 0.28;
    car.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.5), new THREE.MeshStandardMaterial({ color: 0x222833, roughness: 0.3 }));
    cabin.position.set(-0.05, 0.6, 0);
    car.add(cabin);
    car.position.set(winX - 12 + rngCar() * 24, 0, wallZ - 4.6);
    group.add(car);
    cars.push({ obj: car, speed: 0.6 + rngCar() * 0.9, dir: i % 2 ? 1 : -1, x0: winX });
  }

  // Balcony rail attached inside the opening for depth.
  const rail = new THREE.Group();
  const railBar = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.06, 0.06), M.metal);
  railBar.position.y = 1.0;
  rail.add(railBar);
  for (const rx of [-1.5, -0.75, 0, 0.75, 1.5]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 6), M.metal);
    post.position.set(rx, 0.5, 0);
    rail.add(post);
  }
  rail.position.set(winX, 0.2, wallZ - 0.05);
  group.add(rail);

  function update(skyState, dt, reducedMotion) {
    skyMat.uniforms.top.value.copy(skyState.skyTop);
    skyMat.uniforms.bot.value.copy(skyState.skyBot);

    const dim = skyState.isNight ? 0.32 : 0.62;
    skylineMat.color.copy(skyState.sky).multiplyScalar(dim);
    roofMat.color.copy(skyState.sky).multiplyScalar(skyState.isNight ? 0.5 : 0.8).lerp(new THREE.Color(0x8a6a5a), 0.5);

    if (!reducedMotion) {
      for (const c of cars) {
        c.obj.position.x += c.dir * c.speed * dt;
        if (c.dir > 0 && c.obj.position.x > winX + 14) c.obj.position.x = winX - 14;
        if (c.dir < 0 && c.obj.position.x < winX - 14) c.obj.position.x = winX + 14;
      }
    }
  }

  return { group, update };
}
