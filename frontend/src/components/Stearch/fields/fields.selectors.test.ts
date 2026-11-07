import { describe, expect, it } from "vitest";
import type { StearchAction } from "../Stearch.actions";
import { LOADED_STEARCH_STATE } from "../Stearch.fixtures";
import { stearchReducer } from "../Stearch.reducer";
import type { FieldPreview } from "./fields.props";
import { buildRangeActions, selectFieldPreviews } from "./fields.selectors";

function previewAfter(actions: readonly StearchAction[], id: string) {
  const state = actions.reduce(stearchReducer, LOADED_STEARCH_STATE);
  const field = selectFieldPreviews(state).find(
    (candidate) => candidate.id === id,
  );
  if (!field) throw new Error(`No field ${id}`);
  return field;
}

function onlyChoice(field: FieldPreview) {
  if (field.kind !== "tri-state") throw new Error("Not a tri-state field");
  return field.choice;
}

describe("selectFieldPreviews", () => {
  it("summarises a multi-select, with its logic in words", () => {
    // Arrange
    const actions: StearchAction[] = [
      { type: "query/toggle", key: "selectedGenres", value: "RPG" },
      { type: "query/set", patch: { genresLogic: "all" } },
    ];

    // Act
    const field = previewAfter(actions, "selectedGenres");

    // Assert
    expect(field.summary).toBe("genres: all of RPG");
  });

  it("has no summary while a field is unset", () => {
    // Act
    const field = previewAfter([], "selectedGenres");

    // Assert
    expect(field.summary).toBeNull();
  });

  it("cycles a tri-state from off to on", () => {
    // Arrange
    const off = previewAfter([], "filterFavorites");

    // Act
    const on = previewAfter(onlyChoice(off).actions, "filterFavorites");

    // Assert
    expect(onlyChoice(on).state).toBe("on");
  });

  it("cycles a tri-state from on to excluded", () => {
    // Arrange
    const actions: StearchAction[] = [
      { type: "query/set", patch: { filterFavorites: true } },
    ];
    const on = previewAfter(actions, "filterFavorites");

    // Act
    const excluded = previewAfter(
      [...actions, ...onlyChoice(on).actions],
      "filterFavorites",
    );

    // Assert
    expect(excluded.summary).toBe("not show-favorites");
  });

  it("clears a field with its own actions", () => {
    // Arrange
    const actions: StearchAction[] = [
      { type: "query/toggle", key: "selectedGenres", value: "RPG" },
    ];
    const set = previewAfter(actions, "selectedGenres");

    // Act
    const cleared = previewAfter(
      [...actions, ...set.clearActions],
      "selectedGenres",
    );

    // Assert
    expect(cleared.summary).toBeNull();
  });

  it("shows a range in hours", () => {
    // Arrange
    const actions = buildRangeActions({ bound: "min", value: "2" });

    // Act
    const field = previewAfter(actions, "hltbMainStory");

    // Assert
    expect(field).toMatchObject({ range: { min: 2, max: null } });
  });
});

describe("buildRangeActions", () => {
  it("stores hours as the seconds the API expects", () => {
    // Act
    const actions = buildRangeActions({ bound: "max", value: "1.5" });

    // Assert
    expect(actions).toEqual([
      { type: "query/set", patch: { hltbMainStoryMax: 5400 } },
    ]);
  });

  it("clears the bound when the input is empty", () => {
    // Act
    const actions = buildRangeActions({ bound: "min", value: "" });

    // Assert
    expect(actions).toEqual([
      { type: "query/set", patch: { hltbMainStoryMin: null } },
    ]);
  });
});
