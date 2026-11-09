import type { StearchAction } from "../../store/stearch.actions";

export interface FooterProps {
  resultCount: number;
  selectedCount: number;
  resultsLabel: string;
  selectedLabel: string;
  clearLabel: string;
  clearActions: readonly StearchAction[];
  selectAllLabel: string;
  /** `null` when there is nothing left to select. */
  selectAllActions: readonly StearchAction[] | null;
}
