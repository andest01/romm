import { beforeEach, describe, expect, it, vi } from "vitest";
import { moveFocus } from "@/composables/useSpatialNav";
import { createHeaderKeyDriver } from "./header.driver";

vi.mock("@/composables/useSpatialNav", () => ({ moveFocus: vi.fn() }));

function press(key: string, value: string, caret: number): HTMLInputElement {
  const search = document.createElement("div");
  search.setAttribute("role", "search");
  const input = document.createElement("input");
  input.value = value;
  search.append(input);
  document.body.append(search);
  input.setSelectionRange(caret, caret);
  input.addEventListener("keydown", createHeaderKeyDriver().keyDown);
  input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  return input;
}

describe("createHeaderKeyDriver", () => {
  beforeEach(() => {
    vi.mocked(moveFocus).mockClear();
  });

  it("leaves to the right from the end of the text", () => {
    // Act
    const input = press("ArrowRight", "zelda", 5);

    // Assert
    expect(moveFocus).toHaveBeenCalledWith(input, "right");
  });

  it("leaves to the left from the start of the text", () => {
    // Act
    const input = press("ArrowLeft", "zelda", 0);

    // Assert
    expect(moveFocus).toHaveBeenCalledWith(input, "left");
  });

  it("goes down to the results grid", () => {
    // Arrange
    document.body.innerHTML = `
      <div data-waypoint="results"><div role="grid" tabindex="0" id="grid"></div></div>
    `;

    // Act
    press("ArrowDown", "zelda", 2);

    // Assert
    expect(document.activeElement?.id).toBe("grid");
  });

  it("keeps the arrow for editing inside the text", () => {
    // Act
    press("ArrowLeft", "zelda", 3);

    // Assert
    expect(moveFocus).not.toHaveBeenCalled();
  });
});
