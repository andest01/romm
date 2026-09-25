import { existsSync, rmSync } from "node:fs";
import {
  accountFor,
  isSessionValid,
  login,
  ROLES,
  seedUiState,
  STORAGE_STATE,
} from "./fixtures/auth";
import { test as setup } from "./fixtures/test";

// Runs per role before the suite, as its own Playwright project (see
// `dependencies` in playwright.config.ts). Each saves the authenticated session
// -- cookies plus localStorage -- so the specs can start already logged in
// instead of driving the form 15 times over.
//
// A saved session is reused while it still signs the right account in. One
// that doesn't (expired, another backend, another account) is deleted and
// replaced by a fresh sign-in. Deleting e2e/.auth/ forces that too.
//
// The login FLOW itself is covered by login.spec.ts, which deliberately uses a
// fresh unauthenticated page. This file is plumbing: if it breaks, that spec is
// where the real diagnosis lives.
for (const role of ROLES) {
  setup(`authenticate as ${role}`, async ({ browser, page, e2eEnv }) => {
    // The first load is where the dev server compiles the app on demand, so
    // this is the one test allowed past the suite's 10s default. A debug
    // session's 0 (no timeout) is left alone.
    if (setup.info().timeout > 0) setup.setTimeout(e2eEnv.CI ? 15_000 : 60_000);
    const account = accountFor(e2eEnv, role);
    const saved = STORAGE_STATE[role];
    const note = (description: string) =>
      setup.info().annotations.push({ type: "session", description });

    if (existsSync(saved)) {
      const valid = await isSessionValid(browser, {
        path: saved,
        username: account.username,
        baseURL: setup.info().project.use.baseURL,
      });
      if (valid) {
        note("Reused the saved session.");
        return;
      }
      rmSync(saved);
      note("The saved session no longer signed this account in; signed in again.");
    }

    // Bake the v2 flag into the saved state so every spec inherits it.
    await seedUiState(page, "dark");
    // CI serves a static build, so the dev server's reload retry isn't needed.
    await login(page, account, {
      timeout: e2eEnv.CI ? 5_000 : 15_000,
      attempts: e2eEnv.CI ? 1 : 3,
    });
    await page.context().storageState({ path: saved });
  });
}
