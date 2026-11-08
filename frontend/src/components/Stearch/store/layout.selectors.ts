import type { StearchPanelLayout } from "../Stearch.pure-layout-props";
import { createSelector } from "./create-selector";
import { selectIsAdvancedOpen } from "./selectors";

export const selectPanelLayout = createSelector(
  [selectIsAdvancedOpen],
  (isAdvancedOpen): StearchPanelLayout => ({
    panelState: isAdvancedOpen ? "shown" : "hidden",
    panelAxis: "inline",
    panelPosition: "start",
  }),
);
