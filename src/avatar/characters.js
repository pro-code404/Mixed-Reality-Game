// ============================================================
//  characters.js — body definition: proportions + morph rules (§5)
//  Pure maths, no three.js and no meshes. Given a body type and a
//  validated morph set it returns concrete dimensions in metres.
//  Keeping this separate is what lets the renderer stay dumb and the
//  customization rules stay testable.
// ============================================================

export const REF_HEIGHT = 1.75; // metres, the reference figure

// Vertical anchors as a fraction of total height.
const ANCHOR = {
  hipY: 0.545, torsoBot: 0.560, torsoTop: 0.815, shoulderY: 0.800,
  neckBot: 0.800, neckTop: 0.875, headY: 0.940, elbowY: 0.630,
  wristY: 0.480, kneeY: 0.285, ankleY: 0.070,
};

// Base radii (metres at REF_HEIGHT) — the male/female silhouettes.
const BASE = {
  male: { shoulder: 0.44, torsoR: 0.185, waistR: 0.176, hipR: 0.160, chestDepth: 0.86, armR: 0.062, legR: 0.078, thighR: 0.090, headR: 0.137, bustR: 0.0 },
  female: { shoulder: 0.37, torsoR: 0.160, waistR: 0.135, hipR: 0.185, chestDepth: 0.78, armR: 0.052, legR: 0.066, thighR: 0.084, headR: 0.133, bustR: 0.075 },
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const num = (v, d) => (typeof v === 'number' && !Number.isNaN(v) ? v : d);

/**
 * @param {'male'|'female'} gender
 * @param {object} morphs validated morph values
 */
export function proportions(gender, morphs = {}) {
  const b = BASE[gender] || BASE.female;
  const h = clamp(num(morphs.height, 1), 0.92, 1.08);
  const H = REF_HEIGHT * h;

  // Radii grow slightly with height so people do not look stretched.
  const rScale = 1 + (h - 1) * 0.5;

  const sw = clamp(num(morphs.shoulder_width, 1), 0.85, 1.15);
  const ts = clamp(num(morphs.torso_scale, 1), 0.85, 1.15);
  const cb = clamp(num(morphs.chest_bulk, 1), 0.9, 1.2);
  const ww = clamp(num(morphs.waist_width, 1), 0.85, 1.15);
  const hw = clamp(num(morphs.hip_width, 1), 0.85, 1.2);
  const tv = clamp(num(morphs.thigh_volume, 1), 0.85, 1.2);
  const bs = clamp(num(morphs.bust_scale, 1), 0.8, 1.2);
  const at = clamp(num(morphs.arm_thickness, 1), 0.85, 1.2);
  const th = clamp(num(morphs.torso_height, 1), 0.92, 1.08);
  const muscle = clamp(num(morphs.muscle_detail, 0), 0, 1);

  const y = (k) => ANCHOR[k] * H;
  const torsoTop = y('torsoBot') + (y('torsoTop') - y('torsoBot')) * th;

  return {
    H, gender, muscle,
    // vertical
    hipY: y('hipY'), torsoBot: y('torsoBot'), torsoTop,
    shoulderY: y('shoulderY'), neckBot: y('neckBot'), neckTop: y('neckTop'),
    headY: y('headY'), elbowY: y('elbowY'), wristY: y('wristY'),
    kneeY: y('kneeY'), ankleY: y('ankleY'),
    // horizontal / radii
    shoulder: b.shoulder * sw * rScale,
    torsoR: b.torsoR * ts * rScale,
    waistR: b.waistR * ww * rScale,
    hipR: b.hipR * hw * rScale,
    chestDepth: b.chestDepth * (1 + (ts - 1) * 0.5) * (1 + (cb - 1) * 0.6),
    armR: b.armR * at * rScale,
    legR: b.legR * rScale,
    thighR: b.thighR * tv * rScale,
    headR: b.headR * rScale,
    bustR: b.bustR * bs * rScale,
  };
}
