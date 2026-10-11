// ============================================================
//  config.js — single source of truth for scale, rooms, avatar
//  Keeping all tunables here makes future expansion cheap.
// ============================================================

// Shared scale reference (metres). Every asset is sized from this
// so nothing floats, sinks, or mismatches the doorway.
export const SCALE = {
  doorHeight: 2.1,
  counterHeight: 0.92,
  bedHeight: 0.55,
  chairSeat: 0.46,
  avatarHeight: 1.75,
};

export const ROOM = { w: 11, d: 8.5, h: 3.0 };
export const OUTSIDE = { w: 30, d: 26 };

export const AVATAR = {
  radius: 0.34, // collision capsule radius (kept stable across body shapes)
  speed: 3.2,
  sprint: 4.8,
  turnLerp: 14, // rotation smoothing
  maxStepHint: (1 / 60) * 4.8,
};

export const SIM = {
  // Movement is sub-stepped so fast frame-rate changes never tunnel.
  substep: 0.18,
  // How much the reduced-motion toggle damps ambient animation.
  ambientMotionScale: 1.0,
};

// Scene keys used by the World registry.
export const SCENE = {
  APARTMENT: 'apartment',
  OUTSIDE: 'outside',
};
