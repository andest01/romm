# /search v4: build specification

Status: design complete as an interactive mock-up ([search-designs-v4.html](search-designs-v4.html), renders in `png-v4/`). Nothing here is built in the app. Everything is scoped to the `/search` route and the v2 frontend. This document is the contract for turning the mock-up into pull requests.

## 0. Layout decision (settled first)

**Layout A.** Three regions on one named-area grid: a **header band** on top, a **content** area (the list and the rail on its scrollbar) and an optional **sidebar** that holds the Advanced-mode panel. One **slim footer** keeps the count, "Select all", "Save search" and becomes the selection bar when anything is selected. On a phone the sidebar is a full-screen sheet and the footer stays.

Considered and not chosen: a master/detail split with an inspector on the right (good for triage, but it takes the width the table needs), and a permanently visible filter column (fewest clicks to filter, least room for results). The inspector remains a possible later layout behind the same slots. Folding the footer into the header was rejected because the top is the premium space.

Reading order: 1 principles, 2 layout, 3 header, 4 filters, 5 views, 6 virtual list, 7 the rail, 8 actions, 9 phone, 10 performance, 11 backend dependencies, 12 build plan, 13 open decisions.

---

## 1. Principles

1. **Search is the front door.** Landing on `/search` is intent. The field is first, always on screen, and focused (touch included, on this route only).
2. **Facts over ink.** Names, platform, year, size, filename and badges come first; cover art takes the back seat. The one exception is the phone grid, which exists to show many covers at once.
3. **Known sizes, no repack.** Every row, tile and header has a fixed height from a token. Column counts come from the breakpoint, never from a ResizeObserver. Nothing re-flows after it paints.
4. **One state, many surfaces.** Pills, the Advanced panel, the rail and the swarm all read the same stores (`galleryFilter`, `galleryRoms`, `gallerySelection`). Changing one updates the others.
5. **Parity first, then tweaks.** Every feature of today's gallery is kept or consciously changed (section 14). Tweaks are listed so they can be vetoed.
6. **Space is premium at the top.** One header band, two rows, and the second row collapses when empty.
7. **One gesture across inputs.** Mouse, touch and pen all press-and-drag; the keyboard has equivalents; the gamepad works through the existing "everything is keyboard" model ([frontend/AGENTS.md](../../frontend/AGENTS.md), `frontend-v2-input`).

Fig. 1.1, the whole page at desktop width, header band over a list, rail on the right edge:

```
+--------------------------------------------------------------------------+
| [ search ........ 601 results ] [+ Add a filter] Advanced mode  [Sort] [View] |  row 1, always
| [pill] [pill] [pill] Clear all                                             |  row 2, only with filters
+--------------------------------------------------------------------------+
| list (virtualized)                                                   | rail |
|                                                                      | bars |
+--------------------------------------------------------------------------+
| 601 games   Select all 601 results   Save search as smart collection       |
+--------------------------------------------------------------------------+
```

---

## 2. Layout: one grid, four named areas

The page is a single CSS grid with named areas filled by Vue slots. The sidebar is optional and can dock left, right or be absent.

```vue
<SearchLayout dock="left | right | none">
  <template #header>   search field, count, add-a-filter, sort, view toggle, pills
  <template #sidebar>  the filter panel (only rendered when dock is not "none")
  <template #content>  tiles | table | swarm, plus the rail
  <template #footer>   counts, select all, save search, or the selection bar
</SearchLayout>
```

```css
.search-layout[data-dock="left"] {
  grid-template-columns: 25% minmax(0, 1fr);
  grid-template-areas: "sidebar header" "sidebar content" "sidebar footer";
}
.search-layout[data-dock="right"] {
  grid-template-columns: minmax(0, 1fr) 25%;
  grid-template-areas: "header sidebar" "content sidebar" "footer sidebar";
}
.search-layout[data-dock="none"] {
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "header" "content" "footer";
}
```

Rules

- Layout switches use the `data-bp` attribute on `<html>`, never raw `@media` ([frontend-v2-input](../../.claude/skills/frontend-v2-input/SKILL.md), lint rule `romm/no-layout-media-query`). Conditional mounting uses `useBreakpoint()` refs.
- The sidebar docks left at 25% width on `md` and up. Below `md` it is a full-screen sheet.
- The sidebar slides in with a **transform only**. The grid columns change once; they are never animated (animating them re-laid out 9,000 nodes per frame, 67 ms worst frame; transform-only gave 33 ms).
- Gutters use `var(--r-row-pad)`. Touch targets are `var(--r-touch-target)` at `sm` and below.
- AYN Thor is two viewport presets (top 1920x1080 `xl`, bottom 1240x1080 `md`, [rommViewports.ts:26-32](../../frontend/.storybook/rommViewports.ts#L26-L32)). No dual-screen API; each screen is a normal tier.

Where it lives today and what it replaces: `Search.vue` renders `GalleryShell` with a title row and a half-width toolbar field ([Search.vue:41-60](../../frontend/src/v2/views/Gallery/Search.vue#L41-L60), [GalleryToolbar.vue:272-290](../../frontend/src/v2/components/Gallery/GalleryToolbar.vue#L272-L290)). The new `SearchLayout` is used by `/search` only; Platform and Collection keep `GalleryShell`.

---

## 3. The header band

### 3.1 Row 1 (always)

| Element          | Behavior                                                                                                                                                                                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search field     | Takes the free space. Placeholder "Name, filename, hash...". Live count ("601 results") inside the field on desktop; on the phone the count lives in the footer. Debounced through `useDebouncedSearch` (300 ms), writes `galleryFilter.searchTerm`, mirrored to `?search=` by `useGalleryFilterUrl`. |
| `+ Add a filter` | Dashed tinted pill. Opens a searchable menu of every field, grouped Properties / Platforms / Tags / Game length. Choosing a field adds a pill and opens its value list. Closing an empty new pill removes it.                                                                                         |
| `Advanced mode`  | Underlined text link. Toggles the sidebar (desktop) or the full-screen sheet (phone). Bold with a solid underline while open.                                                                                                                                                                         |
| Sort             | `⇅ Sort by Name ↑`. Menu: Sort by (Relevance only while a term is typed, Name, Platform, Size, Added, Released, Rating, Length, Region), Direction (hidden under Relevance), Group by (Flat, A to Z), Versions ("Group versions of a game").                                                          |
| View toggle      | Segmented Tiles / Table / Swarm with icon and label (icons only on the phone). Top right.                                                                                                                                                                                                             |

### 3.2 Row 2 (collapsed at rest)

Holds only the filter pills and "Clear all". With no filters it does not exist, so results start directly under row 1.

### 3.3 Pills (deliberately simple)

- A pill shows `Label: value` and an `x`. Click edits, `x` removes.
- Property pills are tri-state in the panel but binary here: click flips "only" and "exclude" ("Favorite" / "not Favorite", red).
- Multi-select pills open a searchable checkbox list with `Clear` and a solid `Done` in the popup header (no footer row).
- Logic (any, all, none) is **not** editable on a pill. A pill created in Advanced mode shows it in words: `Genre: all of Action, RPG`, `Status: not Hidden`.
- Everything must work on a 320 px phone: the pill row scrolls horizontally on one line.

Fig. 3.1 `header-filtered`, `header-plus-open`, `header-pill-editing` (in `png-v4/`).

### 3.4 Platform pill (the hard one)

Platforms are a long list, picked several at a time, found by name.

- Popup header: `Find a platform` field, `Clear`, `Done`.
- Selected platforms appear as removable chips and float to the top of the list.
- Rows: color dot, name, game count, 10 px padding on phones (sturdy taps). Sort toggle "Most games" / "A to Z".
- The pill shows up to three platform dots and `Platform: Name` / `Platforms: Name +N`.
- Counts are totals per platform, not live with other filters (live counts need the backend, section 11).

---

## 4. Filters

### 4.1 State

No new filter model. Everything reads and writes `galleryFilter` ([stores/galleryFilter.ts](../../frontend/src/stores/galleryFilter.ts)): `searchTerm`, the boolean tri-states, `selectedPlatforms`, the 13 multi-select arrays with their logic operators, and the game-length range. URL sync stays in `useGalleryFilterUrl` so existing links keep working.

### 4.2 Advanced mode is today's drawer, docked

[FilterDrawer.vue](../../frontend/src/v2/components/Gallery/FilterDrawer.vue) is reused, not rewritten. Required parity: 11 tri-state properties, the platform multi-select (Search/Collection only), 13 searchable multi-selects each with any/all/none, game length with the HLTB note, active-count tag, Save as smart collection, Reset.

Changes to the drawer when docked:

- Header becomes `Filters [n]  ↺ Reset  [Save smart collection | Save]  ✕`. Reset moves up from the footer; the label shortens to "Save" when the sidebar is under 340 px (container query on the sidebar, not a media query); a round ✕ closes it.
- The footer row is removed (the panel gets one more row of room).
- The drawer stays implicit-apply: no Apply button.

Pills and panel are two views of one store; there is no sync code.

---

## 5. Views

### 5.1 Tiles (desktop and tablet): text first

Fixed height 56 px, row stride 62 px (6 px gap). Four columns at full width, three beside the sidebar (set by breakpoint and dock, not measured). Contents: 28x42 cover at the back, name (with versions badge and status dot), `Platform · Year · Size` plus region and language chips, filename in mono. Right edge: always-visible ♡ and ⋯. Matched text is highlighted with `<mark>` in the name and filename.

### 5.2 Table (desktop and tablet)

Fixed 30 px rows, sticky header, ten columns plus select and expand.

| Column    | Width (fr) | Sortable        | Notes                                              |
| --------- | ---------- | --------------- | -------------------------------------------------- |
| select    | 3          | no              | circle checkbox on hover or in selection mode      |
| Title     | 24         | yes             | cover chip 18x26, name, versions badge, status dot |
| Platform  | 10         | yes             |                                                    |
| Size      | 7          | yes             | right aligned, mono                                |
| Added     | 9          | yes             |                                                    |
| Released  | 8          | yes             |                                                    |
| Rating    | 7          | yes             | `★ 4.2`, em dash when none                         |
| Length    | 6          | yes             | `12.4 h`                                           |
| Languages | 8          | no              | chips                                              |
| Regions   | 7          | **yes (tweak)** | the real list shows it display-only                |
| actions   | 11         | no              | ♡, ⋯, chevron                                      |

Header cells never wrap (`white-space: nowrap`), so `RATING ↓` stays on one line. The chevron expands a 46 px detail row (metadata sources, filename, time to beat), which the layout accounts for.

### 5.3 Swarm (new third layout)

A canvas with one dot per game, circle-packed into platform clusters (cluster size from `Platform.rom_count`, [platform.py:83](../../backend/models/platform.py#L83)), colored by platform. Search and filters dim non-matches so matches light up in place; hover shows the game; box select is a follow-up. It is the zoomed-out end of a future density slider (dots, mosaic, tiles, rows). First version is UI only and colors by platform. Coloring by genre or year needs per-rom data the id index lacks (section 11).

### 5.4 Phone rows (iPhone SE, 320 px)

Fixed 52 px: 26x38 cover, name with badges, `Platform · Year · Size` with chips, ♡ and ⋯. Tapping the cover toggles selection.

### 5.5 Phone grid: the "photo feed"

Only on the phone. Five columns, covers 2:3, no separate title line: the **title sits over the bottom of the cover** (7.5 px, bold, three lines, on a dark gradient) and the **single line under each cover is a 13 px platform badge plus the release year**. Status dot and versions badge top left, ♥ for favorites, ⋯ top right (always visible on touch). Measured: **20 games fully visible at once on the 320x568 frame, against 8 in the rows view**. Favorite lives in the ⋯ menu here.

Fig. 5.1 `tiles`, `table`, `swarm`, `phone` in `png-v4/`.

---

## 6. The virtual list

The mock-up proves the approach; the app already has a windowed scroller, so the build reuses it ([RVirtualScroller.vue:1-40](../../frontend/src/v2/lib/structural/RVirtualScroller/RVirtualScroller.vue#L1-L40), per-item heights via `getItemHeight`).

### 6.1 Model

Items are laid out as numbers first. A `plan` holds rows `{ y, h, items }` and `bucketY[n]` (the y of each rail section). Only rows within the viewport plus an overscan (520 px) become DOM, positioned absolutely at their `y`.

```js
const plan = planVL(list, hostWidth); // rows, total height, bucketY, cols
host.style.height = plan.total + "px"; // the scrollbar reflects the whole list
paintVL(); // render rows near the viewport only
```

### 6.2 Heights (tokens)

| Item             | Height                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| Desktop tile row | 62 (56 + 6 gap)                                                        |
| Table row        | 30 (+46 when expanded)                                                 |
| Section heading  | 28 desktop, 26 phone                                                   |
| Phone row        | 52                                                                     |
| Phone grid row   | `tileWidth * 1.5 + 17 + 4`, where tileWidth = (hostWidth - 4 gaps) / 5 |

### 6.3 Placeholders

While scrubbing, the visible rows draw as **flat gray skeletons that keep the silhouette**: a gray cover block, two or three bars of varying width, and a gray ♡ and ⋯ (phone grid: a gray cover with a gray ⋯ and one bar). No random colors, no shimmer. About 140 ms after movement stops, they swap to real rows with one 140 ms fade (the only animation). Trigger: scroll delta over 110 px per frame, or dragging the rail.

### 6.4 Interaction with the rest of the page

- Row clicks are handled once on the scroller by event delegation (selection box, cover, ♡, ⋯, menu actions, chevron, row).
- Section jumps, the current-section highlight and the phone header compute from `bucketY` and `scrollTop`, never from DOM lookups.
- Selection, favorites and expand state live in stores; changing them repaints the window.

Fig. 6.1 `ph-tiles`, `ph-table`, `ph-phone` (placeholder states) are generated by the `ph.mjs` scratch script; export them with the figure script when the build starts.

---

## 7. The rail: a power scroller

### 7.1 What it is

A sort-aware axis beside the scrollbar, and also a histogram: each bucket is a bar whose height is its share of the games. The thumb tracks the viewport. It replaces and generalizes the A to Z strip.

### 7.2 Geometry

- It spans **exactly the scrollbar track**: top and bottom are inset by the scrollbar's arrow buttons (`--sb`, measured from `offsetWidth - clientWidth`), and it sits to the left of the scrollbar, which remains the rightmost element. With overlay scrollbars (touch, macOS) `--sb` is 0 and it spans the full height.
- It lives in its own wrapper beside the scroller, not over it. Rows and the sticky header are padded clear by `--rail-w`.
- Width: 26 px on the phone; on desktop `max(38, longestLabel * 6.6 + 20)` px.

### 7.3 Buckets follow the sort

| Sort      | Buckets                                                  | Rail bar                   |
| --------- | -------------------------------------------------------- | -------------------------- |
| Name      | first letter (`#` for non-letters)                       | the letter                 |
| Platform  | platform                                                 | platform badge (renderer)  |
| Size      | `<100 MB`, `<500 MB`, `<1 GB`, `<2 GB`, `<5 GB`, `5 GB+` | text (phone: tooltip only) |
| Added     | month and year                                           | `Oct 26`                   |
| Released  | year                                                     | `1984`                     |
| Rating    | whole stars, plus "none"                                 | `★★★★`                     |
| Length    | `<5h`, `5-10h`, `10-25h`, `25h+`, none                   | text                       |
| Region    | region                                                   | region chip (renderer)     |
| Relevance | none                                                     | no rail                    |

Only buckets that have games exist, so "Next" skips empty letters.

### 7.4 Gesture (the same on every input)

- **Press and drag anywhere on the rail scrubs the whole list:** top of the rail is the top of the list, bottom is the end. Tested with synthetic pointer events: 50% at the midpoint, 100% at the bottom edge, on name, released and size sorts.
- A **bubble** beside the pointer names the section and progress: `L · 70 games · 50%` (platform: badge and full name).
- **Taps glide** with `scrollTo({ behavior: "smooth" })` for jumps from Prev/Next; drag and slide use instant scrolling so content keeps up with the finger. `prefers-reduced-motion` turns the glide off. No URL fragment is involved.
- Pointer events with `touch-action: none` on the rail and pointer capture, so one code path serves mouse, touch and pen.

### 7.5 Renderer registry (a feature on its own)

Each sort kind may supply three renderers; absent ones fall back to plain text.

```js
const RAILR = {
  plat: {
    icon: true,
    bar: (b) => sysBadge(b.meta.p),
    title: (b) => PLATFORMS[b.meta.p][0],
    bubble: (b) =>
      `${sysBadge(b.meta.p, true)}<b>${PLATFORMS[b.meta.p][0]}</b>`,
    sect: (b) => `${sysBadge(b.meta.p)} ${PLATFORMS[b.meta.p][0]}`,
  },
  reg: { bar: (b) => flagChip(b.label), bubble: (b) => bigFlag(b.label) },
  rating: { bar: (b) => "★".repeat(+b.key), title: (b) => b.key + " stars" },
};
```

In the app the platform renderer uses the real platform icon component (`PlatformIcon`). Candidates not yet drawn: Added (month names with year breaks), Size (a fill bar per band), Length.

### 7.6 Phone waypoint header

A single sticky full-width line (about 26 px, 12 px text, same size as "Advanced mode") at the top of the list: `A · 31 games · Select · ‹ Prev · Next ›`. It uses the same buckets as the rail.

- **Select** toggles: it selects every game in the current section and becomes **Deselect** when all are selected.
- **Prev / Next** glide to the neighboring section (Prev at the first section goes to the top).
- Hidden on the swarm and when there is no rail (Relevance).

Fig. 7.1 `rail-released`, `rail-added`, `rail-size`, `rail-rating`, `rail-platform`, `rail-region`, `letters-tiles`, `letters-table` in `png-v4/`.

---

## 8. Selection and actions

Parity with `SelectionBar` and `useGallerySelectionInput` ([SelectionBar.vue](../../frontend/src/v2/components/Gallery/SelectionBar.vue)).

- Circle checkbox on every tile/row (visible on hover or in selection mode). **Shift-click** selects a range, **Ctrl/Cmd-click** toggles, plain click toggles once a selection exists. Not drawn: touch long-press and drag-paint (carry into the build).
- **Selection bar** replaces the footer: `N selected  ♥ Favorite  + Collection  ⬇ Download  ⟳ Refresh  ✕ Delete  Clear`. Labels collapse to icons on the phone, "N selected" collapses to "N". Not drawn: bulk status.
- **Per-game menu (⋯):** Select, Play, Download, Add/Remove favorite, Manage collections..., Copy download link, Set status..., Refresh metadata, Edit, Match..., Delete.... Bottom sheet on the phone. Permission gating via `useCan(action, scope)`; destructive items use the existing confirm dialogs ([GameActionsList.vue](../../frontend/src/v2/components/GameActions/GameActionsList.vue), [useGameActions](../../frontend/src/v2/composables/useGameActions/index.ts)).
- **Manage collections dialog** is the existing `ManageCollectionsDialog` (accepts many roms; `POST /collections/{id}/roms` takes a list of ids).
- **Footer actions:** "Select all N results" (existing `useGallerySelectAll`, capped at 10,000) and "Save search as smart collection" (existing `CreateSmartCollectionDialog` and `smartCollectionCriteria.ts`, which already maps `search_term`).
- **Keyboard:** `/` focuses search ([useGlobalHotkeys](../../frontend/src/v2/composables/useGlobalHotkeys/index.ts)), `Esc` closes in the order menu, then selection, then search, `Ctrl/Cmd+A` selects all. Keys are claimed per the claim rule.

---

## 9. Phone (iPhone SE, 320 px) summary

Header: row 1 search plus the three view icons; row 2 `+ Add a filter`, `Advanced mode`, sort icon; row 3 pills on a scrolling line. Advanced mode opens as a full-screen sheet with `Done`. Pill pickers open as bottom sheets. Lists: phone rows or the 20-at-once photo grid. Rail: 26 px proportional scrubber with a bubble. Sticky waypoint header. Footer: `601 games · Select all 601 results` (the "save search" link is hidden at this width and stays in Advanced mode).

Fig. 9.1 `phone`, `phone-selection`, `phone-menu`, `phone-sort`, `phone-se-*` (v3).

---

## 10. Performance

Measured in a headless browser without a GPU on a 601-game mock library; treat as ratios.

| Measurement                       | Before virtualization | After |
| --------------------------------- | --------------------- | ----- |
| Render the tile grid              | 203 ms                | 15 ms |
| Render the table                  | 314 ms                | 25 ms |
| DOM nodes                         | 9,209                 | 1,550 |
| Typing six keys                   | 220 ms                | 57 ms |
| Worst frame opening Advanced mode | 67 ms                 | 33 ms |

Budgets for the build:

- Window render under 20 ms for 150 rows on a mid phone.
- No layout work proportional to total results during scroll.
- No full-viewport blur or `backdrop-filter` on this route (the art backdrop is replaced by a flat surface: `.r-v2-bg` art off, `setBgArt` a no-op here, toolbar `backdrop-filter` removed).

---

## 11. Backend dependencies (the UI-only claim has limits)

The mock-up has all 601 games in memory. The app does not.

1. **Rail positions for non-text sorts.** The API returns `char_index` (first letter to offset) only for text columns ([endpoints/roms/**init**.py:576](../../backend/endpoints/roms/__init__.py#L576), [:703-704](../../backend/endpoints/roms/__init__.py#L703-L704), keys listed at [galleryRoms.ts:73](../../frontend/src/v2/stores/galleryRoms.ts#L73)). Rails for Released, Added, Size, Rating, Length, Platform and Region need a generalized bucket index: for the current sort key, bucket label to first offset and count. This is a backend change, one extra aggregate per bootstrap request, and it is the first thing to agree with maintainers.
2. **Live platform and facet counts** in pickers need counts under the current filters (`filter_values` has none today).
3. **Swarm coloring beyond platform** needs per-rom attributes in a compact form.
4. **Bulk status** has no endpoint (`PUT /roms/{id}/props` is single-rom).
5. **Ranking** of relevance is unchanged and out of scope.

---

## 12. Build plan (separate small PRs)

Each PR: a Storybook story (with `play()` where interactive), i18n keys in every locale (`check_i18n_locales.py`), tests, and the `review-polish` pass (both themes, `xs` to `xl`, Thor presets, mouse/touch/key/pad, screenshots from the running app).

| #   | PR                                                                                                                      | Notes                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Issue first (`rommapp/romm`, "Search: make `/search` search-first and data-dense", references #5206, does not close it) | CONTRIBUTING asks for an issue and Discord before larger changes. Draft in [issue-draft-search-first.md](issue-draft-search-first.md). |
| 1   | `SearchLayout` grid shell with slots and dock                                                                           | No behavior change; `/search` mounts it.                                                                                               |
| 2   | Flat surface on `/search` (no art blur)                                                                                 | Smallest visible win.                                                                                                                  |
| 3   | Header band: pinned field, count, `+ Add a filter`, sort menu, view toggle, pills                                       | Reuses `useDebouncedSearch`, `galleryFilter`, `useGalleryFilterUrl`.                                                                   |
| 4   | Advanced mode: dock the existing drawer, header with Reset, Save, close                                                 | Container query for the Save label.                                                                                                    |
| 5   | `GameIdentity` composite and the dense text tile                                                                        | Also removes the duplicated cell in `GameListRow`.                                                                                     |
| 6   | Table: ten columns, sortable Regions, expand row                                                                        | Fixed 30 px rows.                                                                                                                      |
| 7   | Virtual list on `RVirtualScroller` with the placeholder skeletons                                                       | Heights from tokens.                                                                                                                   |
| 8   | Selection bar and per-game menu parity on tiles and rows                                                                |                                                                                                                                        |
| 9   | The rail: text buckets (Name) first, generalized buckets after the backend index                                        | Pointer scrubbing, bubble, track-aligned geometry.                                                                                     |
| 10  | Rail renderer registry (platform, region, rating)                                                                       |                                                                                                                                        |
| 11  | Phone: rows, 5-column photo grid, waypoint header, Advanced sheet                                                       |                                                                                                                                        |
| 12  | Empty-query launch pad (platform chips, recent searches, Random game)                                                   | Optional.                                                                                                                              |
| 13  | Swarm view                                                                                                              | Behind its own flag until reviewed.                                                                                                    |
| 14  | Backend: generalized bucket index; then enable rails for other sorts                                                    | Separate PR with endpoint tests on both databases.                                                                                     |

Likely files: `views/Gallery/Search.vue`, new `components/Search/*`, `GalleryToolbar.vue` (autofocus opt-in), `GameListRow.vue`, `GameCard.vue`, `FilterDrawer.vue`, `useUISettings` (Advanced mode open state), new `useRail` and `useVirtualWindow` composables, locales.

---

## 13. Open decisions

1. Toolbar floating position (today a user preference): drop it or keep it as a setting.
2. Does Advanced mode remember open or closed per user (`useUISettings`)?
3. Regions sortable: keep the tweak or leave display-only.
4. Phone letter jump: keep the proportional scrubber, or also keep the real app's jump menu.
5. Rail on the left or right on desktop (mock-up: right, beside the scrollbar).
6. Backend bucket index shape and who owns the discussion with maintainers.
7. Swarm: ship, or keep as an experiment.
8. Heart column on the table: keep, move, or replace (undecided).

---

## 14. Parity audit

The full table is at the top of the mock-up page and in [v4-parity-audit.md](v4-parity-audit.md). Summary: restored sort, relevance order, group by, group versions, multi-select, bulk bar, per-game menu, favorite, badges, ten columns, row details, back to top, empty state, keyboard. Not drawable here: opening a game, windowed loading with real skeletons, scroll restoration, URL sync, reduced motion for the whole page, touch long-press and drag-select, bulk status, permission gating.

## 15. Verification for each PR

- Unit and component tests (Vitest, Storybook `play()` for the rail gesture, selection range, section Select toggle).
- Parity: for every control, the URL and the `GET /api/roms` request match the current gallery's for the same state.
- Visual: breakpoint sweep at 320, 390, 768, 960, 1366, 1920; AYN Thor top and bottom; both themes.
- Real scrollbars: a screenshot with scrollbars forced on, so the rail's alignment is checked (the figure script hides them by default).
- Measure the budgets in section 10 in a real browser with the dev server.

## 16. Artifacts

| What                | Where                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| Interactive mock-up | [search-designs-v4.html](search-designs-v4.html) (v1, v2, v3 kept beside it) |
| Renders             | `png-v4/` (and `png-v1`, `png-v2`, `png-v3`)                                 |
| Parity audit        | [v4-parity-audit.md](v4-parity-audit.md)                                     |
| Issue draft         | [issue-draft-search-first.md](issue-draft-search-first.md)                   |
| Figure export       | `../scripts/export-ui-designs.mjs` (`node ... v4`, run from `frontend/`)     |
| Phone tile counter  | `../scripts/count-phone-tiles.mjs`                                           |
