import { describe, expect, it } from "vitest";
import { buildFakePage } from "./Stearch.fake-api";
import { parsePage } from "./Stearch.schema";

describe("parsePage", () => {
  it("keeps every field of a real API object, and freezes it", () => {
    // Arrange
    const data = buildFakePage({ limit: 1 });

    // Act
    const [rom] = parsePage(data).items;

    // Assert
    expect(rom).toHaveProperty("summary");
    expect(Object.isFrozen(rom)).toBe(true);
  });

  it("throws on data that doesn't match", () => {
    // Arrange
    const data = JSON.parse('{"items":[{"id":"nope"}]}');

    // Act
    const parse = () => parsePage(data);

    // Assert
    expect(parse).toThrow();
  });
});
