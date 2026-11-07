import type { StearchAction } from "../../Stearch.actions";
import { createSelector } from "../../Stearch.create-selector";
import { selectSections, selectTotal } from "../../Stearch.results.selectors";
import { selectVisiblePosition } from "../../Stearch.selectors";
import type { RailProps } from "./rail.props";

export const selectRailProps = createSelector(
  [selectSections, selectTotal, selectVisiblePosition],
  (sections, total, position): RailProps => {
    const current = sections.findLast(({ start }) => start <= position);
    return {
      buckets: sections.map(({ key, size }) => ({
        key,
        label: key,
        share: size / total,
        isCurrent: key === current?.key,
      })),
    };
  },
);

/** Top of the rail is the top of the list, bottom is the end (v4 7.4). */
export function buildScrubActions(
  fraction: number,
  total: number,
): readonly StearchAction[] {
  const clamped = Math.min(1, Math.max(0, fraction));
  const position = Math.min(total - 1, Math.floor(clamped * total));
  return [{ type: "view/set", patch: { jump: { position, isSmooth: false } } }];
}
