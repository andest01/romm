import { onBeforeUnmount } from "vue";
import { AXIS_THRESHOLD, PAD_BUTTON } from "@/composables/useGamepad";
import type { CruiseFeel, ScrollRow } from "./list.props";
import { cruiseRowsPerSecond, itemRowAtCentre } from "./list.selectors";

/** The pad repeats 350 ms after a press: a second event inside this window is
 *  a hold. A quicker one is a second tap. */
const HOLD_MIN_MS = 300;
const HOLD_WINDOW_MS = 450;
/** No pad data and no events for this long means released. */
const SILENCE_MS = 300;
/** A held key repeats every ~30 ms; this long without one means keyup was lost. */
const KEY_SILENCE_MS = 700;
/** Frames longer than this (a stall, a hidden tab) don't jump the scroll. */
const MAX_FRAME_MS = 50;

type VerticalKey = "ArrowUp" | "ArrowDown";

/** Hold-to-cruise, ported from the gallery's `useGridCruise`. A tap is left
 *  to the caller. Once a hold is detected, the scroll moves in a straight
 *  line, faster the longer it's held, and repeats no longer drive it:
 *  steering from 30 Hz repeats on a 60 Hz screen is what made it pulse. The
 *  item row at the centre line is reported as it changes; release finishes
 *  on the next row ahead, so the view never slides back. With no cruise in
 *  the feel, every press is left to the caller. */
export function useCruise(options: {
  feel: () => CruiseFeel | null;
  scroller: () => HTMLElement | null;
  rows: () => readonly ScrollRow[];
  rowHeight: () => number;
  headHeight: () => number;
  onRow: (rowIndex: number) => void;
  onEnd: (rowIndex: number | null) => void;
}) {
  let lastKey = "";
  let lastAt = 0;
  let lastEventAt = 0;
  let active = false;
  let direction: 1 | -1 = 1;
  let via: "pad" | "key" = "key";
  let isKeyDown = false;
  let startedAt = 0;
  let lastFrame = 0;
  let lastRow = -1;
  let frame = 0;

  // Read from the pad each frame, so cruise stops the frame the button comes
  // up. `null` when the pad API has nothing to say.
  function isStillHeld(now: number): boolean | null {
    if (via === "key") return isKeyDown && now - lastEventAt < KEY_SILENCE_MS;
    const pads = navigator.getGamepads?.();
    if (!pads) return null;
    const button =
      direction > 0 ? PAD_BUTTON["dpad-down"] : PAD_BUTTON["dpad-up"];
    let isSeen = false;
    for (const pad of pads) {
      if (!pad) continue;
      isSeen = true;
      if (pad.buttons[button]?.pressed) return true;
      const y = pad.axes[1] ?? 0;
      if (direction > 0 ? y > AXIS_THRESHOLD : y < -AXIS_THRESHOLD) return true;
    }
    return isSeen ? false : null;
  }

  const centreRow = (element: HTMLElement): number =>
    itemRowAtCentre(
      options.rows(),
      element.scrollTop + element.clientHeight / 2,
      options.rowHeight(),
      options.headHeight(),
    );

  // Finish on the next item row ahead of the centre line.
  function settleRow(element: HTMLElement): number {
    const here = centreRow(element);
    const rows = options.rows();
    for (
      let index = here + direction;
      index >= 0 && index < rows.length;
      index += direction
    ) {
      if (rows[index]?.kind === "items") return index;
    }
    return here;
  }

  function finish(report: boolean): void {
    if (!active) return;
    active = false;
    cancelAnimationFrame(frame);
    frame = 0;
    lastKey = "";
    const element = options.scroller();
    options.onEnd(report && element ? settleRow(element) : null);
  }

  function step(now: number): void {
    const element = options.scroller();
    const feel = options.feel();
    if (!element || !feel) return finish(false);
    const held = isStillHeld(now);
    if (held === false || (held === null && now - lastEventAt > SILENCE_MS)) {
      return finish(true);
    }
    const frameMs = Math.min(now - lastFrame, MAX_FRAME_MS);
    lastFrame = now;
    const pixelsPerSecond =
      cruiseRowsPerSecond(now - startedAt, feel) * options.rowHeight();
    const max = element.scrollHeight - element.clientHeight;
    element.scrollTop = Math.min(
      max,
      Math.max(
        0,
        element.scrollTop + (direction * pixelsPerSecond * frameMs) / 1000,
      ),
    );
    const row = centreRow(element);
    if (row !== lastRow && row !== -1) {
      lastRow = row;
      options.onRow(row);
    }
    frame = requestAnimationFrame(step);
  }

  /** Feed every ↑ or ↓. True when cruise owns it, so the caller doesn't step. */
  function feed(
    key: VerticalKey,
    source: { via: "pad" | "key"; isRepeat: boolean },
  ): boolean {
    if (!options.feel()) return false;
    const now = performance.now();
    lastEventAt = now;
    if (active) return true;
    // A keyboard says it's repeating; the pad repeats on a timer we can time.
    const isHold =
      source.via === "key"
        ? source.isRepeat
        : key === lastKey &&
          now - lastAt >= HOLD_MIN_MS &&
          now - lastAt < HOLD_WINDOW_MS;
    lastKey = key;
    lastAt = now;
    if (!isHold) return false;
    active = true;
    via = source.via;
    isKeyDown = true;
    direction = key === "ArrowDown" ? 1 : -1;
    startedAt = lastFrame = now;
    lastRow = -1;
    frame = requestAnimationFrame(step);
    return true;
  }

  /** The held key came up. */
  function keyUp(key: string): void {
    if (via === "key" && (key === "ArrowDown") === direction > 0) {
      isKeyDown = false;
    }
  }

  /** Stop without reporting a row: the user took over, or the view changed. */
  const cancel = (): void => finish(false);
  onBeforeUnmount(cancel);

  return { feed, keyUp, cancel, isActive: () => active };
}
