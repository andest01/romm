# Spec 013: selection

**Status:** S1 to S8 built.
**Source of intent:** the user: this is part of the heart of Stearch. X selects, Y is actions, B goes up one level and never changes data, and range selection goes through a menu.

Stearch is a file browser for games, so selection follows file browsers. Three things stay separate:

| Concept  | Meaning                     | State                   |
| -------- | --------------------------- | ----------------------- |
| Cursor   | Where the input is          | `activePosition` (view) |
| Current  | The game actions apply to   | `attention.activeId`    |
| Selected | The set a bulk action takes | `attention.selectedIds` |

## Requirements

| ID  | Requirement                                                                             | Proof                             |
| --- | --------------------------------------------------------------------------------------- | --------------------------------- |
| S1  | Moving never changes the selection                                                      | Separate state                    |
| S2  | X or Space flips the current game in or out of the selection                            | `list-input.ts`, needs a pad pass |
| S3  | Selection belongs to its results: a change in which games match drops it. Sort keeps it | `stearch.reducer.test.ts`         |
| S4  | B never changes data, so it never clears a selection                                    | Spec rule                         |
| S5  | Bulk actions appear only while something is selected                                    | `selection.pure-component.vue`    |
| S6  | A bulk action keeps the selection, so a second action can follow                        | `bulk-add.container.vue`          |
| S7  | Y opens the game menu; Like and Download act on the selection, else the active game     | Needs a pad pass                  |
| S8  | Hold X and move paints a run; the first game decides add or remove. Shift + arrows adds | `list-input.test.ts`              |

## Open

What should A do on a game? Opening it is one answer. The user's better idea: A "activates" the item's inner state, so its heart and more button become reachable. Undecided, so A does nothing on the grid for now.

## Actions menu

Y opens RomM's existing game menu on the game under the cursor, so every surface shares one list of verbs. Verbs that can run in bulk act on `selected || active`, in that same menu. There is no second modal: a dialog opened from the menu lost controller focus.

## Why selections are cheap

**Source of intent:** the user: people constantly make new searches, so selections must be cheap to drop and cheap to remake. It would be a problem if multi-selection were in any way annoying.

So a bulk action can never touch a game you can't see, and the gestures carry the weight. Hold X with cruise selects long runs quickly, including games whose rows haven't loaded yet.
