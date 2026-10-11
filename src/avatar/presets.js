// ============================================================
//  presets.js — avatar appearance data
//  Body shape is chosen respectfully (Slim / Fit / Solid); labels
//  stay neutral and every option is player-controlled.
// ============================================================

export const DEFAULT_APPEARANCE = {
  build: 'fit',
  buildTweak: 0, // -1..1 bounded adjustment around the preset
  height: 1.0, // 0.9..1.1 stature multiplier
  skin: 0xffd7b0,
  hairShape: 0,
  hairColor: 0x2b1d12,
  eyeColor: 0x3d5a80,
  browColor: 0x2b1d12,
  mouthColor: 0xb2745a,
  top: 'T-shirt', // 'T-shirt' (short sleeve) | 'Shirt' (long sleeve)
  topColor: 0x4a7db5,
  bottom: 'Trousers', // 'Trousers' | 'Shorts'
  bottomColor: 0x2f3a4a,
  shoeColor: 0x2a2a30,
};

// Body presets. Widths are fractions of stature; `base` in avatar.js
// keeps heights so feet always meet the floor.
export const BODY_PRESETS = {
  slim:  { label: 'Slim',  torsoR: 0.160, shoulder: 0.340, hip: 0.290, limb: 0.052, legR: 0.060, headR: 0.130 },
  fit:   { label: 'Fit',   torsoR: 0.188, shoulder: 0.395, hip: 0.330, limb: 0.064, legR: 0.074, headR: 0.135 },
  fat:   { label: 'Solid', torsoR: 0.245, shoulder: 0.455, hip: 0.415, limb: 0.084, legR: 0.096, headR: 0.142 },
};

export const BODY_CHOICES = [
  ['slim', 'Slim'],
  ['fit', 'Fit'],
  ['fat', 'Solid'],
];

export const SKIN_TONES = [0xffd7b0, 0xf1c29a, 0xe0a878, 0xc68642, 0x9c6b3f, 0x7a4b28, 0x5a3a1a];
export const HAIR_COLORS = [0x2b1d12, 0x120f0d, 0x5a3a1a, 0x9a6a2a, 0xc9a24a, 0x7a4a8a, 0xa83a3a, 0xd8d0c0];
export const EYE_COLORS = [0x3d5a80, 0x4a7a4a, 0x7a5a3a, 0x2a241c, 0x6a4a8a, 0x3a8a8a];
export const TOP_COLORS = [0x4a7db5, 0xc47a5a, 0x5a8a5a, 0x8a5a8a, 0x3a3a44, 0xd4a017, 0xb5b8bd, 0x2f4f6f];
export const BOTTOM_COLORS = [0x2f3a4a, 0x4a3a2a, 0x5a5a6a, 0x3a4a5a, 0x6a4a3a, 0x33383f];
export const SHOE_COLORS = [0x2a2a30, 0xf0f0f0, 0x6a3a2a, 0x3a4a5a, 0xb03030];
export const HAIR_SHAPES = ['Short', 'Crop', 'Fade', 'Medium', 'Long'];
