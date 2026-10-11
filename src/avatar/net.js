// ============================================================
//  net.js — multiplayer representation seam (§9, §E)
//  A compact, validated description of how *other* clients should
//  draw a character. Assets are referenced by catalog index (not by
//  id string or path), so an appearance is a handful of small
//  numbers. Nothing here opens a connection: networking is Stage E.
// ============================================================

import { validateConfig, SCHEMA_VERSION } from './schema.js';
import {
  BODY_TYPES, bodyTypeIds, getBodyType, SKIN_TONES, HAIR_COLORS, TOP_COLORS,
  BOTTOM_COLORS, SHOE_COLORS, GLASSES_COLORS, HAIR, FACES, TOPS, BOTTOMS,
  FOOTWEAR, GLASSES,
} from './catalog.js';

const LOD = ['high', 'standard', 'low'];
const idx = (list, id) => Math.max(0, list.findIndex((x) => x.id === id));
const at = (list, i) => (typeof i === 'number' && i >= 0 && i < list.length ? list[i].id : undefined);

/** Encode a config to a short, URL-safe string of catalog indices. */
export function encodeConfig(config) {
  const c = validateConfig(config).config;
  const bt = getBodyType(c.body_type) || BODY_TYPES[bodyTypeIds()[0]];
  const morphs = bt.morphs.map((m) => Math.round((c.body_morphs[m.key] ?? m.default) * 1000) / 1000);
  const arr = [
    SCHEMA_VERSION,                 // 0
    Math.max(0, bodyTypeIds().indexOf(bt.id)), // 1
    ...morphs,                      // 2 .. 2+n-1 (order follows the body type)
    idx(SKIN_TONES, c.appearance.skin_tone_id),
    idx(HAIR, c.appearance.hair_id),
    idx(HAIR_COLORS, c.appearance.hair_color_id),
    idx(FACES, c.appearance.face_style_id),
    idx(TOPS, c.outfit.top_id),
    idx(TOP_COLORS, c.outfit.top_color_id),
    idx(BOTTOMS, c.outfit.bottom_id),
    idx(BOTTOM_COLORS, c.outfit.bottom_color_id),
    idx(FOOTWEAR, c.outfit.footwear_id),
    idx(SHOE_COLORS, c.outfit.shoe_color_id),
    idx(GLASSES, c.outfit.glasses_id),
    idx(GLASSES_COLORS, c.outfit.glasses_color_id),
    Math.max(0, LOD.indexOf(c.lod_profile)),
  ];
  return toBase64Url(JSON.stringify(arr));
}

/** Decode + validate an incoming string. Returns a config, or null. */
export function decodeConfig(str) {
  if (typeof str !== 'string' || str.length > 2000) return null;
  let arr;
  try { arr = JSON.parse(fromBase64Url(str)); } catch (e) { return null; }
  if (!Array.isArray(arr) || arr.length < 3) return null;
  if (arr[0] !== SCHEMA_VERSION) return null;

  const bodyTypeId = at(bodyTypeIds().map((id) => ({ id })), arr[1]);
  const bt = getBodyType(bodyTypeId) || BODY_TYPES[bodyTypeIds()[0]];
  const n = bt.morphs.length;

  const body_morphs = {};
  for (let i = 0; i < n; i++) {
    const v = arr[2 + i];
    body_morphs[bt.morphs[i].key] = typeof v === 'number' ? v : bt.morphs[i].default;
  }

  const base = 2 + n;
  const g = (offset) => arr[base + offset];

  const out = {
    schema_version: SCHEMA_VERSION,
    body_type: bt.id,
    body_morphs,
    appearance: {
      skin_tone_id: at(SKIN_TONES, g(0)),
      hair_id: at(HAIR, g(1)),
      hair_color_id: at(HAIR_COLORS, g(2)),
      face_style_id: at(FACES, g(3)),
    },
    outfit: {
      top_id: at(TOPS, g(4)),
      top_color_id: at(TOP_COLORS, g(5)),
      bottom_id: at(BOTTOMS, g(6)),
      bottom_color_id: at(BOTTOM_COLORS, g(7)),
      footwear_id: at(FOOTWEAR, g(8)),
      shoe_color_id: at(SHOE_COLORS, g(9)),
      glasses_id: at(GLASSES, g(10)),
      glasses_color_id: at(GLASSES_COLORS, g(11)),
    },
    lod_profile: LOD[g(12)] || 'standard',
  };
  // validateConfig clamps morphs, drops unknown ids and swaps
  // combinations that are not authored for the body type.
  return validateConfig(out).config;
}

/**
 * Trust boundary for remote appearance. Returns the safe config plus
 * whether anything had to be corrected, so the caller can log/ignore
 * hostile or stale payloads instead of blindly trusting them.
 */
export function acceptRemote(str) {
  const decoded = decodeConfig(str);
  if (!decoded) return { ok: false, config: null, reason: 'undecodable' };
  const canonical = encodeConfig(decoded);
  return { ok: true, config: decoded, reason: canonical === str ? 'verbatim' : 'corrected' };
}

// ---- base64url without assuming a DOM ----
function toBase64Url(s) {
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  if (typeof atob === 'function') return decodeURIComponent(escape(atob(b64)));
  return Buffer.from(b64, 'base64').toString('utf8');
}
