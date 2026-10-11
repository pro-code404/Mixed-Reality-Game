// ============================================================
//  catalog.js — the validated asset catalog (§8 of the addendum)
//  Every player-facing choice is an id that resolves through this
//  catalog. Nothing here is a file path or a material detail, so
//  assets can be swapped or added without touching player data.
//  `estTris` values are design estimates; measured counts are
//  reported separately (see README "Measured geometry").
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
  { id: 'hair_color_03', name: 'Chestnut', color: 0x6b3f22 },
  { id: 'hair_color_04', name: 'Auburn', color: 0x8a4b2a },
  { id: 'hair_color_05', name: 'Blonde', color: 0xc9a24a },
  { id: 'hair_color_06', name: 'Platinum', color: 0xe6e0cf },
  { id: 'hair_color_07', name: 'Fantasy Violet', color: 0x7a4a9a },
  { id: 'hair_color_08', name: 'Crimson', color: 0xa83a3a },
];

export const TOP_COLORS = [
  { id: 'top_color_01', name: 'Cobalt', color: 0x4a7db5 },
  { id: 'top_color_02', name: 'Charcoal', color: 0x333941 },
  { id: 'top_color_03', name: 'Sand', color: 0xc4a274 },
  { id: 'top_color_04', name: 'Clay', color: 0xc47a5a },
  { id: 'top_color_05', name: 'Sage', color: 0x6f8f6a },
  { id: 'top_color_06', name: 'Bone', color: 0xe9e3d6 },
  { id: 'top_color_07', name: 'Mustard', color: 0xd4a017 },
  { id: 'top_color_08', name: 'Plum', color: 0x6e4b73 },
];

export const BOTTOM_COLORS = [
  { id: 'bottom_color_01', name: 'Navy', color: 0x2f3a4a },
  { id: 'bottom_color_02', name: 'Charcoal', color: 0x33383f },
  { id: 'bottom_color_03', name: 'Stone', color: 0x7d7f83 },
  { id: 'bottom_color_04', name: 'Camel', color: 0x9a7a52 },
  { id: 'bottom_color_05', name: 'Olive', color: 0x4f5a3a },
  { id: 'bottom_color_06', name: 'Black', color: 0x20222a },
];

export const SHOE_COLORS = [
  { id: 'shoe_color_01', name: 'Black', color: 0x22242b },
  { id: 'shoe_color_02', name: 'White', color: 0xeceff2 },
  { id: 'shoe_color_03', name: 'Brown', color: 0x6a3a2a },
  { id: 'shoe_color_04', name: 'Red', color: 0xb03030 },
  { id: 'shoe_color_05', name: 'Blue', color: 0x3a4a7a },
];

export const GLASSES_COLORS = [
  { id: 'glasses_color_01', name: 'Black', color: 0x1c1e24 },
  { id: 'glasses_color_02', name: 'Tortoise', color: 0x6a4a2a },
  { id: 'glasses_color_03', name: 'Gold', color: 0xc9a24a },
  { id: 'glasses_color_04', name: 'Clear', color: 0xd9dde3 },
];

// ---------- Body types + morph ranges (§5) ----------
// `supported: false` morphs exist in the schema (so configs stay
// forward-compatible) but are not yet driven by the material system.
export const BODY_TYPES = {
  male_base_v1: {
    id: 'male_base_v1',
    label: 'Male',
    gender: 'male',
    morphs: [
      { key: 'height', label: 'Height', min: 0.92, max: 1.08, default: 1.0, group: 'proportions' },
      { key: 'shoulder_width', label: 'Shoulder width', min: 0.85, max: 1.15, default: 1.0, group: 'torso' },
      { key: 'torso_scale', label: 'Torso proportions', min: 0.85, max: 1.15, default: 1.0, group: 'torso' },
      { key: 'chest_bulk', label: 'Chest bulk', min: 0.9, max: 1.2, default: 1.0, group: 'torso' },
      { key: 'waist_width', label: 'Waist width', min: 0.85, max: 1.15, default: 1.0, group: 'torso' },
      { key: 'arm_thickness', label: 'Arm thickness', min: 0.85, max: 1.2, default: 1.0, group: 'limbs' },
      { key: 'muscle_detail', label: 'Muscle detail', min: 0, max: 1, default: 0.35, group: 'surface' },
      { key: 'tattoo_opacity', label: 'Tattoo opacity', min: 0, max: 1, default: 0, group: 'surface', supported: false },
    ],
    defaultAppearance: { skin_tone_id: 'skin_tone_04', hair_id: 'hair_male_wavy_01', hair_color_id: 'hair_color_02', face_style_id: 'face_male_01' },
    defaultOutfit: { top_id: 'top_tee_01', top_color_id: 'top_color_01', bottom_id: 'bottom_cargo_01', bottom_color_id: 'bottom_color_05', footwear_id: 'footwear_sneakers_01', shoe_color_id: 'shoe_color_01', glasses_id: 'glasses_none', glasses_color_id: 'glasses_color_01' },
  },
  female_base_v1: {
    id: 'female_base_v1',
    label: 'Female',
    gender: 'female',
    morphs: [
      { key: 'height', label: 'Height', min: 0.92, max: 1.08, default: 1.0, group: 'proportions' },
      { key: 'waist_width', label: 'Waist width', min: 0.85, max: 1.15, default: 1.0, group: 'torso' },
      { key: 'hip_width', label: 'Hip width', min: 0.85, max: 1.2, default: 1.0, group: 'torso' },
      { key: 'thigh_volume', label: 'Thigh volume', min: 0.85, max: 1.2, default: 1.0, group: 'limbs' },
      { key: 'bust_scale', label: 'Bust scale', min: 0.8, max: 1.2, default: 1.0, group: 'torso' },
      { key: 'torso_height', label: 'Torso height', min: 0.92, max: 1.08, default: 1.0, group: 'proportions' },
      { key: 'arm_thickness', label: 'Arm thickness', min: 0.85, max: 1.2, default: 1.0, group: 'limbs' },
      { key: 'tattoo_opacity', label: 'Tattoo opacity', min: 0, max: 1, default: 0, group: 'surface', supported: false },
    ],
    defaultAppearance: { skin_tone_id: 'skin_tone_02', hair_id: 'hair_female_curls_01', hair_color_id: 'hair_color_01', face_style_id: 'face_female_01' },
    defaultOutfit: { top_id: 'top_crop_01', top_color_id: 'top_color_04', bottom_id: 'bottom_skirt_01', bottom_color_id: 'bottom_color_01', footwear_id: 'footwear_sneakers_01', shoe_color_id: 'shoe_color_02', glasses_id: 'glasses_none', glasses_color_id: 'glasses_color_01' },
  },
};

export function bodyTypeIds() { return Object.keys(BODY_TYPES); }
export function getBodyType(id) { return BODY_TYPES[id] || null; }
export function defaultBodyTypeId() { return 'female_base_v1'; }

// ---------- Hair (§4.1 / §3.1) ----------
export const HAIR = [
  { id: 'hair_male_buzz_01', name: 'Buzz', gender: 'male', style: 'buzz', estTris: 240 },
  { id: 'hair_male_crop_01', name: 'Crop', gender: 'male', style: 'crop', estTris: 300 },
  { id: 'hair_male_wavy_01', name: 'Wavy Centre-part', gender: 'male', style: 'wavy', estTris: 520 },
  { id: 'hair_male_medium_01', name: 'Layered Medium', gender: 'male', style: 'medium', estTris: 600 },
  { id: 'hair_female_curls_01', name: 'Voluminous Curls', gender: 'female', style: 'curls', estTris: 900 },
  { id: 'hair_female_afro_01', name: 'Afro', gender: 'female', style: 'afro', estTris: 720 },
  { id: 'hair_female_pigtails_01', name: 'Pigtails', gender: 'female', style: 'pigtails', estTris: 660 },
  { id: 'hair_female_long_01', name: 'Long Waves', gender: 'female', style: 'long', estTris: 640 },
  { id: 'hair_female_side_01', name: 'Side-swept', gender: 'female', style: 'sideswept', estTris: 480 },
];

// ---------- Faces (§3.1 / §4.1) ----------
export const FACES = [
  { id: 'face_male_01', name: 'Square', gender: 'male', style: 'square' },
  { id: 'face_male_02', name: 'Angular', gender: 'male', style: 'angular' },
  { id: 'face_female_01', name: 'Soft', gender: 'female', style: 'soft' },
  { id: 'face_female_02', name: 'Heart', gender: 'female', style: 'heart' },
];

// ---------- Clothing (§3.2 / §4.2) ----------
// `fits` lists the body types an item is authored for. The dress-up
// screen only offers compatible items, and configs are validated
// against this so an incompatible combination cannot be loaded.
export const TOPS = [
  { id: 'top_tee_01', name: 'T-shirt', style: 'tee', fits: ['male_base_v1', 'female_base_v1'], estTris: 900 },
  { id: 'top_long_01', name: 'Long-sleeve', style: 'long_sleeve', fits: ['male_base_v1', 'female_base_v1'], estTris: 1100 },
  { id: 'top_hoodie_01', name: 'Hoodie', style: 'hoodie', fits: ['male_base_v1', 'female_base_v1'], estTris: 1400 },
  { id: 'top_tank_01', name: 'Tank', style: 'tank', fits: ['male_base_v1'], estTris: 620 },
  { id: 'top_fitted_01', name: 'Fitted top', style: 'fitted', fits: ['female_base_v1'], estTris: 860 },
  { id: 'top_crop_01', name: 'Crop top', style: 'crop', fits: ['female_base_v1'], estTris: 700 },
];

export const BOTTOMS = [
  { id: 'bottom_trousers_01', name: 'Trousers', style: 'trousers', fits: ['male_base_v1', 'female_base_v1'], estTris: 900 },
  { id: 'bottom_shorts_01', name: 'Shorts', style: 'shorts', fits: ['male_base_v1', 'female_base_v1'], estTris: 620 },
  { id: 'bottom_cargo_01', name: 'Cargo pants', style: 'cargo', fits: ['male_base_v1'], estTris: 1050 },
  { id: 'bottom_skirt_01', name: 'Skirt', style: 'skirt', fits: ['female_base_v1'], estTris: 520 },
];

export const FOOTWEAR = [
  { id: 'footwear_sneakers_01', name: 'Sneakers', style: 'sneakers', fits: ['male_base_v1', 'female_base_v1'], estTris: 480 },
  { id: 'footwear_boots_01', name: 'Boots', style: 'boots', fits: ['male_base_v1', 'female_base_v1'], estTris: 540 },
];

// ---------- Accessories (§4.3) — one real attachment demo ----------
export const GLASSES = [
  { id: 'glasses_none', name: 'None', style: 'none', fits: ['male_base_v1', 'female_base_v1'], estTris: 0 },
  { id: 'glasses_round_01', name: 'Round', style: 'round', fits: ['male_base_v1', 'female_base_v1'], estTris: 260 },
  { id: 'glasses_square_01', name: 'Square', style: 'square', fits: ['male_base_v1', 'female_base_v1'], estTris: 260 },
];

// ---------- Resolution helpers ----------
const LISTS = { skin: SKIN_TONES, hairColor: HAIR_COLORS, topColor: TOP_COLORS, bottomColor: BOTTOM_COLORS, shoeColor: SHOE_COLORS, glassesColor: GLASSES_COLORS, hair: HAIR, face: FACES, top: TOPS, bottom: BOTTOMS, footwear: FOOTWEAR, glasses: GLASSES };

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
