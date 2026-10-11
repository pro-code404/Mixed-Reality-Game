# Roadmap

The build is intentionally structured so each item below is an additive change behind an
existing seam — a new file under `src/world/`, a new `case` in `main.js`, a new entry in
`src/avatar/catalog.js`, or a new field in the character schema. Items are marked done only
once they have actually been run and verified.

## Avatar system (staged)

The avatar work follows the staged plan in the design brief. Current status:

- [x] **Stage A — playable foundation.** Apartment, avatar, camera, movement, collision,
      mobile input.
- [x] **Stage B — initial production avatar.** One male and one female base character in a
      shared style; skin tones; blocky hairstyles and faces; a wardrobe with an outerwear
      layer and headwear; glasses attached to the head; versioned character configuration
      with validation and local save.
- [x] **Stage B+ — reference art direction.** Rebuilt to the voxel-influenced style brief
      (oversized geometric head, sculpted block hair, small anime-style face, stylized
      feminine silhouette, modelled garments) with the three reference-inspired looks as
      coordinated presets, and a validation sheet (`gallery.html`) rendering them from three
      angles under three lighting setups (§12).
- [ ] **Stage C — customisation depth.** Tattoo textures and opacity; a larger wardrobe;
      more accessories (jewellery, bags, masks); compatibility testing across body extremes.
      *(The outerwear layer and a headwear category now exist; tattoo opacity is in the
      schema, marked unsupported.)*
- [ ] **Stage D — performance and scale.** Real three-tier geometry LOD (`lod.js` seams are
      in place); a ~800–1,200-tri simplified character for crowds; measured mobile
      frame-rate profiling. *(Not to be added before profiling shows it is useful — current
      counts are already ~1.0–1.6k tris per character.)*
- [ ] **Stage E — multiplayer readiness.** Networking. The compact representation and trust
      boundary in `src/avatar/net.js` are done; the transport is not.

## Near term (polish the current slice)

- [ ] **Living-room soft body.** Give the sofa cushions an interactive sit pose.
- [ ] **Bathroom interior.** The bathroom door currently only toasts; add a real second
      room behind it using the same builder contract as `apartment.js`.
- [ ] **Bedroom sleep.** Resting currently advances the clock; add a brief fade and a
      wake-at-window beat.
- [ ] **Radio tuning.** More stations and a visual dial response.
- [ ] **Footstep audio** tied to the walk cycle phase.
- [ ] **Accessibility pass.** Screen-reader labels on HUD buttons, a high-contrast mode,
      and a stronger reduced-motion profile.

## Neighborhood (expand the outside scene)

- [ ] **Enterable destinations.** Café / shop / park interiors, each its own scene.
- [ ] **Weather layer** (rain, snow) that tints the sky palette in `clock.js`.
- [ ] **More paths** connecting destinations, with traffic that stays purely fictional.
- [ ] **Day/night NPC routines** (purely scripted, clearly fictional).

## Avatar

- [x] **Outerwear + headwear categories** and the reference-look presets.
- [ ] **More garments** and a broader hat / accessory range (Stage C).
- [ ] **Walk-cycle variants** (idle fidget, jog) via the existing `animate()` hook.
- [x] **Save / load appearance** to `localStorage` (device-only, nothing uploaded).
- [ ] **Idle pose and gesture set** for the social animations in the brief (§8).

## Systems

- [ ] **Scene manager** to generalize the apartment↔outside transition to N scenes.
- [ ] **Save / load world state** (radio on/off, lamp, plant) per device.
- [ ] **Optional quality tiers** (shadow resolution, pixel ratio) auto-selected by device.

## Guardrails to preserve (non-negotiable)

- No real location, no GPS, no network calls, no accounts.
- Simulated events are never described as real or as happening at the player.
- If location sharing is ever added, it must be explicit, visible and revocable.
- Features are only documented as working after they have been verified on a target.
