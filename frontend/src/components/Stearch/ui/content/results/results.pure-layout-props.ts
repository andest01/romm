import type { Component } from "vue";

export interface ResultsLayoutProps {
  grid: Component;
  /** After the grid in Tab order, against the scrollbar's left edge. */
  rail: Component | null;
  /** Last in Tab order, floating over the top edge of the grid. */
  band: Component | null;
  /** How far the next heading has pushed the band up, as a negative number. */
  bandOffset: number;
  bandHeight: number;
  /** Space kept clear above the band and rail, for a column header. */
  headInset: number;
  scrollbarWidth: number;
}
