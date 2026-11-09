# Spec 012: waypoints and accessible navigation

**Status:** built. No real screen reader has run it yet.
**Source of intent:** the user, 2026-11-09: use layouts and lint so navigation and accessibility hold by construction. Figure: `__perf_images/ui/stearch-a11y-waypoints.html`.

## Rules

- Only a `*.pure-layout.vue` declares a landmark. Parts never do.
- Regions are named with `aria-labelledby`, never `aria-label`, pointing at a heading part.
- Tab order equals DOM order, with no scripted exceptions.
- Band controls come last.

## Requirements

| ID  | Requirement                                                                | Proof                               |
| --- | -------------------------------------------------------------------------- | ----------------------------------- |
| W1  | Landmarks only in layouts, labelled by a heading; no `header` or `footer`  | `stearch/landmarks`                 |
| W2  | CSS reordering in a layout names a story proving the Tab order             | `stearch/no-visual-reorder`         |
| W3  | Tab goes grid, rail, band in Tiles and Table                               | `TabOrderIsGridRailBand`            |
| W4  | Tab goes search, controls, pills                                           | `TabOrderIsSearchControlsPills`     |
| W5  | Enter on the grid opens the current game                                   | `list-input.test.ts`                |
| W6  | `/` focuses the Stearch search box while on Stearch                        | `header.driver.ts`, untested        |
| W7  | The app nav is named and is a waypoint                                     | `AppNav.vue`                        |
| W8  | A Filters skip link exists only while the panel is open                    | `skip-link.container.vue`, untested |
| W9  | Sort and group changes are announced politely                              | Needs a screen reader               |
| W10 | Closing Filters returns focus to what opened it, else the grid             | Needs a browser pass                |
| W11 | F6 and Shift+F6 cycle `data-waypoint` regions in DOM order, skipping inert | `waypoints.driver.test.ts`          |

## Waiving W2

Write `/* reorder-ok: StoryName */` directly above the declaration. The rule fails unless the layout's stories file exports `StoryName`, which must assert the Tab order the reorder produces.
