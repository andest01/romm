import { createSelector } from "../../store/create-selector";
import { selectClearActions } from "../../store/query.selectors";
import { selectTotal } from "../../store/results.selectors";
import { SORT_FIELDS } from "../../store/sort.fields";
import type { StearchAction } from "../../store/stearch.actions";
import {
  selectIsAdvancedOpen,
  selectLabels,
  selectOpenFieldId,
  selectSearchTerm,
  selectSortList,
  selectViewMode,
} from "../../store/stearch.selectors";
import {
  STEARCH_SORT_KEYS,
  type StearchSort,
  type StearchSortDir,
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
    // Stub label: move to a locale key before this leaves the fork.
    label: "Search games",
    placeholder,
    resultCount,
  }),
);

const selectSort = createSelector(
  [selectSortList],
  ([first, ...rest]): HeaderSort => {
    const setFirst = (next: StearchSort): readonly StearchAction[] => [
      { type: "query/set", patch: { sort: [next, ...rest] } },
    ];
    const field = SORT_FIELDS[first.param];
    const name = field.label;
    const arrow = SORT_ARROWS[first.dir];
    return {
      accessibleLabel: `Sort by ${name}, ${field.directions[first.dir]}`,
      label: `Sort by ${name} ${arrow}`,
      shortLabel: `${name} ${arrow}`,
      sortByLabel: "Sort by",
      options: STEARCH_SORT_KEYS.map((param) => ({
        id: param,
        label: SORT_FIELDS[param].label,
        isActive: param === first.param,
        actions: setFirst({
          param,
          dir:
            param === first.param ? first.dir : SORT_FIELDS[param].defaultDir,
        }),
      })),
      directionLabel: "Direction",
      directions: (["asc", "desc"] as const).map((dir) => ({
        id: dir,
        label: field.directions[dir],
        isActive: dir === first.dir,
        actions: setFirst({ param: first.param, dir }),
      })),
    };
  },
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
