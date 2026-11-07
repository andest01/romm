import { describe, expect, it } from "vitest";
import type { StearchAction } from "../../Stearch.actions";
import { LOADED_STEARCH_STATE } from "../../Stearch.fixtures";
import { INITIAL_STEARCH_STATE } from "../../Stearch.reducer";
import { selectSlots } from "../../Stearch.rows.selectors";
import {
  bandOffsetFor,
  buildScrollRows,
  buildWindowActions,
  itemFit,
  itemKindFor,
  rowForPosition,
  spanOf,
  withGhosts,
} from "./list.selectors";

describe("itemFit", () => {
  it("fits four tiles beside the open panel on a 1920 screen", () => {
    // Act
    const fit = itemFit("tile", { width: 1340 });

    // Assert
    expect(fit).toEqual({ columns: 4, rowHeight: 62 });
  });

  it("caps tiles on a very wide list", () => {
    // Act
    const { columns } = itemFit("tile", { width: 2400 });

    // Assert
    expect(columns).toBe(6);
  });

  it("fits five covers on a 320 phone, sized to the width they get", () => {
    // Act
    const fit = itemFit("phone-cover", { width: 320 });

    // Assert
    expect(fit).toEqual({ columns: 5, rowHeight: 110 });
  });

  it("keeps phone rows to one fixed-height column", () => {
    // Act
    const fit = itemFit("phone-row", { width: 900 });

    // Assert
    expect(fit).toEqual({ columns: 1, rowHeight: 52 });
  });
});

describe("itemKindFor", () => {
  it("shows phone rows for Table on a phone", () => {
    // Act
    const kind = itemKindFor("phone", "table");

    // Assert
    expect(kind).toBe("phone-row");
  });

  it("shows tiles on a wide screen in either view", () => {
    // Act
    const kinds = [itemKindFor("wide", "tiles"), itemKindFor("wide", "table")];

    // Assert
    expect(kinds).toEqual(["tile", "tile"]);
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

  it("has no slots before the total is known", () => {
    // Act
    const slots = selectSlots(INITIAL_STEARCH_STATE);

    // Assert
    expect(slots).toEqual([]);
  });
});

describe("spanOf", () => {
  it("runs from the top row's first result to the bottom row's last", () => {
    // Arrange
    const rows = buildScrollRows(
      Array.from({ length: 20 }, () => null),
      4,
      [],
    );

    // Act
    const span = spanOf({ first: 1, last: 2 }, rows);

    // Assert
    expect(span).toEqual({ first: 4, last: 11 });
  });
});

describe("withGhosts", () => {
  it("fills a screen with ghosts while the first window loads", () => {
    // Act
    const slots = withGhosts([], true, 52);

    // Assert
    expect(slots).toHaveLength(52);
  });

  it("never draws fewer ghosts than the window being fetched", () => {
    // Act
    const slots = withGhosts([], true, 5);

    // Assert
    expect(slots).toHaveLength(48);
  });

  it("draws nothing extra once the total is known", () => {
    // Act
    const slots = withGhosts([], false, 52);

    // Assert
    expect(slots).toEqual([]);
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

describe("buildWindowActions", () => {
  // One result per row, 2,000 results, and a screen of 48: one window each.
  const rows = buildScrollRows(
    Array.from({ length: 2000 }, () => null),
    1,
    [],
  );
  const SCREEN = 48;
  const wanted = (actions: readonly StearchAction[]) =>
    actions.flatMap((action) =>
      action.type === "window/wanted" ? [action.offset] : [],
    );

  it("reports the top of the list", () => {
    // Act
    const [first] = buildWindowActions({ first: 480, last: 489 }, rows, {
      previousPosition: 0,
      itemsPerScreen: SCREEN,
    });

    // Assert
    expect(first).toEqual({
      type: "view/set",
      patch: { visibleSpan: { first: 480, last: 489 } },
    });
  });

  it("scrolling down, wants what's visible, two screens ahead, one behind", () => {
    // Act
    const actions = buildWindowActions({ first: 480, last: 489 }, rows, {
      previousPosition: 0,
      itemsPerScreen: SCREEN,
    });

    // Assert
    expect(wanted(actions)).toEqual([480, 528, 576, 432]);
  });

  it("scrolling up, reads ahead upward instead", () => {
    // Act
    const actions = buildWindowActions({ first: 480, last: 489 }, rows, {
      previousPosition: 1000,
      itemsPerScreen: SCREEN,
    });

    // Assert
    expect(wanted(actions)).toEqual([480, 432, 384, 528]);
  });

  it("stops at the last result", () => {
    // Act
    const actions = buildWindowActions({ first: 1990, last: 1999 }, rows, {
      previousPosition: 0,
      itemsPerScreen: SCREEN,
    });

    // Assert
    expect(wanted(actions)).toEqual([1968, 1920]);
  });
});
