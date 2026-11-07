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
}

/** One request for a window, in the API's own terms. */
export type WindowRequest = Required<Pick<GetRomsParams, "offset" | "limit">>;

export const READ_AHEAD = Object.freeze({
  itemsPerWindow: 48,
  screensAhead: 2,
  screensBehind: 1,
  screensKept: Number.POSITIVE_INFINITY,
  settleMillis: 150,
  maxRequestsInFlight: 2,
} satisfies ReadAheadPolicy);
