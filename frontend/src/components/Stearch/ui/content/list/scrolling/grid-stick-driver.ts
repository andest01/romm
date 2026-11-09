import {
  claimKeyRateRepeat,
  claimStickX,
  claimStickY,
  keyRepeatMs,
} from "@/composables/useGamepad";
import type { AxisGeometry } from "../axis-machine";
import type { AxisStore } from "../axis-store";
import { isStickPushed, leadingPoint } from "../list.selectors";
import type { StickDriver } from "../use-stick-driver";
import {
  type Grid2dFeel,
  indexAt,
  pushLength,
  stickVelocity,
  type Vector,
} from "./grid-2d.selectors";

type Axis = "x" | "y";
const AXES = ["y", "x"] as const;

/** The left stick of whichever pad is pushed hardest. */
export function readStick(): Vector {
  let hardest: Vector = { x: 0, y: 0 };
  for (const pad of navigator.getGamepads?.() ?? []) {
    const stick = { x: pad?.axes[0] ?? 0, y: pad?.axes[1] ?? 0 };
    if (pushLength(stick) > pushLength(hardest)) hardest = stick;
  }
  return hardest;
}

/** The analog driver for a 2D grid: one stick, two axes' machines. */
export function createGridStickDriver(options: {
  machines: Record<Axis, AxisStore>;
  feel: () => Grid2dFeel;
  scroller: () => HTMLElement | null;
  cellSize: () => number;
  size: () => { rows: number; cols: number };
  index: (axis: Axis) => number;
  geometry: (axis: Axis) => AxisGeometry;
  deflection: () => Vector;
}): StickDriver {
  const { machines } = options;

  for (const axis of AXES) {
    machines[axis].onEffect((effect) => {
      const element = options.scroller();
      if (effect.type !== "pan" || !element) return;
      const isY = axis === "y";
      const cell = options.cellSize();
      const feel = options.feel();
      const boxCells = isY ? feel.boxRows : feel.boxCols;
      const { rows, cols } = options.size();
      const moved = (effect.cellsPerSecond * cell * effect.frameMs) / 1000;
      if (isY) element.scrollTop += moved;
      else element.scrollLeft += moved;
      const centre = isY
        ? element.scrollTop + element.clientHeight / 2
        : element.scrollLeft + element.clientWidth / 2;
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

  return {
    claim: () => [claimStickX(), claimStickY(), claimKeyRateRepeat()],
    sample(now, frameMs) {
      if (!options.scroller()) return;
      const feel = options.feel();
      const stick = options.deflection();
      const wasPushed = AXES.some(
        (axis) => machines[axis].state.value.phase !== "idle",
      );
      const isPushed = isStickPushed(
        pushLength(stick),
        feel.deadzone,
        wasPushed,
      );
      const velocity = stickVelocity(stick, feel);
      for (const axis of AXES) {
        machines[axis].dispatch({
          type: "stick/sampled",
          isPushed,
          // Per axis, so a true diagonal, short of full on both, never cruises.
          push: Math.abs(stick[axis]),
          cellsPerSecond: velocity[axis],
          keyCellsPerSecond: 1000 / keyRepeatMs(),
          tuning: feel.cruise,
          frameMs,
          now,
          geometry: isPushed
            ? options.geometry(axis)
            : machines[axis].state.value.geometry,
        });
      }
    },
  };
}
