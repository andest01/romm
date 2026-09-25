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
   npm run test:e2e          # headless
   npm run test:e2e:ui       # interactive, for debugging a failure
   ```

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

The specs have their own TypeScript project (`e2e/tsconfig.json`, Node plus DOM types), separate from the app's. Run it with `npm run typecheck:e2e`. CI runs it in the typecheck workflow.

## Authentication

`auth.setup.ts` runs first as its own project, logs each fixture user in once and saves the session to `playwright/.auth/` (gitignored). Specs pick an identity with `test.use({ storageState: STORAGE_STATE.viewer })` and start signed in, so the form is driven twice per run rather than once per test.

`login.spec.ts` is the only spec that drives the form, using the default unauthenticated page. If auth breaks, diagnose there.
