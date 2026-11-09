import { createSelector } from "./create-selector";
import type { StearchAction } from "./stearch.actions";
import { INITIAL_QUERY } from "./stearch.reducer";
import {
  selectSearchTerm,
  selectSortDir,
  selectSortKey,
} from "./stearch.selectors";

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
