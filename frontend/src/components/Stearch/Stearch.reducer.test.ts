import { describe, expect, it } from "vitest";
import type { StearchAction } from "./Stearch.actions";
import { LOADED_STEARCH_STATE } from "./Stearch.fixtures";
import {
  INITIAL_QUERY,
  INITIAL_STEARCH_STATE,
  stearchReducer,
} from "./Stearch.reducer";
import { selectClearActions } from "./Stearch.selectors";
import type { StearchPage } from "./Stearch.state-props";

const page: StearchPage = {
  items: [],
  total: 0,
  char_index: {},
  rom_id_index: [],
  filter_values: INITIAL_STEARCH_STATE.results.filterValues,
};
const USA: StearchAction = {
  type: "query/toggle",
  key: "selectedRegions",
  value: "USA",
};

describe("stearchReducer", () => {
  it("keeps the most recent selection last", () => {
    // Arrange
    const actions: StearchAction[] = [
      { type: "selection/toggle", id: 7 },
      { type: "selection/toggle", id: 3 },
    ];

    // Act
    const state = actions.reduce(stearchReducer, INITIAL_STEARCH_STATE);

    // Assert
    expect(state.attention.selectedIds).toEqual([7, 3]);
  });

  it("toggles a selected id off", () => {
    // Arrange
    const on = stearchReducer(INITIAL_STEARCH_STATE, {
      type: "selection/toggle",
      id: 7,
    });

    // Act
    const off = stearchReducer(on, { type: "selection/toggle", id: 7 });

    // Assert
    expect(off.attention.selectedIds).toEqual([]);
  });

  it("selects every result, not just loaded rows", () => {
    // Act
    const state = stearchReducer(LOADED_STEARCH_STATE, {
      type: "selection/all",
    });

    // Assert
    expect(state.attention.selectedIds).toHaveLength(1000);
  });

  it("folds an array of actions into one result", () => {
    // Arrange
    const actions: StearchAction[] = [
      { type: "query/set", patch: { searchTerm: "zelda" } },
      { type: "advanced/toggle" },
    ];

    // Act
    const state = actions.reduce(stearchReducer, INITIAL_STEARCH_STATE);

    // Assert
    expect(state.query.searchTerm).toBe("zelda");
    expect(state.view.isAdvancedOpen).toBe(false);
  });

  it("toggles a multi-select value on", () => {
    // Act
    const state = stearchReducer(INITIAL_STEARCH_STATE, USA);

    // Assert
    expect(state.query.selectedRegions).toEqual(["USA"]);
  });

  it("resets the whole search with a patch of defaults", () => {
    // Arrange
    const actions: StearchAction[] = [
      USA,
      { type: "query/set", patch: { searchTerm: "zelda" } },
    ];
    const before = actions.reduce(stearchReducer, INITIAL_STEARCH_STATE);

    // Act
    const state = stearchReducer(before, {
      type: "query/set",
      patch: INITIAL_QUERY,
    });

    // Assert
    expect(state.query).toEqual(INITIAL_QUERY);
  });

  it("leaves the search alone on an empty patch", () => {
    // Arrange
    const before = stearchReducer(INITIAL_STEARCH_STATE, USA);

    // Act
    const state = stearchReducer(before, { type: "query/set", patch: {} });

    // Assert
    expect(state.query).toEqual(before.query);
  });

  it("clears filters but keeps the search and sort", () => {
    // Arrange
    const actions: StearchAction[] = [
      USA,
      { type: "query/set", patch: { searchTerm: "zelda", orderDir: "desc" } },
    ];
    const before = actions.reduce(stearchReducer, INITIAL_STEARCH_STATE);

    // Act
    const state = selectClearActions(before).reduce(stearchReducer, before);

    // Assert
    expect(state.query.selectedRegions).toEqual([]);
    expect(state.query.searchTerm).toBe("zelda");
    expect(state.query.orderDir).toBe("desc");
  });

  it("drops a response from an older request", () => {
    // Arrange
    const loading = stearchReducer(INITIAL_STEARCH_STATE, {
      type: "window/requested",
      requestId: 2,
    });

    // Act
    const state = stearchReducer(loading, {
      type: "window/loaded",
      requestId: 1,
      offset: 0,
      page,
    });

    // Assert
    expect(state).toBe(loading);
  });

  it("accepts later windows of the same query while ready", () => {
    // Act
    const state = stearchReducer(LOADED_STEARCH_STATE, {
      type: "window/loaded",
      requestId: 1,
      offset: 48,
      page,
    });

    // Assert
    expect(state.results.windows[0]).toBe(
      LOADED_STEARCH_STATE.results.windows[0],
    );
    expect(state.results.windows[48]).toEqual([]);
  });

  it("replaces everything when a new first window loads", () => {
    // Arrange
    const loading = stearchReducer(LOADED_STEARCH_STATE, {
      type: "window/requested",
      requestId: 9,
    });

    // Act
    const state = stearchReducer(loading, {
      type: "window/loaded",
      requestId: 9,
      offset: 0,
      page,
    });

    // Assert
    expect(state.results.windows).toEqual({ 0: [] });
    expect(state.results.ids).toEqual([]);
  });

  it("records a failure for the current request", () => {
    // Arrange
    const loading = stearchReducer(INITIAL_STEARCH_STATE, {
      type: "window/requested",
      requestId: 3,
    });

    // Act
    const state = stearchReducer(loading, {
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
