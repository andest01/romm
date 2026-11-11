# Spec 007: focus travel

**Status:** F1 to F4 and F6 built for tiles and table, unit-tested, tried by the user in a browser. F5, F7, F9 to F11 not built. **Superseded in part:** hold-to-cruise (`use-cruise`), the `cruise` feel and the `centre-band` story are deleted; held input is now spec 010's cruise stacks.
**Source of intent:** the user's nits in `search nits.md` (focus spins out into the sidebar while holding ↓; tile, ♡ and ⋯ are separate stops; keyboard and pad differ in speed), and the planning answers of 2026-11-07.

## The problem

Inside the results, arrows are handled by the app-wide DOM navigation (`useSpatialNav`, with `useGridNav` in the gallery). Both pick the next target from elements that are mounted and measured. A virtual list only mounts a few rows past the screen, so holding ↓ reaches the last mounted row, which looks like the grid's edge. The key goes unclaimed and `useSpatialNav` carries focus to the nearest control below or beside it: the sidebar.

Each step also calls `scrollIntoView({ behavior: "smooth", block: "center" })` once the target leaves the screen. Key repeat outruns the animation, so the view lurches back and forth.

## Verdict on the current system

**It can't do this as is, so Stearch is opinionated inside the results and conventional at their edges.**

- Inside the results, movement is by position in state, not by mounted DOM. Only state knows that row 900 exists while it isn't mounted.
- At the two edges the user chose (left from the first column, up from the first row), the list leaves the key unclaimed, and the existing `useSpatialNav` carries focus out as it does everywhere else. No change to the shared system.
- The results declare `role="grid"`, which `useSpatialNav` already treats as owning its arrows.

```
          ┌──────────── search bar ────────────┐
          │                  ▲ up from row 0    │
 sidebar  ├────────────────────────────────────┤
 ◀ left   │  results: arrows move by position  │  right edge: stays
 from     │  ↓ waits on ghosts, stops at end   │
 column 0 │                                    │
          └────────────────────────────────────┘
```

_Fig. 1: the only ways an arrow leaves the results._

## Requirements

| ID  | Requirement                                                                                                                                                                                                                                                                                     | Proof                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| F1  | ↓ and ↑ move one row and keep the column; ← and → move one item.                                                                                                                                                                                                                                | selector test                                    |
| F2  | Movement is by position, so it continues onto ghost rows; focus lands on the tile when it mounts.                                                                                                                                                                                               | selector test, story `play()`                    |
| F3  | ↓ on the last position, and → on the last column, do nothing. Focus never leaves by those edges.                                                                                                                                                                                                | story `play()`                                   |
| F4  | ← from the first column and ↑ from the first row leave the key unclaimed, so `useSpatialNav` moves to the sidebar or search bar.                                                                                                                                                                | story `play()`                                   |
| F5  | Arrow steps land on whole items only. Enter or A goes inside an item to reach ♡ and ⋯; Escape or B comes back out to the item.                                                                                                                                                                  | story `play()`                                   |
| F6  | The active row stays inside a centre band about two rows tall. Scroll is set directly each step, never animated against the next press.                                                                                                                                                         | unit test of the follow function, teaching story |
| F7  | Holding a key moves one step per repeat, keyboard or pad.                                                                                                                                                                                                                                       | story `play()` with 50 presses                   |
| F9  | PageDown and PageUp, and pad LB and RB, jump to the next or previous group head (A, B, C). The rail shows the group.                                                                                                                                                                            | selector test, story `play()`                    |
| F10 | Entering the results from another region lands on `activePosition`, jumping the view to it if it has scrolled away.                                                                                                                                                                             | story `play()`                                   |
| F11 | Enter or A on an item goes inside; the item itself is the first stop inside, and Enter or A again opens it. Opening takes two presses.                                                                                                                                                          | story `play()`                                   |
| F8  | A teaching story shows the centre band as a visible window, with controls for band height, row height and repeat rate, so a reader learns the behaviour without reading code. Play functions change the controls as they run, so a reader sees how a narrower band changes where the row rests. | `content/list/scrolling/centre-band.stories.ts`  |

## Attention states

**The paradigm is a file browser.** Stearch aims to be a best-in-class web file browser for games. File UIs (Finder, Explorer, Nautilus, VS Code's explorer) all solve the same central problem: telling apart _"these are the things I've picked"_ from _"tell me about this one, right here"_. Stearch keeps three states for this, each distinct, each visible.

| State                                  | File-browser name           | Where                            | Set by                  | Can be on a ghost     | Drawn as                      |
| -------------------------------------- | --------------------------- | -------------------------------- | ----------------------- | --------------------- | ----------------------------- |
| **Selected** (`attention.selectedIds`) | selection                   | store                            | click today             | no                    | green tint                    |
| **Current** (`attention.activeId`)     | focused or highlighted item | store                            | arrow keys, hover today | no: `null` on a ghost | amber bar on the leading edge |
| **Key position** (`activePosition`)    | keyboard cursor             | content view (`content.view.ts`) | arrow keys only         | yes                   | dashed blue outline           |

- **Selected** is a set, like a column of checkboxes. It implies multi-select and batch actions ("add these to a collection"), not one point of action. Order is kept, most recent last.
- **Current** answers "which game is this about?" `selectCurrentGame` joins it to the loaded games, so its name and every other fact are one selector away. The background and any detail panel read it.
- **Key position** exists only because a virtual list has rows with no game yet. On a loaded row it and Current point at the same item; on a ghost, Current is `null` and the cursor still has somewhere to be.
- **One visual channel each** (tint, bar, outline), so all three can sit on one item and still read apart. A dev-only strip (`content/attention-debug.container.vue`) prints all three live.

### What file browsers agree on (from memory; to verify)

This section is from general knowledge of desktop file managers and the WAI-ARIA listbox and grid patterns. It hasn't been researched for this spec yet, and should be before the model changes.

- **Hover changes nothing.** Pointing at a file doesn't focus or select it. Today Stearch's hover sets Current, which file UIs don't do.
- **Click focuses and selects only that item.** Ctrl or ⌘-click toggles one item into or out of the selection. Shift-click selects a range from an **anchor**, the last plain-clicked item.
- **Arrows move focus, and selection follows it** in single-select. Ctrl+arrow moves focus without changing the selection, and Space toggles the focused item.
- **Selection is often shown stronger than focus.** A filled background marks the selection, and a thin ring marks focus.

### Likely model changes (not decided)

- Hover stops setting Current.
- A plain click sets Current and replaces the selection; a modifier click toggles.
- A **selection anchor** for Shift ranges, perhaps `attention.anchorId`.
- Whether arrows also move the selection (selection follows focus) or only Current.

## State

- **The key position is a view fact, not store state** (decided with the user). It lives in `content.view.ts`, so it survives a switch between tiles and table, and `use-key-focus.ts` is its only writer. The centre band keeps no state at all.
- Moves come from one pure function, `moveFor`, shared by tiles and table, so both behave the same. A new view seeds the key position from `selectAnchorPosition`, the Current game's position.
- A move sets Current with `attention/set { activeId }`, or `null` on a ghost.
- The list keeps DOM focus on itself, not on a tile: a virtual list unmounts tiles as they scroll or load, and focus on one fell to `<body>` and dropped every later key.
- A view that opens takes focus only if nothing holds it. Focus stays on the Tiles/Table switch, so a controller can press it over and over.
- A view opens on `selectAnchorPosition`: the current game, else the latest selected game, else where the list was. It waits for a measured width first, because tiles lay out at one column until then and the anchor's row came out far too low.

## Scroll feel

How a list moves under keys is one interface, `ScrollFeel` in `content/list/list.props.ts`. Every view reads it through the same code (`use-scroller-jump.ts`, `use-key-focus.ts`, `use-cruise.ts`); only the values differ.

| Field      | Meaning                                                                                                                                                                          | Table         | Tiles         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------- |
| `bandRows` | Centre band height, in whole rows (F6). 1 holds the active row in the middle.                                                                                                    | 1             | 1             |
| `glideMs`  | A tap's glide, a straight line with no easing. 0 is a jump cut.                                                                                                                  | 0             | 0             |
| `cruise`   | Hold-to-cruise: start and top speed in rows per second, and the ramp between. `null` means a held key just repeats steps.                                                        | `null`        | `null`        |
| `marks`    | The attention marks' timeline: `lengthMs`, plus `fadeIn` and `fadeOut`, each a share of the length (0 is a jump cut) and a named curve from `MARK_CURVES`. Drawn by `marks.css`. | all jump cuts | all jump cuts |

Both views move in jump cuts today. The glide and cruise stay built and are judged in the story's `GlideAndCruise` example.

- A tap moves one step and follows with the glide. A retarget restarts the line from wherever the scroll is.
- A hold (a key's `repeat` flag, or the pad's second event 300 to 450 ms after the first) cruises when `cruise` is set. Repeats no longer drive the scroll; the item row at the centre line becomes current as it passes, and release finishes on the next row ahead.
- A wheel, drag or cruise that moves the scroll under a glide stops the glide.
- Reduced motion turns any glide into a jump cut.
- The story `content/list/scrolling/centre-band.stories.ts` drives every field with a control, has a preset for each view, and checks each preset with `play()`.

## Open

- **Column snap:** moving down from a full row into a shorter one (a section's last row) clamps the column, and the next row down keeps the clamped column. The user has chosen to leave this for now.
- **ARIA:** both views say `role="grid"` but rows and cells don't yet carry `row` and `gridcell`, and there's no `aria-activedescendant`.

## Decided (2026-11-07)

- At the end of loaded rows, focus moves onto ghosts and waits; the true end stops.
- Leaving is by edge (left from column 0, up from row 0) plus intent (Escape or B).
- Steps land on whole items; going inside reaches ♡ and ⋯.
- The view follows with a centre band, taught by a story in `content/list/scrolling/` that drives the same follow function the list uses.

## Conflicts to settle

- **Pad LB and RB** already cycle the app's nav sections everywhere (`useGamepad`, `BUTTON_ACTIONS` 4 and 5). F9 needs the results to claim them first, which `useGamepad` doesn't allow today: its button actions aren't keys a grid can `preventDefault`.
- **Escape or B** (decided): Stearch claims it everywhere inside the results. Inside an item, B goes out to the item. At the top level of the results, B goes to the search bar, the page's home position. The home is a value in state (a preference, such as `focus.home: "search"`), not a hard-coded target, so it can change or be referred to later. B never goes back in history from inside the results.
- **Pad LB and RB:** set aside for now; F9 uses PageUp and PageDown only until it is settled.
- **Two presses to open** (F11) differs from the gallery, where A opens at once. Recorded in `specs/006-compatibility.md` once built.
