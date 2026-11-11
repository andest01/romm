import { isPadEvent } from "@/composables/useGamepad";
import { moveFocus } from "@/composables/useSpatialNav";
import type { KeyDriver } from "../results/list/use-key-driver";

/** Keeps a slider from trapping the arrows: up and down always leave it, and
 *  left and right adjust it for the pad, whose synthetic keys the browser
 *  ignores. */
export function createFiltersKeyDriver(): KeyDriver {
  const nothing = (): void => undefined;
  return {
    keyDown(event) {
      const slider = event.target;
      if (
        !(slider instanceof HTMLInputElement) ||
        slider.type !== "range" ||
        !slider.closest(".stearch-filters")
      ) {
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        moveFocus(slider, event.key === "ArrowUp" ? "up" : "down");
        return;
      }
      if (!isPadEvent(event)) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      if (event.key === "ArrowLeft") slider.stepDown();
      else slider.stepUp();
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    },
    keyUp: nothing,
    focusChanged: nothing,
    scrolled: nothing,
    settled: nothing,
    dispose: nothing,
  };
}
