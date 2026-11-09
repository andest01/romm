import { moveFocus } from "@/composables/useSpatialNav";
import { focusFromInput } from "@/utils/autofocus";
import { isEditable } from "@/utils/editable";
import type { KeyDriver } from "../results/list/use-key-driver";
import { RESULTS_GRID } from "../waypoints.driver";

/** Keeps the search box from trapping focus: left and right leave it once the
 *  caret is at that end of the text, so editing still works. */
export function createHeaderKeyDriver(): KeyDriver {
  const nothing = (): void => undefined;
  return {
    keyDown(event) {
      if (
        (event.key === "/" || event.key === "?") &&
        !isEditable(event.target)
      ) {
        event.preventDefault();
        focusFromInput(
          document.querySelector<HTMLElement>("[role='search'] input"),
        );
        return;
      }
      const input = event.target;
      if (
        !(input instanceof HTMLInputElement) ||
        !input.closest("[role='search']")
      ) {
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusFromInput(document.querySelector<HTMLElement>(RESULTS_GRID));
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const isLeft = event.key === "ArrowLeft";
      const edge = isLeft ? 0 : input.value.length;
      if (input.selectionStart !== edge || input.selectionEnd !== edge) return;
      event.preventDefault();
      moveFocus(input, isLeft ? "left" : "right");
    },
    keyUp: nothing,
    focusChanged: nothing,
    scrolled: nothing,
    settled: nothing,
    dispose: nothing,
  };
}
