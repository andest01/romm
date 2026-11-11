import { describe, expect, it } from "vitest";
import {
  LEAVE_ACTIONS,
  selectEnterActions,
  selectEnteredPosition,
} from "./attention.selectors";
import type { StearchAction } from "./stearch.actions";
import { INITIAL_STEARCH_STATE, stearchReducer } from "./stearch.reducer";

const apply = (...actions: readonly StearchAction[]) =>
  actions.reduce(stearchReducer, INITIAL_STEARCH_STATE);
const withResults = (ids: number[], activeId: number | null) => ({
  ...INITIAL_STEARCH_STATE,
  results: { ...INITIAL_STEARCH_STATE.results, ids },
  attention: { ...INITIAL_STEARCH_STATE.attention, activeId },
});

describe("selectEnterActions", () => {
  it("does nothing without a current game", () => {
    // Act
    const actions = selectEnterActions(apply());

    // Assert
    expect(actions).toEqual([]);
  });

  it("enters the current game", () => {
    // Arrange
    const state = withResults([4, 7], 7);

    // Act
    const entered = selectEnterActions(state).reduce(stearchReducer, state);

    // Assert
    expect(entered.view.enteredId).toBe(7);
  });
});

describe("selectEnteredPosition", () => {
  it("is null at page level", () => {
    // Act
    const position = selectEnteredPosition(withResults([4, 7], 7));

    // Assert
    expect(position).toBeNull();
  });

  it("finds the entered game, and loses it on leaving", () => {
    // Arrange
    const state = withResults([4, 7], 7);
    const entered = selectEnterActions(state).reduce(stearchReducer, state);

    // Act
    const inside = selectEnteredPosition(entered);
    const outside = selectEnteredPosition(
      LEAVE_ACTIONS.reduce(stearchReducer, entered),
    );

    // Assert
    expect(inside).toBe(1);
    expect(outside).toBeNull();
  });
});

describe("a new search", () => {
  it("leaves the entered game", () => {
    // Arrange
    const entered = apply({ type: "view/set", patch: { enteredId: 7 } });

    // Act
    const next = stearchReducer(entered, {
      type: "window/requested",
      requestId: 1,
    });

    // Assert
    expect(next.view.enteredId).toBeNull();
  });
});
