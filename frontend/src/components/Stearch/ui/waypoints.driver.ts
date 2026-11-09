import { topEscapablePanel } from "@/lib/overlays/RDialog/escapeStack";
import { focusFromInput } from "@/utils/autofocus";
import { itemDomId } from "./results/list/list.selectors";
import type { KeyDriver } from "./results/list/use-key-driver";

const ENTRY = 'input, [role="grid"], button, a[href], [tabindex="0"]';
export const ITEM_STOPS = "button, a[href]";

export const RESULTS_GRID = '[data-waypoint="results"] [role="grid"]';

export type HopStep = 1 | -1;

/** The ladder's next rung up from a region. */
const parentOf = (region: HTMLElement | null | undefined): string =>
  region?.dataset.waypoint === "search" ||
  region?.dataset.waypoint === "controls"
    ? "nav"
    : "search";

/** The entered game's element; `null` at page level or once it unmounts. */
export const enteredElement = (position: number | null): HTMLElement | null =>
  position === null ? null : document.getElementById(itemDomId(position));

function hopAmong(
  stops: readonly HTMLElement[],
  step: HopStep,
  entryOf: (stop: HTMLElement) => HTMLElement,
): void {
  if (stops.length === 0) return;
  const at = stops.findIndex((stop) => stop.contains(document.activeElement));
  const from = at === -1 && step === -1 ? 0 : at;
  const next = stops[(from + step + stops.length) % stops.length];
  if (next) focusFromInput(entryOf(next));
}

/** Cycles the controls inside one entered game. */
export function hopWithin(root: HTMLElement, step: HopStep): void {
  hopAmong(
    Array.from(root.querySelectorAll<HTMLElement>(ITEM_STOPS)),
    step,
    (stop) => stop,
  );
}

/** The page ring: regions layouts stamp with `data-waypoint`, in DOM order, so
 *  a new region joins without touching this. An entered game is its own ring. */
export function createWaypointKeyDriver(
  entered: () => HTMLElement | null,
): KeyDriver & { hop: (step: HopStep) => void } {
  const nothing = (): void => undefined;

  function hop(step: HopStep): void {
    if (topEscapablePanel()) return;
    const root = entered();
    if (root) {
      hopWithin(root, step);
      return;
    }
    hopAmong(
      Array.from(
        document.querySelectorAll<HTMLElement>("[data-waypoint]:not([inert])"),
      ),
      step,
      (stop) => stop.querySelector<HTMLElement>(ENTRY) ?? stop,
    );
  }

  // Always claimed, so RomM's history back never fires here. Focus on the page
  // is an unmounted tile, which still counts as the grid's level.
  function climb(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    event.preventDefault();
    const region =
      document.activeElement?.closest<HTMLElement>("[data-waypoint]");
    const target = region?.dataset.waypoint === "nav" ? null : parentOf(region);
    const stop = target
      ? document.querySelector<HTMLElement>(`[data-waypoint="${target}"]`)
      : null;
    if (stop) focusFromInput(stop.querySelector<HTMLElement>(ENTRY) ?? stop);
  }

  return {
    hop,
    keyDown(event) {
      if (event.key === "Escape") climb(event);
      if (event.key !== "F6") return;
      event.preventDefault();
      hop(event.shiftKey ? -1 : 1);
    },
    keyUp: nothing,
    focusChanged: nothing,
    scrolled: nothing,
    settled: nothing,
    dispose: nothing,
  };
}
