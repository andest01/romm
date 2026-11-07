import type { Component } from "vue";

export interface StearchPanelLayout {
  isPanelShown: boolean;
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
}
