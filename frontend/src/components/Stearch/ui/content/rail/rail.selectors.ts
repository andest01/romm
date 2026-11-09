import { createSelector } from "../../../store/create-selector";
import { selectSections, selectTotal } from "../../../store/results.selectors";
import type { StearchAction } from "../../../store/stearch.actions";
import { selectVisibleSpan } from "../../../store/stearch.selectors";
import type { VisibleSpan } from "../../../store/stearch.state-props";
import type { RailProps, RailThumb } from "./rail.props";

// Stub label: move to a locale key before this leaves the fork.
const RAIL_LABEL = "Jump to letter";

export const selectRailProps = createSelector(
  [selectSections, selectTotal, selectVisibleSpan],
  (sections, total, span): RailProps => {
    const current = sections.findLast(({ start }) => start <= span.first);
    return {
      buckets: sections.map(({ key, size, start }) => ({
        key,
        label: key,
        share: size / total,
        isCurrent: key === current?.key,
        position: start,
      })),
      thumb: railThumb(span, total),
      label: RAIL_LABEL,
    };
  },
);

/** The visible part of the list as a scrollbar thumb. */
export function railThumb(
  { first, last }: VisibleSpan,
  total: number,
): RailThumb {
  if (total === 0) return { start: 0, size: 1 };
  return { start: first / total, size: (last - first + 1) / total };
}

/** Top of the rail is the top of the list, bottom is the end (v4 7.4). */
export function buildScrubActions(
  fraction: number,
  total: number,
): readonly StearchAction[] {
  const clamped = Math.min(1, Math.max(0, fraction));
  const position = Math.min(total - 1, Math.floor(clamped * total));
  return [{ type: "view/set", patch: { jump: { position, isSmooth: false } } }];
}
