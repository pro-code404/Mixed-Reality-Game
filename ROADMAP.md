# Roadmap

The build is intentionally structured so each item below is an additive change behind an
existing seam — a new file under `src/world/`, a new `case` in `main.js`, or a new entry
in `config.js`. Nothing here is implemented yet unless stated.

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

- [ ] **More jackets / layers** and a hat category.
- [ ] **Walk-cycle variants** (idle fidget, jog) via the existing `animate()` hook.
- [ ] **Save / load appearance** to `localStorage` (device-only, nothing uploaded).

## Systems

- [ ] **Scene manager** to generalize the apartment↔outside transition to N scenes.
- [ ] **Save / load world state** (radio on/off, lamp, plant) per device.
- [ ] **Optional quality tiers** (shadow resolution, pixel ratio) auto-selected by device.

## Guardrails to preserve (non-negotiable)

- No real location, no GPS, no network calls, no accounts.
- Simulated events are never described as real or as happening at the player.
- If location sharing is ever added, it must be explicit, visible and revocable.
- Features are only documented as working after they have been verified on a target.
