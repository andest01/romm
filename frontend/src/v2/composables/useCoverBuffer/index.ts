// useCoverBuffer: loads covers like a video player buffers.
//
// Two scroll behaviours, told apart by pixel velocity and distance (row
// indices are too coarse to tell an arrow key from PageDown):
//
//   Smooth (arrow keys, wheel, a drag): the buffer keeps a lead ahead of the
//   scroll direction, sized in seconds of travel, and tops up before the lead
//   runs out (hysteresis), so a cover is on screen before its row is. Any short
//   pause (the scroll goes quiet for a moment) triggers a deep fill, far ahead
//   and a little behind, so the next stretch of scrolling finds covers waiting.
//
//   Flying (PageDown, a flick, a jump of most of a screen): nothing loads. The
//   queue is dropped, downloads in flight are aborted, and loading only resumes
//   after the scroll has been quiet for a moment, nearest rows first. The rows
//   fly by on their text alone.
//
// A cover is only applied once decoded, so nothing pops in half painted, and an
// applied cover stays applied.

export interface CoverBufferOptions {
  /** Positions held by a row, or [] when the row does not exist. */
  rowPositions: (row: number) => number[];
  rowCount: () => number;
  /** Px height of one row. */
  rowHeight: () => number;
  /** Cover URL for a position, or null when it has none. */
  coverUrl: (position: number) => string | null;
  /** A cover is decoded and in the browser cache; optional, the card paints it itself. */
  apply?: (position: number, url: string) => void;
  /** The scroll started or stopped flying; the grid hides covers while it flies. */
  onFlying?: (flying: boolean) => void;
  /** A cover that failed to load (missing or broken), not one we aborted. */
  fail?: (position: number) => void;
  concurrency?: number;
  /** Seconds of smooth travel to keep covered ahead. */
  bufferSeconds?: number;
}

// Smooth lead, in rows: scaled by speed, never below the floor.
// How hard to preload depends on the connection. HTTP/1.1 gives a browser about
// six sockets per origin, so more requests than that only queue behind the
// page's own API calls; HTTP/2 and HTTP/3 multiplex dozens of streams on one
// connection, so a much longer and wider lead is cheap.
interface NetProfile {
  concurrency: number;
  minAhead: number;
  maxAhead: number;
  deepAhead: number;
  deepBehind: number;
  bufferSeconds: number;
}
const PROFILES: Record<"h1" | "h2", NetProfile> = {
  h1: {
    concurrency: 5,
    minAhead: 14,
    maxAhead: 90,
    deepAhead: 40,
    deepBehind: 8,
    bufferSeconds: 4,
  },
  h2: {
    concurrency: 24,
    minAhead: 28,
    maxAhead: 160,
    deepAhead: 90,
    deepBehind: 16,
    bufferSeconds: 6,
  },
};

/** The protocol the covers actually arrive on: a loaded cover's own entry first
 *  (it can differ from the page behind a proxy), then the page's. `?net=h1` or
 *  `?net=h2` forces it for testing. */
function detectProtocol(): string {
  const forced = new URLSearchParams(location.search).get("net");
  if (forced === "h1") return "http/1.1";
  if (forced === "h2") return "h2";
  const res = performance.getEntriesByType(
    "resource",
  ) as PerformanceResourceTiming[];
  for (let i = res.length - 1; i >= 0; i--) {
    const e = res[i]!;
    if (e.name.includes("/cover/") && e.nextHopProtocol) {
      return e.nextHopProtocol;
    }
  }
  const nav = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  return nav?.nextHopProtocol ?? "";
}

const isMultiplexed = (protocol: string) => /^(h2|h3)/.test(protocol);

const MIN_LOW_ROWS = 6;
// Deep fill on a pause: far ahead, a little behind.
// Flying when faster than this many viewports per second, or when the scroll
// covers this fraction of a viewport inside one window (PageDown does).
const FLY_VIEWPORTS_PER_SEC = 3;
const FLY_DISTANCE_VIEWPORTS = 0.7;
const DISTANCE_WINDOW_MS = 250;
/** Quiet time after the last scroll before a flight is over. */
const SETTLE_MS = 150;
/** Quiet time that counts as "a moment" for a deep fill. */
const PAUSE_MS = 90;

export function useCoverBuffer(opts: CoverBufferOptions) {
  let protocol = detectProtocol();
  let net = isMultiplexed(protocol) ? PROFILES.h2 : PROFILES.h1;
  let loads = 0;

  /** Look again once a few covers have arrived: their own protocol is the truth. */
  function recheckProtocol() {
    const next = detectProtocol();
    if (next === protocol) return;
    protocol = next;
    net = isMultiplexed(protocol) ? PROFILES.h2 : PROFILES.h1;
  }
  const concurrency = () => opts.concurrency ?? net.concurrency;
  const bufferSeconds = () => opts.bufferSeconds ?? net.bufferSeconds;

  /** Positions whose cover is decoded and applied. */
  const ready = new Set<number>();
  const inflight = new Map<number, HTMLImageElement>();
  /** Waiting positions with their priority (lower loads first). */
  const queued = new Map<number, number>();
  /** Positions whose cover could not be loaded; never retried. */
  const failed = new Set<number>();
  const aborted = new WeakSet<HTMLImageElement>();

  let lastTop = -1;
  let lastAt = 0;
  let anchorTop = 0;
  let anchorAt = 0;
  let velocity = 0; // px per second, smoothed
  let dir: 1 | -1 = 1;
  let filledAhead = -1; // farthest row already queued in `dir`
  let flying = false;
  let forced = false;
  let settleTimer = 0;
  let pauseTimer = 0;
  let lastRange: { first: number; last: number } | null = null;

  function enqueueRow(row: number, priority: number) {
    for (const p of opts.rowPositions(row)) {
      if (ready.has(p) || inflight.has(p) || failed.has(p)) continue;
      const prev = queued.get(p);
      if (prev === undefined || priority < prev) queued.set(p, priority);
    }
  }

  async function load(p: number) {
    const url = opts.coverUrl(p);
    if (!url) return;
    const img = new Image();
    img.decoding = "async";
    // What is on screen outranks the road ahead when requests compete.
    img.fetchPriority = (queued.get(p) ?? 0) === 0 ? "high" : "low";
    inflight.set(p, img);
    img.src = url;
    try {
      await img.decode();
      if (inflight.get(p) === img) {
        ready.add(p);
        loads++;
        if (loads === 3 || loads === 40) recheckProtocol();
        opts.apply?.(p, url);
      }
    } catch {
      // Aborted keeps the tint and may retry; missing or broken is final.
      if (!aborted.has(img)) {
        failed.add(p);
        opts.fail?.(p);
      }
    }
    if (inflight.get(p) === img) inflight.delete(p);
    pump();
  }

  function pump() {
    if (flying) return;
    while (inflight.size < concurrency() && queued.size > 0) {
      let best = -1;
      let bestPriority = Infinity;
      for (const [p, priority] of queued) {
        if (priority < bestPriority) {
          best = p;
          bestPriority = priority;
        }
      }
      queued.delete(best);
      void load(best);
    }
  }

  function cancelQueued() {
    queued.clear();
  }

  function abortInflight() {
    for (const [p, img] of inflight) {
      inflight.delete(p);
      aborted.add(img);
      img.src = "";
    }
  }

  function reset() {
    cancelQueued();
    filledAhead = -1;
  }

  /** Queue the visible rows first, then the road ahead, then a little behind. */
  function fill(range: { first: number; last: number }, deep: boolean) {
    for (let r = range.first; r <= range.last; r++) enqueueRow(r, 0);

    const rows = opts.rowCount();
    const rowH = Math.max(1, opts.rowHeight());
    const smoothAhead = Math.min(
      net.maxAhead,
      Math.max(net.minAhead, Math.ceil((velocity * bufferSeconds()) / rowH)),
    );
    const ahead = deep ? Math.max(net.deepAhead, smoothAhead) : smoothAhead;
    const low = Math.max(MIN_LOW_ROWS, Math.round(ahead * 0.4));
    const edge = dir > 0 ? range.last : range.first;
    if (deep) filledAhead = -1;
    const lead =
      filledAhead < 0 ? -1 : dir > 0 ? filledAhead - edge : edge - filledAhead;
    if (lead < low) {
      const to = Math.min(rows - 1, Math.max(0, edge + dir * ahead));
      for (let r = edge + dir; dir > 0 ? r <= to : r >= to; r += dir) {
        enqueueRow(r, Math.abs(r - edge));
      }
      filledAhead = to;
    }

    const behind = deep ? net.deepBehind : 3;
    const back = dir > 0 ? range.first : range.last;
    for (let i = 1; i <= behind; i++) {
      const r = back - dir * i;
      if (r >= 0 && r < rows) enqueueRow(r, 1000 + i);
    }
    pump();
  }

  function setFlying(on: boolean) {
    if (flying === on) return;
    flying = on;
    opts.onFlying?.(on);
  }

  function settle() {
    if (forced) return;
    setFlying(false);
    velocity = 0;
    filledAhead = -1;
    if (lastRange) fill(lastRange, true);
  }

  function pause() {
    if (!flying && lastRange) fill(lastRange, true);
  }

  /** Call on every scroll event with the scroller's scrollTop and height. */
  function scroll(top: number, viewportH: number) {
    const now = performance.now();
    if (lastTop < 0) {
      lastTop = top;
      lastAt = anchorAt = now;
      anchorTop = top;
      return;
    }
    const dy = top - lastTop;
    if (dy === 0) return;

    const dt = Math.max(now - lastAt, 8) / 1000;
    velocity = velocity * 0.6 + (Math.abs(dy) / dt) * 0.4;
    const next = dy > 0 ? 1 : -1;
    if (next !== dir) {
      dir = next;
      filledAhead = -1;
      cancelQueued();
    }
    lastTop = top;
    lastAt = now;

    if (now - anchorAt > DISTANCE_WINDOW_MS) {
      anchorAt = now;
      anchorTop = top;
    }
    const distance = Math.abs(top - anchorTop);
    const isFlying =
      forced ||
      velocity > FLY_VIEWPORTS_PER_SEC * viewportH ||
      distance > FLY_DISTANCE_VIEWPORTS * viewportH;

    if (isFlying && !flying) {
      setFlying(true);
      cancelQueued();
      abortInflight();
    }
    window.clearTimeout(settleTimer);
    window.clearTimeout(pauseTimer);
    if (flying) settleTimer = window.setTimeout(settle, SETTLE_MS);
    else pauseTimer = window.setTimeout(pause, PAUSE_MS);
  }

  /** Call with the visible row range whenever it changes. */
  function update(range: { first: number; last: number }) {
    if (range.last < range.first) return;
    lastRange = range;
    if (flying) return;
    fill(range, false);
  }

  /** Fly on purpose (the user is holding a scroll): nothing loads until released. */
  function holdFlying(on: boolean) {
    forced = on;
    window.clearTimeout(settleTimer);
    window.clearTimeout(pauseTimer);
    if (on) {
      if (!flying) {
        setFlying(true);
        cancelQueued();
        abortInflight();
      }
    } else {
      settleTimer = window.setTimeout(settle, SETTLE_MS);
    }
  }

  return { ready, failed, scroll, update, reset, holdFlying };
}
