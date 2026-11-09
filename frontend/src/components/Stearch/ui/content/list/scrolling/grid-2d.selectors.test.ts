import { describe, expect, it } from "vitest";
import {
  axisState,
  canPan,
  cellsPerStep,
  CRUISE_AT_REST,
  isInsideBox,
  KEY_AT_REST,
  nextCruise,
  nextHeldKey,
  stepsOwed,
} from "../axis-machine";
import {
  centreTarget,
  indexAt,
  mountedSpan,
  moveCell,
  stickVelocity,
} from "./grid-2d.selectors";

const FEEL = {
  deadzone: 0.1,
  minCellsPerSecond: 1,
  maxCellsPerSecond: 11,
  gamma: 1,
};

describe("centreTarget", () => {
  it("puts the cell's middle in the middle of the view", () => {
    // Act
    const target = centreTarget({ row: 10, col: 2 }, 32, {
      width: 320,
      height: 200,
    });

    // Assert
    expect(target).toEqual({ x: -80, y: 236 });
  });
});

describe("stickVelocity", () => {
  it("is still inside the radial deadzone", () => {
    // Act
    const velocity = stickVelocity({ x: 0.06, y: 0.06 }, FEEL);

    // Assert
    expect(velocity).toEqual({ x: 0, y: 0 });
  });

  it("is as fast on a diagonal as straight", () => {
    // Act
    const diagonal = stickVelocity({ x: Math.SQRT1_2, y: Math.SQRT1_2 }, FEEL);

    // Assert
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(11);
  });

  it("points where the stick points", () => {
    // Act
    const velocity = stickVelocity({ x: -1, y: 0 }, FEEL);

    // Assert
    expect(velocity).toEqual({ x: -11, y: 0 });
  });
});

describe("indexAt", () => {
  it("finds the cell under a point, clamped to the grid", () => {
    // Act
    const index = indexAt(10_000, 48, 128);

    // Assert
    expect(index).toBe(127);
  });
});

describe("moveCell", () => {
  it("moves one column right", () => {
    // Act
    const cell = moveCell({ row: 3, col: 3 }, "ArrowRight", {
      rows: 128,
      cols: 128,
    });

    // Assert
    expect(cell).toEqual({ row: 3, col: 4 });
  });

  it("stops at the grid's edge", () => {
    // Act
    const cell = moveCell({ row: 0, col: 3 }, "ArrowUp", {
      rows: 128,
      cols: 128,
    });

    // Assert
    expect(cell).toEqual({ row: 0, col: 3 });
  });
});

describe("mountedSpan", () => {
  it("mounts the visible cells and a ring around them", () => {
    // Act
    const span = mountedSpan(480, 1152, 48, 128, 2);

    // Assert
    expect(span).toEqual({ first: 8, last: 36 });
  });
});

describe("nextCruise", () => {
  const STARTED = { ...CRUISE_AT_REST, since: 0 };

  it.each([
    [999, null],
    [1000, 1],
    [2000, 2],
    [3000, 5],
    [9000, 5],
  ])("at %i ms of full push the stack is %s", (now, stack) => {
    // Act
    const cruise = nextCruise(STARTED, 1, now);

    // Assert
    expect(cruise.stack).toBe(stack);
  });

  it.each([
    [0.95, 5],
    [0.8, 2],
    [0.6, 1],
  ])("a maxed stack at %f push is capped to %i", (push, stack) => {
    // Act
    const cruise = nextCruise(STARTED, push, 5000);

    // Assert
    expect(cruise.stack).toBe(stack);
  });

  it("restores the earned stack as soon as the push returns", () => {
    // Arrange
    const eased = nextCruise(STARTED, 0.6, 5000);

    // Act
    const pushed = nextCruise(eased, 1, 5016);

    // Assert
    expect(pushed.stack).toBe(5);
  });

  it("holds a stack within the margin of its threshold", () => {
    // Arrange
    const atFive = nextCruise(STARTED, 1, 5000);

    // Act
    const nearly = nextCruise(atFive, 0.89, 5016);

    // Assert
    expect(nearly.stack).toBe(5);
  });

  it("exits below 40%, and has to earn it again", () => {
    // Act
    const exited = nextCruise(STARTED, 0.3, 5000);

    // Assert
    expect(exited).toEqual(CRUISE_AT_REST);
  });

  it("must hold full push through the first second", () => {
    // Act
    const dropped = nextCruise(STARTED, 0.8, 500);

    // Assert
    expect(dropped).toEqual(CRUISE_AT_REST);
  });
});

describe("nextHeldKey", () => {
  const holdUntil = (end: number) => {
    let held = KEY_AT_REST;
    for (let now = 0; now <= end; now += 100) {
      held = nextHeldKey(held, "ArrowDown", now);
    }
    return held;
  };

  it("earns stacks like a full push", () => {
    // Act
    const held = holdUntil(3000);

    // Assert
    expect(cellsPerStep(held.cruise)).toBe(5);
  });

  it("starts over after a gap", () => {
    // Arrange
    const held = holdUntil(3000);

    // Act
    const pressed = nextHeldKey(held, "ArrowDown", 4000);

    // Assert
    expect(cellsPerStep(pressed.cruise)).toBe(1);
  });

  it("starts over on a different key", () => {
    // Arrange
    const held = holdUntil(3000);

    // Act
    const pressed = nextHeldKey(held, "ArrowUp", 3100);

    // Assert
    expect(pressed.cruise.since).toBe(3100);
  });
});

describe("axisState", () => {
  it("is captured inside the box while the view can pan", () => {
    // Act
    const state = axisState(true, true, false);

    // Assert
    expect(state).toBe("captured");
  });

  it("is pinned inside the box when the view is at its edge", () => {
    // Act
    const state = axisState(true, false, true);

    // Assert
    expect(state).toBe("pinned");
  });

  it("is free outside the box", () => {
    // Act
    const state = axisState(false, true, true);

    // Assert
    expect(state).toBe("free");
  });
});

describe("canPan", () => {
  it("can't pan up from the top", () => {
    // Act
    const can = canPan(0, 500, 4000, -1);

    // Assert
    expect(can).toBe(false);
  });

  it("can't pan down from the bottom", () => {
    // Act
    const can = canPan(3500, 500, 4000, 1);

    // Assert
    expect(can).toBe(false);
  });
});

describe("stepsOwed", () => {
  it("carries part of a step to the next frame", () => {
    // Act
    const owed = stepsOwed(0.5, 10, 75);

    // Assert
    expect(owed.steps).toBe(1);
    expect(owed.carried).toBeCloseTo(0.25);
  });
});

describe("isInsideBox", () => {
  it("knows a cell beside a one-cell box is outside it", () => {
    // Act
    const inside = isInsideBox(13, 12.5 * 40, 40, 1);

    // Assert
    expect(inside).toBe(false);
  });
});
