// Attaches a screenshot per impact level with each offending element outlined
// in that level's colour. Self-contained: delete this file and its one call in
// axe.spec.ts to remove it.
import type { Page } from "@playwright/test";
import type { ImpactValue, NodeResult, Result as AxeViolation } from "axe-core";
import { test } from "../support/test";

type Impact = Exclude<ImpactValue, null>;

const IMPACT_COLORS: Record<Impact, string> = {
  critical: "#ff0033",
  serious: "#ff00ff",
  moderate: "#ffd400",
  minor: "#00b4ff",
};

// Outlines keep the element readable, where a mask would cover it. One rule
// per selector, so a selector the browser rejects drops only its own rule.
function highlightCss(selectors: readonly string[], color: string): string {
  return selectors
    .map(
      (selector) => `${selector} {
        outline: 5px solid ${color} !important;
        outline-offset: 3px !important;
        box-shadow: 0 0 0 3px #fff, 0 0 24px 10px ${color} !important;
      }`,
    )
    .join("\n");
}

// Only a plain selector in the top document; iframe and shadow DOM targets
// (arrays) are left to the JSON report.
function selectorOf({ target }: NodeResult): string[] {
  const [selector, ...inFrames] = target;
  return typeof selector === "string" && inFrames.length === 0
    ? [selector]
    : [];
}

/** Attaches one line per violation, worst first, like the axe DevTools list. */
export async function attachViolationList(
  violations: readonly AxeViolation[],
): Promise<void> {
  if (violations.length === 0) return;
  const order = Object.keys(IMPACT_COLORS);
  const lines = [...violations]
    .sort(
      (a, b) =>
        order.indexOf(a.impact ?? "minor") - order.indexOf(b.impact ?? "minor"),
    )
    .map((v) => {
      const kind = v.tags.includes("best-practice") ? "best practice" : "WCAG";
      return `${(v.impact ?? "n/a").padEnd(9)}${String(v.nodes.length).padStart(4)}x  ${v.help} (${v.id}, ${kind})`;
    });
  await test.info().attach("axe-violations.txt", {
    body: lines.join("\n"),
    contentType: "text/plain",
  });
}

/** One screenshot per rule, scrolled to its first offender: v2 scrolls an
 *  inner container, so a full-page shot only ever holds the first viewport. */
export async function attachViolationScreenshots(
  page: Page,
  violations: readonly AxeViolation[],
): Promise<void> {
  const order = Object.keys(IMPACT_COLORS);
  const shots = [...violations]
    .sort(
      (a, b) =>
        order.indexOf(a.impact ?? "minor") - order.indexOf(b.impact ?? "minor"),
    )
    .map((v) => ({
      impact: (v.impact ?? "minor") as Impact,
      id: v.id,
      selectors: v.nodes.flatMap(selectorOf),
    }))
    .filter(({ selectors }) => selectors.length > 0);
  if (shots.length === 0) return;

  // Square shots show more context around each offender. Resized only after
  // the scan, so axe still ran at the project's own viewport.
  const viewport = page.viewportSize();
  if (viewport) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.width,
    });
  }

  for (const { impact, id, selectors } of shots) {
    // A failed capture must never hide the violations themselves.
    try {
      // Short timeout: an offender can be hidden (inert, zero-size), and
      // the shot is still worth taking from wherever the page sits.
      await page
        .locator(selectors[0]!)
        .first()
        .scrollIntoViewIfNeeded({ timeout: 1000 })
        .catch(() => undefined);
      const body = await page.screenshot({
        style: highlightCss(selectors, IMPACT_COLORS[impact]),
      });
      await test
        .info()
        .attach(`axe-${impact}-${id}`, { body, contentType: "image/png" });
    } catch (error) {
      console.warn(`[axe] no ${id} screenshot: ${String(error)}`);
    }
  }
}
