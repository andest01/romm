import { selectBackgroundUrl } from "../Stearch.attention.selectors";
import { createSelector } from "../Stearch.create-selector";
import type { BackgroundProps } from "./background.props";

export const selectBackgroundProps = createSelector(
  [selectBackgroundUrl],
  (url): BackgroundProps => ({ url }),
);
