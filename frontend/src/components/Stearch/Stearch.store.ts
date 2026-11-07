import { defineStore } from "pinia";
import { shallowRef } from "vue";
import romApi from "@/services/api/rom";
import type { StearchAction } from "./Stearch.actions";
import { INITIAL_STEARCH_STATE, stearchReducer } from "./Stearch.reducer";
import { parsePage } from "./Stearch.schema";
import { STEARCH_WINDOW_SIZE } from "./Stearch.window-size";

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
  const inFlightOffsets = new Set<number>();
  let lastRequestId = 0;
  let queryTimer: ReturnType<typeof setTimeout> | undefined;

  async function fetchWindow(offset: number, requestId: number): Promise<void> {
    inFlightOffsets.add(offset);
    try {
      // Only the first window carries aggregates; the reducer reads them there.
      const isFirstWindow = offset === 0;
      const { data } = await romApi.getRoms({
        ...state.value.query,
        limit: STEARCH_WINDOW_SIZE,
        offset,
        withCharIndex: isFirstWindow,
        withFilterValues: isFirstWindow,
        withRomIdIndex: isFirstWindow,
        withTotal: isFirstWindow,
      });
      const page = parsePage(data);
      dispatch([{ type: "window/loaded", requestId, offset, page }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      dispatch([{ type: "window/failed", requestId, message }]);
    } finally {
      inFlightOffsets.delete(offset);
    }
  }

  function runQuery(): void {
    lastRequestId += 1;
    inFlightOffsets.clear();
    dispatch([{ type: "window/requested", requestId: lastRequestId }]);
    void fetchWindow(0, lastRequestId);
  }

  function runEffect(action: StearchAction): void {
    if (QUERY_ACTIONS.has(action.type)) {
      clearTimeout(queryTimer);
      queryTimer = setTimeout(runQuery, QUERY_DEBOUNCE_MS);
    }
    if (action.type === "window/wanted") {
      const { status, windows } = state.value.results;
      if (
        status.kind === "ready" &&
        !windows[action.offset] &&
        !inFlightOffsets.has(action.offset)
      ) {
        void fetchWindow(action.offset, status.requestId);
      }
    }
  }

  function dispatch(actions: readonly StearchAction[]): void {
    state.value = actions.reduce(stearchReducer, state.value);
    actions.forEach(runEffect);
  }

  /** First load. Seeded stories aren't idle, so they never fetch. */
  function start(): void {
    if (state.value.results.status.kind === "idle") runQuery();
  }

  return { state, dispatch, start };
});
