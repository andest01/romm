import { describe, expect, it } from "vitest";
import type { StearchAction } from "../../store/stearch.actions";
import {
  INITIAL_STEARCH_STATE,
  stearchReducer,
} from "../../store/stearch.reducer";
import { selectHeaderProps } from "./header.selectors";

describe("selectHeaderProps sort", () => {
  const { options } = selectHeaderProps(INITIAL_STEARCH_STATE).sort;

  it("starts a new key in its own default direction", () => {
    // Act
    const option = options.find(({ id }) => id === "average_rating");

    // Assert
    expect(option?.actions).toEqual([
      {
        type: "query/set",
        patch: { sort: [{ param: "average_rating", dir: "desc" }] },
      },
    ]);
  });

  it("sets direction explicitly, keeping the key", () => {
    // Arrange
    const { directions } = selectHeaderProps(INITIAL_STEARCH_STATE).sort;

    // Act
    const option = directions.find(({ id }) => id === "desc");

    // Assert
    expect(option?.actions).toEqual([
      {
        type: "query/set",
        patch: { sort: [{ param: "name", dir: "desc" }] },
      },
    ]);
  });

  it("keeps later sort levels when the first changes", () => {
    // Arrange
    const state = stearchReducer(INITIAL_STEARCH_STATE, {
      type: "query/set",
      patch: {
        sort: [
          { param: "name", dir: "asc" },
          { param: "created_at", dir: "desc" },
        ],
      },
    });
    const { options: all } = selectHeaderProps(state).sort;

    // Act
    const option = all.find(({ id }) => id === "average_rating");

    // Assert
    expect(option?.actions).toEqual([
      {
        type: "query/set",
        patch: {
          sort: [
            { param: "average_rating", dir: "desc" },
            { param: "created_at", dir: "desc" },
          ],
        },
      },
    ]);
  });
});

describe("selectHeaderProps filters", () => {
  const OPEN_GENRES: StearchAction = {
    type: "view/set",
    patch: { openFieldId: "selectedGenres" },
  };

  it("makes a pill for each field with a value", () => {
    // Arrange
    const state = stearchReducer(INITIAL_STEARCH_STATE, {
      type: "query/add",
      key: "selectedRegions",
      value: "USA",
    });

    // Act
    const { pills } = selectHeaderProps(state).filters;

    // Assert
    expect(pills.map(({ id }) => id)).toEqual(["selectedRegions"]);
  });

  it("has no pills with nothing set", () => {
    // Act
    const { pills } = selectHeaderProps(INITIAL_STEARCH_STATE).filters;

    // Assert
    expect(pills).toEqual([]);
  });

  it("opens the chosen field in the add menu", () => {
    // Arrange
    const state = stearchReducer(INITIAL_STEARCH_STATE, OPEN_GENRES);

    // Act
    const { openField } = selectHeaderProps(state).filters;

    // Assert
    expect(openField?.id).toBe("selectedGenres");
  });

  it("goes back to the field list", () => {
    // Arrange
    const open = stearchReducer(INITIAL_STEARCH_STATE, OPEN_GENRES);
    const { closeFieldActions } = selectHeaderProps(open).filters;

    // Act
    const state = closeFieldActions.reduce(stearchReducer, open);

    // Assert
    expect(selectHeaderProps(state).filters.openField).toBeNull();
  });
});

describe("selectHeaderProps view", () => {
  const press = (state: typeof INITIAL_STEARCH_STATE) =>
    selectHeaderProps(state).view.actions.reduce(stearchReducer, state);

  it("goes to the table on the first press", () => {
    // Act
    const state = press(INITIAL_STEARCH_STATE);

    // Assert
    expect(state.view.mode).toBe("table");
  });

  it("swaps back on the second press", () => {
    // Arrange
    const once = press(INITIAL_STEARCH_STATE);

    // Act
    const twice = press(once);

    // Assert
    expect(twice.view.mode).toBe("tiles");
  });
});
