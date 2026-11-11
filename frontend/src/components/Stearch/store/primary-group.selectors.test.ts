import { describe, expect, it } from "vitest";
import { LOADED_STEARCH_STATE } from "./fixtures";
import {
  selectCurrentBucket,
  selectPrimaryGroup,
} from "./primary-group.selectors";
import type { IStearchState } from "./stearch.state-props";

const { query, results, view } = LOADED_STEARCH_STATE;
const RATED: IStearchState = {
  ...LOADED_STEARCH_STATE,
  query: { ...query, sort: [{ param: "average_rating", dir: "desc" }] },
  view: { ...view, visibleSpan: { first: 3, last: 4 } },
  results: { ...results, ids: [1, 2, 3, 4, 5], bucketIndex: { 7: 0, 6: 2 } },
};

describe("selectPrimaryGroup", () => {
  it("draws a rating bucket as stars, in server order", () => {
    // Act
    const { buckets } = selectPrimaryGroup(RATED);

    // Assert
    expect(buckets.map(({ value }) => value)).toEqual([
      { kind: "stars", stars: 7 },
      { kind: "stars", stars: 6 },
    ]);
  });

  it("leaves an Unknown bucket as text", () => {
    // Arrange
    const state: IStearchState = {
      ...RATED,
      results: { ...RATED.results, bucketIndex: { Unknown: 0 } },
    };

    // Act
    const { buckets } = selectPrimaryGroup(state);

    // Assert
    expect(buckets[0]?.value).toEqual({ kind: "text", text: "Unknown" });
  });

  it("keeps its identity while the list scrolls", () => {
    // Arrange
    const before = selectPrimaryGroup(RATED);
    const scrolled: IStearchState = {
      ...RATED,
      view: { ...RATED.view, visibleSpan: { first: 0, last: 1 } },
    };

    // Act
    const after = selectPrimaryGroup(scrolled);

    // Assert
    expect(after).toBe(before);
  });
});

describe("selectCurrentBucket", () => {
  it("finds the bucket at the top of the list", () => {
    // Act
    const bucket = selectCurrentBucket(RATED);

    // Assert
    expect(bucket?.key).toBe("6");
  });
});
