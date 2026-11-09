import type { StearchAction } from "../../../store/stearch.actions";

export interface SectionProps {
  label: string;
  countLabel: string;
  selectLabel: string;
  selectActions: readonly StearchAction[];
  prevLabel: string;
  prevActions: readonly StearchAction[];
  nextLabel: string;
  /** `null` on the last section. */
  nextActions: readonly StearchAction[] | null;
}
