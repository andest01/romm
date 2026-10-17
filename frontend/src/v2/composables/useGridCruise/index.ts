// useGridCruise: hold Up or Down (controller or keyboard) and the grid scrolls in a
// straight line, faster the longer you hold, with the card at the center of the
// screen as the selection.
//
// useGamepad sends one synthetic arrow on press, then another after 350 ms and
// every 120 ms while held. A tap is the first event alone (the caller steps one
// row). A second event of the same direction inside HOLD_WINDOW_MS is the first
// repeat: the hold has started and this takes over the scroll.
//
// Cruise moves `scrollTop` linearly (no easing) and reports the row at the
// centered position each time it changes. Release is read from the pad itself
// every frame (D-pad button or stick past the same threshold useGamepad uses),
// so it stops the frame the button comes up instead of waiting for events to
// dry up; with no pad data it falls back to event silence.
import { AXIS_THRESHOLD, PAD_BUTTON } from "@/v2/composables/useGamepad";

export interface GridCruiseOptions {
  scroller: () => HTMLElement | null;
  rowHeight: () => number;
  /** scrollTop that centers `row` (the packer's row 0 gives the base). */
  scrollTopFor: (row: number) => number;
  rowCount: () => number;
  /** The row whose card sits at the center when the scroller is at `scrollTop`.
   *  Rows need not be evenly spaced (letter headers sit between them). */
  rowAt: (scrollTop: number) => number;
  /** The centered row changed while cruising. */
  onRow: (row: number) => void;
  onStart: () => void;
  /** Cruise is over: the centered row on release, or null when cancelled. */
  onEnd: (row: number | null) => void;
}

const START_ROWS_PER_SEC = 8;
const MAX_ROWS_PER_SEC = 20;
const RAMP_MS = 1000;
/** The pad's first repeat lands 350 ms after the press: inside this window. A
 *  quicker second Up is a second tap, not a hold. */
const HOLD_MIN_MS = 300;
const HOLD_WINDOW_MS = 450;
/** No pad data and no events for this long means released. */
const SILENCE_MS = 300;
/** A held key repeats every ~30 ms; this long without one means keyup was lost. */
const KEY_SILENCE_MS = 700;

export function useGridCruise(opts: GridCruiseOptions) {
  let lastKey = "";
  let lastAt = 0;
  let lastEventAt = 0;
  let active = false;
  let dir: 1 | -1 = 1;
  let via: "pad" | "key" = "pad";
  let keyDown = false;
  let startedAt = 0;
  let lastFrame = 0;
  let lastRow = -1;
  let frame = 0;

  /** Is the held direction still down? null when the pad API has nothing. */
  function stillHeld(now: number): boolean | null {
    if (via === "key") return keyDown && now - lastEventAt < KEY_SILENCE_MS;
    const pads = navigator.getGamepads?.();
    if (!pads) return null;
    const button = dir > 0 ? PAD_BUTTON["dpad-down"] : PAD_BUTTON["dpad-up"];
    let seen = false;
    for (const pad of pads) {
      if (!pad) continue;
      seen = true;
      if (pad.buttons[button]?.pressed) return true;
      const y = pad.axes[1] ?? 0;
      if (dir > 0 ? y > AXIS_THRESHOLD : y < -AXIS_THRESHOLD) return true;
    }
    return seen ? false : null;
  }

  function centeredRow(el: HTMLElement): number {
    const rows = opts.rowCount();
    // At either end the scroll clamps before the center reaches the first or
    // last row; those rows still count as centered.
    const max = el.scrollHeight - el.clientHeight;
    if (el.scrollTop >= max - 1) return rows - 1;
    if (el.scrollTop <= 1) return 0;
    return Math.min(rows - 1, Math.max(0, opts.rowAt(el.scrollTop)));
  }

  // Release finishes on the next row in the direction of travel, so the view
  // never slides back to a row it has already passed.
  function settleRow(el: HTMLElement): number {
    const rows = opts.rowCount();
    const here = centeredRow(el);
    if (here === 0 || here === rows - 1) return here;
    // Past the middle of the row it is on, finish on the next one ahead.
    const ahead = Math.min(rows - 1, Math.max(0, here + dir));
    const aligned = opts.scrollTopFor(here);
    const passed =
      dir > 0 ? el.scrollTop > aligned + 1 : el.scrollTop < aligned - 1;
    return passed ? ahead : here;
  }

  function finish(report: boolean) {
    if (!active) return;
    active = false;
    cancelAnimationFrame(frame);
    frame = 0;
    lastKey = "";
    const el = opts.scroller();
    opts.onEnd(report && el ? settleRow(el) : null);
  }

  function step(now: number) {
    const el = opts.scroller();
    if (!el) return finish(false);

    const held = stillHeld(now);
    if (held === false || (held === null && now - lastEventAt > SILENCE_MS)) {
      return finish(true);
    }

    const t = Math.min(1, (now - startedAt) / RAMP_MS);
    const rowsPerSec =
      START_ROWS_PER_SEC + (MAX_ROWS_PER_SEC - START_ROWS_PER_SEC) * t;
    const dt = Math.min(now - lastFrame, 50) / 1000;
    lastFrame = now;
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTop = Math.min(
      max,
      Math.max(0, el.scrollTop + dir * rowsPerSec * opts.rowHeight() * dt),
    );

    const row = centeredRow(el);
    if (row !== lastRow) {
      lastRow = row;
      opts.onRow(row);
    }
    frame = requestAnimationFrame(step);
  }

  /** Feed every pad Up/Down event. True when cruise owns it (do not step a row). */
  function feed(
    key: "ArrowUp" | "ArrowDown",
    source: { via: "pad" | "key"; repeat?: boolean },
  ): boolean {
    const now = performance.now();
    lastEventAt = now;
    if (active) return true;
    // The pad repeats on a timer we time; a keyboard says so itself.
    const isRepeat =
      source.via === "key"
        ? !!source.repeat
        : key === lastKey &&
          now - lastAt >= HOLD_MIN_MS &&
          now - lastAt < HOLD_WINDOW_MS;
    lastKey = key;
    lastAt = now;
    if (!isRepeat) return false;

    active = true;
    via = source.via;
    keyDown = true;
    dir = key === "ArrowDown" ? 1 : -1;
    startedAt = lastFrame = now;
    lastRow = -1;
    opts.onStart();
    frame = requestAnimationFrame(step);
    return true;
  }

  /** The held key came up. */
  function keyUp(key: string) {
    if (via === "key" && (key === "ArrowDown") === dir > 0) keyDown = false;
  }

  /** Stop without reporting a row (the user took over, or the view changed). */
  function cancel() {
    finish(false);
  }

  return { feed, keyUp, cancel, isActive: () => active };
}
