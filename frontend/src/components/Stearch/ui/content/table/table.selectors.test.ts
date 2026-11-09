import { describe, expect, it } from "vitest";
import { buildSortActions } from "./table.selectors";

describe("buildSortActions", () => {
  it("builds a sort action for a sort key", () => {
    // Arrange
    const payload = { key: "average_rating", dir: "desc" as const };

    // Act
    const actions = buildSortActions(payload);

    // Assert
    expect(actions).toEqual([
      {
        type: "query/set",
        patch: { orderBy: "average_rating", orderDir: "desc" },
      },
    ]);
  });

  it("does nothing for a column that isn't a sort key", () => {
    // Arrange
    const payload = { key: "languages", dir: "asc" as const };

    // Act
    const actions = buildSortActions(payload);

    // Assert
    expect(actions).toEqual([]);
  });
});
