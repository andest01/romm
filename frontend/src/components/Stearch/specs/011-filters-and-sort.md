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

## Sort (proposed)

Add v4's menu first: Sort by, Direction, Group by. "Then by" needs `order_by` to accept a list, on both databases, plus the rail's bucket index.

## The rail (proposed)

The rail's major sections are the first sort key. With a second key, the section band or a fly-out lists that key's values inside the current section, as sub-page elements. Example: Sort by Platform, then by Name: the rail shows platforms, and inside SNES the sub-page shows letters.

## Open

- Is 100 hours the right top stop, and 5 the right step?
- Does the second sort key justify the backend work now?
- Should sub-pages be a fly-out from the rail, or live in the section band?
