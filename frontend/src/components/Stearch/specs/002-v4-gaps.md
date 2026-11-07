# Spec 002: gaps between v4 and Stearch

**Status:** first slice built; stories not yet run by an agent. Everything else is proposed.
**Sources:** `__perf_images/ui/v4-spec.md`, `v4-parity-audit.md`, spec 001.

Each gap names its owner: the one place the behaviour belongs. If a fix wants to spread past that, stop (see "Fixing a bug" in `AGENTS.md`).

Size: **S** selector or reducer change plus a small view change. **M** a new domain folder. **L** needs its own spec.

## A. Fixable now, no backend, no new concepts

| ID  | v4       | Gap                                            | Owner                                        | Reuse                                         | Size |
| --- | -------- | ---------------------------------------------- | -------------------------------------------- | --------------------------------------------- | ---- |
| A1  | 5.2      | `onSort` holds logic in a container            | table selector                               | `RTable`                                      | S    |
| A2  | 3.1      | No sort menu; the list view can't sort         | header selector, actions                     | `RMenu`, `sort/set`                           | S    |
| A3  | 3.1      | No Relevance sort while a term is typed        | query selector                               |                                               | S    |
| A4  | 8        | Selection bar has only Clear                   | footer domain                                | `SelectionBar` is too store-bound; use `RBtn` | M    |
| A5  | 8        | "Select all N results" missing                 | reducer, `rom_id_index`                      |                                               | S    |
| A6  | 5.1      | No matched-text highlight                      | row selector splits text; pure renders parts |                                               | S    |
| A7  | 5.1, 5.4 | Cover is a gray block                          | selector adds cover fields                   | `GameCover` or `RImage`                       | S    |
| A8  | 1        | Search isn't focused on arrival; `/` not wired | header pure autofocus                        | `focusFromInput`, `useGlobalHotkeys`          | S    |
| A9  | 5.2      | Table has 5 of 10 columns                      | `StearchRom` pick, table columns             | `RTable`                                      | S    |
| A10 | 3.2      | No pill row, not even collapsed                | header selector                              | `RChip`                                       | S    |
| A11 | 14       | Empty state has no clear action                | list selector actions                        | `REmptyState`                                 | S    |
| A12 | 14       | No back to top                                 | list domain                                  | `BackToTopButton`                             | S    |

## B. Worth doing, needs its own spec

| ID  | v4            | Gap                                                            | Why a spec                                                        | Size |
| --- | ------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- | ---- |
| B1  | 6             | Virtual list, heights, placeholders; "Load more" is a stand-in | Replaces how rows reach the DOM                                   | L    |
| B2  | 7             | Rail scrubbing, bubble, jump                                   | Depends on B1                                                     | L    |
| B3  | 4             | Filters: `+ Add a filter`, pills, Advanced panel               | State shape for 13 multi-selects                                  | L    |
| B4  | 4.1           | URL sync of search, sort, filters                              | Must match `useGalleryFilterUrl` so links keep working            | M    |
| B5  | 8             | Per-game menu, favorite, play                                  | Needs `useGameActions`, which is store-bound. A key port question | L    |
| B6  | 5.2           | Table expand row                                               | Height interaction with B1                                        | M    |
| B7  | 5.4, 5.5, 7.6 | Phone rows, photo grid, waypoint header                        |                                                                   | L    |
| B8  | 8             | Keyboard, shift-range, gamepad                                 | `useGridNav`, `useGallerySelectionInput`                          | M    |

## C. Blocked or deferred

| ID  | v4  | Gap                     | Blocked on                               |
| --- | --- | ----------------------- | ---------------------------------------- |
| C1  | 11  | Rail for non-text sorts | Backend bucket index                     |
| C2  | 11  | Live facet counts       | Backend                                  |
| C3  | 8   | Bulk status             | No endpoint                              |
| C4  | 5.3 | Swarm                   | Experiment, after everything else        |
| C5  | 6   | Real API swap           | Do after B1, so windows are tested first |

## First slice: approved

A1, A2, A5, A6, A7, A9. They close the most visible v4 gaps, each has one owner, and each gives `LESSONS.md` a data point on the cost of a change.

| ID  | Requirement                                                                                | Proof                                                 |
| --- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| A1  | Header clicks build `sort/set` in a selector-layer function; containers hold no sort logic | `table.selectors.test.ts`                             |
| A2  | The header sort menu offers every sort key; pressing the active key flips direction        | `header.selectors.test.ts`, `SortMenu` story          |
| A5  | "Select all" selects every result by `rom_id_index`, and hides once all are selected       | `footer.selectors.test.ts`, `Stearch.reducer.test.ts` |
| A6  | Matched text is marked in titles and file names                                            | `Stearch.selectors.test.ts`                           |
| A7  | Rows show a local cover, else the remote one, else the gray block                          | `Stearch.selectors.test.ts`                           |
| A9  | The table shows nine data columns; select and actions wait for B5                          | `Stearch.selectors.test.ts`                           |

## Items and types

| ID  | v4  | Requirement                                                                                   | Proof                                  |
| --- | --- | --------------------------------------------------------------------------------------------- | -------------------------------------- |
| I1  |     | A row is the API rom plus derived fields, so a new field needs only the state type and schema | `ListRow` in `list.props.ts`           |
| I2  | 5.1 | `tile`: 56px, text first, 28x42 cover                                                         | `tile.pure-component.vue` story        |
| I3  | 5.4 | `phone-row`: 52px, 26x38 cover                                                                | `phone-row.pure-component.vue` story   |
| I4  | 5.5 | `phone-cover`: 2:3 cover, title over it, platform and year under it                           | `phone-cover.pure-component.vue` story |
| I5  | 5.2 | Table `row`: fixed 30px, sits on `RSortHeader`, reports hover, ready for virtualization       | `row.pure-component.vue` story         |
| I6  | 6   | List and table stories are about the items: a count slider from 0 to 1000                     | `Playground` stories                   |
| I7  | 6.3 | `null` renders each item's own gray silhouette                                                | item stories, `isPlaceholder` control  |

## Layout

| ID                                                                                                    | Requirement | Proof |
| ----------------------------------------------------------------------------------------------------- | ----------- | ----- |
| Props are the interface's states. Each maps to one `data-` attribute, and CSS owns everything visual. |

| ID  | Requirement                                                                                                                                                                                               | Proof                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| L0  | The layout takes parts as component props: `header` and `panel` are required, `content`, `footer` and `background` are nullable. It holds no logic and knows nothing about what they are                  | `Stearch.layout-props.ts`                        |
| L0a | At app level there is one `content`, meaning items plus scroll. How it breaks down stays behind `content.container.vue`                                                                                   | `Stearch.container.vue`                          |
| L1  | `isPanelShown` is visibility; `panelAxis` plus `panelPosition` (`start`, `end`) reach all four edges                                                                                                      | `Stearch.layout-props.ts`, `Playground` controls |
| L2  | The panel stays mounted, keeps its state, and slides by `transform` alone                                                                                                                                 | `Playground`, `isPanelShown` control             |
| L3  | Content space changes once and is never animated (v4 section 2)                                                                                                                                           | `Playground`                                     |
| L4  | At `xs` the panel overlays the entire layout, as in v4's iPhone SE sheet, sliding in from its configured edge. From `sm` up it sits in the layout beside the content. Closing is not the layout's concern | `Playground` at phone and tablet viewports       |
| L7  | The background is its own domain. A new image cross-fades, and `null` fades to nothing. No blur, per v4's performance budget                                                                              | `background.pure-component.vue` story            |
| L8  | Hovering a list row dispatches its `hoverActions`, which change the background                                                                                                                            | `Stearch.selectors.test.ts`                      |
| L5  | A closed sidebar can't take focus, and it isn't announced                                                                                                                                                 | `inert` and `visibility` in `Stearch.layout.vue` |
| L6  | `prefers-reduced-motion` removes the slide                                                                                                                                                                | `Stearch.layout.vue`                             |

## Second pass: still open (2026-11-06, from reading the code, not a browser)

| ID  | v4       | Gap                                                                                                                                | Size |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---- |
| G1  | 3.1      | Debounce is 200 ms; v4 says 300                                                                                                    | S    |
| G2  | 1, 8     | Search isn't focused on arrival; `/`, `Esc`, `Ctrl/Cmd+A` not wired                                                                | S    |
| G3  | 14       | Empty state has no clear action (A11)                                                                                              | S    |
| G4  | 14       | No back to top (A12)                                                                                                               | S    |
| G5  | 5.5      | `xs` now shows `phone-cover`, so `phone-row` is unreachable; v4 offers both. Row height now follows the list's width, as in v4 6.2 | S    |
| G6  | 3.1      | Sort menu lacks Relevance, Group by and Versions                                                                                   | M    |
| G7  | 4.2      | Panel header lacks the active count and Save                                                                                       | S    |
| G8  | 8        | Footer lacks "Save search as smart collection"                                                                                     | S    |
| G9  | 8        | Selection bar has only Clear; no Favorite, Collection, Download, Refresh, Delete (A4)                                              | M    |
| G10 | 4.1      | No URL sync, so a search can't be linked or restored (B4)                                                                          | M    |
| G11 | 7.4      | Rail scrubs on press and drag, sized by share, beside a rightmost scrollbar. No bubble yet                                         | M    |
| G12 | 7.6      | The section band shows at every size, with label, count, Select, Prev and Next. Letter headings sit in the list and push the band  | M    |
| G13 | 5.1, 5.2 | No ♡, ⋯, status dot or versions badge on items; no table select or expand (B5, B6)                                                 | L    |
| G14 | 8        | No shift-range or long-press selection (B8)                                                                                        | M    |
| G15 | 6.3      | No scrub skeletons: placeholders mean unloaded, not moving fast                                                                    | M    |

The background part is off, which matches v4 section 10's flat surface. `background/` stays, one line from back on in `Stearch.container.vue`.

## Open

1. Spec 001 open items 1, 3 and 6 still stand.
2. A5: does "Select all" keep v4's cap of 10,000?
3. Does a new search keep the selection?
4. B5: should the per-game menu reuse `useGameActions` as is, inside a container? I'd say yes. It tests how well the two worlds meet.
