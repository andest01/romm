import { createSelector } from "./create-selector";
import type { StearchAction } from "./stearch.actions";
import { INITIAL_QUERY } from "./stearch.reducer";
import {
  selectGroupByMetaId,
  selectSearchTerm,
  selectSortList,
} from "./stearch.selectors";
import type { StearchSortList } from "./stearch.state-props";

/** Filters go; the search and sort stay. */
export const selectClearActions = createSelector(
  [selectSearchTerm, selectSortList, selectGroupByMetaId],
  (searchTerm, sort, groupByMetaId): readonly StearchAction[] => [
    {
      type: "query/set",
      patch: { ...INITIAL_QUERY, searchTerm, sort, groupByMetaId },
    },
  ],
);

/** The API takes one sort level, so later ones are ignored for now. */
export const apiSortOf = ([{ param, dir }]: StearchSortList) => ({
  orderBy: param,
  orderDir: dir,
});
