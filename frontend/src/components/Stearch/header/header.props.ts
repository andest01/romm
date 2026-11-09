import type { FieldPreview, MultiFieldPreview } from "../fields/fields.props";
import type { StearchAction } from "../store/stearch.actions";
import type {
  StearchSortKey,
  StearchViewMode,
} from "../store/stearch.state-props";

export interface HeaderViewOption {
  id: StearchViewMode;
  label: string;
}

export interface HeaderSortOption {
  id: StearchSortKey;
  label: string;
  actions: readonly StearchAction[];
}

export interface HeaderSearch {
  term: string | null;
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
  label: string;
  options: readonly HeaderSortOption[];
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
