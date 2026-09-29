// Lighthouse audits on a slow desktop: real LAN network, 4x CPU slowdown.
//
// Run:  npx playwright test --project=lighthouse
// View: open e2e/.output/lighthouse/<page>.html in a browser.
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import type * as LH from "lighthouse/types/lh.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { STORAGE_STATE } from "../support/auth";
import { LIGHTHOUSE_DIR } from "../support/output";
import { expect, test } from "../support/test";

// Every category that Lighthouse's default config ships. LH types categories
// as Record<string, Category>, so this union is the closest we can get to an
// exhaustive type for the keys that will actually appear in lhr.categories.
type LhCategoryId = "performance" | "accessibility" | "best-practices" | "seo";

// The subset we actually run and assert on. Drives both onlyCategories (so LH
// skips the rest) and the shape of AuditedCategories below.
const LIGHTHOUSE_CATEGORIES = [
  "performance",
  // "accessibility",
  // "best-practices",
] as const satisfies readonly LhCategoryId[];

// Thresholds may cover any LH category. Only the ones that were actually
// audited (present in LIGHTHOUSE_CATEGORIES) will be checked; others are
// skipped. This lets you comment entries in/out of LIGHTHOUSE_CATEGORIES
// without changing the threshold objects.
type PageThresholds = Partial<Record<LhCategoryId, number>>;

// Desktop size, no network throttling (real LAN), 4x CPU penalty.
const auditConfig: LH.Config = {
  extends: "lighthouse:default",
  settings: {
    onlyCategories: [...LIGHTHOUSE_CATEGORIES],
    formFactor: "desktop",
    throttlingMethod: "simulate",
    throttling: {
      rttMs: 0,
      throughputKbps: 0,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
      // simulate 2x slower than a steam deck
      cpuSlowdownMultiplier: 6,
    },
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    },
  },
};

// Must match --remote-debugging-port. Single worker means no port conflicts.
const CDP_PORT = 9222;

type AuditPage = {
  path: string;
  savedSession?: string;
  thresholds: PageThresholds;
};

// Tune thresholds after a baseline run against your actual site.
const DEFAULT_THRESHOLDS: PageThresholds = {
  performance: 90,
  accessibility: 90,
  "best-practices": 90,
};

const AUDIT_PAGES: Record<string, AuditPage> = {
  login: {
    path: "/login",
    thresholds: DEFAULT_THRESHOLDS,
  },
  home: {
    path: "/",
    savedSession: STORAGE_STATE.admin,
    thresholds: DEFAULT_THRESHOLDS,
  },
  platforms: {
    path: "/platforms",
    savedSession: STORAGE_STATE.admin,
    thresholds: DEFAULT_THRESHOLDS,
  },
  collections: {
    path: "/collections",
    savedSession: STORAGE_STATE.admin,
    thresholds: DEFAULT_THRESHOLDS,
  },
  search: {
    path: "/search",
    savedSession: STORAGE_STATE.admin,
    thresholds: DEFAULT_THRESHOLDS,
  },
};

// Runs Lighthouse and returns lhr. Writes HTML + JSON reports as a side-effect
// so the full report is available regardless of which category tests pass/fail.
async function runAudit(
  pageUrl: string,
  pageName: string,
  savedSession?: string,
): Promise<LH.Result> {
  const browser = await chromium.launch({
    args: [`--remote-debugging-port=${CDP_PORT}`],
  });

  try {
    if (savedSession) {
      // Lighthouse uses its own Chrome; seed auth there before it navigates.
      const ctx = await browser.newContext({ storageState: savedSession });
      const seedPage = await ctx.newPage();
      await seedPage.goto(pageUrl);
      await ctx.close();
    }

    const runnerResult: LH.RunnerResult | undefined = await lighthouse(
      pageUrl,
      {
        port: CDP_PORT,
        disableStorageReset: true,
        skipAboutBlank: true,
        output: ["html", "json"],
      },
      auditConfig,
    );

    if (!runnerResult) throw new Error(`No Lighthouse result for ${pageName}`);

    const { lhr, report: reportFiles } = runnerResult;
    const [htmlReport, jsonReport] = reportFiles as [string, string];

    mkdirSync(LIGHTHOUSE_DIR, { recursive: true });
    writeFileSync(`${LIGHTHOUSE_DIR}/${pageName}.html`, htmlReport);
    writeFileSync(`${LIGHTHOUSE_DIR}/${pageName}.json`, jsonReport);

    const summary = (
      Object.entries(lhr.categories) as [string, LH.Result.Category][]
    )
      .map(([id, c]) =>
        c.score !== null ? `${id}=${Math.round(c.score * 100)}` : `${id}=n/a`,
      )
      .join(" ");
    console.log(`[lighthouse:${pageName}] ${summary}`);

    return lhr;
  } finally {
    await browser.close();
  }
}

test.use({ failOnAppErrors: false });

for (const [pageName, { path, savedSession, thresholds }] of Object.entries(
  AUDIT_PAGES,
)) {
  test.describe(pageName, { tag: `@lighthouse:${pageName}` }, () => {
    let lhr: LH.Result;

    test.beforeAll(async ({ e2eEnv }) => {
      lhr = await runAudit(
        `${e2eEnv.E2E_BASE_URL}${path}`,
        pageName,
        savedSession,
      );
    });

    test("lighthouse-report", { tag: "@lighthouse-report" }, async () => {
      await test.info().attach("lighthouse-report", {
        path: `${LIGHTHOUSE_DIR}/${pageName}.html`,
        contentType: "text/html",
      });

      const scoredEntries = (
        Object.entries(thresholds) as [LhCategoryId, number][]
      ).filter(([categoryId]) => lhr.categories[categoryId]?.score != null);

      for (const [categoryId, threshold] of scoredEntries) {
        const scoreAs100 = Math.round(lhr.categories[categoryId]!.score! * 100);
        expect(
          scoreAs100,
          `${categoryId}: got ${scoreAs100}, need >= ${threshold}`,
        ).toBeGreaterThanOrEqual(threshold);
      }
    });

    for (const [categoryId, threshold] of Object.entries(thresholds) as [
      LhCategoryId,
      number,
    ][]) {
      test(`${categoryId} >= ${threshold}`, () => {
        const category: LH.Result.Category | undefined =
          lhr.categories[categoryId];
        const score: number | null = category?.score ?? null;

        // [lighthouse:n/a] LH couldn't compute this category — skip rather than fail.
        test.skip(
          score === null,
          `[lighthouse:${pageName}:${categoryId}] score=n/a`,
        );

        const scoreAs100 = Math.round(score! * 100);
        expect(
          scoreAs100,
          `${pageName} ${categoryId}: got ${scoreAs100}, need >= ${threshold}`,
        ).toBeGreaterThanOrEqual(threshold);
      });
    }
  });
}
