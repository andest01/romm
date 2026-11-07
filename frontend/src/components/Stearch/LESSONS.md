# Stearch lessons

The plan: build in this ideal setup, then port it to RomM conventions, and compare the two on evidence. This is the running record. `DECISIONS.md` says what we chose; this says what happened.

## Rules for this file

- Add an entry after every bug fix, feature change, design reversal or measurement.
- Record what happened, including when this approach lost. An honest loss is worth more than a win.
- Use real counts: files touched, lines changed, test results. Mark anything unmeasured as `not measured`. Never estimate the RomM side from memory; read the code or leave it blank.
- If a lesson changes how agents should work, also put it in `AGENTS.md`.

## What we're comparing

| Dimension        | Evidence to collect                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Performance      | Same library and scenario on `/stearch` and `/search`: render, typing, selection, memory |
| Type safety      | Bugs the compiler caught; bugs it missed; runtime checks needed                          |
| Bug fixing       | Files and lines to fix, and how fast the cause was found                                 |
| Feature changing | Files and lines to change behaviour                                                      |
| Testing          | What can be tested without a store, network or browser                                   |
| Cost             | Files per feature, dependencies, concepts to learn                                       |
| Portability      | What survives the port, and what has to be rewritten                                     |

## Scoreboard

Nothing here is settled until the RomM side has been measured.

| Dimension        | Stearch so far                                                    | RomM side    |
| ---------------- | ----------------------------------------------------------------- | ------------ |
| Performance      | not measured                                                      | not measured |
| Type safety      | Status union, `never` check and API-derived types are in place    | not measured |
| Bug fixing       | One entry below                                                   | not measured |
| Feature changing | not measured                                                      | not measured |
| Testing          | Reducer and selectors test with no store or browser               | not measured |
| Cost             | About 6 files per domain, plus Zod                                | not measured |
| Portability      | Not attempted. `shallowRef` and immutable state are the known gap |              |

## Entries

### 2026-11-06: tapping `Table` repeatedly didn't swap

- **Dimension:** bug fixing.
- **Result:** one selector returning one action array fixed it. Press routing also moved out of the container, because the draft had bypassed the design.
- **What went wrong:** the first attempt misread the report and built a per-view map across five files.
- **Lesson:** the design makes fixes small only if you use it. See "Fixing a bug" in `AGENTS.md`.

### 2026-11-06: opaque generic `T` on pure components, dropped

- **Dimension:** cost, type safety.
- **Result:** the generic made reading an action a compile error, but added `generic="T"` to every pure component and forced a `render` workaround in stories. We replaced it with `StearchAction`.
- **Trade:** a compile-time guarantee became a convention. Five pure components, their props and their stories got simpler, and stories now pass real actions.
- **Lesson:** a type trick has to earn its cost. Machinery that guards against something a plain rule covers is overbuilding.

### 2026-11-06: selector-built action arrays

- **Dimension:** feature changing.
- **Result:** changing what a button does means editing a list in a selector. Containers became one-line bridges.
- **Not yet shown:** this has only been exercised on small actions.

### 2026-11-06: the `!` and `??` audit, before Stearch

- **Dimension:** type safety.
- **Result:** clearing 81 `!` by swapping in `??` lowered the warning count without improving the logic. Restructuring removed most of them properly.
- **Lesson:** a lint count rewards the swap. The logic has to be right, not the number. Agent-disclosed work accounted for 72 of the 81 sites.

### 2026-11-06: first v4 gap slice (spec 002: A1, A2, A5, A6, A7, A9)

- **Dimension:** feature changing, type safety.
- **A5 select all:** one action, one reducer case, one selector field, one button. Each layer changed once, as designed.
- **A2 sort menu:** the selector builds every option and its actions, so flipping direction lives in one place. The view only loops.
- **A1 `onSort`:** the logic moved out of the container into `buildSortActions`, and the container's import of a gallery store went with it.
- **Type safety:** the seam caught a real mismatch. Zod's `.optional()` allows `undefined`, which the API type doesn't under `exactOptionalPropertyTypes`. `.exactOptional()` fixed it without widening anything.
- **A loss:** adding table columns meant touching the state type, schema, freeze list, fake API, row selector, list props, column list and template. A new field costs up to eight edits in this design. Zod and freezing each add one.
- **Also:** labels for the sort menu sit in a selector, not a container, which breaks rule 3 because each option's label depends on state. Revisit with i18n.

### 2026-11-06: layout stories and the phone sheet

- **Dimension:** testing, feature changing.
- **Result:** the phone sheet moved into layout CSS on `data-bp`, which removed `useBreakpoint` from the root container. Less JavaScript, and a viewport change alone now proves it.
- **Lesson:** a pure component that looks bad in a story is often telling the truth. The story exposed that the layout had no phone behaviour and a container was hiding it.

### 2026-11-06: layout props model states; demo controls were wrong

- **Dimension:** feature changing, testing.
- **What went wrong:** asked for better controls, I added colors, sizes and label settings to the story. They exercised nothing the component owns. They followed the letter of the control rules and missed the point: the layout's interface is where layout problems get solved.
- **Mistaken claims, now corrected:** "demo-only args are allowed when grouped" is withdrawn, and controls now map 1:1 to props. `dock` with `none` was also wrong, because it mixed the side with visibility, and that's why the sidebar couldn't animate.
- **Result:** `dock` plus `sidebarOpen`, each mapped to a `data-` attribute. The sidebar stays mounted and slides by `transform`, content space changes once, and the same two props drive the phone sheet. The story now has two controls and one job.
- **Lesson:** if a story needs decoration to feel useful, the props are probably wrong. Fix the model, not the story.

### 2026-11-06: panel placement in flexbox terms

- **Dimension:** feature changing.
- **Result:** `dock` became `isPanelShown`, `panelAxis` and `panelPosition`, in the user's design. Four edges come from two small props, using CSS logical properties. The layout has generic slots and no logic.
- **Open:** whether the layout should one day know its device profile as state. Today it reads `data-bp` in CSS.

### 2026-11-06: one breakpoint rule for the panel

- **Dimension:** cost, feature changing.
- **Result:** the phone and tablet options merged into one rule: `xs` overlays, `sm` and up sits in the layout. This deleted the special sheet behaviour, so the same props now apply at every size.
- **What went wrong:** I framed a tablet choice between two options, when the simpler answer was to split at a different breakpoint.
- **Bug caught on review:** `padding-block` percentages resolve against width, so block panels would have misaligned. No test caught it; only reading the CSS did. This is the kind of thing `play()` checks should cover once stories run.

### 2026-11-06: hover backdrop as a required, nullable prop

- **Dimension:** cost, testing.
- **RomM side (read from code):** `useBackgroundArt` keeps two refs, an active-layer flag and a dwell timer in a composable, and `GameCard`, `GameListRow`, `GameDetails` and `Stream` reach it through `inject`. Outside `AppLayout` it silently does nothing, so Storybook can't show it.
- **Stearch side:** one prop, one action, one reducer case, one selector field and a keyed `<Transition>`. No state in the layout, and a Storybook control drives it directly.
- **Trade:** the 80ms wait is a CSS delay, not a true dwell, so a fast cursor still mounts a layer per row. Hover also rebuilds no rows, but it isn't measured.
- **Scope:** list rows only. `RTable` has no row hover event.

### 2026-11-06: phone panel, and what the layout work taught

- **Dimension:** feature changing, cost.
- **Result:** the phone panel went from 85% to full, a two-value change in one CSS block, once v4 was consulted.
- **What went wrong:** I invented 85% from a loose phrase when v4 already answered it. The design source was open the whole time.
- **Cost of the layout loop:** the panel model took several rounds, each simpler: `dock` with `none`, then `sidebarOpen`, then axis and position, then one breakpoint rule. Every wrong round added machinery, and every right one removed it.
- **Layout rules that held:** states become props, props become `data-` attributes, CSS owns the visuals, and the layout holds no logic.

### 2026-11-06: story audit found our own bugs

- **Dimension:** testing.
- **Result:** container stories seed the store in `setup`, which runs once, so editing `state` in the controls likely does nothing. Most stories still use the default `centered` layout, the same flaw fixed on the layout story. Nothing has proved these stories in a browser.
- **Lesson:** a rule fixed in one file isn't fixed. After a lesson, sweep every file it applies to.

### 2026-11-06: rows are the API rom; items and rows got components

- **Dimension:** cost, testing, feature changing.
- **Result:** `ListRow` is `StearchRom` plus derived fields, so a new API field needs only the state type and schema to reach a `.vue` file. That addresses the "eight edits per field" loss for raw fields. Formatted fields still need a selector line.
- **Reversal:** `RTable` was dropped in Stearch. It renders every row itself, so it can't be virtualized or report hover. `RSortHeader` stayed.
- **Correction:** "controls map 1:1 to props" was too strict. A list's main control is how many items it has.

### 2026-11-06: the solve for layouts

- **Dimension:** cost, feature changing.
- **What went wrong:** my layout took `backgroundUrl`, so it owned an image and a cross-fade. I'd called the nullable prop a win when the prop itself was the mistake. The user's review gave it a C-.
- **Result:** the user's model: a layout takes parts as `Component` or `Component | null`, plus panel state. The background became its own domain, and the layout shrank.
- **Lesson:** a layout should never learn what its parts are. If a layout prop isn't a part or a layout state, it belongs in a part.
- **State:** also from review, types copied what views needed. The root state should model the job, as in `DECISIONS.md`, and things like the backdrop should derive from it.

### 2026-11-06: UI model, virtual list, filters

- **Dimension:** type safety, feature changing, cost.
- **Result:** state now models the job. `backdropUrl` and `total` became derived values. The compiler listed every use of the old shape, which is the lighthouse working. Adding a filter is one key and one line.
- **Cost:** the refactor touched nearly every file, including all container stories, because tests and stories spread old state literally. Shared fixtures would have reduced that.
- **Design change:** one request at a time couldn't serve scrolling, so a request id now covers a query and all its windows.
- **Fixed from the audit:** `renderContainer` replaced eight copied renders and watches the `state` arg. Not yet proven in a browser.

### 2026-11-06: the search object is the API's params

- **Dimension:** type safety, feature changing.
- **Result:** `query` is `GetRomsParams`, so calling the API needs no mapping. 24 fields are one line of data each. One preview type feeds pills, panel and menus.
- **Compiler win:** a full mapped union for `query/set` was too large for TypeScript to match. A cast would have compiled; grouping keys by value type kept every key checked.
- **Shortcuts avoided:** making multi-select params non-nullable in our model removed `?? []`. Rows carrying `position` removed `??` from `selectSlots`. An explicit `buildLabels` object removed a cast.
- **Limit:** the fake API only applies search, regions, languages and platforms. Other fields change state and pills, but not results.

### 2026-11-06: interface review of the search model

- **Dimension:** type safety, cost.
- **Result:** `FieldPreview` became a union by `kind`, so `range` stopped being nullable. Header props became five groups, and the container dropped to a bridge. The platform part moved from a pure component to a nesting `field-list.container`.
- **What went wrong:** I threaded a part through two pure components, when containers can nest. That's already in our design; I didn't use it.

### 2026-11-06: find the seam, not the side

- **Dimension:** portability, cost.
- **What went wrong:** I kept asking which option to pick, when the architecture already made most choices cheap. The user's point: having good options is a happy situation.
- **Result:** ten choices are now one-line swaps with ours as the default. Two seams were missing: items as parts, and full roms. `ItemPart<P extends ItemProps>` is a generic that earns its keep, because it limits what can be plugged in.
- **Lesson:** a generic that hides data was a cost. A generic that constrains a plug-in point is a leash.
- **Leash, tested with a throwaway file:** `ItemPart` rejected a component with the wrong props and an item missing `RowProps`. It accepted `RowPure` as a plain `ItemPart`, though the list wouldn't pass its extra props. So the leash has a hole, and emits were not tested.
- **Not proven:** no swap has been tried, and nothing has run in a browser. Selection's mirror effect is not written.

### 2026-11-06: first real swap, `GameListRow` as an item

- **Dimension:** portability, type safety.
- **Result:** one 15-line adapter, one test file, and one line each in `list.items.ts`, `ListItemKind`, `ROW_HEIGHT` and `COLUMNS`. The `Record` types made the compiler ask for the last two. Hover works because `GameListRow` forwards `$attrs`, so no shared code changed.
- **Leash:** the raw `GameListRow` is rejected, because it has no `row` prop. Whether a part with `row` that never emits `press` is rejected is still unknown.
- **A loss:** with `rom`, the row navigates on click, so `pressActions` never run, and it has no selection. The earlier hole didn't come up, since the adapter needs nothing beyond `ItemProps`.
- **Not proven:** mounted in unit tests with child components stubbed. Not seen in a browser or in the virtual list.

### 2026-11-06: clearing is data

- **Dimension:** cost, type safety.
- **Result:** the user's idea, in two steps. `query/set` now takes `Partial<StearchQuery>`, and a reset is a patch of `INITIAL_QUERY`. The eight-member `QuerySetAction` union and the reset case are gone, and each sort change is one action. `exactOptionalPropertyTypes` keeps the partial honest.
- **Trade:** a `{ [key]: value }` with a union key skips the value check, so `fields.selectors.ts` needs a small `patchOf` to keep it. "Clear all" needs one selector, and the sidebar's constant became a `computed`. Two call sites that built an action for one key got slightly longer.
- **Probe:** typos, wrong values and `undefined` in a patch are compile errors. `patchOf(triKey, "bogus")` is rejected, and the raw computed key isn't. Logic keys take any string, a gap in the generated params.

### 2026-11-06: verbs in one interface, and the real API

- **Dimension:** feature changing, portability.
- **Result:** `verbs` on `ItemProps` plus one container over the existing `GameActionBtn`. No new verb logic. The real `romApi.getRoms` replaced the fake with one call and four flags.
- **Loss:** not "one interface and a few type errors". `<component :is>` props aren't type-checked, so the compiler flagged only stories and tests, not the list, table or items. Every item root also had to change, because a verb can't nest in a `<button>`. About 20 files.
- **Not proven:** nothing has run against the backend. The seam may reject real data.

### 2026-11-06: first look at real data on a phone

- **Dimension:** bug fixing, cost.
- **Row height:** a fixed 104 px let each cover run under the next row and hid its text. It looked like z-index. v4 6.2 already gave the formula, and I had flagged the risk and shipped anyway.
- **Covers:** `GameCover` serves `srcset` only with `responsive`, and our items didn't pass it, so all sizes got the large file. No type or test catches a missed optional prop.
- **Page scroll:** the app shell reserves the bottom bar below 960 px, but the layout subtracted it only at `xs`, so tablet widths overflowed the document. It also used `vh`, which is taller than the visible phone screen. Two CSS rules in the layout fixed it, and `GalleryShell` already documented both traps.
- **Lesson:** a typecheck can't see a wrong height or a heavy image. Only the running page did. Read how the host sizes its pages before sizing a layout.

### 2026-11-06: named grid regions

- **Dimension:** cost, feature changing.
- **Result:** the user's call, and what v4 section 2 specified all along. Padding offsets became one `grid-template` per edge, so each placement reads as a picture. The change stayed inside `Stearch.layout.vue`. Props and stories are unchanged.
- **Lesson:** reach for named areas first. Four padding rules with a percentage trap became four templates, and the trap's comment went too. It's now a rule in `AGENTS.md`.
- **Not proven:** the grid doesn't fix page height, which still comes from the host. The panel stays absolute so it can slide. Not seen in a browser.

### 2026-11-06: parts fill their container

- **Dimension:** bug fixing.
- **Result:** the panel scrolled sideways because `1fr 1fr` in the range row refused to shrink below its inputs. The fix is `minmax(0, 1fr)` in that part, the sidebar filling its container, and the layout allowing vertical scroll only.
- **Lesson:** the user's rule, now in `AGENTS.md`: pure components aren't opinionated about size. Item heights such as 56px and 30px still break it, because the virtual list needs known heights.

### 2026-11-06: the section band

- **Dimension:** feature changing, cost.
- **Result:** v4's sticky waypoint became one domain above tiles and table. It stays put because it sits outside the scroller, so no `position: sticky`. `selectSections` now feeds both rail and band, and the rail selector shrank.
- **Cost:** two actions, one state field, one selector, one domain folder, and `content` became a named grid.
- **What went wrong:** I called Prev and Next blocked. The user expected selector-built actions, and that was right: `view/jump` is one action, and a small `useScrollerJump` carries it out. Containers reach the scroller through a function prop, so pure components keep no ref.

### 2026-11-06: the sidebar gets a layout

- **Dimension:** cost, feature changing.
- **Result:** `sidebar.layout.vue` takes header, body and footer parts, and the same rules apply at every scale. One `bar` pure component draws both verb rows from data, so moving a verb is one line in a selector. The body scrolls; the bars stay put.

### 2026-11-06: the scroll layout

- **Dimension:** feature changing, cost.
- **Result:** the user's idea. `content.layout.vue` separates the items from the band and rail, so the scrollbar stays rightmost and the rail is one CSS variable wide. Press and drag on the rail are one `view/jump`, the same action as Next. Headings are rows, and pixels from the scroller push the band.
- **Cost:** rows became a union of headings and items, which touched list, table, both containers and stories. The scrollbar width is a constant copied from `styles/scrollbar.css`, so overlay scrollbars will leave a gap.
- **Not proven:** drag and push have only run as pure functions. Not seen in a browser.

### 2026-11-07: the reducer became a table

- **Dimension:** type safety, cost.
- **Result:** the user's design. A `switch` with a `never` default became `Handlers<S, A>`, a mapped type with one handler per action type, and `reducerOf` turns it into a function with no cast. The user's draft typed handlers as `<T, G>(state: T, action: G) => T`, which picks fresh types at every call and binds nothing; the mapped type ties each key to its own action.
- **Leash, tested with a throwaway file:** a missing handler, an extra key, a handler reading another action's field, and a malformed dispatched action were all rejected.
- **Tests:** `apply` and small action builders made every arrange and act one line. The file went from 208 lines to 176, before one new test.
- **Composition:** a handler can call other handlers, for example `HANDLERS["view/jump"](state, ...)`. A new request now runs `view/visible` and `view/jump` to the top, which fixed a real bug: the band named a section from the previous search. Reviewed and not composed: `query/toggle` (a computed key would skip the value check) and `selection/clear` (already one line).

### 2026-11-07: idempotent actions, distilled

- **Dimension:** cost, type safety, bug fixing.
- **What went wrong:** I kept adding commands one at a time: `view/visible`, `view/jump`, `view/band`, `field/open`, `selection/clear`, `selection/section`. Each was fine alone, and together they were a pile, not a system. Three were toggles, so a repeated or replayed action flipped state back.
- **Result:** the user's rule. 20 action types became 12. Each domain has one `*/set` with a `Partial` patch, and lists have `*/add` and `*/remove`. Selectors choose the direction. Toggles and resets are gone.
- **Cost:** row press actions now depend on selection, so they rebuild when selection changes. The test that proved they didn't was replaced.

## Next measurements

1. A shared 100k library for `/stearch` and `/search`.
2. The same small behaviour change made on both sides, with file and line counts.
3. The same new field added on both sides, since that's where this design is weakest.
