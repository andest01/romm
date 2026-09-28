import {
  gotoFirstRom,
  menuLabels,
  openMoreMenu,
  seedUiState,
  STORAGE_STATE,
} from "./fixtures/auth";
import { t } from "./fixtures/i18n";
import { expect, test } from "./fixtures/test";

// Regression cover for #3954: the ⋯ menu offered Match / Refresh metadata /
// Edit / Delete to users with no ROM write grant. Those endpoints gate on
// ROMS_WRITE, so the click 403'd and the axios interceptor turned that into a
// logout -- the "page reloads back to the login page" in the bug report.
//
// Sessions come from auth.setup.ts; see login.spec.ts for the form itself.
// As i18n keys, translated inside each test.
const WRITE_ACTIONS = [
  "rom.match-rom",
  "rom.refresh-metadata",
  "common.edit",
  "common.delete",
] as const;

test.describe("ROM more-actions menu (read-only user)", () => {
  test.use({ storageState: STORAGE_STATE.viewer });

  test("is offered no write or destructive action", async ({ page }) => {
    await seedUiState(page, "dark");
    await gotoFirstRom(page);
    await openMoreMenu(page);

    const labels = await menuLabels(page);
    for (const action of WRITE_ACTIONS) {
      expect(labels, `"${t(action)}" must not be offered`).not.toContain(
        t(action),
      );
    }
    // The actions they CAN perform are still there -- otherwise this spec would
    // also pass against a menu that failed to render at all.
    expect(labels).toContain(t("rom.download"));
    expect(labels).toContain(t("rom.add-to-favorites"));
  });

  test("has no trailing separator", async ({ page }) => {
    await seedUiState(page, "dark");
    await gotoFirstRom(page);
    const panel = await openMoreMenu(page);

    // Hiding the metadata + destructive groups must hide their leading dividers
    // too, or the menu ends in stray rules. One divider survives: the split
    // between the primary and per-user groups.
    await expect(panel.getByRole("separator")).toHaveCount(1);

    // And the last thing in the panel is an item, not a rule.
    const items = panel.getByRole("menuitem").or(panel.getByRole("separator"));
    await expect(items.last()).toHaveRole("menuitem");
  });

  test("renders in light theme too", async ({ page }) => {
    await seedUiState(page, "light");
    await gotoFirstRom(page);
    const panel = await openMoreMenu(page);

    await expect(panel).toBeVisible();
    const labels = await menuLabels(page);
    expect(labels).not.toContain(t("common.delete"));
    expect(labels.length).toBeGreaterThan(0);
  });
});

test.describe("ROM more-actions menu (admin)", () => {
  test.use({ storageState: STORAGE_STATE.admin });

  test("still gets every action", async ({ page }) => {
    await seedUiState(page, "dark");
    await gotoFirstRom(page);
    const panel = await openMoreMenu(page);

    // `expect.poll` rather than a one-shot `menuLabels()` read: the menu is
    // reactive, so items appear as grants resolve. Snapshotting the array once
    // can capture the pre-grant menu and report a permissions bug that isn't.
    for (const action of WRITE_ACTIONS) {
      await expect
        .poll(() => menuLabels(page), {
          message: `"${t(action)}" must still be offered to admins`,
        })
        .toContain(t(action));
    }
    // Primary | per-user | metadata | destructive => three dividers.
    await expect(panel.getByRole("separator")).toHaveCount(3);
  });
});
