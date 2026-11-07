import type { Component } from "vue";

export interface ContentLayoutProps {
  items: Component;
  /** Floats over the items' top edge. */
  band: Component | null;
  /** Sits beside the scrollbar, which stays the rightmost thing. */
  rail: Component | null;
  bandHeight: number;
  /** Space above the band, for a header the items keep pinned. */
  bandInset: number;
  /** How far the next heading has pushed the band up, as a negative number. */
  bandOffset: number;
}
