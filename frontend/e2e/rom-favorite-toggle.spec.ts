import { STORAGE_STATE } from "./fixtures/auth";
import { test } from "./fixtures/test";

test.use({ storageState: STORAGE_STATE.admin });

test("rom-favorite-toggle", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Snatcher" }).click();
  await page.getByRole("link", { name: "Snatcher" }).click();
  await page.getByRole("link", { name: "Snatcher" }).click();
  await page
    .getByRole("group", { name: "Primary navigation" })
    .getByLabel("Home")
    .click();
  await page.getByRole("link", { name: "Search" }).click();
});
