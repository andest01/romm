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
viewActions: [{ type: "view/set", view: view === "table" ? "tiles" : "table" }],
```

## Layout

All new code, stories and tests live here, by domain. The route loads `Stearch.container.vue` directly.

```
Stearch.container.vue         root, connects the store to the layout
Stearch.layout.vue            pure grid with slots
Stearch.layout-props.ts
Stearch.state-props.ts        IStearchStateProps, the root state
Stearch.actions.ts            action objects: one union per domain, StearchAction joins them
Stearch.reducer.ts            pure state transitions
Stearch.store.ts              one dispatch()
Stearch.selectors.ts          core selectors
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

1. **Pure means pure.** `*.pure-component.vue` and `*.layout.vue` have no state: props in, events out. No `ref`, `computed`, stores or composables. ESLint enforces the imports. `R*` primitives may keep their own internal state.
2. **No optional props.** Every prop is positively defined, in a `*.props.ts` file.
3. **State lives at the root.** Most of the page is `IStearchStateProps`. Containers connect it to pure components and do little else: run a selector, bind props, dispatch on events. Labels are passed in from containers.
4. **Updates are boring.** Selectors build arrays of plain action objects, pure components hand them back, and containers pass them to `store.dispatch`. A container builds an action only for a value only the DOM knows, such as typed text. The reducer never mutates and has no side effects.
5. **Selectors do the work.** Derived values and transformations belong in selectors, not templates or containers. Domain selectors build on core ones in `Stearch.selectors.ts`. A selector returns the same object until an input changes.
6. **State stays immutable.** The store holds state in a `shallowRef`, so selectors can compare identity. Replace values; never edit them in place.
7. **No silent fallbacks.** Don't use `!`, or an invented `??` default, on a value that can't be missing. See "Don't silence a type check" in the root `AGENTS.md`.

## Stories

- Files are `<file>.stories.ts`, named after the file under test. Storybook does not read `.stories.vue`.
- The title starts at the `Stearch` root section, mirrors the directories and ends in the exact file name, so a search finds the file: `Stearch/content/list/list.pure-component.vue`.
- No generated Docs pages: every story sets `tags: ["!autodocs"]`. A page with nothing of ours on it trains people to ignore docs. Real notes live in these markdown files.
- Stories mean it: real states, and `play()` for anything interactive.
- Layout stories use `layout: "fullscreen"` and fill slots with plain labelled blocks. Responsive behaviour is CSS on `data-bp`, so a viewport change alone proves it.

### The solve for layouts

**A layout takes parts that may or may not exist, and places them. That's all it does, in the most boring way possible.**

- **Parts are component props.** Required parts are `Component`; parts that can be absent are `Component | null`. The type enforces it, which slots can't.
- **Never pass a part's data to a layout.** The layout takes a `background` component, never a `backgroundUrl`. If you're adding a URL, a title or a list, you're making the layout intimate with something it should only place. Make a domain with a container and pass that in.
- **A `null` part just isn't there.** Plain `v-if` and CSS. Nothing clever.
- **This orchestrates at a high level.** The root container reads as a list of parts, and stories can swap any part for a plain block.

A layout's remaining props are the interface's real states. Ask what states the UI can be in and what moves between them, then:

- **Regions are named grid areas.** Each placement is one `grid-template` you can read as a picture, and each part just names its `grid-area`. Don't offset regions with padding or margins. To make room for something optional, keep its area and size its track to `0px`, so the names never change.
- **Parts fill their container.** A pure component takes the size it's given and never sets its own outer width, so any layout can hold it. Grid tracks inside a part are `minmax(0, 1fr)`, because a bare `1fr` won't shrink below its content. Only the layout decides what scrolls.
- **Layouts nest.** Any region with parts of its own gets a layout, as `sidebar.layout.vue` does for header, body and footer.
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

## Checks

Run from `frontend/`:

```bash
npx vue-tsc --noEmit -p tsconfig.app.json
npx eslint src/components/Stearch
npx vitest run --project app src/components/Stearch
npx vitest run --project storybook src/components/Stearch
```

The Storybook run needs the Chromium version Playwright expects: `npx playwright install chromium`.
