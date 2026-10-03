// Leads for Total Blocking Time: the heaviest main-thread tasks from the saved
// trace, what work filled them, which code ran, and which code dirtied style or
// layout. Uses Lighthouse's own task tree, so the numbers match its report.
import SDK from "lighthouse/core/lib/cdt/SDK.js";
import {
  MainThreadTasks,
  type TaskNode,
} from "lighthouse/core/lib/tracehouse/main-thread-tasks.js";
import { TraceProcessor } from "lighthouse/core/lib/tracehouse/trace-processor.js";
import type * as LH from "lighthouse/types/lh.js";
import { sourceName } from "./debt-card";

export const LONG_TASKS_TEXT_NAME = "lighthouse-long-tasks.txt";
export const TRACE_NAME = "lighthouse-trace.json";

// A task blocks input once it runs past this, per the TBT definition.
const BLOCKING_MS = 50;

type Frame = {
  functionName?: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
};
type Args = {
  data?: Frame & {
    type?: string;
    stackTrace?: Frame[];
    elementCount?: number;
  };
  beginData?: {
    dirtyObjects?: number;
    totalObjects?: number;
    stackTrace?: Frame[];
  };
  elementCount?: number;
};

export type Tally = { label: string; ms: number };
export type Dirtier = { where: string; count: number };

export type TaskLead = {
  // Since navigation start, as the DevTools Performance panel shows it.
  startMs: number;
  // On the simulated slow CPU, the device Lighthouse scores.
  ms: number;
  startedBy: string;
  work: Tally[];
  code: Tally[];
  dirtiedBy: Dirtier[];
};

export type Leads = {
  cpuSlowdown: number;
  longTaskCount: number;
  blockingMs: number;
  tasks: TaskLead[];
  work: Tally[];
  dirtiedBy: Dirtier[];
};

// DevTools' names for the events that fill most tasks; others keep their raw name.
const EVENT_LABELS: Record<string, string> = {
  RunTask: "browser work outside any traced event",
  UpdateLayoutTree: "Recalculate style",
  Layout: "Layout",
  PrePaint: "Pre-paint",
  Paint: "Paint",
  Layerize: "Layerize",
  Commit: "Commit",
  ParseHTML: "Parse HTML",
  FunctionCall: "Script",
  EvaluateScript: "Script",
  "v8.evaluateModule": "Script",
  "v8.compile": "Compile script",
  "v8.compileModule": "Compile script",
  RunMicrotasks: "Script",
  "V8.Execute": "Script",
  FireAnimationFrame: "Script",
  TimerFire: "Script",
  EventDispatch: "Script",
  MinorGC: "Garbage collection",
  MajorGC: "Garbage collection",
};

const STARTERS: Record<string, string> = {
  FireAnimationFrame: "requestAnimationFrame",
  TimerFire: "a timer",
  EventDispatch: "an event",
  EvaluateScript: "loading a script",
  "v8.evaluateModule": "loading a module",
  FunctionCall: "a callback",
  RunMicrotasks: "promise callbacks",
  ParseHTML: "parsing HTML",
};

// Sourcemaps come from the server that served the bundle, so any target works.
class SourceMaps {
  #maps = new Map<string, Promise<InstanceType<typeof SDK.SourceMap> | null>>();

  #load(url: string) {
    let map = this.#maps.get(url);
    if (!map) {
      map = fetch(`${url}.map`, { signal: AbortSignal.timeout(5000) })
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) =>
          payload ? new SDK.SourceMap(url, `${url}.map`, payload) : null,
        )
        .catch(() => null);
      this.#maps.set(url, map);
    }
    return map;
  }

  /** "frontend/src/.../CardRow.vue:88 onScroll", or the bundle position unmapped. */
  async where({
    url = "",
    lineNumber = 0,
    columnNumber = 0,
    functionName,
  }: Frame) {
    const name = functionName ? ` ${functionName}` : "";
    if (!url.startsWith("http")) return `${url || "(no url)"}${name}`;
    // Trace positions are 1-based; source maps are 0-based.
    const entry = (await this.#load(url))?.findEntry(
      lineNumber - 1,
      columnNumber - 1,
      0,
    );
    if (!entry?.sourceURL) {
      return `${new URL(url).pathname}:${lineNumber}:${columnNumber}${name}`;
    }
    return `${sourceName(entry.sourceURL)}:${entry.sourceLineNumber + 1}${name}`;
  }
}

const argsOf = (event: LH.TraceEvent) => event.args as Args;

function descendants(task: TaskNode): TaskNode[] {
  return task.children.flatMap((child) => [child, ...descendants(child)]);
}

// The frame to blame: the first one in app code, else the innermost.
const blameFrame = (stack: Frame[]) =>
  stack.find((f) => f.url?.includes("/assets/")) ?? stack[0];

function add(tally: Map<string, number>, label: string, ms: number) {
  tally.set(label, (tally.get(label) ?? 0) + ms);
}

const ranked = (tally: Map<string, number>, count: number): Tally[] =>
  [...tally]
    .map(([label, ms]) => ({ label, ms }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, count);

function workOf(tasks: TaskNode[], scale: number): Map<string, number> {
  const tally = new Map<string, number>();
  for (const node of tasks.flatMap((t) => [t, ...descendants(t)])) {
    add(
      tally,
      EVENT_LABELS[node.event.name] ?? node.event.name,
      node.selfTime * scale,
    );
  }
  return tally;
}

// The biggest style and layout passes say how much of the page each one touched.
function detail(nodes: TaskNode[]): Map<string, string> {
  const layouts = nodes.filter((n) => n.event.name === "Layout");
  const styles = nodes.filter((n) => n.event.name === "UpdateLayoutTree");
  const out = new Map<string, string>();
  const layout = layouts.sort((a, b) => b.duration - a.duration)[0];
  const begin = layout && argsOf(layout.event).beginData;
  if (begin?.totalObjects) {
    out.set(
      "Layout",
      `${layouts.length}x, largest ${begin.dirtyObjects ?? "?"} of ${begin.totalObjects} objects`,
    );
  }
  const elements = styles.map((n) => {
    const args = argsOf(n.event);
    return args.elementCount ?? args.data?.elementCount ?? 0;
  });
  if (elements.some(Boolean)) {
    out.set(
      "Recalculate style",
      `${styles.length}x, up to ${Math.max(...elements)} elements`,
    );
  }
  return out;
}

async function startedBy(task: TaskNode, maps: SourceMaps): Promise<string> {
  const starter = descendants(task).find((n) => STARTERS[n.event.name]);
  if (!starter) return "the browser (no script in this task)";
  const data = argsOf(starter.event).data;
  const what =
    starter.event.name === "EventDispatch" && data?.type
      ? `a "${data.type}" event`
      : STARTERS[starter.event.name]!;
  const call = [starter, ...descendants(starter)].find(
    (n) => argsOf(n.event).data?.url,
  );
  return call
    ? `${what} in ${await maps.where(argsOf(call.event).data!)}`
    : what;
}

// Only the outermost call, so nested calls aren't counted twice.
async function codeOf(task: TaskNode, scale: number, maps: SourceMaps) {
  const tally = new Map<string, number>();
  const visit = async (node: TaskNode): Promise<void> => {
    if (node.event.name === "FunctionCall" && argsOf(node.event).data?.url) {
      add(
        tally,
        await maps.where(argsOf(node.event).data!),
        node.duration * scale,
      );
      return;
    }
    for (const child of node.children) await visit(child);
  };
  await visit(task);
  return ranked(tally, 3);
}

// Style and layout invalidations, and forced layouts, carry the stack that caused them.
async function dirtiers(
  events: LH.TraceEvent[],
  maps: SourceMaps,
  count: number,
): Promise<Dirtier[]> {
  const tally = new Map<string, number>();
  for (const event of events) {
    const args = argsOf(event);
    const stack = args.data?.stackTrace ?? args.beginData?.stackTrace;
    const frame = stack && blameFrame(stack);
    if (frame) add(tally, await maps.where(frame), 1);
  }
  return [...tally]
    .map(([where, n]) => ({ where, count: n }))
    .sort((a, b) => b.count - a.count)
    .slice(0, count);
}

const DIRTYING = new Set([
  "ScheduleStyleRecalculation",
  "InvalidateLayout",
  "Layout",
]);

/** Explains the long tasks in a Lighthouse trace. Times are scaled to the
 *  simulated CPU, so they sit on the same scale as the report. */
export async function longTaskLeads(
  trace: LH.Trace,
  cpuSlowdown: number,
  taskCount = 8,
): Promise<Leads> {
  const processed = TraceProcessor.processTrace(trace);
  const { mainThreadEvents, frames, timestamps } = processed;
  const tasks = MainThreadTasks.getMainThreadTasks(
    mainThreadEvents,
    frames,
    timestamps.traceEnd,
    timestamps.timeOrigin,
  );
  const long = tasks
    .filter((t) => !t.parent && t.duration * cpuSlowdown >= BLOCKING_MS)
    .sort((a, b) => b.duration - a.duration);
  const maps = new SourceMaps();
  const inTask = (task: TaskNode) => {
    const from = timestamps.timeOrigin + task.startTime * 1000;
    const to = timestamps.timeOrigin + task.endTime * 1000;
    return mainThreadEvents.filter(
      (e: LH.TraceEvent) => DIRTYING.has(e.name) && e.ts >= from && e.ts <= to,
    );
  };

  const leads: TaskLead[] = [];
  for (const task of long.slice(0, taskCount)) {
    const nodes = descendants(task);
    const notes = detail(nodes);
    leads.push({
      startMs: task.startTime,
      ms: task.duration * cpuSlowdown,
      startedBy: await startedBy(task, maps),
      work: ranked(workOf([task], cpuSlowdown), 4).map((w) => ({
        ...w,
        label: notes.has(w.label)
          ? `${w.label} (${notes.get(w.label)})`
          : w.label,
      })),
      code: await codeOf(task, cpuSlowdown, maps),
      dirtiedBy: await dirtiers(inTask(task), maps, 3),
    });
  }

  return {
    cpuSlowdown,
    longTaskCount: long.length,
    blockingMs: long.reduce(
      (sum, t) => sum + t.duration * cpuSlowdown - BLOCKING_MS,
      0,
    ),
    tasks: leads,
    work: ranked(workOf(long, cpuSlowdown), 6),
    dirtiedBy: await dirtiers(long.flatMap(inTask), maps, 8),
  };
}

const ms = (value: number) => `${Math.round(value).toLocaleString("en")} ms`;

/** The leads as plain text, one block per task. */
export function leadsText(leads: Leads, traceName: string): string {
  const tally = (items: Tally[]) =>
    items.map((t) => `${t.label} ${ms(t.ms)}`).join(", ");
  const blame = (items: Dirtier[], indent: string) =>
    items.map((d) => `${indent}${String(d.count).padStart(4)}x  ${d.where}`);
  return [
    `${leads.longTaskCount} long tasks, about ${ms(leads.blockingMs)} blocking.`,
    `Times are scaled to the simulated CPU (${leads.cpuSlowdown}x slower than this machine), like the report.`,
    `Open ${traceName} in Chrome DevTools > Performance and go to a task's start time for its flame chart.`,
    "",
    "Across all long tasks:",
    `  work: ${tally(leads.work)}`,
    "  code that dirtied style or layout, or forced a layout:",
    ...blame(leads.dirtiedBy, "  "),
    "",
    ...leads.tasks.flatMap((task, i) => [
      `${i + 1}. ${ms(task.ms)} at ${(task.startMs / 1000).toFixed(2)} s, started by ${task.startedBy}`,
      `   work: ${tally(task.work)}`,
      ...(task.code.length ? [`   script: ${tally(task.code)}`] : []),
      ...(task.dirtiedBy.length
        ? ["   dirtied style or layout:", ...blame(task.dirtiedBy, "   ")]
        : []),
      "",
    ]),
  ].join("\n");
}
