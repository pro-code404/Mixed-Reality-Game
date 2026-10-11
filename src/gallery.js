// ============================================================
//  gallery.js — character style validation sheet (§12)
//  Renders the three reference-inspired looks from the design
//  brief (front, three-quarter, side) under neutral, warm and
//  night lighting. This page exists so the art direction can be
//  judged by eye; it is not part of the playable build.
// ============================================================

import * as THREE from 'three';
import { Avatar } from './avatar/avatar.js';
import { defaultConfig, applyOutfitPreset } from './avatar/schema.js';
import { OUTFITS } from './avatar/catalog.js';

const canvas = document.getElementById('sheet');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e14);
scene.fog = new THREE.Fog(0x0b0e14, 14, 30);

const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 120);

// ---------- Ground ----------
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(8, 48),
  new THREE.MeshStandardMaterial({ color: 0x1c212a, roughness: 1.0 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ---------- Sprite labels ----------
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeLabel(text, { bg = 'rgba(10,14,22,0.86)', fg = '#eaf2ff', size = 58 } = {}) {
  const c = document.createElement('canvas');
  let ctx = c.getContext('2d');
  const font = `600 ${size}px Inter, system-ui, sans-serif`;
  ctx.font = font;
  const pad = 22;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = size + pad * 2;
  c.width = w;
  c.height = h;
  ctx = c.getContext('2d');
  ctx.font = font;
  ctx.fillStyle = bg;
  roundRectPath(ctx, 1.5, 1.5, w - 3, h - 3, h * 0.28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,160,210,0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, h / 2 + size * 0.04);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  const s = 0.0032;
  spr.scale.set(w * s, h * s, 1);
  return spr;
}

// ---------- Lighting rigs (§7) ----------
let lightRig = null;
function buildLightRig(preset) {
  const g = new THREE.Group();
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3.4, 6.2, 4.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 25;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0007;
  const target = new THREE.Object3D();
  target.position.set(0, 0.8, 0);
  g.add(target);
  key.target = target;

  const hemi = new THREE.HemisphereLight(0xdfe8f5, 0x1a1f28, 0.7);
  const ambient = new THREE.AmbientLight(0xffffff, 0.16);
  const rim = new THREE.DirectionalLight(0xbfd4ff, 0.5);
  rim.position.set(-4, 3, -3);

  if (preset === 'warm') {
    key.color.setHex(0xffd7a8); key.intensity = 3.0; key.position.set(2.6, 5.4, 5.2);
    hemi.color.setHex(0xffe6c0); hemi.groundColor.setHex(0x2a2018); hemi.intensity = 0.95;
    ambient.color.setHex(0xffd9b0); ambient.intensity = 0.28;
    rim.color.setHex(0xffb56b); rim.intensity = 0.45;
    scene.background.setHex(0x12100c); scene.fog.color.setHex(0x12100c);
    renderer.toneMappingExposure = 1.05;
  } else if (preset === 'night') {
    key.color.setHex(0x9fb4ff); key.intensity = 1.25; key.position.set(3.6, 6.5, 3.2);
    hemi.color.setHex(0x33406a); hemi.groundColor.setHex(0x04050a); hemi.intensity = 0.5;
    ambient.color.setHex(0x2a3a6a); ambient.intensity = 0.2;
    rim.color.setHex(0xa06cff); rim.intensity = 1.0; rim.position.set(-3, 2.4, -4);
    scene.background.setHex(0x06070d); scene.fog.color.setHex(0x06070d);
    renderer.toneMappingExposure = 1.12;
  } else {
    key.color.setHex(0xffffff); key.intensity = 2.4; key.position.set(3.4, 6.2, 4.6);
    hemi.color.setHex(0xdfe8f5); hemi.groundColor.setHex(0x1a1f28); hemi.intensity = 0.7;
    ambient.color.setHex(0xffffff); ambient.intensity = 0.16;
    rim.color.setHex(0xbfd4ff); rim.intensity = 0.5;
    scene.background.setHex(0x0b0e14); scene.fog.color.setHex(0x0b0e14);
    renderer.toneMappingExposure = 1.0;
  }
  g.add(key, hemi, ambient, rim);
  return g;
}

function setLighting(preset) {
  if (lightRig) scene.remove(lightRig);
  lightRig = buildLightRig(preset);
  scene.add(lightRig);
  const map = { neutral: 'litNeutral', warm: 'litWarm', night: 'litNight' };
  for (const id of Object.values(map)) document.getElementById(id).classList.toggle('active', id === map[preset]);
}

// ---------- Characters + layout (§12) ----------
const COLS = [
  { label: 'Front', rot: 0, x: -1.6 },
  { label: 'Three-quarter', rot: -0.72, x: 0 },
  { label: 'Side', rot: -1.45, x: 1.6 },
];
const ROWS = OUTFITS.map((def, i) => ({ def, z: 1.35 - i * 1.35 }));

const avatars = [];
const labels = new THREE.Group();
scene.add(labels);
// Column headers.
for (const col of COLS) {
  const l = makeLabel(col.label, { size: 54 });
  l.position.set(col.x, 2.2, 1.85);
  labels.add(l);
}
// Row labels.
for (const row of ROWS) {
  const l = makeLabel(row.def.name, { size: 52 });
  l.position.set(-2.85, 1.2, row.z);
  labels.add(l);
}

for (const row of ROWS) {
  for (const col of COLS) {
    const bodyType = row.def.body_type || 'female_base_v1';
    const cfg = applyOutfitPreset(defaultConfig(bodyType), row.def.id);
    const av = new Avatar(cfg);
    av.setDetail('standard');
    av.tick();
    av.group.position.set(col.x, 0, row.z);
    av.group.rotation.y = col.rot;
    scene.add(av.group);
    avatars.push(av);
  }
}

// ---------- Camera orbit ----------
const target = new THREE.Vector3(0, 0.95, 0);
let theta = 0;
let phi = 1.28;
let radius = 6.2;
let spin = false;

function updateCamera() {
  const sp = Math.sin(phi);
  camera.position.set(
    target.x + radius * sp * Math.sin(theta),
    target.y + radius * Math.cos(phi),
    target.z + radius * sp * Math.cos(theta),
  );
  camera.lookAt(target);
}

let dragging = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', (e) => { dragging = false; try { canvas.releasePointerCapture(e.pointerId); } catch (_) {} });
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  theta -= (e.clientX - lastX) * 0.007;
  phi = Math.min(1.5, Math.max(0.85, phi - (e.clientY - lastY) * 0.006));
  lastX = e.clientX;
  lastY = e.clientY;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  radius = Math.min(11, Math.max(3.4, radius + e.deltaY * 0.004));
}, { passive: false });

// ---------- UI ----------
document.getElementById('litNeutral').addEventListener('click', () => setLighting('neutral'));
document.getElementById('litWarm').addEventListener('click', () => setLighting('warm'));
document.getElementById('litNight').addEventListener('click', () => setLighting('night'));
document.getElementById('spinToggle').addEventListener('click', (e) => {
  spin = !spin;
  e.currentTarget.classList.toggle('active', spin);
});
document.getElementById('saveBtn').addEventListener('click', () => {
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.download = 'character-style-validation.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
});

// ---------- Resize + loop ----------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

setLighting('neutral');
updateCamera();

// Small debug hook so the validation sheet can be smoke-tested.
window.__gallery = { count: avatars.length, tris: avatars.reduce((s, a) => s + a.triangleCount, 0) };

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (spin) theta += dt * 0.25;
  updateCamera();
  renderer.render(scene, camera);
}
animate();
