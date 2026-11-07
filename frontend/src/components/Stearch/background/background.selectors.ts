import { createSelector } from "../Stearch.create-selector";
import { selectBackgroundUrl } from "../Stearch.selectors";
import type { BackgroundProps } from "./background.props";

export const selectBackgroundProps = createSelector(
  [selectBackgroundUrl],
  (url): BackgroundProps => ({ url }),
);
