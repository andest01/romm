import type { Component } from "vue";

export interface HeaderLayoutProps {
  /** Renders the label with `SEARCH_LABEL_ID`, naming the search landmark. */
  search: Component;
  controls: Component;
  /** The row of active filters; `null` when there are none. */
  pills: Component | null;
}

export const SEARCH_LABEL_ID = "stearch-search-label";
