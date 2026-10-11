// ============================================================
//  avatar.js — the character renderer
//  Art direction: Minecraft-inspired / voxel-influenced stylized
//  characters. Oversized geometric head, sculpted blocky hair,
//  small anime-style face, a stylized feminine silhouette and
//  modelled clothing built from chunky geometric forms.
//
//  The renderer only reads a validated config (schema.js) and
//  resolves every choice through the catalog. Nothing here invents
//  an appearance, and nothing here is a file path or a texture.
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
  const y = h / 2 - r;
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

// A four-sided frustum (square in plan) — the voxel skirt / taper shape.
const frustum = (topHalf, botHalf, h) => {
  const g = new THREE.CylinderGeometry(topHalf * Math.SQRT2, botHalf * Math.SQRT2, h, 4, 1);
  g.rotateY(Math.PI / 4);
  return g;
};

const torus = (r, t, s = 5, rs = 10) => new THREE.TorusGeometry(r, t, s, rs);

function shade(hex, f) {
  const c = new THREE.Color(hex);
  return c.multiplyScalar(f).getHex();
}

const num = (v, d) => (typeof v === 'number' && !Number.isNaN(v) ? v : d);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

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
    m.hairDark.color.setHex(shade(hair, 0.68));
    m.brow.color.setHex(shade(hair, 0.55));
    m.mouth.color.setHex(isF ? 0xb5526e : 0x9c6b52);
    m.top.color.setHex(top);
    m.bottom.color.setHex(bottom);
    m.shoe.color.setHex(resolveColor('shoeColor', o.shoe_color_id, 'shoe_color_01').color);

    // Style-driven accent (trim / buckles) and outerwear / legwear tones.
    const topStyle = this._style('top', o.top_id, 'tee');
    const outerStyle = this._style('outerwear', o.outerwear_id, 'none');
    const bottomStyle = this._style('bottom', o.bottom_id, 'trousers');
    const shoeStyle = this._style('footwear', o.footwear_id, 'sneakers');

    m.accent.color.setHex(
      topStyle === 'uniform' ? 0xc0392b
        : outerStyle === 'gothicJacket' ? 0xb9bcc6
          : 0xe4e7ea,
    );
    m.outer.color.setHex(
      outerStyle === 'gothicJacket' ? 0x1a1720
        : outerStyle === 'streetJacket' ? 0x25282f
          : shade(top, 0.9),
    );
    m.legwear.color.setHex(
      bottomStyle === 'gothic' ? shade(bottom, 1.0)
        : bottomStyle === 'streetShorts' ? 0xdfe1e4
          : 0xf0efe9,
    );
    m.cap.color.setHex(topStyle === 'uniform' ? 0xf6f6f2 : 0xf0f0ec);
    if (shoeStyle === 'boots') m.shoe.color.setHex(shade(resolveColor('shoeColor', o.shoe_color_id, 'shoe_color_01').color, 0.85));
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

  // Voxel layout: oversized head, compact neck, stylized torso, legs.
  _layout(P) {
    const m = this._config.body_morphs;
    const isF = P.gender === 'female';
    const H = P.H;
    const headMorph = clamp(num(m.head_scale, 1), 0.9, 1.15);
    const hs = H * (isF ? 0.235 : 0.228) * headMorph; // head edge (oversized cube)
    const headD = hs * 0.94;
    const neckH = H * 0.04;
    const headY = H - hs * 0.5 - H * 0.012;
    const neckTop = headY - hs * 0.5;
    const neckBot = neckTop - neckH;
    const shoulderY = neckBot;
    const torsoH = H * 0.285 * clamp(num(m.torso_height, num(m.torso_scale, 1)), 0.9, 1.1);
    const hipY = shoulderY - torsoH;

    const shw = clamp(num(m.shoulder_width, 1), 0.85, 1.15);
    const wwm = clamp(num(m.waist_width, 1), 0.85, 1.15);
    const hwm = clamp(num(m.hip_width, 1), 0.85, 1.2);
    const atm = clamp(num(m.arm_thickness, 1), 0.85, 1.2);
    const tvm = clamp(num(m.thigh_volume, 1), 0.85, 1.2);
    const bsm = clamp(num(m.bust_scale, 1), 0.8, 1.2);
    const cbm = clamp(num(m.chest_bulk, 1), 0.9, 1.2);

    const chestHalf = H * (isF ? 0.098 : 0.118) * (isF ? 1 : shw) * cbm;
    const waistHalf = H * (isF ? 0.076 : 0.100) * wwm;
    const hipHalf = H * (isF ? 0.110 : 0.100) * hwm;
    const shoulderHalf = H * (isF ? 0.106 : 0.132) * shw;
    const bustR = isF ? H * 0.036 * bsm : 0;

    const armR = H * (isF ? 0.033 : 0.042) * atm;
    const upperLen = H * 0.145;
    const foreLen = H * 0.115;
    const handS = H * 0.05;

    const thighR = H * (isF ? 0.052 : 0.055) * tvm;
    const calfR = thighR * 0.84;
    const kneeY = hipY - (hipY * 0.52);
    const ankleY = H * 0.05;
    const thighLen = hipY - kneeY;
    const shinLen = kneeY - ankleY;

    return {
      H, isF, hs, headD, headY, neckTop, neckBot, shoulderY,
      torsoH, hipY, chestHalf, waistHalf, hipHalf, shoulderHalf, bustR,
      armR, upperLen, foreLen, handS, thighR, calfR, kneeY, ankleY, thighLen, shinLen,
      legX: hipHalf * 0.52,
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

  _markDetail(mesh) { this._detailMeshes.push(mesh); return mesh; }

  // ---- Legs, skirt / lower garments and footwear ----
  _buildLegs(L) {
    const o = this._config.outfit;
    const isF = L.isF;
    const bottomStyle = this._style('bottom', o.bottom_id, 'trousers');
    const shoeStyle = this._style('footwear', o.footwear_id, 'sneakers');
    const m = this._mats;

    // Surface of the legs before garment coverage.
    let thighCover = 0.5; let shinCover = 0; let legMat = m.bottom;
    if (bottomStyle === 'trousers' || bottomStyle === 'cargo' || bottomStyle === 'gothic') { thighCover = 1; shinCover = 1; legMat = m.bottom; }
    else if (bottomStyle === 'uniformSkirt') { thighCover = 1; shinCover = 1; legMat = m.legwear; }
    else if (bottomStyle === 'streetShorts') { thighCover = 0.5; shinCover = 1; legMat = m.legwear; }

    // Pelvis / hips block (garment colour).
    const pelvis = this._part(this.root, bevelBox(L.hipHalf * 2, L.torsoH * 0.32, L.hipHalf * 2 * 1.22, L.hipHalf * 0.4), m.bottom, 0, L.hipY + L.torsoH * 0.12, 0);
    this._attach.hips = pelvis;

    // Skirt (uniform): an angular four-sided frustum with a trim band.
    if (bottomStyle === 'uniformSkirt') {
      const skirtH = L.torsoH * 0.72;
      const top = L.waistHalf * 1.05;
      const bot = L.hipHalf * 1.5;
      const skirt = this._part(this.root, frustum(top, bot, skirtH), m.bottom, 0, L.hipY + L.torsoH * 0.08 - skirtH * 0.5, 0);
      skirt.scale.z = 0.9;
      const hem = this._part(this.root, frustum(bot * 1.01, bot * 1.06, skirtH * 0.14), m.accent, 0, L.hipY + L.torsoH * 0.08 - skirtH + skirtH * 0.07, 0);
      hem.scale.z = 0.9;
      // Two red pleat stripes for the uniform's geometric read.
      for (const s of [-1, 1]) {
        const stripe = this._markDetail(this._box(this.root, top * 0.14, skirtH * 0.92, bot * 0.35, m.accent, s * top * 0.55, L.hipY + L.torsoH * 0.08 - skirtH * 0.5, bot * 0.62));
        stripe.rotation.z = s * 0.05;
      }
    }

    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * L.legX, L.hipY, 0);
      this.root.add(pivot);

      // Skin base for the whole leg.
      this._box(pivot, L.thighR * 1.9, L.thighLen, L.thighR * 1.9, m.skin, 0, -L.thighLen / 2, 0);
      const shinPivot = new THREE.Group();
      shinPivot.position.y = -L.thighLen;
      pivot.add(shinPivot);
      this._box(shinPivot, L.calfR * 1.9, L.shinLen, L.calfR * 1.9, m.skin, 0, -L.shinLen / 2, 0);

      // Garment overlay.
      const thighCov = L.thighLen * thighCover;
      if (thighCov > 0.001) {
        this._box(pivot, L.thighR * 2.08, thighCov, L.thighR * 2.08, legMat, 0, -thighCov / 2, 0);
      }
      if (L.isF && bottomStyle === 'streetShorts') {
        // Light patterned legwear: a couple of dark accent bands.
        for (let b = 0; b < 2; b++) {
          this._markDetail(this._box(pivot, L.thighR * 2.12, 0.014, L.thighR * 2.12, m.bottom, 0, -thighCov - 0.05 - b * 0.09, 0));
        }
      }
      const shinCov = L.shinLen * shinCover;
      if (shinCov > 0.001) {
        this._box(shinPivot, L.calfR * 2.06, shinCov, L.calfR * 2.06, legMat, 0, -shinCov / 2, 0);
      }
      if (bottomStyle === 'cargo' && s < 0) {
        this._markDetail(this._box(pivot, L.thighR * 0.95, L.thighR * 1.1, 0.05, m.bottom, L.thighR * 0.9, -L.thighLen * 0.5, L.thighR * 0.7));
      }

      // Footwear.
      const footH = L.ankleY;
      const footW = L.calfR * 2.1;
      const footL = L.calfR * (shoeStyle === 'boots' ? 2.4 : 2.9);
      const boot = shoeStyle === 'boots';
      const foot = this._box(shinPivot, footW, footH * (boot ? 1.0 : 0.7), footL, m.shoe, 0, -L.shinLen + footH * (boot ? 0.5 : 0.35), footL * 0.18);
      if (!boot) {
        this._markDetail(this._box(shinPivot, footW * 1.04, footH * 0.3, footL * 1.02, m.legwear, 0, -L.shinLen + footH * 0.15, footL * 0.18));
      } else {
        // Boot shaft + buckle.
        this._box(shinPivot, L.calfR * 2.2, L.shinLen * 0.55, L.calfR * 2.2, m.shoe, 0, -L.shinLen + L.shinLen * 0.28, 0);
        this._markDetail(this._box(shinPivot, L.calfR * 2.3, 0.03, L.calfR * 2.3, m.metal, 0, -L.shinLen + L.shinLen * 0.5, 0));
      }

      this._rig[`leg${s < 0 ? 'L' : 'R'}`] = pivot;
      this._rig[`shin${s < 0 ? 'L' : 'R'}`] = shinPivot;
    }
  }

  // ---- Torso, tops, outerwear, collar and belt ----
  _buildTorso(L) {
    const o = this._config.outfit;
    const m = this._mats;
    const topStyle = this._style('top', o.top_id, 'tee');
    const outerStyle = this._style('outerwear', o.outerwear_id, 'none');
    const hasOuter = outerStyle !== 'none';
    const isF = L.isF;

    const top = L.shoulderY;
    const bot = L.hipY;
    const total = top - bot;
    const chestH = total * 0.44;
    const waistH = total * 0.30;
    const hipH = total * 0.30;

    // Stacked blocks give the voxel silhouette while staying soft-edged.
    const chest = this._part(this.root, bevelBox(L.chestHalf * 2, chestH * 1.12, L.chestHalf * 2.7, L.chestHalf * 0.5), m.top, 0, top - chestH * 0.5, 0);
    const waist = this._part(this.root, bevelBox(L.waistHalf * 2, waistH * 1.1, L.waistHalf * 2.6, L.waistHalf * 0.45), m.top, 0, top - chestH - waistH * 0.5, 0);
    this._box(this.root, L.hipHalf * 2 * 0.98, hipH, L.hipHalf * 2 * 1.18, m.top, 0, bot + hipH * 0.5, 0);

    // Feminine bust: two soft blocks on the chest front (§4).
    if (isF && L.bustR > 0.001 && !(outerStyle === 'gothicJacket' || outerStyle === 'coat')) {
      for (const s of [-1, 1]) {
        const b = this._part(this.root, bevelBox(L.bustR * 2, L.bustR * 1.7, L.bustR * 1.6, L.bustR * 0.6), m.top, s * L.chestHalf * 0.42, top - chestH * 0.85, L.chestHalf * 0.95);
        b.rotation.x = -0.08;
      }
    }

    // Collar.
    this._box(this.root, L.hs * 0.5, total * 0.05, L.hs * 0.44, m.top, 0, top - total * 0.02, 0);

    // Belt / waistband.
    if (topStyle === 'uniform') {
      this._box(this.root, L.waistHalf * 2.2, total * 0.075, L.waistHalf * 2.7, m.accent, 0, bot + hipH * 0.95, 0);
    } else if (hasOuter) {
      this._box(this.root, L.waistHalf * 2.2, total * 0.06, L.waistHalf * 2.7, m.outer, 0, bot + hipH * 0.95, 0);
      this._markDetail(this._box(this.root, L.waistHalf * 0.4, total * 0.09, L.waistHalf * 0.6, m.metal, 0, bot + hipH * 0.95, L.waistHalf * 1.35));
    }

    // Outerwear shell: open jacket panels + shoulders, leaving the
    // inner top visible down the middle (§5 layering).
    if (hasOuter) {
      const shellH = total * 0.62;
      for (const s of [-1, 1]) {
        this._box(this.root, L.chestHalf * 0.62, shellH, L.chestHalf * 2.95, m.outer, s * L.chestHalf * 0.72, top - shellH * 0.5, 0);
      }
      this._box(this.root, L.chestHalf * 2.3, total * 0.1, L.chestHalf * 2.9, m.outer, 0, top - total * 0.03, 0); // shoulder yoke
      // Collar/lapels.
      for (const s of [-1, 1]) {
        const lapel = this._markDetail(this._box(this.root, L.chestHalf * 0.5, shellH * 0.25, L.chestHalf * 0.35, m.outer, s * L.chestHalf * 0.42, top - shellH * 0.12, L.chestHalf * 1.25));
        lapel.rotation.z = -s * 0.25;
      }
    }

    // Neck (skin) — always visible.
    this._box(this.root, L.hs * 0.34, L.neckTop - L.neckBot + 0.02, L.hs * 0.3, m.skin, 0, (L.neckBot + L.neckTop) / 2, 0);

    // Hood for the hoodie style.
    if (topStyle === 'hoodie') {
      this._markDetail(this._part(this.root, bevelBox(L.hs * 0.8, L.hs * 0.55, L.hs * 0.7, L.hs * 0.2), m.top, 0, L.neckBot + L.hs * 0.05, -L.hs * 0.5));
    }

    this._attach.chest = new THREE.Group();
    this._attach.chest.position.y = L.shoulderY - total * 0.3;
    this.root.add(this._attach.chest);
    this._torsoStyle = topStyle;
  }

  // ---- Arms and sleeve coverage ----
  _buildArms(L) {
    const o = this._config.outfit;
    const m = this._mats;
    const topStyle = this._style('top', o.top_id, 'tee');
    const outerStyle = this._style('outerwear', o.outerwear_id, 'none');
    const hasOuter = outerStyle !== 'none';
    const armMat = hasOuter ? m.outer : m.top;

    // Fraction of the upper arm covered by a sleeve.
    let sleeve = 0.45;
    if (topStyle === 'hoodie') sleeve = 1;
    else if (topStyle === 'gothic') sleeve = 0.1;
    else if (topStyle === 'inner') sleeve = 0.15;
    else if (topStyle === 'uniform' || topStyle === 'tee') sleeve = 0.45;
    if (hasOuter) sleeve = 1;

    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * L.shoulderHalf, L.shoulderY, 0);
      this.root.add(pivot);

      // Shoulder cap (garment).
      this._box(pivot, L.armR * 2.3, L.armR * 1.6, L.armR * 2.3, armMat, 0, -L.armR * 0.4, 0);

      // Upper arm: skin base + sleeve overlay.
      this._box(pivot, L.armR * 1.9, L.upperLen, L.armR * 1.9, m.skin, 0, -L.upperLen / 2, 0);
      const sl = L.upperLen * sleeve;
      if (sleeve > 0.02) {
        this._box(pivot, L.armR * 2.14, sleeve >= 0.99 ? L.upperLen : sleeve * L.upperLen, L.armR * 2.14, armMat, 0, -(L.upperLen * sleeve) / 2, 0);
        if (topStyle === 'uniform' && sleeve < 1) {
          this._markDetail(this._box(pivot, L.armR * 2.3, 0.02, L.armR * 2.3, m.accent, 0, -sleeve * L.upperLen, 0));
        }
      }

      const forePivot = new THREE.Group();
      forePivot.position.y = -L.upperLen;
      pivot.add(forePivot);

      this._box(forePivot, L.armR * 1.9, L.foreLen, L.armR * 1.9, m.skin, 0, -L.foreLen / 2, 0);
      if (sleeve >= 0.99) {
        this._box(forePivot, L.armR * 2.15, L.foreLen, L.armR * 2.15, armMat, 0, -L.foreLen / 2, 0);
      }
      // Hand.
      this._box(forePivot, L.armR * 2.0, L.handS, L.armR * 1.7, m.skin, 0, -L.foreLen - L.handS * 0.35, 0);

      this._rig[`arm${s < 0 ? 'L' : 'R'}`] = pivot;
      this._rig[`fore${s < 0 ? 'L' : 'R'}`] = forePivot;
    }
  }

  // ---- Oversized head + small anime-style face (§2) ----
  _buildHead(L) {
    const m = this._mats;
    const face = this._style('face', this._config.appearance.face_style_id, 'soft');
    const isF = L.isF;
    const hs = L.hs;

    this._attach.head = new THREE.Group();
    this._attach.head.position.y = L.headY;
    this.root.add(this._attach.head);
    const H = this._attach.head;

    // Head: broad beveled cube; subtly taller, with a soft jaw.
    const headW = hs * (face === 'sharp' || face === 'angular' ? 1.0 : 1.02);
    const headH = hs * 1.02;
    this._part(H, bevelBox(headW, headH, L.headD, hs * 0.09, hs * 0.03, 1), m.skin, 0, 0, 0);
    // Jaw / chin block.
    this._box(H, hs * 0.7, hs * 0.16, L.headD * 0.86, m.skin, 0, -hs * 0.5, hs * 0.03);

    const zF = L.headD * 0.5;
    const eyeY = -hs * 0.04;
    const eyeX = hs * 0.20;
    const irisCol = isF ? 0x4a6a92 : 0x3d5a80;
    m.iris.color.setHex(irisCol);

    for (const s of [-1, 1]) {
      // Eye white (small, set into the broad face).
      this._box(H, hs * 0.18, hs * 0.15, 0.012, m.eyeWhite, s * eyeX, eyeY, zF + 0.006);
      // Iris.
      this._box(H, hs * 0.1, hs * 0.115, 0.012, m.iris, s * eyeX, eyeY - hs * 0.005, zF + 0.014);
      // Highlight.
      this._markDetail(this._box(H, hs * 0.028, hs * 0.028, 0.01, m.eyeWhite, s * eyeX + s * hs * 0.02, eyeY + hs * 0.03, zF + 0.02));
      // Upper lash line.
      const lash = this._markDetail(this._box(H, hs * 0.2, hs * 0.035, 0.014, m.lash, s * eyeX, eyeY + hs * 0.075, zF + 0.008));
      lash.rotation.z = s * (isF ? 0.16 : 0.06);
      // Eyebrow.
      const brow = this._box(H, hs * 0.19, hs * 0.03, 0.012, m.brow, s * eyeX, eyeY + hs * 0.17, zF + 0.004);
      brow.rotation.z = s * (isF ? 0.14 : 0.05);
      // Blush (female only).
      if (isF) this._markDetail(this._box(H, hs * 0.12, hs * 0.07, 0.008, m.blush, s * (eyeX + hs * 0.06), eyeY - hs * 0.15, zF + 0.004));
    }

    // Tiny nose + mouth.
    this._box(H, hs * 0.05, hs * 0.05, hs * 0.05, m.skin, 0, eyeY - hs * 0.16, zF + 0.02);
    const mouth = this._box(H, hs * (face === 'bright' ? 0.15 : 0.12), hs * 0.03, 0.012, m.mouth, 0, eyeY - hs * 0.28, zF + 0.004);
    if (face === 'soft' || face === 'bright') mouth.scale.y = 0.9;

    // Ears.
    for (const s of [-1, 1]) this._box(H, hs * 0.06, hs * 0.2, hs * 0.16, m.skin, s * (headW * 0.5 + hs * 0.02), -hs * 0.02, -hs * 0.02);

    this._buildHair(L);
  }

  _hairBox(H, w, h, d, x, y, z, mat, rx = 0, ry = 0, rz = 0) {
    const b = this._box(H, w, h, d, mat, x, y, z);
    b.rotation.set(rx, ry, rz);
    return b;
  }

  // ---- Blocky sculpted hair (§3): chunky sections, layered depth ----
  _buildHair(L) {
    const style = this._style('hair', this._config.appearance.hair_id, 'shortLayered');
    const H = this._attach.head;
    const hs = L.hs;
    const m = this._mats;
    const A = m.hair; const B = m.hairDark;

    const crown = (h = 0.46, y = 0.28, d = 1.0, z = -0.03, mat = A) => this._hairBox(H, hs * 1.09, hs * h, hs * d, 0, hs * y, hs * z, mat);
    const backPanel = (h, y, mat = B) => this._hairBox(H, hs * 1.0, hs * h, hs * 0.28, 0, hs * y, -hs * 0.44, mat);
    const sidePanel = (s, w, h, y, z, mat = B) => this._hairBox(H, hs * w, hs * h, hs * 0.85, s * hs * 0.45, hs * y, hs * z, mat);
    const fringe = (w, h, x, y, z, rz, mat = A) => this._hairBox(H, hs * w, hs * h, hs * 0.3, hs * x, hs * y, hs * z, mat, 0, 0, rz);

    switch (style) {
      case 'shortLayered': {
        crown(0.42, 0.3, 1.0, -0.02, A);
        backPanel(0.72, -0.08, B);
        sidePanel(-1, 0.18, 0.62, -0.16, -0.05, B);
        sidePanel(1, 0.18, 0.62, -0.16, -0.05, B);
        // Side-swept layered fringe.
        fringe(0.46, 0.34, -0.02, 0.02, 0.46, 0.12, A);
        fringe(0.3, 0.4, 0.3, -0.06, 0.42, 0.3, B);
        // Face-framing locks.
        this._hairBox(H, hs * 0.16, hs * 0.5, hs * 0.22, -hs * 0.44, -hs * 0.28, hs * 0.32, A);
        this._hairBox(H, hs * 0.16, hs * 0.42, hs * 0.22, hs * 0.46, -hs * 0.22, hs * 0.3, B);
        break;
      }
      case 'volBob': {
        crown(0.5, 0.3, 1.04, -0.02, A);
        backPanel(0.86, -0.14, B);
        sidePanel(-1, 0.22, 0.95, -0.3, -0.02, A);
        sidePanel(1, 0.22, 0.95, -0.3, -0.02, A);
        // Asymmetrical fringe: a long sweep over one eye + short side.
        fringe(0.62, 0.36, -0.06, 0.0, 0.46, 0.16, A);
        fringe(0.34, 0.5, 0.28, -0.12, 0.44, 0.34, B);
        this._hairBox(H, hs * 0.2, hs * 0.62, hs * 0.26, -hs * 0.46, -hs * 0.34, hs * 0.28, A);
        this._hairBox(H, hs * 0.2, hs * 0.7, hs * 0.26, hs * 0.48, -hs * 0.4, hs * 0.24, B);
        break;
      }
      case 'longAsh': {
        crown(0.46, 0.3, 1.02, -0.02, A);
        backPanel(1.5, -0.45, B);
        // Long rear volume.
        this._hairBox(H, hs * 0.98, hs * 1.2, hs * 0.3, 0, -hs * 1.0, -hs * 0.42, B);
        sidePanel(-1, 0.2, 0.8, -0.22, -0.02, A);
        sidePanel(1, 0.2, 0.8, -0.22, -0.02, A);
        // Two long front sections toward the torso.
        this._hairBox(H, hs * 0.26, hs * 1.35, hs * 0.24, -hs * 0.44, -hs * 0.85, hs * 0.22, A);
        this._hairBox(H, hs * 0.26, hs * 1.3, hs * 0.24, hs * 0.44, -hs * 0.8, hs * 0.2, B);
        // Layered fringe with lighter tips.
        fringe(0.5, 0.3, -0.05, 0.02, 0.46, 0.12, A);
        fringe(0.32, 0.44, 0.26, -0.08, 0.44, 0.28, B);
        break;
      }
      case 'twinTails': {
        crown(0.42, 0.3, 1.0, -0.02, A);
        backPanel(0.6, -0.02, B);
        for (const s of [-1, 1]) {
          this._hairBox(H, hs * 0.3, hs * 0.7, hs * 0.3, s * hs * 0.62, -hs * 0.25, -hs * 0.3, A);
          this._markDetail(this._part(H, torus(hs * 0.13, hs * 0.04, 5, 8), m.accent, s * hs * 0.52, hs * 0.12, -hs * 0.22));
        }
        fringe(0.5, 0.3, 0, 0.02, 0.46, 0.0, A);
        break;
      }
      case 'mShort': {
        crown(0.38, 0.3, 1.0, -0.02, A);
        backPanel(0.5, -0.02, B);
        sidePanel(-1, 0.16, 0.4, -0.05, -0.05, B);
        sidePanel(1, 0.16, 0.4, -0.05, -0.05, B);
        fringe(0.5, 0.26, -0.04, 0.05, 0.46, 0.1, A);
        fringe(0.28, 0.3, 0.28, 0.02, 0.44, 0.24, B);
        break;
      }
      case 'mMessy': {
        crown(0.36, 0.3, 1.0, -0.02, A);
        backPanel(0.46, 0.02, B);
        // Chunky angled spikes.
        fringe(0.3, 0.3, -0.22, 0.08, 0.44, 0.5, A);
        fringe(0.3, 0.32, 0.02, 0.1, 0.46, -0.4, B);
        fringe(0.28, 0.3, 0.26, 0.06, 0.44, 0.55, A);
        this._hairBox(H, hs * 0.4, hs * 0.22, hs * 0.5, 0, hs * 0.5, hs * 0.05, B, 0.2, 0, 0);
        break;
      }
      case 'mBuzz':
      default: {
        this._hairBox(H, hs * 1.02, hs * 0.26, hs * 1.0, 0, hs * 0.42, -hs * 0.02, A);
        this._hairBox(H, hs * 0.98, hs * 0.42, hs * 0.2, 0, hs * 0.28, -hs * 0.42, B);
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
    const y = -headR * 0.04;

    const headwearStyle = this._style('headwear', o.headwear_id, 'none');
    const glasses = this._style('glasses', o.glasses_id, 'none');
    if (glasses !== 'none') {
      const frameMat = m.metal;
      frameMat.color.setHex(resolveColor('glassesColor', o.glasses_color_id, 'glasses_color_01').color);
      const rw = headR * 0.19;
      const rh = headR * 0.15;
      for (const s of [-1, 1]) {
        if (glasses === 'round') {
          const rim = this._part(this._attach.head, torus(headR * 0.15, headR * 0.025, 6, 12), frameMat, s * headR * 0.2, y, zF * 1.02);
          this._markDetail(rim);
        } else {
          const rim = this._markDetail(this._box(this._attach.head, rw, rh, 0.02, frameMat, s * headR * 0.2, y, zF * 1.02));
          void rim;
        }
        const lens = this._part(this._attach.head, new THREE.CircleGeometry(headR * 0.135, 12), m.lens, s * headR * 0.2, y, zF * 1.03);
        this._markDetail(lens);
      }
      this._markDetail(this._box(this._attach.head, headR * 0.16, headR * 0.03, 0.02, frameMat, 0, y, zF * 1.02));
    }

    if (headwearStyle === 'nurseCap') {
      // Structured white cap with a red cross (fictional costume detail).
      this._part(this._attach.head, bevelBox(headR * 0.72, headR * 0.24, headR * 0.5, headR * 0.08), m.cap, 0, headR * 0.52, headR * 0.06);
      this._box(this._attach.head, headR * 0.2, headR * 0.05, 0.02, m.accent, 0, headR * 0.55, headR * 0.4);
      this._box(this._attach.head, headR * 0.06, headR * 0.16, 0.02, m.accent, 0, headR * 0.55, zF * 0.5 + headR * 0.15);
    }

    if (headwearStyle === 'flower') {
      const c = new THREE.Group();
      c.position.set(headR * 0.5, headR * 0.28, headR * 0.24);
      this._attach.head.add(c);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const petal = this._part(c, bevelBox(headR * 0.12, headR * 0.12, headR * 0.05, headR * 0.03), m.flower, Math.cos(a) * headR * 0.09, Math.sin(a) * headR * 0.09, 0);
        petal.rotation.z = a;
      }
      this._part(c, new THREE.SphereGeometry(headR * 0.05, 6, 5), m.accent, 0, 0, headR * 0.03);
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
