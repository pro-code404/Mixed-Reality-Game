// ============================================================
//  collision.js — stable avatar movement against classed obstacles
//  A single circle (capsule footprint) is resolved against box and
//  circle colliders. Movement is sub-stepped and penetration is
//  pushed out along the surface normal, which produces natural
//  sliding instead of snagging or jittering.
// ============================================================

import { SIM } from '../config.js';

const EPS = 1e-6;

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

/** Push a circle out of one collider; returns a small delta or null. */
function resolveOne(px, pz, c, r) {
  if (c.type === 'circle') {
    const dx = px - c.x;
    const dz = pz - c.z;
    const min = c.r + r;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) return null;
    const d = Math.sqrt(d2) || EPS;
    const push = min - d;
    return { x: (dx / d) * push, z: (dz / d) * push };
  }
  // Axis-aligned box: closest point on the box to the circle centre.
  const cx = clamp(px, c.minX, c.maxX);
  const cz = clamp(pz, c.minZ, c.maxZ);
  let dx = px - cx;
  let dz = pz - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 > r * r) return null;
  if (d2 > EPS) {
    const d = Math.sqrt(d2);
    const push = r - d;
    return { x: (dx / d) * push, z: (dz / d) * push };
  }
  // Centre is inside the box — eject via the nearest face.
  const dl = px - c.minX;
  const dr = c.maxX - px;
  const dbl = pz - c.minZ;
  const dt = c.maxZ - pz;
  const m = Math.min(dl, dr, dbl, dt);
  if (m === dl) return { x: -(dl + r), z: 0 };
  if (m === dr) return { x: dr + r, z: 0 };
  if (m === dbl) return { x: 0, z: -(dbl + r) };
  return { x: 0, z: dt + r };
}

/** Resolve all penetrations for a point against a blocker list. */
export function resolvePenetration(px, pz, blockers, r, iterations = 4) {
  let x = px;
  let z = pz;
  for (let i = 0; i < iterations; i++) {
    let moved = false;
    for (const c of blockers) {
      const d = resolveOne(x, z, c, r);
      if (d) {
        x += d.x;
        z += d.z;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return { x, z };
}

/**
 * Move from (cx,cz) by (dx,dz), sub-stepping so we never tunnel through
 * a wall on a fast frame. Returns the resolved position.
 */
export function stepMove(cx, cz, dx, dz, blockers, r, bounds) {
  const dist = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(dist / SIM.substep));
  let x = cx;
  let z = cz;
  for (let i = 0; i < steps; i++) {
    x += dx / steps;
    z += dz / steps;
    ({ x, z } = resolvePenetration(x, z, blockers, r));
    if (bounds) {
      x = clamp(x, bounds.minX + r, bounds.maxX - r);
      z = clamp(z, bounds.minZ + r, bounds.maxZ - r);
    }
  }
  return { x, z };
}

/** True if a point is inside any blocker (used for spawn safety checks). */
export function isBlocked(px, pz, blockers, r) {
  for (const c of blockers) {
    if (resolveOne(px, pz, c, r)) return true;
  }
  return false;
}

/** Convenience builder for a box collider centred at (cx,cz). */
export function box(cx, cz, sx, sz, meta = {}) {
  return { type: 'box', minX: cx - sx / 2, maxX: cx + sx / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2, ...meta };
}

/** Convenience builder for a circular collider. */
export function disc(cx, cz, radius, meta = {}) {
  return { type: 'circle', x: cx, z: cz, r: radius, ...meta };
}
