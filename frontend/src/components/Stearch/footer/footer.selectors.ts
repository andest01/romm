import type { StearchAction } from "../Stearch.actions";
import { createSelector } from "../Stearch.create-selector";
import { selectSelectedCount, selectTotal } from "../Stearch.selectors";

const CLEAR_ACTIONS: readonly StearchAction[] = [{ type: "selection/clear" }];
const SELECT_ALL_ACTIONS: readonly StearchAction[] = [
  { type: "selection/all" },
];

export const selectFooterState = createSelector(
  [selectTotal, selectSelectedCount],
  (resultCount, selectedCount) => ({
    resultCount,
    selectedCount,
    clearActions: CLEAR_ACTIONS,
    selectAllActions: selectedCount < resultCount ? SELECT_ALL_ACTIONS : null,
  }),
);
