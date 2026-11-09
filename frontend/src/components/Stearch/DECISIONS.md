# Stearch design decisions

Why this folder works the way it does. `AGENTS.md` holds the rules; this holds the reasons and the target design. Read both before changing state, selectors or containers.

**Status:** a first draft implements most of this on a fake API. Requirements and their proof live in [specs/](specs/). When code and this file disagree, follow this file and move the code, unless the user says otherwise.

## Strong opinions

**Do what Argosy does, better than Argosy.** This is support, not rivalry. Every core RomM job that the platform does well is weight [Argosy](https://github.com/rommapp/argosy-launcher) and other clients don't have to carry. Search, collection authoring, curation and administration belong to RomM, built from the ground up here and exposed through the API. Clients keep what only a device can do: launching, emulators, local files, offline use.

**Sort parity with Argosy, where it's cheap.** Stearch offers user rating, difficulty and last played, in the data model first, with how they're displayed left open. Play count and play time are a deliberate difference: they aren't columns, RomM is primarily administrative, and launchers are where that data starts. Adding them later is a registry entry and a bucket.

**A saved search and a smart collection are one thing.** Saving writes the query, and loading reads it back, cautiously: a stored query can be old, so anything no longer understood is shown and dropped, never silently applied.

**What I clicked on is where I start.** Any verb that moves the view also moves the current item, so the next press resumes from where the user acted. Before shipping a verb, ask what state it leaves behind.

**Controller input has one owner per press.** Hardware becomes named events (Confirm, Back), and the first owner found gets the press: overlay, then panel, then view. Keep the reducer behind it, so a screen never grows a chain of `showThisMenu` conditions per direction. Argosy's owner stack and event names are the model.

**Landmarks and order.** Only layouts declare landmarks, named by `aria-labelledby` and never `aria-label`. Tab order equals DOM order, with no scripted exceptions. See spec 012.

## Input is one machine

Keyboard, D-pad and analog stick all dispatch events into `transition` in `ui/content/list/axis-machine.ts`, which returns the next state and effects. Drivers only translate: input and the DOM into events, effects back into the DOM. Commands such as the rail's letters are events too. The list runs one machine and the 2D grid runs one per axis. Screen state stays out of the Pinia store, because the stick dispatches every frame. See spec 010.

## Guiding idea

**TypeScript is the lighthouse.** Write down what we know today, as narrowly as we can, and let the compiler produce the to-do list when a type changes. Prefer a type that makes a wrong state impossible over a check that catches it.

**Keep logic as far left of the view as is appropriate.** Each layer knows less than the one before it:

```
state --> selectors --> containers --> pure components
(all)     (everything)   (a bridge)     (nothing)
```

## Types come from the API

Root state is built from generated types with `Pick`, not written by hand. Why: the spike stands apart from the gallery but must stay compatible with the API, so `npm run generate` should break the build at the seam when the backend changes.

- `GetRomsParams` is hand-written and all optional. Use `Required<Pick<...>>`, because we have no optional props.
- `orderBy` is a loose `string`. Keep a narrower sort union in state.
- Filters exist only in the abstract for now: keys derived from `GetRomsParams`, no UI. They get their own spec.

## State shape

- **Windows, not one list.** Rom pages are stored by offset. The library can hold 100k games, so the server searches and `selectMatchingRoms` goes away. Why windows: loading one replaces one entry and the others keep their identity, so selectors recompute only what changed.
- **Use what the API already sends.** `char_index` drives the rail for text sorts, and `rom_id_index` supports select-all.
- **Status is a discriminated union** (`idle`, `loading` with `requestId`, `ready`, `failed` with `message`). Why: two fields would allow "loading and failed" at once. The reducer's switch ends in a `never` check, so a missed action is a compile error.
- **Scroll position stays out of state.** Dispatch when the visible window range changes, never per frame.

## Trust at the seam

Each tool does a different job; they aren't alternatives.

| Tool                                  | Guards against                                                           |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Deep readonly state type              | Mutation in our code, at compile time                                    |
| `Object.freeze` at intake, per window | Mutation at runtime, loudly. A `shallowRef` mutation is otherwise silent |
| Zod at the API seam                   | The server not matching the types                                        |

Type each schema against the API type (`satisfies z.ZodType<StearchRom>`) so the two can't drift. Validate only fields we picked. Invalid data dispatches `failed`. Never use a Zod `.catch()` default or a partial row: that is the `??` cover-up again.

## Actions

**Two meanings, kept apart.** A Redux action is an object describing what happened. A Pinia action is a method. Here, "action" means the object; call Pinia methods effects.

**`(state, action) => state` stays pure.** `dispatch` takes an array and folds it through the reducer, assigning state once:

```ts
function dispatch(actions: readonly StearchAction[]): void {
  state.value = actions.reduce(stearchReducer, state.value);
}
```

Why: one user gesture is one transition, selectors never see a half-applied state, and the reducer doesn't know about batches.

**Selectors build the arrays.** They can see all of state, and an action is only data. Changing what a button does means editing a list:

```ts
// Clears search and closes the panel. To stop clearing, remove the first item.
closeActions: [
  { type: "query/set", patch: { searchTerm: null } },
  { type: "view/set", patch: { isAdvancedOpen: false } },
];
```

**App actions are a domain type.** `Stearch.actions.ts` holds one discriminated union per domain (`StearchQueryAction`, `StearchLayoutAction`, `StearchSelectionAction`, `StearchWindowAction`), and `StearchAction` is their union. They aren't global to the app, but they share a common domain so they are easy to use and refine. Why: VS Code becomes your friend. Autocomplete lists what can happen, the compiler checks each shape, and a prop can narrow to one domain when that helps. Add a new action to its domain's union, or start a new domain. Don't declare action shapes elsewhere.

**XState is the inspiration, not a dependency.** Don't install it, and don't rename anything to match it. Use it to think clearly about the parts:

| XState                              | Here                                                             |
| ----------------------------------- | ---------------------------------------------------------------- |
| Events, typed in `setup({ types })` | `StearchAction`, typed in `Stearch.actions.ts`                   |
| Actions (named effects)             | Effects in `Stearch.store.ts`                                    |
| `assign` descriptors                | Selector-built action arrays: data describing what should happen |
| States                              | `StearchStatus`                                                  |

So our "actions" are what XState calls events: they say what happened. Two ideas to borrow when the code asks for them: turn `runEffect` into a table keyed by action type once a third effect appears, and move status checks to one place if more transitions depend on status.

**Actions are idempotent; selectors choose the direction.** Replaces the earlier "say what happened" rule, which allowed toggles. A toggle sent twice undoes itself, and a replayed one flips state. Now the selector reads the state and offers `selection/add` or `selection/remove`, or a patch such as `{ isAdvancedOpen: !isOpen }`. Each domain has one `*/set` taking a `Partial` patch, lists have `*/add` and `*/remove`, and there are no reset or clear actions: a reset is a patch of defaults.

## Layers

**Pure components never look inside an action.** They receive actions as props and hand them back when pressed:

```vue
<script setup lang="ts">
defineProps<ListProps>();
defineEmits<{ press: [actions: readonly StearchAction[]] }>();
</script>
```

We tried an opaque generic `T`, which made reading an action a compile error. We dropped it: it was a lot of machinery to prevent something a plain rule covers, and the dumber type is easier to read. So this is a convention. A pure component may carry actions but must not read `.type` or any other field.

**Containers are one-line bridges.** `@press="store.dispatch"`. The one exception is a value only the DOM knows: a text field's handler builds its action from the value it receives, and that is fine. Don't add machinery for it. Once the value is in state, selectors take over.

**Selectors form a directed acyclic graph,** as in reselect: memoized nodes composed into larger ones. We chose them over `computed` because they are composable and portable, and run in plain tests. `computed` is only the subscription, one line in a container. Revisit if needed.

The cache holds one entry, so a selector called per row with different arguments gets nothing from it. Do per-row work in a whole-window node. Keep stable row data separate from selection, so toggling one row doesn't rebuild every window.

## Effects

Effects live in the store as async methods that dispatch, so the reducer never fetches:

```
loadWindow(offset): dispatch requested --> fetch --> validate --> dispatch loaded or failed
```

- `requestId` lets the reducer drop a stale response, so a slow old search can't overwrite a new one.
- The view can only dispatch, so effects run after the reducer, keyed on the action (`search/set`, `sort/set`, `window/wanted`). `window/wanted` changes no state; it exists to trigger an effect.
- The root container calls `start()`, which fetches only when `status.kind === "idle"`. Why: a story seeded with any other status never touches the API.
- Search has a mild first-pass debounce in the effect, to reduce annoyance. `searchTerm` still updates on every keystroke. Refine later, especially for the first keystrokes and deletes.

## Sparse rows

A row that isn't loaded is `null` for now. We know it exists, and `rom_id_index` may tell us its id, so the type should grow to something like `{ kind: "pending"; id: number }`. When it does, the compiler lists every place to update. Open question: `with_rom_id_index` is turned off on some calls to save work, and its cost at 100k isn't measured.

## Reuse

Reuse what isn't harmful to the job, and shape new things like the APIs and patterns we'll need anyway.

- **Reuse freely:** `R*` primitives (`RTable`, `RTextField`, `RSegmentedControl`), `romFixture`, `formatBytes`, generated API types. They carry no state we'd have to fight.
- **Don't reuse:** the gallery stores and `GalleryShell`. Their deep reactive state is what this spike stands apart from.
- **Match the shape anyway:** `GET /roms` params and page fields, window size and offsets, so the fake API can be swapped for `romApi.getRoms`.

## Layouts take parts

A layout receives components, not their data. Why: passing `backgroundUrl` made the layout own an image, a cross-fade and a timing delay, none of which are layout problems. With `background: Component | null` it only places a part, the part owns its behaviour, and each can be tested alone. We chose component props over slots because a missing slot still compiles, while a missing required prop doesn't.

## UI model

The target root state describes the job, not the screen, so it would fit a CLI too:

```ts
query: {
  (term, sortKey, sortDir, filters);
}
view: {
  (mode, isAdvancedOpen);
}
results: {
  (status, ids, charIndex, windows);
}
attention: {
  (activeId, selectedIds);
}
```

Anything derivable stays out of it: the total is `ids.length`, and the background follows the active item, else the latest selection. `selectedIds` keeps the most recent last, so it reads as a stack.

**Attention follows the file-browser model.** "Selected" is a set, like checkboxes, for batch actions. "Current" (`activeId`) is the one item the page is about right now. The key position is the keyboard cursor, a view fact that can rest on a ghost. They are three separate states, each drawn and printed on its own. See spec 007, "Attention states".

One request id covers a query and all its windows, so scrolling can load several at once. The store tracks in-flight offsets.

## Content

At app level the page is header, panel, content and footer. `content` means items plus scroll, and it owns its own scrolling and rendering. Columns, views and the rail are its business, not the layout's. Don't add a content layout until something needs one.

## Intervening in a transition

One rule in one place, so everyone using an action gets the same result. Use the smallest point that fits, in this order:

1. **A reducer case,** when one action owns the rule.
2. **`finalizeTransition(previous, next)`,** a pure step in `dispatch` before commit, when a rule spans several actions or depends on a status change. It doesn't exist yet. Add it for the first rule that needs it.
3. **Effects after commit,** for anything that touches the outside world.

Pinia's own `$onAction` can observe `dispatch` (before, after, on error), so reach for it before building a hook of our own.

## Rooted in Pinia

The work must end up rooted in Pinia, because this folds back into the app eventually. Don't add anything a Pinia store can't host. The fold-back path:

- Root state fields become store state.
- Selectors stay plain functions, called from getters.
- `dispatch` and effects stay store actions.
- The reducer stays a pure function the store calls.

The real distance is `shallowRef` and immutable state, against the deep mutable state the other stores use. Keep that difference in mind when a choice would widen it.

## Pinia

Pinia hosts the store: instance, lifecycle and per-story isolation. Vue provides reactivity through `shallowRef`. Actions, reducer and selectors are plain TypeScript with no Pinia in them. Why keep it: it's already in the app, and replacing it would add a dependency for little gain. Known cost: its devtools show `dispatch` calls, not individual action names.
