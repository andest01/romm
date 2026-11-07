# Spec 004: filters

**Status:** first slice built on the fake API, with Region and Language; not seen in a browser.
**Source of intent:** v4 spec sections 3 and 4.

Pills and panel are two views of one state, with no sync code.

## Requirements

| ID  | Requirement                                                              | Proof                                         |
| --- | ------------------------------------------------------------------------ | --------------------------------------------- |
| F1  | `query.filters` is the only filter state, keyed by `GetRomsParams` names | `Stearch.state-props.ts`                      |
| F2  | Options come from the API's `filter_values`                              | `selectFilterGroups`                          |
| F3  | The panel shows every option as a checkbox                               | `CheckingHandsActionsBack` story              |
| F4  | Chosen values become pills in a row that doesn't exist when empty        | `header.selectors.test.ts`, `WithPills` story |
| F5  | `+ Add a filter` offers values not yet chosen                            | `header.selectors.test.ts`                    |
| F6  | Any filter change reloads through the same debounce as search            | `Stearch.store.ts`                            |
| F7  | Clear all and Reset dispatch `filter/clear`                              | stories                                       |

## Adding a filter

Add its key to `StearchFilterKey` and a line to `FILTER_FIELDS`. Everything else follows.

## Open

1. v4 has 11 tri-state properties, 13 multi-selects with any, all and none, platforms, and game length. Only 2 multi-selects are built.
2. v4's `+ Add a filter` picks a field, then opens its value list. This slice lists values directly.
3. URL sync must match `useGalleryFilterUrl`.
