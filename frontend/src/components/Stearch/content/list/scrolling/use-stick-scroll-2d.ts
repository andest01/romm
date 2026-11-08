import { useRafFn } from "@vueuse/core";
import { onBeforeUnmount, onMounted } from "vue";
import {
  claimKeyRateRepeat,
  claimStickX,
  claimStickY,
  keyRepeatMs,
  usePadRafFn,
} from "@/composables/useGamepad";
import type { AxisGeometry } from "../axis-machine";
import { isStickPushed, leadingPoint } from "../list.selectors";
import type { AxisMachine } from "../use-axis-machine";
import {
  type Grid2dFeel,
  indexAt,
  pushLength,
  stickVelocity,
  type Vector,
} from "./grid-2d.selectors";

/** Frames longer than this (a stall, a hidden tab) don't jump the scroll. */
const MAX_FRAME_MS = 50;

type Axis = "x" | "y";

/** The left stick of whichever pad is pushed hardest. */
export function readStick(): Vector {
  let hardest: Vector = { x: 0, y: 0 };
  for (const pad of navigator.getGamepads?.() ?? []) {
    const stick = { x: pad?.axes[0] ?? 0, y: pad?.axes[1] ?? 0 };
    if (pushLength(stick) > pushLength(hardest)) hardest = stick;
  }
  return hardest;
}

/** The left stick's adapter for a 2D grid: samples it each frame into both
 *  axes' machines, and carries out their pans. While mounted, the stick
 *  sends no arrow keys. */
export function useStickScroll2d(options: {
  machines: Record<Axis, AxisMachine>;
  feel: () => Grid2dFeel;
  scroller: () => HTMLElement | null;
  cellSize: () => number;
  size: () => { rows: number; cols: number };
  index: (axis: Axis) => number;
  geometry: (axis: Axis) => AxisGeometry;
  deflection: () => Vector;
  /** "pad" runs only while a pad is connected; "always" lets a story drive
   *  it without one. */
  loop: "pad" | "always";
}) {
  const { machines } = options;
  let lastFrame = 0;

  function frame(): void {
    if (!options.scroller()) return;
    const now = performance.now();
    const frameMs = Math.min(now - lastFrame, MAX_FRAME_MS);
    lastFrame = now;
    const feel = options.feel();
    const stick = options.deflection();
    const wasPushed = (["x", "y"] as const).some(
      (axis) => machines[axis].state.value.phase !== "idle",
    );
    const isPushed = isStickPushed(pushLength(stick), feel.deadzone, wasPushed);
    const velocity = stickVelocity(stick, feel);
    for (const axis of ["y", "x"] as const) {
      machines[axis].dispatch({
        type: "stick/sampled",
        isPushed,
        // Per axis, so a true diagonal, short of full on both, never cruises.
        push: Math.abs(stick[axis]),
        cellsPerSecond: velocity[axis],
        keyCellsPerSecond: 1000 / keyRepeatMs(),
        frameMs,
        now,
        geometry: isPushed
          ? options.geometry(axis)
          : machines[axis].state.value.geometry,
      });
    }
  }

  for (const axis of ["y", "x"] as const) {
    machines[axis].onEffect((effect) => {
      if (effect.type !== "pan") return;
      const element = options.scroller();
      if (!element) return;
      const isY = axis === "y";
      const cell = options.cellSize();
      const feel = options.feel();
      const boxCells = isY ? feel.boxRows : feel.boxCols;
      const { rows, cols } = options.size();
      const moved = (effect.cellsPerSecond * cell * effect.frameMs) / 1000;
      if (isY) element.scrollTop += moved;
      else element.scrollLeft += moved;
      const scroll = isY ? element.scrollTop : element.scrollLeft;
      const view = isY ? element.clientHeight : element.clientWidth;
      const centre = scroll + view / 2;
      const index = options.index(axis);
      machines[axis].dispatch({
        type: "view/panned",
        leadingIndex: indexAt(
          leadingPoint(centre, boxCells * cell, cell, effect.cellsPerSecond),
          cell,
          isY ? rows : cols,
        ),
        currentIndex: index,
        cellsFromCurrent: (centre - (index + 0.5) * cell) / cell,
        bandCells: boxCells,
      });
    });
  }

  if (options.loop === "pad") usePadRafFn(frame);
  else useRafFn(frame);

  const releases: (() => void)[] = [];
  onMounted(() =>
    releases.push(claimStickX(), claimStickY(), claimKeyRateRepeat()),
  );
  onBeforeUnmount(() => releases.splice(0).forEach((release) => release()));
}
