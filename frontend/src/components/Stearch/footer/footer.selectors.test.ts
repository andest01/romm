import { describe, expect, it } from "vitest";
import { LOADED_STEARCH_STATE } from "../store/fixtures";
import { selectFooterState } from "./footer.selectors";

describe("selectFooterState", () => {
  it("offers select all while results remain unselected", () => {
    // Act
    const { selectAllActions } = selectFooterState(LOADED_STEARCH_STATE);

    // Assert
    expect(selectAllActions).toEqual([
      { type: "selection/add", ids: LOADED_STEARCH_STATE.results.ids },
    ]);
  });

  it("hides select all once everything is selected", () => {
    // Arrange
    const state = {
      ...LOADED_STEARCH_STATE,
      attention: {
        activeId: null,
        selectedIds: LOADED_STEARCH_STATE.results.ids,
      },
    };

    // Act
    const { selectAllActions } = selectFooterState(state);

    // Assert
    expect(selectAllActions).toBeNull();
  });
});
