import type { GetRomsParams } from "@/services/api/rom";

/** How the list buffers results around what's on screen. Screens are the
 *  unit people reason in; windows are what goes over the wire. */
export interface ReadAheadPolicy {
  /** Results per request. Offsets are multiples of it, so windows line up. */
  readonly itemsPerWindow: number;
  /** Screens fetched past the visible ones, in the scroll direction. */
  readonly screensAhead: number;
  /** Screens kept ready on the side the user came from. */
  readonly screensBehind: number;
  /** Windows further than this are dropped. Open until 100k metrics decide. */
  readonly screensKept: number;
  /** Quiet time after the last movement before any fetch starts. */
  readonly settleMillis: number;
  /** Each request ranks the whole library server-side (~1.3 s at 100k). */
  readonly maxRequestsInFlight: number;
  /** How long a window takes to arrive. Read-ahead covers the distance the
   *  list travels in this time, so it scales with speed, not with input. */
  readonly windowLatencyMs: number;
  /** The most read-ahead speed can ask for, in screens. */
  readonly maxScreensAhead: number;
}

/** How eagerly a wanted window loads. `keep-up` loads while the list moves
 *  (keys, pad, wheel), at most once per settle period; `when-still` waits
 *  for the movement to stop (dragging the rail sweeps past windows nobody
 *  will look at). */
export type LoadPace = "keep-up" | "when-still";

/** One request for a window, in the API's own terms. */
export type WindowRequest = Required<Pick<GetRomsParams, "offset" | "limit">>;

export const READ_AHEAD = Object.freeze({
  itemsPerWindow: 48,
  screensAhead: 2,
  screensBehind: 1,
  screensKept: Number.POSITIVE_INFINITY,
  settleMillis: 150,
  maxRequestsInFlight: 2,
  windowLatencyMs: 600,
  maxScreensAhead: 8,
} satisfies ReadAheadPolicy);

/** Results to read ahead at a speed (results per second, either sign): the
 *  distance travelled while two windows arrive, never less than the fixed
 *  screens ahead, never more than the cap. Fast forward is fast forward:
 *  keys, stick and wheel all arrive here as a speed. */
export const itemsAheadAt = (
  itemsPerSecond: number,
  itemsPerScreen: number,
  {
    screensAhead,
    maxScreensAhead,
    windowLatencyMs,
  }: Pick<
    ReadAheadPolicy,
    "screensAhead" | "maxScreensAhead" | "windowLatencyMs"
  >,
): number =>
  Math.min(
    maxScreensAhead * itemsPerScreen,
    Math.max(
      screensAhead * itemsPerScreen,
      Math.ceil((Math.abs(itemsPerSecond) * 2 * windowLatencyMs) / 1000),
    ),
  );
