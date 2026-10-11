// ============================================================
//  schema.js — versioned character configuration (§8, §9)
//  The renderer never invents choices: it reads a validated config.
//  Everything a player can change is an id + a clamped number, so a
//  config is portable, diffable and safe to send to another client.
// ============================================================

import {
  BODY_TYPES, getBodyType, defaultBodyTypeId, bodyTypeIds,
  resolveColor, findItem, fitsBodyType,
} from './catalog.js';

export const SCHEMA_VERSION = 1;

const LOD_PROFILES = ['high', 'standard', 'low'];

/** A complete, valid config for a body type (used on first run). */
export function defaultConfig(bodyTypeId = defaultBodyTypeId()) {
  const bt = getBodyType(bodyTypeId) || BODY_TYPES[defaultBodyTypeId()];
  const morphs = {};
  for (const m of bt.morphs) morphs[m.key] = m.default;
  return {
    schema_version: SCHEMA_VERSION,
    character_id: bt.id,
    body_type: bt.id,
    body_morphs: morphs,
    appearance: { ...bt.defaultAppearance },
    outfit: { ...bt.defaultOutfit },
    accessories: [],
    tattoos: [],
    lod_profile: 'standard',
  };
}

function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

/** Bring an old/partial config up to the current schema version. */
export function migrate(input) {
  if (!input || typeof input !== 'object') return defaultConfig();
  const cfg = { ...input };
  cfg.schema_version = SCHEMA_VERSION;
  if (!bodyTypeIds().includes(cfg.body_type)) cfg.body_type = defaultBodyTypeId();
  const base = defaultConfig(cfg.body_type);
  cfg.character_id = cfg.character_id || base.character_id;
  cfg.body_morphs = { ...base.body_morphs, ...(cfg.body_morphs || {}) };
  cfg.appearance = { ...base.appearance, ...(cfg.appearance || {}) };
  cfg.outfit = { ...base.outfit, ...(cfg.outfit || {}) };
  if (!Array.isArray(cfg.accessories)) cfg.accessories = [];
  if (!Array.isArray(cfg.tattoos)) cfg.tattoos = [];
  if (!LOD_PROFILES.includes(cfg.lod_profile)) cfg.lod_profile = 'standard';
  return cfg;
}

/**
 * Validate + clamp a config. Never throws; always returns a usable
 * config plus a record of what was corrected. Incompatible outfits are
 * replaced with the body type's default so a character is never left
 * in a broken combination (§6, §8).
 */
export function validateConfig(input) {
  const fixes = [];
  const cfg = migrate(input);
  const bt = getBodyType(cfg.body_type) || BODY_TYPES[defaultBodyTypeId()];

  // Morphs: clamp to range, fill missing, drop unknown keys.
  const morphs = {};
  for (const m of bt.morphs) {
    const raw = cfg.body_morphs[m.key];
    if (typeof raw !== 'number' || Number.isNaN(raw)) {
      morphs[m.key] = m.default;
      if (raw !== undefined) fixes.push(`morph ${m.key} → default (invalid)`);
      continue;
    }
    const c = clamp(raw, m.min, m.max);
    if (c !== raw) fixes.push(`morph ${m.key} clamped to ${c}`);
    morphs[m.key] = c;
  }
  for (const key of Object.keys(cfg.body_morphs)) {
    if (!bt.morphs.some((m) => m.key === key)) fixes.push(`morph ${key} dropped (unknown)`);
  }
  cfg.body_morphs = morphs;

  // Appearance: hair must match the body's gender.
  const base = defaultConfig(bt.id);
  const hair = findItem('hair', cfg.appearance.hair_id);
  if (!hair || (hair.gender !== 'unisex' && hair.gender !== bt.gender)) {
    fixes.push(`hair ${cfg.appearance.hair_id} → default (wrong gender)`);
    cfg.appearance.hair_id = base.appearance.hair_id;
  }
  if (!findItem('face', cfg.appearance.face_style_id) || (findItem('face', cfg.appearance.face_style_id).gender !== 'unisex' && findItem('face', cfg.appearance.face_style_id).gender !== bt.gender)) {
    fixes.push('face → default (wrong gender)');
    cfg.appearance.face_style_id = base.appearance.face_style_id;
  }
  if (!resolveColor('skin', cfg.appearance.skin_tone_id, base.appearance.skin_tone_id).id) cfg.appearance.skin_tone_id = base.appearance.skin_tone_id;
  if (!resolveColor('hairColor', cfg.appearance.hair_color_id, base.appearance.hair_color_id).id) cfg.appearance.hair_color_id = base.appearance.hair_color_id;

  // Outfit: each garment must be authored for this body type.
  for (const [slot, list] of [['top_id', 'top'], ['bottom_id', 'bottom'], ['footwear_id', 'footwear'], ['glasses_id', 'glasses']]) {
    if (!fitsBodyType(list, cfg.outfit[slot], bt.id)) {
      fixes.push(`${slot} ${cfg.outfit[slot]} → default (not authored for ${bt.id})`);
      cfg.outfit[slot] = base.outfit[slot];
    }
  }
  for (const [slot, list, baseKey] of [['top_color_id', 'topColor', 'top_color_id'], ['bottom_color_id', 'bottomColor', 'bottom_color_id'], ['shoe_color_id', 'shoeColor', 'shoe_color_id'], ['glasses_color_id', 'glassesColor', 'glasses_color_id']]) {
    if (!resolveColor(list, cfg.outfit[slot], base.outfit[baseKey]).id) cfg.outfit[slot] = base.outfit[baseKey];
  }

  if (!LOD_PROFILES.includes(cfg.lod_profile)) cfg.lod_profile = 'standard';

  return { config: cfg, fixes };
}

/** Switch body type, keeping any morph values that still apply. */
export function switchBodyType(config, nextBodyTypeId) {
  if (!bodyTypeIds().includes(nextBodyTypeId)) return config;
  const next = defaultConfig(nextBodyTypeId);
  const old = validateConfig(config).config;
  if (old.body_type === nextBodyTypeId) return old;
  // Carry over morph values that exist on both body types.
  for (const m of getBodyType(nextBodyTypeId).morphs) {
    if (typeof old.body_morphs[m.key] === 'number') next.body_morphs[m.key] = clamp(old.body_morphs[m.key], m.min, m.max);
  }
  return validateConfig(next).config;
}

// ---------- Persistence (§9: separate from rendering) ----------
const STORAGE_KEY = 'cloudhue.character.v1';

export function saveLocal(config) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(validateConfig(config).config)); return true; } catch (e) { return false; }
}
export function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return validateConfig(JSON.parse(raw)).config;
  } catch (e) { return null; }
}
export function clearLocal() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}
