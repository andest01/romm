// Measures a page load: frame times, long animation frames (and the scripts in
// them), layout shift, DOM size, and every CDP Performance counter.
//
//   const perf = await recordLoad(page);   // before navigating
//   await gotoHydrated(page, path);
//   await settle(perf);
//   const snapshot = await stopRecording(perf, "home-load");
//
// To measure more, add a section to PerfSnapshot and fill it in
// stopRecording: network (requests, bytes), paint (LCP, FCP), memory.
import type { CDPSession, Page, Request } from "@playwright/test";
import { expect, test } from "../../support/test";

/** A frame slower than this reads as a stutter. */
export const SLOW_FRAME_MS = 50;
/** A frame slower than this reads as a freeze. */
export const HITCH_MS = 100;

type LongFrame = {
  duration: number;
  blockingDuration: number;
  scripts: {
    duration: number;
    invoker: string;
    sourceURL: string;
    sourceFunctionName: string;
  }[];
};

/** Everything one recording can report. Wide on purpose, so checks and the
 *  report read one shape as sources are added. */
export type PerfSnapshot = {
  name: string;
  frames: {
    count: number;
    p50: number;
    p95: number;
    max: number;
    /** Frames slower than SLOW_FRAME_MS. */
    slow: number;
    /** Frames slower than HITCH_MS: visible freezes. */
    hitches: number;
  };
  blocking: {
    /** Time long frames blocked input beyond 50 ms each (Lighthouse's TBT
     *  idea). Catches a few long freezes that p95 hides. */
    blockedMs: number;
    longFrames: LongFrame[];
  };
  layout: {
    /** Layout shift not caused by input. */
    cls: number;
  };
  dom: {
    /** Elements in the page when the recording stopped. */
    liveNodes: number;
  };
  /** Every counter CDP's Performance domain reports, e.g. Nodes,
   *  JSEventListeners, LayoutCount, LayoutDuration, RecalcStyleDuration,
   *  ScriptDuration, TaskDuration, JSHeapUsedSize. Durations are seconds. */
  cdp: Record<string, number>;
};

type Recorder = {
  frames: number[];
  longFrames: LongFrame[];
  cls: number;
  running: boolean;
};
type RecorderWindow = Window & { __perfRecorder?: Recorder };
type LayoutShift = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
};

export type Recording = {
  page: Page;
  cdp: CDPSession;
  /** API requests in flight. */
  pending: Set<Request>;
};

/** Runs inside the page, before any of its own scripts. Self-contained. */
function installRecorder(): void {
  // Init scripts also run in iframes and on non-http pages; record the page.
  if (window.top !== window || !location.protocol.startsWith("http")) return;
  const recorder: Recorder = {
    frames: [],
    longFrames: [],
    cls: 0,
    running: true,
  };
  (window as RecorderWindow).__perfRecorder = recorder;
  let last = performance.now();
  const tick = (now: number) => {
    recorder.frames.push(now - last);
    last = now;
    if (recorder.running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const frame = entry.toJSON() as LongFrame;
      recorder.longFrames.push({
        duration: frame.duration,
        blockingDuration: frame.blockingDuration,
        scripts: frame.scripts.map((s) => ({
          duration: s.duration,
          invoker: s.invoker,
          sourceURL: s.sourceURL,
          sourceFunctionName: s.sourceFunctionName,
        })),
      });
    }
  }).observe({ type: "long-animation-frame" });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as LayoutShift[]) {
      if (recorder.running && !entry.hadRecentInput)
        recorder.cls += entry.value;
    }
  }).observe({ type: "layout-shift" });
}

/** Records the next page load from its first script. Call before navigating. */
export async function recordLoad(page: Page): Promise<Recording> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const pending = new Set<Request>();
  const isApi = (r: Request) => new URL(r.url()).pathname.startsWith("/api/");
  page.on("request", (r) => isApi(r) && pending.add(r));
  page.on("requestfinished", (r) => pending.delete(r));
  page.on("requestfailed", (r) => pending.delete(r));
  await page.addInitScript(installRecorder);
  return { page, cdp, pending };
}

/** Waits until the page has fetched its data and rendered it: no API request
 *  in flight, then `quietMs` of frames with none slower than SLOW_FRAME_MS. */
export async function settle(
  { page, pending }: Recording,
  quietMs = 1000,
): Promise<void> {
  await expect
    .poll(() => pending.size, { message: "API requests still in flight" })
    .toBe(0);
  await page.evaluate(
    ({ quiet, slow }) =>
      new Promise<void>((resolve) => {
        let last = performance.now();
        let calm = 0;
        const tick = (now: number) => {
          const frame = now - last;
          last = now;
          calm = frame > slow ? 0 : calm + frame;
          if (calm >= quiet) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { quiet: quietMs, slow: SLOW_FRAME_MS },
  );
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function report(s: PerfSnapshot): string {
  const ms = (n: number) => `${n.toFixed(1)} ms`;
  const lines = [
    `${s.name}: ${s.frames.count} frames, p50 ${ms(s.frames.p50)}, p95 ${ms(s.frames.p95)}, max ${ms(s.frames.max)}`,
    `${s.frames.slow} over ${SLOW_FRAME_MS} ms, ${s.frames.hitches} over ${HITCH_MS} ms, blocked ${ms(s.blocking.blockedMs)}`,
    `layout shift ${s.layout.cls.toFixed(3)}, live DOM nodes ${s.dom.liveNodes}`,
    "",
    "CDP counters:",
    ...Object.entries(s.cdp).map(([key, value]) => `  ${key} ${value}`),
    "",
    "Slowest frames and the scripts in them:",
  ];
  const worst = [...s.blocking.longFrames]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10);
  for (const frame of worst) {
    lines.push(
      `  ${ms(frame.duration)} (blocking ${ms(frame.blockingDuration)})`,
    );
    for (const script of [...frame.scripts].sort(
      (a, b) => b.duration - a.duration,
    )) {
      lines.push(
        `    ${ms(script.duration)}  ${script.sourceFunctionName || "(anonymous)"}  ${script.sourceURL}  [${script.invoker}]`,
      );
    }
  }
  return lines.join("\n");
}

/** Stops recording, attaches `<name>-perf.txt` and returns the snapshot. */
export async function stopRecording(
  { page, cdp }: Recording,
  name: string,
): Promise<PerfSnapshot> {
  const recorder = await page.evaluate(() => {
    const r = (window as RecorderWindow).__perfRecorder;
    if (!r) return null;
    r.running = false;
    return {
      frames: r.frames,
      longFrames: r.longFrames,
      cls: r.cls,
      liveNodes: document.getElementsByTagName("*").length,
    };
  });
  if (!recorder) {
    throw new Error(
      `stopRecording(${name}): no recorder on the page. Call recordLoad before navigating.`,
    );
  }
  const { metrics } = await cdp.send("Performance.getMetrics");

  // The first delta is page start to first frame, not a painted frame.
  const frames = recorder.frames.slice(1).sort((a, b) => a - b);
  const snapshot: PerfSnapshot = {
    name,
    frames: {
      count: frames.length,
      p50: percentile(frames, 0.5),
      p95: percentile(frames, 0.95),
      max: frames.at(-1) ?? 0,
      slow: frames.filter((f) => f > SLOW_FRAME_MS).length,
      hitches: frames.filter((f) => f > HITCH_MS).length,
    },
    blocking: {
      blockedMs: recorder.longFrames.reduce(
        (sum, f) => sum + f.blockingDuration,
        0,
      ),
      longFrames: recorder.longFrames,
    },
    layout: { cls: recorder.cls },
    dom: { liveNodes: recorder.liveNodes },
    cdp: Object.fromEntries(metrics.map((m) => [m.name, m.value])),
  };
  await test.info().attach(`${name}-perf.txt`, {
    body: report(snapshot),
    contentType: "text/plain",
  });
  return snapshot;
}
