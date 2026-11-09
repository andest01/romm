import { createSelector } from "../../store/create-selector";
import { selectClearActions } from "../../store/query.selectors";
import { selectTotal } from "../../store/results.selectors";
import type { StearchAction } from "../../store/stearch.actions";
import {
  selectIsAdvancedOpen,
  selectLabels,
  selectOpenFieldId,
  selectSearchTerm,
  selectSortDir,
  selectSortKey,
  selectViewMode,
} from "../../store/stearch.selectors";
import {
  STEARCH_SORT_KEYS,
  type StearchSortDir,
  type StearchSortKey,
} from "../../store/stearch.state-props";
import type { MultiFieldPreview } from "../fields/fields.props";
import { selectFieldPreviews } from "../fields/fields.selectors";
import type {
  HeaderFilters,
  HeaderProps,
  HeaderSearch,
  HeaderSort,
  HeaderView,
} from "./header.props";

const CLOSE_FIELD_ACTIONS: readonly StearchAction[] = [
  { type: "view/set", patch: { openFieldId: null } },
];

// Stub labels: move to locale keys before this leaves the fork.
const ADVANCED_LABEL = "Advanced mode";
const ADD_LABEL = "+ Add a filter";
const CLEAR_LABEL = "Clear all";
const CLOSE_FIELD_LABEL = "Back";
const VIEW_OPTIONS: HeaderView["options"] = [
  { id: "tiles", label: "Tiles" },
  { id: "table", label: "Table" },
];
const SORT_LABELS: Readonly<Record<StearchSortKey, string>> = {
  name: "Name",
  fs_size_bytes: "Size",
  created_at: "Added",
  first_release_date: "Released",
  average_rating: "Rating",
};
const SORT_ARROWS: Readonly<Record<StearchSortDir, string>> = {
  asc: "↑",
  desc: "↓",
};

const selectPlaceholder = createSelector(
  [selectLabels],
  (labels) => labels["rom.search-placeholder"],
);

const selectSearch = createSelector(
  [selectSearchTerm, selectPlaceholder, selectTotal],
  (term, placeholder, resultCount): HeaderSearch => ({
    term,
    placeholder,
    resultCount,
  }),
);

const selectSort = createSelector(
  [selectSortKey, selectSortDir],
  (sortKey, sortDir): HeaderSort => ({
    label: `Sort by ${SORT_LABELS[sortKey]} ${SORT_ARROWS[sortDir]}`,
    options: STEARCH_SORT_KEYS.map((key) => {
      const isActive = key === sortKey;
      return {
        id: key,
        label: isActive
          ? `${SORT_LABELS[key]} ${SORT_ARROWS[sortDir]}`
          : SORT_LABELS[key],
        actions: [
          {
            type: "query/set",
            patch: {
              orderBy: key,
              orderDir: isActive && sortDir === "asc" ? "desc" : "asc",
            },
          },
        ],
      };
    }),
  }),
);

const selectFilters = createSelector(
  [selectFieldPreviews, selectOpenFieldId, selectClearActions],
  (fields, openFieldId, clearActions): HeaderFilters => {
    const addFields = fields.filter(
      (field): field is MultiFieldPreview => field.kind === "multi",
    );
    return {
      addLabel: ADD_LABEL,
      addFields,
      openField: addFields.find(({ id }) => id === openFieldId) ?? null,
      closeFieldLabel: CLOSE_FIELD_LABEL,
      closeFieldActions: CLOSE_FIELD_ACTIONS,
      pills: fields.filter(({ summary }) => summary !== null),
      clearLabel: CLEAR_LABEL,
      clearActions,
    };
  },
);

const selectView = createSelector([selectViewMode], (mode): HeaderView => ({
  mode,
  options: VIEW_OPTIONS,
  actions: [
    { type: "view/set", patch: { mode: mode === "table" ? "tiles" : "table" } },
  ],
}));

export const selectHeaderProps = createSelector(
  [selectSearch, selectFilters, selectIsAdvancedOpen, selectSort, selectView],
  (search, filters, isOpen, sort, view): HeaderProps => ({
    search,
    filters,
    advanced: {
      isOpen,
      label: ADVANCED_LABEL,
      actions: [{ type: "view/set", patch: { isAdvancedOpen: !isOpen } }],
    },
    sort,
    view,
  }),
);
