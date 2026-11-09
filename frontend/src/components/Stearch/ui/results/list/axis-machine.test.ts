import { describe, expect, it } from "vitest";
import {
  AXIS_AT_REST,
  type AxisEvent,
  type AxisGeometry,
  type AxisMachineState,
  transition,
} from "./axis-machine";
import { DEFAULT_CRUISE } from "./list.props";

const CAPTURED: AxisGeometry = {
  isInBand: true,
  canPanNegative: true,
  canPanPositive: true,
};
const OUTSIDE: AxisGeometry = { ...CAPTURED, isInBand: false };

const sample = (
  overrides: Partial<Extract<AxisEvent, { type: "stick/sampled" }>>,
): AxisEvent => ({
  type: "stick/sampled",
  isPushed: true,
  push: 0.5,
  cellsPerSecond: 10,
  keyCellsPerSecond: 30,
  tuning: DEFAULT_CRUISE,
  frameMs: 16,
  now: 0,
  geometry: CAPTURED,
  ...overrides,
});

const press = (now: number): AxisEvent => ({
  type: "key/pressed",
  key: "ArrowDown",
  direction: 1,
  now,
  tuning: DEFAULT_CRUISE,
});

const apply = (...events: AxisEvent[]): AxisMachineState =>
  events.reduce((state, event) => transition(state, event).state, AXIS_AT_REST);

describe("transition", () => {
  it("pans a stick when captured", () => {
    // Act
    const { effects } = transition(AXIS_AT_REST, sample({}));

    // Assert
    expect(effects).toEqual([{ type: "pan", cellsPerSecond: 10, frameMs: 16 }]);
  });

  it("steps a stick outside the band", () => {
    // Act
    const { effects } = transition(
      AXIS_AT_REST,
      sample({ geometry: OUTSIDE, frameMs: 100 }),
    );

    // Assert
    expect(effects).toEqual([
      { type: "step", key: null, direction: 1, count: 1 },
    ]);
  });

  it("steps a stick at the view's limit", () => {
    // Act
    const { state } = transition(
      AXIS_AT_REST,
      sample({ geometry: { ...CAPTURED, canPanPositive: false } }),
    );

    // Assert
    expect(state.axis).toBe("pinned");
  });

  it("cruises a stick held at full push for a second", () => {
    // Arrange
    const before = apply(sample({ push: 1, now: 0 }));

    // Act
    const { state } = transition(before, sample({ push: 1, now: 1000 }));

    // Assert
    expect(state.axis).toBe("cruising");
  });

  it("stacks a held key exactly as it stacks the stick", () => {
    // Arrange
    let state = AXIS_AT_REST;
    for (let now = 0; now < 3000; now += 100) {
      state = transition(state, press(now)).state;
    }

    // Act
    const { effects } = transition(state, press(3000));

    // Assert
    expect(effects).toContainEqual({
      type: "step",
      key: "ArrowDown",
      direction: 1,
      count: 5,
    });
  });

  it("makes a key press yield the stick until it's let go", () => {
    // Arrange
    const pressed = apply(sample({}), press(0));

    // Act
    const { effects, state } = transition(pressed, sample({}));

    // Assert
    expect([state.phase, effects]).toEqual(["yielded", []]);
  });

  it("ends every cruise when focus truly leaves", () => {
    // Arrange
    const cruising = apply(
      sample({ push: 1, now: 0 }),
      sample({ push: 1, now: 1000 }),
    );

    // Act
    const { effects } = transition(cruising, { type: "focus/left" });

    // Assert
    expect(effects).toEqual([{ type: "stack", stack: null }]);
  });

  it.each([
    [true, false, false],
    [true, true, true],
    [false, false, true],
  ])(
    "a landing in view %s, past the centre %s, follows: %s",
    (isInView, isPastCentre, follows) => {
      // Act
      const { effects } = transition(AXIS_AT_REST, {
        type: "step/landed",
        index: 4,
        isInView,
        isPastCentre,
      });

      // Assert
      expect(effects.length > 0).toBe(follows);
    },
  );

  it("hands over once the active row leaves the band", () => {
    // Act
    const { effects } = transition(AXIS_AT_REST, {
      type: "view/panned",
      leadingIndex: 6,
      currentIndex: 5,
      cellsFromCurrent: 0.6,
      bandCells: 1,
    });

    // Assert
    expect(effects).toEqual([{ type: "handOver", index: 6 }]);
  });

  it("a command flies and activates, in one event", () => {
    // Act
    const { state, effects } = transition(AXIS_AT_REST, {
      type: "navigate/started",
      index: 64,
    });

    // Assert
    expect([state.axis, effects]).toEqual([
      "flying",
      [{ type: "activate", index: 64 }, { type: "fly" }],
    ]);
  });

  it("stays flying until the cell reaches the band", () => {
    // Arrange
    const flying = apply({ type: "navigate/started", index: 64 });

    // Act
    const passing = transition(flying, {
      type: "view/measured",
      geometry: OUTSIDE,
    });
    const arrived = transition(flying, {
      type: "view/measured",
      geometry: CAPTURED,
    });

    // Assert
    expect([passing.state.axis, arrived.state.axis]).toEqual([
      "flying",
      "captured",
    ]);
  });

  it("settles a flight that can't reach the band, like a corner", () => {
    // Arrange
    const flying = apply({ type: "navigate/started", index: 0 });

    // Act
    const { state } = transition(flying, {
      type: "view/settled",
      geometry: OUTSIDE,
    });

    // Assert
    expect([state.axis, state.isFlying]).toEqual(["free", false]);
  });

  it("ends a flight on any key", () => {
    // Arrange
    const flying = apply({ type: "navigate/started", index: 64 });

    // Act
    const { state } = transition(flying, press(0));

    // Assert
    expect(state.isFlying).toBe(false);
  });

  it("drops to free when the wheel moves the view away", () => {
    // Arrange
    const captured = apply({ type: "view/measured", geometry: CAPTURED });

    // Act
    const { state } = transition(captured, {
      type: "view/measured",
      geometry: OUTSIDE,
    });

    // Assert
    expect(state.axis).toBe("free");
  });

  it("earns stacks at the tuned speed", () => {
    // Arrange
    const tuning = { ...DEFAULT_CRUISE, stackMs: 100 };
    const before = apply(sample({ push: 1, now: 0, tuning }));

    // Act
    const { state } = transition(before, sample({ push: 1, now: 300, tuning }));

    // Assert
    expect(state.cruise.stack).toBe(5);
  });

  it("does nothing, identically, for an idle stick", () => {
    // Act
    const { state } = transition(AXIS_AT_REST, sample({ isPushed: false }));

    // Assert
    expect(state).toBe(AXIS_AT_REST);
  });
});
