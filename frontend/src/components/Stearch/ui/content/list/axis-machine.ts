// The input state machine for one axis (specs 009, 010): `transition` takes a
// state and an event and returns the next state and effects. The list runs it
// once; the 2D grid runs it per axis.
import { type Handlers, reducerOf } from "../../../store/stearch.actions";
import { type ArrowKey, stickCurrentRow } from "./list.selectors";

/** Where the active cell stands on one axis, against the band and the view.
 *  - `captured`: inside the band, and the view can move the way the stick
 *    pushes. The stick pans; the active cell hands over at the leading edge.
 *  - `pinned`: inside the band, but the view is at its limit that way, so it
 *    can't pan. The cell escapes the band by steps.
 *  - `free`: outside the band (a corner, or a mouse click far away). The
 *    cell walks by steps, and is captured again once it's back in the band.
 *  - `cruising`: captured, with the stick held at full push. Steps replace
 *    the pan, so the view follows the cell like a held key. */
export type AxisState = "captured" | "pinned" | "free" | "cruising" | "flying";

/** What the stick does on an axis in that state: move the view, or send
 *  steps exactly as a D-pad press would. */
export type AxisMode = "pan" | "step";

export const axisState = (
  isInsideBox: boolean,
  canPanToward: boolean,
  isCruising: boolean,
): AxisState => {
  if (!isInsideBox) return "free";
  if (!canPanToward) return "pinned";
  return isCruising ? "cruising" : "captured";
};

const CRUISE = {
  enterAt: 0.95,
  exitAt: 0.4,
  stackMs: 1000,
  /** A push at or above these caps the stack at 5x, then 2x. */
  capAt: { five: 0.9, two: 0.75 },
  /** Keeps a stick resting on a threshold from buzzing between stacks. */
  margin: 0.02,
} as const;

/** Rows each cruise step moves. */
export type CruiseStack = 1 | 2 | 5;

export interface Cruise {
  /** When the full push began; `null` is not cruising. Canceling is this. */
  since: number | null;
  /** The push's limit on the stack, remembered only for the margin. */
  cap: CruiseStack;
  /** The stack in force; `null` until the first one is earned. */
  stack: CruiseStack | null;
}

export const CRUISE_AT_REST: Cruise = { since: null, cap: 5, stack: null };

const lower = (a: CruiseStack, b: CruiseStack): CruiseStack => (a < b ? a : b);
const higher = (a: CruiseStack, b: CruiseStack): CruiseStack => (a > b ? a : b);

function capFor(push: number, previous: CruiseStack): CruiseStack {
  const capWith = (margin: number): CruiseStack => {
    if (push >= CRUISE.capAt.five - margin) return 5;
    return push >= CRUISE.capAt.two - margin ? 2 : 1;
  };
  return higher(capWith(0), lower(capWith(CRUISE.margin), previous));
}

/** Rows or cells one step moves, whatever input is driving it. */
export const cellsPerStep = ({ stack }: Cruise): CruiseStack => stack ?? 1;

/** Longest gap between a held key's repeats. A D-pad's first is 350 ms. */
const HELD_KEY_GAP_MS = 600;

export interface HeldKey {
  key: string | null;
  at: number;
  cruise: Cruise;
}

export const KEY_AT_REST: HeldKey = {
  key: null,
  at: 0,
  cruise: CRUISE_AT_REST,
};

/** A held key or D-pad is a full push, so it earns stacks like the stick. */
export function nextHeldKey(
  previous: HeldKey,
  key: string,
  now: number,
): HeldKey {
  const isSameHold =
    previous.key === key && now - previous.at < HELD_KEY_GAP_MS;
  return {
    key,
    at: now,
    cruise: nextCruise(isSameHold ? previous.cruise : CRUISE_AT_REST, 1, now),
  };
}

/** Time earns the stack, a step per `stackMs`; the push caps it, so pushing
 *  back up restores it at once. Only dropping below `exitAt` loses it. */
export function nextCruise(
  previous: Cruise,
  push: number,
  now: number,
): Cruise {
  const since = previous.since ?? (push >= CRUISE.enterAt ? now : null);
  if (since === null) return CRUISE_AT_REST;
  const stacksEarned = Math.floor((now - since) / CRUISE.stackMs);
  if (stacksEarned < 1) {
    return push >= CRUISE.enterAt
      ? { ...CRUISE_AT_REST, since }
      : CRUISE_AT_REST;
  }
  if (push < CRUISE.exitAt) return CRUISE_AT_REST;
  const cap = capFor(push, previous.cap);
  const earned: CruiseStack =
    stacksEarned >= 3 ? 5 : stacksEarned === 2 ? 2 : 1;
  return { since, cap, stack: lower(earned, cap) };
}

export const axisMode = (state: AxisState): AxisMode =>
  state === "captured" ? "pan" : "step";

/** Whether a cell's middle is inside the band on one axis. */
export const isInsideBox = (
  index: number,
  centre: number,
  cellSize: number,
  boxCells: number,
): boolean =>
  Math.abs(centre - (index + 0.5) * cellSize) <= (boxCells * cellSize) / 2;

/** Whether the view can move further that way on one axis. */
export const canPan = (
  scroll: number,
  view: number,
  content: number,
  direction: number,
): boolean =>
  direction > 0 ? scroll < content - view - 0.5 : direction < 0 && scroll > 0.5;

/** Steps owed by a stick in step mode: speed accumulates, and each whole
 *  cell is one step, so a bigger push steps faster. */
export const stepsOwed = (
  carried: number,
  cellsPerSecond: number,
  frameMs: number,
): { steps: number; carried: number } => {
  const total = carried + (Math.abs(cellsPerSecond) * frameMs) / 1000;
  const steps = Math.floor(total);
  return { steps, carried: total - steps };
};

/** The DOM's answer to "where is the active cell on this axis?" */
export interface AxisGeometry {
  isInBand: boolean;
  canPanNegative: boolean;
  canPanPositive: boolean;
}

export interface AxisMachineState {
  /** The stick's engagement. `yielded` ignores it until it's let go. */
  phase: "idle" | "active" | "yielded";
  axis: AxisState;
  geometry: AxisGeometry;
  /** The way this axis last moved. */
  direction: -1 | 1;
  carried: number;
  cruise: Cruise;
  heldKey: HeldKey;
  /** A commanded move is under way; any input ends it. */
  isFlying: boolean;
}

export const AXIS_AT_REST: AxisMachineState = {
  phase: "idle",
  axis: "free",
  geometry: { isInBand: false, canPanNegative: false, canPanPositive: true },
  direction: 1,
  carried: 0,
  cruise: CRUISE_AT_REST,
  heldKey: KEY_AT_REST,
  isFlying: false,
};

/** Everything that can happen to an axis. Inputs and the DOM only send these. */
export type AxisEvent =
  | {
      type: "stick/sampled";
      isPushed: boolean;
      push: number;
      cellsPerSecond: number;
      keyCellsPerSecond: number;
      frameMs: number;
      now: number;
      geometry: AxisGeometry;
    }
  | { type: "stick/yielded" }
  | { type: "navigate/started"; index: number }
  | { type: "view/settled"; geometry: AxisGeometry }
  | { type: "key/pressed"; key: ArrowKey; direction: -1 | 0 | 1; now: number }
  | { type: "key/released" }
  | { type: "focus/left" }
  | {
      type: "step/landed";
      index: number;
      isInView: boolean;
      isPastCentre: boolean;
    }
  | {
      type: "view/panned";
      leadingIndex: number;
      currentIndex: number;
      cellsFromCurrent: number;
      bandCells: number;
    }
  | { type: "view/measured"; geometry: AxisGeometry };

/** What the machine asks for. Adapters carry these out and report back. */
export type AxisEffect =
  | { type: "pan"; cellsPerSecond: number; frameMs: number }
  | {
      type: "step";
      /** `null` is the stick: it never leaves the grid. */
      key: ArrowKey | null;
      direction: -1 | 0 | 1;
      count: number;
    }
  | { type: "activate"; index: number }
  | { type: "fly" }
  | { type: "follow"; index: number }
  | { type: "handOver"; index: number }
  | { type: "stack"; stack: CruiseStack | null }
  | { type: "stickEnded" };

interface AxisResult {
  state: AxisMachineState;
  effects: readonly AxisEffect[];
}

const stackOf = ({ heldKey, cruise }: AxisMachineState): CruiseStack | null =>
  heldKey.cruise.stack ?? cruise.stack;

function resolved(
  previous: AxisMachineState,
  state: AxisMachineState,
  effects: readonly AxisEffect[] = [],
): AxisResult {
  const stack = stackOf(state);
  return {
    state,
    effects:
      stack === stackOf(previous)
        ? effects
        : [{ type: "stack", stack }, ...effects],
  };
}

function axisFor(
  { isInBand, canPanNegative, canPanPositive }: AxisGeometry,
  direction: -1 | 1,
  cruise: Cruise,
): AxisState {
  const canPanToward = direction > 0 ? canPanPositive : canPanNegative;
  return axisState(isInBand, canPanToward, cruise.stack !== null);
}

const yielded = (state: AxisMachineState): AxisMachineState => ({
  ...state,
  phase: state.phase === "active" ? "yielded" : state.phase,
  cruise: CRUISE_AT_REST,
  carried: 0,
  isFlying: false,
});

const HANDLERS: Handlers<AxisResult, AxisEvent> = {
  "stick/sampled": ({ state }, event) => {
    if (!event.isPushed) {
      if (state.phase === "idle" && state.cruise === CRUISE_AT_REST) {
        return { state, effects: [] };
      }
      const wasActive = state.phase === "active";
      return resolved(
        state,
        { ...state, phase: "idle", cruise: CRUISE_AT_REST, carried: 0 },
        wasActive ? [{ type: "stickEnded" }] : [],
      );
    }
    if (state.phase === "yielded") return { state, effects: [] };
    const cruise = nextCruise(state.cruise, event.push, event.now);
    const sign = Math.sign(event.cellsPerSecond);
    const direction = sign > 0 ? 1 : sign < 0 ? -1 : state.direction;
    const axis = axisFor(event.geometry, direction, cruise);
    const next: AxisMachineState = {
      ...state,
      phase: "active",
      geometry: event.geometry,
      axis,
      direction,
      cruise,
      isFlying: false,
    };
    if (sign === 0) return resolved(state, next);
    if (axisMode(axis) === "pan") {
      return resolved(state, { ...next, carried: 0 }, [
        {
          type: "pan",
          cellsPerSecond: event.cellsPerSecond,
          frameMs: event.frameMs,
        },
      ]);
    }
    const rate =
      axis === "cruising" ? event.keyCellsPerSecond : event.cellsPerSecond;
    const owed = stepsOwed(state.carried, rate, event.frameMs);
    const count = owed.steps * cellsPerStep(cruise);
    return resolved(
      state,
      { ...next, carried: owed.carried },
      count > 0 ? [{ type: "step", key: null, direction, count }] : [],
    );
  },
  "stick/yielded": ({ state }) => resolved(state, yielded(state)),
  "navigate/started": ({ state }, { index }) => ({
    state: { ...yielded(state), isFlying: true, axis: "flying" },
    effects: [{ type: "activate", index }, { type: "fly" }],
  }),
  "view/settled": ({ state }, { geometry }) => ({
    state: {
      ...state,
      geometry,
      isFlying: false,
      axis: axisFor(geometry, state.direction, state.cruise),
    },
    effects: [],
  }),
  "key/pressed": ({ state }, { key, direction, now }) => {
    const heldKey = nextHeldKey(state.heldKey, key, now);
    const next = { ...yielded(state), heldKey };
    return resolved(state, next, [
      { type: "step", key, direction, count: cellsPerStep(heldKey.cruise) },
    ]);
  },
  "key/released": ({ state }) =>
    resolved(state, { ...state, heldKey: KEY_AT_REST }),
  "focus/left": ({ state }) =>
    resolved(state, {
      ...state,
      cruise: CRUISE_AT_REST,
      heldKey: KEY_AT_REST,
    }),
  "step/landed": ({ state }, { index, isInView, isPastCentre }) => ({
    state,
    effects: !isInView || isPastCentre ? [{ type: "follow", index }] : [],
  }),
  "view/panned": ({ state }, event) => {
    const next = stickCurrentRow(
      event.leadingIndex,
      event.currentIndex,
      event.cellsFromCurrent,
      event.bandCells,
    );
    return {
      state,
      effects:
        next !== event.currentIndex && next !== -1
          ? [{ type: "handOver", index: next }]
          : [],
    };
  },
  "view/measured": ({ state }, { geometry }) => {
    if (state.isFlying && !geometry.isInBand) return { state, effects: [] };
    const axis = axisFor(geometry, state.direction, state.cruise);
    if (state.isFlying) {
      return {
        state: { ...state, geometry, axis, isFlying: false },
        effects: [],
      };
    }
    return {
      state:
        axis === state.axis &&
        geometry.isInBand === state.geometry.isInBand &&
        geometry.canPanNegative === state.geometry.canPanNegative &&
        geometry.canPanPositive === state.geometry.canPanPositive
          ? state
          : { ...state, geometry, axis },
      effects: [],
    };
  },
};

const reduce = reducerOf(HANDLERS);

/** The machine: every input's behaviour is a case in this one function. */
export const transition = (
  state: AxisMachineState,
  event: AxisEvent,
): AxisResult => reduce({ state, effects: [] }, event);
