// ============================================================
//  clock.js — world clock + day/night palette
//  The clock reads the device time (or an injected test time) and
//  maps it to a readable lighting state. Nothing about the clock
//  implies real-world location or weather.
// ============================================================

import * as THREE from 'three';

export const DAY = {
  night: { sky: 0x141a2e, sun: 0x3a4470, hemi: 0x3a4a70, sunI: 0.20, hemiI: 0.45, skyTop: 0x1a2244, skyBot: 0x2a2040 },
  dawn:  { sky: 0xffb27a, sun: 0xff9a55, hemi: 0xc9a07a, sunI: 0.70, hemiI: 0.60, skyTop: 0xff9a6a, skyBot: 0xffd0a0 },
  day:   { sky: 0x9ec9ff, sun: 0xffffff, hemi: 0x9fb8e0, sunI: 1.40, hemiI: 0.78, skyTop: 0x6fb5ff, skyBot: 0xcfe6ff },
  dusk:  { sky: 0xff8a5a, sun: 0xff7a4a, hemi: 0xb06a5a, sunI: 0.90, hemiI: 0.60, skyTop: 0xff7a4a, skyBot: 0xffb070 },
};

export function hourToPhase(h) {
  if (h < 5) return { a: 'night', b: 'night', t: 0 };
  if (h < 7) return { a: 'night', b: 'dawn', t: (h - 5) / 2 };
  if (h < 9) return { a: 'dawn', b: 'day', t: (h - 7) / 2 };
  if (h < 17) return { a: 'day', b: 'day', t: 0 };
  if (h < 19) return { a: 'day', b: 'dusk', t: (h - 17) / 2 };
  if (h < 21) return { a: 'dusk', b: 'night', t: (h - 19) / 2 };
  return { a: 'night', b: 'night', t: 0 };
}

export function phaseName(h) {
  if (h < 5) return 'Deep Night';
  if (h < 7) return 'Dawn';
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  if (h < 19) return 'Sunset';
  if (h < 21) return 'Dusk';
  return 'Night';
}

function mixHex(a, b, t) {
  const ca = new THREE.Color(a);
  ca.lerp(new THREE.Color(b), t);
  return ca;
}

/** Resolve an hour into concrete colours + intensities. */
export function skyState(h) {
  const p = hourToPhase(h);
  const A = DAY[p.a];
  const B = DAY[p.b];
  const t = p.t;
  const isNight = h < 6.5 || h > 19.5;
  return {
    sky: mixHex(A.sky, B.sky, t),
    sun: mixHex(A.sun, B.sun, t),
    sunI: THREE.MathUtils.lerp(A.sunI, B.sunI, t),
    hemi: mixHex(A.hemi, B.hemi, t),
    hemiI: THREE.MathUtils.lerp(A.hemiI, B.hemiI, t),
    skyTop: mixHex(A.skyTop, B.skyTop, t),
    skyBot: mixHex(A.skyBot, B.skyBot, t),
    isNight,
    exposure: isNight ? 1.35 : 1.05,
  };
}

export class WorldClock {
  constructor(hour = 8) {
    this.hour = hour;
    this.auto = true;
    this.testHour = hour;
  }

  update() {
    if (this.auto) {
      const now = new Date();
      this.hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    } else {
      this.hour = this.testHour;
    }
    return this.hour;
  }

  setTestHour(h) {
    this.testHour = h;
    this.auto = false;
  }
}
