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
  const enter = vi.fn();
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
      enter,
      isEntered: () => false,
      exit: vi.fn(),
      hopItem: vi.fn(),
      toggleSelected: vi.fn(() => null),
      idAt: () => null,
      openActions: vi.fn(),
      closeOverlay: vi.fn(),
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
  return enter;
}

function enteredInput() {
  const grid = document.createElement("div");
  grid.setAttribute("role", "grid");
  const scroller = document.createElement("div");
  grid.append(scroller);
  document.body.append(grid);
  const hopItem = vi.fn();
  const activePosition = shallowRef<number | null>(null);
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
      enter: vi.fn(),
      isEntered: () => true,
      exit: vi.fn(),
      hopItem,
      toggleSelected: vi.fn(() => null),
      idAt: () => null,
      openActions: vi.fn(),
      closeOverlay: vi.fn(),
    },
    createAxisStore(),
    {
      activePosition,
      isScrubbing: shallowRef(false),
      cruiseStack: shallowRef(null),
      navigate: shallowRef(null),
    },
  );
  const press = (key: string) => onKey(new KeyboardEvent("keydown", { key }));
  return { press, hopItem, activePosition };
}

function painting() {
  const openActions = vi.fn();
  const closeOverlay = vi.fn();
  const dispatch = vi.fn();
  const navigate = shallowRef<((position: number) => void) | null>(null);
  const input = createListInput(
    {
      rows: () => [],
      start: () => 0,
      currentPosition: () => null,
      feel: () => TILES_FEEL,
      rowHeight: () => 30,
      headHeight: () => 28,
      scroller: () => document.createElement("div"),
      follow: vi.fn(),
      dispatch,
      enter: vi.fn(),
      isEntered: () => false,
      exit: vi.fn(),
      hopItem: vi.fn(),
      toggleSelected: () => "add",
      idAt: (position) => position + 100,
      openActions,
      closeOverlay,
    },
    createAxisStore(),
    {
      activePosition: shallowRef(null),
      isScrubbing: shallowRef(false),
      cruiseStack: shallowRef(null),
      navigate,
    },
  );
  const added = () =>
    dispatch.mock.calls.flatMap(([actions]) =>
      actions.filter((a: { type: string }) => a.type === "selection/add"),
    );
  return { input, navigate, added, openActions, closeOverlay };
}

describe("createListInput actions button", () => {
  it("closes the menu it opened on the second press", () => {
    // Arrange
    const { input, closeOverlay } = painting();
    input.onPadButton("y");
    const panel = document.createElement("div");
    panel.className = "r-menu__panel";
    const item = document.createElement("button");
    panel.append(item);
    document.body.append(panel);
    item.focus();

    // Act
    input.onPadButton("y");

    // Assert
    expect(closeOverlay).toHaveBeenCalledOnce();
    panel.remove();
  });
});

describe("createListInput painting", () => {
  it("adds each game the cursor lands on while X is held", () => {
    // Arrange
    const { input, navigate, added } = painting();
    input.onPadButton("x");

    // Act
    navigate.value?.(5);

    // Assert
    expect(added()).toEqual([{ type: "selection/add", ids: [105] }]);
  });

  it("stops when X is released", () => {
    // Arrange
    const { input, navigate, added } = painting();
    input.onPadButton("x");
    input.onPadButtonUp("x");

    // Act
    navigate.value?.(5);

    // Assert
    expect(added()).toEqual([]);
  });
});

describe("createListInput Enter", () => {
  it("enters the current game from the grid", () => {
    // Act
    const enter = pressEnter(false);

    // Assert
    expect(enter).toHaveBeenCalledOnce();
  });

  it("leaves Enter to a control inside the grid", () => {
    // Act
    const enter = pressEnter(true);

    // Assert
    expect(enter).not.toHaveBeenCalled();
  });
});

describe("createListInput while entered", () => {
  it("cycles the game's controls with left and right", () => {
    // Arrange
    const { press, hopItem } = enteredInput();

    // Act
    press("ArrowRight");
    press("ArrowLeft");

    // Assert
    expect(hopItem.mock.calls).toEqual([[1], [-1]]);
  });

  it("keeps the cursor still", () => {
    // Arrange
    const { press, activePosition } = enteredInput();

    // Act
    press("ArrowDown");

    // Assert
    expect(activePosition.value).toBeNull();
  });
});
