import { useEventListener } from "@vueuse/core";
import { onBeforeUnmount } from "vue";

/** The keyboard and the D-pad, which arrives as synthetic arrow keys. */
export interface KeyDriver {
  keyDown: (event: KeyboardEvent) => void;
  keyUp: (event: KeyboardEvent) => void;
  focusChanged: () => void;
  dispose: () => void;
}

/** Connects a key driver to the page. On the window, so focus can't lose it. */
export function useKeyDriver(driver: KeyDriver): void {
  useEventListener(window, "keydown", driver.keyDown);
  useEventListener(window, "keyup", driver.keyUp);
  useEventListener(document, "focusin", driver.focusChanged);
  useEventListener(document, "focusout", driver.focusChanged);
  onBeforeUnmount(driver.dispose);
}
