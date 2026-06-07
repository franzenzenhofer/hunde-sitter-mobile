# Hunde-Sitter Mobile 🐕

A mobile-first 3D dog-sitting game that doubles as a **programmable
dog-training sandbox**. Walk an endless, biome-stitched world with Bello,
keep him happy — and *teach* him tricks by composing them from motor
primitives, then conditioning them to your cues.

**▶ Play live: <https://hundesitter.franzai.com/>** (installable PWA — works
offline once loaded)

---

## The four loops

Everything you can do is a **single always-visible action surface** — no menus
to open, no actions hidden behind a tap. The available commands light up; the
rest dim. Four loops interlock:

| Loop | You do | Bello does | You see |
|------|--------|-----------|---------|
| **Play** | Throw the ball | chases, carries, returns | the ball in the world |
| **Care** | Pet, Feed | needs settle | his mood |
| **Train** | **Cue** → *(behaviour)* → **Reward** | performs, then associates | what Bello *knows* |
| **Author** | **Teach** | a brand-new behaviour exists | a new trick chip |

They build on each other: *Author* mints new behaviours → *Train* turns a cue
into that behaviour → *Care* keeps Bello willing → *Play* is the ambient joy.

## Teaching a trick (e.g. a salto)

Tricks are **programs** assembled from motor primitives, so you can reach
genuinely new moves — not just re-order canned ones:

1. Tap **✏️ Teach**.
2. Add steps — e.g. **🦘 Jump** then **🤸 Salto** (or **Repeat ×2** for a double).
3. Name it (*"Backflip"*), optionally bind a cue (**👏 Clap**), **Test ▶**, **Save**.
4. The trick now has a chip on the dock — tap it and Bello somersaults.
5. To make it a *learned* cue: **👏 → Backflip → 👍 Good!** a few times. The
   clap→trick association grows in *what Bello knows* until the clap alone
   triggers it. That's the dog **trained**, not just scripted.

### Motor-primitive palette

`sit` · `spin` · `bark` · `paw` · `jump` · `salto` · `back-flip` · `roll` ·
`bow` · `beg` · `lie-down` · `shake` · `head-tilt` · `walk` · `pause`, plus the
`seq` / `repeat` wrappers. New primitives dropped into
`src/training/nodes/actions/` are auto-registered and appear in the palette.

## Tech

TypeScript · [three.js](https://threejs.org) · [Vite](https://vitejs.dev) ·
[Vitest](https://vitest.dev) · `vite-plugin-pwa` (Workbox). No game engine — the
voxel-chibi world, the dog rig, and the training VM are all hand-rolled.

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests (vitest)
npm run lint     # eslint
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## Layout

```
src/
  actions/      command registry + the always-visible action dock model
  audio/        WebAudio sfx + mute
  entities/     dog (rig, AI, needs) and player
  input/        thumbstick + look controls
  persistence/  localStorage save / autosave
  quests/       lightweight goals
  render/       camera, particles, scene plumbing
  training/     the dog-training VM:
    nodes/      action · control · sense · memory primitives (auto-registered)
    registry.ts · interpreter.ts   run a trick program
    composer.ts · trick-composer.ts the Teach authoring tool
    engine.ts · learning.ts         cue↔behaviour conditioning
  ui/           dock, hud, onboarding, toast, vocab panel
  world/        endless biome streaming
```

## Deploy

Pushing to `main` runs lint + tests + build and publishes to Cloudflare Pages
(project `hundesitter`, live at https://hundesitter.franzai.com) via
`.github/workflows/deploy.yml`. The custom domain is configured on the
Cloudflare Pages project.
