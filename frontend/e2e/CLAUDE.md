# E2E suite rules

- **Environment access for tests lives in `e2e-environment.ts`.** Never read `process.env`, `import.meta.env` or a `.env` file in specs, `*.setup.ts` or `fixtures/`. `playwright.config.ts` and `global-setup.ts` run in the runner, not in tests, and may read `process.env` directly.
- **New variable?** Do all four in the same change:
  1. Add it to the `E2EEnv` interface, 1:1 with the variable name (required means a required prop), and to `EXPECTED` with a description of a valid value.
  2. Parse and validate it in `readE2EEnv()`, pushing to `problems` rather than throwing, so one run reports everything. Name the variable, never its value.
  3. Add it to `.env.example` with a one-line comment.
  4. If CI needs it, add it to `.github/workflows/e2e.yml`.
- **Tests get the environment from their arguments:** `async ({ page, e2eEnv }) => ...`, with `test` imported from `./fixtures/test`. Importing `e2e-environment.ts` for values is an ESLint error. `import type { E2EEnv }` is fine.
- **Helpers in `fixtures/` take values as parameters** and never read the environment themselves.
