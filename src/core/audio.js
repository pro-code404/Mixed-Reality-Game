// ============================================================
//  audio.js — tiny local audio (radio pad + UI blips)
//  All sound is generated in-browser; no external assets, no
//  licensing concerns, and it is muted by default until the
//  player opts in.
// ============================================================

export class AudioBus {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.radio = null;
    this.volume = 0.05;
  }

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  setMuted(m) {
    this.muted = m;
    if (this.radio) this.radio.gain.gain.value = m ? 0 : this.volume;
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  startRadio() {
    this.ensure();
    if (!this.ctx || this.radio) return;
    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.value = this.muted ? 0 : this.volume;
    gain.connect(this.ctx.destination);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 220;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 329.63;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.3;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain).connect(gain.gain);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    osc1.start(now);
    osc2.start(now);
    lfo.start(now);
    this.radio = { osc1, osc2, lfo, gain, filter };
  }

  stopRadio() {
    if (!this.radio || !this.ctx) return;
    const now = this.ctx.currentTime;
    const r = this.radio;
    r.gain.gain.setTargetAtTime(0, now, 0.2);
    setTimeout(() => {
      try { r.osc1.stop(); r.osc2.stop(); r.lfo.stop(); } catch (e) {}
    }, 600);
    this.radio = null;
  }

  blip(freq = 660, dur = 0.18) {
    this.ensure();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.1, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }
}
