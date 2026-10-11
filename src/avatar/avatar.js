// ============================================================
//  avatar.js — the character renderer (§3, §4, §7, §9)
//  Builds a stylized, rounded human body from a validated config.
//  It only knows how to *draw* — the rules live in characters.js,
//  schema.js and catalog.js. Clothing coverage is decided here so no
//  large hidden geometry is drawn under opaque garments (§3.1).
//  Accessories attach to named attachment groups on the skeleton.
// ============================================================

import * as THREE from 'three';
import { AVATAR } from '../config.js';
import { proportions } from './characters.js';
import { resolveColor, findItem } from './catalog.js';
import { validateConfig } from './schema.js';

// Low segment counts keep every avatar inside the §7 budgets.
// Values were tuned against measured counts (see README "Measured geometry").
const cap = (r, len) => new THREE.CapsuleGeometry(r, Math.max(0.02, len), 2, 8);
const capHi = (r, len) => new THREE.CapsuleGeometry(r, Math.max(0.02, len), 3, 10);
const sph = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const cyl = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);
const bx = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, s = 6, rs = 12) => new THREE.TorusGeometry(r, t, s, rs);

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
    const next = validateConfig(config).config;
    // Switching gender is a full rebuild; same body type can update in place.
    this._config = next;
    this._dirty = true;
  }

  getConfig() { return JSON.parse(JSON.stringify(this._config)); }

  /** Detail/LOD seam (§7.1). Full geometry LOD is a Stage D task. */
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

  get height() { return proportions(this._gender(), this._config.body_morphs).H; }

  _gender() { return this._config.body_type && this._config.body_type.startsWith('male') ? 'male' : 'female'; }

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
      hair: new THREE.MeshStandardMaterial({ roughness: 0.74 }),
      top: new THREE.MeshStandardMaterial({ roughness: 0.86 }),
      bottom: new THREE.MeshStandardMaterial({ roughness: 0.9 }),
      shoe: new THREE.MeshStandardMaterial({ roughness: 0.66 }),
      eyeWhite: new THREE.MeshStandardMaterial({ color: 0xf6f6f6, roughness: 0.35 }),
      iris: new THREE.MeshStandardMaterial({ color: 0x3d5a80, roughness: 0.3, emissive: 0x3d5a80, emissiveIntensity: 0.16 }),
      brow: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
      mouth: new THREE.MeshStandardMaterial({ color: 0xb2745a, roughness: 0.5 }),
      lash: new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.5 }),
      accessory: new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2 }),
      lens: new THREE.MeshStandardMaterial({ color: 0xbfe0ff, roughness: 0.15, transparent: true, opacity: 0.35 }),
    };
  }

  _syncColors() {
    const a = this._config.appearance;
    const o = this._config.outfit;
    const m = this._mats;
    m.skin.color.setHex(resolveColor('skin', a.skin_tone_id, 'skin_tone_04').color);
    m.hair.color.setHex(resolveColor('hairColor', a.hair_color_id, 'hair_color_02').color);
    m.brow.color.setHex(resolveColor('hairColor', a.hair_color_id, 'hair_color_02').color);
    m.mouth.color.setHex(this._gender() === 'female' ? 0xb5486a : 0x9c6b52);
    m.top.color.setHex(resolveColor('topColor', o.top_color_id, 'top_color_01').color);
    m.bottom.color.setHex(resolveColor('bottomColor', o.bottom_color_id, 'bottom_color_01').color);
    m.shoe.color.setHex(resolveColor('shoeColor', o.shoe_color_id, 'shoe_color_01').color);
    m.accessory.color.setHex(resolveColor('glassesColor', o.glasses_color_id, 'glasses_color_01').color);
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
    this._buildLegs(P);
    this._buildTorso(P);
    this._buildArms(P);
    this._buildHead(P);
    this._buildAccessories(P);
    this._applyDetail();
    this._applyPose(0);
  }

  _add(mesh, parent = this.root) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  _detailMesh(mesh) { this._detailMeshes.push(mesh); return mesh; }

  // ---- Legs + lower-body clothing ----
  _buildLegs(P) {
    const style = (findItem('bottom', this._config.outfit.bottom_id) || { style: 'trousers' }).style;
    const shorts = style === 'shorts' || style === 'skirt';
    const skirt = style === 'skirt';
    const legX = P.hipR * 0.5;

    // Pelvis / hips (bottom colour).
    const pelvis = this._add(new THREE.Mesh(sph(P.hipR * 0.62), this._mats.bottom));
    pelvis.position.y = P.hipY;
    pelvis.scale.set(1.15, 0.72, 0.86);

    if (skirt) {
      const hem = P.hipY - P.H * 0.18;
      const skirtMesh = this._add(new THREE.Mesh(cyl(P.waistR * 0.9, P.hipR * 1.35, P.hipY - hem, 14), this._mats.bottom));
      skirtMesh.position.y = (P.hipY + hem) / 2;
      skirtMesh.scale.z = 0.82;
    }

    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * legX, P.hipY, 0);
      this.root.add(pivot);

      const thighLen = Math.max(0.12, P.hipY - P.kneeY);
      const shinLen = Math.max(0.12, P.kneeY - P.ankleY);
      const thigh = this._add(new THREE.Mesh(cap(P.thighR * (shorts ? 0.94 : 1.0), thighLen - 2 * P.thighR), this._mats.bottom), pivot);
      thigh.position.y = -thighLen / 2;

      const knee = this._add(new THREE.Mesh(sph(P.legR * (shorts ? 0.95 : 1.0), 8, 6), this._mats.bottom), pivot);
      knee.position.y = -thighLen;

      const shinPivot = new THREE.Group();
      shinPivot.position.y = -thighLen;
      pivot.add(shinPivot);

      const shin = this._add(new THREE.Mesh(cap(P.legR * (shorts ? 0.86 : 0.92), shinLen - 2 * P.legR), shorts ? this._mats.skin : this._mats.bottom), shinPivot);
      shin.position.y = -shinLen / 2;

      const footR = P.legR * 1.05;
      const boot = (findItem('footwear', this._config.outfit.footwear_id) || {}).style === 'boots';
      const footHalf = footR * (boot ? 0.95 : 0.7);
      const foot = this._add(new THREE.Mesh(sph(footR, 8, 6), this._mats.shoe), shinPivot);
      foot.scale.set(0.95, boot ? 0.95 : 0.7, boot ? 1.7 : 1.75);
      // shinPivot sits at the knee; place the foot so its underside rests on y = 0.
      foot.position.y = footHalf - P.kneeY;
      foot.position.z = footR * 0.6;

      if (boot) {
        const shaft = this._add(new THREE.Mesh(cyl(P.legR * 1.02, P.legR * 1.02, P.legR * 3.2, 10), this._mats.shoe), shinPivot);
        shaft.position.y = -shinLen + P.legR * 1.6;
      }
      if (style === 'cargo') {
        const pocket = this._detailMesh(this._add(new THREE.Mesh(bx(P.thighR * 0.9, P.thighR * 1.1, 0.06), this._mats.bottom), pivot));
        pocket.position.set(s * 0.02, -thighLen * 0.5, P.thighR * 0.95);
      }

      this._rig[`leg${s < 0 ? 'L' : 'R'}`] = pivot;
      this._rig[`shin${s < 0 ? 'L' : 'R'}`] = shinPivot;
    }
    this._attach.hips = pelvis;
  }

  // ---- Torso + upper-body clothing ----
  _buildTorso(P) {
    const style = (findItem('top', this._config.outfit.top_id) || { style: 'tee' }).style;
    const crop = style === 'crop';
    const tank = style === 'tank';
    const hoodie = style === 'hoodie';

    const torsoTop = P.torsoTop;
    const torsoBot = crop ? P.torsoBot + (torsoTop - P.torsoBot) * 0.34 : P.torsoBot;
    const topR = P.torsoR * (tank ? 0.86 : 1.0) * (hoodie ? 1.08 : 1.0);

    // The shirt *is* the torso surface, so no skin torso is drawn under it.
    const torsoLen = Math.max(0.06, torsoTop - torsoBot - 2 * topR);
    const torso = this._add(new THREE.Mesh(capHi(topR, torsoLen), this._mats.top));
    torso.position.y = (torsoTop + torsoBot) / 2;
    torso.scale.z = P.chestDepth;

    if (crop) {
      // Midriff skin between the crop top and the waistband.
      const mTop = torsoBot;
      const mBot = P.hipY - P.hipR * 0.2;
      const mid = this._add(new THREE.Mesh(cap(P.waistR * 1.02, Math.max(0.04, mTop - mBot - 2 * P.waistR)), this._mats.skin));
      mid.position.y = (mTop + mBot) / 2;
      mid.scale.z = P.chestDepth;
    }

    // Shoulders (garment colour) + optional chest definition.
    for (const s of [-1, 1]) {
      const sh = this._add(new THREE.Mesh(sph(topR * 0.6), this._mats.top));
      sh.position.set((s * P.shoulder) / 2, P.shoulderY, 0);
      if (P.muscle > 0.25 && this._gender() === 'male') {
        const delt = this._detailMesh(this._add(new THREE.Mesh(sph(P.armR * 0.55, 8, 6), this._mats.top)));
        delt.position.set((s * P.shoulder) / 2, P.shoulderY - 0.02, 0);
        delt.scale.set(1, 0.9, 1);
      }
    }
    if (hoodie) {
      const hood = this._detailMesh(this._add(new THREE.Mesh(sph(P.torsoR * 0.82, 10, 8), this._mats.top)));
      hood.position.set(0, P.neckBot - P.torsoR * 0.1, -P.torsoR * 0.55);
      hood.scale.set(1, 0.8, 1);
    }
    // Neck (skin) — always visible.
    const neck = this._add(new THREE.Mesh(cyl(P.armR * 1.05, P.armR * 1.2, Math.max(0.06, P.neckTop - P.neckBot)), this._mats.skin));
    neck.position.y = (P.neckBot + P.neckTop) / 2;

    this._attach.chest = new THREE.Group();
    this._attach.chest.position.y = P.shoulderY - 0.12;
    this.root.add(this._attach.chest);
    this._torsoStyle = style;
  }

  // ---- Arms + sleeve coverage ----
  _buildArms(P) {
    const style = (findItem('top', this._config.outfit.top_id) || { style: 'tee' }).style;
    const longSleeve = style === 'long_sleeve' || style === 'hoodie';
    const tank = style === 'tank';
    const armX = P.shoulder / 2;
    const upperLen = Math.max(0.1, P.shoulderY - P.elbowY);
    const foreLen = Math.max(0.1, P.elbowY - P.wristY);
    const upperMat = tank ? this._mats.skin : this._mats.top;
    const foreMat = longSleeve ? this._mats.top : this._mats.skin;

    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * armX, P.shoulderY, 0);
      this.root.add(pivot);

      const upper = this._add(new THREE.Mesh(cap(P.armR * 1.02, upperLen - 2 * P.armR), upperMat), pivot);
      upper.position.y = -upperLen / 2;

      const elbow = this._add(new THREE.Mesh(sph(P.armR * 0.98, 8, 6), foreMat), pivot);
      elbow.position.y = -upperLen;

      const forePivot = new THREE.Group();
      forePivot.position.y = -upperLen;
      pivot.add(forePivot);

      const fore = this._add(new THREE.Mesh(cap(P.armR * 0.9, foreLen - 2 * P.armR), foreMat), forePivot);
      fore.position.y = -foreLen / 2;

      const hand = this._add(new THREE.Mesh(sph(P.armR * 1.12, 8, 6), this._mats.skin), forePivot);
      hand.position.y = -foreLen - P.armR * 0.35;
      hand.scale.set(1, 1.1, 0.7);

      if (tank) {
        const strap = this._detailMesh(this._add(new THREE.Mesh(bx(P.armR * 0.9, 0.12, P.torsoR * 0.7), this._mats.top), pivot));
        strap.position.y = -0.02;
      }

      this._rig[`arm${s < 0 ? 'L' : 'R'}`] = pivot;
      this._rig[`fore${s < 0 ? 'L' : 'R'}`] = forePivot;
    }
  }

  // ---- Head, face, hair ----
  _buildHead(P) {
    const face = (findItem('face', this._config.appearance.face_style_id) || { style: 'soft' }).style;
    const headR = P.headR;

    this._attach.head = new THREE.Group();
    this._attach.head.position.y = P.headY;
    this.root.add(this._attach.head);

    const head = this._add(new THREE.Mesh(sph(headR, 16, 12), this._mats.skin), this._attach.head);
    // Face shape tweaks: angular/square read wider + longer jaw.
    const jaw = face === 'square' || face === 'heart' ? 1.06 : 1.0;
    head.scale.set(1.02, 1.08 * (face === 'angular' ? 1.02 : 1), jaw);

    const zF = headR * 0.9;
    const eyeY = headR * 0.06;
    const isFemale = this._gender() === 'female';

    for (const s of [-1, 1]) {
      const white = this._add(new THREE.Mesh(sph(headR * 0.2, 10, 8), this._mats.eyeWhite), this._attach.head);
      white.position.set(s * headR * 0.4, eyeY, zF);
      white.scale.set(1, 1, 0.6);
      const iris = this._add(new THREE.Mesh(sph(headR * 0.1, 8, 6), this._mats.iris), this._attach.head);
      iris.position.set(s * headR * 0.4, eyeY, zF + headR * 0.12);
      const brow = this._add(new THREE.Mesh(bx(headR * 0.44, headR * (isFemale ? 0.05 : 0.08), headR * 0.12), this._mats.brow), this._attach.head);
      brow.position.set(s * headR * 0.4, eyeY + headR * (isFemale ? 0.5 : 0.42), zF);
      brow.rotation.z = s * (isFemale ? 0.16 : 0.1);
      if (isFemale) {
        // Dramatic eyelash accent (§4.1).
        const lash = this._add(new THREE.Mesh(bx(headR * 0.42, headR * 0.05, headR * 0.1), this._mats.lash), this._attach.head);
        lash.position.set(s * headR * 0.4, eyeY + headR * 0.2, zF + headR * 0.01);
        lash.rotation.z = s * 0.18;
      }
    }
    const nose = this._add(new THREE.Mesh(sph(headR * 0.14, 8, 6), this._mats.skin), this._attach.head);
    nose.position.set(0, eyeY - headR * 0.05, zF + headR * 0.12);
    const mouth = this._add(new THREE.Mesh(bx(headR * (isFemale ? 0.36 : 0.32), headR * (isFemale ? 0.09 : 0.06), headR * 0.08), this._mats.mouth), this._attach.head);
    mouth.position.set(0, eyeY - headR * 0.52, zF - headR * 0.02);

    for (const s of [-1, 1]) {
      const ear = this._add(new THREE.Mesh(sph(headR * 0.22, 8, 6), this._mats.skin), this._attach.head);
      ear.position.set(s * headR * 0.98, -headR * 0.05, 0);
    }

    this._buildHair(P, headR);
  }

  _buildHair(P, headR) {
    const style = (findItem('hair', this._config.appearance.hair_id) || { style: 'crop' }).style;
    const H = this._attach.head;
    const capShell = (radius, theta, yOff = 0, zScale = 1) => {
      const g = new THREE.SphereGeometry(radius, 16, 12, 0, Math.PI * 2, 0, theta);
      const mesh = this._add(new THREE.Mesh(g, this._mats.hair), H);
      mesh.position.y = yOff;
      mesh.scale.z = zScale;
      return mesh;
    };
    switch (style) {
      case 'buzz': capShell(headR * 1.02, Math.PI * 0.4); break;
      case 'crop': capShell(headR * 1.04, Math.PI * 0.5); break;
      case 'wavy': {
        capShell(headR * 1.05, Math.PI * 0.58);
        for (const s of [-1, 1]) {
          const sweep = this._detailMesh(this._add(new THREE.Mesh(sph(headR * 0.5, 8, 6), this._mats.hair), H));
          sweep.position.set(s * headR * 0.72, headR * 0.35, headR * 0.18);
          sweep.scale.set(0.8, 1.25, 0.9);
        }
        const fringe = this._add(new THREE.Mesh(bx(headR * 1.5, headR * 0.5, headR * 0.35), this._mats.hair), H);
        fringe.position.set(0, headR * 0.55, headR * 0.66);
        fringe.rotation.x = -0.25;
        break;
      }
      case 'medium': {
        capShell(headR * 1.07, Math.PI * 0.6);
        const back = this._add(new THREE.Mesh(sph(headR * 0.72, 10, 8), this._mats.hair), H);
        back.position.set(0, -headR * 0.25, -headR * 0.55);
        back.scale.set(1, 1.15, 0.8);
        break;
      }
      case 'curls': {
        capShell(headR * 1.06, Math.PI * 0.62);
        const rng = [[0, 0.9, 0.2], [0.7, 0.7, 0.1], [-0.7, 0.7, 0.1], [0.55, -0.2, -0.5], [-0.55, -0.2, -0.5], [0, 0.55, -0.7], [0.45, 0.15, 0.55], [-0.45, 0.15, 0.55], [0, -0.5, -0.9]];
        for (const [x, yy, z] of rng) {
          const c = this._add(new THREE.Mesh(sph(headR * 0.42, 8, 6), this._mats.hair), H);
          c.position.set(x * headR, yy * headR, z * headR);
          c.scale.set(1, 1, 1);
        }
        break;
      }
      case 'afro': {
        const dome = this._add(new THREE.Mesh(sph(headR * 1.45, 14, 12), this._mats.hair), H);
        dome.position.y = headR * 0.18;
        dome.scale.set(1.05, 0.95, 1.02);
        for (const [x, yy, z] of [[1.1, 0.2, 0], [-1.1, 0.2, 0], [0, 1.05, 0], [0, 0.2, -1.05]]) {
          const b = this._detailMesh(this._add(new THREE.Mesh(sph(headR * 0.6, 8, 6), this._mats.hair), H));
          b.position.set(x * headR, yy * headR, z * headR);
        }
        break;
      }
      case 'pigtails': {
        capShell(headR * 1.04, Math.PI * 0.55);
        for (const s of [-1, 1]) {
          const tail = this._add(new THREE.Mesh(sph(headR * 0.42, 8, 6), this._mats.hair), H);
          tail.position.set(s * headR * 1.15, -headR * 0.15, -headR * 0.35);
          tail.scale.set(0.8, 1.6, 0.8);
          const tie = this._detailMesh(this._add(new THREE.Mesh(torus(headR * 0.28, headR * 0.06, 6, 12), this._mats.accessory), H));
          tie.position.set(s * headR * 0.98, headR * 0.25, -headR * 0.2);
        }
        break;
      }
      case 'long': {
        capShell(headR * 1.05, Math.PI * 0.58);
        const back = this._add(new THREE.Mesh(bx(headR * 1.7, headR * 2.2, headR * 0.7), this._mats.hair), H);
        back.position.set(0, -headR * 1.3, -headR * 0.45);
        for (const s of [-1, 1]) {
          const side = this._add(new THREE.Mesh(bx(headR * 0.45, headR * 1.6, headR * 0.6), this._mats.hair), H);
          side.position.set(s * headR * 0.78, -headR * 0.75, -headR * 0.2);
        }
        break;
      }
      case 'sideswept': {
        capShell(headR * 1.05, Math.PI * 0.56);
        const sweep = this._add(new THREE.Mesh(sph(headR * 0.7, 10, 8), this._mats.hair), H);
        sweep.position.set(headR * 0.5, headR * 0.42, headR * 0.05);
        sweep.scale.set(1.25, 0.85, 1.0);
        break;
      }
      default: capShell(headR * 1.04, Math.PI * 0.5);
    }
  }

  // ---- Accessories (§4.3) — attached to the head group ----
  _buildAccessories(P) {
    const glasses = (findItem('glasses', this._config.outfit.glasses_id) || { style: 'none' }).style;
    if (glasses === 'none') return;
    const headR = P.headR;
    const zF = headR * 1.0;
    const y = headR * 0.06;
    const rimR = headR * 0.3 * (glasses === 'square' ? 1.05 : 1);
    for (const s of [-1, 1]) {
      const rim = this._add(new THREE.Mesh(torus(rimR, headR * 0.045, 6, 14), this._mats.accessory), this._attach.head);
      rim.position.set(s * headR * 0.42, y, zF);
      if (glasses === 'square') rim.scale.set(1.05, 0.92, 1);
      this._detailMesh(rim);
      const lens = this._add(new THREE.Mesh(new THREE.CircleGeometry(rimR * 0.92, 16), this._mats.lens), this._attach.head);
      lens.position.set(s * headR * 0.42, y, zF + 0.002);
      this._detailMesh(lens);
    }
    const bridge = this._add(new THREE.Mesh(bx(headR * 0.22, headR * 0.05, headR * 0.05), this._mats.accessory), this._attach.head);
    bridge.position.set(0, y, zF);
    this._detailMesh(bridge);
  }

  _applyDetail() {
    const level = this._detail;
    for (const m of this._detailMeshes) m.visible = level !== 'low';
  }

  // ---- Walk / idle pose (rig keys unchanged from the first build) ----
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
