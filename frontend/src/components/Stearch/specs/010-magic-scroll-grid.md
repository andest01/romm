# Spec 010: the magic scroll grid

**Status:** draft for the rewrite. Nothing here is built to this spec yet. The current list, table and 2D spike are evidence, not the design.
**Source of intent:** the user, 2026-11-08: a series of specs that recreate the exact needs including cruise control, one state machine driven by dispatched events, and an implementation-agnostic test harness that checks real DOM behaviour with keyboard and controller, with strong a11y expectations.

## What the rewrite must get perfect

1. The grid's behaviour, stated as requirements below.
2. The state machine and how events reach it.
3. A DOM-only test harness that doesn't know the framework.
4. Layouts as `*.layout` files with anatomy diagrams (out of scope here; see "Other redo notes").

## Vocabulary

| Word         | Meaning                                                    |
| ------------ | ---------------------------------------------------------- |
| **Plane**    | everything scrollable, in cells                            |
| **Viewport** | the visible window onto the plane                          |
| **Limit**    | where the viewport can't move further, per direction       |
| **Band**     | the centre span of the viewport, per axis; `boxCells` wide |
| **Active**   | the one item being attended to, or none                    |
| **Selected** | a set of items                                             |

A list is the one-axis case. Every rule is stated per axis.

## The machine

One machine per axis. **State is held, not recalculated.** Input and geometry become events, and only the machine changes state.

| State      | Means                                              | The stick does                  |
| ---------- | -------------------------------------------------- | ------------------------------- |
| `captured` | active is in the band, view can move               | pans, active hands over         |
| `pinned`   | active is in the band, view is at a limit that way | steps                           |
| `free`     | active is outside the band                         | steps                           |
| `cruising` | full push held while captured                      | steps at key rate, view follows |
| `flying`   | a commanded move is under way                      | yields; any input ends it       |

| Event                                             | From                       | To                                       |
| ------------------------------------------------- | -------------------------- | ---------------------------------------- |
| `step` (lands at or past the centre)              | captured, cruising         | same; view follows                       |
| `step` (heading for the band)                     | free                       | free, or captured on arrival; view stays |
| `step` (past the centre)                          | free                       | captured; view jumps once                |
| `viewMoved` (active left the band)                | captured, pinned, cruising | free                                     |
| `keyPressed` (a real key or D-pad press)          | cruising                   | captured; stick ignored until released   |
| `limitReached`                                    | captured, cruising         | pinned                                   |
| `limitLeft`                                       | pinned                     | captured                                 |
| `stickFull` (at or above `enterAt` for `dwellMs`) | captured                   | cruising                                 |
| `stickEased` (below `exitAt`)                     | cruising                   | captured                                 |
| `navigateTo`                                      | any                        | flying                                   |
| `arrived`                                         | flying                     | captured, or pinned at a limit           |
| `interrupted`                                     | flying                     | by geometry                              |

`cruising` is entered only from `captured`. The `dwellMs` timer counts full push in any state, so a stick already held full enters `cruising` the moment a walk reaches `captured`.

Rules every transition keeps:

- **M1.** A step from `captured` never passes through `free`, for any frame.
- **M2.** Data and screen change together: a crossing updates both before anything reads them.
- **M3.** Only a limit can leave active behind during steps.
- **M4.** A held state is the only source of truth. Readouts render it; they never derive their own.

## Inputs

All inputs reduce to machine events. No input path bypasses the machine.

| ID  | Requirement                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| I1  | Keyboard arrows and the D-pad are the same event, `step`.                                                                                  |
| I2  | A held D-pad repeats at the keyboard's measured delay and interval.                                                                        |
| I3  | Input is heard wherever focus is, except in editable fields and other widgets.                                                             |
| I4  | The stick has a radial deadzone, with hysteresis on release.                                                                               |
| I5  | At top speed the stick enters `cruising`; defaults `enterAt` 0.95, `exitAt` 0.85, `dwellMs` 250. Open: whether a true diagonal may cruise. |
| I6  | The wheel and scrollbar move only the screen, and raise `viewMoved`.                                                                       |
| I7  | A click sets active and doesn't move the view.                                                                                             |
| I8  | Enter or pad A opens the active item. Space selects it.                                                                                    |

## Commands from outside

| Verb                                         | Touches                                         |
| -------------------------------------------- | ----------------------------------------------- |
| `navigateTo(item)`                           | active, then a smooth move; state goes `flying` |
| `setActive(item)`                            | active only                                     |
| `flyTo(point)`                               | view only                                       |
| `addSelected(item)` / `removeSelected(item)` | selection only; idempotent                      |

Commands are plain actions through one dispatch. Item to coordinate is `pointOf(item)`. Coordinate to items is `cellsAt(point): item[]`, because a point may hold none or several.

## Accessibility

The DOM is the contract, so these are testable.

| ID  | Requirement                                                                       |
| --- | --------------------------------------------------------------------------------- |
| A1  | The scroller is `role="grid"` with an accessible name, and owns only rows.        |
| A2  | Rail, band and other controls sit outside the grid.                               |
| A3  | `aria-activedescendant` names active while it's mounted, and is absent otherwise. |
| A4  | `aria-rowcount` is the full count; each row has `aria-rowindex`.                  |
| A5  | `aria-selected` reflects selection.                                               |
| A6  | The grid has move instructions via `aria-describedby`, true to what's built.      |
| A7  | A skip link is the first Tab stop on the page.                                    |
| A8  | Focus never falls to the page because an item unmounted.                          |

## The test harness

It must not know the framework. A jQuery, React, Vue, Svelte or vanilla grid passes or fails the same tests.

```
fixture    mounts a grid of N items with a known size, any implementation
driver     sends real input: keydown, wheel, a stubbed navigator.getGamepads
verifier   reads only the DOM: roles, aria-*, scrollTop, focus, geometry
```

The only coupling is the DOM contract above, plus two data attributes the implementation must expose: `data-axis-state-x` and `data-axis-state-y`, holding the machine's state.

Each requirement gets one named test:

```ts
contract(
  "M1: a step from captured never goes free",
  async ({ grid, keys, states }) => {
    // Arrange
    await grid.navigateTo({ row: 64, col: 64 });

    // Act
    const seen = await states.during(() => keys.hold("ArrowDown", 30));

    // Assert
    expect(seen.y).not.toContain("free");
  },
);
```

- **Runner:** Storybook play functions in real Chromium, because they already run real DOM and axe. Use Playwright only for what a page can't do, such as true OS key repeat.
- **Controller:** stub `navigator.getGamepads` in the driver, so stick and D-pad runs are repeatable.
- **Every frame counts:** `states.during` samples on `requestAnimationFrame` and via a `MutationObserver`, so a one-frame `free` fails the test.
- **Verifier first:** the harness has its own tests against a deliberately broken grid, so a passing contract means something.
- **Performance:** frame time and idle main-thread share are contract tests too, with budgets.

## Other redo notes

From the user, 2026-11-08:

1. More `*.layout` files, each with an anatomy diagram.
2. The low-level Stearch machine: actions and the reducer.

## Evidence from the spike

See "Rules from the input work" in `LESSONS.md`. Bugs to keep as regression tests:

- A wheel scroll, then keys, lost the view.
- Two steps in one frame escaped the band.
- A stick pan dropped focus and silenced the D-pad.
- A step from the first item yanked the view to the middle.
- One new object per frame re-rendered the grid at idle.
- A growing debug log shrank the stage and moved the centre line.

## Cruise stacks

Built on the shared machine; the only memory is `since` (when the full push began) and `cap` (for the margin).

| Requirement                                | Value                                                         |
| ------------------------------------------ | ------------------------------------------------------------- |
| Enter                                      | at least 95% push held 1000 ms: stack 1x                      |
| Earn                                       | another 1000 ms each: 2x, then 5x, and it stays               |
| A stack means                              | each jump cut moves that many rows, so active holds its place |
| Push cap                                   | 90% and up 5x; 75% to 90% 2x; 40% to 75% 1x                   |
| Margin                                     | 2% below a threshold, so a resting stick doesn't buzz         |
| Pushing back up                            | restores the earned stack at once                             |
| Below 40%                                  | exits to smooth scrolling; re-entry takes the full 1000 ms    |
| View at a limit                            | cruise stays on                                               |
| Focus moves elsewhere, like the search bar | cruise ends                                                   |
| Score                                      | shown with the stats at the bottom                            |

This table replaces the `enterAt`, `exitAt` and `dwellMs` defaults above.

## Open, from the user's pad run (2026-11-08)

| Case                                | Result         | Open question or requirement                                                                              |
| ----------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| Active far off screen, stick pushed | Works          | Should the view snap back, or be pulled back animated to active? Undecided; it may be hard to tell apart. |
| Stick at the bottom limit           | Stops          | A future table footer could take this input, so the bottom limit may become a way out, like the top.      |
| Key or D-pad during a stick push    | Works          | Needs a test, and the rule documented at the code that does it.                                           |
| Full push from `free`               | Not judged yet | Is 30 steps per second too fast to stop where you mean to?                                                |
| Rail letter                         | Works          | Must be exactly one call, `navigateTo`: animated, and sets active, even when the game isn't loaded yet.   |
| Tiles and Table switch              | Works          | Must keep the active item centred.                                                                        |
