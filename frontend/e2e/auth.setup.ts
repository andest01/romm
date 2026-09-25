import {
  accountFor,
  login,
  ROLES,
  seedUiState,
  STORAGE_STATE,
} from "./fixtures/auth";
import { test as setup } from "./fixtures/test";

// Runs once per role before the suite, as its own Playwright project (see
// `dependencies` in playwright.config.ts). Each saves the authenticated session
// -- cookies plus localStorage -- so the specs can start already logged in
// instead of driving the form 15 times over.
//
// The login FLOW itself is covered by login.spec.ts, which deliberately uses a
// fresh unauthenticated page. This file is plumbing: if it breaks, that spec is
// where the real diagnosis lives.
for (const role of ROLES) {
  setup(`authenticate as ${role}`, async ({ page, e2eEnv }) => {
    // The first load is where the dev server compiles the app on demand, so
    // this is the one test allowed past the suite's 10s default.
    setup.setTimeout(e2eEnv.CI ? 15_000 : 60_000);
    // Bake the v2 flag into the saved state so every spec inherits it.
    await seedUiState(page, "dark");
    // CI serves a static build, so the dev server's reload retry isn't needed.
    await login(page, accountFor(e2eEnv, role), {
      timeout: e2eEnv.CI ? 5_000 : 15_000,
      attempts: e2eEnv.CI ? 1 : 3,
    });
    await page.context().storageState({ path: STORAGE_STATE[role] });
  });
}
