import { useEventListener } from "@vueuse/core";
import { onBeforeUnmount, onMounted } from "vue";

/** The keyboard and the D-pad, which arrives as synthetic arrow keys. */
export interface KeyDriver {
  keyDown: (event: KeyboardEvent) => void;
  keyUp: (event: KeyboardEvent) => void;
  focusChanged: () => void;
  /** Anything scrolled, like the wheel or the scrollbar. */
  scrolled: (event: Event) => void;
  /** A smooth scroll finished. */
  settled: (event: Event) => void;
  dispose: () => void;
}

/** Connects a key driver to the page. On the window, so focus can't lose it. */
export function useKeyDriver(driver: KeyDriver): void {
  useEventListener(window, "keydown", driver.keyDown);
  useEventListener(window, "keyup", driver.keyUp);
  useEventListener(document, "focusin", driver.focusChanged);
  useEventListener(document, "focusout", driver.focusChanged);
  const quietly = { capture: true, passive: true };
  useEventListener(window, "scroll", driver.scrolled, quietly);
  useEventListener(window, "scrollend", driver.settled, quietly);
  onMounted(driver.focusChanged);
  onBeforeUnmount(driver.dispose);
}
