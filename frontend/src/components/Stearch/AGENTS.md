# Stearch

The search-first `/stearch` page, built from the v4 design. This folder deliberately breaks the rules in `frontend/AGENTS.md` and the `frontend-components` skill on file layout and state. Everything else still applies: tokens, `R*` primitives, accessibility, input handling, no em-dashes. It should stay easy to fold back into RomM conventions later.

The layout contract comes from the v4 spec, section 2 (`__perf_images/ui/v4-spec.md`, in the git-ignored notes).

**Read [DECISIONS.md](DECISIONS.md) before changing state, selectors or containers.** It holds the reasons and the target design. Where it differs from a rule below, it is newer and wins.

**Work from a spec.** [specs/](specs/) holds numbered specs. Each requirement has an ID and names its proof. Change the spec first, then the code, and ask the user about anything listed as open.

**Record what you learn.** This folder is an experiment: build it in the ideal setup, port it to RomM conventions, and compare the two. After every bug fix, feature change, reversal or measurement, add an entry to [LESSONS.md](LESSONS.md) with real counts, including when this approach loses.

## Before you decide anything

0. **Find the seam before picking a side.** If a choice can be one swap at a part, a selector, an effect or an import, it can wait. Default to ours and list it in [specs/006-compatibility.md](specs/006-compatibility.md).
1. **Check the design source first.** If it's a question of how something should look or behave, read `v4-spec.md` and open `search-designs-v4.html` before choosing a value. Don't invent a number from a loose phrase.
2. **Look for the simpler framing.** If you're offering options, ask whether the problem can be split differently so the choice disappears.
3. **Prefer the change that removes something.** Right moves here usually delete code. If a change adds machinery, re-check the model.
4. **Sweep after a lesson.** When something gets fixed or a rule changes, apply it to every file it covers, then say what you checked.
5. **Don't claim what you haven't seen.** Typecheck and unit tests don't prove a story or a layout. Say so until it has run in a browser.

## Fixing a bug

This architecture exists so that behaviour changes in one place. Use that.

1. **Understand the report before touching code.** Restate what should happen. If you can't, ask. Don't start a hunt on your own reading of it: "doesn't swap" here meant "a second tap should swap back", not "the render failed".
2. **Find the one function that owns the behaviour.** What a press does is the action array a selector returns. Change that selector's output.
3. **Expect a one-line diff.** Props, pure components, containers and the reducer don't change when behaviour changes. Pure components hand back whatever they were given, which is why they need no edit.
4. **If the fix spreads past one function, stop.** That means the code bypassed the design, for example a container building its own action. Say so and propose moving it once. Don't build around it.
5. **Solve the case that exists.** No lookup tables, helpers or per-option maps for options the UI doesn't offer. Add them when a type or spec demands it.
6. **Say what you'll change before changing it,** and wait if the user asked you to.

Worked example, spec 001 V5. Wrong: a `Record<StearchView, ...>` of actions, a toggle table and a helper, across props, pure component and stories. Right: one array in `selectHeaderState`.

```ts
actions: [{ type: "view/set", patch: { mode: mode === "table" ? "tiles" : "table" } }],
```

## Layout

All new code, stories and tests live here, by domain. The route loads `Stearch.container.vue` directly.

```
Stearch.container.vue         root, connects the store to the layout
Stearch.pure-layout.vue       pure grid that places parts
Stearch.pure-layout-props.ts
Stearch.state-props.ts        IStearchStateProps, the root state
Stearch.actions.ts            action objects: one union per domain, StearchAction joins them
Stearch.reducer.ts            pure state transitions
Stearch.store.ts              one dispatch()
Stearch.selectors.ts          the trunk: one selector per state field
Stearch.<family>.selectors.ts  branches: results, rows, attention, query, layout
Stearch.create-selector.ts    memoizer, same call shape as reselect
Stearch.fixtures.ts           shared story and test data
content/content.container.vue  items plus scroll: the one `content` the app sees
<domain>/                     header, sidebar, footer, content/list, content/table, content/rail
  <domain>.pure-component.vue
  <domain>.container.vue
  <domain>.props.ts
  <domain>.selectors.ts
  <domain>.pure-component.stories.ts
  <domain>.container.stories.ts
  <domain>.selectors.test.ts
```

## Rules

1. **Pure means pure.** `*.pure-component.vue` and `*.pure-layout.vue` have no state: props in, events out. No `ref`, `computed`, stores or composables. ESLint enforces the imports. `R*` primitives may keep their own internal state.
2. **No optional props.** Every prop is positively defined, in a `*.props.ts` file.
3. **State lives at the root.** Most of the page is `IStearchStateProps`. Containers connect it to pure components and do little else: run a selector, bind props, dispatch on events. Labels are passed in from containers.
4. **Updates are boring.** Selectors build arrays of plain action objects, pure components hand them back, and containers pass them to `store.dispatch`. A container builds an action only for a value only the DOM knows, such as typed text. The reducer never mutates and has no side effects.
5. **Selectors do the work, and they grow like a tree.** Derived values and transformations belong in selectors, not templates or containers. A selector returns the same object until an input changes.
   - **Roots and trunk:** the state is the ground. `Stearch.selectors.ts` is the trunk, with one plain selector per field and nothing else. It's the only code that reads `IStearchState`, apart from the reducer and store that write it. ESLint enforces this.
   - **Branches:** memoized families at the root, one per state branch: `Stearch.results.selectors.ts`, `Stearch.rows.selectors.ts`, `Stearch.attention.selectors.ts`, `Stearch.query.selectors.ts` and `Stearch.layout.selectors.ts`. They build only on the trunk and on each other.
   - **Leaves:** each domain's `*.selectors.ts` returns exactly the props its pure component takes, so containers just bind them.
6. **State comes from events.** A click, a keypress, a scroll range or a network reply may dispatch. A watcher never does, because one that dispatches can feed back into itself: two of them once re-ran each other until Vue stopped and `/stearch` went blank. ESLint enforces this. Screen facts, such as the list's size, the device and the band's push, stay in the view and reach pure components as props. Each has one owner and is read-only to everyone else: `content/content.view.ts` derives the device, and `use-scroller-jump.ts` owns the band's push, the list's box and the scrollbar's measured width. Never write a shared ref from several places; if a fact comes from an event, it belongs in state. The store holds the user's job; the view holds the screen. The one exception left is `locale/set`, which is marked and still an open question.
7. **State stays immutable.** The store holds state in a `shallowRef`, so selectors can compare identity. Replace values; never edit them in place.
8. **No silent fallbacks.** Don't use `!`, or an invented `??` default, on a value that can't be missing. See "Don't silence a type check" in the root `AGENTS.md`.

## The reducer is a table

The reducer is a readonly object with one handler per action type, typed `Handlers<IStearchState, StearchAction>` and turned into a function by `reducerOf`. No `switch`.

```ts
const HANDLERS: Handlers<IStearchState, StearchAction> = {
  "view/set": (state, { mode }) => ({ ...state, view: { ...state.view, mode } }),
  ...
};
export const stearchReducer = reducerOf(HANDLERS);
```

- **The compiler holds the table to the union.** A missing handler, an extra key, or a handler reading a field its action doesn't have are all compile errors. Adding an action means adding one union member and one handler.
- **Each handler gets its own action, already narrowed,** so destructure it in the parameter list.
- **Actions are idempotent.** Sending one twice changes nothing more. No toggles: the selector reads the state and picks the direction, such as `selection/add` or `selection/remove`, or `isAdvancedOpen: !isOpen` inside a patch.
- **No reset or clear actions.** A domain's fields change through one `*/set` with a `Partial<T>` patch, and a reset is a patch of defaults. Before adding an action, check whether a patch already says it.
- **Compose handlers for transitions.** When one change implies another, as a new search implies "back to the top", call the other handler, such as `HANDLERS["view/jump"](state, ...)`, instead of copying what it does.
- **Tests stay one line per step.** `apply(state, ...actions)` folds actions just as `dispatch` does. Arrange is `apply(INITIAL, ...)`, act is `apply(before, ...)`, and small action builders such as `pick(7)` or `loaded(9, 0)` keep each line short.

## Stories

- Files are `<file>.stories.ts`, named after the file under test. Storybook does not read `.stories.vue`.
- The title starts at the `Stearch` root section, mirrors the directories and ends in the exact file name, so a search finds the file: `Stearch/content/list/list.pure-component.vue`.
- No generated Docs pages: every story sets `tags: ["!autodocs"]`. A page with nothing of ours on it trains people to ignore docs. Real notes live in these markdown files. Write the tag literally in each story file: Storybook reads tags from the file itself, so a tag spread in from a shared object is ignored.
- **Stories run offline.** Container stories connect the store to `fakeGetRoms` through `renderContainer`, so scrolling past the seeded rows fetches fake windows instead of a backend that isn't there. Never let a story reach the real API.
- Stories mean it: real states, and `play()` for anything interactive.
- **Pure layout stories show every part in its own colour.** Fill each part with `layoutPart(label, token)`, or `scrollingPart` for a part that scrolls, from `Stearch.story-helpers.ts`. Each part gets a different `PartToken` colour, a label naming the part and what it does ("Band · floats over the items"), and a dashed edge, so overlaps, gaps and scrolling show at a glance in both themes. Don't hand-roll blocks in a story: a layout story without these helpers is an outlier to fix.
- **A layout fix lands in the layout and is proven in its story.** Change only the layout, then add a named story that recreates the bug with stand-in parts, and a `play()` check where one can assert it. `PanelCoversRaisedParts` does this for stacking: `raisedPart` layers something at `z-index: 10`, and the check confirms the open panel still covers it. Never patch the parts or views to hide a layout bug.
- **One named story per state worth seeing.** Besides `Playground`, add a story for each layout state a reader should recognise, such as `BandBeingPushed` or `NoFooter`. Use `layout: "fullscreen"`, and size the frame as the layout is used, for example a 360px-wide panel. Responsive behaviour is CSS on `data-bp`, so a viewport change alone proves it.

### The solve for layouts

**A layout takes parts that may or may not exist, and places them. That's all it does, in the most boring way possible.**

- **Parts are component props.** Required parts are `Component`; parts that can be absent are `Component | null`. The type enforces it, which slots can't.
- **Never pass a part's data to a layout.** The layout takes a `background` component, never a `backgroundUrl`. If you're adding a URL, a title or a list, you're making the layout intimate with something it should only place. Make a domain with a container and pass that in.
- **A `null` part just isn't there.** Plain `v-if` and CSS. Nothing clever. If the CSS needs to know whether a part exists, read it from the markup with `:has()`, as `list.pure-component.vue` does for the rail. Never add a prop or `data-` attribute that restates a part's presence.
- **This orchestrates at a high level.** The root container reads as a list of parts, and stories can swap any part for a plain block.

A layout's remaining props are the interface's real states. Ask what states the UI can be in and what moves between them, then:

- **Regions are named grid areas.** Each placement is one `grid-template` you can read as a picture, and each part just names its `grid-area`. Don't offset regions with padding or margins. To make room for something optional, keep its area and size its track to `0px`, so the names never change.
- **Parts fill their container.** A pure component takes the size it's given and never sets its own outer width, so any layout can hold it. Grid tracks inside a part are `minmax(0, 1fr)`, because a bare `1fr` won't shrink below its content. Only the layout decides what scrolls.
- **Layouts nest.** Any region with parts of its own gets a layout, as `sidebar.pure-layout.vue` does for header, body and footer.
- **A pure layout's props serve layout only.** At least two `Component` parts (the `stearch/pure-layout-parts` lint rule checks this), view states such as `panelState: "shown" | "hidden"` rather than narrow booleans, and very rarely a CSS preference such as a speed or colour override. With fewer than two parts, it's a pure component.
- **Layouts hold no logic.** They arrange parts through an interface and don't know what's inside.
- **Give each state its own prop.** `isPanelShown` is visibility; one prop doing visibility and position can't animate.
- **Name placement in flexbox terms.** An axis (`inline`, `block`) plus a position (`start`, `end`) covers every edge. Use CSS logical properties, not left, right, top or bottom.
- **Solve layout problems in the layout.** Responsive and placement behaviour stays in its CSS, not in containers or selectors.
- **Map each prop to a `data-` attribute,** and let CSS own everything visual, including transitions. No animation logic in script.
- **Every item speaks one contract.** Any view of an item takes `ItemProps` and emits `ItemEmits`: a slot in, actions out. `null` draws that view's own placeholder.
- **Containers nest.** Don't thread a part through a pure component. If one field needs its own container, let a container choose it, and pass that container as a part. A list that mixes pure and connected items is a container.
- **Group props by concept.** Past a handful of props, group them as objects (`search`, `filters`, `sort`), as `panelLayout` does. A selector returns the whole group, labels included.
- **Discriminate by kind.** If a field only means something for some kinds, make a union, not a nullable. Nullables mean a value can be absent, not that it doesn't apply.
- **Nullable, not optional.** A part that can be absent is a required prop that accepts `null`, as in `background: Component | null`. Every caller has to state it, and Storybook can show it.
- **Keep animated things mounted.** A `v-if` can't transition out, and it throws away the content's state.
- **Animate `transform` and `opacity` only.** Layout changes once, then the compositor does the motion. Use the `--r-motion-*` tokens and honour `prefers-reduced-motion`.
- **A control exists to exercise a real prop.** Don't add story args for decoration. If you want a control and there's no prop for it, ask whether the model is missing a state.

### Controls

Storybook, docs, tests and types must be good enough to work without any AI. Someone should be able to learn and exercise a component from Storybook alone.

- **Lean on controls, not defaults.** Set every arg explicitly. If stories differ only by one value, that's one story with a control. Keep a separate story only for a state worth naming, or a `play()` check.
- **Numbers:** `range`, with a sensible `min`, `max` and `step`.
- **Colors:** `color`.
- **A handful of options:** `radio`.
- **More than a handful:** `select`.
- **Booleans:** `boolean`. **Free text:** `text`.
- **Hide slot rows** with `parameters.controls.exclude` when the story fills them itself.
- **Controls express the component's role.** Map them to props, and for a collection make the count the main control: a list is about its items, so it gets an `itemCount` slider up to 1000. No decorative args, such as block colors or sizes.
- **Fixtures run the real pipeline.** Build rows through the fake API, seam and selectors, so stories can't drift from the types.
- Pure stories hold no state. They use args only, unless a view-only need justifies otherwise.
- Container stories seed the store from a `state` arg. `Stearch/Stearch.container.vue` is the whole page, and any app state (loading, empty, failed) is one arg away.

## Tests

Every test follows arrange, act, assert, in that order, with a `// Arrange`, `// Act` and `// Assert` comment on each block. One act per test. Never act inside an `expect`. If there's nothing to arrange, leave that block out.

## Imports flow one way

Selectors and the types they use import **up the tree or across to peers, never down**. The trunk imports only state types. A root branch imports nothing from a subfolder. A domain's selectors import nothing from their own subfolders. `import type` counts too: it can't cause a runtime cycle, but it still ties a shallow file to a deep one.

Two checks hold this:

- **`import-x/no-cycle`** (repo-wide) reports any loop, up to 15 files deep.
- **`import-x/no-restricted-paths`** zones in `Stearch.eslint.js` report a downward import before it can close into a loop.

**When one happens.** The symptoms are `Cannot access 'selectX' before initialization`, an import that is `undefined` when the module loads, or a selector that works in tests but breaks after a hot reload. Selectors are created as modules load, so a cycle bites at once.

1. Run `npx eslint src/components/Stearch`. `no-cycle` prints the loop file by file, and the zones name the downward import.
2. Find the edge that points down, where a shallower file imports a deeper one.
3. Move the shared piece up to the nearest folder both sides can reach, usually a root branch or the domain's own `*.props.ts`, and import it from there.
4. Don't dodge it with lazy `import()`, getters, re-export files, or by pushing logic into the trunk. Those hide the loop instead of removing it.

Worked example: `ListRow` lived in `content/list/list.props.ts`, but the rows branch at the root produces it. It moved up into `Stearch.rows.selectors.ts`, and `list.props.ts` now imports it from there.

## Lint rules

Stearch's ESLint rules live in [Stearch.eslint.js](Stearch.eslint.js): the purity guard for pure components and layouts, and the trunk rule that only `Stearch.selectors.ts` reads state. `frontend/eslint.config.js` spreads them in with one line. Add new Stearch rules there, not to the root config.

## Checks

Run from `frontend/`:

```bash
npx vue-tsc --noEmit -p tsconfig.app.json
npx eslint src/components/Stearch
npx vitest run --project app src/components/Stearch
npx vitest run --project storybook src/components/Stearch
```

The Storybook run needs the Chromium version Playwright expects: `npx playwright install chromium`.
