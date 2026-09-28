import type { Page, TestInfo } from "@playwright/test";
import { KNOWN_A11Y_VIOLATIONS, REPORT_ONLY_A11Y_RULES } from "./a11y-known";
import { formatViolations, scanA11y } from "./fixtures/a11y";
import {
  gotoFirstRom,
  gotoHydrated,
  seedUiState,
  STORAGE_STATE,
} from "./fixtures/auth";
import { t } from "./fixtures/i18n";
import { expect, test } from "./fixtures/test";

// axe in a real browser, per device and theme. Known violations live in
// a11y-known.ts; anything else fails, naming the rule and element.

const THEMES = ["dark", "light"] as const;

async function expectAccessible(page: Page, info: TestInfo, where: string) {
  const { violations, matchedKnown } = await scanA11y(
    page,
    KNOWN_A11Y_VIOLATIONS,
  );
  for (const index of matchedKnown) {
    info.annotations.push({
      type: "a11y-known",
      description: `${where}: ${KNOWN_A11Y_VIOLATIONS[index].rule} (${KNOWN_A11Y_VIOLATIONS[index].reason})`,
    });
  }
  const reportOnly = violations.filter((v) =>
    REPORT_ONLY_A11Y_RULES.includes(v.rule),
  );
  if (reportOnly.length) {
    info.annotations.push({
      type: "a11y-report-only",
      description: `${where}:\n${formatViolations(reportOnly)}`,
    });
  }
  const failing = violations.filter(
    (v) => !REPORT_ONLY_A11Y_RULES.includes(v.rule),
  );
  expect(
    failing,
    `Accessibility violations on ${where}:\n${formatViolations(failing)}`,
  ).toEqual([]);
}

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.describe("signed out", () => {
      test.use({ storageState: { cookies: [], origins: [] } });

      test("login page", { tag: "@devices" }, async ({ page }, info) => {
        await seedUiState(page, theme);
        await page.goto("/login");
        await expect(
          page.getByRole("button", { name: t("login.login"), exact: true }),
        ).toBeVisible();
        await expectAccessible(page, info, "/login");
      });
    });

    test.describe("signed in", () => {
      test.use({ storageState: STORAGE_STATE.viewer });

      test("home page", { tag: "@devices" }, async ({ page }, info) => {
        await seedUiState(page, theme);
        await gotoHydrated(page, "/");
        await expect(
          page.getByRole("main").getByRole("link").first(),
        ).toBeVisible();
        await expectAccessible(page, info, "home");
      });

      test("game page", { tag: "@devices" }, async ({ page }, info) => {
        await seedUiState(page, theme);
        await gotoFirstRom(page);
        const overview = page.getByRole("tab", { name: t("rom.tab-overview") });
        await expect(overview).toHaveAttribute("aria-selected", "true");
        await expectAccessible(page, info, "game overview");

        const media = page.getByRole("tab", { name: t("rom.media") });
        await media.click();
        await expect(media).toHaveAttribute("aria-selected", "true");
        await expectAccessible(page, info, "game media");
      });
    });
  });
}
