import { selectSelectedCount } from "../../store/attention.selectors";
import { createSelector } from "../../store/create-selector";
import { selectTotal } from "../../store/results.selectors";
import type { StearchAction } from "../../store/stearch.actions";
import { selectIds } from "../../store/stearch.selectors";

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
