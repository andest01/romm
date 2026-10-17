// useStickScroll: the left stick scrolls the grid like an analog control.
//
// Push a little and the view creeps; push harder and it goes faster, in a
// straight line (no easing). Deflection past the deadzone maps to rows per
// second between `minRows` and `maxRows`. The selection follows the card at the
// center, but only switches once the view is `deadBand` rows past it, so it
// does not flicker while the view creeps. Let go and it stops the same frame,
// settles on the next row ahead and the caller glides to center.
import { stickTuning } from "./tuning";

export interface StickScrollOptions {
  scroller: () => HTMLElement | null;
  rowHeight: () => number;
  /** scrollTop that centers `row` (row 0 gives the base). */
  scrollTopFor: (row: number) => number;
  rowCount: () => number;
  /** Row of the current selection, or null when nothing is selected yet. */
  currentRow: () => number | null;
  /** Something else owns the scroll (a cruise, a glide, typing, a dialog). */
  blocked: () => boolean;
  onStart: () => void;
  onRow: (row: number) => void;
  /** Stick released: the row to settle on, or null when cancelled. */
  onEnd: (row: number | null) => void;
}

/** Release needs the stick to fall this far under the deadzone (no chatter). */
const RELEASE_RATIO = 0.7;
/** Below any deadzone worth setting: nothing to check until the stick moves. */
const IDLE_BELOW = 0.05;

export function useStickScroll(opts: StickScrollOptions) {
  let frame = 0;
  let last = 0;
  let active = false;
  let dir: 1 | -1 = 1;
  let selRow = -1;

  /** The stick Y of whichever pad is pushed hardest. */
  function readY(): number {
    const pads = navigator.getGamepads?.();
    let best = 0;
    if (!pads) return best;
    for (const pad of pads) {
      const y = pad?.axes[1] ?? 0;
      if (Math.abs(y) > Math.abs(best)) best = y;
    }
    return best;
  }

  const clampRow = (row: number) =>
    Math.min(opts.rowCount() - 1, Math.max(0, row));

  function finish(report: boolean, el: HTMLElement | null) {
    if (!active) return;
    active = false;
    let row: number | null = null;
    if (report && el) {
      const exact =
        (el.scrollTop - opts.scrollTopFor(0)) / Math.max(1, opts.rowHeight());
      row = clampRow(
        dir > 0 ? Math.ceil(exact - 0.1) : Math.floor(exact + 0.1),
      );
    }
    opts.onEnd(row);
  }

  function step(now: number) {
    frame = requestAnimationFrame(step);
    const dt = Math.min(now - last, 50) / 1000;
    last = now;

    const y = readY();
    const abs = Math.abs(y);
    // A resting stick is the common case: skip the DOM and settings reads.
    if (!active && abs < IDLE_BELOW) return;
    const el = opts.scroller();
    const t = stickTuning.value;

    if (!el || opts.blocked()) {
      // Another input owns the scroll; stand down without a settle.
      if (active) finish(false, el);
      return;
    }

    if (!active) {
      if (abs < t.deadzone) {
        return;
      }
      active = true;
      dir = y > 0 ? 1 : -1;
      const rowH = Math.max(1, opts.rowHeight());
      selRow = clampRow(
        opts.currentRow() ??
          Math.round((el.scrollTop - opts.scrollTopFor(0)) / rowH),
      );
      opts.onStart();
    } else if (abs < t.deadzone * RELEASE_RATIO) {
      finish(true, el);
      return;
    }

    const m = Math.min(1, Math.max(0, (abs - t.deadzone) / (1 - t.deadzone)));
    const rowsPerSec =
      m > 0 ? t.minRows + (t.maxRows - t.minRows) * Math.pow(m, t.gamma) : 0;

    const rowH = Math.max(1, opts.rowHeight());
    if (rowsPerSec > 0) {
      dir = y > 0 ? 1 : -1;
      const max = el.scrollHeight - el.clientHeight;
      el.scrollTop = Math.min(
        max,
        Math.max(0, el.scrollTop + dir * rowsPerSec * rowH * dt),
      );
    }

    const exact = (el.scrollTop - opts.scrollTopFor(0)) / rowH;
    if (Math.abs(exact - selRow) >= t.deadBand) {
      selRow = clampRow(Math.round(exact));
      opts.onRow(selRow);
    }
  }

  function start() {
    if (frame) return;
    last = performance.now();
    frame = requestAnimationFrame(step);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (active) finish(false, opts.scroller());
  }

  return { start, stop, isActive: () => active };
}
