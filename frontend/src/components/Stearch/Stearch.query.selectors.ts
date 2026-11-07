import type { StearchAction } from "./Stearch.actions";
import { createSelector } from "./Stearch.create-selector";
import { INITIAL_QUERY } from "./Stearch.reducer";
import {
  selectSearchTerm,
  selectSortDir,
  selectSortKey,
} from "./Stearch.selectors";

/** Filters go; the search and sort stay. */
export const selectClearActions = createSelector(
  [selectSearchTerm, selectSortKey, selectSortDir],
  (searchTerm, orderBy, orderDir): readonly StearchAction[] => [
    {
      type: "query/set",
      patch: { ...INITIAL_QUERY, searchTerm, orderBy, orderDir },
    },
  ],
);
