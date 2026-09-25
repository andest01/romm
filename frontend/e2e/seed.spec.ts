import { STORAGE_STATE } from "./fixtures/auth";
import { test } from "./fixtures/test";

// Entry point for Playwright's test agents (planner/generator/healer): they run
// this first, so everything they do starts from the suite's own setup, signed in.
test.use({ storageState: STORAGE_STATE.admin });

test("seed", async ({ page }) => {
  await page.goto("/");
});
