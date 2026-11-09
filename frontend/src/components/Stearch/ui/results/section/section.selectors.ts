import { createSelector } from "../../../store/create-selector";
import {
  selectCurrentBucket,
  selectPrimaryGroup,
} from "../../../store/primary-group.selectors";
import type { StearchAction } from "../../../store/stearch.actions";
import { selectIds, selectSelectedIds } from "../../../store/stearch.selectors";
import type { SectionProps } from "./section.props";

// Stub labels: move to locale keys before this leaves the fork.
const SELECT_LABEL = "Select";
const DESELECT_LABEL = "Deselect";
const PREV_LABEL = "‹ Prev";
const NEXT_LABEL = "Next ›";

/** Goes to a group's first game and makes it current: where you land is
 *  where the next press starts from. */
const jumpTo = (
  position: number,
  ids: readonly number[],
): readonly StearchAction[] => [
  { type: "view/set", patch: { jump: { position, isSmooth: true } } },
  { type: "attention/set", patch: { activeId: ids[position] ?? null } },
];

/** The section at the top of the list; `null` for sorts without sections. */
export const selectSectionProps = createSelector(
  [selectPrimaryGroup, selectCurrentBucket, selectIds, selectSelectedIds],
  ({ buckets }, current, ids, selectedIds): SectionProps | null => {
    if (!current) return null;
    const { label, value, start, size } = current;
    const index = buckets.indexOf(current);
    const previous = buckets[index - 1];
    const next = buckets[index + 1];
    const selected = new Set(selectedIds);
    const sectionIds = ids.slice(start, start + size);
    const isAllSelected = sectionIds.every((id) => selected.has(id));
    return {
      label,
      value,
      countLabel: `${size} ${size === 1 ? "game" : "games"}`,
      selectLabel: isAllSelected ? DESELECT_LABEL : SELECT_LABEL,
      selectActions: [
        {
          type: isAllSelected ? "selection/remove" : "selection/add",
          ids: sectionIds,
        },
      ],
      prevLabel: PREV_LABEL,
      prevActions: previous ? jumpTo(previous.start, ids) : null,
      nextLabel: NEXT_LABEL,
      nextActions: next ? jumpTo(next.start, ids) : null,
    };
  },
);
