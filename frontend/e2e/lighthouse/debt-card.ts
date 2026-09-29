// The JS debt card: which bundles hog the main thread, what they are built
// from, and which code the page downloaded but never ran. Built from the
// Lighthouse result alone, so e2e/.output/preview-debt.ts can redraw it from
// a saved JSON report.
import type * as LH from "lighthouse/types/lh.js";
import { type Leads, LONG_TASKS_TEXT_NAME, TRACE_NAME } from "./long-tasks";

export const DEBT_TEXT_NAME = "lighthouse-js-debt.txt";

// Each part is its own image; the value doubles as its attachment name.
export const DEBT_CARD_PARTS = {
  bundles: "javascript-bundle-size",
  tbt: "total-blocking-time-size",
} as const;
export type DebtCardPart = keyof typeof DEBT_CARD_PARTS;

// App files are shown by their path in the repo, so they can be opened directly.
const REPO_PREFIX = "frontend/";

type SourceFile = { path: string; bytes: number; unusedBytes: number };

type Bundle = {
  url: string;
  name: string;
  mainThreadMs: number;
  scriptingMs: number;
  longTasks: number;
  bytes: number;
  unusedBytes: number;
  // Every source file inside the bundle; empty without source maps.
  files: SourceFile[];
};

type Part = { name: string; bytes: number; unusedBytes: number };

// Lighthouse's own full-page screenshot: a real image of this page at the
// audited resolution, so its size is a fair yardstick.
function screenshotReference(lhr: LH.Result): DebtCard["reference"] {
  const shot = lhr.fullPageScreenshot?.screenshot;
  if (!shot) return undefined;
  const base64 = shot.data.slice(shot.data.indexOf(",") + 1);
  return {
    bytes: Math.round((base64.length * 3) / 4),
    label: `a ${shot.width}px by ${shot.height}px screenshot of this page`,
  };
}

export type DebtCard = {
  page: string;
  path: string;
  score: number;
  threshold: number;
  bundles: {
    // As the browser requested it, e.g. /assets/useGamepad-CuM8pHeA.js.
    file: string;
    // What it was built from: the worst source files or packages, then the
    // rest summed, adding up to the whole file. Empty without source maps.
    parts: Part[];
    ownMs: number;
    otherMs: number;
    longTasks: number;
    bytes: number;
    unusedBytes: number;
  }[];
  bytesTotal: number;
  deadWeightTotal: number;
  mainThreadMsTotal: number;
  textName: string;
  // A size readers already have a feel for, marked on the total bar.
  reference: { bytes: number; label: string } | undefined;
  // Where the blocking time goes, from the trace; absent when it couldn't be read.
  leads: Leads | undefined;
  tbt: { ms: number; score: number } | undefined;
  leadsTextName: string;
  traceName: string;
  // Animations the compositor can't run, so the main thread repaints them each frame.
  mainThreadAnimations: { selector: string; reason: string }[];
  domElements: number | undefined;
};

type Row = Record<string, unknown>;
type TreemapNode = {
  name: string;
  resourceBytes: number;
  unusedBytes?: number;
  children?: TreemapNode[];
};

const num = (value: unknown) => (typeof value === "number" ? value : 0);

function tableItems(lhr: LH.Result, auditId: string): Row[] {
  const details = lhr.audits[auditId]?.details;
  return details?.type === "table" || details?.type === "opportunity"
    ? (details.items as Row[])
    : [];
}

// A dependency by its package name; app code by its path in the repo.
export function sourceName(source: string): string {
  const pkg = source.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
  if (pkg) return pkg[1]!;
  const app = source.indexOf("src/");
  return app >= 0 ? `${REPO_PREFIX}${source.slice(app)}` : source;
}

// "http://host/assets/useGamepad-CuM8pHeA.js" reads as "useGamepad.js".
function bundleName(url: string): string {
  if (!URL.canParse(url)) return url;
  const file = new URL(url).pathname.split("/").pop() ?? url;
  return file.replace(/-[\w-]{8}(\.js)$/, "$1");
}

function treemapFiles(node: TreemapNode, prefix = ""): SourceFile[] {
  const path = prefix ? `${prefix}/${node.name}` : node.name;
  if (!node.children) {
    return [
      { path, bytes: node.resourceBytes, unusedBytes: node.unusedBytes ?? 0 },
    ];
  }
  return node.children.flatMap((child) => treemapFiles(child, path));
}

/** Every script's cost, merged across the audits that each measure one side. */
export function bundles(lhr: LH.Result): Bundle[] {
  const byUrl = new Map<string, Bundle>();
  const bundle = (url: unknown) => {
    const key = String(url);
    const found = byUrl.get(key);
    if (found) return found;
    const fresh: Bundle = {
      url: key,
      name: bundleName(key),
      mainThreadMs: 0,
      scriptingMs: 0,
      longTasks: 0,
      bytes: 0,
      unusedBytes: 0,
      files: [],
    };
    byUrl.set(key, fresh);
    return fresh;
  };

  for (const row of tableItems(lhr, "bootup-time")) {
    const b = bundle(row.url);
    b.mainThreadMs = num(row.total);
    b.scriptingMs = num(row.scripting);
  }
  for (const row of tableItems(lhr, "long-tasks")) {
    bundle(row.url).longTasks += 1;
  }
  const treemap = lhr.audits["script-treemap-data"]?.details as
    { nodes?: TreemapNode[] } | undefined;
  for (const node of treemap?.nodes ?? []) {
    const b = bundle(node.name);
    b.bytes = node.resourceBytes;
    b.unusedBytes = node.unusedBytes ?? 0;
    b.files = (node.children ?? [])
      .flatMap((child) => treemapFiles(child))
      .map((file) => ({ ...file, path: sourceName(file.path) }));
  }

  // Only scripts: the document and "Unattributable" point at nothing to fix.
  return [...byUrl.values()]
    .filter((b) => b.name.endsWith(".js"))
    .filter((b) => b.mainThreadMs >= 50 || b.unusedBytes >= 10 * 1024)
    .sort(
      (a, b) =>
        b.mainThreadMs - a.mainThreadMs || b.unusedBytes - a.unusedBytes,
    );
}

// Files of one package add up to one part; app files stay one part each.
function parts(files: readonly SourceFile[]): Part[] {
  const byName = new Map<string, Part>();
  for (const { path, bytes, unusedBytes } of files) {
    const total = byName.get(path) ?? { name: path, bytes: 0, unusedBytes: 0 };
    byName.set(path, {
      name: path,
      bytes: total.bytes + bytes,
      unusedBytes: total.unusedBytes + unusedBytes,
    });
  }
  return [...byName.values()];
}

// The parts with the most never-run code, then the rest summed, so the rows
// add up to the whole file.
function breakdown(all: Part[], count = 10): Part[] {
  const sorted = [...all].sort(
    (a, b) => b.unusedBytes - a.unusedBytes || b.bytes - a.bytes,
  );
  const top = sorted.slice(0, count).filter((p) => p.unusedBytes >= 1024);
  const rest = sorted.slice(top.length);
  const restBytes = rest.reduce((sum, p) => sum + p.bytes, 0);
  // A lone "everything else" row, or a crumb of one, says nothing.
  if (top.length === 0 || restBytes < 1024) return top;
  return [
    ...top,
    {
      name: `everything else (${rest.length} ${rest.length === 1 ? "file" : "files"})`,
      bytes: restBytes,
      unusedBytes: rest.reduce((sum, p) => sum + p.unusedBytes, 0),
    },
  ];
}

const urlPath = (url: string) =>
  URL.canParse(url) ? new URL(url).pathname : url;

function mainThreadAnimations(
  lhr: LH.Result,
): DebtCard["mainThreadAnimations"] {
  return tableItems(lhr, "non-composited-animations").map((row) => {
    const node = row.node as { selector?: string } | undefined;
    const sub = row.subItems as
      { items?: { failureReason?: string; animation?: string }[] } | undefined;
    const first = sub?.items?.[0];
    return {
      selector: node?.selector ?? "(unknown element)",
      reason: [first?.animation, first?.failureReason]
        .filter(Boolean)
        .join(": "),
    };
  });
}

function totalBlockingTime(lhr: LH.Result): DebtCard["tbt"] {
  const audit = lhr.audits["total-blocking-time"];
  if (audit?.numericValue === undefined || audit.score === null) return;
  return { ms: audit.numericValue, score: Math.round(audit.score * 100) };
}

export function debtCard(
  lhr: LH.Result,
  page: string,
  threshold: number,
  score: number,
  leads?: Leads,
): DebtCard {
  const all = bundles(lhr);
  return {
    page,
    path: urlPath(lhr.requestedUrl ?? lhr.finalDisplayedUrl),
    score,
    threshold,
    bundles: all.slice(0, 6).map((b) => ({
      file: urlPath(b.url),
      parts: breakdown(parts(b.files)),
      ownMs: b.scriptingMs,
      otherMs: Math.max(0, b.mainThreadMs - b.scriptingMs),
      longTasks: b.longTasks,
      bytes: b.bytes,
      unusedBytes: b.unusedBytes,
    })),
    bytesTotal: all.reduce((sum, b) => sum + b.bytes, 0),
    deadWeightTotal: all.reduce((sum, b) => sum + b.unusedBytes, 0),
    mainThreadMsTotal: all.reduce((sum, b) => sum + b.mainThreadMs, 0),
    textName: DEBT_TEXT_NAME,
    reference: screenshotReference(lhr),
    leads,
    tbt: totalBlockingTime(lhr),
    leadsTextName: LONG_TASKS_TEXT_NAME,
    traceName: TRACE_NAME,
    mainThreadAnimations: mainThreadAnimations(lhr),
    domElements: lhr.audits["dom-size-insight"]?.numericValue,
  };
}

/** Every bundle and its source files, for searching by name. */
export function debtText(lhr: LH.Result): string {
  const kib = (bytes: number) => `${Math.round(bytes / 1024)} KiB`;
  return bundles(lhr)
    .map((b) =>
      [
        `${b.name}  ${b.url}`,
        `  main thread ${Math.round(b.mainThreadMs)} ms (own JS ${Math.round(b.scriptingMs)} ms), ${b.longTasks} long tasks`,
        `  ${kib(b.bytes)} of code, ${kib(b.unusedBytes)} never ran`,
        ...[...b.files]
          .sort((x, y) => y.unusedBytes - x.unusedBytes)
          .filter((f) => f.unusedBytes >= 1024)
          .map(
            (f) => `  ${kib(f.unusedBytes).padStart(8)} never ran  ${f.path}`,
          ),
      ].join("\n"),
    )
    .join("\n\n");
}

// Runs inside the browser via page.evaluate, so everything below must stay
// self-contained: no imports or module-level references.
export function drawDebtCard({
  card,
  part,
}: {
  card: DebtCard;
  part: DebtCardPart;
}): void {
  const C = {
    bg: "#0d1017",
    panel: "#161b26",
    track: "#232a38",
    text: "#fff",
    muted: "#9aa0b4",
    ownJs: "#ffb020",
    other: "#9b6bff",
    ran: "#3ddc97",
    bad: "#ff3b5c",
  };
  const mono = "ui-monospace,Consolas,monospace";
  const sec = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
  const size = (b: number) =>
    b >= 1024 * 1024
      ? `${(b / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(b / 1024)} KiB`;
  const el = (tag: string, css: string, text = "") => {
    const node = document.createElement(tag);
    node.style.cssText = css;
    node.textContent = text;
    return node;
  };
  const caption = (text: string) =>
    el(
      "div",
      `color:${C.muted};font:700 11px system-ui;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px`,
      text,
    );
  const swatch = (color: string) =>
    el(
      "span",
      `flex:none;width:12px;height:12px;border-radius:3px;background:${color}`,
    );
  // A bar with its reading to the right.
  const bar = (
    segments: { value: number; color: string }[],
    max: number,
    reading: (string | Node)[],
  ) => {
    const row = el(
      "div",
      "display:grid;grid-template-columns:300px 1fr;gap:10px;align-items:center;margin-top:8px",
    );
    const track = el(
      "div",
      `height:10px;background:${C.track};border-radius:5px;overflow:hidden;display:flex`,
    );
    for (const { value, color } of segments) {
      track.append(
        el("div", `width:${(value / max) * 100}%;background:${color}`),
      );
    }
    const text = el("span", `color:${C.muted};font-size:14px`);
    text.append(...reading);
    row.append(track, text);
    return row;
  };

  const root = el(
    "div",
    `width:1100px;padding:28px;box-sizing:border-box;background:${C.bg};color:${C.text};font:15px/1.4 system-ui,sans-serif`,
  );
  root.id = `lh-${part}`;

  // Header: which route, how far off, and the totals behind it.
  const code = `font:800 20px ${mono};background:${C.panel};border-radius:6px;padding:2px 10px`;
  const route = el(
    "div",
    "font:800 24px system-ui;display:flex;align-items:center;gap:10px",
  );
  route.append(
    part === "tbt" ? "Total Blocking Time on" : "JavaScript bundle size on",
    el("span", code, card.page),
    el("span", `${code};color:${C.muted}`, card.path),
  );

  const score = el(
    "div",
    "display:flex;align-items:baseline;gap:14px;margin:18px 0 22px",
  );
  const figure = (value: number, label: string, color: string) => {
    const box = el("span", "display:flex;align-items:baseline;gap:6px");
    box.append(
      el("span", `font:900 64px/1 system-ui;color:${color}`, String(value)),
      el("span", `font:700 14px system-ui;color:${C.muted}`, label),
    );
    return box;
  };
  score.append(
    figure(card.score, "score", C.bad),
    el("span", `font:700 48px/1 system-ui;color:${C.muted}`, "/"),
    figure(card.threshold, "target", C.text),
  );

  if (part === "tbt") {
    const leads = card.leads;
    const s2 = (ms: number) => `${(ms / 1000).toFixed(2)} s`;
    const strong = (text: string, color = C.text) =>
      el("b", `color:${color};font-weight:800`, text);
    const code = (text: string) => el("span", `font:13px ${mono}`, text);
    const muted = (text: string) => el("span", `color:${C.muted}`, text);
    const block = (title: string, lines: (string | Node)[][]) => {
      const box = el("div", "min-width:0");
      box.append(caption(title));
      for (const parts of lines) {
        const line = el(
          "div",
          "font-size:14px;margin-top:4px;overflow-wrap:anywhere",
        );
        line.append(...parts);
        box.append(line);
      }
      return box;
    };

    // Lighthouse's metric is the number that scores; the trace explains it.
    const headline = el("div", "font-size:17px;margin-bottom:18px");
    headline.append(
      ...(card.tbt
        ? [
            "Lighthouse measured ",
            strong(s2(card.tbt.ms), C.bad),
            ` of Total Blocking Time (metric score ${card.tbt.score}).`,
          ]
        : ["Lighthouse reported no Total Blocking Time."]),
      el(
        "div",
        `color:${C.muted};font-size:14px;margin-top:4px`,
        leads
          ? `The trace holds ${leads.longTaskCount} long tasks, about ${s2(leads.blockingMs)} of blocking over the whole load (TBT counts only first paint to interactive). Times are scaled to the simulated ${leads.cpuSlowdown}x slower CPU.`
          : "No trace to read, so only the audit's hints are below.",
      ),
    );

    const panel = el(
      "div",
      `background:${C.panel};border-radius:12px;padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:18px 32px`,
    );
    if (leads) {
      panel.append(
        block(
          "work inside the long tasks",
          leads.work.map((w) => [strong(s2(w.ms), C.bad), " ", w.label]),
        ),
        block(
          "heaviest tasks, and what started them",
          leads.tasks
            .slice(0, 5)
            .map((t) => [
              strong(s2(t.ms), C.bad),
              muted(` at ${(t.startMs / 1000).toFixed(2)} s, `),
              code(t.startedBy),
            ]),
        ),
        block(
          "code that dirtied style or layout, or forced a layout",
          leads.dirtiedBy.length
            ? leads.dirtiedBy
                .slice(0, 6)
                .map((d) => [strong(`${d.count}x`), " ", code(d.where)])
            : [[muted("nothing recorded a stack")]],
        ),
      );
    }
    const animated = new Map<string, number>();
    for (const { selector, reason } of card.mainThreadAnimations) {
      const key = `${selector}\n${reason}`;
      animated.set(key, (animated.get(key) ?? 0) + 1);
    }
    panel.append(
      block("animated on the main thread, every frame", [
        ...(animated.size
          ? [...animated].slice(0, 3).map(([key, n]) => {
              const [selector, reason] = key.split("\n");
              return [
                strong(`${n}x`),
                " ",
                code(selector!),
                muted(` (${reason})`),
              ];
            })
          : [[muted("none")]]),
        ...(card.domElements
          ? [
              [
                strong(card.domElements.toLocaleString("en")),
                " DOM elements to style and lay out",
              ],
            ]
          : []),
      ]),
    );

    root.append(
      route,
      score,
      headline,
      panel,
      el(
        "div",
        `color:${C.muted};font-size:13px;margin-top:12px`,
        `Every long task is in ${card.leadsTextName}. Open ${card.traceName} in Chrome DevTools > Performance for the flame chart.`,
      ),
    );
    document.body.append(root);
    return;
  }

  // The page's JS on one bar, with a familiar image size marked for scale.
  // Inset by the panel padding, so each file's slice below lines up with it.
  const scale = el("div", "position:relative;margin:0 18px;padding-top:22px");
  const total = el(
    "div",
    `height:16px;background:${C.track};border-radius:8px;overflow:hidden;display:flex`,
  );
  total.append(
    el(
      "div",
      `width:${((card.bytesTotal - card.deadWeightTotal) / card.bytesTotal) * 100}%;background:${C.ran}`,
    ),
    el(
      "div",
      `width:${(card.deadWeightTotal / card.bytesTotal) * 100}%;background:${C.bad}`,
    ),
  );
  scale.append(total);
  if (card.reference) {
    const at = `${Math.min(1, card.reference.bytes / card.bytesTotal) * 100}%`;
    scale.append(
      el(
        "div",
        `position:absolute;left:${at};top:16px;bottom:-6px;border-left:2px solid ${C.text}`,
      ),
      el(
        "div",
        `position:absolute;left:${at};top:0;font-size:12px;white-space:nowrap;color:${C.text}`,
        `← ${card.reference.label} is ${size(card.reference.bytes)}`,
      ),
    );
  }

  root.append(
    route,
    score,
    scale,
    el(
      "div",
      "font-size:17px;margin-top:12px",
      `${size(card.bytesTotal)} of JavaScript downloaded, ${size(card.deadWeightTotal)} never ran. ${(card.mainThreadMsTotal / 1000).toFixed(1)} seconds on the main thread.`,
    ),
  );

  // Legend: one group per unit, since the two bars measure different things.
  const legend = el(
    "div",
    "display:grid;grid-template-columns:repeat(2,max-content);gap:0 64px;margin:22px 0 24px",
  );
  for (const [unit, entries] of [
    [
      "size, in KiB",
      [
        [C.ran, "KiB of code that ran"],
        [C.bad, "KiB of code that never ran (lazy-load it)"],
      ],
    ],
    [
      "time, in seconds",
      [
        [C.ownJs, "seconds running the script"],
        [
          C.other,
          "seconds of other work in tasks it started (style, layout, paint, frames)",
        ],
      ],
    ],
  ] as const) {
    const group = el("div", "");
    group.append(caption(unit));
    for (const [color, text] of entries) {
      const item = el(
        "div",
        "display:flex;align-items:center;gap:8px;margin-top:4px",
      );
      item.append(swatch(color), text);
      group.append(item);
    }
    legend.append(group);
  }
  root.append(legend);

  const pct = (share: number) =>
    share >= 0.01 ? `${Math.round(share * 100)}%` : "<1%";
  const maxMs = Math.max(1, ...card.bundles.map((b) => b.ownMs + b.otherMs));
  // Every item gets a dim cell where the previous one ended, so a column of
  // strips reads as one whole; only the current item's cell is filled.
  const strip = (
    items: { name: string; bytes: number; unusedBytes: number }[],
    total: number,
    current: number,
    height: number,
  ) => {
    const track = el(
      "div",
      `position:relative;height:${height}px;background:${C.track};border-radius:${height / 2}px;overflow:hidden`,
    );
    let offset = 0;
    items.forEach((item, i) => {
      const cell = el(
        "div",
        `position:absolute;top:0;bottom:0;left:${(offset / total) * 100}%;width:${(item.bytes / total) * 100}%;min-width:3px;box-sizing:border-box;border-right:2px solid ${C.panel};display:flex;cursor:help`,
      );
      cell.title = `${item.name}\n${size(item.bytes)}, ${size(item.unusedBytes)} never ran, ${pct(item.bytes / total)}`;
      if (i === current) {
        cell.append(
          el(
            "div",
            `flex:${item.bytes - item.unusedBytes};background:${C.ran}`,
          ),
          el("div", `flex:${item.unusedBytes};background:${C.bad}`),
        );
      } else {
        cell.style.background = "#3a4356";
      }
      track.append(cell);
      offset += item.bytes;
    });
    return track;
  };
  for (const [index, b] of card.bundles.entries()) {
    const panel = el(
      "div",
      `background:${C.panel};border-radius:12px;padding:18px;margin-bottom:12px`,
    );

    const title = el(
      "div",
      "display:flex;justify-content:space-between;align-items:baseline;gap:16px",
    );
    title.append(
      el("span", `font:800 16px ${mono};overflow-wrap:anywhere`, b.file),
      el(
        "span",
        `font:800 16px system-ui;white-space:nowrap`,
        `${pct(b.bytes / card.bytesTotal)} of the page's JavaScript`,
      ),
    );

    const share = strip(
      card.bundles.map((f) => ({ ...f, name: f.file })),
      card.bytesTotal,
      index,
      16,
    );
    share.style.marginTop = "10px";

    // The file the browser loaded and what it cost.
    const metric = (text: string, color: string) =>
      el("b", `color:${color};font-weight:800`, text);
    const tasks = b.longTasks
      ? [", ", metric(String(b.longTasks), C.text), " long tasks"]
      : [];
    const time = bar(
      [
        { value: b.ownMs, color: C.ownJs },
        { value: b.otherMs, color: C.other },
      ],
      maxMs,
      [
        metric(sec(b.ownMs + b.otherMs), C.text),
        " main thread: ",
        metric(sec(b.ownMs), C.ownJs),
        " script, ",
        metric(sec(b.otherMs), C.other),
        " other work in its tasks",
        ...tasks,
      ],
    );
    time.title = `${b.file}\n${sec(b.ownMs)} running the script, ${sec(b.otherMs)} of other work in tasks it started, ${b.longTasks} long tasks`;
    time.style.cursor = "help";
    panel.append(
      title,
      share,
      el(
        "div",
        `color:${C.muted};font-size:14px;margin-top:6px`,
        b.unusedBytes
          ? `${size(b.bytes)}, ${size(b.unusedBytes)} never ran`
          : size(b.bytes),
      ),
      time,
    );

    // Indented under it: what it was built from, each row's slice of the file.
    if (b.parts.length > 0) {
      const table = el(
        "div",
        `display:grid;grid-template-columns:28px 1fr max-content 240px;gap:6px 14px;align-items:center;margin:18px 0 2px 24px;padding-left:16px;border-left:2px solid ${C.track}`,
      );
      table.append(
        el("span", ""),
        caption("built from"),
        caption("size, never ran"),
        caption("share of the file"),
      );
      for (const [i, part] of b.parts.entries()) {
        const other = part.name.startsWith("everything else");
        // Long paths wrap only after a slash, never inside a name.
        const path = el(
          "span",
          `font:13px ${mono};color:${other ? C.muted : C.text}`,
        );
        part.name.split("/").forEach((segment, i) => {
          if (i > 0) path.append("/", document.createElement("wbr"));
          path.append(segment);
        });
        const slice = strip(b.parts, b.bytes, i, 10);
        const reading = el("span", `font-size:14px;color:${C.muted}`);
        reading.append(
          `${size(part.bytes)}, `,
          el(
            "b",
            `color:${part.unusedBytes ? C.bad : C.muted}`,
            size(part.unusedBytes),
          ),
        );
        table.append(
          el(
            "span",
            `font:800 14px system-ui;color:${C.muted};text-align:right`,
            other ? "" : `${i + 1}.`,
          ),
          path,
          reading,
          slice,
        );
      }
      panel.append(table);
    }
    root.append(panel);
  }

  root.append(
    el(
      "div",
      `color:${C.muted};font-size:13px;margin-top:8px`,
      `Paths are repo paths: Ctrl+P them in VS Code. Every script and source file is in the ${card.textName} attachment.`,
    ),
  );

  document.body.append(root);
}
