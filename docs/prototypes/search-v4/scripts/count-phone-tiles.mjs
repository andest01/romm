// Counts how many results are fully visible at once in the iPhone SE mock-up (grid and rows).
//   node ../__perf_images/scripts/count-phone-tiles.mjs v4   (run from ~/romm/frontend)
import path from "node:path";
import { chromium } from "/home/user/romm/frontend/node_modules/playwright-core/index.mjs";

const version = process.argv[2] ?? "v4";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1260, height: 900 } });
await page.goto(
  "file://" +
    path.join(
      "/home/user/romm/__perf_images/ui",
      `search-designs-${version}.html`,
    ),
);
await page.waitForTimeout(400);
await (await page.$$(".tab"))[4].click();
for (const [label, view, selector] of [
  ["grid", 0, ".gtile"],
  ["rows", 1, ".row2"],
]) {
  await page.click(`#viewseg [data-i="${view}"]`);
  await page.waitForTimeout(200);
  const n = await page.evaluate((sel) => {
    const body = document.querySelector(".p-body").getBoundingClientRect();
    return [...document.querySelectorAll(sel)].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= body.top - 1 && r.bottom <= body.bottom + 1;
    }).length;
  }, selector);
  console.log(`${label}: ${n} fully visible`);
}
await browser.close();
