// ============================================================
//  rng.js — deterministic pseudo-random helpers
//  Used so scenery "modest variation" (scale/rotation) is stable
//  between reloads instead of reshuffling every frame.
// ============================================================

export function makeRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return function rng() {
    // Numerical Recipes LCG — small, fast, good enough for decor.
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function rand(rng, a, b) {
  return a + (b - a) * rng();
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}
