# /search v4: parity audit

What the real v2 gallery does today, what v1 to v3 of the mock-ups dropped, and what v4 puts back. Sources: `GalleryToolbar.vue`, `GalleryShell.vue`, `listColumns.ts`, `GameCard.vue`, `GameListRow.vue`, `SelectionBar.vue`, `GameActionsList.vue`, `FilterDrawer.vue`.

## Dropped in v1 to v3, restored in v4

| Feature                 | Real app                                                                               | v4                                                             |
| ----------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Sort axis and direction | Toolbar sort menu with direction, clickable list column headers                        | Sort menu in the header, clickable table headers               |
| Relevance order         | "Relevance" while a term is typed, no direction                                        | First sort entry once you type; direction hides under it       |
| Group by flat / A to Z  | Letter headings                                                                        | Group switch in the sort menu, letter headings                 |
| A to Z strip            | AlphaStrip (desktop)                                                                   | Strip on the right; letters with no games are greyed           |
| Group versions          | Siblings under one card with a count (`groupRoms`)                                     | Switch, a ⧉N badge, duplicates visible when off                |
| Multi-select            | Checkbox, shift-range, ctrl/cmd, Select all, Esc, Ctrl+A                               | Same                                                           |
| Bulk bar                | Favorite, collections, download, refresh, delete                                       | Same, labels collapse to icons on a phone                      |
| Per-game menu           | Play, download, favorite, collections, copy link, status, refresh, edit, match, delete | Same menu; bottom sheet on a phone                             |
| Favorite toggle         | Heart on the card                                                                      | ♡ on every tile and row                                        |
| Card badges             | Versions, play status, region and language flags, rating                               | ⧉N, status dot, region and language chips; rating in the table |
| Table columns           | Title, Platform, Size, Added, Released, Rating, Length, Languages, Regions, actions    | All of them, plus select and expand                            |
| Row details             | Chevron expands metadata sources                                                       | Detail row                                                     |
| Back to top             | Floating button                                                                        | Appears after scrolling                                        |
| Empty state             | Icon, reason, clear action                                                             | Message and "Clear search and filters"                         |
| Keyboard                | `/`, Esc, Ctrl/Cmd+A                                                                   | Same                                                           |

## Still not drawn (carry into the build)

- Phone letter-jump menu (AlphaJumpMenu).
- Long-press and drag-to-select on touch.
- Bulk status change.
- Permission gating of menu items (`useCan`).
- Opening a game on click (a toast stands in).
- Windowed loading with skeletons, scroll restoration, every control mirrored in the URL, reduced motion.

## Decision needed

- The user preference for a floating toolbar versus the header. The header band here replaces the toolbar; keep the preference or retire it.
- Whether "Advanced mode" remembers its open state per user (`useUISettings`) or always starts closed.

## Small tweaks made while restoring

- Sort lives in the header's top row, not in its own strip, so the bottom row of the header can still collapse at rest.
- Sort and Group share one menu; Group by A to Z forces Name ascending (letter headings only make sense there).
- The page count moved into the search field on a phone, as just the number.
- Property pills read "not Favorite" in place of a glyph, so the remove × is never doubled.
