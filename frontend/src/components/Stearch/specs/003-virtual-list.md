# Spec 003: virtual list

**Status:** built on the fake API; not seen in a browser.
**Source of intent:** v4 spec section 6.

## Requirements

| ID  | Requirement                                                              | Proof                                         |
| --- | ------------------------------------------------------------------------ | --------------------------------------------- |
| V1  | Results own the scroll; only visible rows reach the DOM                  | `RVirtualScroller` in list and table          |
| V2  | There is one slot per result, by position; unloaded positions are `null` | `list.selectors.test.ts`                      |
| V3  | Row heights and columns are known up front, never measured               | `rowHeightFor`, `columnsFor`                  |
| V4  | The visible range asks for every window it touches                       | `list.selectors.test.ts`                      |
| V5  | Scrolling can load several windows at once under one request id          | `Stearch.reducer.test.ts`, `Stearch.store.ts` |
| V6  | Tiles lose a column while the panel shows                                | `list.selectors.test.ts`                      |
| V7  | A pure story exercises 0 to 1000 items                                   | `Playground`                                  |

## Open

1. Placeholders use the shimmering `RSkeletonBlock`; v4 asks for flat gray and a 140ms swap after scrubbing.
2. `phone-cover` uses a fixed row height. v4 derives it from width, which needs a decision on measuring.
3. Scroll restoration is not built.
4. `selectSlots` and `chunkSlots` are `O(results)` on every rebuild. Not measured at 100k.
5. The real API must send `with_rom_id_index`, which the backend calls a full-library scan. The fake API can't show that cost.
