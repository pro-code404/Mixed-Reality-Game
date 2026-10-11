// ============================================================
//  hud.js — heads-up display wiring
//  Keeps the existing controls the owner likes (look/clock/sound/
//  motion/reset) and adds scene + interact readouts.
// ============================================================

export class Hud {
  constructor() {
    this.el = {
      hud: document.getElementById('hud'),
      timeReadout: document.getElementById('timeReadout'),
      timePhase: document.getElementById('timePhase'),
      placeName: document.getElementById('placeName'),
      clockSlider: document.getElementById('clockSlider'),
      clockAuto: document.getElementById('clockAuto'),
      interactPrompt: document.getElementById('interactPrompt'),
      interactLabel: document.getElementById('interactLabel'),
      interactBtn: document.getElementById('interactBtn'),
      joystick: document.getElementById('joystick'),
      joyKnob: document.getElementById('joyKnob'),
      dressupBtn: document.getElementById('dressupBtn'),
      resetBtn: document.getElementById('resetBtn'),
      muteBtn: document.getElementById('muteBtn'),
      motionBtn: document.getElementById('motionBtn'),
      homeBtn: document.getElementById('homeBtn'),
    };
  }

  show() { this.el.hud.classList.remove('hidden'); }
  setPlace(name) { if (this.el.placeName) this.el.placeName.textContent = name; }

  setTime(hour, phase) {
    const hh = String(Math.floor(hour)).padStart(2, '0');
    const mm = String(Math.floor((hour % 1) * 60)).padStart(2, '0');
    this.el.timeReadout.textContent = `${hh}:${mm}`;
    this.el.timePhase.textContent = phase;
  }

  setInteract(label) {
    if (label) {
      this.el.interactLabel.textContent = label;
      this.el.interactPrompt.classList.remove('hidden');
    } else {
      this.el.interactPrompt.classList.add('hidden');
    }
  }

  setHomeVisible(v) {
    if (this.el.homeBtn) this.el.homeBtn.classList.toggle('hidden', !v);
  }

  showTouch(touch) {
    if (touch) {
      this.el.joystick.classList.add('show');
      this.el.interactBtn.classList.add('show');
    }
  }

  onClockInput(cb) { this.el.clockSlider.addEventListener('input', (e) => cb(parseFloat(e.target.value))); }
  onClockAuto(cb) { this.el.clockAuto.addEventListener('click', () => cb()); }
  onDressUp(cb) { this.el.dressupBtn.addEventListener('click', cb); }
  onReset(cb) { this.el.resetBtn.addEventListener('click', cb); }
  onMute(cb) { this.el.muteBtn.addEventListener('click', cb); }
  onMotion(cb) { this.el.motionBtn.addEventListener('click', cb); }
  onHome(cb) { if (this.el.homeBtn) this.el.homeBtn.addEventListener('click', cb); }
  onInteract(cb) { this.el.interactBtn.addEventListener('click', cb); }

  setMuted(muted) {
    this.el.muteBtn.textContent = muted ? '🔇 Muted' : '🔊 Sound';
    this.el.muteBtn.classList.toggle('active', muted);
  }
  setMotion(reduced) {
    this.el.motionBtn.classList.toggle('active', reduced);
  }
  setClockAuto(on) {
    this.el.clockAuto.classList.toggle('active', on);
  }
}
