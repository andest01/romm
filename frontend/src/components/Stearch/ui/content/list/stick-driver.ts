import { claimStickY, keyRepeatMs } from "@/composables/useGamepad";
import { type AxisGeometry, canPan, isInsideBox } from "./axis-machine";
import type { AxisStore } from "./axis-store";
import { DEFAULT_CRUISE, type ScrollRow, type StickFeel } from "./list.props";
import {
  isStickPushed,
  itemRowAtCentre,
  leadingPoint,
  rowTopOf,
  stickRowsPerSecond,
} from "./list.selectors";
import type { StickDriver } from "./use-stick-driver";

/** The stick Y of whichever pad is pushed hardest. */
export function readStickY(): number {
  let hardest = 0;
  for (const pad of navigator.getGamepads?.() ?? []) {
    const y = pad?.axes[1] ?? 0;
    if (Math.abs(y) > Math.abs(hardest)) hardest = y;
  }
  return hardest;
}

/** The analog driver for a list: stick and scroller to events, pans back. */
export function createListStickDriver(options: {
  machine: AxisStore;
  feel: () => StickFeel | null;
  bandRows: () => number;
  scroller: () => HTMLElement | null;
  rows: () => readonly ScrollRow[];
  rowHeight: () => number;
  headHeight: () => number;
  currentRow: () => number | null;
  /** -1 (up) to 1 (down). A story can stand in for a pad. */
  deflection: () => number;
  onRow: (rowIndex: number) => void;
  onEnd: () => void;
}): StickDriver & { measure: () => void; settle: () => void } {
  const { machine } = options;
  let currentRow = -1;

  const rowAtCentre = (point: number): number =>
    itemRowAtCentre(
      options.rows(),
      point,
      options.rowHeight(),
      options.headHeight(),
    );

  const rowMiddle = (rowIndex: number): number =>
    rowTopOf(
      options.rows(),
      rowIndex,
      options.rowHeight(),
      options.headHeight(),
    ) +
    options.rowHeight() / 2;

  function geometryOf(element: HTMLElement): AxisGeometry {
    const { scrollTop, clientHeight, scrollHeight } = element;
    const centre = scrollTop + clientHeight / 2;
    const height = options.rowHeight();
    currentRow = options.currentRow() ?? rowAtCentre(centre);
    return {
      isInBand: isInsideBox(
        0,
        centre - (rowMiddle(currentRow) - height / 2),
        height,
        options.bandRows(),
      ),
      canPanNegative: canPan(scrollTop, clientHeight, scrollHeight, -1),
      canPanPositive: canPan(scrollTop, clientHeight, scrollHeight, 1),
    };
  }

  machine.onEffect((effect) => {
    if (effect.type === "stickEnded") options.onEnd();
    if (effect.type === "handOver") options.onRow(effect.index);
    if (effect.type !== "pan") return;
    const element = options.scroller();
    if (!element) return;
    const height = options.rowHeight();
    const max = element.scrollHeight - element.clientHeight;
    const moved = (effect.cellsPerSecond * height * effect.frameMs) / 1000;
    element.scrollTop = Math.min(max, Math.max(0, element.scrollTop + moved));
    const line = element.scrollTop + element.clientHeight / 2;
    const band = options.bandRows();
    machine.dispatch({
      type: "view/panned",
      leadingIndex: rowAtCentre(
        leadingPoint(line, band * height, height, effect.cellsPerSecond),
      ),
      currentIndex: currentRow,
      cellsFromCurrent: (line - rowMiddle(currentRow)) / height,
      bandCells: band,
    });
  });

  return {
    claim: () => (options.feel() ? [claimStickY()] : []),
    sample(now, frameMs) {
      const element = options.scroller();
      if (!element) return;
      const feel = options.feel();
      const y = feel ? options.deflection() : 0;
      const wasPushed = machine.state.value.phase !== "idle";
      const isPushed = !!feel && isStickPushed(y, feel.deadzone, wasPushed);
      const common = {
        type: "stick/sampled",
        isPushed,
        frameMs,
        now,
        tuning: feel ? feel.cruise : DEFAULT_CRUISE,
      } as const;
      if (!isPushed) {
        machine.dispatch({
          ...common,
          push: 0,
          cellsPerSecond: 0,
          keyCellsPerSecond: 0,
          geometry: machine.state.value.geometry,
        });
        return;
      }
      machine.dispatch({
        ...common,
        push: Math.abs(y),
        cellsPerSecond: stickRowsPerSecond(y, feel),
        keyCellsPerSecond: 1000 / keyRepeatMs(),
        geometry: geometryOf(element),
      });
    },
    measure() {
      const element = options.scroller();
      if (element) {
        machine.dispatch({
          type: "view/measured",
          geometry: geometryOf(element),
        });
      }
    },
    settle() {
      const element = options.scroller();
      if (element) {
        machine.dispatch({
          type: "view/settled",
          geometry: geometryOf(element),
        });
      }
    },
  };
}
