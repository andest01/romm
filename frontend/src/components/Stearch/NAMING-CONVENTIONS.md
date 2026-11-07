# Stearch naming conventions

A file is named `<domain>.<role>.<ext>`. The domain is the folder's name, for example `list` or `sidebar`, or `Stearch` at the root. The role says what the file may contain, so the name alone tells you its rules. A role can be hyphenated when it takes two words: `pure-component`, `layout-props`, `state-props`, `story-args`.

Counts are committed files on `feature/stearch` (2d7c1bc28), 125 code files in all.

## Components

| Suffix                 | Count | What it is                                             | Rules                                                                                                                                                                                                          |
| ---------------------- | ----- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `*.pure-component.vue` | 19    | A view: props in, events out                           | No state, stores or composables. ESLint enforces it                                                                                                                                                            |
| `*.container.vue`      | 16    | A bridge from the store to a pure component or layout  | Runs selectors, binds props, dispatches. Builds an action only for a DOM-only value                                                                                                                            |
| `*.pure-layout.vue`    | 3     | A pure component that places parts in named grid areas | Same purity rules as pure components. Props are only layout things: at least two `Component` parts (lint-checked), view states such as `"shown" \| "hidden"` rather than booleans, and rarely a CSS preference |

## Types

| Suffix                   | Count | What it is                                                          |
| ------------------------ | ----- | ------------------------------------------------------------------- |
| `*.props.ts`             | 11    | Props and emits of a domain's pure components                       |
| `*.pure-layout-props.ts` | 3     | Props of a pure layout: parts plus layout states                    |
| `*.state-props.ts`       | 1     | The root state, `IStearchState`, and the types derived from the API |

## State

| Suffix                          | Count | What it is                                                                                             |
| ------------------------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| `*.actions.ts`                  | 1     | Every action, one union per domain                                                                     |
| `*.reducer.ts`                  | 1     | Pure `(state, action) => state`                                                                        |
| `*.store.ts`                    | 1     | The Pinia store: `dispatch`, plus effects such as fetching                                             |
| `Stearch.selectors.ts`          | 1     | The trunk: one plain selector per state field, the only reader of `IStearchState`                      |
| `Stearch.<family>.selectors.ts` | 5     | Branches: memoized families by state branch (results, rows, attention, query, layout)                  |
| `<domain>.selectors.ts`         | 9     | Leaves: exactly the props a domain's pure component takes, including the action arrays views hand back |
| `*.create-selector.ts`          | 1     | The memoizer, shaped like `reselect`                                                                   |
| `*.schema.ts`                   | 1     | The Zod seam: checks API data and freezes it                                                           |

## Data

| Suffix              | Count | What it is                                                     |
| ------------------- | ----- | -------------------------------------------------------------- |
| `*.fields.ts`       | 1     | One line of data per search field                              |
| `*.items.ts`        | 1     | Which component draws each item kind                           |
| `*.labels.ts`       | 1     | Label keys generated from `en_US`                              |
| `*.window-size.ts`  | 1     | The page size for windowed fetches                             |
| `*.fake-api.ts`     | 1     | A fake `getRoms` for stories and tests                         |
| `*.eslint.js`       | 1     | Stearch's lint rules, spread into `frontend/eslint.config.js`  |
| `eslint-rules/*.js` | 1     | Stearch's own lint rules, loaded as the local `stearch` plugin |

## Tests and stories

| Suffix                        | Count | What it is                                              |
| ----------------------------- | ----- | ------------------------------------------------------- |
| `*.selectors.test.ts`         | 8     | Selector tests, arrange-act-assert                      |
| `*.reducer.test.ts`           | 1     | Reducer tests                                           |
| `*.schema.test.ts`            | 1     | Seam tests                                              |
| `*.container.test.ts`         | 2     | Mounted container tests, with child components stubbed  |
| `*.pure-component.stories.ts` | 19    | One per pure component, controls only                   |
| `*.container.stories.ts`      | 10    | Seeded from a `state` arg                               |
| `*.pure-layout.stories.ts`    | 3     | Plain labelled blocks in each part                      |
| `*.fixtures.ts`               | 1     | Shared states and rows, built through the real pipeline |
| `*.story-args.ts`             | 2     | Shared controls for a family of stories                 |
| `*.story-helpers.ts`          | 1     | `renderContainer` and shared container story setup      |

A story or test is named after the file it covers, plus `.stories.ts` or `.test.ts`.

## Documents

| File                    | Count | What it is                          |
| ----------------------- | ----- | ----------------------------------- |
| `AGENTS.md`             | 1     | How to work here                    |
| `DECISIONS.md`          | 1     | What we chose and why               |
| `LESSONS.md`            | 1     | What happened, with real counts     |
| `NAMING-CONVENTIONS.md` | 1     | This file                           |
| `specs/NNN-<topic>.md`  | 6     | Numbered specs with requirement IDs |

## Doesn't fit yet

| File                                | Problem                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `content/list/use-scroller-jump.ts` | No domain and no role. It's a composable, the one kind of file we have no suffix for |
