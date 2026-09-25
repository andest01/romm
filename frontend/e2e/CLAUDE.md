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
- **Debugging help for a human:** point them to the README's Debugging section rather than adding logging to the specs.
- **Lint rules for e2e live in `frontend/eslint.e2e.config.js`,** never inline in `eslint.config.js`. Tests may break app-code rules, but only as a named exception in that file, with a one-line reason and the narrowest `files` glob. Don't use `eslint-disable` comments in e2e code; if a rule is wrong for tests, add the exception there.
