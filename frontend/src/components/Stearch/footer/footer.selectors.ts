import type { StearchAction } from "../Stearch.actions";
import { createSelector } from "../Stearch.create-selector";
import {
  selectIds,
  selectSelectedCount,
  selectTotal,
} from "../Stearch.selectors";

const CLEAR_ACTIONS: readonly StearchAction[] = [
  { type: "attention/set", patch: { selectedIds: [] } },
];

export const selectFooterState = createSelector(
  [selectTotal, selectSelectedCount, selectIds],
  (resultCount, selectedCount, ids) => ({
    resultCount,
    selectedCount,
    clearActions: CLEAR_ACTIONS,
    selectAllActions:
      selectedCount < resultCount
        ? [{ type: "selection/add", ids } as const]
        : null,
  }),
);
