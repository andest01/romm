import { useRafFn } from "@vueuse/core";
import { onBeforeUnmount, onMounted } from "vue";
import {
  claimKeyRateRepeat,
  claimStickX,
  claimStickY,
  usePadRafFn,
} from "@/composables/useGamepad";
import {
  isStickPushed,
  leadingPoint,
  stickCurrentRow,
} from "../list.selectors";
import {
  axisMode,
  axisState,
  canPan,
  type Cell,
  type Grid2dFeel,
  indexAt,
  isInsideBox,
  pushLength,
  stepsOwed,
  stickVelocity,
  type Vector,
} from "./grid-2d.selectors";

/** Frames longer than this (a stall, a hidden tab) don't jump the scroll. */
const MAX_FRAME_MS = 50;

type StepKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

/** The D-pad key a step sends, by axis, for -1 and +1. */
const STEP_KEYS = {
  x: ["ArrowLeft", "ArrowRight"],
  y: ["ArrowUp", "ArrowDown"],
} as const satisfies Record<"x" | "y", readonly [StepKey, StepKey]>;

interface AxisGeometry {
  cell: number;
  boxCells: number;
  count: number;
  index: number;
}

/** The left stick of whichever pad is pushed hardest. */
export function readStick(): Vector {
  let hardest: Vector = { x: 0, y: 0 };
  for (const pad of navigator.getGamepads?.() ?? []) {
    const stick = { x: pad?.axes[0] ?? 0, y: pad?.axes[1] ?? 0 };
    if (pushLength(stick) > pushLength(hardest)) hardest = stick;
  }
  return hardest;
}

/** The left stick pans a 2D grid (spec 009). The view leads; on each axis
 *  the active cell hands over once its middle leaves the centre box, which
 *  is `stickCurrentRow` from the list, run per axis. Letting go leaves the
 *  view where it is. While mounted, the stick sends no arrow keys. */
export function useStickScroll2d(options: {
  feel: () => Grid2dFeel;
  scroller: () => HTMLElement | null;
  cellSize: () => number;
  size: () => { rows: number; cols: number };
  current: () => Cell;
  deflection: () => Vector;
  /** A step the stick sends where it can't pan: handled exactly as the
   *  D-pad's arrow key. */
  onStep: (key: StepKey) => void;
  /** "pad" runs only while a pad is connected; "always" lets a story drive
   *  it without one. */
  loop: "pad" | "always";
  onCell: (cell: Cell) => void;
}) {
  let isActive = false;
  let isHandedOver = false;
  let lastFrame = 0;
  // Part of a step owed on each axis, carried between frames in step mode.
  const carried = { x: 0, y: 0 };

  function frame(): void {
    const now = performance.now();
    const frameMs = Math.min(now - lastFrame, MAX_FRAME_MS);
    lastFrame = now;
    const element = options.scroller();
    if (!element) return;
    const feel = options.feel();
    const stick = options.deflection();
    const isPushed = isStickPushed(
      pushLength(stick),
      feel.deadzone,
      isActive || isHandedOver,
    );
    if (!isPushed) {
      isActive = false;
      isHandedOver = false;
      return;
    }
    // Another input took over mid-push: wait for the stick to come back.
    if (isHandedOver) return;
    isActive = true;
    const cell = options.cellSize();
    const velocity = stickVelocity(stick, feel);
    const { rows, cols } = options.size();
    const y = runAxis(element, "y", velocity.y, frameMs, {
      cell,
      boxCells: feel.boxRows,
      count: rows,
      index: options.current().row,
    });
    const x = runAxis(element, "x", velocity.x, frameMs, {
      cell,
      boxCells: feel.boxCols,
      count: cols,
      index: options.current().col,
    });
    const current = options.current();
    const next: Cell = { row: y, col: x };
    if (next.row !== current.row || next.col !== current.col) {
      options.onCell(next);
    }
  }

  // One axis, one frame: work out its state, then pan the view or send
  // D-pad steps. Returns the active index on this axis.
  function runAxis(
    element: HTMLElement,
    axis: "x" | "y",
    speed: number,
    frameMs: number,
    { cell, boxCells, count, index }: AxisGeometry,
  ): number {
    const isY = axis === "y";
    const view = isY ? element.clientHeight : element.clientWidth;
    const content = isY ? element.scrollHeight : element.scrollWidth;
    const scroll = () => (isY ? element.scrollTop : element.scrollLeft);
    const centre = () => scroll() + view / 2;
    const direction = Math.sign(speed);
    const state = axisState(
      isInsideBox(index, centre(), cell, boxCells),
      canPan(scroll(), view, content, direction),
    );
    if (direction === 0) return index;
    if (axisMode(state) === "step") {
      const owed = stepsOwed(carried[axis], speed, frameMs);
      carried[axis] = owed.carried;
      const key = STEP_KEYS[axis][direction > 0 ? 1 : 0];
      for (let step = 0; step < owed.steps; step++) options.onStep(key);
      return isY ? options.current().row : options.current().col;
    }
    carried[axis] = 0;
    const moved = scroll() + (speed * cell * frameMs) / 1000;
    if (isY) element.scrollTop = moved;
    else element.scrollLeft = moved;
    return stickCurrentRow(
      indexAt(
        leadingPoint(centre(), boxCells * cell, cell, speed),
        cell,
        count,
      ),
      index,
      (centre() - (index + 0.5) * cell) / cell,
      boxCells,
    );
  }
  if (options.loop === "pad") usePadRafFn(frame);
  else useRafFn(frame);

  const releases: (() => void)[] = [];
  onMounted(() =>
    releases.push(claimStickX(), claimStickY(), claimKeyRateRepeat()),
  );
  onBeforeUnmount(() => releases.splice(0).forEach((release) => release()));

  /** Another input took over (a D-pad press): stand down until let go. */
  const cancel = (): void => {
    if (!isActive) return;
    isActive = false;
    isHandedOver = true;
  };

  return { cancel, isActive: () => isActive };
}
