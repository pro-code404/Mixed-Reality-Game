// ============================================================
//  avatar.js — a rounded, parametric, human-like figure
//  Built from continuous curved forms (capsules + spheres) with
//  joint pivots so limbs bend smoothly. Body shape and stature are
//  rebuilt parametrically (never a non-uniform scale of a rig), so
//  feet always meet the floor and clothing scales with the body.
// ============================================================

import * as THREE from 'three';
import { SCALE, AVATAR } from '../config.js';
import { BODY_PRESETS, DEFAULT_APPEARANCE } from './presets.js';

const BASE_H = SCALE.avatarHeight;

// Vertical proportions for a 1.75 m reference figure (metres).
const P0 = {
  hipY: 0.95,
  torsoBot: 0.98,
  torsoTop: 1.42,
  shoulderY: 1.40,
  neckBot: 1.40,
  neckTop: 1.53,
  headY: 1.64,
  elbowY: 1.10,
  wristY: 0.84,
  kneeY: 0.50,
  ankleY: 0.12,
};

const capsuleGeo = (r, length) => new THREE.CapsuleGeometry(r, Math.max(0.02, length), 6, 14);
const sphereGeo = (r, w = 18, h = 14) => new THREE.SphereGeometry(r, w, h);
const cylGeo = (rt, rb, h, seg = 14) => new THREE.CylinderGeometry(rt, rb, h, seg);

export class Avatar {
  constructor(appearance = DEFAULT_APPEARANCE) {
    this.group = new THREE.Group();
    this.group.name = 'avatar';
    this.root = new THREE.Group(); // bobs during the walk cycle
    this.group.add(this.root);

    this.appearance = { ...DEFAULT_APPEARANCE, ...appearance };
    this.radius = AVATAR.radius;
    this._dirty = true;
    this._walkPhase = 0;
    this._rig = {};
    this._mats = this._makeMaterials();
  }

  _makeMaterials() {
    const a = this.appearance;
    return {
      skin: new THREE.MeshStandardMaterial({ color: a.skin, roughness: 0.62 }),
      hair: new THREE.MeshStandardMaterial({ color: a.hairColor, roughness: 0.72 }),
      top: new THREE.MeshStandardMaterial({ color: a.topColor, roughness: 0.86 }),
      bottom: new THREE.MeshStandardMaterial({ color: a.bottomColor, roughness: 0.9 }),
      shoe: new THREE.MeshStandardMaterial({ color: a.shoeColor, roughness: 0.66 }),
      eyeWhite: new THREE.MeshStandardMaterial({ color: 0xf6f6f6, roughness: 0.35 }),
      iris: new THREE.MeshStandardMaterial({ color: a.eyeColor, roughness: 0.3, emissive: a.eyeColor, emissiveIntensity: 0.18 }),
      brow: new THREE.MeshStandardMaterial({ color: a.browColor, roughness: 0.7 }),
      mouth: new THREE.MeshStandardMaterial({ color: a.mouthColor, roughness: 0.55 }),
    };
  }

  setAppearance(a) {
    this.appearance = { ...this.appearance, ...a };
    this._dirty = true;
  }

  /** Apply any pending rebuild (called once per frame, so sliders are smooth). */
  tick() {
    if (this._dirty) {
      this._dirty = false;
      this._build();
    }
  }

  get height() {
    return BASE_H * (this.appearance.height || 1);
  }

  _disposeGeometries(obj) {
    obj.traverse((o) => {
      if (o.isMesh && o.geometry) o.geometry.dispose();
    });
  }

  _build() {
    for (const c of [...this.root.children]) {
      this._disposeGeometries(c);
      this.root.remove(c);
    }
    this._rig = {};

    const a = this.appearance;
    const P = BODY_PRESETS[a.build] || BODY_PRESETS.fit;
    const tweak = 1 + (a.buildTweak || 0) * 0.3;
    const k = a.height || 1;
    const y = (v) => v * k;

    // Colours can change without structural changes; update in place.
    this._mats.skin.color.setHex(a.skin);
    this._mats.hair.color.setHex(a.hairColor);
    this._mats.top.color.setHex(a.topColor);
    this._mats.bottom.color.setHex(a.bottomColor);
    this._mats.shoe.color.setHex(a.shoeColor);
    this._mats.iris.color.setHex(a.eyeColor);
    this._mats.iris.emissive.setHex(a.eyeColor);
    this._mats.brow.color.setHex(a.browColor);
    this._mats.mouth.color.setHex(a.mouthColor);

    const m = this._mats;
    const torsoR = P.torsoR * tweak;
    const shoulder = P.shoulder * tweak;
    const hipW = P.hip * tweak;
    const limbR = P.limb * tweak;
    const legR = P.legR * tweak;
    const headR = P.headR;

    const add = (mesh, parent = this.root) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // ---- Torso (shirt) ----
    const torsoTopL = y(P0.torsoTop);
    const torsoBotL = y(P0.torsoBot);
    const torsoLen = Math.max(0.06, torsoTopL - torsoBotL - 2 * torsoR);
    const torso = add(new THREE.Mesh(capsuleGeo(torsoR, torsoLen), m.top));
    torso.position.y = (torsoTopL + torsoBotL) / 2;
    torso.scale.z = 0.72;

    // ---- Shoulders ----
    for (const s of [-1, 1]) {
      const sh = add(new THREE.Mesh(sphereGeo(torsoR * 0.62), m.top));
      sh.position.set((s * shoulder) / 2, y(P0.shoulderY), 0);
    }

    // ---- Pelvis (bottoms) ----
    const pelvis = add(new THREE.Mesh(sphereGeo(hipW * 0.5), m.bottom));
    pelvis.position.y = y(P0.hipY);
    pelvis.scale.set(1, 0.72, 0.86);

    // ---- Neck + head ----
    const neck = add(new THREE.Mesh(cylGeo(limbR * 1.1, limbR * 1.25, y(P0.neckTop - P0.neckBot)), m.skin));
    neck.position.y = y((P0.neckBot + P0.neckTop) / 2);

    const head = add(new THREE.Mesh(sphereGeo(headR, 22, 18), m.skin));
    head.position.y = y(P0.headY);
    head.scale.set(1, 1.08, 1.02);

    for (const s of [-1, 1]) {
      const ear = add(new THREE.Mesh(sphereGeo(headR * 0.22, 10, 8), m.skin));
      ear.position.set(s * headR * 0.98, y(P0.headY) - headR * 0.05, 0);
    }

    this._buildFace(headR, y(P0.headY), add);
    this._buildHair(a.hairShape, headR, y(P0.headY), add);

    // ---- Arms (pivot groups so they swing + bend) ----
    const armX = shoulder / 2;
    const upperLen = Math.max(0.08, y(P0.shoulderY - P0.elbowY));
    const foreLen = Math.max(0.08, y(P0.elbowY - P0.wristY));
    const sleeveLong = a.top === 'Shirt';
    const upperMat = m.top;
    const foreMat = sleeveLong ? m.top : m.skin;

    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * armX, y(P0.shoulderY), 0);
      this.root.add(pivot);

      const upper = add(new THREE.Mesh(capsuleGeo(limbR * 1.05, upperLen - 2 * limbR), upperMat), pivot);
      upper.position.y = -upperLen / 2;

      const elbow = add(new THREE.Mesh(sphereGeo(limbR * 1.0, 12, 10), foreMat), pivot);
      elbow.position.y = -upperLen;

      const forePivot = new THREE.Group();
      forePivot.position.y = -upperLen;
      pivot.add(forePivot);

      const fore = add(new THREE.Mesh(capsuleGeo(limbR * 0.92, foreLen - 2 * limbR), foreMat), forePivot);
      fore.position.y = -foreLen / 2;

      const hand = add(new THREE.Mesh(sphereGeo(limbR * 1.15, 12, 10), m.skin), forePivot);
      hand.position.y = -foreLen - limbR * 0.4;
      hand.scale.set(1, 1.1, 0.7);

      this._rig[`arm${s < 0 ? 'L' : 'R'}`] = pivot;
      this._rig[`fore${s < 0 ? 'L' : 'R'}`] = forePivot;
    }

    // ---- Legs (pivot groups so they swing + bend) ----
    const legX = hipW * 0.42;
    const thighLen = Math.max(0.1, y(P0.hipY - P0.kneeY));
    const shinLen = Math.max(0.1, y(P0.kneeY - P0.ankleY));
    const floorLocalY = -y(P0.hipY);
    const shorts = a.bottom === 'Shorts';

    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * legX, y(P0.hipY), 0);
      this.root.add(pivot);

      const thigh = add(new THREE.Mesh(capsuleGeo(legR * 1.12, thighLen - 2 * legR), m.bottom), pivot);
      thigh.position.y = -thighLen / 2;

      const knee = add(new THREE.Mesh(sphereGeo(legR * 1.0, 12, 10), shorts ? m.skin : m.bottom), pivot);
      knee.position.y = -thighLen;

      const shinPivot = new THREE.Group();
      shinPivot.position.y = -thighLen;
      pivot.add(shinPivot);

      const shin = add(new THREE.Mesh(capsuleGeo(legR * 0.9, shinLen - 2 * legR), shorts ? m.skin : m.bottom), shinPivot);
      shin.position.y = -shinLen / 2;

      // Foot sits so its underside meets the floor plane (world y = 0).
      const footR = legR * 1.05;
      const foot = add(new THREE.Mesh(sphereGeo(footR, 12, 10), m.shoe), shinPivot);
      foot.scale.set(0.95, 0.7, 1.7);
      const footHalf = footR * 0.7; // half height after the y-scale
      foot.position.y = footHalf - y(P0.kneeY); // relative to the shin pivot (at the knee)
      foot.position.z = footR * 0.6;

      this._rig[`leg${s < 0 ? 'L' : 'R'}`] = pivot;
      this._rig[`shin${s < 0 ? 'L' : 'R'}`] = shinPivot;
    }

    // Reset pose
    this._applyPose(0);
  }

  _buildFace(headR, hy, add) {
    const m = this._mats;
    const zFront = headR * 0.9;
    for (const s of [-1, 1]) {
      const white = add(new THREE.Mesh(sphereGeo(headR * 0.2, 12, 10), m.eyeWhite));
      white.position.set(s * headR * 0.4, hy + headR * 0.06, zFront);
      white.scale.set(1, 1, 0.6);

      const iris = add(new THREE.Mesh(sphereGeo(headR * 0.1, 10, 8), m.iris));
      iris.position.set(s * headR * 0.4, hy + headR * 0.06, zFront + headR * 0.12);

      const brow = add(new THREE.Mesh(new THREE.BoxGeometry(headR * 0.44, headR * 0.07, headR * 0.12), m.brow));
      brow.position.set(s * headR * 0.4, hy + headR * 0.42, zFront);
      brow.rotation.z = s * 0.12;
    }
    const nose = add(new THREE.Mesh(sphereGeo(headR * 0.14, 10, 8), m.skin));
    nose.position.set(0, hy - headR * 0.05, zFront + headR * 0.12);

    const mouth = add(new THREE.Mesh(new THREE.BoxGeometry(headR * 0.34, headR * 0.06, headR * 0.08), m.mouth));
    mouth.position.set(0, hy - headR * 0.5, zFront - headR * 0.02);
  }

  _buildHair(shape, headR, hy, add) {
    const m = this._mats;
    const cap = (radius, theta, yOff = 0, zScale = 1) => {
      const g = new THREE.SphereGeometry(radius, 20, 16, 0, Math.PI * 2, 0, theta);
      const mesh = add(new THREE.Mesh(g, m.hair));
      mesh.position.y = hy + yOff;
      mesh.scale.z = zScale;
      return mesh;
    };
    if (shape === 1) {
      // Crop — tight and flat.
      cap(headR * 1.04, Math.PI * 0.5);
    } else if (shape === 2) {
      // Fade — short cap + low side band.
      cap(headR * 1.03, Math.PI * 0.44);
      const band = add(new THREE.Mesh(cylGeo(headR * 1.02, headR * 1.0, headR * 0.5, 18), m.hair));
      band.position.y = hy - headR * 0.2;
    } else if (shape === 3) {
      // Medium — cap with a little back volume.
      cap(headR * 1.08, Math.PI * 0.6);
      const back = add(new THREE.Mesh(sphereGeo(headR * 0.72, 14, 12), m.hair));
      back.position.set(0, hy - headR * 0.25, -headR * 0.55);
      back.scale.set(1, 1.1, 0.8);
    } else if (shape === 4) {
      // Long — cap flowing to the shoulders.
      cap(headR * 1.06, Math.PI * 0.55);
      const back = add(new THREE.Mesh(new THREE.BoxGeometry(headR * 1.7, headR * 1.9, headR * 0.7), m.hair));
      back.position.set(0, hy - headR * 1.1, -headR * 0.5);
    } else {
      // Short — the default rounded cap.
      cap(headR * 1.05, Math.PI * 0.55);
    }
  }

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

  /**
   * Advance the walk/idle animation.
   * speed01: 0 (idle) .. 1 (full walk). reducedMotion damps the cycle.
   */
  animate(dt, speed01, reducedMotion) {
    if (speed01 > 0.02 && !reducedMotion) {
      this._walkPhase += dt * 9 * (0.6 + speed01 * 0.6);
      this._applyPose(this._walkPhase);
    } else if (speed01 > 0.02 && reducedMotion) {
      this._applyPose(this._walkPhase * 0.0);
      this.root.position.y = Math.abs(Math.sin(performance.now() * 0.004)) * 0.02;
    } else {
      // Settle to a gentle idle.
      this._walkPhase = 0;
      this._applyPose(0);
      if (!reducedMotion) this.root.position.y = Math.sin(performance.now() * 0.0015) * 0.008;
      else this.root.position.y = 0;
    }
  }
}
