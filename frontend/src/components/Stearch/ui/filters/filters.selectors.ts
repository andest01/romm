import { createSelector } from "../../store/create-selector";
import { selectClearActions } from "../../store/query.selectors";
import type { StearchAction } from "../../store/stearch.actions";
import { selectGroupByMetaId } from "../../store/stearch.selectors";
import type { BarProps, BarVerb } from "./filters.props";

// Stub labels: move to locale keys before this leaves the fork.
const TITLE = "Filters";
const CLOSE_LABEL = "Close";
const RESET_LABEL = "Reset filters";
const GROUP_LABEL = "Group versions";
const UNGROUP_LABEL = "Show every version";

const CLOSE_ACTIONS: readonly StearchAction[] = [
  { type: "view/set", patch: { isAdvancedOpen: false } },
];
const CLOSE_VERB: BarVerb = {
  id: "close",
  label: CLOSE_LABEL,
  actions: CLOSE_ACTIONS,
};

export const FILTERS_HEADER_PROPS: BarProps = {
  title: TITLE,
  verbs: [CLOSE_VERB],
};

export const selectFiltersFooterProps = createSelector(
  [selectClearActions, selectGroupByMetaId],
  (actions, groupByMetaId): BarProps => ({
    title: null,
    verbs: [
      {
        id: "versions",
        label: groupByMetaId ? UNGROUP_LABEL : GROUP_LABEL,
        actions: [
          { type: "query/set", patch: { groupByMetaId: !groupByMetaId } },
        ],
      },
      { id: "reset", label: RESET_LABEL, actions },
      CLOSE_VERB,
    ],
  }),
);
