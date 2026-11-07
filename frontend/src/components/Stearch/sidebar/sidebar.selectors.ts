import type { StearchAction } from "../Stearch.actions";
import { createSelector } from "../Stearch.create-selector";
import { selectClearActions } from "../Stearch.query.selectors";
import type { BarProps, BarVerb } from "./sidebar.props";

// Stub labels: move to locale keys before this leaves the fork.
const TITLE = "Filters";
const CLOSE_LABEL = "Close";
const RESET_LABEL = "Reset filters";

const CLOSE_ACTIONS: readonly StearchAction[] = [
  { type: "view/set", patch: { isAdvancedOpen: false } },
];
const CLOSE_VERB: BarVerb = {
  id: "close",
  label: CLOSE_LABEL,
  actions: CLOSE_ACTIONS,
};

export const SIDEBAR_HEADER_PROPS: BarProps = {
  title: TITLE,
  verbs: [CLOSE_VERB],
};

export const selectSidebarFooterProps = createSelector(
  [selectClearActions],
  (actions): BarProps => ({
    title: null,
    verbs: [{ id: "reset", label: RESET_LABEL, actions }, CLOSE_VERB],
  }),
);
