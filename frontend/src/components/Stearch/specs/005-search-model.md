# Spec 005: the search model

**Status:** built on the fake API; not seen in a browser. Decided: `LabelKey` is generated from `en_US`, labels live in root state, and the platform field reuses `PlatformSelect`. `selectedStatuses` and `selectedMetadataProviders` are not offered yet, because `RomFiltersDict` has no values for them. `query/set` became typed `{ key, value }` pairs, not a patch; sort is two of them in one array.
**Source of intent:** v4 spec sections 3 and 4, `GetRomsParams`, `RomFiltersDict`, `FilterDrawer.vue`.

## The idea

There are three layers, and each is derived from the one before:

```
Search object   what we send: a typed subset of GetRomsParams
Field           what can be asked: one definition per filter
Preview         what the user sees: label, state, and actions
```

Components only ever receive previews. A click hands back actions, which update the search object, which is the next API call. No mapping between UI and request.

## 1. The search object is the API's params

`query` stops being our own shape. It is `GetRomsParams`, required and readonly, so sending it needs no translation.

```ts
type SearchParams = Omit<
  GetRomsParams,
  | "limit"
  | "offset"
  | "signal"
  | "withCharIndex"
  | "withFilterValues"
  | "withRomIdIndex"
  | "withTotal"
  | "collectionId"
  | "virtualCollectionId"
  | "smartCollectionId"
>;

type StearchQuery = ReadonlyDeep<
  SetFieldType<Required<SearchParams>, "orderBy", StearchSortKey>
>;

// Calling the API:
romApi.getRoms({ ...state.query, limit, offset });
```

`null` already means "unset" throughout the API, which fits our no-optional rule.

## 2. Field kinds come from the API's naming

The param names follow patterns, so TypeScript can derive the kinds:

```ts
type TriStateKey = Extract<keyof SearchParams, `filter${string}`>;
type MultiKey = Extract<keyof SearchParams, `selected${string}`>;
type LogicKeyFor<K extends MultiKey> = K extends `selected${infer Name}`
  ? `${Uncapitalize<Name>}Logic`
  : never;
```

`LogicKeyFor<"selectedGenres">` is `"genresLogic"`. A typo or a backend rename fails the build. `FilterLogicOperator` already exists in `galleryFilter`.

A field definition is one line of data, in a discriminated union:

```ts
type FieldCoreConcept =
  | { kind: "multi"; key: MultiKey; labelKey: LabelKey; valuesFrom: ValuesKey }
  | { kind: "tri-state"; key: TriStateKey; labelKey: LabelKey }
  | {
      kind: "range";
      minKey: "hltbMainStoryMin";
      maxKey: "hltbMainStoryMax";
      labelKey: LabelKey;
    }
  | { kind: "platform"; key: "platformIds"; labelKey: LabelKey };
```

v4's filters become a list of these, roughly 26 lines. `valuesFrom` is a key of `RomFiltersDict`. `selectedStatuses` and `selectedMetadataProviders` have no entry there, so they need a local list.

## 3. Every surface takes the same preview

Pills, the Advanced panel, the `+ Add a filter` menu and pill popups all show the same facts. So there is one preview type:

```ts
interface ChoicePreview {
  id: string;
  label: string;
  /** Present once the backend gives live counts. */
  count: number | null;
  state: "off" | "on" | "excluded";
  actions: readonly StearchAction[];
}

interface FieldPreview {
  id: string;
  kind: FieldCoreConcept["kind"];
  label: string;
  /** "Genre: all of Action, RPG", ready to show. */
  summary: string | null;
  choices: readonly ChoicePreview[];
  clearActions: readonly StearchAction[];
}
```

`selectFieldPreviews` is one selector. Pills are `previews.filter(summary)`. The panel renders them all. Nothing is translated or computed in a view.

## 4. Text is state

For components to stay pure, words must arrive as content. So the selectors need them:

```ts
labels: Readonly<Record<LabelKey, string>>; // in root state
{
  type: ("locale/set", labels);
} // dispatched on language change
```

`LabelKey` is a union of the keys we use. Selectors produce finished strings, and a language change is one action. Stories can pass any language, and containers stop carrying label constants.

## 5. Clicking is a small state update

Three idempotent actions cover all of search, replacing `search/set`, `sort/set`, `filter/toggle` and `filter/clear`:

```ts
| { type: "query/set"; patch: Partial<StearchQuery> }                  // merged into the query
| { type: "query/add" | "query/remove"; key: MultiKey; value: string } // one multi-select value
```

Clearing has no action of its own. It's a patch of defaults: `INITIAL_QUERY` resets everything, and "Clear all" keeps the term and sort.

A choice's selector reads whether the value is on and offers `query/add` or `query/remove`, so sending either twice changes nothing more. They carry one value, not a computed list, so they can't go stale. The store reloads on any `query/*`.

## 6. Components this implies

All pure, taking previews, built on `R*` primitives:

| Component       | Takes           | Used in             |
| --------------- | --------------- | ------------------- |
| `choice-row`    | `ChoicePreview` | Panel, popups, menu |
| `tri-state-row` | `ChoicePreview` | Panel               |
| `logic-switch`  | `FieldPreview`  | Panel               |
| `range-row`     | `FieldPreview`  | Panel               |
| `field-pill`    | `FieldPreview`  | Header              |
| `field-picker`  | `FieldPreview`  | Pill popup          |
| `field-section` | `FieldPreview`  | Panel               |

## Open

1. Does `query` replace `sortKey`, `term` and `filters` outright? Proposed: yes.
2. Should `LabelKey` be generated from `en_US` JSON, or a hand-written union?
3. Should labels live in state, or be passed as one argument to selectors?
4. Is `labels` a whole catalog or only what Stearch uses? Proposed: only ours.
5. Which fields come first? Proposed: all multi-selects and tri-states, then range, then platform.
