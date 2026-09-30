import { E2E_SITEMAP } from "../../e2e-sitemap";
import { gotoHydrated, seedUiState, SIGNED_OUT } from "../../support/auth";
import { expect, test } from "../../support/test";
import { HITCH_MS, recordLoad, settle, stopRecording } from "./performance";

// Every signed-in page with a fixed URL, loaded cold. Each rule is its own
// check, so a report names exactly which one a page misses.
const BUDGET = {
  /** Input blocked beyond 50 ms per long frame, summed over the load. */
  blockedMs: 500,
  /** Frames over HITCH_MS: visible freezes. */
  hitches: 3,
  /** The single worst frame. */
  worstFrameMs: 300,
  /** Layout shift while the page settles. */
  cls: 0.1,
  /** Elements in the page once loaded. */
  domNodes: 15_000,
};

// One page at a time, in one worker: a sweep sharing the CPU with itself
// measures its own contention. Run it alone (--workers=1) for clean numbers.
test.describe.configure({ mode: "default" });

for (const { id, path, storageState, tag } of E2E_SITEMAP) {
  if (storageState === SIGNED_OUT) continue;

  test.describe(id, { tag: [...tag] }, () => {
    test.use({ storageState });

    test("loads without freezing", async ({ page }) => {
      // Loading and settling any page must finish within 45 s; past that the
      // page fails outright rather than reporting numbers.
      test.setTimeout(45_000);
      await seedUiState(page, "dark");
      const perf = await recordLoad(page);
      await gotoHydrated(page, path);
      // The shell hydrates before the page fetches its data and renders it,
      // which is where the heavy frames are. Measure until that settles.
      await settle(perf);
      const snapshot = await stopRecording(perf, `${id}-load`);

      expect
        .soft(snapshot.blocking.blockedMs, "blocked time (ms)")
        .toBeLessThan(BUDGET.blockedMs);
      expect
        .soft(snapshot.frames.hitches, `frames over ${HITCH_MS} ms`)
        .toBeLessThanOrEqual(BUDGET.hitches);
      expect
        .soft(snapshot.frames.max, "worst frame (ms)")
        .toBeLessThan(BUDGET.worstFrameMs);
      expect.soft(snapshot.layout.cls, "layout shift").toBeLessThan(BUDGET.cls);
      expect
        .soft(snapshot.dom.liveNodes, "live DOM nodes")
        .toBeLessThan(BUDGET.domNodes);
    });
  });
}
