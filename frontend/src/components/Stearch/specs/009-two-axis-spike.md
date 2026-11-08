# Spec 009: the two-axis spike

**Status:** phase 1 (the grid) built as a story, unit-tested, not yet tried with a real pad. Phase 2 (the map) and the treemap are ideas.
**Source of intent:** the user, 2026-11-08: "I want the control stick to smoothly move across both axes ... a 128×128 grid, but only big enough to see 24×24. Same fundamental concepts, two directions." Then: keyboard is the D-pad; selection and active carry over; radial deadzone; a separate feel for now, with lessons for merging; later, our games as GeoJSON on a map, where the sticks pan and zoom.

## Concepts carried over

| Concept          | 1D (specs 007, 008)              | 2D                                                                                                                            |
| ---------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Keys             | one row per press                | the D-pad: one cell per press, ↑↓ by row, ←→ by column, jump cut                                                              |
| Centre band      | `bandRows` tall                  | a **centre box**, `boxRows × boxCols`, centred both ways                                                                      |
| Active (current) | the row in the band              | the cell in the box                                                                                                           |
| Selected         | a set, Ctrl/⌘-click              | the same set; a press toggles it (Space, pad A). Scrolling never selects.                                                     |
| Stick            | Y sets a speed; the view leads   | (x, y) sets a velocity, **radial**: one deadzone and one curve on the push's length, so a diagonal is no faster than straight |
| Hand-over        | the row's middle leaves the band | per axis: the cell's middle leaves the box across that axis, and the cell at the centre takes that axis                       |
| Release          | the view stays                   | the view stays                                                                                                                |

**Deciding "active" under the stick is our job.** The stick only moves the view. What's active follows from geometry: whatever sits in the box, with the box as hysteresis. What's selected never changes by scrolling.

## Pieces, in build order

1. **Pure functions with tests** (`scrolling/grid-2d.selectors.ts`): `stickVelocity(x, y, feel)` (radial), `followScroll(axis)` (the 1D `followScrollTop` per axis), `cellCurrent(centreCell, currentCell, cellsFromCurrent, box)`, `moveCell(cell, key, size)`.
2. **A 2D window:** only the visible cells plus a ring of 2 are mounted (about 28 × 28 of 16,384), absolutely positioned. The shared `RVirtualScroller` is one-dimensional and stays untouched.
3. **`use-stick-scroll-2d.ts`:** reads axes 0 and 1, writes `scrollLeft` and `scrollTop`, reports the active cell.
4. **`claimStickX()` in `useGamepad`**, beside `claimStickY()`: today the left stick's X sends ← and →.
5. **A story, `scrolling/grid-2d.vue`:** numbered cells ("r12 c40"), the box drawn, the same marks as the lists (selected, current, key position), controls for every value, a stand-in X/Y slider, a live readout, and the feel as code.

**`Grid2dFeel` is separate from `ScrollFeel`:** `boxRows`, `boxCols`, `deadzone`, `minCellsPerSecond`, `maxCellsPerSecond`, `gamma`. Cell size doesn't matter to the rules; it's a story control.

## Phase 2: the map

Our games as plain GeoJSON points (a field per axis, for example release year against rating, or platform as a region), drawn on a map with MapLibre GL. The same ideas map over:

| Grid spike                  | Map                                                |
| --------------------------- | -------------------------------------------------- |
| left stick pans the grid    | left stick pans the map                            |
| (nothing)                   | right stick or triggers zoom                       |
| the centre box              | a centre reticle                                   |
| active: the cell in the box | active: the feature nearest the reticle, inside it |
| selected: pressed cells     | selected: pressed features                         |

MapLibre is a new dependency: it needs the user's yes before installing, and RomM's frontend rules forbid component libraries in the app. As a spike and story it's a learning tool, not app code.

## The stick's state machine, per axis

From the user's notes (2026-11-08): at the grid's edges the view can't pan, so the stick did nothing; and from a corner cell outside the box, the stick should walk the cell in as the D-pad would. Each axis now has a state, worked out every frame, and the state decides what the stick does:

| State      | When                                                                             | The stick                                                                                                |
| ---------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `captured` | the active cell is inside the box, and the view can pan the way the stick pushes | pans the view; the cell hands over at the box's leading edge                                             |
| `pinned`   | inside the box, but the view is at its limit that way                            | sends D-pad steps: the cell escapes the box ("captured but escaping")                                    |
| `free`     | outside the box: a corner, or a far mouse click                                  | sends D-pad steps; once the cell is back inside, it's captured again ("not captured, becoming captured") |

```
            view can pan            view at its limit
 inside  ┌─────────────┐  edge  ┌──────────┐
 the box │  captured   │ ─────▶ │  pinned  │
         │  (pan)      │ ◀───── │  (step)  │
         └─────────────┘  away  └──────────┘
               ▲  │                 │
       stepped │  │ jumped away     │ stepped out of the box
          back │  ▼                 ▼
         ┌──────────────────────────────┐
         │  free (step)                 │
         └──────────────────────────────┘
```

_Fig. 2: the per-axis states. A step's follow pulls the cell back into the box where the view can move: the "capture it and centre it" verb._

- **Steps are D-pad steps.** The stick's speed accumulates into whole cells (`stepsOwed`), and each one goes through the same `step()` as an arrow key or the D-pad: one path for all three.
- **Pure parts:** `axisState`, `axisMode`, `isInsideBox`, `canPan` and `stepsOwed` in `grid-2d.selectors.ts`, with tests. The readout shows each axis's state live.
- **Not yet in the 1D lists.** The same states apply there on one axis; port once the spike feels right.
- **"Dispatched":** in the spike a step is a direct call to `step()`. In Stearch's store it would be the same action a key press dispatches.

## An idea: a treemap of queries

From the user, 2026-11-08. Each primary cell of a treemap is a query. Pressing one runs it and opens the giant grid inside it, to explore those titles. The cells come from the current sort, so the treemap is a map of what the sort means:

| Sort         | Cells                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Name         | one per first character, as the rail has today (`char_index`), including non-Latin starts such as Chinese, Japanese and Korean |
| Rating       | six: 1, 2, 3, 4, 5 and none                                                                                                    |
| Platform     | one per platform                                                                                                               |
| Release year | one per year or decade                                                                                                         |

A cell's area is its count, which the API already returns per letter (`char_index`) and per filter value (`filter_values`). The same controls apply at both levels: the stick pans, the D-pad steps, a press goes in, B comes back out. It fits the file-browser model in spec 007: a cell is a folder.

Open: how non-Latin first characters group (one cell per character, or per script); whether a cell's grid is the 2D grid from this spike or the tiles view.

## Debug surface

The grid story shows both axes' state machines live, with a log of each input and transition. Commands above the grid act from outside at the four corners and the middle, each stating what it dispatches: `navigateTo`, `setActive`, `snapTo`, `addSelected`. Proof: `CommandToMiddle`, `CommandSetsActiveOnly`. Model: `stearch-stick-fsm-verbs-nouns-claude.md`.

## Lessons to collect for merging

**First lesson, from building it:** the 1D rules generalised by running them once per axis. `followScrollTop` follows the active cell on both axes unchanged, and `stickCurrentRow` hands over per axis with `boxRows` and `boxCols` in place of `bandRows`. Only the stick's velocity needed new code, because a radial deadzone looks at both axes at once.

After the spike, record in `LESSONS.md` what 2D needed that 1D didn't: whether `ScrollFeel` can become one feel with an optional second axis, whether `followScrollTop` and `stickCurrentRow` generalise cleanly to per-axis versions, and whether the radial deadzone feels better than the 1D one for the list too.
