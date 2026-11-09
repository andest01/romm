import { describe, expect, it } from "vitest";
import { INITIAL_STEARCH_STATE } from "../../../store/stearch.reducer";
import {
  buildScrubActions,
  railThumb,
  selectRailProps,
} from "./rail.selectors";

describe("railThumb", () => {
  it("covers the visible share of the list", () => {
    // Act
    const thumb = railThumb({ first: 100, last: 149 }, 1000);

    // Assert
    expect(thumb).toEqual({ start: 0.1, size: 0.05 });
  });

  it("fills the rail when there is nothing to scroll", () => {
    // Act
    const thumb = railThumb({ first: 0, last: 0 }, 0);

    // Assert
    expect(thumb).toEqual({ start: 0, size: 1 });
  });
});

describe("selectRailProps", () => {
  it("sizes buckets from char_index offsets", () => {
    // Arrange
    const state = {
      ...INITIAL_STEARCH_STATE,
      results: {
        ...INITIAL_STEARCH_STATE.results,
        ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        charIndex: { A: 0, C: 5, Z: 8 },
      },
    };

    // Act
    const { buckets } = selectRailProps(state);

    // Assert
    expect(buckets).toMatchObject([
      { key: "A", label: "A", share: 0.5, isCurrent: true, position: 0 },
      { key: "C", label: "C", share: 0.3, isCurrent: false, position: 5 },
      { key: "Z", label: "Z", share: 0.2, isCurrent: false, position: 8 },
    ]);
  });

  it("maps the rail's midpoint to the middle of the list", () => {
    // Act
    const actions = buildScrubActions(0.5, 601);

    // Assert
    expect(actions).toEqual([
      { type: "view/set", patch: { jump: { position: 300, isSmooth: false } } },
    ]);
  });

  it("keeps a drag past the bottom on the last result", () => {
    // Act
    const actions = buildScrubActions(1.4, 601);

    // Assert
    expect(actions).toEqual([
      { type: "view/set", patch: { jump: { position: 600, isSmooth: false } } },
    ]);
  });

  it("has no buckets without an index", () => {
    // Act
    const { buckets } = selectRailProps(INITIAL_STEARCH_STATE);

    // Assert
    expect(buckets).toEqual([]);
  });
});
