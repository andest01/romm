import { describe, expect, it } from "vitest";
import { LOADED_STEARCH_STATE } from "../../../store/fixtures";
import { stearchReducer } from "../../../store/stearch.reducer";
import type { IStearchState } from "../../../store/stearch.state-props";
import { selectSectionProps } from "./section.selectors";

const { results, view } = LOADED_STEARCH_STATE;
const STATE: IStearchState = {
  ...LOADED_STEARCH_STATE,
  view: { ...view, visibleSpan: { first: 2, last: 3 } },
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
      { type: "view/set", patch: { jump: { position: 0, isSmooth: true } } },
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

  it("selects the section's games", () => {
    // Act
    const props = selectSectionProps(STATE);

    // Assert
    expect(props?.selectActions).toEqual([
      { type: "selection/add", ids: [12, 13] },
    ]);
  });

  it("offers Deselect once its section is selected", () => {
    // Arrange
    const state = stearchReducer(STATE, {
      type: "selection/add",
      ids: [12, 13],
    });

    // Act
    const props = selectSectionProps(state);

    // Assert
    expect(props).toMatchObject({
      selectLabel: "Deselect",
      selectActions: [{ type: "selection/remove", ids: [12, 13] }],
    });
  });
});
