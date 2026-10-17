import { describe, expect, it } from "vitest";
import {
  COMPACT_ART_H_PX,
  COMPACT_ART_W_PX,
  COMPACT_CARD_H_PX,
  COMPACT_CARD_W_PX,
  COMPACT_ROW_GAP_PX,
  COMPACT_ROW_H_PX,
  COMPACT_TEXT_H_PX,
  compactCardVars,
  compactCoverUrl,
  formatCardDate,
} from "./compactCard";

describe("compact card geometry", () => {
  it("the thumbnail is exactly as tall as the text block", () => {
    expect(COMPACT_TEXT_H_PX).toBe(2 * 15 + 4 + 14);
    expect(COMPACT_ART_H_PX).toBe(COMPACT_TEXT_H_PX);
    expect(COMPACT_CARD_H_PX).toBe(COMPACT_TEXT_H_PX);
  });

  it("the thumbnail keeps the 2:3 cover shape", () => {
    expect(COMPACT_ART_W_PX / COMPACT_ART_H_PX).toBeCloseTo(2 / 3, 1);
  });

  it("is 80% smaller by area than the portrait card it replaces (128 x 269)", () => {
    const portrait = 128 * 269;

    expect(1 - (COMPACT_CARD_W_PX * COMPACT_CARD_H_PX) / portrait).toBeCloseTo(
      0.8,
      2,
    );
  });

  it("a row is the card plus the gap below it", () => {
    expect(COMPACT_ROW_H_PX).toBe(COMPACT_CARD_H_PX + COMPACT_ROW_GAP_PX);
  });

  it("exposes the same numbers as CSS custom properties", () => {
    const vars = compactCardVars();

    expect(vars["--r-compact-h"]).toBe(`${COMPACT_CARD_H_PX}px`);
    expect(vars["--r-compact-art-w"]).toBe(`${COMPACT_ART_W_PX}px`);
    expect(vars["--r-compact-row-h"]).toBe(`${COMPACT_ROW_H_PX}px`);
  });
});

describe("compactCoverUrl", () => {
  const paths = {
    path_cover_small: "/res/small.png?v=1",
    path_cover_large: "/res/big.png?v=1",
    url_cover: "https://example.test/c.jpg",
  };

  it("prefers the small cover: the card is 128 px wide", () => {
    expect(compactCoverUrl(paths, false)).toBe("/res/small.png?v=1");
  });

  it("falls back to the large cover, then the provider URL", () => {
    expect(compactCoverUrl({ ...paths, path_cover_small: "" }, false)).toBe(
      "/res/big.png?v=1",
    );
    expect(
      compactCoverUrl(
        { ...paths, path_cover_small: "", path_cover_large: "" },
        false,
      ),
    ).toBe("https://example.test/c.jpg");
  });

  it("is null when the rom has no art at all", () => {
    expect(
      compactCoverUrl(
        { path_cover_small: "", path_cover_large: "", url_cover: null },
        false,
      ),
    ).toBeNull();
  });

  it("points a PNG at its WebP sibling when the server serves them", () => {
    expect(compactCoverUrl(paths, true)).toBe("/res/small.webp?v=1");
  });
});

describe("formatCardDate", () => {
  it("formats an ISO timestamp as month and year in the given locale", () => {
    expect(formatCardDate("2026-10-17T05:03:38+00:00", "en-US")).toBe(
      "Oct 2026",
    );
  });

  it("accepts the app's underscore locale ids", () => {
    expect(formatCardDate("2026-10-17T05:03:38+00:00", "en_US")).toBe(
      "Oct 2026",
    );
  });

  it("falls back to the browser locale for one it cannot read", () => {
    expect(formatCardDate("2026-10-17T05:03:38+00:00", "not a locale")).toMatch(
      /2026/,
    );
  });

  it.each([null, undefined, "", "not a date"])("is empty for %s", (value) => {
    expect(formatCardDate(value, "en-US")).toBe("");
  });
});
