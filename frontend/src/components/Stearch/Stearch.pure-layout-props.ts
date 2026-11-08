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
  /** The first Tab's link, past the header and filters to the results. */
  skipLabel: string;
  /** Names for the regions a screen reader jumps between. */
  panelLabel: string;
  resultsLabel: string;
}
