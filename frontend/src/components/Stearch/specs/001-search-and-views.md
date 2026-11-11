# Spec 001: search, list and table on a fake API

**Status:** draft implemented; stories not yet run by an agent.
**Source of intent:** v4 spec sections 1 to 6 (`__perf_images/ui/v4-spec.md`), [DECISIONS.md](../DECISIONS.md).

## How specs work here

A spec says what must be true, not how. Each requirement has an ID and names what proves it. A requirement with no proof is not done. Change the spec first, then the code. `Open` items need the user, not a guess.

## Goal

Show the state design working end to end: real API-shaped objects enter through a validated seam, land in root state, and reach the list and table through selectors, with search dispatched as data.

## Out of scope

Virtualization, swarm, filter UI, the per-game menu, cover art, phone rows and grid, the real API, i18n of stub labels.

## Requirements

### Data

| ID  | Requirement                                                                                         | Proof                                                              |
| --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| D1  | The fake API has the call and return shape of `romApi.getRoms`, with full `SimpleRomSchema` objects | Typed in `Stearch.fake-api.ts`                                     |
| D2  | Responses pass through Zod, keep only picked fields, and are frozen                                 | `Stearch.schema.test.ts`                                           |
| D3  | Invalid data ends in `failed`, never a partial row                                                  | `Stearch.schema.test.ts` for the throw. Store path has no test yet |
| D4  | Root state types derive from API types, so a schema change fails the build                          | `satisfies` in `Stearch.schema.ts`                                 |

### State

| ID  | Requirement                                                | Proof                                           |
| --- | ---------------------------------------------------------- | ----------------------------------------------- |
| S1  | One `dispatch` of an action array is one transition        | `Stearch.reducer.test.ts`                       |
| S2  | A response from an older request is dropped                | `Stearch.reducer.test.ts`                       |
| S3  | Loading a later window keeps the identity of other windows | `Stearch.reducer.test.ts`                       |
| S4  | A new first window replaces all windows                    | `Stearch.reducer.test.ts`                       |
| S5  | A seeded story never fetches on mount                      | `Stearch.store.ts` `start()` guard. No test yet |

### Selectors

| ID  | Requirement                                    | Proof                       |
| --- | ---------------------------------------------- | --------------------------- |
| R1  | Rows carry the actions a press dispatches      | `list.selectors.test.ts`    |
| R2  | Toggling selection doesn't rebuild row actions | `Stearch.selectors.test.ts` |
| R3  | Unloaded rows are `null` slots                 | `list.selectors.test.ts`    |
| R4  | The rail derives from `char_index`             | `rail.selectors.test.ts`    |

### Views

| ID  | Requirement                                                                                        | Proof                                                            |
| --- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| V1  | Pure components hand actions back unchanged                                                        | `PressingHandsActionsBack` stories                               |
| V2  | List shows tiles; table shows sortable columns on `RTable`                                         | `ListView`, `TableView` stories                                  |
| V3  | Loading, empty and failed each render                                                              | `Stearch.container.vue` stories                                  |
| V5  | Any press on the view control swaps tiles and table, so repeated taps on `Table` go back and forth | `header.selectors.test.ts`, `PressingViewHandsActionsBack` story |
| V4  | Typing dispatches `search/set`, and results change after a debounce and a fake delay               | `SearchDispatchesAndReloads` story                               |

## Open

1. **Table rows while loading more.** The table shows loaded rows only, with no `null` slots. Should it match the list?
2. **Loading more.** A button stands in for scroll. Virtualization needs its own spec.
3. **Old results during a new search.** They stay visible, with pending slots after them. Should they clear?
4. **Sort control.** Table headers sort; the list has no sort menu yet, though v4 asks for one in the header.
5. **Swarm** stays in `StearchView` but isn't offered.
6. **Sort keys** are a guess at the first three columns. v4 lists more, and each must match a backend column.
