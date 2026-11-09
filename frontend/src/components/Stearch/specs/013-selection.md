# Spec 013: selection

**Status:** S1 to S6 built. S7 and S8 are proposed.
**Source of intent:** the user: this is part of the heart of Stearch. X selects, Y is actions, B goes up one level and never changes data, and range selection goes through a menu.

Stearch is a file browser for games, so selection follows file browsers. Three things stay separate:

| Concept  | Meaning                     | State                   |
| -------- | --------------------------- | ----------------------- |
| Cursor   | Where the input is          | `activePosition` (view) |
| Current  | The game actions apply to   | `attention.activeId`    |
| Selected | The set a bulk action takes | `attention.selectedIds` |

## Requirements

| ID  | Requirement                                                                              | Proof                             |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------- |
| S1  | Moving never changes the selection                                                       | Separate state                    |
| S2  | X or Space flips the current game in or out of the selection                             | `list-input.ts`, needs a pad pass |
| S3  | Selection survives search, sort and filter changes                                       | Selection is ids, not positions   |
| S4  | B never changes data, so it never clears a selection                                     | Spec rule                         |
| S5  | Bulk actions appear only while something is selected                                     | `footer.pure-component.vue`       |
| S6  | A bulk action keeps the selection, so a second action can follow                         | `bulk-add.container.vue`          |
| S7  | Y opens actions: on the selection if the current game is in it, else on the current game | Proposed                          |
| S8  | Range selection is a menu action from an anchor, not a held chord                        | Proposed                          |

## Open

S3 means a selection can include games the current search hides. The footer count states the total, but should it say how many are hidden?
