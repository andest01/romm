import { createSelector } from "./Stearch.create-selector";
import type { StearchPanelLayout } from "./Stearch.pure-layout-props";
import { selectIsAdvancedOpen } from "./Stearch.selectors";

export const selectPanelLayout = createSelector(
  [selectIsAdvancedOpen],
  (isAdvancedOpen): StearchPanelLayout => ({
    panelState: isAdvancedOpen ? "shown" : "hidden",
    panelAxis: "inline",
    panelPosition: "start",
  }),
);
