import type { Page } from "@playwright/test";
import type { AxeResults, RunOptions } from "axe-core";
import { createRequire } from "node:module";
import type { KnownA11yViolation } from "../a11y-known";

// The same axe-core the Storybook gate runs, so both report the same rules.
const AXE_SOURCE = createRequire(import.meta.url).resolve("axe-core");

// Unlike happy-dom in the Storybook gate, a real browser can judge contrast.
const RUN_OPTIONS: RunOptions = {
  runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "best-practice"] },
  elementRef: true,
};

declare global {
  interface Window {
    axe: { run(context: Document, options: RunOptions): Promise<AxeResults> };
  }
}

/** One axe finding: a rule failing on one element. */
export interface A11yViolation {
  rule: string;
  target: string;
  impact: string;
  help: string;
  helpUrl: string;
}

export interface A11yScan {
  violations: A11yViolation[];
  /** Indexes into `known` that matched at least one violation. */
  matchedKnown: number[];
}

/** Every axe violation on the page as it is now, one entry per element,
 *  minus those `known` covers. */
export async function scanA11y(
  page: Page,
  known: readonly KnownA11yViolation[],
): Promise<A11yScan> {
  await page.addScriptTag({ path: AXE_SOURCE });
  return page.evaluate(
    async ({ options, known }) => {
      const results = await window.axe.run(document, options);
      const matched = new Set<number>();
      const violations = results.violations.flatMap((v) =>
        v.nodes
          .filter((node) => {
            const element = node.element;
            const index = known.findIndex(
              (k) => k.rule === v.id && !!element?.closest(k.selector),
            );
            if (index === -1) return true;
            matched.add(index);
            return false;
          })
          .map((node) => ({
            rule: v.id,
            target: node.target.join(" "),
            impact: v.impact ?? "n/a",
            help: v.help,
            helpUrl: v.helpUrl,
          })),
      );
      return { violations, matchedKnown: [...matched] };
    },
    { options: RUN_OPTIONS, known },
  );
}

/** Readable, one line per violation, for an assertion message. */
export function formatViolations(violations: A11yViolation[]): string {
  return violations
    .map(
      (v) =>
        `[${v.impact}] ${v.rule}: ${v.help}\n    at ${v.target}\n    ${v.helpUrl}`,
    )
    .join("\n");
}
