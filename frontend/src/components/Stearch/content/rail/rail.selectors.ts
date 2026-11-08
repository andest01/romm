import type { StearchAction } from "../../store/actions";
import { createSelector } from "../../store/create-selector";
import { selectSections, selectTotal } from "../../store/results.selectors";
import { selectSlots } from "../../store/rows.selectors";
import { selectVisibleSpan } from "../../store/selectors";
import type { VisibleSpan } from "../../store/state-props";
import type { RailProps, RailThumb } from "./rail.props";

// Stub label: move to a locale key before this leaves the fork.
const RAIL_LABEL = "Jump to letter";

export const selectRailProps = createSelector(
  [selectSections, selectTotal, selectVisibleSpan, selectSlots],
  (sections, total, span, slots): RailProps => {
    const current = sections.findLast(({ start }) => start <= span.first);
    return {
      buckets: sections.map(({ key, size, start }) => ({
        key,
        label: key,
        share: size / total,
        isCurrent: key === current?.key,
        navigateActions: buildNavigateActions(start, slots[start]?.id ?? null),
      })),
      thumb: railThumb(span, total),
      label: RAIL_LABEL,
    };
  },
);

/** Flies to a position and makes its game current, when it's loaded yet. */
export function buildNavigateActions(
  position: number,
  gameId: number | null,
): readonly StearchAction[] {
  const jump: StearchAction = {
    type: "view/set",
    patch: { jump: { position, isSmooth: true } },
  };
  return gameId === null
    ? [jump]
    : [{ type: "attention/set", patch: { activeId: gameId } }, jump];
}

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
