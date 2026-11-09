import type { Component } from "vue";

export interface StearchPanelLayout {
  panelState: "shown" | "hidden";
  /** `inline` slides in from the sides; `block` from the top or bottom. */
  panelAxis: "inline" | "block";
  panelPosition: "start" | "end";
}

/** A layout takes parts and places them. It never learns what they are. */
export interface StearchLayoutProps {
  // no "optional" props. Mean it. Every prop needs to be positively defined.
  header: Component;
  panel: Component;
  content: Component | null;
  footer: Component | null;
  background: Component | null;
  panelLayout: StearchPanelLayout;
  /** The first Tab's stop, placed ahead of every other part. */
  skipLink: Component | null;
  /** Renders the heading with `RESULTS_HEADING_ID`, naming the results. */
  resultsHeading: Component;
  /** Renders the heading with `SELECTION_HEADING_ID`, naming the footer. */
  selectionHeading: Component;
}

/** Region ids: what skip links aim at. */
export const RESULTS_REGION_ID = "stearch-results";
export const FILTERS_REGION_ID = "stearch-filters";

/** Heading ids: a part renders the heading, and its region points at it. */
export const RESULTS_HEADING_ID = "stearch-results-heading";
export const FILTERS_HEADING_ID = "stearch-filters-heading";
export const SELECTION_HEADING_ID = "stearch-selection-heading";
