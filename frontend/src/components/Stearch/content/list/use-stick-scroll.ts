import { useRafFn } from "@vueuse/core";
import { onBeforeUnmount, onMounted } from "vue";
import { claimStickY, usePadRafFn } from "@/composables/useGamepad";
import {
  axisMode,
  axisState,
  canPan,
  isInsideBox,
  stepsOwed,
} from "./axis-machine";
import type { ScrollRow, StickFeel } from "./list.props";
import {
  isStickPushed,
  itemRowAtCentre,
  leadingPoint,
  rowTopOf,
  stickCurrentRow,
  stickRowsPerSecond,
} from "./list.selectors";

/** Frames longer than this (a stall, a hidden tab) don't jump the scroll. */
const MAX_FRAME_MS = 50;

/** The stick Y of whichever pad is pushed hardest. */
export function readStickY(): number {
  let hardest = 0;
  for (const pad of navigator.getGamepads?.() ?? []) {
    const y = pad?.axes[1] ?? 0;
    if (Math.abs(y) > Math.abs(hardest)) hardest = y;
  }
  return hardest;
}

/** The left stick as an analog scroll (spec 008), ported from the gallery's
 *  `useStickScroll`, on the axis machine. Captured, deflection sets a speed
 *  and the view moves, handing over at the band. Pinned or free, it steps.
 *  Letting go stops the view where it is; nothing recentres.
 *  While a feel has a stick, the stick sends no up or down arrows. */
export function useStickScroll(options: {
  feel: () => StickFeel | null;
  /** The centre band's height in rows: the active row hands over when its
   *  middle leaves it. */
  bandRows: () => number;
  scroller: () => HTMLElement | null;
  rows: () => readonly ScrollRow[];
  rowHeight: () => number;
  headHeight: () => number;
  /** The current row when the stick starts, if there is one. */
  currentRow: () => number | null;
  /** The stick's Y, -1 (up) to 1 (down): `readStickY` in the app; a story
   *  can stand in for a pad. */
  deflection: () => number;
  /** "pad" runs only while a pad is connected; "always" lets a story drive
   *  it without one. */
  loop: "pad" | "always";
  onRow: (rowIndex: number) => void;
  /** A step where the stick can't pan: handled as the D-pad's arrow key. */
  onStep: (key: "ArrowUp" | "ArrowDown") => void;
  onEnd: () => void;
}) {
  let isActive = false;
  let isHandedOver = false;
  let currentRow = -1;
  let lastFrame = 0;
  // Part of a step owed, carried between frames in step mode.
  let carried = 0;

  function stop(): void {
    if (!isActive) return;
    isActive = false;
    options.onEnd();
  }

  function rowMiddle(rowIndex: number): number {
    return (
      rowTopOf(
        options.rows(),
        rowIndex,
        options.rowHeight(),
        options.headHeight(),
      ) +
      options.rowHeight() / 2
    );
  }

  function frame(): void {
    const feel = options.feel();
    const element = options.scroller();
    const now = performance.now();
    const frameMs = Math.min(now - lastFrame, MAX_FRAME_MS);
    lastFrame = now;
    if (!feel || !element) return stop();
    const y = options.deflection();
    const isPushed = isStickPushed(y, feel.deadzone, isActive || isHandedOver);
    if (!isPushed) {
      isHandedOver = false;
      return stop();
    }
    // Another input took over mid-push: wait for the stick to come back.
    if (isHandedOver) return;
    const centre = element.scrollTop + element.clientHeight / 2;
    if (!isActive) {
      isActive = true;
      const start = options.currentRow();
      currentRow =
        start === null
          ? itemRowAtCentre(
              options.rows(),
              centre,
              options.rowHeight(),
              options.headHeight(),
            )
          : start;
    }
    const speed = stickRowsPerSecond(y, feel);
    const direction = Math.sign(speed);
    if (direction === 0) return;
    const rowTop = rowMiddle(currentRow) - options.rowHeight() / 2;
    const state = axisState(
      isInsideBox(0, centre - rowTop, options.rowHeight(), options.bandRows()),
      canPan(
        element.scrollTop,
        element.clientHeight,
        element.scrollHeight,
        direction,
      ),
    );
    if (axisMode(state) === "step") {
      const owed = stepsOwed(carried, speed, frameMs);
      carried = owed.carried;
      for (let step = 0; step < owed.steps; step++) {
        options.onStep(direction > 0 ? "ArrowDown" : "ArrowUp");
      }
      currentRow = options.currentRow() ?? currentRow;
      return;
    }
    carried = 0;
    const max = element.scrollHeight - element.clientHeight;
    element.scrollTop = Math.min(
      max,
      Math.max(
        0,
        element.scrollTop + (speed * options.rowHeight() * frameMs) / 1000,
      ),
    );
    const line = element.scrollTop + element.clientHeight / 2;
    const next = stickCurrentRow(
      itemRowAtCentre(
        options.rows(),
        leadingPoint(
          line,
          options.bandRows() * options.rowHeight(),
          options.rowHeight(),
          y,
        ),
        options.rowHeight(),
        options.headHeight(),
      ),
      currentRow,
      (line - rowMiddle(currentRow)) / options.rowHeight(),
      options.bandRows(),
    );
    if (next !== currentRow && next !== -1) {
      currentRow = next;
      options.onRow(next);
    }
  }
  if (options.loop === "pad") usePadRafFn(frame);
  else useRafFn(frame);

  let release: (() => void) | null = null;
  onMounted(() => {
    if (options.feel()) release = claimStickY();
  });
  onBeforeUnmount(() => {
    release?.();
    release = null;
  });

  /** Another input took over (a key, the rail): stand down at once, and
   *  ignore the stick until it's let go. */
  const cancel = (): void => {
    if (!isActive) return;
    isActive = false;
    isHandedOver = true;
  };

  return { cancel, isActive: () => isActive };
}
