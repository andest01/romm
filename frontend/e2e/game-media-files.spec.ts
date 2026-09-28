import type { Locator, Page } from "@playwright/test";
import { gotoFirstRom, seedUiState, STORAGE_STATE } from "./fixtures/auth";
import { t } from "./fixtures/i18n";
import { expect, test } from "./fixtures/test";

// The Media and Files tabs write to the ROM (manuals, soundtracks, shared
// screenshots, ROM files) and every one of those endpoints gates on ROMS_WRITE.
// A read-only user must not be offered upload/delete there -- same 403-to-logout
// trap as the ⋯ menu.
//
// The per-user "My screenshots" section is the deliberate exception: it writes
// user assets, which every authenticated user may do.
//
// NOTE: MediaTab keeps every subtab panel mounted (v-show, not v-if) so the
// heavy async panels don't re-mount on each switch. Assertions must therefore
// scope to the VISIBLE panel -- a document-wide locator would also match the
// hidden panels and pass or fail for the wrong reason.
//
// Sessions come from auth.setup.ts; see login.spec.ts for the form itself.

async function openTab(page: Page, tabKey: string) {
  await page.getByRole("tab", { name: t(tabKey) }).click();
}

// Media subtabs are their own named tablist, distinct from the top-level tabs.
async function openSubtab(page: Page, subtabKey: string) {
  await page
    .getByRole("tablist", { name: t("rom.media") })
    .getByRole("tab", { name: t(subtabKey) })
    .click();
}

/** The one Media panel currently on screen: hidden panels leave the a11y tree. */
function visiblePanel(page: Page): Locator {
  return page.getByRole("tabpanel");
}

// Both panels whose upload path is ROM-scoped, so both must be inert. A test
// title, then i18n keys: the subtab, its empty state, its dropzone's name.
const ROM_SCOPED_SUBTABS = [
  ["Manual", "rom.manual", "rom.manual-empty", "rom.upload-manual"],
  [
    "Soundtrack",
    "rom.soundtrack",
    "rom.soundtrack-empty",
    "rom.upload-soundtrack",
  ],
] as const;

test.describe("Media tab write affordances (read-only user)", () => {
  test.use({ storageState: STORAGE_STATE.viewer });

  for (const [title, subtab, emptyText, dropzone] of ROM_SCOPED_SUBTABS) {
    test(`${title}: gets the empty state, not a dropzone`, async ({ page }) => {
      await seedUiState(page, "dark");
      await gotoFirstRom(page);
      await openTab(page, "rom.media");
      await openSubtab(page, subtab);

      const panel = visiblePanel(page);
      // The plain REmptyState replaces the dropzone: same message, no CTA,
      // no drag-and-drop hint, no Upload button.
      await expect(panel.getByText(t(emptyText))).toBeVisible();
      await expect(
        panel.getByRole("button", { name: t(dropzone) }),
      ).toHaveCount(0);
      await expect(panel.getByText(t("common.dropzone-hint"))).toHaveCount(0);
      await expect(
        panel.getByRole("button", { name: t("common.upload"), exact: true }),
      ).toHaveCount(0);
    });
  }

  test("Screenshots: the shared ROM section is hidden but the per-user one stays writable", async ({
    page,
  }) => {
    await seedUiState(page, "dark");
    await gotoFirstRom(page);
    await openTab(page, "rom.media");
    await openSubtab(page, "rom.screenshots");

    const panel = visiblePanel(page);
    // Shared section writes to the ROM: gone for a read-only user with nothing
    // to show.
    await expect(panel.getByText(t("rom.screenshots-section-rom"))).toHaveCount(
      0,
    );
    // Per-user section writes user assets: must survive, dropzone included.
    // Hiding this would be the regression in the opposite direction.
    await expect(
      panel.getByText(t("rom.screenshots-section-mine")),
    ).toBeVisible();
    await expect(
      panel.getByRole("button", { name: t("rom.upload-screenshots") }),
    ).not.toHaveCount(0);
  });
});

test.describe("Media tab write affordances (admin)", () => {
  test.use({ storageState: STORAGE_STATE.admin });

  for (const [title, subtab, , dropzone] of ROM_SCOPED_SUBTABS) {
    test(`${title}: still gets the dropzone`, async ({ page }) => {
      await seedUiState(page, "dark");
      await gotoFirstRom(page);
      await openTab(page, "rom.media");
      await openSubtab(page, subtab);

      const panel = visiblePanel(page);
      // Empty ROM => CTA dropzone; populated ROM => Upload button. Either is a
      // write affordance, and a read-only user gets neither. `.or()` keeps this
      // auto-waiting: a bare `count()` reads 0 before the async panel mounts.
      const writeAffordance = panel
        .getByRole("button", { name: t(dropzone) })
        .or(
          panel.getByRole("button", { name: t("common.upload"), exact: true }),
        );
      await expect(writeAffordance.first()).toBeVisible();
    });
  }

  test("Screenshots: sees the shared ROM section", async ({ page }) => {
    await seedUiState(page, "dark");
    await gotoFirstRom(page);
    await openTab(page, "rom.media");
    await openSubtab(page, "rom.screenshots");

    await expect(
      visiblePanel(page).getByText(t("rom.screenshots-section-rom")),
    ).toBeVisible();
  });
});

// "All files" has no destination of its own, so it offers "Upload to folder";
// a folder subtab offers Upload straight into that folder.
function uploadButton(page: Page): Locator {
  return page.getByRole("button", { name: t("common.upload"), exact: true });
}

/** The Files tab's folder subtabs. */
function filesSubtabs(page: Page): Locator {
  return page
    .getByRole("tablist", { name: t("rom.tab-files") })
    .getByRole("tab");
}

function uploadToFolderButton(page: Page): Locator {
  return page.getByRole("button", {
    name: t("rom.upload-to-folder"),
    exact: true,
  });
}

test.describe("Files tab write affordances", () => {
  test.describe("read-only user", () => {
    test.use({ storageState: STORAGE_STATE.viewer });

    test("gets no upload button", async ({ page }) => {
      await seedUiState(page, "dark");
      await gotoFirstRom(page);
      await openTab(page, "rom.tab-files");

      await expect(filesSubtabs(page).first()).toBeVisible();
      await expect(uploadButton(page)).toHaveCount(0);
      await expect(uploadToFolderButton(page)).toHaveCount(0);
    });
  });

  test.describe("admin", () => {
    test.use({ storageState: STORAGE_STATE.admin });

    test("gets Upload to folder from All files", async ({ page }) => {
      await seedUiState(page, "dark");
      await gotoFirstRom(page);
      await openTab(page, "rom.tab-files");

      await expect(uploadToFolderButton(page)).toBeVisible();
      await expect(uploadButton(page)).toHaveCount(0);
    });

    test("gets Upload from a folder subtab", async ({ page }) => {
      await seedUiState(page, "dark");
      await gotoFirstRom(page);
      await openTab(page, "rom.tab-files");
      await filesSubtabs(page)
        .and(page.getByRole("tab", { selected: false }))
        .first()
        .click();

      await expect(uploadButton(page)).toBeVisible();
      await expect(uploadToFolderButton(page)).toHaveCount(0);
    });
  });
});
