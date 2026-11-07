import { defineStore } from "pinia";
import { shallowRef } from "vue";
import type { StearchAction } from "./Stearch.actions";
import type { StearchSource } from "./Stearch.data-source";
import { READ_AHEAD, type WindowRequest } from "./Stearch.read-ahead";
import { INITIAL_STEARCH_STATE, stearchReducer } from "./Stearch.reducer";
import { parsePage } from "./Stearch.schema";

const QUERY_DEBOUNCE_MS = 200;

const QUERY_ACTIONS: ReadonlySet<StearchAction["type"]> = new Set([
  "query/set",
  "query/add",
  "query/remove",
]);

// A shallowRef keeps state identity stable, which is what memoized selectors
// compare; a deep reactive proxy would hide that.
export default defineStore("stearch", () => {
  const state = shallowRef(INITIAL_STEARCH_STATE);
  const inFlight = new Map<number, AbortController>();
  /** Offsets still to fetch for the latest settled range, nearest first. */
  let queue: number[] = [];
  let lastRequestId = 0;
  let queryTimer: ReturnType<typeof setTimeout> | undefined;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  /** Set by whoever mounts Stearch: the real API in the app, a fake in stories. */
  let source: StearchSource | null = null;

  async function fetchWindow(
    { offset, limit }: WindowRequest,
    requestId: number,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      // Only the first window carries aggregates; the reducer reads them there.
      const isFirstWindow = offset === 0;
      if (!source) throw new Error("No data source connected to Stearch");
      const { data } = await source({
        ...state.value.query,
        limit,
        offset,
        signal,
        withCharIndex: isFirstWindow,
        withFilterValues: isFirstWindow,
        withRomIdIndex: isFirstWindow,
        withTotal: isFirstWindow,
      });
      dispatch([
        { type: "window/loaded", requestId, offset, page: parsePage(data) },
      ]);
    } catch (error) {
      // A cancelled request is one the user moved past, not a failure.
      if (signal.aborted) return;
      const message = error instanceof Error ? error.message : String(error);
      dispatch([{ type: "window/failed", requestId, message }]);
    } finally {
      if (inFlight.get(offset)?.signal === signal) inFlight.delete(offset);
      pump();
    }
  }

  /** Starts queued windows, up to the in-flight cap. */
  function pump(): void {
    const { status, windows } = state.value.results;
    if (status.kind !== "ready") return;
    while (inFlight.size < READ_AHEAD.maxRequestsInFlight) {
      const offset = queue.shift();
      if (offset === undefined) return;
      if (windows[offset] || inFlight.has(offset)) continue;
      const controller = new AbortController();
      inFlight.set(offset, controller);
      void fetchWindow(
        { offset, limit: READ_AHEAD.itemsPerWindow },
        status.requestId,
        controller.signal,
      );
    }
  }

  /** The latest range wins: older wants are dropped, and requests for
   *  windows the user moved past are cancelled. */
  function settleOn(offsets: readonly number[]): void {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      const wanted = new Set(offsets);
      for (const [offset, controller] of inFlight) {
        if (!wanted.has(offset)) controller.abort();
      }
      queue = [...offsets];
      pump();
    }, READ_AHEAD.settleMillis);
  }

  function cancelAll(): void {
    clearTimeout(settleTimer);
    queue = [];
    for (const controller of inFlight.values()) controller.abort();
    inFlight.clear();
  }

  function runQuery(): void {
    lastRequestId += 1;
    cancelAll();
    dispatch([{ type: "window/requested", requestId: lastRequestId }]);
    const controller = new AbortController();
    inFlight.set(0, controller);
    void fetchWindow(
      { offset: 0, limit: READ_AHEAD.itemsPerWindow },
      lastRequestId,
      controller.signal,
    );
  }

  function dispatch(actions: readonly StearchAction[]): void {
    state.value = actions.reduce(stearchReducer, state.value);
    if (actions.some(({ type }) => QUERY_ACTIONS.has(type))) {
      clearTimeout(queryTimer);
      queryTimer = setTimeout(runQuery, QUERY_DEBOUNCE_MS);
    }
    const wanted = actions.flatMap((action) =>
      action.type === "window/wanted" ? [action.offset] : [],
    );
    if (wanted.length > 0) settleOn(wanted);
  }

  /** Where pages come from. Nothing fetches until a source is connected. */
  function connect(next: StearchSource): void {
    source = next;
  }

  /** First load. A seeded story isn't idle, so it skips this, but scrolling
   *  it still fetches windows from its connected source. */
  function start(): void {
    if (state.value.results.status.kind === "idle") runQuery();
  }

  return { state, dispatch, connect, start };
});
