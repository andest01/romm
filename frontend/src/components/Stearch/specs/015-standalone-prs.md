# Spec 015: stand-alone, low-level PRs

**Status:** a backlog. Nothing here has been split out yet.
**Source of intent:** the user: small low-level changes to give out on their own, each useful without the rest of Stearch.

Each entry should stand alone: its own branch off `master`, its own proof, no dependency on another entry unless listed.

| ID  | PR                                                                             | Status in Stearch            |
| --- | ------------------------------------------------------------------------------ | ---------------------------- |
| P1  | Cover art shows the whole image: no cropping and no rounded corners            | Not done                     |
| P2  | `*.pure-layout.vue`: layouts take parts and place them, with a story per state | Built here, not extracted    |
| P3  | Layout lint: `pure-layout-parts`, `landmarks`, `no-visual-reorder`             | Built here, Stearch-only     |
| P4  | Tab-order stories as a layout proof, with focusable stand-in parts             | Built for two layouts        |
| P5  | `with_char_index` groups by a per-sort expression, for every sortable column   | Built, backend tests not run |
| P6  | `gamepad:buttonup`, the release edge to match `gamepad:buttondown`             | Built                        |
| P7  | Name the app nav landmark                                                      | Built                        |

## P1 detail

Art comes in many shapes, and cropping or rounding removes part of it. The rule applies to every surface that draws a cover: tiles, phone rows, phone covers and the existing gallery. The radii to remove in Stearch are in `tile.pure-component.vue`, `phone-row.pure-component.vue` and `phone-cover.pure-component.vue`. Showing a whole cover means choosing what fills the leftover space when its shape doesn't match the slot.
