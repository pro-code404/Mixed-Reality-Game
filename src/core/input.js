// ============================================================
//  input.js — keyboard, drag-look, click-to-move, touch joystick
//  Direct control stays responsive; click-to-move is an optional
//  convenience on top of the same collision-sliding movement.
// ============================================================

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.lookAzimuth = 0;
    this.lookElevation = 0.35;
    this.moveTarget = null; // {x,z} from click-to-move
    this.joystick = { active: false, dx: 0, dy: 0 };
    this.enabled = true;
    this.onInteract = null;
    this.onClickWorld = null; // (clientX, clientY) => void

    this._drag = false;
    this._moved = false;
    this._lx = 0;
    this._ly = 0;
    this._dx0 = 0;
    this._dy0 = 0;

    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE' || e.code === 'Space') {
        if (this.onInteract) this.onInteract();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      this._drag = true;
      this._moved = false;
      this._lx = this._dx0 = e.clientX;
      this._ly = this._dy0 = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this._drag || !this.enabled) return;
      if (Math.hypot(e.clientX - this._dx0, e.clientY - this._dy0) > 4) this._moved = true;
      const dx = e.clientX - this._lx;
      const dy = e.clientY - this._ly;
      this._lx = e.clientX;
      this._ly = e.clientY;
      this.lookAzimuth -= dx * 0.005;
      this.lookElevation = Math.max(0.05, Math.min(1.0, this.lookElevation + dy * 0.004));
    });

    window.addEventListener('pointerup', (e) => {
      if (this._drag && !this._moved && this.enabled && this.onClickWorld) {
        this.onClickWorld(e.clientX, e.clientY);
      }
      this._drag = false;
    });
  }

  /** Movement intent in local camera space (x = strafe, z = forward-). */
  moveVector() {
    let mx = 0;
    let mz = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) mz -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) mz += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) mx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) mx += 1;
    if (this.joystick.active) {
      mx += this.joystick.dx;
      mz += this.joystick.dy;
    }
    return { mx, mz, usingKeys: mx !== 0 || mz !== 0 };
  }

  isTouch() {
    return matchMedia('(pointer: coarse)').matches;
  }
}
