// axe-core a11y audits: critical and serious violations block the run.
//
// Run:  npx playwright test --project=axe
// View: open e2e/.output/axe/<page>.json — one violation record per entry.
import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import type { ImpactValue, Result as AxeViolation } from "axe-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { gotoHydrated, STORAGE_STATE } from "../support/auth";
import { AXE_DIR } from "../support/output";
import { expect, test } from "../support/test";

// All impact levels in severity order — used to build the always-on log line.
const ALL_IMPACTS: readonly ImpactValue[] = [
  "critical",
  "serious",
  "moderate",
  "minor",
];

// Per-page blocking impact configuration. A violation at a listed impact level
// fails the test; others are written to the report only. Typed against
// ImpactValue so a typo or a removed level is a compile error.
type PageBlockingImpacts = readonly ImpactValue[];

// Tune per page after a baseline run against your actual site.
const DEFAULT_BLOCKING_IMPACTS: PageBlockingImpacts = ["critical", "serious"];

type AxePage = {
  path: string;
  blockingImpacts: PageBlockingImpacts;
};

const AXE_PAGES: Record<string, AxePage> = {
  home: { path: "/", blockingImpacts: DEFAULT_BLOCKING_IMPACTS },
  platforms: { path: "/platforms", blockingImpacts: DEFAULT_BLOCKING_IMPACTS },
  collections: {
    path: "/collections",
    blockingImpacts: DEFAULT_BLOCKING_IMPACTS,
  },
  search: { path: "/search", blockingImpacts: DEFAULT_BLOCKING_IMPACTS },
};

/** Runs axe, writes the full violation JSON, logs the impact summary, and
 *  returns the violations that exceed the page's blocking threshold. */
async function runAxe(
  page: Page,
  pageName: string,
  blockingImpacts: PageBlockingImpacts,
): Promise<{ blocking: AxeViolation[]; message: string }> {
  const { violations } = await new AxeBuilder({ page }).analyze();

  mkdirSync(AXE_DIR, { recursive: true });
  writeFileSync(
    `${AXE_DIR}/${pageName}.json`,
    JSON.stringify(violations, null, 2),
  );

  const impactSummary = ALL_IMPACTS.map((impact) => {
    const n = violations.filter((v) => v.impact === impact).length;
    return `${impact}=${n}`;
  }).join(" ");
  console.log(`[axe:${pageName}] ${impactSummary}`);

  const blockingSet = new Set<ImpactValue>(blockingImpacts);
  const blocking = violations.filter(
    (v): v is AxeViolation & { impact: ImpactValue } =>
      v.impact != null && blockingSet.has(v.impact),
  );

  const checkedImpacts = blockingImpacts.join(", ");
  const message = `${pageName}: ${blocking.length} violation(s) at [${checkedImpacts}] — see ${AXE_DIR}/${pageName}.json`;

  return { blocking, message };
}

// Login is audited unauthenticated — the only page intentionally visited
// without a session.
test.describe("login", { tag: "@axe:login" }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test(`no violations at [${DEFAULT_BLOCKING_IMPACTS.join(", ")}]`, async ({
    page,
  }) => {
    await page.goto("/login");
    await page.locator("form.r-v2-login-form").waitFor();

    const { blocking, message } = await runAxe(
      page,
      "login",
      DEFAULT_BLOCKING_IMPACTS,
    );
    expect(blocking, message).toHaveLength(0);
  });
});

// Authenticated pages — signed in as admin.
for (const [pageName, { path, blockingImpacts }] of Object.entries(AXE_PAGES)) {
  test.describe(pageName, { tag: `@axe:${pageName}` }, () => {
    test.use({ storageState: STORAGE_STATE.admin });

    test(`no violations at [${blockingImpacts.join(", ")}]`, async ({
      page,
    }) => {
      await gotoHydrated(page, path);

      const { blocking, message } = await runAxe(
        page,
        pageName,
        blockingImpacts,
      );
      expect(blocking, message).toHaveLength(0);
    });
  });
}
