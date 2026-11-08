import { describe, expect, it } from "vitest";
import { itemsAheadAt, READ_AHEAD } from "./Stearch.read-ahead";

describe("itemsAheadAt", () => {
  it("reads the fixed screens ahead when still", () => {
    // Act
    const ahead = itemsAheadAt(0, 40, READ_AHEAD);

    // Assert
    expect(ahead).toBe(80);
  });

  it("covers the distance travelled while two windows arrive", () => {
    // Act
    const ahead = itemsAheadAt(200, 40, READ_AHEAD);

    // Assert
    expect(ahead).toBe(240);
  });

  it("caps read-ahead at the most screens it may ask for", () => {
    // Act
    const ahead = itemsAheadAt(5000, 40, READ_AHEAD);

    // Assert
    expect(ahead).toBe(320);
  });

  it("is the same for either direction", () => {
    // Act
    const ahead = itemsAheadAt(-200, 40, READ_AHEAD);

    // Assert
    expect(ahead).toBe(240);
  });
});
