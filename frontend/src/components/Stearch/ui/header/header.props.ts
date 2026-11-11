import type { StearchAction } from "../../store/stearch.actions";
import type {
  StearchSortDir,
  StearchSortKey,
  StearchViewMode,
} from "../../store/stearch.state-props";
import type {
  FieldPreview,
  MultiFieldPreview,
} from "../filters/filters-fields.props";

export interface HeaderViewOption {
  id: StearchViewMode;
  label: string;
}

export interface HeaderSortOption<Id = StearchSortKey> {
  id: Id;
  label: string;
  isActive: boolean;
  actions: readonly StearchAction[];
}

export interface HeaderSearch {
  term: string | null;
  /** Names the search landmark; a placeholder is only a hint. */
  label: string;
  placeholder: string;
  resultCount: number;
}

export interface HeaderFilters {
  addLabel: string;
  /** The fields the add-a-filter menu offers. */
  addFields: readonly MultiFieldPreview[];
  /** The field open in that menu. `null` lists the fields. */
  openField: MultiFieldPreview | null;
  closeFieldLabel: string;
  closeFieldActions: readonly StearchAction[];
  /** Fields with a value. The row doesn't exist when this is empty. */
  pills: readonly FieldPreview[];
  clearLabel: string;
  clearActions: readonly StearchAction[];
}

export interface HeaderAdvanced {
  isOpen: boolean;
  label: string;
  actions: readonly StearchAction[];
}

export interface HeaderSort {
  /** Spoken in full, whatever the button has room to show. */
  accessibleLabel: string;
  label: string;
  /** The button when there's less room. */
  shortLabel: string;
  sortByLabel: string;
  options: readonly HeaderSortOption[];
  directionLabel: string;
  directions: readonly HeaderSortOption<StearchSortDir>[];
}

export interface HeaderView {
  mode: StearchViewMode;
  options: HeaderViewOption[];
  actions: readonly StearchAction[];
}

export interface HeaderProps {
  search: HeaderSearch;
  filters: HeaderFilters;
  advanced: HeaderAdvanced;
  sort: HeaderSort;
  view: HeaderView;
}
