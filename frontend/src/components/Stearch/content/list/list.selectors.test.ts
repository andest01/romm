import { describe, expect, it } from "vitest";
import { LOADED_STEARCH_STATE } from "../../Stearch.fixtures";
import { INITIAL_STEARCH_STATE } from "../../Stearch.reducer";
import { selectSlots } from "../../Stearch.rows.selectors";
import {
  bandOffsetFor,
  buildScrollRows,
  buildWindowActions,
  columnsFor,
  rowForPosition,
  rowHeightFor,
} from "./list.selectors";

describe("rowHeightFor", () => {
  it("grows phone covers with the list's width", () => {
    // Act
    const height = rowHeightFor("phone-cover", 524);

    // Assert
    expect(height).toBe(171);
  });

  it("keeps a fixed height for other items", () => {
    // Act
    const height = rowHeightFor("phone-row", 524);

    // Assert
    expect(height).toBe(52);
  });
});

describe("selectSlots", () => {
  it("has one slot per result, with unloaded positions as null", () => {
    // Act
    const slots = selectSlots(LOADED_STEARCH_STATE);

    // Assert
    expect(slots).toHaveLength(1000);
    expect(slots[47]).not.toBeNull();
    expect(slots[48]).toBeNull();
  });

  it("has only null slots before anything loads", () => {
    // Act
    const slots = selectSlots(INITIAL_STEARCH_STATE);

    // Assert
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((slot) => slot === null)).toBe(true);
  });
});

describe("buildScrollRows", () => {
  it("groups slots into rows, keeping a short last row", () => {
    // Arrange
    const slots = [null, null, null];

    // Act
    const rows = buildScrollRows(slots, 2, []);

    // Assert
    expect(rows.map(({ position }) => position)).toEqual([0, 2]);
  });

  it("starts each section with a heading and a fresh row", () => {
    // Arrange
    const slots = [null, null, null];
    const sections = [
      { key: "A", start: 0, size: 1 },
      { key: "B", start: 1, size: 2 },
    ];

    // Act
    const rows = buildScrollRows(slots, 2, sections);

    // Assert
    expect(rows.map(({ key }) => key)).toEqual([
      "head-A",
      "items-0",
      "head-B",
      "items-1",
    ]);
  });
});

describe("rowForPosition", () => {
  it("lands on a section's heading", () => {
    // Arrange
    const rows = buildScrollRows([null, null], 1, [
      { key: "A", start: 0, size: 1 },
      { key: "B", start: 1, size: 1 },
    ]);

    // Act
    const index = rowForPosition(rows, 1);

    // Assert
    expect(rows[index]?.kind).toBe("head");
  });
});

describe("bandOffsetFor", () => {
  it("rests while the next heading is far away", () => {
    // Act
    const offset = bandOffsetFor([500], 100, 28);

    // Assert
    expect(offset).toBe(0);
  });

  it("is pushed up by an arriving heading", () => {
    // Act
    const offset = bandOffsetFor([500], 490, 28);

    // Assert
    expect(offset).toBe(-18);
  });
});

describe("columnsFor", () => {
  it("drops a tile column while the panel shows", () => {
    // Act
    const columns = columnsFor("tile", true);

    // Assert
    expect(columns).toBe(3);
  });

  it("keeps phone covers at five columns", () => {
    // Act
    const columns = columnsFor("phone-cover", true);

    // Assert
    expect(columns).toBe(5);
  });
});

describe("buildWindowActions", () => {
  it("wants every window the visible rows touch", () => {
    // Arrange
    const range = { first: 10, last: 14 };
    const rows = buildScrollRows(
      Array.from({ length: 80 }, () => null),
      4,
      [],
    );

    // Act
    const actions = buildWindowActions(range, rows);

    // Assert
    expect(actions).toEqual([
      { type: "view/set", patch: { visiblePosition: 40 } },
      { type: "window/wanted", offset: 0 },
      { type: "window/wanted", offset: 48 },
    ]);
  });
});
