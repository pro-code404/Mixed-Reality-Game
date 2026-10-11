// ============================================================
//  registry.js — the World entity registry
//  Every important object is registered with a stable id, a tag,
//  a movement class, an optional interaction, and optional
//  colliders. This is what makes objects "individually distinct
//  and inspectable" rather than one merged mass of geometry.
// ============================================================

import { SCENE } from '../config.js';

// Movement / interaction classes (from the improvement addendum).
export const KIND = {
  SOLID: 'solid',        // walls, closed doors, large furniture, buildings
  WALK: 'walkaround',    // chairs, tables, counters, trees, benches
  DECOR: 'decor',        // flowers, papers, tiny props — never block
  INTERACT: 'interactive', // may show a prompt; blocking is opt-in
};

export class World {
  constructor() {
    this.entities = [];
    this.byId = new Map();
    this._counters = new Map();
    this._listeners = [];
  }

  /** Generate a readable, stable tag such as `tree_oak_03`. */
  nextTag(prefix) {
    const n = (this._counters.get(prefix) || 0) + 1;
    this._counters.set(prefix, n);
    return `${prefix}_${String(n).padStart(2, '0')}`;
  }

  /**
   * Register an entity. Returns the entity so callers can keep a ref.
   * def: { id?, tagPrefix?, kind, object?, tags?, colliders?, interact?, meta?, scene? }
   */
  add(def) {
    const tagPrefix = def.tagPrefix || (def.kind === KIND.DECOR ? 'decor' : 'obj');
    const id = def.id || this.nextTag(tagPrefix);
    const entity = {
      id,
      kind: def.kind || KIND.DECOR,
      scene: def.scene || SCENE.APARTMENT,
      object: def.object || null,
      tags: def.tags ? [...def.tags] : [],
      colliders: def.colliders ? def.colliders.map((c) => ({ ...c })) : [],
      interact: def.interact || null,
      meta: def.meta || {},
    };
    this.entities.push(entity);
    this.byId.set(id, entity);
    for (const cb of this._listeners) cb('add', entity);
    return entity;
  }

  get(id) {
    return this.byId.get(id) || null;
  }

  query(predicate) {
    return this.entities.filter(predicate);
  }

  inScene(scene) {
    return this.entities.filter((e) => e.scene === scene);
  }

  /** Blocking colliders for a scene (solid + walk-around; decor excluded). */
  blockers(scene) {
    const out = [];
    for (const e of this.inScene(scene)) {
      const blocks = e.kind === KIND.SOLID || e.kind === KIND.WALK;
      if (!blocks) continue;
      for (const c of e.colliders) out.push({ ...c, entity: e });
    }
    return out;
  }

  interactables(scene) {
    return this.inScene(scene).filter((e) => e.interact);
  }

  onChange(cb) {
    this._listeners.push(cb);
  }

  /** Debug helper: a plain-text inventory of the world. */
  describe() {
    return this.entities
      .map((e) => `${e.scene.padEnd(9)} ${e.id.padEnd(22)} ${e.kind.padEnd(11)} tags=[${e.tags.join(',')}]`)
      .join('\n');
  }
}
