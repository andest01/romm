# Debts and gaps

Known problems, for a stabilization run. First collected 2026-11-09 from an audit of Stearch against its own rules. Remove an entry when it's fixed.

## Performance

| #   | Where                              | Risk                                                                                             | Fix                                     |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------- |
| P1  | `store/attention.selectors.ts`     | `selectCurrentPosition` runs `ids.indexOf` on every step. A full scan at 100k games, unmeasured. | Memoize an id-to-position map on `ids`. |
| P2  | `store/primary-group.selectors.ts` | `selectAnnouncement` changes with scroll position, so its live region updates during a scroll.   | Announce when movement stops.           |
| P3  | `list-input.ts`, painting          | Each painted game dispatches, and `added` scans the selection. Quadratic over a long cruise.     | Batch, or keep the selection as a set.  |
| P4  | `roms_handler.py`, Platform sort   | Joins `platforms`, away from the `platform_id` index. Unmeasured on a large library.             | Measure, then consider a sort key.      |
| P5  | `with_char_index` buckets          | `CASE`, year and floor groupings scan the filtered set. Assumed similar to letters, unmeasured.  | Measure on a large library.             |

## Input

| #   | Where              | Problem                                                                                 |
| --- | ------------------ | --------------------------------------------------------------------------------------- |
| I1  | `use-key-focus.ts` | X and Y are another `window` listener, against "one owner per press". Needs the router. |
| I2  | `list-input.ts`    | `paint` is hidden state outside the machine, and doesn't reset if focus leaves.         |
| I3  | `use-key-focus.ts` | Y clicks another component's private class, `.r-game-btn--action-more`.                 |
| I4  | `list-input.ts`    | The key-position ring stays behind after a group jump, until the next press.            |
| I5  | Grid               | A does nothing. Open question in spec 013.                                              |

## Sort and buckets

| #   | Where                 | Problem                                                                                 |
| --- | --------------------- | --------------------------------------------------------------------------------------- |
| S1  | `table.selectors.ts`  | A table header drops later sort levels; the menu keeps them.                            |
| S2  | `table.container.vue` | Platform and Length are sorts, but their columns aren't sortable.                       |
| S3  | `rail.selectors.ts`   | The rail flattens values to text, against "same shape everywhere" (B7).                 |
| S4  | Backend               | New buckets have never run: the dev MariaDB has no `romm_test` login. Postgres untried. |
| S5  | Ratings               | Values above 100 are unexplained: seed data or the average.                             |

## Structure

| #   | Where                                                  | Problem                                                       |
| --- | ------------------------------------------------------ | ------------------------------------------------------------- |
| C1  | `bulk-add.container.vue`, `action-menu.container.vue`  | Add to collection exists twice, fetching collections twice.   |
| C2  | `saved-searches`, `action-menu`, `bulk-add` containers | Network calls and state live in containers, not the store.    |
| C3  | `use-key-focus.ts`, `action-menu.container.vue`        | `name ?? ""` and `title ?? ''` look like invented defaults.   |
| C4  | `saved-searches.pure-component.vue`                    | Its story fails; probably a text field inside a menu.         |
| C5  | Saved searches                                         | A load can't be undone, and deleted platforms aren't noticed. |

## Paper trail

| #   | Where                           | Problem                                                                        |
| --- | ------------------------------- | ------------------------------------------------------------------------------ |
| D1  | `LESSONS.md`                    | No entries for this stretch of work.                                           |
| D2  | `specs/011-filters-and-sort.md` | Status is stale, proofs say TBD, and Versions is still listed as open.         |
| D3  | `AGENTS.md`                     | Doesn't mention `results`, `region-heading`, `action-menu` or new store files. |
| D4  | `specs/015-standalone-prs.md`   | Duplicates `PR-SUGGESTIONS.md`, which already existed. Merge them.             |
| D5  | `stearch-a11y-waypoints.html`   | Fig. 1.2 draws Y as planned.                                                   |
| D6  | `eslint-rules/`                 | Our lint rules have no tests. `no-visual-reorder` has never fired.             |
| D7  | `rail.container.vue`            | Comments still say "letter".                                                   |
| D8  | Stories                         | Ten older failures remain; `Steps Never Leave Captured` is flaky.              |

## Bulk readiness

From `components/Gallery/SelectionBar.vue`. Stearch's selection holds ids, and painted games may not be loaded, so anything needing whole rom objects has a gap.

| Entry              | Bulk path today                                    | Needs       | Ready for ids alone?   |
| ------------------ | -------------------------------------------------- | ----------- | ---------------------- |
| Add to favorites   | `addRomsToCollection` on the favorites collection  | ids         | Yes                    |
| Download           | `romApi.bulkDownloadRoms`, one zip from the server | ids         | Yes                    |
| Manage collections | `ManageCollectionsDialog`, takes many              | rom objects | Only if all are loaded |
| Refresh metadata   | `showRefreshMetadataDialogBulk`                    | rom objects | Only if all are loaded |
| Delete             | `DeleteRomDialog`, takes many                      | rom objects | Only if all are loaded |
| Copy link, Install | None                                               |             | No                     |
| Match ROM, Edit    | Per-game by nature                                 |             | No                     |
| Refresh files      | None found in the selection bar                    |             | No                     |
