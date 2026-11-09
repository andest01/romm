import { focusFromInput } from "@/utils/autofocus";
import type { KeyDriver } from "./content/list/use-key-driver";

const ENTRY = 'input, [role="grid"], button, a[href], [tabindex="0"]';

/** F6 and Shift+F6 cycle the regions layouts stamp with `data-waypoint`, in
 *  DOM order, so a new region joins without touching this. */
export function createWaypointKeyDriver(): KeyDriver {
  const nothing = (): void => undefined;
  return {
    keyDown(event) {
      if (event.key !== "F6") return;
      const waypoints = Array.from(
        document.querySelectorAll<HTMLElement>("[data-waypoint]:not([inert])"),
      );
      if (waypoints.length === 0) return;
      event.preventDefault();
      const at = waypoints.findIndex((waypoint) =>
        waypoint.contains(document.activeElement),
      );
      const step = event.shiftKey ? -1 : 1;
      const from = at === -1 && event.shiftKey ? 0 : at;
      const next =
        waypoints[(from + step + waypoints.length) % waypoints.length];
      if (!next) return;
      focusFromInput(next.querySelector<HTMLElement>(ENTRY) ?? next);
    },
    keyUp: nothing,
    focusChanged: nothing,
    scrolled: nothing,
    settled: nothing,
    dispose: nothing,
  };
}
