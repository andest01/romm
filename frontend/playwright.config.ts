import { defineConfig, devices } from "@playwright/test";
import { readE2EEnv, webServerEnv } from "./e2e/e2e-environment";

// End-to-end suite. Accounts and the backend under test come from e2e/.env
// (see e2e/.env.example); CI sets the same variables in the workflow instead.
//   npm run test:e2e
const env = readE2EEnv();

const isCI = env.CI;
// Off the default dev port, so the suite never attaches to (or collides with)
// a `npm run dev` started with some other environment.
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  // Permission gating is global state on the server (the fixture users' grants),
  // so the specs read it rather than mutate it and are safe to parallelise.
  fullyParallel: true,
  forbidOnly: isCI,
  // Retries double a failure's wall time and hide flakes; CI keeps one and
  // still fails the run if a test only passed on retry.
  retries: isCI ? 1 : 0,
  failOnFlakyTests: isCI,
  maxFailures: isCI ? 5 : 0,
  // Every worker logs in and hammers ONE dev server, whose on-demand Vite
  // transforms are the bottleneck. Too many workers turns real passes into
  // timeouts, so keep the pool small locally. CI serves a static build, which
  // has no such bottleneck.
  workers: env.E2E_WORKERS ?? (isCI ? 4 : 2),
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  // Tuned for a tight LAN: anything slower is a bug, not a reason to wait.
  // A test that genuinely needs longer overrides it with `test.setTimeout`.
  timeout: 10_000,
  expect: { timeout: 3_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 5_000,
    navigationTimeout: 5_000,
    // The production build ships a PWA service worker that precaches ~9MB on
    // first load. Every test gets a fresh context, so that install would run
    // over and over, competing with the app for the first navigation, and its
    // cache makes runs non-deterministic. Nothing here tests offline support.
    serviceWorkers: "block",
  },
  projects: [
    // Logs each fixture user in once and saves the session; every spec then
    // starts authenticated via `test.use({ storageState })` instead of driving
    // the login form again. login.spec.ts is the one place the form itself is
    // exercised, and it opts out by using a fresh page.
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testIgnore: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  // The suite always serves the app itself, configured only by `webServerEnv()`.
  //
  // CI serves the STATIC bundle, built in its own workflow step. The dev server
  // compiles on demand, and force-reloads the page whenever it discovers a new
  // dependency to pre-bundle ("optimized dependencies changed. reloading") --
  // which wipes whatever a test was mid-way through. Serving a build removes
  // that entire class of failure and is much faster: the build is ~5s and the
  // suite drops from ~3.7min to ~35s. `vite preview` inherits `server.proxy`,
  // so /api and /ws still reach the backend on DEV_PORT (5000 is the default
  // `main.py` binds).
  //
  // Locally it stays on the dev server, so a code change is picked up without a
  // rebuild. `login()` retries to absorb the reload described above.
  webServer: {
    command: isCI
      ? `npm run preview -- --port ${PORT} --strictPort --host 127.0.0.1`
      : `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    env: webServerEnv(env),
    reuseExistingServer: false,
    timeout: isCI ? 30_000 : 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
