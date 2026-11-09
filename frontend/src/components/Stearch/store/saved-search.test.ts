import { describe, expect, it } from "vitest";
import { criteriaToQuery, queryToCriteria } from "./saved-search";
import { INITIAL_QUERY } from "./stearch.reducer";
import type { StearchQuery } from "./stearch.state-props";

const QUERY: StearchQuery = {
  ...INITIAL_QUERY,
  searchTerm: "zelda",
  platformIds: [3],
  filterFavorites: false,
  selectedGenres: ["RPG"],
  genresLogic: "all",
  hltbMainStoryMax: 36000,
  sort: [{ param: "average_rating", dir: "desc" }],
};

describe("saved search", () => {
  it("loads back exactly what it saved", () => {
    // Act
    const loaded = criteriaToQuery(queryToCriteria(QUERY));

    // Assert
    expect(loaded).toEqual({ query: QUERY, dropped: [] });
  });

  it("saves the sort in the criteria", () => {
    // Act
    const criteria = queryToCriteria(QUERY);

    // Assert
    expect(criteria).toMatchObject({
      order_by: "average_rating",
      order_dir: "desc",
    });
  });

  it("reports a key it doesn't know and doesn't apply it", () => {
    // Act
    const { dropped, query } = criteriaToQuery({
      search_term: "doom",
      collection_id: 4,
    });

    // Assert
    expect(dropped).toEqual(["collection_id"]);
    expect(query.searchTerm).toBe("doom");
  });

  it("falls back to the default sort for one that's gone", () => {
    // Act
    const { dropped, query } = criteriaToQuery({ order_by: "retired_key" });

    // Assert
    expect(dropped).toEqual(["order_by"]);
    expect(query.sort).toEqual(INITIAL_QUERY.sort);
  });

  it("rejects a value of the wrong shape", () => {
    // Act
    const { dropped, query } = criteriaToQuery({ genres: "RPG" });

    // Assert
    expect(dropped).toEqual(["genres"]);
    expect(query.selectedGenres).toEqual([]);
  });
});
