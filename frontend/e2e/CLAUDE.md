# E2E suite rules

- **Environment access for tests lives in `e2e-environment.ts`.** Never read `process.env`, `import.meta.env` or a `.env` file in specs, `*.setup.ts` or `fixtures/`. `playwright.config.ts` and `global-setup.ts` run outside any test and may read `process.env` directly.
- **Prefer Playwright's own tools over custom scripts.** Recording, debugging, reports and traces all come from the Playwright CLI and the VS Code extension. Don't add wrapper scripts for them; document the native way in the README.
- **Recorded code is a draft.** Before committing:
  - give it real assertions
  - replace CSS-path and `nth()` selectors with roles and labels
  - run it
- **New variable?** Do all four in the same change:
  1. Add it to the `E2EEnv` interface, 1:1 with the variable name (required means a required prop), and to `EXPECTED` with a description of a valid value.
  2. Parse and validate it in `readE2EEnv()`, pushing to `problems` rather than throwing, so one run reports everything. Name the variable, never its value.
  3. Add it to `.env.example` with a one-line comment.
  4. If CI needs it, add it to `.github/workflows/e2e.yml`.
- **Tests get the environment from their arguments:** `async ({ page, e2eEnv }) => ...`, with `test` imported from `./fixtures/test`. Importing `e2e-environment.ts` for values is an ESLint error. `import type { E2EEnv }` is fine.
- **Helpers in `fixtures/` take values as parameters** and never read the environment themselves.
- **Timeouts:**
  - **Hard-coded timeouts:** don't add them, or `test.setTimeout` calls, that would outlive a debug session. The config sets every timeout to 0 when a debugger is attached.
  - **A test that genuinely needs longer:** leave a debug session's 0 alone, as `auth.setup.ts` does.
- **Fail on the cause, not on a timeout.** When the backend or the app fails, a test should say so at once, naming the request, not time out later blaming an element.
  - **Import `test` and `expect` from `fixtures/test`** (ESLint enforces it). Its automatic guard fails the test the moment an `/api` call returns 5xx or the app throws an uncaught error. Opt out only in a test that triggers one on purpose, with `test.use({ failOnAppErrors: false })` and a comment saying why.
  - **Check responses, don't filter them.** When a helper waits for a response, accept any status, then check it and throw a message naming the method, path and status, as `gotoHydrated()` does. Never put `status() === 200` inside a `waitForResponse` predicate; a failure then just waits out the timeout.
  - **Retry only what's transient.** Retries are for dev-server reloads and similar hiccups. A server answer (4xx/5xx) is final: throw at once, as `login()` does.
  - **Don't paper over slowness** with longer timeouts, sleeps or `waitForTimeout`. Find the event to wait for.
  - **Observe the app's own traffic; don't call the API from tests.**
- **Saved sessions in `e2e/.auth/` are reused across runs.** `auth.setup.ts` checks each one through the UI (`isSessionValid()`: the right user's name in the app bar) and replaces it with a fresh sign-in only when that check fails, noting which it did as a test annotation. Keep that check UI-only, per "don't call the API from tests". A session that goes stale mid-run fails in `gotoHydrated()` with a message saying so.
- **`login.spec.ts` must start signed out,** via its explicit empty `storageState`. Never let it inherit a saved session.
- **Debugging help for a human:** point them to the README's Debugging section rather than adding logging to the specs.
- **Lint rules for e2e live in `frontend/eslint.e2e.config.js`,** never inline in `eslint.config.js`. Tests may break app-code rules, but only as a named exception in that file, with a one-line reason and the narrowest `files` glob. Don't use `eslint-disable` comments in e2e code; if a rule is wrong for tests, add the exception there.
