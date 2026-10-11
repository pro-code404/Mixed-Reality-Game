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
- **Distinct male and female base characters** in one shared art style, rebuilt
  parametrically from continuous curved forms (capsules and spheres) with joint pivots.
  Never a non-uniform squash of a whole rig: the body is constructed to the chosen
  proportions so feet always meet the floor and clothing fits the body.
- **A versioned character configuration** (`schema_version: 1`). A character is a body
  type, a set of clamped morph values, appearance ids and an equipped outfit — all
  resolved through a validated asset catalog (`src/avatar/catalog.js`). No asset paths or
  material details are ever stored as player data, so assets can be added or swapped
  without touching saved characters.
- **Continuous body customisation** — shoulder width, torso proportions and length, chest
  bulk, waist, hips, thigh volume, bust, arm thickness, height and a muscle-detail
  parameter. Every value has a defined range and is clamped; invalid or hostile input is
  corrected rather than trusted. A tattoo-opacity control exists in the schema but is
  clearly marked *not available yet*.
- **Curated wardrobe in the same style** — tops (tee, long-sleeve, hoodie, vest, fitted,
  crop), bottoms (trousers, shorts, cargo, skirt), footwear (sneakers, boots), eight skin
  tones, gender-appropriate hairstyles and faces, plus glasses attached to the head so
  they follow the body. Each garment declares which body types it is authored for, so an
  incompatible outfit can never be loaded.
- **Dress-up editor** with Character selection, body-morph sliders, skin/hair/face and a
  full outfit picker. Apply / Cancel / Reset are non-destructive, and Apply saves the look
  to this device (`localStorage`) so it is restored next time.
- **Collision classification.** Walls and closed doors are `solid`; furniture, trees and
  benches are `walkaround` (you slide past them); flowers and small props are `decor`
  and never block you. Movement is sub-stepped with penetration push-out, giving natural
  sliding instead of snagging.
- **A front door that opens outside.** Walk to the door and choose *Go Outside* to enter
  a separate, lazily-built fictional neighborhood (buildings, fountain, park, café, shop,
  trees, flowers, benches, lamp posts). A *Return Home* control brings you back.

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
    catalog.js        validated asset catalog (body types, morph ranges, hair, faces,
                      clothing, colours) — the only source of player-facing choices
    schema.js         versioned config: defaults, validate/clamp, migrate, local save
    characters.js     body definition: proportions + morph rules (pure maths, no meshes)
    avatar.js         the renderer: builds body, clothing, hair, face, accessories
    lod.js            level-of-detail seam (three tiers; runtime LOD is Stage D)
    net.js            compact, validated multiplayer representation (Stage E seam)
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

## Avatar system — what's built and what is not

The avatar work follows an incremental plan (Stage A → E). This build completes **Stage A**
(playable apartment, avatar, camera, movement, collision, mobile input) and **Stage B**
(one male and one female base character in a shared style, skin tones, a curated set of
hairstyles and outfits, a working wardrobe with accessories, and the versioned character
configuration).

Implemented and machine-verified:

- Two base body types with distinct silhouettes, faces and hair.
- Continuous morph customisation with defined ranges and clamping.
- Skin-tone, hair, face, top, bottom, footwear and glasses selection.
- Validation that rejects wrong-gender hair and body-incompatible garments.
- Local save/restore of the whole configuration.
- Attachment of accessories to skeleton groups (glasses follow the head).
- A compact, validated multiplayer representation (`net.js`) — **format only**:
  encoding/decoding and the trust boundary are done, networking is not.

Deliberately **not** done yet (kept behind explicit seams, per the brief's "do not build
the entire platform first"):

- **Stage C — tattoos and a larger wardrobe.** Tattoo opacity is in the schema but marked
  unsupported; there is no tattoo texture pipeline yet.
- **Stage D — runtime LOD and a low-poly distant character.** `lod.js` names the tiers and
  `setDetail('low')` hides accessory detail, but geometry is not yet swapped by distance,
  and there is no separate ~800–1,200-tri "simplified" character.
- **Stage E — networking.** No connection is opened anywhere in the game.

## Measured geometry

Measured from the shipped `src/avatar/avatar.js` under Node (segment counts, not estimates),
compared against the brief's §7 initial targets:

| Character | Body + clothing | Hair | Accessories |
| --- | ---: | ---: | ---: |
| Female base, most detailed hair | 3,804 | 1,088 (voluminous curls) | 0 |
| Male base, default hair | 3,764 | 540 (wavy centre-part) | 0 |

- §7 **base body** target ~2,500–4,000 tris → **met** (3,764–3,804).
- §7 **hair + accessories** target ~1,500 extra → **met** (540–1,088; glasses add ~380).
- Full character totals (clothing + hair + glasses) land at roughly **4,300–5,300 tris**.
- Textures: none. Everything is flat-colour procedural geometry, so there are no texture
  atlases to report and no per-character texture cost. Normal maps and tattoo textures are
  Stage C.
- Not yet met: the ~500-tri distant-body target and the ~800–1,200-tri simplified
  character — these belong to Stage D and are honestly marked as not implemented.

## Honesty notes (kept from the original brief)

- Features are only described as working once they have been run on a target browser.
- Simulated events are never described as if they were real or occurred at the player.
- Any future location sharing must be explicit, visible and revocable. None exists today.
