import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  pushEscapable,
  popEscapable,
} from "@/lib/overlays/RDialog/escapeStack";
import { createWaypointKeyDriver } from "./waypoints.driver";

const atPageLevel = () => null;
const press = (shiftKey: boolean, entered: () => HTMLElement | null) =>
  createWaypointKeyDriver(entered).keyDown(
    new KeyboardEvent("keydown", { key: "F6", shiftKey }),
  );
function escape(): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    cancelable: true,
  });
  createWaypointKeyDriver(atPageLevel).keyDown(event);
  return event;
}

describe("createWaypointKeyDriver", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-waypoint="a"><button id="a">a</button></div>
      <div data-waypoint="closed" inert><button id="closed">x</button></div>
      <div data-waypoint="b"><button id="b">b</button></div>
      <div data-waypoint="results">
        <div role="grid" tabindex="0" id="grid">
          <div id="item"><button id="open">o</button><button id="more">m</button></div>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("moves to the next waypoint, skipping inert ones", () => {
    // Arrange
    document.getElementById("a")?.focus();

    // Act
    press(false, atPageLevel);

    // Assert
    expect(document.activeElement?.id).toBe("b");
  });

  it("wraps backwards from the first waypoint", () => {
    // Arrange
    document.getElementById("a")?.focus();

    // Act
    press(true, atPageLevel);

    // Assert
    expect(document.activeElement?.id).toBe("grid");
  });

  it("cycles only the entered game's controls", () => {
    // Arrange
    document.getElementById("more")?.focus();

    // Act
    press(false, () => document.getElementById("item"));

    // Assert
    expect(document.activeElement?.id).toBe("open");
  });

  it("does nothing while an overlay is open", () => {
    // Arrange
    const panel = document.createElement("div");
    const overlay = {
      close: () => undefined,
      persistent: false,
      panel: () => panel,
    };
    document.getElementById("a")?.focus();
    pushEscapable(overlay);

    // Act
    press(false, atPageLevel);
    popEscapable(overlay);

    // Assert
    expect(document.activeElement?.id).toBe("a");
  });
});

describe("the ladder", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-waypoint="nav"><button id="nav">n</button></div>
      <div data-waypoint="search"><input id="search" /></div>
      <div data-waypoint="controls"><button id="controls">c</button></div>
      <div data-waypoint="filters"><button id="filters">f</button></div>
      <div data-waypoint="results"><div role="grid" tabindex="0" id="grid"></div></div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it.each([
    ["grid", "search"],
    ["filters", "search"],
    ["search", "nav"],
    ["controls", "nav"],
  ])("climbs from %s to %s", (from, to) => {
    // Arrange
    document.getElementById(from)?.focus();

    // Act
    const event = escape();

    // Assert
    expect(document.activeElement?.id).toBe(to);
    expect(event.defaultPrevented).toBe(true);
  });

  it("stops at the nav, still claiming the press", () => {
    // Arrange
    document.getElementById("nav")?.focus();

    // Act
    const event = escape();

    // Assert
    expect(document.activeElement?.id).toBe("nav");
    expect(event.defaultPrevented).toBe(true);
  });
});
