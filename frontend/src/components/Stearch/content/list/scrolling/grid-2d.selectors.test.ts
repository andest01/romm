import { describe, expect, it } from "vitest";
import {
  axisState,
  canPan,
  centreTarget,
  indexAt,
  isInsideBox,
  isMovingAway,
  mountedSpan,
  moveCell,
  stepsOwed,
  stickVelocity,
} from "./grid-2d.selectors";

const FEEL = {
  deadzone: 0.1,
  minCellsPerSecond: 1,
  maxCellsPerSecond: 11,
  gamma: 1,
};

describe("isMovingAway", () => {
  it("is false for a step heading for the centre", () => {
    // Act
    const isAway = isMovingAway(2, 1, 320, 32);

    // Assert
    expect(isAway).toBe(false);
  });

  it("is true for a step past the centre", () => {
    // Act
    const isAway = isMovingAway(12, 1, 320, 32);

    // Assert
    expect(isAway).toBe(true);
  });
});

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

describe("axisState", () => {
  it("is captured inside the box while the view can pan", () => {
    // Act
    const state = axisState(true, true);

    // Assert
    expect(state).toBe("captured");
  });

  it("is pinned inside the box when the view is at its edge", () => {
    // Act
    const state = axisState(true, false);

    // Assert
    expect(state).toBe("pinned");
  });

  it("is free outside the box", () => {
    // Act
    const state = axisState(false, true);

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
