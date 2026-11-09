import { describe, expect, it } from "vitest";
import { selectBulkMenu } from "./action-menu.selectors";
import { LOADED_STEARCH_STATE as loaded } from "./fixtures";
import type { IStearchState } from "./stearch.state-props";

const withSelection = (selectedIds: readonly number[]): IStearchState => ({
  ...loaded,
  attention: { ...loaded.attention, selectedIds },
  view: { ...loaded.view, collections: [{ id: 9, name: "Shmups" }] },
});

describe("selectBulkMenu", () => {
  it("doesn't exist with nothing selected", () => {
    // Act
    const menu = selectBulkMenu(withSelection([]));

    // Assert
    expect(menu).toBeNull();
  });

  it("names the count, in its title and its entries", () => {
    // Act
    const menu = selectBulkMenu(withSelection([1, 2, 3]));

    // Assert
    expect(menu?.title).toBe("Bulk actions for 3 games");
    expect(menu?.entries.map(({ label }) => label)).toEqual([
      "Add 3 games to Shmups",
      "Deselect 3 games",
    ]);
  });

  it("sends every selected game to the collection", () => {
    // Act
    const menu = selectBulkMenu(withSelection([1, 2, 3]));

    // Assert
    expect(menu?.entries[0]?.verb).toEqual({
      kind: "add-to-collection",
      collectionId: 9,
      romIds: [1, 2, 3],
    });
  });
});
