import { onBeforeUnmount } from "vue";
import { glideStep } from "./list.selectors";

/** A tap's glide: moves an element's scrollTop in a straight line over a
 *  fixed time. A new target restarts the line from wherever the scroll is.
 *  If anything else moves the scroll mid-glide (a wheel, a drag, a cruise),
 *  the glide stops and lets it. A glide of 0 ms is a jump cut. */
export function useGlide() {
  let element: HTMLElement | null = null;
  let target = 0;
  let from = 0;
  let startedAt = 0;
  let duration = 0;
  let written = 0;
  let frame = 0;

  const stop = (): void => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  function step(now: number): void {
    if (!element) return stop();
    if (Math.abs(element.scrollTop - written) > 1) return stop();
    const elapsed = now - startedAt;
    element.scrollTop = glideStep(from, target, elapsed, duration);
    written = element.scrollTop;
    frame = elapsed >= duration ? 0 : requestAnimationFrame(step);
  }

  function to(next: HTMLElement, nextTarget: number, glideMs: number): void {
    if (glideMs <= 0 || nextTarget === next.scrollTop) {
      stop();
      next.scrollTop = nextTarget;
      return;
    }
    element = next;
    target = nextTarget;
    from = next.scrollTop;
    written = next.scrollTop;
    duration = glideMs;
    startedAt = performance.now();
    if (frame === 0) frame = requestAnimationFrame(step);
  }

  /** Where the scroll is heading: the glide's target while one runs. */
  const heading = (of: HTMLElement): number =>
    frame !== 0 && element === of ? target : of.scrollTop;

  onBeforeUnmount(stop);

  return { to, stop, heading };
}
