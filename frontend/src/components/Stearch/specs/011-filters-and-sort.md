# Spec 011: filters, sort and the rail

**Status:** the review is done. R1 to R3 are built. Everything under "Sort" and "The rail" is proposed.
**Source of intent:** the user, 2026-11-08: number inputs are control traps; use a slider that lets up and down leave; review v4's filter and sort thinking; unify keyboard and controller with drivers; the analog stick outside the grid should act like arrows.

## What v4 says

From `__perf_images/ui/v4-spec.md`:

- **Filters:** no new filter model. Pills and the Advanced panel are two views of one state, with implicit apply and no Apply button.
- **Sort menu:** Sort by (Relevance only while a term is typed, Name, Platform, Size, Added, Released, Rating, Length, Region), Direction, Group by (Flat, A to Z), and Versions.
- **There is no "Then by" in v4.** Neither the spec, the audit nor the design file has one. The nearest thing is Group by.
- **The rail follows the sort:** Name by letter, Platform by platform, Size in bands, Added by month, Released by year, Rating by stars, Length in bands, Region by region. Relevance has no rail. Only buckets with games exist.
- **Section band:** `A · 31 games · Select · Prev · Next`, using the rail's buckets.

## What the backend allows

- One `order_by` and one `order_dir`. A second sort key needs a backend change.
- `char_index` gives bucket offsets for text columns only. v4 lists a generalized bucket index as backend work, with its own PR.

## Range filter

| ID  | Requirement                                                                                        | Proof                                                 |
| --- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| R1  | A range is two sliders, 0 to 100 hours in steps of 5. The ends are open bounds. Min can't pass max | `SlidingHandsTheValueBack`, `buildRangeActions` tests |
| R2  | Up and down always leave a slider. Left and right adjust it, on keyboard and pad                   | `DownLeavesASlider`                                   |
| R3  | Outside the results, the stick acts as arrows. The list claims it only while it has focus          | `StickLeavesTheListWhenFocusIsElsewhere`              |

## Sort

Built: `query.sort` is a list of `{ param, dir }`, and only the first level reaches the API. One button states the sort and shrinks with the header: full, then short, then icon only, always named in full for screen readers. Its menu has Sort by and Direction. Versions (`groupByMetaId`) lives in the Advanced panel. Region isn't offered because the API can't sort by it, and v4's Flat or A to Z choice is left out.

Proposed: "Then by" needs `order_by` to accept a list, on both databases, plus the rail's bucket index.

## Sort fields and buckets (prototype: Name, Platform, Rating, Released, Added; Size and Length have no server buckets yet)

**Source of intent:** the user, 2026-11-08: one sort key should drive the rail, the stand-in-place marker and the sticky header, for every sort, with a simple visual unique to each group.

| ID  | Requirement                                                                                                                                | Proof |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| B1  | Each sort field is declared once: label, direction wording, default direction, key to visual. Menu, table headers and rail read that entry | TBD   |
| B2  | The rail, the marker and the sticky header draw the same bucket                                                                            | TBD   |
| B3  | The server defines the bands and returns `{ key: offset }`, the shape of `char_index`. The frontend never holds band edges                 | TBD   |
| B4  | A row's bucket comes from its offset against that index, not from its own value                                                            | TBD   |
| B5  | Empty values form an `Unknown` bucket, last in both directions                                                                             | TBD   |
| B6  | Versions leaves the sort menu. It changes which rows exist, not their order                                                                | TBD   |
| B7  | One root selector gives the primary group: field, buckets and current bucket. Consumers take the same shape and never branch on the sort   | TBD   |

| Sort     | Bucket                                                  | Visual       |
| -------- | ------------------------------------------------------- | ------------ |
| Name     | First letter, `#` for the rest                          | `A`          |
| Platform | Platform, ordered by display name                       | Name or icon |
| Released | Year                                                    | `1994`       |
| Rating   | Whole point                                             | `★ 7+`       |
| Size     | `<10 MB`, `10–100 MB`, `100 MB–1 GB`, `1–4 GB`, `4 GB+` | Label        |
| Length   | `<5 h`, `5–10 h`, `10–20 h`, `20–40 h`, `40 h+`         | Label        |
| Added    | Calendar month                                          | `Nov 2026`   |

Order of work: prove B1 to B5 against `Stearch.fake-api.ts`, then do the backend as its own PR. The sticky header in Tiles and Table, with its navigation controls and layout, is a separate spec that consumes B2.

Backend facts: `with_char_index` returns nothing for non-text columns. `roms` has no platform name column, and its index is `(platform_id, name_sort_key)`, so ordering by name needs a join or a new sort key.

## The rail (proposed)

The rail's major sections are the first sort key. With a second key, the section band or a fly-out lists that key's values inside the current section, as sub-page elements. Example: Sort by Platform, then by Name: the rail shows platforms, and inside SNES the sub-page shows letters.

## Open

- Where does Versions go: the filters, or Advanced?
- Platform by name: a join, or a new indexed sort key? Measure the join on a large library first.
- What scale does `average_rating` use? Whole-point buckets depend on it.
- Is 100 hours the right top stop, and 5 the right step?
- Does the second sort key justify the backend work now?
- Should sub-pages be a fly-out from the rail, or live in the section band?
