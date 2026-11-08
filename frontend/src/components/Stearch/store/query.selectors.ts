import type { StearchAction } from "./actions";
import { createSelector } from "./create-selector";
import { INITIAL_QUERY } from "./reducer";
import { selectSearchTerm, selectSortDir, selectSortKey } from "./selectors";

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
