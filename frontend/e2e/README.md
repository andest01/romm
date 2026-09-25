# End-to-end tests (Playwright)

These drive a **real running RomM instance**, unlike the Vitest specs, which mount components in isolation. They exist to cover behaviour that only shows up in the assembled app. They live in `e2e/` rather than `src/` or `test/` because Vitest's globs (`src/**/*.{test,spec}.ts`, `test/**/*.{test,spec}.ts`) would otherwise try to run them in jsdom.

## Running tests

1. Have a backend with a populated library. The specs open the first game of the first platform.

2. Copy `e2e/.env.example` to `e2e/.env` (gitignored). Its defaults are the throwaway accounts the backend's seed script creates; against any other backend, replace them with an existing admin and a non-admin viewer. CI passes the same variables to the Playwright step in `.github/workflows/e2e.yml`.

   On a throwaway local backend, create those accounts from the repo root:

   ```bash
   uv run python .github/scripts/seed_e2e_users.py   # --remove to clean up afterwards
   ```

   The suite never runs or reads the seed script. The two only have to agree on the account values, and the CI workflow is the one place that wires them together.

3. Run, from `frontend/`:

   ```bash
   npm run test:e2e          # headless, fail fast
   npm run test:e2e:ui       # UI mode, see Debugging
   ```

## Recording a new test

Click through a flow in a real browser, already signed in, and get a spec file you can commit:

```bash
npm run test:e2e:record -- admin rom-favorite-toggle   # or: viewer <name>
```

In VS Code, the **E2E: record a new test** task does the same and asks for the account and name.

1. **Setup is automatic.** It starts the suite's own dev server, signs in as that account and opens Playwright's recorder on the v2 UI.
2. **Record the flow.** Click through it. Use the recorder toolbar's assert buttons (visible, text, value) to record what the flow should prove as you go. A recording with no assertions only proves the clicks didn't crash.
3. **Close the browser window.** The recording is saved as `e2e/<name>.spec.ts`, rewritten to the suite's conventions:
   - it imports `test` from `./fixtures/test`
   - it starts from that account's saved session
   - it uses relative URLs
   - it's titled with your spec name
4. **Review before committing:**
   - replace brittle generated selectors (CSS paths, `nth()`) with roles and labels
   - run it with `npm run test:e2e -- e2e/<name>.spec.ts`
   - ESLint warns if it has no assertions

To add steps to an existing test instead, open it in VS Code, put the cursor where the new steps go, and use the Playwright extension's **Record at cursor**. It runs the test up to that point (signed in, via `setup`), then records from there.

## Debugging

The fail-fast timeouts (10s per test) switch off automatically whenever a debugger is attached or `PWDEBUG` is set, so a test can sit on a breakpoint for as long as you need.

**In VS Code (breakpoints in test code).** Install the recommended **Playwright Test for VS Code** extension (`ms-playwright.playwright`) and open the Testing sidebar.

- **Debug a test:** set a breakpoint in a spec or helper, right-click the gutter arrow next to the test, and pick **Debug Test**. The `setup` project runs first automatically, so the test starts signed in.
- **Watch it run:** tick **Show browser** in the Playwright panel. Tests then drive a real, visible browser that stays open between runs.
- **Find a selector:** **Pick locator** lets you point at an element in that browser and copies a locator for it.
- **Look inside the test:** while paused, hover variables, step through lines and use the Debug Console, as with any Node program.

**In the Playwright UI (time travel).** Run `npm run test:e2e:ui`, or the **E2E: UI mode** VS Code task.

- **Every step is recorded:** each action has a DOM snapshot, plus network and console logs.
- **Scrub back and forth:** see what the page looked like at the moment an assertion ran.
- **Watch mode:** reruns a test when you save it.

This is the best way to understand a failure you didn't write.

**Step through actions.** Put `await page.pause();` where you want to stop, then run `npm run test:e2e:debug -- e2e/rom-actions.spec.ts`.

- **The Playwright Inspector opens:** step one action at a time, and try locators live against the page.
- **Remove it before committing:** ESLint (`playwright/no-page-pause`) rejects a committed `page.pause()`, because it would hang a headless run.

**Debug the app itself (Vue code).** Run headed with `npm run test:e2e:headed`, or use **Show browser**.

- **Open DevTools:** press F12 in the test browser.
- **Pause in the app:** a `debugger;` statement in any Vue file now pauses there. Locally the suite runs the Vite dev server, so the source maps show the real `.vue` and `.ts` files.

**After a failure.** Run `npm run test:e2e:report`, or the **E2E: open last report** task.

- **What's in the report:** each failure's screenshot and full trace. The trace is the same time-travel view as UI mode.
- **CI failures too:** download the `playwright-report` artifact from the failed workflow, then open it the same way.

## Environment

The suite is sealed from the rest of the project's environment:

- Locally, `e2e/.env` is required and is the only source of `E2E_*` variables; the shell's are ignored. CI has no file and reads the workflow env.
- Playwright starts its own dev server on port 3100, so it never reuses a `npm run dev` started with other settings.
- That server's backend is set by exactly one of `E2E_DEV_PORT` (a local backend) or `E2E_DEV_PROXY_TARGET` (a remote one), never by the project's `DEV_PROXY_TARGET` or `DEV_PORT`.

`e2e-environment.ts` parses and validates these variables into one `E2EEnv` object before any server or browser starts. Tests receive it through the `e2eEnv` fixture. See `CLAUDE.md` in this folder for the rules.

If anything is wrong, the run stops with one error that lists every problem, naming variables and line numbers but never values. It rejects:

- missing or empty required variables
- malformed lines and keys set twice
- keys without the `E2E_` prefix
- unknown `E2E_*` keys, with a "did you mean" suggestion
- stray whitespace around names and URLs
- URLs that aren't http(s)
- ports and worker counts out of range
- the same account used as both admin and viewer
- both backend settings, or neither

## Type checking

The specs have their own TypeScript project (`e2e/tsconfig.json`, Node plus DOM types), separate from the app's. Run it with `npm run typecheck:e2e`. `playwright.config.ts` is Node tooling, so it's checked with the other Node scripts by `npm run typecheck:scripts`. CI runs both in the typecheck workflow.

## Authentication

`auth.setup.ts` runs first as its own project, logs each fixture user in once and saves the session to `e2e/.auth/` (gitignored), whichever directory the run starts from. Specs pick an identity with `test.use({ storageState: STORAGE_STATE.viewer })` and start signed in, so the form is driven twice per run rather than once per test.

`login.spec.ts` is the only spec that drives the form, using the default unauthenticated page. If auth breaks, diagnose there.
