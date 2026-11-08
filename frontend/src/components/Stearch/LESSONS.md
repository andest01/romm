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

### 2026-11-07: the selector tree

- **Dimension:** cost, portability.
- **Result:** the user's model. State is the ground, `Stearch.selectors.ts` the trunk with one selector per field, five root files the branches, and domain selectors the leaves that match component props. The old file mixed all three layers in 224 lines.
- **Found by the split:** five places read state directly, in two containers, two selectors and one composable. All now go through the trunk, and an ESLint rule keeps it that way. Two domain files no longer mention `IStearchState` at all.
- **Cost:** the rule repeats two repo-wide `no-restricted-syntax` entries, because a later ESLint block replaces the whole rule. If those change upstream, this copy must follow.

### 2026-11-07: imports flow one way

- **Dimension:** cost, portability.
- **Result:** the user's rule. Selector code imports up the tree or across to peers, never down. A scan found no real cycles, because `import-x/no-cycle` already runs repo-wide. It did find three downward imports: the rows branch took its types from `content/list`, the scroller composable reached into its own subfolder, and the sidebar selectors took types from `bar/`. Each fix moved the shared piece up a level. ESLint zones now catch the next one, and probes proved all three zone kinds fire.
- **Type-only imports count.** They can't cause a runtime cycle, but they bind shallow files to deep ones all the same, so the zones treat them like any other import.
- **Process:** the user noted better strategy here. What changed was reading the tools and the import graph before proposing, then naming the one move that resolves each case.

### 2026-11-07: size as state, and a blank page

- **Dimension:** feature changing, bug fixing.
- **First try:** the list's box and the device became state (`view.listBox`, `view.device`), dispatched by watchers.
- **What went wrong:** the device update was a second `watchEffect` that dispatched. `dispatch` reads state, so the two effects re-ran each other and Vue stopped them, leaving `/stearch` blank on refresh. No unit test could see it. A `watch` would have fixed this one case, but the user judged the whole pattern dangerous: the next person could rebuild it.
- **Result:** backed out by design. State now comes only from events, and ESLint rejects a dispatch inside any watcher. The box, the device and the band's push live in the view (`content/content.view.ts`), never in the store. Columns come from width through the pure `itemFit`, with the same rule as `useResponsiveColumns`, bounded per item kind, so a 1920 screen with the panel open gets four tiles. Padding moved onto the scroller, so the measured box is the space items get, which fixed the phone cover heights. The list story shows it with a width slider.
- **Lesson:** keep the job and the screen apart. Pure functions still compute the screen, and stay testable; they just aren't selectors of state.
- **Reverted:** exporting the formula from `useResponsiveColumns`. It changed a shared interface for our sake. Stearch keeps a copy of the formula for now, a known duplicate.
- **For later, from the user:**
  - Should page health be state, for example `loading`, `failed` or `died and cannot recover`, so a broken page says so instead of going blank?
  - Should `listBox` be the start of a fuller description of the world we live in, built from DOM types like `DOMRectReadOnly` (size, position) rather than one-off numbers?

### 2026-11-07: read-ahead, settle and a request cap

- **Dimension:** performance.
- **Why:** `__perf_images` notes show each window costs the server about 1.3 s at 100k, because every request re-ranks the library. So the cap on requests in flight matters as much as reading ahead.
- **Result:** one frozen `READ_AHEAD` policy in `Stearch.read-ahead.ts`: 48 results per window, 2 screens ahead in the scroll direction, 1 behind, a 150 ms settle, and 2 requests in flight. Screens are the unit, converted per device from columns and the visible rows. The store waits for scrolling to settle, so scrubbing, wheel, keyboard and gamepad never fetch the windows in between, then cancels requests for windows the user moved past.
- **Kept open:** `screensKept` is infinite, the seam for dropping windows once 100k metrics exist.
- **Not proven:** pure functions are tested. The store's settle, cap and cancellation have no test yet, and nothing has run against the 2k library.

### 2026-11-07: band into the lists, rail as scrollbar, refs reined in

- **Dimension:** cost, feature changing.
- **Result:** the band moved out of the content layout into the list and table, where the table's column header and the band stack naturally, so the hard-coded `30` inset is gone. The content layout is just items and rail. While a rail exists, the layout hides the items' scrollbar and the rail becomes it, with a thumb for the visible span. The fixed 12px scrollbar width and the margin that bent the rules are gone. Views open on an anchor from state, the active item or else the top, so switching views keeps the same item in frame.
- **What went wrong:** moving screen facts out of the store, I let shared refs be written from three places, with an invented `??` fallback. The user caught it. The visible span came from an event, so it went into state, and the rail's thumb became a selector. The band's push kept one owner and is exposed read-only. I also restated a part's presence as a `data-` attribute, when `:has()` reads it from the markup.
- **Then reversed, same day:** the user needs to grab the native scrollbar and touch the rail. The scrollbar is back, and the rail sits hard against its left edge. Scrollbar widths differ by browser, so the scroller measures its own (`offsetWidth - clientWidth`), and each list places its rail with that. Each list now owns its whole scroll edge (band, rail, scrollbar), so `content.pure-layout.vue` had one part left and was deleted.
- **Open:** the user may rescind the band. A mouse wheel over the rail still doesn't scroll the list.

### 2026-11-07: stories hit the real API

- **Dimension:** testing, portability.
- **What went wrong:** switching the store to `romApi.getRoms` left the fake API with no caller, and the data-source seam became a fixed import. Container stories seeded 48 of 1,000 rows, so scrolling one fetched from a backend Storybook doesn't have, got a 404, and the whole list turned into an error. Spec 006 still claimed a one-line swap.
- **Result:** the store takes its source through `connect(source)`, typed from `romApi.getRoms`. The app connects the real API and container stories connect the fake. An unconnected store reports it instead of quietly using the real API.
- **Also found:** every container story had a Docs page, because Storybook only reads `tags` written in the story file, and ours were spread in from a shared object.
- **Still open:** a failed later window replaces the whole list with an error. That's a product bug; it goes to the spec before code.

### 2026-11-07: scroll cost, measured in production profiles

- **Dimension:** performance.
- **How to measure again:** `npm run build -- --sourcemap && npm run preview`, record a Chrome profile of a load plus a scroll, and map the frames through `dist/*.map` (the `source-map` package is already in `node_modules`). To find which DOM writes Vue makes, wrap the property setters on `Element.prototype` from the console in a dev build, and count writes by property, element and `__vueParentComponent`. A high `unchanged` count means needless re-renders; zero means mounts.
- **Run 1 (5 s scroll):** `patchDOMProp` 241 ms self time, forced layout 181 ms (from `RVirtualScroller.onScroll` reading `scrollTop`), 12.6 ms per scroll event. The tracer showed 4,239 tiles mounted with 0 unchanged writes: it was mounting, not patching.
- **Cause 1, overscan.** `RVirtualScroller` defaults to 25 rows each side, about 300 hidden tiles at 6 columns, mounted and dropped as you scroll. Read-ahead already fetches data ahead, so the lists now pass `SCROLLER_OVERSCAN = 2` (in `list.props.ts`). If a fast fling shows blank rows, try 3 or 4.
- **Cause 2, ghost keys.** Tiles were keyed `row?.id`, so every ghost was `undefined` and a loaded window remounted all its tiles. Tiles are now keyed by column inside a row keyed by position.
- **Run 2 (27 s scroll):** forced layout 181 → 19 ms, 12.6 → 7.9 ms per scroll event, `patchDOMProp` out of the top 16. Tile mounts 4,239 → 2,106, but the scrolls differ in length, so per-event numbers compare best.
- **Cause 3, a layer per row.** Run 2's top cost was Layerize, 1,194 ms, then Paint at 837 ms. `RVirtualScroller` puts `will-change: transform` on every item, so each row was its own compositor layer, re-planned on each scroll. The list and table now set `will-change: auto` on their items. The shared primitive is unchanged, because the gallery may want it for its animations; Stearch doesn't animate rows.
- **Cause 4, dates.** `releasedOf` did a `Date` round trip per row (30 ms). It now caches by timestamp.
- **Not ours:** a 64 ms `useRafFn` loop is the app-wide gamepad poll (`useGamepad`, installed in `AppLayout.vue`), about 2.4 ms per second whether or not you scroll. The cover spin (`useCoverAnimation`) never runs in Stearch, since tiles pass no `active` or `hoverMotion`.
- **If we start over:** pick overscan, keys and layer promotion on purpose before any visual work. Each default from the shared scroller cost more here than all of Stearch's own code (about 5 ms per function).
- **Run 3 (5.1 s: load, rail scrub, scroll), after the layer, date and gamepad changes:** the gamepad `useRafFn` loop is gone from the profile. Layerize is 924 ms (181 ms/s, against run 2's 44 ms/s), but this run includes page load and scrubbing, so it is not like for like. New costs: `onScrub` reads `getBoundingClientRect` on every pointermove (42 ms, plus 53 ms of forced layout), and VueUse `useScroll` (`setArrivedState`, 65 ms; AppNav's `useWindowScroll` is the suspect).
- **Lesson:** record each run with the same script (load, wait, one long wheel scroll, stop), or the numbers can't be compared.

### 2026-11-07: moving by keys, and how it should feel

- **Dimension:** behaviour, input, performance.
- **Holding ↓ spun out into the sidebar.** The app's arrow navigation picks targets from mounted elements, and a virtual list only mounts a few rows past the screen. Keys now move by position (`moveFor`), and only the first row and column let a key leave.
- **Keys died at a load point.** A focused tile was unmounted as it scrolled away or turned from ghost to game, and focus fell to `<body>`. The list holds DOM focus itself and draws the active item with a ring.
- **The browser's smooth scroll lurched.** Each press started a new smooth scroll before the last one ended, and the next press landed mid-animation.
- **An eased glide pulsed.** A held key repeats about 30 times a second on a 60 Hz screen, so retargeting an ease-out on every repeat surged and sagged. It also lunged forward and then resettled.
- **What worked, from the gallery's earlier `useGridCruise`:** a tap glides in a straight line over a fixed time; a hold stops listening to repeats and cruises at a steady, ramping speed; release finishes on the next row ahead.
- **Loading looked queued during a cruise.** The store waited for 150 ms of quiet before fetching, and a cruise is never quiet. Each want now carries a pace: `keep-up` for keys, pad and wheel, `when-still` for a rail drag.
- **Ghost shimmer cost paint.** Each skeleton repainted a moving gradient every frame: about 300 on a screen of table ghosts. Ghosts now hold still.
- **The outcome: one interface, two settings.** `ScrollFeel` holds the band height, the tap glide, the cruise and the marks' fade timeline. Both read it through the same code, and the centre-band story drives every field. After trying glides, cruise and fades on tiles, the user chose jump cuts everywhere for both views, with a one-row band, so a selection is never late. The glide and cruise stay built, judged in the story's `GlideAndCruise` example.
- **Still open:** a window of 48 ghosts turns into tiles in one frame; spreading that over a few frames is the next suspect if tiles still stutter. Moving in whole-pixel steps that divide the row height ("row lock") is designed but not built.

## Live FSM on the 2D spike

- **State was only computed during a push.** The readout went stale for keys, clicks and commands. It's now derived from the active cell, the band and the limit, so it's true for every input, and the hook lost its `states` output.
- **The first play run found two bugs.** `role="grid"` can't hold bare buttons, which failed all 7 stories' accessibility check; it's now a listbox of options. And a log that grew on each command shrank the stage and moved the centre line by half the growth, so the log reserves its height.

- **A held arrow could lose the view.** `step()` asked "was the cell in the band?" of `scroll`, which only updates on the scroll event. Two steps inside one frame read a stale view, skipped `follow`, and the cell walked off for good. The same lag showed `captured to free` and back on every step. The view copy now updates in the same moment as the scroll write. Proof: `StepsInOneFrameKeepFollowing` and `StepsNeverLeaveCaptured`, both failing before the fix.

- **Commands now fly, cells are memoized.** `flyTo` eases to its target and stops if anything else moves the view. Each cell has a `v-memo`; the saving is not measured yet. A held key from the top (`HeldKeyKeepsFollowing`, 90 presses, some inside one frame) did not reproduce the reported escape.
- **The escape was the rule, not a race.** "Free steps never scroll" meant the wheel could drop the cell out of the band and every later key walked away unfollowed. A step now follows whenever it lands at or past the centre in its direction, with no memory of the previous state. Proof: `KeyFollowsAfterWheel`, failing before the fix.

- **The stick and the D-pad reach the grid differently.** The stick is polled and needs no focus; the D-pad is a synthetic key sent to the focused element. Once focus left the grid, the D-pad went silent while the stick kept working. The grid now hears arrows at the window. Proof: `DpadWorksWithoutGridFocus`, failing before the fix.

- **The browser's `scrollTo` replaced a hand-written flight.** About 35 lines of rAF easing became one `scrollTo({ behavior: "smooth" })`. The cost is no control over duration. Only the cells are virtual; the scroller is a normal DOM scroller. A map would swap only what `view/flyTo` calls.
- **Commands became action lists.** Buttons build plain actions for one `dispatch`, and their labels come from those actions, so the label can't drift from what runs.

### Rules from the input work

1. **Keys and the D-pad are data to screen.** A step moves the active cell, then the view follows. It needs no memory of a previous state.
2. **Only a limit can leave the cell behind.** A step at or past the centre always follows; a step heading for the band walks, so the view doesn't yank.
3. **A crossing updates both sides at once.** Scroll events arrive a frame late, so whatever writes the scroll also updates our copy of it.
4. **Input routes differ.** The stick is polled and needs no focus; keys and the D-pad go to the focused element. Listen where focus can't take the input away.
5. **Keep `captured`, `pinned` and `free` for what needs them.** Keys didn't; the state machine made a one-sentence rule into a trap. The stick's two modes may be its only real use.
6. **Don't allocate per frame into reactive state.** One new `{x, y}` each frame re-rendered the whole grid at idle: main thread 80% busy before, 22% after, across two different recordings.
7. **Test the rule, not the arithmetic.** Each bug here passed review on paper and failed a story written from the report.

## Next measurements

1. A shared 100k library for `/stearch` and `/search`.
2. The same small behaviour change made on both sides, with file and line counts.
3. The same new field added on both sides, since that's where this design is weakest.
