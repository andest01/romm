import { useRafFn } from "@vueuse/core";
import { onBeforeUnmount, onMounted } from "vue";
import { usePadRafFn } from "@/composables/useGamepad";

/** Frames longer than this (a stall, a hidden tab) don't jump the scroll. */
const MAX_FRAME_MS = 50;

export interface StickDriver {
  sample(now: number, frameMs: number): void;
  /** Claims the stick from the arrow-key mapping; returns the releases. */
  claim(): (() => void)[];
}

/** Runs an analog driver every frame. "always" lets a story run without a pad. */
export function useStickDriver(driver: StickDriver, loop: "pad" | "always") {
  let last = 0;
  const frame = (): void => {
    const now = performance.now();
    driver.sample(now, Math.min(now - last, MAX_FRAME_MS));
    last = now;
  };
  if (loop === "pad") usePadRafFn(frame);
  else useRafFn(frame);
  let releases: (() => void)[] = [];
  onMounted(() => (releases = driver.claim()));
  onBeforeUnmount(() => releases.forEach((release) => release()));
}
