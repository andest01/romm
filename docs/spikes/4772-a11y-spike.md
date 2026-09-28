# Spike: accessible markup and role-based e2e locators (#4772)

Branch `feat/4772-a11y-locators`, built on `feat/4772-e2e-renovation` (#4883). A spike, pushed to the `andest01/romm` fork for review, not opened against `rommapp/romm`.

> 🤖 Written with Claude Code (Claude Opus 5.5), directed and reviewed by the author.

## Why

The e2e specs located elements by CSS class (`form.r-v2-login-form`, `.r-v2-user__name`, `.r-dropzone__cta`), so a styling change broke tests, and nothing checked the app's accessibility. The goal was to give the components the tests touch real roles and accessible names, find elements the way users and assistive tech do, in any language, and add checks that keep it that way.

## What the spike delivers

### Markup fixes (`src/v2`)

| Component                                          | Change                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/RomM.vue`                                     | The root `v-main` renders a `div` in v2, so each page has one `<main>` landmark. v1 is unchanged. |
| `RMenuItem`                                        | Action buttons get `role="menuitem"`, like link items.                                            |
| `RMenu`                                            | The activator points at its open panel with `aria-controls`.                                      |
| `LoginForm`, `ResetForm`                           | Each form has an accessible name, so it is a form landmark.                                       |
| `UserMenu`                                         | The account button's name comes from i18n (`common.account-menu-for`), not an English literal.    |
| `SubtabNav`, `MediaTab`, `FilesTab`, `SaveDataTab` | Subtab rails are named tablists; Media panels are `tabpanel`s.                                    |
| `RDropzone`                                        | The call-to-action is named by `inputLabel`, with the hint as its description.                    |
| `GameActions`                                      | The ribbon is a named `group` (`rom.game-actions`).                                               |
| `PdfViewer`                                        | Eight icon buttons had no accessible name, only a tooltip; each now has a translated label.       |
| `GameHeader`                                       | The platform icon is decorative next to its own label.                                            |
| `AuthLayout`, `BottomNav`                          | The login footer and the mobile bottom bar are landmarks.                                         |

New i18n keys (`common.account-menu`, `common.account-menu-for`, `rom.game-actions`) are translated in all 18 locales.

### Locators by role and translated name

- Specs and fixtures use `getByRole`, `getByLabel` and accessible names instead of CSS classes.
- Names come from the app's own locale files via `t("ns.key")` (`e2e/fixtures/i18n.ts`). The app is set to the test locale before it boots, so the suite passes in any language. The optional `E2E_LOCALE` picks one, validated against the shipped locales.
- This fixed signed-in tests on phones: the old locator waited for a user name the app bar hides there.

### Checks that keep it fixed

| Check                                           | Where                    | What it catches                                                                                   |
| ----------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `playwright/no-raw-locators` (installed plugin) | `eslint.e2e.config.js`   | CSS selectors in specs. Four allowed selectors, each with a reason.                               |
| `no-restricted-syntax` (core ESLint)            | `eslint.e2e.config.js`   | Literal text in `getBy*`, `getByRole` names, `hasText` and text assertions.                       |
| axe in a real browser                           | `e2e/a11y.spec.ts`       | Login, home, a game's overview and Media tab, on all 7 device projects, in dark and light themes. |
| Known violations                                | `e2e/a11y-known.ts`      | Matched by rule and a stable selector; the list only shrinks.                                     |
| Storybook axe gate                              | `test/storybook.test.ts` | Now every v2 story, not just `lib/` and `components/shared/`.                                     |
| `LoginForm` story                               | `LoginForm.stories.ts`   | A `play()` that finds the form by role and name.                                                  |

`color-contrast` still runs but is report-only: findings go to each test's annotations in the HTML report until the palette is discussed.

## Results (local backend, 2026-09-28)

- Full suite, English: all tests pass except `game-media-files` > "Manual: gets the empty state", which depends on library data (the first ROM has a manual) and is left alone on purpose.
- a11y scan: 44/44, twice in a row. Removing an entry from `a11y-known.ts` makes it fail.
- Suite in German (`E2E_LOCALE=de_DE`): 26/27; the same manual test is the only failure, now looking for "Noch kein Handbuch".
- Storybook: 441/441 stories pass their axe scan and `play()`.

## Known violations, not fixed here

| Rule                          | Where                                                   | Why it waits                                       |
| ----------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| `page-has-heading-one`        | Login, home                                             | Needs a visually-hidden primitive, which v2 lacks. |
| `image-redundant-alt`         | Game cover                                              | Part of the `GameCard` link refactor below.        |
| `heading-order`               | Overview section heads                                  | Headings jump to `h4`.                             |
| `scrollable-region-focusable` | Manual viewer                                           | Scrolls but can't be reached by keyboard.          |
| `region`                      | `RTooltip`                                              | Teleports to `<body>`, outside any landmark.       |
| `color-contrast`              | Home recommendations, platform tile counts, card labels | Report-only, pending a design discussion.          |

## Decisions

- **`group`, not `toolbar`, for game actions:** a toolbar promises arrow-key navigation the ribbon doesn't implement.
- **`data-testid` for the profile role chip:** a plain text chip has no role, and an `aria-label` on a `span` is invalid ARIA.
- **Lint before docs:** conventions live in ESLint rules whose messages say how to fix; `e2e/AGENTS.md` only holds what lint can't check.
- **Stale known entries are annotations, not failures:** some findings depend on library data CI's fixture library doesn't have.

## Follow-ups

- `GameCard`: `aria-pressed` on a link, and buttons nested inside the `<a>`.
- A visually-hidden primitive, then an `h1` on login and home.
- `aria-busy` on gallery grids and the game details view, as a readiness signal for tests.
- Named platform and game lists, to retire the last two allowed CSS selectors.
- `RMenu` Home/End and type-ahead keys.
- A manual keyboard and screen-reader pass in both themes, with screenshots, before any upstream PR.

## Try it

From `frontend/`, with `e2e/.env` pointing at a backend:

```bash
npx playwright test e2e/a11y.spec.ts        # axe on every device and theme
npm run test:e2e:report                      # report-only findings are in each test's annotations
npm run storybook:test                       # axe on every v2 story
```

Set `E2E_LOCALE=de_DE` in `e2e/.env` to run the suite in German.
