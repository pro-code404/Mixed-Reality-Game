// ============================================================
//  avatar.js — the character renderer
//  Art direction: Minecraft-inspired / voxel-influenced stylized
//  characters. Oversized geometric head, sculpted blocky hair,
//  small anime-style face, a shaped feminine silhouette and
//  modelled clothing built from chunky geometric forms.
//
//  The renderer only reads a validated config (schema.js) and
//  resolves every choice through the catalog. Nothing here invents
//  an appearance, and nothing here is a file path or a texture.
//
//  Amendment pass: the head is now built from a cranium + tapered
//  jaw, the hair is a multi-section hairstyle with a filled crown,
//  the face features are aligned deliberately, and the torso / hips
//  / limbs are shaped prisms giving a deliberate feminine silhouette.
// ============================================================

import * as THREE from 'three';
import { AVATAR } from '../config.js';
import { proportions } from './characters.js';
import { findItem, resolveColor } from './catalog.js';
import { validateConfig } from './schema.js';

// ---------- Geometry helpers ----------
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

/**
 * A box with softly beveled edges (rounded-rectangle extrusion).
 * Used for the head and torso so the silhouette reads as "carefully
 * controlled softening" rather than a crude sharp cube (§2, §4).
 */
function bevelBox(w, h, d, r, bevel = 0.012, seg = 1) {
  const rr = Math.max(1e-4, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4));
  const s = new THREE.Shape();
  const x = w / 2 - rr;
  const y = h / 2 - rr;
  const hw = w / 2;
  const hh = h / 2;
  s.moveTo(-x, -hh);
  s.lineTo(x, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -y);
  s.lineTo(hw, y);
  s.quadraticCurveTo(hw, hh, x, hh);
  s.lineTo(-x, hh);
  s.quadraticCurveTo(-hw, hh, -hw, y);
  s.lineTo(-hw, -y);
  s.quadraticCurveTo(-hw, -hh, -x, -hh);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.001, d - 2 * bevel),
    bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelOffset: 0, bevelSegments: 1, curveSegments: 2, steps: 1,
  });
  g.translate(0, 0, -(d - 2 * bevel) / 2);
  return g;
}

/**
 * A four-sided tapered prism (square in plan) — the shaped voxel
 * torso / limb. `zRatio` bakes a depth-to-width ratio into the
 * geometry so the character is not a square column.
 */
const prism = (topHalf, botHalf, h, zRatio = 1) => {
  const t = Math.max(1e-4, topHalf);
  const b = Math.max(1e-4, botHalf);
  const g = new THREE.CylinderGeometry(t * Math.SQRT2, b * Math.SQRT2, h, 4, 1);
  g.rotateY(Math.PI / 4);
  if (zRatio !== 1) g.scale(1, 1, zRatio);
  return g;
};

// Square-plan frustum (no depth scaling) — used for the voxel skirt.
const frustum = (topHalf, botHalf, h) => prism(topHalf, botHalf, h, 1);

const torus = (r, t, s = 5, rs = 10) => new THREE.TorusGeometry(r, t, s, rs);

function shade(hex, f) {
  const c = new THREE.Color(hex);
  return c.multiplyScalar(f).getHex();
}

const num = (v, d) => (typeof v === 'number' && !Number.isNaN(v) ? v : d);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;

export class Avatar {
  constructor(config) {
    this.group = new THREE.Group();
    this.group.name = 'avatar';
    this.root = new THREE.Group(); // bobs during the walk cycle
    this.group.add(this.root);

    this.radius = AVATAR.radius; // collision stays stable across body shapes (§5)
    this._dirty = true;
    this._walkPhase = 0;
    this._rig = {};
    this._attach = {};
    this._detailMeshes = [];
    this._detail = 'standard';
    this._config = validateConfig(config).config;
    this._mats = this._makeMaterials();
  }

  // ---------- Public API ----------
  setConfig(config) {
    this._config = validateConfig(config).config;
    this._dirty = true;
  }

  getConfig() { return JSON.parse(JSON.stringify(this._config)); }

  /** Detail/LOD seam. Full geometry LOD variants are a Stage D task. */
  setDetail(level) { this._detail = level || 'standard'; this._applyDetail(); }

  tick() {
    if (this._dirty) { this._dirty = false; this._build(); }
  }

  get triangleCount() {
    let t = 0;
    this.group.traverse((o) => {
      if (o.isMesh && o.visible && o.geometry) {
        const g = o.geometry;
        t += g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0);
      }
    });
    return Math.round(t);
  }

  get height() { return this._P ? this._P.H : 1.75; }

  /** World-space height of the face centre — used by the close-up preview. */
  get faceAnchor() {
    const H = this.height;
    const p = this._P || { headY: H * 0.9 };
    return { x: this.group.position.x, y: p.headY, z: this.group.position.z };
  }

  _gender() { return this._config.body_type && this._config.body_type.startsWith('male') ? 'male' : 'female'; }

  _style(list, id, fallback) {
    const it = findItem(list, id);
    return it ? it.style : fallback;
  }

  animate(dt, speed01, reducedMotion) {
    if (speed01 > 0.02 && !reducedMotion) {
      this._walkPhase += dt * 9 * (0.6 + speed01 * 0.6);
      this._applyPose(this._walkPhase);
    } else if (speed01 > 0.02 && reducedMotion) {
      this._applyPose(0);
      this.root.position.y = Math.abs(Math.sin(performance.now() * 0.004)) * 0.02;
    } else {
      this._walkPhase = 0;
      this._applyPose(0);
      this.root.position.y = reducedMotion ? 0 : Math.sin(performance.now() * 0.0015) * 0.008;
    }
  }

  // ---------- Materials ----------
  _makeMaterials() {
    return {
      skin: new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.0 }),
      hair: new THREE.MeshStandardMaterial({ roughness: 0.72 }),
      hairDark: new THREE.MeshStandardMaterial({ roughness: 0.78 }),
      hairLight: new THREE.MeshStandardMaterial({ roughness: 0.6 }),
      top: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
      outer: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
      bottom: new THREE.MeshStandardMaterial({ roughness: 0.9 }),
      legwear: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
      shoe: new THREE.MeshStandardMaterial({ roughness: 0.55 }),
      cap: new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.8 }),
      accent: new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.15 }),
      metal: new THREE.MeshStandardMaterial({ color: 0xc9ccd4, roughness: 0.32, metalness: 0.75 }),
      eyeWhite: new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.35 }),
      iris: new THREE.MeshStandardMaterial({ color: 0x3d5a80, roughness: 0.3, emissive: 0x22354d, emissiveIntensity: 0.2 }),
      brow: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
      mouth: new THREE.MeshStandardMaterial({ roughness: 0.55 }),
      lash: new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.5 }),
      blush: new THREE.MeshStandardMaterial({ color: 0xe89a9a, roughness: 0.8, transparent: true, opacity: 0.5 }),
      flower: new THREE.MeshStandardMaterial({ color: 0xd85a7a, roughness: 0.7 }),
      lens: new THREE.MeshStandardMaterial({ color: 0xbfe0ff, roughness: 0.15, transparent: true, opacity: 0.32 }),
    };
  }

  _syncColors() {
    const a = this._config.appearance;
    const o = this._config.outfit;
    const m = this._mats;
    const isF = this._gender() === 'female';

    const skin = resolveColor('skin', a.skin_tone_id, 'skin_tone_04').color;
    const hair = resolveColor('hairColor', a.hair_color_id, 'hair_color_02').color;
    const top = resolveColor('topColor', o.top_color_id, 'top_color_01').color;
    const bottom = resolveColor('bottomColor', o.bottom_color_id, 'bottom_color_01').color;

    m.skin.color.setHex(skin);
    m.hair.color.setHex(hair);
    m.hairDark.color.setHex(shade(hair, 0.6));
    m.hairLight.color.setHex(shade(hair, 1.28));
    m.brow.color.setHex(shade(hair, 0.5));
    m.mouth.color.setHex(isF ? 0xb5526e : 0x9c6b52);
    m.top.color.setHex(top);
    m.bottom.color.setHex(bottom);
    m.shoe.color.setHex(resolveColor('shoeColor', o.shoe_color_id, 'shoe_color_01').color);

    // Style-driven accent (trim / buckles) and outerwear / legwear tones.
    const topStyle = this._style('top', o.top_id, 'tee');
    const outerStyle = this._style('outerwear', o.outerwear_id, 'none');
    const bottomStyle = this._style('bottom', o.bottom_id, 'trousers');
    const shoeStyle = this._style('footwear', o.footwear_id, 'sneakers');

    const topB = resolveColor('topColor', o.top_color_id, 'top_color_01').color;
    m.accent.color.setHex(topStyle === 'uniform' ? 0xb02a3a : shade(topB, 0.72));
    m.outer.color.setHex(outerStyle === 'gothicJacket' ? 0x241b2c : outerStyle === 'coat' ? 0x3b4049 : shade(topB, 0.66));
    m.legwear.color.setHex(bottomStyle === 'streetShorts' ? shade(bottom, 1.6) : shade(bottom, 1.1));
    m.cap.color.setHex(topStyle === 'uniform' ? 0xf6f6f2 : 0xf0f0ec);
    if (shoeStyle === 'boots') m.shoe.color.setHex(shade(resolveColor('shoeColor', o.shoe_color_id, 'shoe_color_01').color, 0.8));
  }

  // ---------- Build ----------
  _dispose() {
    this.group.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
  }

  _build() {
    this._dispose();
    for (const c of [...this.root.children]) this.root.remove(c);
    this._rig = {};
    this._attach = {};
    this._detailMeshes = [];
    this._syncColors();

    const gender = this._gender();
    const P = proportions(gender, this._config.body_morphs);
    this._P = P;
    const L = this._layout(P);
    this._L = L;

    this._buildLegs(L);
    this._buildTorso(L);
    this._buildArms(L);
    this._buildHead(L);
    this._buildAccessories(L);
    this._applyDetail();
  }

  // Voxel layout: oversized head, compact neck, shaped torso, legs.
  _layout(P) {
    const m = this._config.body_morphs;
    const isF = P.gender === 'female';
    const H = P.H;
    const headMorph = clamp(num(m.head_scale, 1), 0.9, 1.15);
    const hs = H * (isF ? 0.232 : 0.226) * headMorph; // head edge (oversized cube)
    const headD = hs * 0.98;
    const neckH = H * 0.036;
    const headY = H - hs * 0.52 - H * 0.014;
    const neckTop = headY - hs * 0.5;
    const neckBot = neckTop - neckH;
    const shoulderY = neckBot;
    const torsoT = clamp(num(m.torso_height, num(m.torso_scale, 1)), 0.9, 1.12);
    const torsoH = H * 0.30 * torsoT;
    const hipY = shoulderY - torsoH;
    const waistY = shoulderY - torsoH * 0.60;

    const shw = clamp(num(m.shoulder_width, 1), 0.85, 1.15);
    const wwm = clamp(num(m.waist_width, 1), 0.85, 1.15);
    const hwm = clamp(num(m.hip_width, 1), 0.85, 1.2);
    const atm = clamp(num(m.arm_thickness, 1), 0.85, 1.2);
    const tvm = clamp(num(m.thigh_volume, 1), 0.85, 1.2);
    const bsm = clamp(num(m.bust_scale, 1), 0.8, 1.2);
    const cbm = clamp(num(m.chest_bulk, 1), 0.9, 1.2);

    // Horizontal half-widths (metres). Female base gives the hourglass:
    // shoulder ≳ bust > waist < hip.
    const shoulderHalf = H * (isF ? 0.100 : 0.126) * shw;
    const bustHalf = H * (isF ? 0.090 : 0.108) * cbm;
    const waistHalf = H * (isF ? 0.065 : 0.094) * wwm;
    const hipHalf = H * (isF ? 0.110 : 0.100) * hwm;
    const bustR = isF ? H * 0.032 * bsm : 0;

    const armR = H * (isF ? 0.029 : 0.037) * atm;
    const upperLen = torsoH * 0.52;
    const foreLen = torsoH * 0.42;
    const handS = H * 0.05;

    const thighR = H * (isF ? 0.052 : 0.056) * tvm;
    const kneeR = thighR * 0.78;
    const calfR = kneeR * 1.06;
    const ankleR = thighR * 0.5;
    const kneeY = hipY * 0.56;
    const ankleY = H * 0.055;
    const thighLen = hipY - kneeY;
    const shinLen = kneeY - ankleY;

    const legX = Math.min(hipHalf * 0.78, Math.max(thighR * 1.12, hipHalf * 0.55));

    return {
      H, isF, hs, headD, headY, neckTop, neckBot, shoulderY, waistY, torsoH, hipY,
      shoulderHalf, bustHalf, waistHalf, hipHalf, bustR,
      armR, upperLen, foreLen, handS,
      thighR, kneeR, calfR, ankleR, kneeY, ankleY, thighLen, shinLen,
      legX,
    };
  }

  _part(parent, geo, mat, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  _box(parent, w, h, d, mat, x = 0, y = 0, z = 0) {
    return this._part(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  }

  _prism(parent, top, bot, h, zRatio, mat, x = 0, y = 0, z = 0) {
    return this._part(parent, prism(top, bot, h, zRatio), mat, x, y, z);
  }

  _markDetail(mesh) { this._detailMeshes.push(mesh); return mesh; }

  // ---- Hips, skirts / lower garments, legs and footwear ----
  _buildLegs(L) {
    const o = this._config.outfit;
    const m = this._mats;
    const bottomStyle = this._style('bottom', o.bottom_id, 'trousers');
    const shoeStyle = this._style('footwear', o.footwear_id, 'sneakers');
    const isF = L.isF;

    // How much of each leg segment the lower garment covers.
    let thighCover = 1;
    let shinCover = 1;
    if (bottomStyle === 'trousers' || bottomStyle === 'cargo' || bottomStyle === 'gothic') { thighCover = 1; shinCover = 1; }
    else if (bottomStyle === 'uniformSkirt') { thighCover = 0; shinCover = 0; }
    else if (bottomStyle === 'streetShorts') { thighCover = 0.5; shinCover = 0; }

    // ----- Hips / pelvis: the widest deliberate anchor of the lower
    // silhouette, tapering up to the waist so the top garment and the
    // lower garment meet at a clear waistline.
    const hipH = L.waistY - L.hipY;
    const pelvis = this._part(this.root, prism(L.waistHalf, L.hipHalf, hipH, 0.82), m.bottom, 0, L.hipY + hipH / 2, 0);
    this._attach.hips = pelvis;

    // Skirt (uniform): an angular A-line with a trim band and pleats.
    if (bottomStyle === 'uniformSkirt') {
      const skirtH = L.torsoH * 0.78;
      const top = L.waistHalf * 1.06;
      const bot = L.hipHalf * 1.62;
      const skirt = this._part(this.root, frustum(top, bot, skirtH), m.bottom, 0, L.waistY - skirtH * 0.5 + 0.02, 0);
      skirt.scale.z = 0.86;
      const hem = this._part(this.root, frustum(bot * 1.02, bot * 1.09, skirtH * 0.16), m.accent, 0, L.waistY - skirtH + skirtH * 0.08 + 0.02, 0);
      hem.scale.z = 0.86;
      for (const s of [-1, 1]) {
        const stripe = this._markDetail(this._box(this.root, top * 0.12, skirtH * 0.9, bot * 0.4, m.accent, s * top * 0.5, L.waistY - skirtH * 0.5 + 0.02, bot * 0.66));
        stripe.rotation.z = s * 0.04;
      }
    }

    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * L.legX, L.hipY, 0);
      this.root.add(pivot);

      const side = s < 0 ? 'L' : 'R';

      // Skin base for the whole leg (shaped prisms, not straight columns).
      this._prism(pivot, L.thighR, L.kneeR, L.thighLen, 0.9, m.skin, 0, -L.thighLen / 2, 0);
      const shinPivot = new THREE.Group();
      shinPivot.position.y = -L.thighLen;
      pivot.add(shinPivot);
      this._prism(shinPivot, L.calfR, L.ankleR, L.shinLen, 0.9, m.skin, 0, -L.shinLen / 2, 0);

      // Garment overlay on the covered fraction of each segment.
      if (thighCover > 0.001) {
        const topR = L.thighR * 1.07;
        const botR = lerp(L.thighR, L.kneeR, thighCover) * 1.07;
        const h = L.thighLen * thighCover;
        this._prism(pivot, topR, botR, h, 0.92, m.bottom, 0, -h / 2, 0);
      }
      if (thighCover > 0.001 && thighCover < 0.999) {
        // Cuff band at the hem of shorts.
        const hemR = lerp(L.thighR, L.kneeR, thighCover);
        this._box(pivot, hemR * 2.14, 0.02, hemR * 2.14, m.accent, 0, -L.thighLen * thighCover, 0);
      }
      if (shinCover > 0.001) {
        const topR = L.calfR * 1.07;
        const botR = lerp(L.calfR, L.ankleR, shinCover) * 1.07;
        const h = L.shinLen * shinCover;
        this._prism(shinPivot, topR, botR, h, 0.92, m.bottom, 0, -h / 2, 0);
      }
      if (bottomStyle === 'cargo' && s < 0) {
        this._markDetail(this._box(pivot, L.thighR * 0.95, L.thighR * 1.1, 0.05, m.bottom, L.thighR * 0.9, -L.thighLen * 0.55, L.thighR * 0.7));
      }

      // Footwear — sits on the ground, toe forward, ankle at shin base.
      const footH = L.ankleY;
      const footW = L.ankleR * 2.35;
      const footL = L.ankleR * (shoeStyle === 'boots' ? 2.9 : 3.5);
      const footY = -L.shinLen - footH * 0.5;
      const boot = shoeStyle === 'boots';
      const foot = this._box(shinPivot, footW, footH, footL, m.shoe, 0, footY, footL * 0.22);
      foot.receiveShadow = true;
      // Sole.
      this._box(shinPivot, footW * 1.03, footH * 0.24, footL * 1.02, m.accent, 0, footY - footH * 0.38, footL * 0.22);
      if (!boot) {
        // Lace / strap detail.
        this._markDetail(this._box(shinPivot, footW * 1.06, footH * 0.22, footL * 0.5, m.legwear, 0, footY + footH * 0.1, footL * 0.16));
      } else {
        // Boot shaft rising up the calf plus a buckle.
        this._box(shinPivot, L.ankleR * 2.45, L.shinLen * 0.56, L.ankleR * 2.45, m.shoe, 0, -L.shinLen + L.shinLen * 0.2, 0);
        this._markDetail(this._box(shinPivot, L.ankleR * 2.55, footH * 0.3, L.ankleR * 2.55, m.metal, 0, -L.shinLen + L.shinLen * 0.42, 0));
      }

      this._rig[`leg${side}`] = pivot;
      this._rig[`shin${side}`] = shinPivot;
    }
  }

  // ---- Torso: shaped chest → waist, bust, collar, outerwear ----
  _buildTorso(L) {
    const o = this._config.outfit;
    const m = this._mats;
    const topStyle = this._style('top', o.top_id, 'tee');
    const outerStyle = this._style('outerwear', o.outerwear_id, 'none');
    const hasOuter = outerStyle !== 'none';
    const isF = L.isF;

    const topY = L.shoulderY;
    const waistY = L.waistY;
    const total = topY - waistY;
    const chestH = total * 0.58;
    const lowWaistH = total * 0.42;
    const underbustHalf = (L.bustHalf + L.waistHalf) * 0.5;

    // Chest and waist as tapered prisms so shoulders > bust > waist.
    this._prism(this.root, L.shoulderHalf, underbustHalf, chestH, 0.74, m.top, 0, topY - chestH / 2, 0);
    this._prism(this.root, underbustHalf, L.waistHalf, lowWaistH, 0.72, m.top, 0, waistY + lowWaistH / 2, 0);

    // Feminine bust: two soft shaped blocks on the chest front (§4).
    if (isF && L.bustR > 0.001 && !(outerStyle === 'gothicJacket' || outerStyle === 'coat')) {
      for (const s of [-1, 1]) {
        const b = this._part(this.root, bevelBox(L.bustR * 2.0, L.bustR * 1.7, L.bustR * 1.7, L.bustR * 0.6), m.top, s * L.bustHalf * 0.42, topY - chestH * 0.78, L.bustHalf * 0.94);
        b.rotation.x = -0.08;
      }
    }

    // Shoulder yoke + collar.
    this._box(this.root, L.shoulderHalf * 2.03, total * 0.1, L.bustHalf * 1.62, m.top, 0, topY - total * 0.03, 0);
    this._box(this.root, L.hs * 0.52, total * 0.06, L.hs * 0.46, m.top, 0, topY + total * 0.005, 0);

    // Waistband / belt at the waistline (clear top-vs-bottom separation).
    if (topStyle === 'uniform') {
      this._box(this.root, L.waistHalf * 2.18, total * 0.085, L.waistHalf * 2.9, m.accent, 0, waistY + total * 0.02, 0);
    } else if (hasOuter) {
      this._box(this.root, L.waistHalf * 2.2, total * 0.07, L.waistHalf * 2.95, m.outer, 0, waistY + total * 0.02, 0);
      this._markDetail(this._box(this.root, L.waistHalf * 0.4, total * 0.1, L.waistHalf * 0.65, m.metal, 0, waistY + total * 0.02, L.waistHalf * 1.45));
    } else {
      // A fitted top ends in a hem band so the garment reads as clothing.
      this._box(this.root, L.waistHalf * 2.06, total * 0.05, L.waistHalf * 2.72, m.accent, 0, waistY + total * 0.03, 0);
    }

    // Outerwear shell: open front panels + shoulders, inner top visible.
    if (hasOuter) {
      const shellH = total * 0.72;
      for (const s of [-1, 1]) {
        this._prism(this.root, L.bustHalf * 1.02, L.waistHalf * 1.08, shellH, 0.8, m.outer, s * L.bustHalf * 0.74, topY - shellH * 0.5 + 0.02, -0.01);
      }
      this._box(this.root, L.bustHalf * 2.32, total * 0.11, L.bustHalf * 1.78, m.outer, 0, topY - total * 0.03, 0); // shoulder yoke
      for (const s of [-1, 1]) {
        const lapel = this._markDetail(this._box(this.root, L.bustHalf * 0.5, shellH * 0.5, 0.03, m.outer, s * L.bustHalf * 0.4, topY - shellH * 0.42, L.bustHalf * 0.94));
        lapel.rotation.z = s * 0.1;
      }
    }

    // Neck (skin).
    this._part(this.root, prism(L.hs * 0.24, L.hs * 0.28, L.neckTop - L.neckBot + total * 0.05, 1), m.skin, 0, L.neckBot + (L.neckTop - L.neckBot) / 2, 0);

    // Hood for the hoodie.
    if (topStyle === 'hoodie') {
      this._markDetail(this._part(this.root, bevelBox(L.hs * 0.62, L.hs * 0.5, L.hs * 0.62, L.hs * 0.2), m.top, 0, L.neckBot + L.hs * 0.02, -L.hs * 0.46));
    }

    this._attach.chest = new THREE.Group();
    this._attach.chest.position.y = L.shoulderY - total * 0.3;
    this.root.add(this._attach.chest);
    this._torsoStyle = topStyle;
  }

  // ---- Arms: shaped upper arm + forearm, sleeve coverage ----
  _buildArms(L) {
    const o = this._config.outfit;
    const m = this._mats;
    const topStyle = this._style('top', o.top_id, 'tee');
    const outerStyle = this._style('outerwear', o.outerwear_id, 'none');
    const hasOuter = outerStyle !== 'none';

    // Fraction of the upper arm covered by a sleeve.
    let sleeve = 0.5;
    if (topStyle === 'hoodie') sleeve = 1;
    else if (topStyle === 'gothic') sleeve = 0.12;
    else if (topStyle === 'inner') sleeve = 0.2;
    else if (topStyle === 'uniform' || topStyle === 'tee') sleeve = 0.5;
    if (hasOuter) sleeve = 1;

    for (const s of [-1, 1]) {
      const side = s < 0 ? 'L' : 'R';
      const pivot = new THREE.Group();
      pivot.position.set(s * L.shoulderHalf, L.shoulderY, 0);
      this.root.add(pivot);

      // Shoulder cap (garment) rounds the shoulder-to-arm transition.
      this._box(pivot, L.armR * 2.5, L.armR * 1.8, L.armR * 2.3, hasOuter ? m.outer : m.top, 0, -L.armR * 0.3, 0);

      // Upper arm: shaped skin base + sleeve overlay.
      this._prism(pivot, L.armR, L.armR * 0.9, L.upperLen, 0.92, m.skin, 0, -L.upperLen / 2, 0);
      if (sleeve > 0.02) {
        const h = L.upperLen * sleeve;
        const topR = L.armR * 1.14;
        const botR = lerp(L.armR, L.armR * 0.9, sleeve) * 1.14;
        this._prism(pivot, topR, botR, h, 0.94, hasOuter ? m.outer : m.top, 0, -h / 2, 0);
        if (sleeve < 0.999) this._box(pivot, L.armR * 2.36, 0.02, L.armR * 2.36, m.accent, 0, -h, 0);
      }

      const forePivot = new THREE.Group();
      forePivot.position.y = -L.upperLen;
      pivot.add(forePivot);
      this._prism(forePivot, L.armR * 0.9, L.armR * 0.78, L.foreLen, 0.92, m.skin, 0, -L.foreLen / 2, 0);
      if (sleeve >= 0.99) {
        this._prism(forePivot, L.armR * 1.12, L.armR * 0.9, L.foreLen, 0.94, hasOuter ? m.outer : m.top, 0, -L.foreLen / 2, 0);
        // Cuff.
        this._markDetail(this._box(forePivot, L.armR * 2.06, L.armR * 0.4, L.armR * 2.0, m.accent, 0, -L.foreLen * 0.92, 0));
      }
      // Hand.
      this._box(forePivot, L.armR * 2.0, L.handS, L.armR * 1.7, m.skin, 0, -L.foreLen - L.handS * 0.35, 0);

      this._rig[`arm${side}`] = pivot;
      this._rig[`fore${side}`] = forePivot;
    }
  }

  // ---- Oversized head: cranium + tapered jaw, aligned face ----
  _buildHead(L) {
    const m = this._mats;
    const face = this._style('face', this._config.appearance.face_style_id, 'soft');
    const isF = L.isF;
    const hs = L.hs;
    const headD = L.headD;

    this._attach.head = new THREE.Group();
    this._attach.head.position.y = L.headY;
    this.root.add(this._attach.head);
    const H = this._attach.head;

    const narrow = face === 'sharp' || face === 'angular';
    const headW = hs * (narrow ? 0.95 : 1.0);
    const headH = hs * 1.02;
    const zF = headD * 0.5;

    // Cranium + a distinctly narrower jaw for a finished head shape.
    this._part(H, bevelBox(headW, headH * 0.72, headD, hs * 0.1, hs * 0.03, 1), m.skin, 0, headH * 0.14, 0);
    this._part(H, bevelBox(headW * 0.86, headH * 0.4, headD, hs * 0.08, hs * 0.03, 1), m.skin, 0, -headH * 0.28, 0);

    // ---- Face layout (all positions in head-local metres) ----
    const eyeY = -hs * 0.02;
    const eyeX = hs * 0.205;
    const eyeW = hs * (face === 'bright' ? 0.2 : 0.185);
    const eyeH = hs * (narrow ? 0.15 : 0.165);
    m.iris.color.setHex(isF ? 0x4a6a92 : 0x3d5a80);

    for (const s of [-1, 1]) {
      const ex = s * eyeX;
      // Eye white (a small set-in panel on the broad face).
      this._box(H, eyeW, eyeH, 0.012, m.eyeWhite, ex, eyeY, zF + 0.006);
      // Iris + pupil.
      this._box(H, eyeW * 0.6, eyeH * 0.84, 0.012, m.iris, ex, eyeY - eyeH * 0.04, zF + 0.014);
      this._box(H, eyeW * 0.3, eyeH * 0.5, 0.012, m.lash, ex, eyeY - eyeH * 0.06, zF + 0.02);
      // Upper lash line, angled for shape.
      const lash = this._box(H, eyeW * 1.14, eyeH * 0.2, 0.014, m.lash, ex, eyeY + eyeH * 0.5, zF + 0.009);
      lash.rotation.z = s * (isF ? 0.14 : 0.05);
      // Eyebrow, above the eye and clear of the fringe.
      const brow = this._box(H, eyeW * 1.04, eyeH * 0.2, 0.012, m.brow, ex, eyeY + hs * 0.19, zF + 0.005);
      brow.rotation.z = s * (isF ? 0.13 : 0.04);
      // Subtle highlight + blush (detail tier).
      this._markDetail(this._box(H, eyeW * 0.16, eyeH * 0.18, 0.01, m.eyeWhite, ex - s * eyeW * 0.16, eyeY + eyeH * 0.22, zF + 0.022));
      if (isF) this._markDetail(this._box(H, eyeW * 0.7, eyeH * 0.45, 0.008, m.blush, s * (eyeX + eyeW * 0.5), eyeY - eyeH * 0.9, zF + 0.004));
    }

    // Small designed nose (a gentle projection, not a big block).
    this._box(H, hs * 0.055, hs * 0.06, hs * 0.055, m.skin, 0, eyeY - hs * 0.165, zF + hs * 0.012);
    // Mouth: a subtle pleasant smile (centre bar + upturned corners).
    this._box(H, hs * 0.12, hs * 0.026, 0.012, m.mouth, 0, eyeY - hs * 0.29, zF + 0.004);
    for (const s of [-1, 1]) {
      const corner = this._box(H, hs * 0.03, hs * 0.026, 0.012, m.mouth, s * hs * 0.072, eyeY - hs * 0.278, zF + 0.004);
      corner.rotation.z = s * 0.55;
    }

    // Ears.
    for (const s of [-1, 1]) this._box(H, hs * 0.06, hs * 0.18, hs * 0.14, m.skin, s * (headW * 0.5 + hs * 0.015), eyeY, -hs * 0.03);

    this._drawHair(L);
  }

  _hairBox(H, w, h, d, x, y, z, mat, rx = 0, ry = 0, rz = 0) {
    const b = this._box(H, w, h, d, mat, x, y, z);
    b.rotation.set(rx, ry, rz);
    return b;
  }

  // ---- Blocky sculpted hair (§3): a filled crown, fringe, sides,
  // rear volume and optional longer locks. Every style shares the
  // same crown so the top of the head can never be left bare.
  _drawHair(L) {
    const m = this._mats;
    const hs = L.hs;
    const H = this._attach.head;
    const A = m.hair;       // base tone
    const B = m.hairDark;   // shadow tone
    const C = m.hairLight;  // highlight tone

    // w,h,d,x,y,z are in units of the head edge (hs); z uses +front.
    const P = (w, h, d, x, y, z, mat, rx = 0, ry = 0, rz = 0) =>
      this._hairBox(H, hs * w, hs * h, hs * d, hs * x, hs * y, hs * z, mat, rx, ry, rz);

    // Crown — always present and always covering the top of the head.
    const crown = (w = 1.16, h = 0.36, d = 1.12) => {
      P(w, h, d, 0, 0.41, -0.01, A);
      P(w * 0.9, h * 0.46, d * 0.9, 0, 0.41 + h * 0.585, -0.05, B);
      P(w * 0.34, h * 0.14, d * 0.74, 0, 0.41 + h * 0.5, -0.02, C);
    };
    const back = (h, y, w = 1.08, d = 0.3, z = -0.48, mat = B) => P(w, h, d, 0, y, z, mat);
    const sides = (h, y, w = 0.16, x = 0.53, d = 0.96, mat = A) => { P(w, h, d, -x, y, -0.01, mat); P(w, h, d, x, y, -0.01, mat); };
    const locks = (h, y, w = 0.13, x = 0.46, d = 0.22, z = 0.34, mat = A) => { P(w, h, d, -x, y, z, mat); P(w, h, d, x, y, z, mat === A ? B : A); };
    const fringe = (w, h, x, y, rz, mat = A, d = 0.22, z = 0.5) => P(w, h, d, x, y, z, mat, 0, 0, rz);

    const style = this._style('hair', this._config.appearance.hair_id, 'shortLayered');

    switch (style) {
      case 'volBob': {
        crown(1.2, 0.4, 1.16);
        back(1.15, -0.14, 1.12, 0.34, -0.48);
        sides(1.12, -0.24, 0.2, 0.55, 1.0);
        // Rounded bob: extra width at the jaw line, then a shorter under-layer.
        P(1.14, 0.5, 0.86, 0, -0.5, -0.16, B);
        locks(0.72, -0.3, 0.18, 0.48, 0.26, 0.3, A);
        // Asymmetrical fringe: a long sweep + a short side.
        fringe(0.62, 0.15, -0.06, 0.26, 0.14, A);
        fringe(0.34, 0.2, 0.28, 0.22, 0.3, B);
        break;
      }
      case 'longAsh': {
        crown(1.16, 0.36, 1.12);
        back(1.7, -0.55, 1.1, 0.32, -0.5);
        P(0.98, 1.1, 0.28, 0, -1.0, -0.46, B); // long rear panel
        sides(1.25, -0.35, 0.19, 0.54, 1.0);
        locks(1.45, -0.72, 0.24, 0.45, 0.24, 0.26);
        P(0.62, 0.36, 0.3, 0, -0.98, -0.5, A);   // lower back lock
        fringe(0.5, 0.26, -0.05, 0.28, 0.12, C);
        fringe(0.34, 0.36, 0.27, 0.2, 0.3, B);
        break;
      }
      case 'twinTails': {
        crown(1.14, 0.38, 1.1);
        back(0.85, -0.05, 1.06, 0.3, -0.48);
        sides(0.8, -0.14, 0.16, 0.53);
        for (const s of [-1, 1]) {
          P(0.3, 0.72, 0.32, s * 0.66, -0.24, -0.28, A);
          P(0.26, 0.4, 0.28, s * 0.66, -0.6, -0.24, B);
          this._markDetail(this._part(H, torus(hs * 0.12, hs * 0.035, 5, 8), m.accent, hs * 0.54, hs * 0.12, -hs * 0.24));
        }
        fringe(0.9, 0.2, 0, 0.24, 0, A);
        fringe(0.34, 0.28, -0.3, 0.16, 0.18, B);
        fringe(0.34, 0.28, 0.3, 0.16, -0.18, B);
        break;
      }
      case 'mShort': {
        crown(1.02, 0.28, 1.0);
        back(0.5, -0.02, 1.0, 0.24, -0.44);
        sides(0.44, -0.06, 0.13, 0.5, 0.8);
        fringe(0.5, 0.2, -0.04, 0.26, 0.12);
        fringe(0.3, 0.22, 0.28, 0.2, 0.3, B);
        break;
      }
      case 'mMessy': {
        crown(1.02, 0.3, 1.0);
        back(0.5, 0.02, 1.0, 0.26, -0.44);
        // Chunky angled spikes.
        fringe(0.3, 0.3, -0.22, 0.24, 0.5);
        fringe(0.3, 0.32, 0.02, 0.26, -0.4, B);
        fringe(0.28, 0.3, 0.26, 0.22, 0.55);
        P(0.42, 0.2, 0.5, 0, 0.56, 0.05, B, 0.2, 0, 0);
        break;
      }
      case 'mBuzz': {
        P(1.02, 0.26, 1.0, 0, 0.44, -0.02, A);
        P(0.98, 0.42, 0.2, 0, 0.28, -0.42, B);
        break;
      }
      case 'shortLayered':
      default: {
        crown(1.14, 0.36, 1.12);
        back(0.72, -0.08, 1.06, 0.28, -0.46);
        sides(0.64, -0.16, 0.17, 0.52, 0.94);
        // Side-swept layered fringe.
        fringe(0.5, 0.24, -0.02, 0.27, 0.12);
        fringe(0.32, 0.32, 0.3, 0.2, 0.32, B);
        // Face-framing locks (one per side, alternating tone).
        locks(0.5, -0.28, 0.14, 0.46, 0.22, 0.33, A);
        break;
      }
    }
  }

  // ---- Accessories: glasses + headwear (§4.3) ----
  _buildAccessories(L) {
    const o = this._config.outfit;
    const m = this._mats;
    const headR = L.hs;
    const zF = L.headD * 0.5;
    const y = -headR * 0.02;

    const headwearStyle = this._style('headwear', o.headwear_id, 'none');
    const glasses = this._style('glasses', o.glasses_id, 'none');
    if (glasses !== 'none') {
      const frameMat = m.metal;
      frameMat.color.setHex(resolveColor('glassesColor', o.glasses_color_id, 'glasses_color_01').color);
      for (const s of [-1, 1]) {
        if (glasses === 'round') {
          this._markDetail(this._part(this._attach.head, torus(headR * 0.15, headR * 0.025, 6, 12), frameMat, s * headR * 0.2, y, zF * 1.02));
        } else {
          this._markDetail(this._box(this._attach.head, headR * 0.19, headR * 0.15, 0.02, frameMat, s * headR * 0.2, y, zF * 1.02));
        }
      }
      // Bridge.
      this._box(this._attach.head, headR * 0.12, headR * 0.03, 0.02, frameMat, 0, y, zF * 1.02);
    }

    if (headwearStyle === 'nurseCap') {
      this._part(this._attach.head, bevelBox(L.hs * 0.66, L.hs * 0.34, L.hs * 0.62, L.hs * 0.09), m.cap, 0, L.hs * 0.56, L.hs * 0.02);
      this._box(this._attach.head, L.hs * 0.2, L.hs * 0.05, 0.02, m.accent, 0, L.hs * 0.58, L.hs * 0.34);
      this._box(this._attach.head, L.hs * 0.06, L.hs * 0.16, 0.02, m.accent, 0, L.hs * 0.58, L.hs * 0.34);
    }

    if (headwearStyle === 'flower') {
      const c = new THREE.Group();
      c.position.set(L.hs * 0.52, L.hs * 0.2, L.hs * 0.24);
      this._attach.head.add(c);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const petal = this._part(c, bevelBox(L.hs * 0.12, L.hs * 0.12, L.hs * 0.05, L.hs * 0.03), m.flower, Math.cos(a) * L.hs * 0.09, Math.sin(a) * L.hs * 0.09, 0);
        petal.rotation.z = a;
      }
      this._part(c, new THREE.SphereGeometry(L.hs * 0.05, 6, 5), m.accent, 0, 0, L.hs * 0.03);
    }
  }

  _applyDetail() {
    const level = this._detail;
    for (const mesh of this._detailMeshes) mesh.visible = level !== 'low';
  }

  // ---- Walk / idle pose (rig keys unchanged) ----
  _applyPose(t) {
    const r = this._rig;
    if (!r.legL) return;
    const s = Math.sin(t);
    r.legL.rotation.x = s * 0.5;
    r.legR.rotation.x = -s * 0.5;
    r.shinL.rotation.x = Math.max(0, -s) * 0.7;
    r.shinR.rotation.x = Math.max(0, s) * 0.7;
    r.armL.rotation.x = -s * 0.45;
    r.armR.rotation.x = s * 0.45;
    r.foreL.rotation.x = -Math.max(0, -s) * 0.35;
    r.foreR.rotation.x = -Math.max(0, s) * 0.35;
    this.root.position.y = Math.abs(s) * 0.04;
  }
}
