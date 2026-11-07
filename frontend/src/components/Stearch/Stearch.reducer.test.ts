import { describe, expect, it } from "vitest";
import type { StearchAction } from "./Stearch.actions";
import { LOADED_STEARCH_STATE } from "./Stearch.fixtures";
import { selectClearActions } from "./Stearch.query.selectors";
import {
  INITIAL_QUERY,
  INITIAL_STEARCH_STATE as INITIAL,
  stearchReducer,
} from "./Stearch.reducer";
import type { IStearchState, StearchPage } from "./Stearch.state-props";

/** Folds actions into a state, the same way `dispatch` does. */
const apply = (state: IStearchState, ...actions: readonly StearchAction[]) =>
  actions.reduce(stearchReducer, state);

const page: StearchPage = {
  items: [],
  total: 0,
  char_index: {},
  rom_id_index: [],
  filter_values: INITIAL.results.filterValues,
};
const USA: StearchAction = {
  type: "query/add",
  key: "selectedRegions",
  value: "USA",
};
const ZELDA: StearchAction = {
  type: "query/set",
  patch: { searchTerm: "zelda" },
};
const pick = (...ids: number[]): StearchAction => ({
  type: "selection/add",
  ids,
});
const unpick = (...ids: number[]): StearchAction => ({
  type: "selection/remove",
  ids,
});
const requested = (requestId: number): StearchAction => ({
  type: "window/requested",
  requestId,
});
const loaded = (requestId: number, offset: number): StearchAction => ({
  type: "window/loaded",
  requestId,
  offset,
  page,
});

describe("stearchReducer", () => {
  it("keeps the most recent selection last", () => {
    // Act
    const state = apply(INITIAL, pick(7), pick(3));

    // Assert
    expect(state.attention.selectedIds).toEqual([7, 3]);
  });

  it("adds a selection only once", () => {
    // Act
    const state = apply(INITIAL, pick(7), pick(7));

    // Assert
    expect(state.attention.selectedIds).toEqual([7]);
  });

  it("removes a selection, and removing again changes nothing", () => {
    // Arrange
    const before = apply(INITIAL, pick(7, 3));

    // Act
    const state = apply(before, unpick(7), unpick(7));

    // Assert
    expect(state.attention.selectedIds).toEqual([3]);
  });

  it("folds an array of actions into one result", () => {
    // Act
    const state = apply(INITIAL, ZELDA, {
      type: "view/set",
      patch: { isAdvancedOpen: false },
    });

    // Assert
    expect(state.query.searchTerm).toBe("zelda");
    expect(state.view.isAdvancedOpen).toBe(false);
  });

  it("adds a multi-select value only once", () => {
    // Act
    const state = apply(INITIAL, USA, USA);

    // Assert
    expect(state.query.selectedRegions).toEqual(["USA"]);
  });

  it("resets the whole search with a patch of defaults", () => {
    // Arrange
    const before = apply(INITIAL, USA, ZELDA);

    // Act
    const state = apply(before, { type: "query/set", patch: INITIAL_QUERY });

    // Assert
    expect(state.query).toEqual(INITIAL_QUERY);
  });

  it("leaves the search alone on an empty patch", () => {
    // Arrange
    const before = apply(INITIAL, USA);

    // Act
    const state = apply(before, { type: "query/set", patch: {} });

    // Assert
    expect(state.query).toEqual(before.query);
  });

  it("clears filters but keeps the search and sort", () => {
    // Arrange
    const before = apply(INITIAL, USA, ZELDA, {
      type: "query/set",
      patch: { orderDir: "desc" },
    });

    // Act
    const state = apply(before, ...selectClearActions(before));

    // Assert
    expect(state.query).toMatchObject({
      selectedRegions: [],
      searchTerm: "zelda",
      orderDir: "desc",
    });
  });

  it("starts a new search at the top", () => {
    // Arrange
    const before = apply(LOADED_STEARCH_STATE, {
      type: "view/set",
      patch: { visiblePosition: 300 },
    });

    // Act
    const state = apply(before, requested(9));

    // Assert
    expect(state.view).toMatchObject({
      visiblePosition: 0,
      jump: { position: 0, isSmooth: false },
    });
  });

  it("drops a response from an older request", () => {
    // Arrange
    const before = apply(INITIAL, requested(2));

    // Act
    const state = apply(before, loaded(1, 0));

    // Assert
    expect(state).toBe(before);
  });

  it("accepts later windows of the same query while ready", () => {
    // Act
    const state = apply(LOADED_STEARCH_STATE, loaded(1, 48));

    // Assert
    expect(state.results.windows[0]).toBe(
      LOADED_STEARCH_STATE.results.windows[0],
    );
    expect(state.results.windows[48]).toEqual([]);
  });

  it("replaces everything when a new first window loads", () => {
    // Arrange
    const before = apply(LOADED_STEARCH_STATE, requested(9));

    // Act
    const state = apply(before, loaded(9, 0));

    // Assert
    expect(state.results).toMatchObject({ windows: { 0: [] }, ids: [] });
  });

  it("records a failure for the current request", () => {
    // Arrange
    const before = apply(INITIAL, requested(3));

    // Act
    const state = apply(before, {
      type: "window/failed",
      requestId: 3,
      message: "Server unreachable",
    });

    // Assert
    expect(state.results.status).toEqual({
      kind: "failed",
      message: "Server unreachable",
    });
  });
});
