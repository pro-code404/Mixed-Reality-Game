// ============================================================
//  dressup.js — the avatar editor (§9: customization interface)
//  Purely a view: it reads the catalog for choices and hands
//  validated configs back through callbacks. It contains no rules
//  about what fits what — schema.js owns that.
// ============================================================

import {
  BODY_TYPES, SKIN_TONES, HAIR_COLORS, TOP_COLORS, BOTTOM_COLORS,
  SHOE_COLORS, GLASSES_COLORS, itemsFor, getBodyType,
} from '../avatar/catalog.js';
import { validateConfig, switchBodyType, defaultConfig } from '../avatar/schema.js';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export class DressUp {
  constructor({ getConfig, onPreview, onApply, onCancel }) {
    this.getConfig = getConfig;
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
      this.draft = defaultConfig(this.draft.body_type);
      this._commit();
    });
  }

  open() {
    this.draft = validateConfig(this.getConfig()).config;
    this._build();
    this.overlay.classList.remove('hidden');
    this.isOpen = true;
  }

  close() {
    this.overlay.classList.add('hidden');
    this.isOpen = false;
  }

  apply() { this.onApply(validateConfig(this.draft).config); this.close(); }
  cancel() { this.onCancel(); this.close(); }

  /** Push the draft to state + preview, then rebuild the view. */
  _commit(preview = true) {
    this.draft = validateConfig(this.draft).config;
    if (preview) this.onPreview(this.draft);
    this._build();
  }

  _setMorph(key, value) { this.draft.body_morphs[key] = value; this._commit(); }
  _setOut(key, value) { this.draft.outfit[key] = value; this._commit(); }
  _setApp(key, value) { this.draft.appearance[key] = value; this._commit(); }

  _row(label, note) {
    const wrap = document.createElement('div');
    wrap.className = 'cat-row';
    const head = document.createElement('div');
    head.className = 'cat-label';
    head.textContent = label;
    wrap.appendChild(head);
    if (note) {
      const n = document.createElement('div');
      n.className = 'cat-note';
      n.textContent = note;
      wrap.appendChild(n);
    }
    this.body.appendChild(wrap);
    return wrap;
  }

  _swatches(label, colors, currentId, onPick) {
    const wrap = this._row(label);
    const row = document.createElement('div');
    row.className = 'swatches';
    for (const c of colors) {
      const b = document.createElement('button');
      b.className = 'swatch' + (currentId === c.id ? ' selected' : '');
      b.style.background = hex(c.color);
      b.title = c.name;
      b.addEventListener('click', () => onPick(c.id));
      row.appendChild(b);
    }
    wrap.appendChild(row);
  }

  _options(label, items, currentId, onPick, note) {
    const wrap = this._row(label, note);
    const row = document.createElement('div');
    row.className = 'options';
    for (const it of items) {
      const b = document.createElement('button');
      b.className = 'opt-btn' + (currentId === it.id ? ' selected' : '');
      b.textContent = it.name || it.label || it.id;
      b.addEventListener('click', () => onPick(it.id));
      row.appendChild(b);
    }
    wrap.appendChild(row);
  }

  _slider(label, key, current, onInput, note) {
    const def = getBodyType(this.draft.body_type).morphs.find((m) => m.key === key);
    const min = def.min;
    const max = def.max;
    const wrap = this._row(label, note);
    const row = document.createElement('div');
    row.className = 'slider-row';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = '0.01';
    input.value = String(current);
    const val = document.createElement('span');
    val.className = 'slider-val';
    val.textContent = `${Math.round(current * 100)}%`;
    input.addEventListener('input', () => {
      const v = Number(input.value);
      val.textContent = `${Math.round(v * 100)}%`;
      onInput(v);
    });
    row.appendChild(input);
    row.appendChild(val);
    wrap.appendChild(row);
  }

  _build() {
    this.body.innerHTML = '';
    const cfg = this.draft;
    const bt = getBodyType(cfg.body_type);

    // ---------- Character ----------
    this._options('Character', Object.values(BODY_TYPES), cfg.body_type, (id) => {
      this.draft = switchBodyType(this.draft, id);
      this._commit();
    });

    // ---------- Body shape (morphs) ----------
    const groupLabel = { proportions: 'Proportions', torso: 'Torso', limbs: 'Limbs', surface: 'Surface' };
    const groups = [];
    for (const m of bt.morphs) if (!groups.includes(m.group)) groups.push(m.group);
    for (const g of groups) {
      for (const m of bt.morphs.filter((x) => x.group === g)) {
        if (m.supported === false) {
          this._row(`${groupLabel[g]} · ${m.label}`, 'Not available yet — coming in a later update.');
        } else {
          this._slider(`${groupLabel[g]} · ${m.label}`, m.key, cfg.body_morphs[m.key], (v) => this._setMorph(m.key, v));
        }
      }
    }

    // ---------- Appearance ----------
    this._swatches('Skin tone', SKIN_TONES, cfg.appearance.skin_tone_id, (id) => this._setApp('skin_tone_id', id));
    this._options('Hair style', itemsFor('hair', cfg.body_type), cfg.appearance.hair_id, (id) => this._setApp('hair_id', id));
    this._swatches('Hair colour', HAIR_COLORS, cfg.appearance.hair_color_id, (id) => this._setApp('hair_color_id', id));
    this._options('Face', itemsFor('face', cfg.body_type), cfg.appearance.face_style_id, (id) => this._setApp('face_style_id', id));

    // ---------- Outfit ----------
    this._options('Top', itemsFor('top', cfg.body_type), cfg.outfit.top_id, (id) => this._setOut('top_id', id));
    this._swatches('Top colour', TOP_COLORS, cfg.outfit.top_color_id, (id) => this._setOut('top_color_id', id));
    this._options('Bottom', itemsFor('bottom', cfg.body_type), cfg.outfit.bottom_id, (id) => this._setOut('bottom_id', id));
    this._swatches('Bottom colour', BOTTOM_COLORS, cfg.outfit.bottom_color_id, (id) => this._setOut('bottom_color_id', id));
    this._options('Footwear', itemsFor('footwear', cfg.body_type), cfg.outfit.footwear_id, (id) => this._setOut('footwear_id', id));
    this._swatches('Shoe colour', SHOE_COLORS, cfg.outfit.shoe_color_id, (id) => this._setOut('shoe_color_id', id));

    // ---------- Accessories ----------
    this._options('Glasses', itemsFor('glasses', cfg.body_type), cfg.outfit.glasses_id, (id) => this._setOut('glasses_id', id));
    this._swatches('Glasses colour', GLASSES_COLORS, cfg.outfit.glasses_color_id, (id) => this._setOut('glasses_color_id', id));
  }
}
