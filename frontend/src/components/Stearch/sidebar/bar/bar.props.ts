import type { StearchAction } from "../../Stearch.actions";

export interface BarVerb {
  id: string;
  label: string;
  actions: readonly StearchAction[];
}

export interface BarProps {
  title: string | null;
  verbs: readonly BarVerb[];
}
