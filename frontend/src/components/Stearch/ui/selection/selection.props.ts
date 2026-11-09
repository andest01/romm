import type { Component } from "vue";
import type { StearchAction } from "../../store/stearch.actions";

export interface SelectionProps {
  resultCount: number;
  selectedCount: number;
  resultsLabel: string;
  selectedLabel: string;
  clearLabel: string;
  clearActions: readonly StearchAction[];
  selectAllLabel: string;
  /** `null` when there is nothing left to select. */
  selectAllActions: readonly StearchAction[] | null;
  /** Acts on the selection; shown only while there is one. */
  bulkAdd: Component | null;
}
