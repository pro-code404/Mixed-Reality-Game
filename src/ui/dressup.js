// ============================================================
//  dressup.js — the avatar editor
//  Categories: body shape, stature, build adjust, skin, hair,
//  eyes, brows, tops, bottoms, shoes. Apply / Cancel / Reset are
//  non-destructive: Cancel restores the last saved appearance.
//  Original identity — Snapchat/Bitmoji are not referenced or copied.
// ============================================================

import {
  SKIN_TONES, HAIR_COLORS, EYE_COLORS, TOP_COLORS, BOTTOM_COLORS, SHOE_COLORS,
  HAIR_SHAPES, BODY_CHOICES, DEFAULT_APPEARANCE,
} from '../avatar/presets.js';

export class DressUp {
  constructor({ getAppearance, onPreview, onApply, onCancel }) {
    this.getAppearance = getAppearance;
    this.onPreview = onPreview;
    this.onApply = onApply;
    this.onCancel = onCancel;
    this.overlay = document.getElementById('dressupOverlay');
    this.body = document.getElementById('dressupBody');
    this.draft = null;

    document.getElementById('dressupClose').addEventListener('click', () => this.cancel());
    document.getElementById('dressupCancel').addEventListener('click', () => this.cancel());
    document.getElementById('dressupApply').addEventListener('click', () => this.apply());
    document.getElementById('dressupReset').addEventListener('click', () => {
      this.draft = { ...DEFAULT_APPEARANCE };
      this.onPreview(this.draft);
      this._build();
    });
  }

  open() {
    this.draft = { ...this.getAppearance() };
    this._build();
    this.overlay.classList.remove('hidden');
    this.isOpen = true;
  }

  close() {
    this.overlay.classList.add('hidden');
    this.isOpen = false;
  }

  apply() {
    this.onApply({ ...this.draft });
    this.close();
  }

  cancel() {
    this.onCancel();
    this.close();
  }

  _set(key, value) {
    this.draft[key] = value;
    this.onPreview({ ...this.draft });
    this._build();
  }

  _row(label) {
    const wrap = document.createElement('div');
    wrap.className = 'cat-row';
    const head = document.createElement('div');
    head.className = 'cat-label';
    head.textContent = label;
    wrap.appendChild(head);
    this.body.appendChild(wrap);
    return wrap;
  }

  _swatches(label, colors, key) {
    const wrap = this._row(label);
    const row = document.createElement('div');
    row.className = 'swatches';
    for (const c of colors) {
      const b = document.createElement('button');
      b.className = 'swatch' + (this.draft[key] === c ? ' selected' : '');
      b.style.background = '#' + c.toString(16).padStart(6, '0');
      b.title = '#' + c.toString(16).padStart(6, '0');
      b.addEventListener('click', () => this._set(key, c));
      row.appendChild(b);
    }
    wrap.appendChild(row);
  }

  _options(label, options, key) {
    const wrap = this._row(label);
    const row = document.createElement('div');
    row.className = 'options';
    for (const opt of options) {
      const [value, text] = Array.isArray(opt) ? opt : [opt, opt];
      const b = document.createElement('button');
      b.className = 'opt-btn' + (this.draft[key] === value ? ' selected' : '');
      b.textContent = text;
      b.addEventListener('click', () => this._set(key, value));
      row.appendChild(b);
    }
    wrap.appendChild(row);
  }

  _slider(label, key, min, max, step, fmt) {
    const wrap = this._row(label);
    const row = document.createElement('div');
    row.className = 'slider-row';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min; input.max = max; input.step = step;
    input.value = this.draft[key];
    const out = document.createElement('span');
    out.className = 'slider-val';
    out.textContent = fmt ? fmt(this.draft[key]) : this.draft[key];
    input.addEventListener('input', () => {
      this.draft[key] = parseFloat(input.value);
      out.textContent = fmt ? fmt(this.draft[key]) : input.value;
      this.onPreview({ ...this.draft });
    });
    row.appendChild(input);
    row.appendChild(out);
    wrap.appendChild(row);
  }

  _build() {
    this.body.innerHTML = '';
    this._options('Body shape', BODY_CHOICES, 'build');
    this._slider('Stature', 'height', 0.9, 1.1, 0.01, (v) => `${Math.round(v * 100)}%`);
    this._slider('Build adjust', 'buildTweak', -1, 1, 0.05, (v) => (v > 0 ? `+${Math.round(v * 100)}%` : `${Math.round(v * 100)}%`));
    this._swatches('Skin', SKIN_TONES, 'skin');
    this._options('Hair style', HAIR_SHAPES, 'hairShape');
    this._swatches('Hair color', HAIR_COLORS, 'hairColor');
    this._swatches('Eyes', EYE_COLORS, 'eyeColor');
    this._swatches('Eyebrows', HAIR_COLORS, 'browColor');
    this._options('Top', [['T-shirt', 'T-shirt (short sleeve)'], ['Shirt', 'Shirt (long sleeve)']], 'top');
    this._swatches('Top color', TOP_COLORS, 'topColor');
    this._options('Bottoms', [['Trousers', 'Trousers'], ['Shorts', 'Shorts']], 'bottom');
    this._swatches('Bottom color', BOTTOM_COLORS, 'bottomColor');
    this._swatches('Shoes', SHOE_COLORS, 'shoeColor');
  }
}
