# Mixed Reality Game

A stylized, **fully simulated** 3D lifestyle prototype — "Cloud Hue". You live in a
compact studio apartment that breathes with the time of day: sunrise warms the walls,
the window view shifts, lamps glow at night, and the front door opens onto a fictional
neighborhood you can walk around.

> **Everything here is fiction.** There is no GPS, no real location, no accounts, no
> network calls, and no data leaves your device. The clock reflects your device time
> for flavor only — it does not imply the game knows where you are.

## Run it

The game is plain ES modules — there is **no build step**.

Because it uses ES module `import`s, open it through a local web server (opening the
file directly with `file://` will be blocked by the browser):

```powershell
# any one of these, from the project root
npx serve .
# or
python -m http.server 8080
```

Then visit the printed `http://localhost:...` address. Three.js is loaded from a CDN
via an import map (`three@0.160.0`), so an internet connection is needed on first load.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | `W A S D` / arrow keys, or click the floor | on-screen joystick (or tap the floor) |
| Look | drag the screen | drag the screen |
| Sprint | hold `Shift` | — |
| Interact | `E` or `Space` | INTERACT button |
| Dress up | Dress Up button | Dress Up button |
| Reset apartment | Reset button | Reset button |
| Day / night | drag the clock slider | drag the clock slider |

## What this build adds

This is the *improved* build. Compared with the original single-file prototype it adds:

- **Distinct, tagged world objects.** Every important object is registered with a stable
  id and a movement class (`solid`, `walkaround`, `decor`, `interactive`) — e.g.
  `radio_01`, `nightstand_01`, `door_front_01`. Objects are individually inspectable
  rather than one merged mesh.
- **A rounded, human-like avatar** built from continuous curved forms (capsules and
  spheres) with joint pivots, instead of a box figure.
- **Body-shape presets** — Slim / Fit / Solid — plus stature and a bounded fine-tune
  slider. The body is rebuilt parametrically, so feet always meet the floor and
  clothing scales with the body (never a non-uniform squash of the whole rig).
- **Collision classification.** Walls and closed doors are `solid`; furniture, trees and
  benches are `walkaround` (you slide past them); flowers and small props are `decor`
  and never block you. Movement is sub-stepped with penetration push-out, giving natural
  sliding instead of snagging.
- **A front door that opens outside.** Walk to the door and choose *Go Outside* to enter
  a separate, lazily-built fictional neighborhood (buildings, fountain, park, café, shop,
  trees, flowers, benches, lamp posts). A *Return Home* control brings you back.
- **Dress-up editor** for skin, hair style/color, eyes, brows, tops, bottoms and shoes,
  with non-destructive Apply / Cancel / Reset.

## What it deliberately is not

- Not a real place, not a map, not a tracker. Nothing is real-world accurate.
- Not a networked game. There is no backend.
- Not finished. See `ROADMAP.md` for the seam-list of what comes next.

## Project layout

```
index.html            entry point (import map + HUD markup)
styles.css            UI + HUD styling
src/
  config.js           scale, rooms, avatar tunables — the single source of truth
  main.js             orchestrator: renderer, loop, scene transitions, wiring
  core/
    registry.js       World entity registry + movement classes (KIND)
    collision.js      circle-vs-box/circle resolution + sub-stepped stepMove
    clock.js          world clock + day/night palette (skyState)
    audio.js          WebAudio ambience + radio
    input.js          keyboard, drag-look, click-to-move, joystick
    rng.js            small deterministic RNG for scenery
  avatar/
    presets.js        appearance data + body-shape presets
    avatar.js         parametric rounded avatar
  world/
    materials.js      shared materials
    props.js          tagged scenery factories (trees, flowers, benches, lamps, buildings)
    apartment.js      the studio apartment build + interactables
    exterior.js       layered window view (skyline, rooftops, courtyard)
    outside.js        the fictional neighborhood scene
  ui/
    hud.js            time / location / interact / controls
    dressup.js        avatar editor
    toast.js          transient messages
```

## Extending it

`config.js`, the `World` registry, and the `SCENE` keys are the main seams. Adding a room
means adding a builder under `src/world/` that registers tagged entities and returning
`{ group, lights, spawn, bounds, meta }`, mirroring `apartment.js`. Adding an interaction
means adding an entity with an `interact: { action, label, at, radius }` and a matching
`case` in `main.js`.

## Honesty notes (kept from the original brief)

- Features are only described as working once they have been run on a target browser.
- Simulated events are never described as if they were real or occurred at the player.
- Any future location sharing must be explicit, visible and revocable. None exists today.
