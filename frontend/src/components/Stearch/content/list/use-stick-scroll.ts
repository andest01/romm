import { useRafFn } from "@vueuse/core";
import { onBeforeUnmount, onMounted } from "vue";
import {
  claimStickY,
  keyRepeatMs,
  usePadRafFn,
} from "@/composables/useGamepad";
import { canPan, isInsideBox } from "./axis-machine";
import type { ScrollRow, StickFeel } from "./list.props";
import {
  isStickPushed,
  itemRowAtCentre,
  leadingPoint,
  rowTopOf,
  stickRowsPerSecond,
} from "./list.selectors";
import type { AxisMachine } from "./use-axis-machine";

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

/** The left stick's adapter (spec 008): samples it each frame into the
 *  machine, and carries out the machine's pans. While a feel has a stick,
 *  the stick sends no up or down arrows. */
export function useStickScroll(options: {
  machine: AxisMachine;
  feel: () => StickFeel | null;
  /** The centre band's height in rows. */
  bandRows: () => number;
  scroller: () => HTMLElement | null;
  rows: () => readonly ScrollRow[];
  rowHeight: () => number;
  headHeight: () => number;
  /** The current row, if there is one. */
  currentRow: () => number | null;
  /** The stick's Y, -1 (up) to 1 (down): `readStickY` in the app; a story
   *  can stand in for a pad. */
  deflection: () => number;
  /** "pad" runs only while a pad is connected; "always" lets a story drive
   *  it without one. */
  loop: "pad" | "always";
  onRow: (rowIndex: number) => void;
  onEnd: () => void;
}) {
  const { machine } = options;
  let lastFrame = 0;
  let currentRow = -1;

  const rowAtCentre = (point: number): number =>
    itemRowAtCentre(
      options.rows(),
      point,
      options.rowHeight(),
      options.headHeight(),
    );

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
    const element = options.scroller();
    if (!element) return;
    const now = performance.now();
    const frameMs = Math.min(now - lastFrame, MAX_FRAME_MS);
    lastFrame = now;
    const feel = options.feel();
    const y = feel ? options.deflection() : 0;
    const wasPushed = machine.state.value.phase !== "idle";
    const isPushed = !!feel && isStickPushed(y, feel.deadzone, wasPushed);
    if (!isPushed) {
      machine.dispatch({
        type: "stick/sampled",
        isPushed,
        push: 0,
        cellsPerSecond: 0,
        keyCellsPerSecond: 0,
        frameMs,
        now,
        geometry: machine.state.value.geometry,
      });
      return;
    }
    const centre = element.scrollTop + element.clientHeight / 2;
    currentRow = options.currentRow() ?? rowAtCentre(centre);
    const height = options.rowHeight();
    machine.dispatch({
      type: "stick/sampled",
      isPushed,
      push: Math.abs(y),
      cellsPerSecond: stickRowsPerSecond(y, feel),
      keyCellsPerSecond: 1000 / keyRepeatMs(),
      frameMs,
      now,
      geometry: {
        isInBand: isInsideBox(
          0,
          centre - (rowMiddle(currentRow) - height / 2),
          height,
          options.bandRows(),
        ),
        canPanNegative: canPan(
          element.scrollTop,
          element.clientHeight,
          element.scrollHeight,
          -1,
        ),
        canPanPositive: canPan(
          element.scrollTop,
          element.clientHeight,
          element.scrollHeight,
          1,
        ),
      },
    });
  }

  machine.onEffect((effect) => {
    if (effect.type === "stickEnded") options.onEnd();
    if (effect.type === "handOver") options.onRow(effect.index);
    if (effect.type !== "pan") return;
    const element = options.scroller();
    if (!element) return;
    const height = options.rowHeight();
    const max = element.scrollHeight - element.clientHeight;
    element.scrollTop = Math.min(
      max,
      Math.max(
        0,
        element.scrollTop +
          (effect.cellsPerSecond * height * effect.frameMs) / 1000,
      ),
    );
    const line = element.scrollTop + element.clientHeight / 2;
    machine.dispatch({
      type: "view/panned",
      leadingIndex: rowAtCentre(
        leadingPoint(
          line,
          options.bandRows() * height,
          height,
          effect.cellsPerSecond,
        ),
      ),
      currentIndex: currentRow,
      cellsFromCurrent: (line - rowMiddle(currentRow)) / height,
      bandCells: options.bandRows(),
    });
  });

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
}
