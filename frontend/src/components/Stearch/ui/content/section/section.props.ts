import type { RailValue } from "../../../store/sort.fields";
import type { StearchAction } from "../../../store/stearch.actions";

export interface SectionProps {
  label: string;
  value: RailValue;
  countLabel: string;
  selectLabel: string;
  selectActions: readonly StearchAction[];
  prevLabel: string;
  /** `null` on the first section. */
  prevActions: readonly StearchAction[] | null;
  nextLabel: string;
  /** `null` on the last section. */
  nextActions: readonly StearchAction[] | null;
}
