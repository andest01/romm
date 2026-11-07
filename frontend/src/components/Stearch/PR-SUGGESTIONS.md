# Preliminary PR suggestions

Small changes found while building `/stearch` that stand alone and help all of RomM. Each could be its own PR against `master` before any larger effort to fold Stearch in. Numbers come from [LESSONS.md](LESSONS.md), "scroll cost, measured in production profiles".

## 1. Gamepad polling only while a pad is connected (free fix)

- **Problem:** `useGamepad` (installed once in `AppLayout.vue`) and `useRightStickScroll` ran `requestAnimationFrame` loops on every page, forever, with or without a gamepad. That was 64 ms over a 27 s profile, and it keeps the page producing frames while idle.
- **Change:** `usePadRafFn` in `composables/useGamepad/index.ts` starts the loop only when a usable pad is present, resumes on `gamepadconnected` and pauses on `gamepaddisconnected` when none remain. `hasUsablePad` lives in `utils/gamepad.ts`. Chrome hides pads until their first press, and that press is what fires `gamepadconnected`, so pad users lose nothing.
- **Tests:** the existing chord and right-stick tests now announce the pad, and one new test proves no polling before a pad connects.
- **Why first:** no Stearch code, no visual change, every page benefits.

## 2. `RVirtualScroller`: reconsider `will-change: transform` per item

- **Problem:** every rendered item is promoted to its own compositor layer. In Stearch that made Layerize the top scroll cost, 1,194 ms in a 27 s profile.
- **Proposal:** drop it from the primitive, or make it opt-in for consumers that animate items. Stearch already overrides it locally.
- **Needs:** a gallery profile before and after, since the gallery may rely on it for mount animations.

## 3. `RVirtualScroller`: a smaller default overscan

- **Problem:** the default is 25 items each side. At 6 columns that mounts about 300 hidden tiles, and mounting was 241 ms of `patchDOMProp` in one 5 s scroll.
- **Proposal:** a default nearer 2 to 5, with consumers raising it when they need to. Stearch passes 2.
- **Needs:** a fast-fling check for blank rows in the gallery.

## 4. Storybook pseudo-states addon

- **Change:** `storybook-addon-pseudo-states` is registered in `.storybook/main.ts`, which adds a toolbar to force `:hover`, `:focus-visible`, `:active` and others on any story. Stories can also pin states with `parameters.pseudo`, as Stearch's `InteractionStates` tile story does.
- **Why:** primitives' interaction styles become reviewable without a mouse, in both themes.

## Not yet ready

- **Idle repaint.** Paint flashing shows the whole `/stearch` viewport repainting while idle at about 50 fps, with no CSS animation running (`document.getAnimations()` is empty). Re-check after suggestion 1; if it remains, profile two idle seconds to find the script.
