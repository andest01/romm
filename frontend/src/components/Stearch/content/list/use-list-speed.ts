import type { ScrollRow, VisibleRange } from "./list.props";
import { listSpeed, spanOf } from "./list.selectors";

/** How fast the list is moving, in results per second, read from the ranges
 *  the scroller reports. It doesn't know or care which input moved it: keys,
 *  stick, wheel and rail all arrive as a speed (spec 008, read-ahead). */
export function useListSpeed() {
  let last: { position: number; atMs: number } | null = null;

  return (range: VisibleRange, rows: readonly ScrollRow[]): number => {
    const span = spanOf(range, rows);
    if (!span) return 0;
    const sighting = { position: span.first, atMs: performance.now() };
    const speed = last === null ? 0 : listSpeed(last, sighting);
    last = sighting;
    return speed;
  };
}
