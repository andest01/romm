import type { Component } from "vue";

export interface StearchFiltersLayout {
  state: "shown" | "hidden";
  /** `inline` slides in from the sides; `block` from the top or bottom. */
  axis: "inline" | "block";
  position: "start" | "end";
}

/** A layout takes parts and places them. It never learns what they are. */
export interface StearchLayoutProps {
  // no "optional" props. Mean it. Every prop needs to be positively defined.
  header: Component;
  /** Draws a visible title, so it renders `FILTERS_HEADING_ID` itself. */
  filters: Component;
  results: Component | null;
  selection: Component | null;
  background: Component | null;
  filtersLayout: StearchFiltersLayout;
  /** The first Tab's stop, placed ahead of every other part. */
  skipLink: Component | null;
  /** Renders the heading with `HEADER_HEADING_ID`, naming the header. */
  headerHeading: Component;
  /** Renders the heading with `RESULTS_HEADING_ID`, naming the results. */
  resultsHeading: Component;
  /** Renders the heading with `SELECTION_HEADING_ID`, naming the selection. */
  selectionHeading: Component;
}

/** Region ids: what skip links aim at. */
export const HEADER_REGION_ID = "stearch-header";
export const FILTERS_REGION_ID = "stearch-filters";
export const RESULTS_REGION_ID = "stearch-results";
export const SELECTION_REGION_ID = "stearch-selection";

/** Heading ids: a part renders the heading, and its region points at it. */
export const HEADER_HEADING_ID = "stearch-header-heading";
export const FILTERS_HEADING_ID = "stearch-filters-heading";
export const RESULTS_HEADING_ID = "stearch-results-heading";
export const SELECTION_HEADING_ID = "stearch-selection-heading";
