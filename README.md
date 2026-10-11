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
- **Distinct male and female base characters** in one shared art style, built to match the
  supplied art direction: a **Minecraft-inspired, voxel-influenced** construction with an
  oversized geometric head, sculpted blocky hair, a small anime-style face, a stylized
  feminine silhouette and modelled clothing. The body is built from chunky geometric blocks
  with soft bevels to the chosen proportions, so feet always meet the floor and clothing
  fits the body.
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
- **Curated wardrobe in the same style** — tops, an **outerwear layer** (jackets, a long
  coat), bottoms (trousers, shorts, leggings, a pleated skirt), footwear (sneakers, boots),
  eight skin tones, gender-appropriate blocky hairstyles and faces, **headwear** (a
  fictional uniform cap, a hair flower), plus glasses attached to the head so they follow
  the body. Each garment declares which body types it is authored for, so an incompatible
  outfit can never be loaded.
- **Coordinated outfit presets** built from the design references — a white-and-red uniform,
  a gothic look, and a black-and-white street look — each just a set of catalog ids, so
  presets stay data rather than code.
- **Dress-up editor** with Character selection, body-morph sliders, skin/hair/face, an
  outfit-preset row and a full piece picker (top, outerwear, bottom, footwear, glasses,
  headwear). Apply / Cancel / Reset are non-destructive, and Apply saves the look to this
  device (`localStorage`) so it is restored next time.
- **Collision classification.** Walls and closed doors are `solid`; furniture, trees and
  benches are `walkaround` (you slide past them); flowers and small props are `decor`
  and never block you. Movement is sub-stepped with penetration push-out, giving natural
  sliding instead of snagging.
- **A front door that opens outside.** Walk to the door and choose *Go Outside* to enter
  a separate, lazily-built fictional neighborhood (buildings, fountain, park, café, shop,
  trees, flowers, benches, lamp posts). A *Return Home* control brings you back.

## Character art direction

The characters follow the voxel-influenced style brief: an oversized, softly-beveled
geometric head with a broad forehead and simplified jaw; small anime-inspired eyes with
lashes and brows on the front face; hair sculpted from chunky, layered geometric sections
(not a smooth helmet); a stylized feminine silhouette built from tapered blocks with a
defined waist and widened hips; and clothing modelled as separate garments with sleeves,
collars, belts, cuffs, hems and trims.

### Validation sheet

Because this is an art-direction judgement, there is a separate sheet that renders the three
reference-inspired looks (white-and-red uniform, gothic, black-and-white street) from the
**front, three-quarter and side**, switchable between **neutral studio, warm interior and
night** lighting:

- Local: open `gallery.html` through the same local web server.
- The sheet has a *Save PNG* button so a frame can be shared for review.

This page is a review aid, not part of the playable apartment.

## What it deliberately is not

- Not a real place, not a map, not a tracker. Nothing is real-world accurate.
- Not a networked game. There is no backend.
- Not finished. See `ROADMAP.md` for the seam-list of what comes next.

## Project layout

```
index.html            entry point (import map + HUD markup)
gallery.html          character style validation sheet (§12) — review aid, not the game
styles.css            UI + HUD styling
src/
  config.js           scale, rooms, avatar tunables — the single source of truth
  main.js             orchestrator: renderer, loop, scene transitions, wiring
  gallery.js          renders the three reference looks for review
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
(playable apartment, avatar, camera, movement, collision, mobile input) and **Stage B**, now
rebuilt to the voxel-influenced art direction: one male and one female base character in a
shared style, eight skin tones, blocky hairstyles and faces, a wardrobe with an outerwear
layer and headwear, coordinated reference-look presets, and the versioned character
configuration. The style is reviewed on `gallery.html` (§12), not just described.

Implemented and machine-verified:

- Two base body types with distinct silhouettes, faces and blocky hair, in one shared
  voxel-influenced style.
- The three reference-inspired looks from the brief (uniform, gothic, street) as coordinated
  presets, using real outerwear and headwear layers.
- Continuous morph customisation with defined ranges and clamping.
- Skin-tone, hair, face, top, outerwear, bottom, footwear, glasses and headwear selection.
- Validation that rejects wrong-gender hair and body-incompatible garments.
- Local save/restore of the whole configuration.
- Attachment of accessories to skeleton groups (glasses and headwear follow the head).
- A compact, validated multiplayer representation (`net.js`) — **format only**:
  encoding/decoding and the trust boundary are done, networking is not.

Deliberately **not** done yet (kept behind explicit seams, per the brief's "do not build
the entire platform first"):

- **Stage C — tattoos and a larger wardrobe.** Tattoo opacity is in the schema but marked
  *not available yet*; there are no tattoo textures. The wardrobe holds the three reference
  looks plus a few basics, not a large catalogue.
- **Stage D — geometry LOD.** The LOD seam and a detail toggle exist, but distance-based mesh
  swapping and the ~500-tri distant body / ~800–1,200-tri simplified character are **not**
  implemented. Current counts are already low, so this is not yet justified by profiling.
- **Stage E — networking.** No connection is opened anywhere in the game.

## Measured geometry

Measured from the shipped `src/avatar/avatar.js` under Node, counting real triangles:

| Character | Body + clothing | Hair | Accessories | Total |
| --- | ---: | ---: | ---: | ---: |
| Female — white & red uniform | 1,164 | 96 | 100 | **1,360** |
| Female — gothic | 968 | 96 | 544 | **1,608** |
| Female — black & white street | 1,200 | 108 | 72 | **1,380** |
| Female default | 1,072 | 96 | 76 | **1,244** |
| Male default | 964 | 72 | 0 | **1,036** |

- §7 **base body** budget (~2,500–4,000 tris) is a ceiling, not a target to hit. The blocky
  style lands well under it (≈1,000–1,200 for body + clothing); silhouette is prioritised
  over count, and counts are only reported as measured.
- Every look above is between roughly **1,036 and 1,608 tris** including hair and accessories.
- Textures: none. Everything is flat-colour procedural geometry, so there are no texture
  atlases and no per-character texture cost.
- Not yet met: the ~500-tri distant-body and ~800–1,200-tri simplified-character targets —
  Stage D, honestly marked as not implemented.

## Honesty notes (kept from the original brief)

- Features are only described as working once they have been run on a target browser.
- Simulated events are never described as if they were real or occurred at the player.
- Any future location sharing must be explicit, visible and revocable. None exists today.
