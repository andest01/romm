import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createWaypointKeyDriver } from "./waypoints.driver";

const press = (shiftKey: boolean) =>
  createWaypointKeyDriver().keyDown(
    new KeyboardEvent("keydown", { key: "F6", shiftKey }),
  );

describe("createWaypointKeyDriver", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-waypoint="a"><button id="a">a</button></div>
      <div data-waypoint="closed" inert><button id="closed">x</button></div>
      <div data-waypoint="b"><button id="b">b</button></div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("moves to the next waypoint, skipping inert ones", () => {
    // Arrange
    document.getElementById("a")?.focus();

    // Act
    press(false);

    // Assert
    expect(document.activeElement?.id).toBe("b");
  });

  it("wraps backwards from the first waypoint", () => {
    // Arrange
    document.getElementById("a")?.focus();

    // Act
    press(true);

    // Assert
    expect(document.activeElement?.id).toBe("b");
  });
});
