// ============================================================
//  catalog.js — the validated asset catalog
//  Every player-facing choice is an id that resolves through this
//  catalog. Nothing here is a file path or a material detail, so
//  assets can be swapped or added without touching player data.
//  `estTris` values are design estimates; measured counts are
//  reported separately (see README "Measured geometry").
//
//  Art direction: Minecraft-inspired / voxel-influenced stylized
//  characters — oversized geometric head, sculpted blocky hair,
//  small anime-style face, stylized feminine silhouette and
//  modelled clothing (see the design brief).
// ============================================================

// ---------- Colours ----------
export const SKIN_TONES = [
  { id: 'skin_tone_01', name: 'Porcelain', color: 0xf7ddc4 },
  { id: 'skin_tone_02', name: 'Light', color: 0xf0c49c },
  { id: 'skin_tone_03', name: 'Warm Beige', color: 0xdfa478 },
  { id: 'skin_tone_04', name: 'Olive', color: 0xc48d5e },
  { id: 'skin_tone_05', name: 'Tan', color: 0xa9714a },
  { id: 'skin_tone_06', name: 'Brown', color: 0x835331 },
  { id: 'skin_tone_07', name: 'Deep Brown', color: 0x5f3a22 },
  { id: 'skin_tone_08', name: 'Rich Ebony', color: 0x40251a },
];

export const HAIR_COLORS = [
  { id: 'hair_color_01', name: 'Black', color: 0x1b1512 },
  { id: 'hair_color_02', name: 'Dark Brown', color: 0x3a2617 },
  { id: 'hair_color_03', name: 'Chestnut Brown', color: 0x6b3f22 },
  { id: 'hair_color_04', name: 'Auburn', color: 0x8a4b2a },
  { id: 'hair_color_05', name: 'Honey Blonde', color: 0xc9a24a },
  { id: 'hair_color_06', name: 'Ash Blonde', color: 0xcdd0c8 },
  { id: 'hair_color_07', name: 'Fantasy Violet', color: 0x7a4a9a },
  { id: 'hair_color_08', name: 'Crimson', color: 0xa83a3a },
];

export const TOP_COLORS = [
  { id: 'top_color_01', name: 'Bone White', color: 0xf2f1ec },
  { id: 'top_color_02', name: 'Charcoal', color: 0x333941 },
  { id: 'top_color_03', name: 'Purple', color: 0x6a3d8f },
  { id: 'top_color_04', name: 'Clay', color: 0xc47a5a },
  { id: 'top_color_05', name: 'Sage', color: 0x6f8f6a },
  { id: 'top_color_06', name: 'Mustard', color: 0xd4a017 },
  { id: 'top_color_07', name: 'Crimson', color: 0xb02a3a },
  { id: 'top_color_08', name: 'Cobalt', color: 0x3a5fa0 },
];

export const BOTTOM_COLORS = [
  { id: 'bottom_color_01', name: 'Black', color: 0x20222a },
  { id: 'bottom_color_02', name: 'Charcoal', color: 0x33383f },
  { id: 'bottom_color_03', name: 'Navy', color: 0x2f3a4a },
  { id: 'bottom_color_04', name: 'Stone', color: 0x7d7f83 },
  { id: 'bottom_color_05', name: 'Bone White', color: 0xeeece4 },
  { id: 'bottom_color_06', name: 'Camel', color: 0x9a7a52 },
];

export const SHOE_COLORS = [
  { id: 'shoe_color_01', name: 'Black', color: 0x22242b },
  { id: 'shoe_color_02', name: 'White', color: 0xeceff2 },
  { id: 'shoe_color_03', name: 'Brown', color: 0x6a3a2a },
  { id: 'shoe_color_04', name: 'Red', color: 0xb03030 },
  { id: 'shoe_color_05', name: 'Purple', color: 0x4a3a6a },
];

export const GLASSES_COLORS = [
  { id: 'glasses_color_01', name: 'Black', color: 0x1c1e24 },
  { id: 'glasses_color_02', name: 'Tortoise', color: 0x6a4a2a },
  { id: 'glasses_color_03', name: 'Gold', color: 0xc9a24a },
  { id: 'glasses_color_04', name: 'Silver', color: 0xd9dde3 },
];

// ---------- Body types + morph ranges (§5) ----------
// `supported: false` morphs exist in the schema (so configs stay
// forward-compatible) but are not yet driven by the material system.
export const BODY_TYPES = {
  female_base_v1: {
    id: 'female_base_v1',
    label: 'Female',
    gender: 'female',
    morphs: [
      { key: 'height', label: 'Height', min: 0.92, max: 1.08, default: 1.0, group: 'proportions' },
      { key: 'head_scale', label: 'Head size', min: 0.9, max: 1.15, default: 1.0, group: 'proportions' },
      { key: 'torso_height', label: 'Torso height', min: 0.92, max: 1.08, default: 1.0, group: 'proportions' },
      { key: 'waist_width', label: 'Waist width', min: 0.85, max: 1.15, default: 1.0, group: 'torso' },
      { key: 'hip_width', label: 'Hip width', min: 0.85, max: 1.2, default: 1.0, group: 'torso' },
      { key: 'bust_scale', label: 'Bust scale', min: 0.8, max: 1.2, default: 1.0, group: 'torso' },
      { key: 'thigh_volume', label: 'Thigh volume', min: 0.85, max: 1.2, default: 1.0, group: 'limbs' },
      { key: 'arm_thickness', label: 'Arm thickness', min: 0.85, max: 1.2, default: 1.0, group: 'limbs' },
      { key: 'tattoo_opacity', label: 'Tattoo opacity', min: 0, max: 1, default: 0, group: 'surface', supported: false },
    ],
    defaultAppearance: { skin_tone_id: 'skin_tone_02', hair_id: 'hair_f_short_brown', hair_color_id: 'hair_color_02', face_style_id: 'face_female_01' },
    defaultOutfit: { top_id: 'top_uniform_white', top_color_id: 'top_color_01', outerwear_id: 'outerwear_none', bottom_id: 'bottom_uniform_skirt', bottom_color_id: 'bottom_color_05', footwear_id: 'footwear_sneakers_01', shoe_color_id: 'shoe_color_02', glasses_id: 'glasses_none', glasses_color_id: 'glasses_color_01', headwear_id: 'headwear_none' },
  },
  male_base_v1: {
    id: 'male_base_v1',
    label: 'Male',
    gender: 'male',
    morphs: [
      { key: 'height', label: 'Height', min: 0.92, max: 1.08, default: 1.0, group: 'proportions' },
      { key: 'head_scale', label: 'Head size', min: 0.9, max: 1.15, default: 1.0, group: 'proportions' },
      { key: 'shoulder_width', label: 'Shoulder width', min: 0.85, max: 1.15, default: 1.0, group: 'torso' },
      { key: 'torso_scale', label: 'Torso proportions', min: 0.85, max: 1.15, default: 1.0, group: 'torso' },
      { key: 'chest_bulk', label: 'Chest bulk', min: 0.9, max: 1.2, default: 1.0, group: 'torso' },
      { key: 'waist_width', label: 'Waist width', min: 0.85, max: 1.15, default: 1.0, group: 'torso' },
      { key: 'arm_thickness', label: 'Arm thickness', min: 0.85, max: 1.2, default: 1.0, group: 'limbs' },
      { key: 'tattoo_opacity', label: 'Tattoo opacity', min: 0, max: 1, default: 0, group: 'surface', supported: false },
    ],
    defaultAppearance: { skin_tone_id: 'skin_tone_04', hair_id: 'hair_m_short', hair_color_id: 'hair_color_02', face_style_id: 'face_male_01' },
    defaultOutfit: { top_id: 'top_hoodie_01', top_color_id: 'top_color_02', outerwear_id: 'outerwear_none', bottom_id: 'bottom_trousers_01', bottom_color_id: 'bottom_color_03', footwear_id: 'footwear_sneakers_01', shoe_color_id: 'shoe_color_01', glasses_id: 'glasses_none', glasses_color_id: 'glasses_color_01', headwear_id: 'headwear_none' },
  },
};

export function bodyTypeIds() { return Object.keys(BODY_TYPES); }
export function getBodyType(id) { return BODY_TYPES[id] || null; }
export function defaultBodyTypeId() { return 'female_base_v1'; }

// ---------- Hair (§3) — sculpted from chunky geometric sections ----------
export const HAIR = [
  // Female reference styles: A short layered brown, B voluminous dark bob, C long ash-blonde.
  { id: 'hair_f_short_brown', name: 'Short Layered', gender: 'female', style: 'shortLayered', estTris: 700 },
  { id: 'hair_f_bob_dark', name: 'Voluminous Bob', gender: 'female', style: 'volBob', estTris: 950 },
  { id: 'hair_f_long_ash', name: 'Long Ash', gender: 'female', style: 'longAsh', estTris: 900 },
  { id: 'hair_f_twin_tails', name: 'Twin Tails', gender: 'female', style: 'twinTails', estTris: 780 },
  // Male styles in the same modelling language.
  { id: 'hair_m_short', name: 'Short Crop', gender: 'male', style: 'mShort', estTris: 520 },
  { id: 'hair_m_messy', name: 'Messy Fringe', gender: 'male', style: 'mMessy', estTris: 640 },
  { id: 'hair_m_buzz', name: 'Buzz', gender: 'male', style: 'mBuzz', estTris: 360 },
];

// ---------- Faces (§2) ----------
export const FACES = [
  { id: 'face_female_01', name: 'Soft', gender: 'female', style: 'soft' },
  { id: 'face_female_02', name: 'Bright', gender: 'female', style: 'bright' },
  { id: 'face_male_01', name: 'Neutral', gender: 'male', style: 'neutral' },
  { id: 'face_male_02', name: 'Sharp', gender: 'male', style: 'sharp' },
];

// ---------- Clothing (§5) ----------
// `fits` lists the body types an item is authored for. The dress-up
// screen only offers compatible items, and configs are validated
// against this so an incompatible combination cannot be loaded.
export const TOPS = [
  { id: 'top_uniform_white', name: 'Uniform top', style: 'uniform', fits: ['female_base_v1'], estTris: 1100 },
  { id: 'top_gothic_purple', name: 'Purple top', style: 'gothic', fits: ['female_base_v1'], estTris: 900 },
  { id: 'top_street_inner', name: 'Light inner', style: 'inner', fits: ['female_base_v1', 'male_base_v1'], estTris: 780 },
  { id: 'top_tee_01', name: 'T-shirt', style: 'tee', fits: ['female_base_v1', 'male_base_v1'], estTris: 820 },
  { id: 'top_hoodie_01', name: 'Hoodie', style: 'hoodie', fits: ['female_base_v1', 'male_base_v1'], estTris: 1300 },
];

export const OUTERWEAR = [
  { id: 'outerwear_none', name: 'None', style: 'none', fits: ['female_base_v1', 'male_base_v1'], estTris: 0 },
  { id: 'outerwear_gothic_jacket', name: 'Gothic jacket', style: 'gothicJacket', fits: ['female_base_v1'], estTris: 1400 },
  { id: 'outerwear_street_jacket', name: 'Street jacket', style: 'streetJacket', fits: ['female_base_v1', 'male_base_v1'], estTris: 1200 },
  { id: 'outerwear_coat', name: 'Long coat', style: 'coat', fits: ['female_base_v1', 'male_base_v1'], estTris: 1500 },
];

export const BOTTOMS = [
  { id: 'bottom_uniform_skirt', name: 'Pleated skirt', style: 'uniformSkirt', fits: ['female_base_v1'], estTris: 620 },
  { id: 'bottom_gothic', name: 'Dark leggings', style: 'gothic', fits: ['female_base_v1'], estTris: 760 },
  { id: 'bottom_street_shorts', name: 'Shorts', style: 'streetShorts', fits: ['female_base_v1', 'male_base_v1'], estTris: 520 },
  { id: 'bottom_trousers_01', name: 'Trousers', style: 'trousers', fits: ['female_base_v1', 'male_base_v1'], estTris: 800 },
  { id: 'bottom_cargo_01', name: 'Cargo pants', style: 'cargo', fits: ['male_base_v1'], estTris: 900 },
];

export const FOOTWEAR = [
  { id: 'footwear_sneakers_01', name: 'Sneakers', style: 'sneakers', fits: ['female_base_v1', 'male_base_v1'], estTris: 380 },
  { id: 'footwear_boots_01', name: 'Boots', style: 'boots', fits: ['female_base_v1', 'male_base_v1'], estTris: 460 },
];

// ---------- Accessories (§4.3) — attached to skeleton groups ----------
export const GLASSES = [
  { id: 'glasses_none', name: 'None', style: 'none', fits: ['female_base_v1', 'male_base_v1'], estTris: 0 },
  { id: 'glasses_round', name: 'Round', style: 'round', fits: ['female_base_v1', 'male_base_v1'], estTris: 260 },
  { id: 'glasses_square', name: 'Square', style: 'square', fits: ['female_base_v1', 'male_base_v1'], estTris: 260 },
];

export const HEADWEAR = [
  { id: 'headwear_none', name: 'None', style: 'none', fits: ['female_base_v1', 'male_base_v1'], estTris: 0 },
  { id: 'headwear_nurse_cap', name: 'Nurse cap', style: 'nurseCap', fits: ['female_base_v1'], estTris: 300 },
  { id: 'headwear_flower', name: 'Hair flower', style: 'flower', fits: ['female_base_v1'], estTris: 220 },
];

// ---------- Outfit presets (§12 reference looks) ----------
// Each preset is just a set of catalog ids, so presets stay data.
export const OUTFITS = [
  {
    id: 'outfit_nurse_white',
    name: 'White & red uniform',
    body_type: 'female_base_v1',
    appearance: { hair_id: 'hair_f_short_brown', hair_color_id: 'hair_color_02', skin_tone_id: 'skin_tone_02', face_style_id: 'face_female_01' },
    outfit: {
      top_id: 'top_uniform_white', top_color_id: 'top_color_01',
      outerwear_id: 'outerwear_none',
      bottom_id: 'bottom_uniform_skirt', bottom_color_id: 'bottom_color_05',
      footwear_id: 'footwear_sneakers_01', shoe_color_id: 'shoe_color_02',
      glasses_id: 'glasses_none', glasses_color_id: 'glasses_color_01', headwear_id: 'headwear_nurse_cap',
    },
  },
  {
    id: 'outfit_gothic_purple',
    name: 'Gothic',
    body_type: 'female_base_v1',
    appearance: { hair_id: 'hair_f_bob_dark', hair_color_id: 'hair_color_02', skin_tone_id: 'skin_tone_01', face_style_id: 'face_female_01' },
    outfit: {
      top_id: 'top_gothic_purple', top_color_id: 'top_color_03',
      outerwear_id: 'outerwear_gothic_jacket',
      bottom_id: 'bottom_gothic', bottom_color_id: 'bottom_color_01',
      footwear_id: 'footwear_boots_01', shoe_color_id: 'shoe_color_01',
      glasses_id: 'glasses_none', glasses_color_id: 'glasses_color_01', headwear_id: 'headwear_flower',
    },
  },
  {
    id: 'outfit_street_bw',
    name: 'Black & white street',
    body_type: 'female_base_v1',
    appearance: { hair_id: 'hair_f_long_ash', hair_color_id: 'hair_color_06', skin_tone_id: 'skin_tone_02', face_style_id: 'face_female_02' },
    outfit: {
      top_id: 'top_street_inner', top_color_id: 'top_color_01',
      outerwear_id: 'outerwear_street_jacket',
      bottom_id: 'bottom_street_shorts', bottom_color_id: 'bottom_color_01',
      footwear_id: 'footwear_sneakers_01', shoe_color_id: 'shoe_color_01',
      glasses_id: 'glasses_square', glasses_color_id: 'glasses_color_04', headwear_id: 'headwear_none',
    },
  },
];

export function findOutfitPreset(id) { return OUTFITS.find((o) => o.id === id) || null; }

// ---------- Resolution helpers ----------
const LISTS = {
  skin: SKIN_TONES, hairColor: HAIR_COLORS, topColor: TOP_COLORS, bottomColor: BOTTOM_COLORS,
  shoeColor: SHOE_COLORS, glassesColor: GLASSES_COLORS,
  hair: HAIR, face: FACES, top: TOPS, outerwear: OUTERWEAR, bottom: BOTTOMS,
  footwear: FOOTWEAR, glasses: GLASSES, headwear: HEADWEAR,
};

export function resolveColor(list, id, fallbackId) {
  const arr = LISTS[list] || [];
  return (arr.find((c) => c.id === id) || arr.find((c) => c.id === fallbackId) || arr[0] || { color: 0xcccccc });
}

/** Items of a category compatible with a body type. */
export function itemsFor(list, bodyTypeId) {
  const arr = LISTS[list] || [];
  return arr.filter((it) => !it.fits || it.fits.includes(bodyTypeId));
}

export function findItem(list, id) {
  const arr = LISTS[list] || [];
  return arr.find((it) => it.id === id) || null;
}

/** True when an item id is legal for a body type (accessory/outfit safety). */
export function fitsBodyType(list, id, bodyTypeId) {
  const it = findItem(list, id);
  if (!it) return false;
  return !it.fits || it.fits.includes(bodyTypeId);
}
