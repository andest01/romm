# Spec 016: the focus tree

**Status:** R1 to R9 built, unit-tested. No real pad or screen reader has run it.
**Source of intent:** the user, 2026-11-09: harmony between the accessibility ring and B going back, with hierarchy inside rings. Keyboard and controller stay one model, as RomM's "everything is keyboard".

Rings go sideways. B goes up. They are two directions through one tree.

```text
PAGE RING (F6, RT/LT)   nav > search > controls > filters > results > selection
                                                               |
                               Enter or A enters               |  Esc or B leaves
                                                               v
ITEM RING (one game)                                   open > heart > more
                                                               |
                               Enter or A presses it           |  Esc or B closes
                                                               v
MENU (overlay, RomM's own)                             Like > Download > ...
```

## Rules

1. Hop moves among the stops of the level you are in. It never leaves that level.
2. Enter or A goes one level in, onto what is under the cursor.
3. Esc or B goes one level out, to exactly where you entered.

B follows structure and does not retrace hops, so repeated presses always end in the same place. It never changes data (spec 013, S4), and it never leaves the page.

## The ladder

```text
LEVEL         MOVES                                         B GOES TO
1 Game        open, heart, more                             2
2 Grid        left edge to Filters, right edge to the rail  3
  Rail        up and down walk it, left to the grid         3
  Filters     beside the grid                               3
  Selection   beside the grid                               3
3 Search      across to the controls, down to your game     4
  Controls    beside search                                 4
4 App nav     RomM's sections                               stays
```

## Requirements

| ID  | Requirement                                                                            | Proof                                   |
| --- | -------------------------------------------------------------------------------------- | --------------------------------------- |
| R1  | The entered game is state, and a new search leaves it                                  | `attention.selectors.test.ts`           |
| R2  | Entering needs a current game                                                          | `attention.selectors.test.ts`           |
| R3  | F6, Shift+F6, RT and LT hop the page ring, skipping inert regions                      | `waypoints.driver.test.ts`, needs a pad |
| R4  | While a game is entered, hop cycles that game's controls                               | `waypoints.driver.test.ts`              |
| R5  | Hop does nothing while an overlay is open                                              | `waypoints.driver.test.ts`              |
| R6  | Esc or B climbs the ladder, one level per press                                        | `waypoints.driver.test.ts`, needs a pad |
| R7  | At the app nav, Esc or B stops; RomM's history back never fires on Stearch             | `waypoints.driver.test.ts`              |
| R10 | Down from the search box lands on the current game                                     | `header.driver.test.ts`                 |
| R11 | On the rail, left goes to the grid and right does nothing                              | Needs a browser                         |
| R8  | Enter or A on the grid enters the current game; left and right then cycle its controls | `list-input.test.ts`, needs a pad       |
| R9  | While entered, the cursor and stick stay put; Esc or B returns focus to the grid       | `list-input.test.ts`, needs a browser   |

## Controller buttons

LB and RB switch RomM's sections and Select acts as B, on every page, so Stearch doesn't take them. RT and LT are free. Search needs no button: it is a stop on the ring, and `/` jumps there.

## Open

Up from the top row going to search needs a fresh press, so a held Up can't fly into the box. Not built.
