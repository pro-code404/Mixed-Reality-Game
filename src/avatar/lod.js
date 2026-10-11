// ============================================================
//  lod.js — level-of-detail seam (§7.1)
//  A single place that names the three detail levels and maps a
//  character's lod_profile to one. Geometry LOD (swapping meshes by
//  distance) is Stage D and is deliberately NOT implemented yet —
//  this module exists so that work lands in one place later.
// ============================================================

export const LOD = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };

export const DETAIL_ORDER = [LOD.HIGH, LOD.MEDIUM, LOD.LOW];

/** Map a persisted lod_profile to a concrete detail level. */
export function levelForProfile(profile) {
  return DETAIL_ORDER.includes(profile) ? profile : LOD.MEDIUM;
}

/**
 * Distance→level policy used once runtime LOD lands. Kept as data so
 * it can be tuned from measurements rather than guesses.
 * (Not wired into the render loop yet — see README.)
 */
export const LOD_DISTANCES = { medium: 12, low: 28 };
