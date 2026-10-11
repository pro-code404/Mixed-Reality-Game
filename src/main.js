// ============================================================
//  main.js — Cloud Hue / Mixed Reality Game
//  Wires the world, avatar, systems and UI together.
//  Everything rendered here is simulated game fiction. No real
//  location, no network, no accounts.
// ============================================================

import * as THREE from 'three';
import { AVATAR, SCENE } from './config.js';
import { World } from './core/registry.js';
import { stepMove } from './core/collision.js';
import { WorldClock, skyState, phaseName } from './core/clock.js';
import { AudioBus } from './core/audio.js';
import { Input } from './core/input.js';
import { Avatar } from './avatar/avatar.js';
import { DEFAULT_APPEARANCE } from './avatar/presets.js';
import { buildApartment } from './world/apartment.js';
import { buildOutside } from './world/outside.js';
import { Hud } from './ui/hud.js';
import { DressUp } from './ui/dressup.js';
import { createToast } from './ui/toast.js';

const $ = (id) => document.getElementById(id);

// ---------- Renderer / core ----------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 220);
camera.position.set(0, 3.2, 6);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e16);
scene.fog = new THREE.Fog(0x0a0e16, 24, 60);

// ---------- World / systems ----------
const world = new World();
const apartment = buildApartment(scene, world);
let outside = null;

const clock = new WorldClock(8);
const audio = new AudioBus();
const input = new Input(canvas);
const hud = new Hud();
const toast = createToast($('toast'));

let appearance = { ...DEFAULT_APPEARANCE };
const avatar = new Avatar(appearance);
scene.add(avatar.group);
avatar.group.position.set(apartment.spawn.x, 0, apartment.spawn.z);
avatar.tick();

let active = SCENE.APARTMENT;
let mode = 'room'; // 'room' | 'dressup' | 'transition'
let reducedMotion = false;
let started = false;

const flags = { radioOn: false, lampOn: false, plantTended: false, windowOpen: true };

const dressup = new DressUp({
  getAppearance: () => appearance,
  onPreview: (a) => avatar.setAppearance(a),
  onApply: (a) => { appearance = a; avatar.setAppearance(a); toast('Outfit saved.'); },
  onCancel: () => avatar.setAppearance(appearance),
});

// ---------- Scene helpers ----------
const apartmentKey = () => SCENE.APARTMENT;
const activeKey = () => active;
const activeScene = () => (active === SCENE.OUTSIDE ? outside.scene : scene);
const activeBounds = () => (active === SCENE.OUTSIDE ? outside.bounds : apartment.bounds);

// ---------- Click-to-move marker ----------
const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.28, 0.4, 32),
  new THREE.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
);
marker.rotation.x = -Math.PI / 2;
marker.position.y = 0.02;
marker.visible = false;
scene.add(marker);

function ensureMarker() {
  const s = activeScene();
  if (marker.parent !== s) s.add(marker);
}

const raycaster = new THREE.Raycaster();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
input.onClickWorld = (cx, cy) => {
  if (mode !== 'room') return;
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(floorPlane, hit)) return;
  const b = activeBounds();
  hit.x = Math.max(b.minX + 0.3, Math.min(b.maxX - 0.3, hit.x));
  hit.z = Math.max(b.minZ + 0.3, Math.min(b.maxZ - 0.3, hit.z));
  input.moveTarget = { x: hit.x, z: hit.z };
  ensureMarker();
  marker.position.set(hit.x, 0.02, hit.z);
  marker.visible = true;
  audio.blip(520);
};

// ---------- Interactions ----------
function findNearby() {
  if (mode !== 'room') return null;
  const list = world.interactables(activeKey());
  const p = avatar.group.position;
  let best = null;
  let bd = Infinity;
  for (const e of list) {
    const at = e.interact.at;
    if (!at) continue;
    const d = Math.hypot(p.x - at.x, p.z - at.z);
    if (d < e.interact.radius && d < bd) { best = e; bd = d; }
  }
  return best;
}

function setLampShade(on) {
  const shade = apartment.meta.lampShade;
  if (on) {
    shade.material = new THREE.MeshStandardMaterial({ color: 0xffe4b0, emissive: 0xffb86b, emissiveIntensity: 0.9, side: THREE.DoubleSide });
  } else {
    shade.material = new THREE.MeshStandardMaterial({ color: 0xc47a5a, roughness: 0.94 });
  }
}

function interact() {
  const e = findNearby();
  if (!e) return;
  audio.blip(740);
  const a = e.interact.action;
  switch (a) {
    case 'radio':
      flags.radioOn = !flags.radioOn;
      if (flags.radioOn) { audio.startRadio(); e.interact.label = 'Turn off the radio'; toast('Radio on — a soft pad fills the room.'); }
      else { audio.stopRadio(); e.interact.label = 'Turn on the radio'; toast('Radio off.'); }
      break;
    case 'plant':
      if (!flags.plantTended) {
        flags.plantTended = true;
        const plant = world.query((x) => x.meta && x.meta.type === 'plant')[0];
        if (plant && plant.meta.leaves) plant.meta.leaves.scale.set(1.15, 1.55, 1.15);
        toast('You water the plant. It perks up.');
      } else toast('The plant looks healthy.');
      break;
    case 'lamp':
      flags.lampOn = !flags.lampOn;
      apartment.lights.lampLight.intensity = flags.lampOn ? 7 : 0;
      setLampShade(flags.lampOn);
      toast(flags.lampOn ? 'Lamp on — warm glow.' : 'Lamp off.');
      break;
    case 'window':
      flags.windowOpen = !flags.windowOpen;
      for (const c of apartment.meta.curtains) c.scale.x = flags.windowOpen ? 1 : 2.4;
      toast(flags.windowOpen ? 'Blinds open — a fictional city view.' : 'Blinds closed.');
      break;
    case 'fridge':
      toast('You grab a cold drink. Refreshing.');
      break;
    case 'kitchen':
      toast('A simple fictional snack. No real ordering involved.');
      break;
    case 'rest':
      toast('You rest a moment and the day moves on.');
      if (!clock.auto) { clock.testHour = (clock.testHour + 2) % 24; }
      else { clock.auto = false; clock.testHour = (clock.hour + 2) % 24; hud.setClockAuto(false); }
      break;
    case 'bathroom':
      toast('Bathroom access — detailed interior is a later update.');
      break;
    case 'leave':
      transitionTo(SCENE.OUTSIDE);
      break;
    case 'return_home':
      transitionTo(SCENE.APARTMENT);
      break;
    case 'destination': {
      const m = e.interact.meta || e.meta;
      toast(`${m.name} — ${m.desc} (Fictional game location; no real visit.)`, 4200);
      break;
    }
    default:
      break;
  }
}

// ---------- Scene transitions ----------
const fade = $('fade');
function transitionTo(target) {
  if (mode === 'transition') return;
  if ((target === SCENE.OUTSIDE && active === SCENE.OUTSIDE) || (target === SCENE.APARTMENT && active === SCENE.APARTMENT)) return;
  mode = 'transition';
  fade.classList.remove('hidden');
  requestAnimationFrame(() => fade.classList.add('show'));

  setTimeout(() => {
    if (target === SCENE.OUTSIDE) {
      if (!outside) outside = buildOutside(world);
      scene.remove(avatar.group);
      outside.scene.add(avatar.group);
      const s = outside.spawn;
      avatar.group.position.set(s.x, 0, s.z);
      active = SCENE.OUTSIDE;
      hud.setPlace(outside.homeName || 'Neighborhood');
      hud.setHomeVisible(true);
      toast('Maple District — a fictional neighborhood. Everything here is simulated.');
    } else {
      if (outside) outside.scene.remove(avatar.group);
      scene.add(avatar.group);
      const s = apartment.spawn;
      avatar.group.position.set(s.x, 0, s.z);
      active = SCENE.APARTMENT;
      hud.setPlace('Studio Apartment');
      hud.setHomeVisible(false);
      toast('Home sweet home.');
    }
    input.moveTarget = null;
    marker.visible = false;
    input.lookAzimuth = 0;
    input.lookElevation = 0.35;
    avatar.group.rotation.y = 0;
    mode = 'room';
    fade.classList.remove('show');
    setTimeout(() => fade.classList.add('hidden'), 320);
  }, 380);
}

// ---------- Day / night ----------
function applyApartmentLighting(sky, dt) {
  const L = apartment.lights;
  scene.background.copy(sky.sky);
  scene.fog.color.copy(sky.sky);

  L.sun.color.copy(sky.sun);
  L.sun.intensity = sky.sunI;
  const angle = ((clock.hour - 6) / 12) * Math.PI;
  const sunY = Math.max(0.2, Math.sin(angle));
  L.sun.position.set(Math.cos(angle) * 12, sunY * 16, 8);
  L.sun.target.position.set(0, 0, 0);
  L.sun.target.updateMatrixWorld();

  L.hemi.color.copy(sky.hemi);
  L.hemi.intensity = sky.hemiI;
  L.ambient.intensity = sky.isNight ? 0.2 : 0.32;
  L.windowLight.color.copy(sky.sun);
  L.windowLight.intensity = sky.sunI * 2.6;

  if (!flags.lampOn) L.lampLight.intensity = sky.isNight ? 2.0 : 0;

  renderer.toneMappingExposure = sky.exposure;
  apartment.exterior.update(sky, dt, reducedMotion);
}

// ---------- Movement ----------
function angleLerp(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}

function updateMovement(dt) {
  const { mx, mz, usingKeys } = input.moveVector();
  let wx = 0;
  let wz = 0;
  let moving = false;

  if (usingKeys) {
    const len = Math.hypot(mx, mz) || 1;
    const lx = mx / len;
    const lz = mz / len;
    const sin = Math.sin(input.lookAzimuth);
    const cos = Math.cos(input.lookAzimuth);
    wx = lx * cos - lz * sin;
    wz = lx * sin + lz * cos;
    moving = true;
    input.moveTarget = null;
    marker.visible = false;
  } else if (input.moveTarget) {
    const dx = input.moveTarget.x - avatar.group.position.x;
    const dz = input.moveTarget.z - avatar.group.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.16) {
      input.moveTarget = null;
      marker.visible = false;
    } else {
      wx = dx / d;
      wz = dz / d;
      moving = true;
    }
  }

  avatar.group.rotation.y = angleLerp(avatar.group.rotation.y, Math.atan2(wx, wz), dt * AVATAR.turnLerp);

  let speed01 = 0;
  if (moving) {
    const sprint = input.keys['ShiftLeft'] || input.keys['ShiftRight'];
    const speed = sprint ? AVATAR.sprint : AVATAR.speed;
    const step = speed * dt;
    const blockers = world.blockers(activeKey());
    const moved = stepMove(avatar.group.position.x, avatar.group.position.z, wx * step, wz * step, blockers, avatar.radius, activeBounds());
    avatar.group.position.x = moved.x;
    avatar.group.position.z = moved.z;
    speed01 = Math.min(1, speed / AVATAR.speed);
  }
  avatar.animate(dt, moving ? speed01 : 0, reducedMotion);
}

// ---------- Camera ----------
const camOffset = new THREE.Vector3();
const desired = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
function updateCamera(dt) {
  const dist = 4.8;
  const y = 1.25 + input.lookElevation * 1.9;
  camOffset.set(Math.sin(input.lookAzimuth) * dist, y, Math.cos(input.lookAzimuth) * dist);
  lookTarget.copy(avatar.group.position).add(new THREE.Vector3(0, 1.35, 0));
  desired.copy(lookTarget).add(camOffset);
  const smooth = reducedMotion ? 1 : Math.min(1, dt * 12);
  camera.position.lerp(desired, smooth);
  camera.lookAt(lookTarget);
}

// ---------- Reset ----------
function resetApartment() {
  avatar.group.position.set(apartment.spawn.x, 0, apartment.spawn.z);
  input.moveTarget = null;
  marker.visible = false;
  flags.radioOn = false;
  flags.lampOn = false;
  flags.plantTended = false;
  flags.windowOpen = true;
  audio.stopRadio();
  apartment.lights.lampLight.intensity = 0;
  setLampShade(false);
  for (const c of apartment.meta.curtains) c.scale.x = 1;
  const plant = world.query((x) => x.meta && x.meta.type === 'plant')[0];
  if (plant && plant.meta.leaves) plant.meta.leaves.scale.set(1, 1.3, 1);
  const radio = world.query((x) => x.meta && x.meta.type === 'radio')[0];
  if (radio) radio.interact.label = 'Turn on the radio';
  toast('Apartment reset.');
  audio.blip(520);
}

// ---------- UI wiring ----------
input.onInteract = interact;
hud.onInteract(interact);
hud.onClockInput((v) => { clock.setTestHour(v); hud.setClockAuto(false); });
hud.onClockAuto(() => { clock.auto = !clock.auto; hud.setClockAuto(clock.auto); });
hud.onMute(() => { hud.setMuted(audio.toggleMute()); });
hud.onMotion(() => { reducedMotion = !reducedMotion; hud.setMotion(reducedMotion); });
hud.onReset(resetApartment);
hud.onHome(() => transitionTo(SCENE.APARTMENT));
hud.onDressUp(() => {
  if (mode === 'transition') return;
  mode = 'dressup';
  dressup.open();
});
// Hook dress-up close to restore mode.
const origClose = dressup.close.bind(dressup);
dressup.close = () => { origClose(); mode = 'room'; };

// ---------- Intro ----------
$('startBtn').addEventListener('click', () => {
  audio.ensure();
  started = true;
  $('intro').style.display = 'none';
  hud.show();
  hud.setPlace('Studio Apartment');
  if (clock.auto) {
    const now = new Date();
    const slider = $('clockSlider');
    if (slider) slider.value = String(now.getHours() + now.getMinutes() / 60);
  }
  if (input.isTouch()) hud.showTouch(true);
  toast('Welcome home. Walk to the radio on the coffee table.', 4200);
  audio.blip(660);
});

// ---------- Resize ----------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- Main loop ----------
const three = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(three.getDelta(), 0.05);

  const hour = clock.update();
  if (started) {
    const sky = skyState(hour);
    hud.setTime(hour, phaseName(hour));
    if (active === SCENE.APARTMENT) {
      applyApartmentLighting(sky, dt);
    } else if (outside) {
      outside.update(sky, dt, reducedMotion);
      renderer.toneMappingExposure = sky.exposure;
    }
  }

  if (mode === 'room') {
    avatar.tick();
    if (started) {
      updateMovement(dt);
      updateCamera(dt);
      const near = findNearby();
      hud.setInteract(near ? near.interact.label : null);
    } else {
      updateCamera(dt);
      hud.setInteract(null);
    }
  } else if (mode === 'dressup') {
    // Turntable preview against the room, camera framed on the avatar.
    avatar.tick();
    avatar.group.rotation.y += dt * 0.7;
    camera.position.set(0, 1.55, 3.0);
    camera.lookAt(avatar.group.position.x, 1.15, avatar.group.position.z);
    hud.setInteract(null);
  }

  renderer.render(activeScene(), camera);
}

// Kick things off with a sensible first light state.
applyApartmentLighting(skyState(clock.hour), 0);
animate();
