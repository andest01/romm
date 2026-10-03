import { describe, expect, it } from "vitest";
import { headingId } from "./markdownHeadingId";

describe("headingId", () => {
  it("gives the conventional anchor for a heading", () => {
    expect(headingId({ text: "Chapter One" })).toBe("chapter-one");
  });

  it("collapses punctuation and spacing into single hyphens", () => {
    expect(headingId({ text: "  Chapter: One!  " })).toBe("chapter-one");
  });

  it("keeps letters and digits from any script", () => {
    expect(headingId({ text: "見出し 2" })).toBe("見出し-2");
  });

  it("falls back for a heading with nothing to slug", () => {
    expect(headingId({ text: "!!!" })).toBe("heading");
  });

  it("is the same for the same text, wherever the heading sits", () => {
    expect(headingId({ text: "Overview" })).toBe(
      headingId({ text: "Overview" }),
    );
  });
});
