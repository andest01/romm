# Contradictions

Places where two sources give different guidance, collected on 2026-11-07 for review. Each entry states what each source says and where. Nothing here has been resolved yet.

Sources:

- **v4:** the design spec, `__perf_images/ui/v4-spec.md` (git-ignored notes).
- **App skills:** `.claude/skills/frontend-*/SKILL.md` and `frontend/AGENTS.md`.
- **Stearch docs:** `AGENTS.md`, `DECISIONS.md`, `specs/` and `NAMING-CONVENTIONS.md` in this folder.
- **Code:** what this folder does today.

## 1. Between v4 and the app skills

| #   | Topic             | v4 says                                                                                                                                                | App skills say                                                                                                                                                                                                                            |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Grid column count | Principle 3: "Column counts come from the breakpoint, never from a ResizeObserver." Section 5.1: four columns at full width, three beside the sidebar. | `frontend-input`: "Grids size via `useResponsiveColumns` (ResizeObserver), never a fixed column count." `GalleryShell` uses it. **Decided 2026-11-07:** Stearch follows the app skill, keeping the count view-only, with per-kind bounds. |

## 2. Between v4 and what Stearch built

These follow from the plan in `DECISIONS.md` to build in an ideal setup first and compare. They are listed so each one is a known difference, not a surprise.

| #    | Topic                           | v4 says                                                                                    | Stearch does                                                                                                                                                 |
| ---- | ------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2.1  | Filter state                    | Section 4.1: "No new filter model. Everything reads and writes `galleryFilter`."           | Holds its own `query` in `Stearch.store.ts`. `DECISIONS.md` lists the gallery stores under "Don't reuse".                                                    |
| 2.2  | URL sync                        | Sections 3.1 and 4.1: mirrored to the URL by `useGalleryFilterUrl`, so links keep working. | No URL sync yet (spec 002, G10).                                                                                                                             |
| 2.3  | Advanced panel                  | Section 4.2: "`FilterDrawer.vue` is reused, not rewritten."                                | Built its own panel in `fields/` and `sidebar/`. Spec 006 lists `FilterDrawer` as a one-line swap.                                                           |
| 2.4  | Layout API                      | Section 2: `SearchLayout` with Vue slots and `dock="left \| right \| none"`.               | `Stearch.pure-layout.vue` takes parts as `Component` props, with `panelState`, `panelAxis` and `panelPosition`.                                              |
| 2.5  | Search debounce                 | Section 3.1: 300 ms through `useDebouncedSearch`.                                          | 200 ms in `Stearch.store.ts` (spec 002, G1).                                                                                                                 |
| 2.6  | Letter headings on a phone      | `.phone .lh { display: none }`; the sticky waypoint header carries the section.            | Headings show at every size, because they push the band.                                                                                                     |
| 2.7  | Default panel state             | Section 13, open decision 2: whether Advanced mode remembers open or closed is undecided.  | Opens by default at every size, so on a phone the sheet covers the results on arrival.                                                                       |
| 2.8  | Views                           | Section 3.1: Tiles, Table and Swarm.                                                       | Tiles and Table. Swarm is deferred (spec 002, C4).                                                                                                           |
| 2.9  | Where the panel becomes a sheet | Section 2: docked at 25% from `md` (960 px) up, a full-screen sheet below `md`.            | Docked from `sm` (600 px) up, an overlay only at `xs` (`Stearch.pure-layout.vue`).                                                                           |
| 2.10 | Row sizing                      | Section 5.1: tiles are a fixed 56 px with a 28x42 cover.                                   | Matches, but `rowHeightFor` sizes phone covers from the whole list width, which now includes rail padding. Covers come out narrower than the height assumes. |

## 3. Between the app skills and Stearch

`AGENTS.md` here says this folder deliberately breaks the `frontend-components` rules on file layout and state. These are the specific points.

| #   | Topic          | App skills say                                                                                                                                                          | Stearch does                                                                                                             |
| --- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 3.1 | Shared stores  | `frontend-components`, premise 2: shared stores are canonical; v2 imports them and never forks them.                                                                    | Its own store and state model, alongside `galleryFilter` and `galleryRoms`.                                              |
| 3.3 | File layout    | `frontend-components`: a composite is a flat `.vue` file, or a folder with the same internal structure as a primitive (`RFoo/RFoo.vue`, `RFoo.stories.ts`, `index.ts`). | `<domain>.<role>.<ext>` files grouped by domain folder, as in `NAMING-CONVENTIONS.md`.                                   |
| 3.4 | Grid columns   | `frontend-input`: never a fixed column count.                                                                                                                           | `COLUMNS` in `content/list/list.selectors.ts` is a fixed table per item kind.                                            |
| 3.5 | Browser checks | `frontend/AGENTS.md` and `review-polish`: don't call UI work done without a browser pass in both themes and every input mode.                                           | Typecheck, lint and unit tests run on every change. Storybook has not run here, and browser checks have been the user's. |

## 4. Within Stearch's own docs and code

Places where a doc fell behind a later change.

| #    | Where                                                   | Says                                                                                                         | Now                                                                                                           |
| ---- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 4.1  | `DECISIONS.md`, "App actions are a domain type"         | The unions are `StearchQueryAction`, `StearchLayoutAction`, `StearchSelectionAction`, `StearchWindowAction`. | They are `StearchQueryAction`, `StearchViewAction`, `StearchAttentionAction`, `StearchWindowAction`.          |
| 4.2  | `DECISIONS.md`, XState table                            | States are `StearchStatus`.                                                                                  | The type is `RequestStatusCoreConcept`.                                                                       |
| 4.3  | `DECISIONS.md`, effects                                 | Effects key on `search/set` and `sort/set`.                                                                  | Those actions are now `query/set`, `query/add` and `query/remove`.                                            |
| 4.4  | `AGENTS.md`, "Layout" and rule 3                        | The root state is `IStearchStateProps`.                                                                      | It is `IStearchState`.                                                                                        |
| 4.5  | `AGENTS.md`, "The solve for layouts"                    | "`isPanelShown` is visibility."                                                                              | It is `panelState: "shown" \| "hidden"`.                                                                      |
| 4.6  | `AGENTS.md`, "Fixing a bug"                             | The worked example's fix lives in `selectHeaderState`.                                                       | The selector is `selectHeaderProps`; the action shape in the example is current.                              |
| 4.7  | `AGENTS.md`, rule 3                                     | "Labels are passed in from containers."                                                                      | Labels are state, and selectors hand views finished text (`DECISIONS.md`, `LESSONS.md`).                      |
| 4.8  | Spec 001, V4                                            | Typing dispatches `search/set`.                                                                              | It dispatches `query/set`.                                                                                    |
| 4.9  | Spec 002, A1, A2 and B1                                 | Sort uses `sort/set`; "Load more" is a stand-in.                                                             | Sort uses `query/set`; the list is virtualised and has no Load more.                                          |
| 4.10 | `DECISIONS.md`, "Say what happened" (before 2026-11-07) | `selection/toggle` is right.                                                                                 | Replaced: actions are idempotent. The section now says so; older specs may still describe toggles.            |
| 4.11 | `NAMING-CONVENTIONS.md`                                 | Counts are from commit 2d7c1bc28.                                                                            | Files have moved since (selector split, `sidebar.props.ts`, `eslint-rules/`), so some counts are out of date. |
