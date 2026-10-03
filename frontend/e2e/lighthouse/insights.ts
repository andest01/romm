// Turns a Lighthouse result into things a reader acts on: a ranked "fix first"
// list for failure messages, a JS debt card, leads for the long tasks, and a
// screenshot with every element a failing audit points at outlined.
// Self-contained: delete this folder's helpers and their calls in
// lighthouse.spec.ts to remove it.
import type { Page } from "@playwright/test";
import type * as LH from "lighthouse/types/lh.js";
import { readFileSync, writeFileSync } from "node:fs";
import { LIGHTHOUSE_DIR } from "../support/output";
import { test } from "../support/test";
import {
  DEBT_CARD_PARTS,
  DEBT_TEXT_NAME,
  debtCard,
  debtText,
  drawDebtCard,
} from "./debt-card";
import {
  type Leads,
  LONG_TASKS_TEXT_NAME,
  leadsText,
  longTaskLeads,
  TRACE_NAME,
} from "./long-tasks";
import { standaloneHtml, webpShot } from "./render";

type Audit = LH.Audit.Result;
type NodeValue = LH.Audit.Details.NodeValue;

// One colour per failing audit, reused in order.
const AUDIT_COLORS = ["#ff0033", "#ff00ff", "#ffd400", "#00b4ff", "#00ff88"];

const isFailing = (audit: Audit) => audit.score !== null && audit.score < 1;

const isNode = (value: unknown): value is NodeValue =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: unknown }).type === "node";

// CLS savings are unitless, so only the timing metrics add up to milliseconds.
function savingsMs({ metricSavings = {} }: Audit): number {
  return Object.entries(metricSavings)
    .filter(([metric]) => metric !== "CLS")
    .reduce((sum, [, ms]) => sum + (ms ?? 0), 0);
}

function savingsBytes({ details }: Audit): number {
  if (details?.type === "opportunity") return details.overallSavingsBytes ?? 0;
  if (details?.type === "table") return details.summary?.wastedBytes ?? 0;
  return 0;
}

/** The category's failing audits, biggest estimated win first, as message lines. */
export function fixFirst(
  lhr: LH.Result,
  categoryId: string,
  count = 3,
): string {
  const lines = (lhr.categories[categoryId]?.auditRefs ?? [])
    .map(({ id }) => lhr.audits[id])
    .filter((audit): audit is Audit => audit !== undefined && isFailing(audit))
    .map((audit) => ({
      audit,
      ms: savingsMs(audit),
      bytes: savingsBytes(audit),
    }))
    .filter(({ ms, bytes }) => ms > 0 || bytes > 0)
    .sort((a, b) => b.ms - a.ms || b.bytes - a.bytes)
    .slice(0, count)
    .map(
      ({ audit }, i) =>
        `  ${i + 1}. ${audit.title}${audit.displayValue ? `: ${audit.displayValue}` : ""}`,
    );
  return lines.length > 0 ? `\nFix first:\n${lines.join("\n")}` : "";
}

// The report shows only images inline, so the image comes first; the HTML twin
// adds tooltips. Attached by path: the terminal previews text bodies inline.
async function attachRendered(
  page: Page,
  selector: string,
  name: string,
  pageName: string,
): Promise<void> {
  const element = page.locator(selector);
  const shot = await webpShot(element);
  await test.info().attach(`${name}.${shot.contentType.split("/")[1]}`, shot);
  const html = `${LIGHTHOUSE_DIR}/${pageName}-${name}.html`;
  writeFileSync(
    html,
    standaloneHtml(
      `${pageName} ${name}`,
      await element.evaluate((node) => node.outerHTML),
    ),
  );
  await test.info().attach(`${name}.html`, {
    path: html,
    contentType: "text/html",
  });
}

export const traceFile = (pageName: string) =>
  `${LIGHTHOUSE_DIR}/${pageName}.trace.json`;

/** Attaches the trace and what fills its long tasks; returns those leads. */
export async function attachLongTasks(
  lhr: LH.Result,
  pageName: string,
): Promise<Leads | undefined> {
  const trace = traceFile(pageName);
  await test.info().attach(TRACE_NAME, {
    path: trace,
    contentType: "application/json",
  });
  // A failed explainer must never hide the audit result itself.
  try {
    const leads = await longTaskLeads(
      JSON.parse(readFileSync(trace, "utf8")),
      lhr.configSettings.throttling.cpuSlowdownMultiplier,
    );
    const text = `${LIGHTHOUSE_DIR}/${pageName}-long-tasks.txt`;
    writeFileSync(text, leadsText(leads, TRACE_NAME));
    await test.info().attach(LONG_TASKS_TEXT_NAME, {
      path: text,
      contentType: "text/plain",
    });
    return leads;
  } catch (error) {
    console.warn(`[lighthouse] no long-task leads: ${String(error)}`);
    return undefined;
  }
}

/** When performance is under its threshold, attaches the Total Blocking Time
 *  and bundle size cards (shown inline) and every bundle's files as text. */
export async function attachJsDebt(
  page: Page,
  lhr: LH.Result,
  pageName: string,
  threshold: number | undefined,
  leads?: Leads,
): Promise<void> {
  const raw = lhr.categories.performance?.score;
  if (threshold === undefined || raw == null) return;
  const score = Math.round(raw * 100);
  if (score >= threshold) return;

  // A failed render must never hide the audit result itself.
  try {
    await page.setViewportSize({ width: 1100, height: 800 });
    const card = debtCard(lhr, pageName, threshold, score, leads);
    for (const part of ["tbt", "bundles"] as const) {
      await page.setContent('<body style="margin:0;background:#000"></body>');
      await page.evaluate(drawDebtCard, { card, part });
      await attachRendered(
        page,
        `#lh-${part}`,
        DEBT_CARD_PARTS[part],
        pageName,
      );
    }
  } catch (error) {
    console.warn(`[lighthouse] no JS debt card: ${String(error)}`);
  }

  const text = `${LIGHTHOUSE_DIR}/${pageName}-js-debt.txt`;
  writeFileSync(text, debtText(lhr));
  await test.info().attach(DEBT_TEXT_NAME, {
    path: text,
    contentType: "text/plain",
  });
}

type Row = Record<string, unknown>;

// Table rows hold node values in any column; lists hold tables or bare nodes.
function rowsOf(details: Audit["details"]): Row[] {
  if (details?.type === "table" || details?.type === "opportunity") {
    return details.items as Row[];
  }
  if (details?.type === "list") {
    return details.items.flatMap((item) =>
      isNode(item) ? [{ node: item }] : rowsOf(item as Audit["details"]),
    );
  }
  return [];
}

type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  label: string;
};
type LegendEntry = { color: string; text: string };

function offenders(lhr: LH.Result): { boxes: Box[]; legend: LegendEntry[] } {
  const rects = lhr.fullPageScreenshot?.nodes ?? {};
  const audited = new Set(
    Object.values(lhr.categories).flatMap(({ auditRefs }) =>
      auditRefs.map(({ id }) => id),
    ),
  );
  const withNodes = Object.values(lhr.audits)
    .filter((audit) => audited.has(audit.id) && isFailing(audit))
    .map((audit) => ({
      audit,
      nodes: rowsOf(audit.details).flatMap((row) =>
        Object.values(row)
          .filter(isNode)
          .map((node) => ({ node, wastedBytes: row.wastedBytes })),
      ),
    }))
    .filter(({ nodes }) => nodes.length > 0);

  const legend = withNodes.map(({ audit }, i) => ({
    color: AUDIT_COLORS[i % AUDIT_COLORS.length]!,
    text: `${audit.title}${audit.displayValue ? `: ${audit.displayValue}` : ""}`,
  }));
  const boxes = withNodes.flatMap(({ nodes }, i) =>
    nodes
      .map(({ node, wastedBytes }) => ({
        rect: node.lhId ? rects[node.lhId] : undefined,
        label:
          typeof wastedBytes === "number"
            ? `${Math.round(wastedBytes / 1024)} KiB`
            : (node.nodeLabel ?? ""),
      }))
      // Zero-size rects are elements gone by the final paint (the load splash).
      .filter(
        ({ rect }) => rect !== undefined && rect.width > 0 && rect.height > 0,
      )
      .map(({ rect, label }) => ({
        left: rect!.left,
        top: rect!.top,
        width: rect!.width,
        height: rect!.height,
        color: legend[i]!.color,
        label,
      })),
  );
  return { boxes, legend };
}

/** Attaches the final page with each failing audit's elements outlined. */
export async function attachOffenders(
  page: Page,
  lhr: LH.Result,
  pageName: string,
): Promise<void> {
  const shot = lhr.fullPageScreenshot?.screenshot;
  const { boxes, legend } = offenders(lhr);
  if (!shot || boxes.length === 0) return;

  // A failed render must never hide the audit result itself.
  try {
    await page.setViewportSize({ width: shot.width, height: 800 });
    await page.setContent('<body style="margin:0;background:#000"></body>');
    // Built with DOM calls, not HTML strings, so audit text needs no escaping.
    await page.evaluate(
      async ({ shot, boxes, legend }) => {
        const root = document.createElement("div");
        root.id = "lh-offenders";
        root.style.cssText = `width:${shot.width}px;font:bold 15px sans-serif`;

        const key = document.createElement("div");
        key.style.cssText = "padding:12px;background:#111;color:#fff";
        for (const { color, text } of legend) {
          const line = document.createElement("div");
          line.style.cssText = `border-left:14px solid ${color};padding:4px 10px;margin:4px 0`;
          line.textContent = text;
          key.append(line);
        }

        const canvas = document.createElement("div");
        canvas.style.cssText = `position:relative;overflow:hidden;width:${shot.width}px;height:${shot.height}px`;
        const img = document.createElement("img");
        img.src = shot.data;
        img.style.cssText = "position:absolute;inset:0";
        canvas.append(img);

        for (const { left, top, width, height, color, label } of boxes) {
          const box = document.createElement("div");
          box.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:${width}px;height:${height}px;outline:5px solid ${color};outline-offset:2px;box-shadow:0 0 0 3px #fff,0 0 24px 10px ${color}`;
          const tag = document.createElement("span");
          tag.style.cssText = `position:absolute;left:0;top:0;padding:2px 6px;background:${color};color:#000`;
          tag.textContent = label;
          box.append(tag);
          canvas.append(box);
        }

        root.append(key, canvas);
        document.body.append(root);
        await img.decode();
      },
      { shot, boxes, legend },
    );

    await attachRendered(
      page,
      "#lh-offenders",
      "lighthouse-offenders",
      pageName,
    );
  } catch (error) {
    console.warn(`[lighthouse] no offenders screenshot: ${String(error)}`);
  }
}
