import { describe, expect, it, vi } from "vitest";
import { shallowRef } from "vue";
import { createAxisStore } from "./axis-store";
import { createListInput } from "./list-input";
import { TILES_FEEL } from "./list.props";

function pressEnter(onChild: boolean) {
  const grid = document.createElement("div");
  grid.setAttribute("role", "grid");
  const child = document.createElement("button");
  const scroller = document.createElement("div");
  grid.append(child, scroller);
  document.body.append(grid);
  const open = vi.fn();
  const { onKey } = createListInput(
    {
      rows: () => [],
      start: () => 0,
      currentPosition: () => null,
      feel: () => TILES_FEEL,
      rowHeight: () => 30,
      headHeight: () => 28,
      scroller: () => scroller,
      follow: vi.fn(),
      dispatch: vi.fn(),
      open,
    },
    createAxisStore(),
    {
      activePosition: shallowRef(null),
      isScrubbing: shallowRef(false),
      cruiseStack: shallowRef(null),
      navigate: shallowRef(null),
    },
  );
  grid.addEventListener("keydown", onKey);
  (onChild ? child : grid).dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
  );
  return open;
}

describe("createListInput Enter", () => {
  it("opens the current game from the grid", () => {
    // Act
    const open = pressEnter(false);

    // Assert
    expect(open).toHaveBeenCalledOnce();
  });

  it("leaves Enter to a control inside the grid", () => {
    // Act
    const open = pressEnter(true);

    // Assert
    expect(open).not.toHaveBeenCalled();
  });
});
