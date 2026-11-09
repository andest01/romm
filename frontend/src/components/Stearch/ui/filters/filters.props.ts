import type { StearchAction } from "../../store/stearch.actions";

export interface BarVerb {
  id: string;
  label: string;
  actions: readonly StearchAction[];
}

/** One row of verbs, for the sidebar's header or footer. */
export interface BarProps {
  title: string | null;
  verbs: readonly BarVerb[];
}
