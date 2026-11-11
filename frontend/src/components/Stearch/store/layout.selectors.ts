import type { StearchFiltersLayout } from "../Stearch.pure-layout-props";
import { createSelector } from "./create-selector";
import { selectIsAdvancedOpen } from "./stearch.selectors";

export const selectFiltersLayout = createSelector(
  [selectIsAdvancedOpen],
  (isAdvancedOpen): StearchFiltersLayout => ({
    state: isAdvancedOpen ? "shown" : "hidden",
    axis: "inline",
    position: "start",
  }),
);
