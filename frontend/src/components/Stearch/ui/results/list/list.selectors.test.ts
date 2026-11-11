import { describe, expect, it } from "vitest";
import { LOADED_STEARCH_STATE } from "../../../store/fixtures";
import { selectSlots } from "../../../store/rows.selectors";
import type { StearchAction } from "../../../store/stearch.actions";
import { INITIAL_STEARCH_STATE } from "../../../store/stearch.reducer";
import type { ScrollRow } from "./list.props";
import {
  activeDescendantId,
  bandOffsetFor,
  buildScrollRows,
  buildWindowActions,
  followScrollTop,
  glideStep,
  isStickPushed,
  itemFit,
  itemKindFor,
  itemRowAtCentre,
  landingOf,
  leadingPoint,
  listSpeed,
  moveFor,
  rowForPosition,
  spanOf,
  stickCurrentRow,
  stickRowsPerSecond,
  withGhosts,
} from "./list.selectors";

describe("activeDescendantId", () => {
  const SLOT = selectSlots(LOADED_STEARCH_STATE)[0] ?? null;
  const ROWS = [
    { kind: "items", key: "a", position: 0, slots: [SLOT, null] },
  ] as const satisfies readonly ScrollRow[];

  it("names a mounted item", () => {
    // Act
    const id = activeDescendantId(ROWS, 0, { first: 0, last: 0 });

    // Assert
    expect(id).toBe("stearch-item-0");
  });

  it("is null on a ghost", () => {
    // Act
    const id = activeDescendantId(ROWS, 1, { first: 0, last: 0 });

    // Assert
    expect(id).toBeNull();
  });

  it("is null for a row that isn't mounted", () => {
    // Act
    const id = activeDescendantId(ROWS, 0, { first: 5, last: 9 });

    // Assert
    expect(id).toBeNull();
  });
});

describe("landingOf", () => {
  const VIEW = { scrollTop: 1000, height: 600 };

  it("is short of the centre for a step heading toward it", () => {
    // Act
    const landing = landingOf(1100, 100, 1, VIEW);

    // Assert
    expect(landing).toEqual({ isInView: true, isPastCentre: false });
  });

  it("is past the centre beyond it", () => {
    // Act
    const landing = landingOf(1400, 100, 1, VIEW);

    // Assert
    expect(landing).toEqual({ isInView: true, isPastCentre: true });
  });

  it("is never past the centre sideways", () => {
    // Act
    const landing = landingOf(1400, 100, 0, VIEW);

    // Assert
    expect(landing.isPastCentre).toBe(false);
  });

  it("knows a row out of view", () => {
    // Act
    const landing = landingOf(5000, 100, 0, VIEW);

    // Assert
    expect(landing.isInView).toBe(false);
  });
});

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

  it("marks every want with the pace it was asked for", () => {
    // Act
    const actions = buildWindowActions({ first: 480, last: 489 }, rows, {
      previousPosition: 0,
      itemsPerScreen: SCREEN,
      pace: "when-still",
      itemsPerSecond: 0,
    });

    // Assert
    const paces = actions.flatMap((action) =>
      action.type === "window/wanted" ? [action.pace] : [],
    );
    expect(new Set(paces)).toEqual(new Set(["when-still"]));
  });

  it("reports the top of the list", () => {
    // Act
    const [first] = buildWindowActions({ first: 480, last: 489 }, rows, {
      previousPosition: 0,
      itemsPerScreen: SCREEN,
      pace: "keep-up",
      itemsPerSecond: 0,
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
      pace: "keep-up",
      itemsPerSecond: 0,
    });

    // Assert
    expect(wanted(actions)).toEqual([480, 528, 576, 432]);
  });

  it("scrolling up, reads ahead upward instead", () => {
    // Act
    const actions = buildWindowActions({ first: 480, last: 489 }, rows, {
      previousPosition: 1000,
      itemsPerScreen: SCREEN,
      pace: "keep-up",
      itemsPerSecond: 0,
    });

    // Assert
    expect(wanted(actions)).toEqual([480, 432, 384, 528]);
  });

  it("stops at the last result", () => {
    // Act
    const actions = buildWindowActions({ first: 1990, last: 1999 }, rows, {
      previousPosition: 0,
      itemsPerScreen: SCREEN,
      pace: "keep-up",
      itemsPerSecond: 0,
    });

    // Assert
    expect(wanted(actions)).toEqual([1968, 1920]);
  });
});

describe("followScrollTop", () => {
  // A 600px viewport over 100 rows of 50px, with a 100px band (rows 250 to 350).
  const view = { scrollTop: 0, height: 600, contentHeight: 5000 };

  it("leaves the scroll alone while the row is inside the band", () => {
    // Act
    const scrollTop = followScrollTop({ top: 250, height: 50 }, view, 100);

    // Assert
    expect(scrollTop).toBe(0);
  });

  it("scrolls down just enough to hold a row at the band's lower edge", () => {
    // Act
    const scrollTop = followScrollTop({ top: 400, height: 50 }, view, 100);

    // Assert
    expect(scrollTop).toBe(100);
  });

  it("scrolls up just enough to hold a row at the band's upper edge", () => {
    // Arrange
    const scrolled = { ...view, scrollTop: 1000 };

    // Act
    const scrollTop = followScrollTop({ top: 1150, height: 50 }, scrolled, 100);

    // Assert
    expect(scrollTop).toBe(900);
  });

  it("never scrolls above the top", () => {
    // Arrange
    const scrolled = { ...view, scrollTop: 100 };

    // Act
    const scrollTop = followScrollTop({ top: 0, height: 50 }, scrolled, 100);

    // Assert
    expect(scrollTop).toBe(0);
  });

  it("never scrolls past the end", () => {
    // Act
    const scrollTop = followScrollTop({ top: 4950, height: 50 }, view, 100);

    // Assert
    expect(scrollTop).toBe(4400);
  });

  it("widens a band smaller than the row to the row", () => {
    // Act
    const scrollTop = followScrollTop({ top: 400, height: 120 }, view, 50);

    // Assert
    expect(scrollTop).toBe(160);
  });
});

describe("moveFor", () => {
  // Two sections, three columns: A holds positions 0..4, B holds 5..10.
  const rows = buildScrollRows(
    Array.from({ length: 11 }, () => null),
    3,
    [
      { key: "A", start: 0, size: 5 },
      { key: "B", start: 5, size: 6 },
    ],
  );

  it("keeps the column moving down across a heading", () => {
    // Act
    const move = moveFor(rows, 4, "ArrowDown");

    // Assert
    expect(move).toEqual({ kind: "move", position: 6 });
  });

  it("clamps to a shorter row's last item", () => {
    // Act
    const move = moveFor(rows, 2, "ArrowDown");

    // Assert
    expect(move).toEqual({ kind: "move", position: 4 });
  });

  it("stays on the last row instead of leaving", () => {
    // Act
    const move = moveFor(rows, 9, "ArrowDown");

    // Assert
    expect(move).toEqual({ kind: "stay" });
  });

  it("stays on the last column instead of leaving", () => {
    // Act
    const move = moveFor(rows, 2, "ArrowRight");

    // Assert
    expect(move).toEqual({ kind: "stay" });
  });

  it("leaves up from the first row", () => {
    // Act
    const move = moveFor(rows, 1, "ArrowUp");

    // Assert
    expect(move).toEqual({ kind: "leave" });
  });

  it("leaves left from the first column", () => {
    // Act
    const move = moveFor(rows, 3, "ArrowLeft");

    // Assert
    expect(move).toEqual({ kind: "leave" });
  });
});

describe("glideStep", () => {
  it("moves in a straight line: halfway at half the time", () => {
    // Act
    const next = glideStep(0, 100, 55, 110);

    // Assert
    expect(next).toBe(50);
  });

  it("stops on the target once the time is up", () => {
    // Act
    const next = glideStep(0, 100, 500, 110);

    // Assert
    expect(next).toBe(100);
  });

  it("is a jump cut when the glide is 0 ms", () => {
    // Act
    const next = glideStep(0, 100, 0, 0);

    // Assert
    expect(next).toBe(100);
  });
});

describe("itemRowAtCentre", () => {
  // Heading A (28px), rows at 28 and 78 (50px), heading B at 128, row at 156.
  const rows = buildScrollRows(
    Array.from({ length: 9 }, () => null),
    3,
    [
      { key: "A", start: 0, size: 6 },
      { key: "B", start: 6, size: 3 },
    ],
  );

  it("finds the item row under the centre line", () => {
    // Act
    const index = itemRowAtCentre(rows, 90, 50, 28);

    // Assert
    expect(index).toBe(2);
  });

  it("takes the next item row when a heading sits on the line", () => {
    // Act
    const index = itemRowAtCentre(rows, 140, 50, 28);

    // Assert
    expect(index).toBe(4);
  });
});

describe("stickRowsPerSecond", () => {
  const stick = {
    deadzone: 0.1,
    minRowsPerSecond: 1,
    maxRowsPerSecond: 11,
    gamma: 1,
  };

  it("is still inside the deadzone", () => {
    // Act
    const speed = stickRowsPerSecond(0.05, stick);

    // Assert
    expect(speed).toBe(0);
  });

  it("runs from the slow to the fast speed across the push", () => {
    // Act
    const speed = stickRowsPerSecond(0.55, stick);

    // Assert
    expect(speed).toBeCloseTo(6);
  });

  it("is negative for an upward push", () => {
    // Act
    const speed = stickRowsPerSecond(-1, stick);

    // Assert
    expect(speed).toBe(-11);
  });

  it("is finer when slow with a gamma above 1", () => {
    // Act
    const speed = stickRowsPerSecond(0.55, { ...stick, gamma: 2 });

    // Assert
    expect(speed).toBeCloseTo(3.5);
  });
});

describe("isStickPushed", () => {
  it("starts only past the deadzone", () => {
    // Act
    const isPushed = isStickPushed(0.09, 0.1, false);

    // Assert
    expect(isPushed).toBe(false);
  });

  it("stays pushed until it falls under 70% of the deadzone", () => {
    // Act
    const isPushed = isStickPushed(0.08, 0.1, true);

    // Assert
    expect(isPushed).toBe(true);
  });
});

describe("leadingPoint", () => {
  it("looks half a cell inside the band's leading edge when moving down", () => {
    // Act
    const point = leadingPoint(500, 5 * 40, 40, 1);

    // Assert
    expect(point).toBe(580);
  });

  it("looks at the other edge when moving up", () => {
    // Act
    const point = leadingPoint(500, 5 * 40, 40, -1);

    // Assert
    expect(point).toBe(420);
  });

  it("is the centre for a one-cell band", () => {
    // Act
    const point = leadingPoint(500, 40, 40, 1);

    // Assert
    expect(point).toBe(500);
  });
});

describe("stickCurrentRow", () => {
  it("keeps the current row while its middle is inside a one-row band", () => {
    // Act
    const row = stickCurrentRow(5, 4, 0.5, 1);

    // Assert
    expect(row).toBe(4);
  });

  it("hands over once the current row's middle leaves the band", () => {
    // Act
    const row = stickCurrentRow(5, 4, 0.51, 1);

    // Assert
    expect(row).toBe(5);
  });

  it("holds longer in a wider band", () => {
    // Act
    const row = stickCurrentRow(5, 4, 0.9, 2);

    // Assert
    expect(row).toBe(4);
  });
});

describe("listSpeed", () => {
  it("is results per second between two sightings", () => {
    // Act
    const speed = listSpeed(
      { position: 100, atMs: 1000 },
      { position: 130, atMs: 1100 },
    );

    // Assert
    expect(speed).toBe(300);
  });

  it("reads a long gap as a new movement, not a slow one", () => {
    // Act
    const speed = listSpeed(
      { position: 100, atMs: 1000 },
      { position: 130, atMs: 5000 },
    );

    // Assert
    expect(speed).toBe(0);
  });
});
