import { buildFakePage } from "../Stearch.fake-api";
import { parsePage } from "../Stearch.schema";
import { buildLabels } from "./labels";
import { INITIAL_STEARCH_STATE, stearchReducer } from "./reducer";
import { selectRows } from "./rows.selectors";
import type { ListRow, ListSlot } from "./rows.selectors";
import type { IStearchState, StearchRom } from "./state-props";

const REQUEST_ID = 1;

/** Real API objects, through the real seam and reducer. */
export const LOADED_STEARCH_STATE: IStearchState = [
  {
    type: "locale/set",
    labels: buildLabels((key) => key.slice(key.indexOf(".") + 1)),
  } as const,
  { type: "window/requested", requestId: REQUEST_ID } as const,
  {
    type: "window/loaded",
    requestId: REQUEST_ID,
    offset: 0,
    page: parsePage(buildFakePage({ limit: 48, offset: 0 })),
  } as const,
].reduce(stearchReducer, INITIAL_STEARCH_STATE);

export const LOADING_STEARCH_STATE: IStearchState = {
  ...INITIAL_STEARCH_STATE,
  results: {
    ...INITIAL_STEARCH_STATE.results,
    status: { kind: "loading", requestId: REQUEST_ID },
  },
};

export const FAILED_STEARCH_STATE: IStearchState = {
  ...LOADED_STEARCH_STATE,
  results: {
    ...LOADED_STEARCH_STATE.results,
    status: { kind: "failed", message: "Could not load your library." },
  },
};

export const EMPTY_STEARCH_STATE: IStearchState = {
  ...LOADED_STEARCH_STATE,
  results: {
    ...LOADED_STEARCH_STATE.results,
    ids: [],
    charIndex: {},
    windows: {},
  },
};

/** `count` real rows from the fake API, through the real selectors. */
export function stearchRows(count: number): readonly ListRow[] {
  const { results } = LOADED_STEARCH_STATE;
  return selectRows({
    ...LOADED_STEARCH_STATE,
    results: {
      ...results,
      windows: { 0: parsePage(buildFakePage({ limit: count })).items },
    },
  });
}

export function stearchSlots(
  count: number,
  pendingCount: number,
): readonly ListSlot[] {
  return [
    ...stearchRows(count),
    ...Array.from({ length: pendingCount }, () => null),
  ];
}

const [firstRow, secondRow] = stearchRows(2);
if (!firstRow || !secondRow) throw new Error("The fake library is empty");
export const STEARCH_ROW: ListRow = firstRow;
export const SECOND_STEARCH_ROW: ListRow = secondRow;

const [firstRom] = parsePage(buildFakePage({ limit: 1 })).items;
if (!firstRom) throw new Error("The fake library is empty");
export const STEARCH_ROM: StearchRom = firstRom;
