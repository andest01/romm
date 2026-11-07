import { describe, expect, it } from "vitest";
import { LOADED_STEARCH_STATE } from "../../Stearch.fixtures";
import { stearchReducer } from "../../Stearch.reducer";
import type { IStearchState } from "../../Stearch.state-props";
import { selectSectionProps } from "./section.selectors";

const { results, view } = LOADED_STEARCH_STATE;
const STATE: IStearchState = {
  ...LOADED_STEARCH_STATE,
  view: { ...view, visiblePosition: 2 },
  results: {
    ...results,
    ids: [10, 11, 12, 13],
    charIndex: { A: 0, B: 2 },
  },
};

describe("selectSectionProps", () => {
  it("names the section at the top of the list", () => {
    // Act
    const props = selectSectionProps(STATE);

    // Assert
    expect(props).toMatchObject({ label: "B", countLabel: "2 games" });
  });

  it("jumps to the previous section, and has no next on the last", () => {
    // Act
    const props = selectSectionProps(STATE);

    // Assert
    expect(props?.prevActions).toEqual([
      { type: "view/jump", position: 0, isSmooth: true },
    ]);
    expect(props?.nextActions).toBeNull();
  });

  it("is null for a sort without sections", () => {
    // Arrange
    const state = { ...STATE, results: { ...STATE.results, charIndex: {} } };

    // Act
    const props = selectSectionProps(state);

    // Assert
    expect(props).toBeNull();
  });

  it("offers Deselect once its section is selected", () => {
    // Arrange
    const state = stearchReducer(STATE, {
      type: "selection/section",
      start: 2,
      size: 2,
    });

    // Act
    const props = selectSectionProps(state);

    // Assert
    expect(props?.selectLabel).toBe("Deselect");
  });
});

describe("selection/section", () => {
  it("clears a section that is fully selected", () => {
    // Arrange
    const action = { type: "selection/section", start: 2, size: 2 } as const;
    const selected = stearchReducer(STATE, action);

    // Act
    const state = stearchReducer(selected, action);

    // Assert
    expect(state.attention.selectedIds).toEqual([]);
  });
});
