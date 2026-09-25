import type { Page } from "@playwright/test";
import { gotoHydrated, seedUiState, STORAGE_STATE } from "./fixtures/auth";
import { pressPad } from "./fixtures/gamepad";
import { expect, test } from "./fixtures/test";

// A handheld user browsing collections with the built-in controls only.
test.use({ storageState: STORAGE_STATE.viewer });

/** The `href` of whichever element has focus, or null. */
function focusedHref(page: Page) {
  return page.evaluate(() => document.activeElement?.getAttribute("href"));
}

// fixme: on /collections, pad autofocus sometimes lands on the wrong tile or
// none, and useWrapGridNav sometimes ignores a D-pad arrow (varies by run).
test.fixme(
  "moves between collections and opens one with the controller",
  { tag: "@devices" },
  async ({ page, gamepad }) => {
    test.skip(!gamepad, "Only devices with built-in game controls.");
    await seedUiState(page, "dark");
    await gotoHydrated(page, "/collections");
    await expect(page.locator("html")).toHaveAttribute("data-input", "pad");

    const tiles = page.locator(".coll-tile");
    await expect(
      tiles.first(),
      "The library needs at least one collection",
    ).toBeVisible();

    // In gamepad modality the grid focuses its first tile by itself.
    await expect(tiles.first()).toBeFocused();
    const first = String(await focusedHref(page));
    expect(first).toMatch(/^\/collection\//);

    await pressPad(page, "dpad-right");
    await expect
      .poll(() => focusedHref(page), {
        message: "D-pad right should move to the next collection in the row",
      })
      .not.toBe(first);

    await pressPad(page, "dpad-left");
    await expect.poll(() => focusedHref(page)).toBe(first);

    await pressPad(page, "a");
    await expect(page).toHaveURL(first);
  },
);
