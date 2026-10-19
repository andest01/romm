// Renders the tabs of a ui/ mock-up page to PNGs.
//   node ../__perf_images/scripts/export-ui-designs.mjs v1   (run from ~/romm/frontend)
//   node ../__perf_images/scripts/export-ui-designs.mjs v2
// v1 writes ui/png-v1/, v2 writes ui/png-v2/. v2 pages may define window.__demo(step) to set up a state.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "/home/user/romm/frontend/node_modules/playwright-core/index.mjs";

const version = process.argv[2] ?? "v2";
const dir = "/home/user/romm/__perf_images/ui";
const out = path.join(dir, `png-${version}`);
fs.mkdirSync(out, { recursive: true });

const SHOTS = {
  v1: {
    width: 1180,
    names: [
      "t1-ledger-desktop",
      "t3-two-line-rows-phone",
      "g1-dense-tiles-desktop",
      "g3-phone-wall",
      "swarm",
    ],
    extra: [{ name: "swarm-search-astral", search: "astral" }],
  },
  v4: {
    width: 1260,
    names: ["tiles", "table", "swarm", "advanced", "phone"],
    extra: [
      { name: "rail-released", tab: 1, call: ["__sortBy", "year", "asc"] },
      { name: "rail-added", tab: 0, call: ["__sortBy", "added", "desc"] },
      { name: "rail-size", tab: 1, call: ["__sortBy", "gb", "desc"] },
      { name: "rail-rating", tab: 1, call: ["__sortBy", "rating", "desc"] },
      { name: "rail-platform", tab: 0, call: ["__sortBy", "plat", "asc"] },
      { name: "rail-region", tab: 1, call: ["__sortBy", "reg", "asc"] },
      { name: "letters-tiles", tab: 0, call: "__demoLetters" },
      { name: "letters-table", tab: 1, call: "__demoLetters" },
      { name: "selection-bar", tab: 0, call: "__demoSel" },
      { name: "row-menu-tiles", tab: 0, call: "__demoMenu" },
      { name: "row-menu-table", tab: 1, call: "__demoMenu" },
      { name: "sort-menu", tab: 0, call: "__demoSort" },
      { name: "collections-dialog", tab: 0, call: "__demoDlg" },
      { name: "filtered", tab: 0, demoBar: true },
      { name: "phone-selection", tab: 4, call: "__demoSel" },
      { name: "phone-menu", tab: 4, call: "__demoMenu" },
      { name: "phone-sort", tab: 4, call: "__demoSort" },
    ],
  },
  v3: {
    width: 1260,
    names: [
      "header-tiles",
      "header-table",
      "header-swarm",
      "header-advanced",
      "phone-se",
    ],
    extra: [
      { name: "header-filtered", tab: 0, demoBar: true },
      { name: "header-plus-open", tab: 0, demoBar: true, click: "#plus" },
      {
        name: "header-pill-editing",
        tab: 0,
        demoBar: true,
        click: '[data-pill="genre"]',
      },
      { name: "header-advanced-filtered", tab: 3, demo: true },
      { name: "phone-se-filtered", tab: 4, demoBar: true },
      { name: "phone-se-advanced", tab: 4, demoBar: true, click: "[data-adv]" },
      {
        name: "phone-se-pill-editing",
        tab: 4,
        demoBar: true,
        click: '[data-pill="genre"]',
      },
      {
        name: "header-platform-picker",
        tab: 0,
        demoBar: true,
        click: '[data-pill="plats"]',
      },
      {
        name: "header-platform-picker-search",
        tab: 0,
        demoBar: true,
        click: '[data-pill="plats"]',
        fill: ['[data-fid="p"]', "play"],
      },
      {
        name: "phone-se-platform-picker",
        tab: 4,
        demoBar: true,
        click: '[data-pill="plats"]',
      },
    ],
  },
  v2: {
    width: 1260,
    names: ["panel-tiles", "panel-table", "panel-swarm", "pillbar"],
    extra: [
      { name: "panel-tiles-filtered", demo: true, tab: 0 },
      { name: "panel-swarm-filtered", demo: true, tab: 2 },
      {
        name: "panel-multiselect-open",
        tab: 0,
        click: '[data-open="genre"]',
        reset: true,
      },
      { name: "pillbar-filtered", tab: 3, demoBar: true },
      { name: "pillbar-plus-open", tab: 3, demoBar: true, click: "#plus" },
      {
        name: "pillbar-pill-editing",
        tab: 3,
        demoBar: true,
        click: '[data-pill="genre"]',
      },
    ],
  },
}[version];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: SHOTS.width, height: 900 },
  deviceScaleFactor: 1,
});
page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
await page.goto("file://" + path.join(dir, `search-designs-${version}.html`), {
  waitUntil: "load",
});
await page.waitForTimeout(500);
const tabs = await page.$$(".tab");
for (let i = 0; i < tabs.length; i++) {
  await (await page.$$(".tab"))[i].click();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(out, SHOTS.names[i] + ".png"),
    fullPage: true,
  });
  console.log("wrote", SHOTS.names[i]);
}
for (const e of SHOTS.extra) {
  await page.evaluate(() => window.__reset && window.__reset());
  if (e.tab !== undefined) await (await page.$$(".tab"))[e.tab].click();
  if (e.call) {
    const [fn, ...args] = Array.isArray(e.call) ? e.call : [e.call];
    await page.evaluate(([f, a]) => window[f] && window[f](...a), [fn, args]);
  }
  if (e.demoBar)
    await page.evaluate(() => window.__demoBar && window.__demoBar());
  if (e.reset) await page.click("#reset").catch(() => {});
  if (e.click) await page.click(e.click);
  if (e.fill) await page.fill(e.fill[0], e.fill[1]);
  if (e.search) await page.fill("[data-search]", e.search);
  if (e.demo) await page.evaluate(() => window.__demo && window.__demo());
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(out, e.name + ".png"),
    fullPage: true,
  });
  console.log("wrote", e.name);
}
await browser.close();
