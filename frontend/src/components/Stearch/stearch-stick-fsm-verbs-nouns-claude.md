# Stick state machine: verbs and nouns (Claude)

Revised 2026-11-08 after reading andest01's notes. See `stearch-stick-fsm.html` and spec 009. "Screen" and "data" are working words for two ideas that intermingle.

## Nouns

**Library (data):** all items. Changes when the query or the library changes.

**Attention (data, but the user's):** changes when the user looks somewhere. Maybe a third flavor; open.

| Noun         | Meaning                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| **Active**   | "tell me about this one"; exactly one, or none. Also called "current" in the code; one name should win |
| **Selected** | a set, for acting on many at once                                                                      |

**Screen**

| Noun                                    | Meaning                                            |
| --------------------------------------- | -------------------------------------------------- |
| **Plane**                               | the whole grid, bigger than what you see           |
| **Viewport**                            | the window onto the plane                          |
| **Limit**                               | where the viewport can't go further, per direction |
| **Horizontal band** / **vertical band** | the box's rows across, and its columns down        |
| **Box**                                 | where the bands cross                              |
| **Leading edge**                        | the side of a band you're moving toward            |

**Input:** step (discrete), push and velocity (continuous), debt (the part of a step owed between frames).

**Relation, per axis:** **captured**, **pinned**, **free**. Neither data nor screen: each is the active cell measured against the band and the limit.

## Translations

The only bridge between the two sides.

| Translation         | Shape                    | Status                                                                                                                                |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| item to coordinate  | `pointOf(cell): point`   | built                                                                                                                                 |
| coordinate to items | `cellsAt(point): cell[]` | modelled. Empty, one or many, like overlapping shapes on a map. The grid only ever has one (`indexAt`), so nothing needs the list yet |

"Up could mean several things" is the same shape: an input resolves to candidates, and something picks a winner.

## Verbs

**Screen: go to a place.** One motion, many ways to choose the target.

| Verb                           | Meaning                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| `flyTo(coords, scrollOptions)` | animated. Takes coordinates only                                |
| `snapTo(coords)`               | `flyTo` at speed 0. What both views use today                   |
| `centreTarget(cell)`           | a target: the cell in the middle                                |
| `followTarget(cell)`           | a target: least movement that keeps the cell on the band's edge |

**Screen: move at a speed.** No destination, so `flyTo` can't express it.

| Verb    | Meaning                                                   |
| ------- | --------------------------------------------------------- |
| **pan** | moves the viewport at a velocity, from the stick or wheel |

**Data**

| Verb                             | Meaning                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `setActive(item)`                | make this the one                                                                 |
| `addSelected` / `removeSelected` | idempotent. `toggleSelected` still exists; a press should resolve to one of these |
| **walk**                         | repeated `setActive` from a push, with no scrolling                               |

**Crossing the gap**

| Verb                              | Direction      | Meaning                                                                                              |
| --------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `navigateTo(item, scrollOptions)` | data to screen | `setActive(item)`, then `flyTo(target(pointOf(item)), scrollOptions)`. Keys, D-pad, outside commands |
| **hand over**                     | screen to data | the view moved, so active becomes the leading cell. The stick's pan                                  |

A click is `setActive` alone in the spike: it doesn't move the view.

**Relation events:** **capture** and **escape**. The active cell enters or leaves a band. They are recalculated, and the code has no name for them yet.

**Input:** **yield**, one input standing down for another (`stick.cancel()`).

## What this shows

1. **Crossing has two directions.** `navigateTo` goes data to screen; hand over goes screen to data.
2. **The FSM is the overlap.** Its states are the relation between active and the band.
3. **Every input reduces to step or pan.** Discrete input steps; the stick pans or walks, by state; the wheel pans.
4. **An outside command can land in any state.** `setActive` alone can leave the cell free and far off screen. The Storybook buttons exercise this.

5. **A step needs no state.** It follows when it lands at or past the centre in its direction, and walks when heading for the band. Only a limit can leave the cell behind.
6. **A crossing updates both sides at once.** The relation is only meaningful if data and screen come from the same moment.

## Open

- Should a flight be a fourth state? During `navigateTo` the relation reads `free` until the view arrives.

- Is attention its own flavor?
- Screen/data or continuous/discrete, or both as two axes?
- Who picks the winner when `cellsAt` returns many?
