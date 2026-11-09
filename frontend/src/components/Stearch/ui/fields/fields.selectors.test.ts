import { describe, expect, it } from "vitest";
import { LOADED_STEARCH_STATE } from "../../store/fixtures";
import type { StearchAction } from "../../store/stearch.actions";
import { stearchReducer } from "../../store/stearch.reducer";
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
      { type: "query/add", key: "selectedGenres", value: "RPG" },
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
      { type: "query/add", key: "selectedGenres", value: "RPG" },
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
    const actions = buildRangeActions({ bound: "min", value: 2 });

    // Act
    const field = previewAfter(actions, "hltbMainStory");

    // Assert
    expect(field).toMatchObject({ range: { min: 2, max: null } });
  });
});

describe("buildRangeActions", () => {
  it("stores hours as the seconds the API expects", () => {
    // Act
    const actions = buildRangeActions({ bound: "max", value: 1.5 });

    // Assert
    expect(actions).toEqual([
      { type: "query/set", patch: { hltbMainStoryMax: 5400 } },
    ]);
  });

  it("opens the maximum at the slider's top", () => {
    // Act
    const actions = buildRangeActions({ bound: "max", value: 100 });

    // Assert
    expect(actions).toEqual([
      { type: "query/set", patch: { hltbMainStoryMax: null } },
    ]);
  });

  it("opens the minimum at the slider's bottom", () => {
    // Act
    const actions = buildRangeActions({ bound: "min", value: 0 });

    // Assert
    expect(actions).toEqual([
      { type: "query/set", patch: { hltbMainStoryMin: null } },
    ]);
  });
});
